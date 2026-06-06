import { generateLine, getModelStatus, downloadModel, disposeModel } from "./llmService";

process.parentPort.on("message", async (e) => {
  const { id, type, payload } = e.data as { id: string; type: string; payload: any };
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

    console.log(result);

    process.parentPort.postMessage({ id, type: "result", payload: result });
  } catch (err: any) {
    process.parentPort.postMessage({ id, type: "error", payload: err.message });
  }
});

process.on("SIGTERM", () => {
  disposeModel();
  process.exit(0);
});
