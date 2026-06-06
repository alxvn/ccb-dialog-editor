import fs from "node:fs/promises";
import { getModelsDir } from "../paths";
import { SUPPORTED_MODEL_URI } from "../../shared/llmConstants";

type LlamaModule = typeof import("node-llama-cpp");
type LlamaRuntime = Awaited<ReturnType<LlamaModule["getLlama"]>>;
type LoadedModel = Awaited<ReturnType<LlamaRuntime["loadModel"]>>;
type LoadedContext = Awaited<ReturnType<LoadedModel["createContext"]>>;
type LlamaChatSessionType = InstanceType<LlamaModule["LlamaChatSession"]>;

let llamaModule: LlamaModule | null = null;
let llama: LlamaRuntime | null = null;
let model: LoadedModel | null = null;
let context: LoadedContext | null = null;
let session: LlamaChatSessionType | null = null;
let cachedModelPath: string | null = null;
let isGenerating = false;

async function loadLlamaModule(): Promise<LlamaModule> {
  if (!llamaModule) {
    const importEsm = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<LlamaModule>;
    llamaModule = await importEsm("node-llama-cpp");
  }
  return llamaModule;
}

async function resolveExistingModelPath(): Promise<string | null> {
  const { resolveModelFile } = await loadLlamaModule();
  const modelsDir = getModelsDir();
  await fs.mkdir(modelsDir, { recursive: true });

  try {
    return await resolveModelFile(SUPPORTED_MODEL_URI, {
      directory: modelsDir,
      download: false,
      cli: false,
    });
  } catch {
    return null;
  }
}

function postProcessResponse(raw: string, speakerName: string): string {
  let text = raw.trim();

  // Strip Qwen3 <think>...</think> blocks (thinking mode output)
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Strip surrounding quotes
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  // Strip speaker prefix
  const speakerPrefix = `${speakerName}:`;
  if (text.startsWith(speakerPrefix)) {
    text = text.slice(speakerPrefix.length).trim();
  }

  return text;
}

export async function getModelStatus(): Promise<{ downloaded: boolean }> {
  const modelPath = await resolveExistingModelPath();
  if (modelPath) {
    cachedModelPath = modelPath;
  }
  return { downloaded: modelPath !== null };
}

export async function downloadModel(onProgress: (percent: number) => void): Promise<void> {
  const { createModelDownloader } = await loadLlamaModule();
  const modelsDir = getModelsDir();
  await fs.mkdir(modelsDir, { recursive: true });

  const downloader = await createModelDownloader({
    modelUri: SUPPORTED_MODEL_URI,
    dirPath: modelsDir,
    showCliProgress: false,
    onProgress: ({ totalSize, downloadedSize }) => {
      if (totalSize <= 0) {
        onProgress(0);
        return;
      }
      onProgress(Math.min(100, Math.round((downloadedSize / totalSize) * 100)));
    },
  });

  cachedModelPath = await downloader.download();
  onProgress(100);
}

async function ensureModelLoaded(): Promise<void> {
  if (llama && model && context && session && cachedModelPath) {
    return;
  }

  if (!cachedModelPath) {
    cachedModelPath = await resolveExistingModelPath();
  }
  if (!cachedModelPath) {
    throw new Error("Model is not downloaded");
  }

  const { getLlama, LlamaLogLevel, LlamaChatSession, resolveChatWrapper } =
    await loadLlamaModule();

  llama = await getLlama({ logLevel: LlamaLogLevel.error });
  model = await llama.loadModel({ modelPath: cachedModelPath });
  context = await model.createContext({ contextSize: 2048 });

  // Reuse a single session across calls — avoids expensive teardown/setup
  session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    chatWrapper: resolveChatWrapper(model),
    autoDisposeSequence: false,
  });
}

export function disposeModel(): void {
  session?.dispose();
  session = null;
  context?.dispose();
  context = null;
  model?.dispose();
  model = null;
  llama?.dispose();
  llama = null;
  cachedModelPath = null;
}

export async function generateLine(prompt: string, speakerName: string): Promise<string> {
  if (isGenerating) {
    throw new Error("A generation is already in progress");
  }

  isGenerating = true;
  try {
    await ensureModelLoaded();
    if (!session) {
      throw new Error("Failed to load model session");
    }

    const raw = await session.prompt(`/no_think\n${prompt}`, {
      maxTokens: 200,       // Prevent runaway generation
      temperature: 0.7,     // Avoid degenerate greedy output
      topP: 0.9,
      customStopTriggers: ['|im_end|>']
    });

    const result = postProcessResponse(raw, speakerName);

    // If the model returns empty, reset the session to clear any bad context state
    if (!result) {
      session.dispose();
      session = null;
    }

    return result;
  } finally {
    isGenerating = false;
  }
}
