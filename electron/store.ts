import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildCopperCubeDialogExtension,
  generateExtensionPostfix,
  getExtensionFileName,
} from "../shared/exportFormat";
import {
  dialogFileSchema,
  projectFileSchema,
  projectsRegistrySchema,
  type DialogFile,
  type DialogType,
  type ProjectFile,
  type ProjectsRegistry,
} from "../shared/schemas";
import {
  getCopperCubeExtensionsDir,
  getDataRoot,
  getDialogPath,
  getDialogsDir,
  getProjectDir,
  getProjectFilePath,
  getRegistryPath,
} from "./paths";

export type ProjectSummary = { id: string; name: string; projectDir: string };
export type ProjectLoadResult = { project: ProjectFile; dialogs: DialogFile[] };

const defaultRegistry: ProjectsRegistry = {
  version: 1,
  projects: [],
  lastOpenedProjectId: null,
  lastOpenedDialogId: null,
};

async function ensureDirs(projectId?: string): Promise<void> {
  await fs.mkdir(getDataRoot(), { recursive: true });
  await fs.mkdir(path.join(getDataRoot(), "projects"), { recursive: true });
  if (projectId) {
    await fs.mkdir(getProjectDir(projectId), { recursive: true });
    await fs.mkdir(getDialogsDir(projectId), { recursive: true });
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function getRegistry(): Promise<ProjectsRegistry> {
  await ensureDirs();
  const file = await readJsonFile<unknown>(getRegistryPath());
  if (!file) {
    await writeJsonFile(getRegistryPath(), defaultRegistry);
    return defaultRegistry;
  }
  return projectsRegistrySchema.parse(file);
}

async function saveRegistry(nextRegistry: ProjectsRegistry): Promise<void> {
  await writeJsonFile(getRegistryPath(), nextRegistry);
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const registry = await getRegistry();
  return registry.projects;
}

export async function createProject(name: string): Promise<ProjectSummary> {
  const now = new Date().toISOString();
  const projectId = randomUUID();
  const projectDir = getProjectDir(projectId);
  const project: ProjectFile = {
    id: projectId,
    name,
    createdAt: now,
    updatedAt: now,
    extensionPostfix: generateExtensionPostfix(),
    dialogs: [],
  };

  await ensureDirs(projectId);
  await writeJsonFile(getProjectFilePath(projectId), project);

  const registry = await getRegistry();
  const entry = { id: projectId, name, projectDir };
  const nextRegistry: ProjectsRegistry = {
    ...registry,
    projects: [...registry.projects, entry],
    lastOpenedProjectId: projectId,
    lastOpenedDialogId: null,
  };
  await saveRegistry(nextRegistry);
  return entry;
}

async function readProject(projectId: string): Promise<ProjectFile> {
  const parsed = await readJsonFile<unknown>(getProjectFilePath(projectId));
  if (!parsed) throw new Error("Project not found");
  return projectFileSchema.parse(parsed);
}

async function writeProject(project: ProjectFile): Promise<void> {
  await writeJsonFile(getProjectFilePath(project.id), project);
}

async function readDialog(projectId: string, dialogId: string): Promise<DialogFile> {
  const parsed = await readJsonFile<unknown>(getDialogPath(projectId, dialogId));
  if (!parsed) throw new Error("Dialog not found");
  return dialogFileSchema.parse(parsed);
}

async function writeDialog(projectId: string, dialog: DialogFile): Promise<void> {
  await writeJsonFile(getDialogPath(projectId, dialog.id), dialog);
}

export async function openProject(projectId: string): Promise<ProjectLoadResult> {
  const project = await readProject(projectId);
  const dialogs = await Promise.all(project.dialogs.map((d) => readDialog(projectId, d.id)));
  const registry = await getRegistry();
  await saveRegistry({
    ...registry,
    lastOpenedProjectId: projectId,
    lastOpenedDialogId: project.dialogs[0]?.id ?? null,
  });
  return { project, dialogs };
}

export async function createDialog(
  projectId: string,
  name: string,
  type: DialogType = "linear",
): Promise<DialogFile> {
  const dialogId = randomUUID();
  const dialog: DialogFile =
    type === "branching"
      ? { type: "branching", id: dialogId, name, nodes: [], edges: [] }
      : { type: "linear", id: dialogId, name, lines: [] };
  const project = await readProject(projectId);
  const now = new Date().toISOString();
  const nextProject: ProjectFile = {
    ...project,
    updatedAt: now,
    dialogs: [...project.dialogs, { id: dialogId, name, file: `${dialogId}.json` }],
  };
  await writeDialog(projectId, dialog);
  await writeProject(nextProject);
  const registry = await getRegistry();
  await saveRegistry({
    ...registry,
    lastOpenedProjectId: projectId,
    lastOpenedDialogId: dialogId,
  });
  return dialog;
}

export async function updateDialog(projectId: string, dialog: DialogFile): Promise<DialogFile> {
  const parsedDialog = dialogFileSchema.parse(dialog);
  await writeDialog(projectId, parsedDialog);
  const project = await readProject(projectId);
  const now = new Date().toISOString();
  const nextProject: ProjectFile = {
    ...project,
    updatedAt: now,
    dialogs: project.dialogs.map((ref) => (ref.id === parsedDialog.id ? { ...ref, name: parsedDialog.name } : ref)),
  };
  await writeProject(nextProject);
  return parsedDialog;
}

export async function removeDialog(projectId: string, dialogId: string): Promise<void> {
  const project = await readProject(projectId);
  const nextDialogs = project.dialogs.filter((d) => d.id !== dialogId);
  const nextProject: ProjectFile = {
    ...project,
    updatedAt: new Date().toISOString(),
    dialogs: nextDialogs,
  };
  await writeProject(nextProject);
  await fs.rm(getDialogPath(projectId, dialogId), { force: true });
  const registry = await getRegistry();
  await saveRegistry({
    ...registry,
    lastOpenedProjectId: projectId,
    lastOpenedDialogId:
      registry.lastOpenedDialogId === dialogId ? (nextDialogs[0]?.id ?? null) : registry.lastOpenedDialogId,
  });
}

export async function removeProject(projectId: string): Promise<void> {
  const registry = await getRegistry();
  const nextProjects = registry.projects.filter((p) => p.id !== projectId);
  await saveRegistry({
    ...registry,
    projects: nextProjects,
    lastOpenedProjectId: registry.lastOpenedProjectId === projectId ? null : registry.lastOpenedProjectId,
    lastOpenedDialogId: registry.lastOpenedProjectId === projectId ? null : registry.lastOpenedDialogId,
  });
  await fs.rm(getProjectDir(projectId), { recursive: true, force: true });
}

async function ensureExtensionPostfix(project: ProjectFile): Promise<ProjectFile> {
  if (project.extensionPostfix) {
    return project;
  }

  const nextProject: ProjectFile = {
    ...project,
    extensionPostfix: generateExtensionPostfix(),
    updatedAt: new Date().toISOString(),
  };
  await writeProject(nextProject);
  return nextProject;
}

export async function exportProjectToExtension(projectId: string, dialogs: DialogFile[]): Promise<string> {
  const project = await ensureExtensionPostfix(await readProject(projectId));
  const extensionPostfix = project.extensionPostfix;
  if (!extensionPostfix) {
    throw new Error("Project extension postfix is missing");
  }

  const parsedDialogs = dialogs.map((dialog) => dialogFileSchema.parse(dialog));
  const extensionText = buildCopperCubeDialogExtension(project.name, extensionPostfix, parsedDialogs);
  const outputDir = getCopperCubeExtensionsDir();
  const outputPath = path.join(outputDir, getExtensionFileName(extensionPostfix));

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, extensionText, "utf-8");

  return outputPath;
}
