import path from "node:path";
import { app, utilityProcess, UtilityProcess } from "electron";

let worker: UtilityProcess | null = null;
let pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
let idCounter = 0;

function getWorkerPath(): string {
  return path.join(__dirname, "llmworker.js");
}

function ensureWorker(): UtilityProcess {
  if (worker) return worker;

  const workerPath = getWorkerPath();

  worker = utilityProcess.fork(workerPath, [], {
    stdio: "pipe",
    cwd: app.getAppPath(),
    env: {
      ...process.env,
      LLM_MODELS_DIR: path.join(app.getPath("userData"), "models"),
    },
  });

  worker.stdout?.on("data", (d) => console.log("[llm-worker]", d.toString()));
  worker.stderr?.on("data", (d) => console.error("[llm-worker]", d.toString()));

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
      reject:  (e) => { progressListeners.delete(id); reject(e); },
    });
    w.postMessage({ id, type, payload });
  });
}

export const getModelStatus  = ()                => call("status");
export const downloadModel   = (onProgress: (pct: number) => void) => call("download", undefined, onProgress);
export const generateLine    = (prompt: string, speakerName: string) => call("generate", { prompt, speakerName });
export const disposeWorker   = () => { worker?.kill(); worker = null; };
