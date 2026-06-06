import { generateLine, getModelStatus, downloadModel, disposeModel } from "./llmService";

process.stderr.write("[llm-worker] script started\n");

async function handleMessage(e: Electron.MessageEvent): Promise<void> {
  const { id, type, payload } = e.data as { id: string; type: string; payload: any };
  process.stderr.write(`[llm-worker] received: ${type}\n`);

  try {
    let result: any;

    if (type === "status") {
      result = await getModelStatus();
    } else if (type === "download") {
      await downloadModel((percent) => {
        process.parentPort.postMessage({ id, type: "progress", payload: { percent } });
      });
      result = { done: true };
    } else if (type === "generate") {
      result = await generateLine(payload.prompt, payload.speakerName);
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }

    process.stderr.write(`[llm-worker] sending result: ${JSON.stringify(result)}\n`);
    process.parentPort.postMessage({ id, type: "result", payload: result });
  } catch (err: any) {
    process.stderr.write(`[llm-worker] error: ${err.stack}\n`);
    process.parentPort.postMessage({ id, type: "error", payload: err.message });
  }
}

process.parentPort.on("message", handleMessage);

process.on("SIGTERM", () => {
  disposeModel();
  process.exit(0);
});