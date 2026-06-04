import path from "node:path";

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
