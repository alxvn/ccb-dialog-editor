import path from "node:path";
import { app } from "electron";

export function getDataRoot(): string {
  return path.resolve(process.cwd(), "project-data");
}

export function getRegistryPath(): string {
  return path.join(getDataRoot(), "projects-registry.json");
}

export function getProjectDir(projectId: string): string {
  return path.join(getDataRoot(), "projects", projectId);
}

export function getProjectFilePath(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export function getDialogsDir(projectId: string): string {
  return path.join(getProjectDir(projectId), "dialogs");
}

export function getDialogPath(projectId: string, dialogId: string): string {
  return path.join(getDialogsDir(projectId), `${dialogId}.json`);
}

export function getCopperCubeExtensionsDir(): string {
  const userProfile = process.env.USERPROFILE ?? process.env.HOME ?? "";
  return path.join(userProfile, "Documents", "CopperCube", "extensions");
}

export function getModelsDir(): string {
    // In the llm worker process, app is not available — path is passed via env instead
  if (process.env.LLM_MODELS_DIR) {
    return process.env.LLM_MODELS_DIR;
  }

  // Fallback for main process usage
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "models");
}
