import path from "node:path";
import { app, utilityProcess, UtilityProcess } from "electron";
import workerPathRaw from "./llmworker?modulePath";
import log from 'electron-log';

log.initialize();

let worker: UtilityProcess | null = null;
let pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let idCounter = 0;

/** utilityProcess.fork needs real filesystem paths, not asar virtual paths */
function resolveUnpackedPath(p: string): string {
  return p.replace(/\.asar([\\/]|$)/g, ".asar.unpacked$1");
}

function ensureWorker(): UtilityProcess {
  if (worker) return worker;

  const llmModelsDir = path.join(app.getPath("userData"), "models");
  const workerScript = app.isPackaged ? resolveUnpackedPath(workerPathRaw) : workerPathRaw;
  const appPath = app.getAppPath();
  const cwd = app.isPackaged ? resolveUnpackedPath(appPath) : appPath;

  log.info(`llmbridge: worker path: ${workerScript}`);
  log.info(`llmbridge: worker exists: ${require("fs").existsSync(workerScript)}`);
  log.info(`llmbridge: app is ready: ${app.isReady()}`);

  try {
    worker = utilityProcess.fork(workerScript, [], {
      stdio: "pipe",
      cwd,
      env: {
        ...process.env,
        LLM_MODELS_DIR: llmModelsDir,
      },
    });
  } catch (error) {
    log.error("llmbridge: failed to fork worker:", error);
    throw error;
  }

  log.info(`llmbridge: worker: ${worker}`);

  // worker.stdout?.on("data", (d) => console.log("[llm-worker]", d.toString()));
  // worker.stderr?.on("data", (d) => console.error("[llm-worker]", d.toString()));

  worker.on("spawn", () => log.info("llmbridge: worker spawned"));
  worker.on("exit", (code) => log.error("llmbridge: worker exited, code:", code));
  worker.stdout?.on("data", (d: Buffer) => log.info("[worker stdout]", d.toString()));
  worker.stderr?.on("data", (d: Buffer) => log.error("[worker stderr]", d.toString()));

  worker.on("message", (msg: { id: string; type: string; payload: any }) => {
    const { id, type, payload } = msg;

    if (type === "progress") {
      // Progress callbacks are handled separately — find the listener
      progressListeners.get(id)?.(payload.percent);
      return;
    }

    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);

    if (type === "error") p.reject(new Error(payload));
    else p.resolve(payload);
  });

  worker.on("exit", (code) => {
    log.warn(`llmbridge: LLM worker exited with code ${code}`);
    console.warn(`[llm-worker] exited with code ${code}`);
    // Reject all pending calls so they don't hang forever
    for (const [, p] of pending) p.reject(new Error("LLM worker crashed"));
    pending.clear();
    worker = null;
  });

  return worker;
}

const progressListeners = new Map<string, (pct: number) => void>();

function call(type: string, payload?: any, onProgress?: (pct: number) => void): Promise<any> {
  const id = String(idCounter++);
  const w = ensureWorker();

  if (onProgress) progressListeners.set(id, onProgress);

  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (v) => { progressListeners.delete(id); resolve(v); },
      reject: (e) => { progressListeners.delete(id); reject(e); },
    });
    w.postMessage({ id, type, payload });
  });
}

export const getModelStatus = () => call("status");
export const downloadModel = (onProgress: (pct: number) => void) => call("download", undefined, onProgress);
export const generateLine = (prompt: string, speakerName: string) => call("generate", { prompt, speakerName });
export const disposeWorker = () => { worker?.kill(); worker = null; };
