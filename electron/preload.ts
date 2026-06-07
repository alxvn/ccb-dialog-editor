import { contextBridge, ipcRenderer } from "electron";
import type { DialogFile, DialogType, ProjectFile } from "../shared/schemas";

const api = {
  listProjects: async () => ipcRenderer.invoke("projects:list"),
  createProject: async (name: string) => ipcRenderer.invoke("projects:create", name),
  openProject: async (projectId: string) => ipcRenderer.invoke("projects:open", projectId),
  removeProject: async (projectId: string) => ipcRenderer.invoke("projects:remove", projectId),
  updateProject: async (projectId: string, project: ProjectFile) =>
    ipcRenderer.invoke("projects:update", projectId, project),
  createDialog: async (projectId: string, name: string, type: DialogType) =>
    ipcRenderer.invoke("dialogs:create", projectId, name, type),
  updateDialog: async (projectId: string, dialog: DialogFile) => ipcRenderer.invoke("dialogs:update", projectId, dialog),
  removeDialog: async (projectId: string, dialogId: string) => ipcRenderer.invoke("dialogs:remove", projectId, dialogId),
  ensureExtensionPostfix: async (projectId: string) =>
    ipcRenderer.invoke("projects:ensure-extension-postfix", projectId),
  writeExtension: async (projectId: string, extensionText: string) =>
    ipcRenderer.invoke("projects:write-extension", projectId, extensionText),
};

const llmApi = {
  getStatus: async (): Promise<{ downloaded: boolean }> => ipcRenderer.invoke("llm:status"),
  downloadModel: async (onProgress: (percent: number) => void): Promise<void> => {
    const handler = (_event: Electron.IpcRendererEvent, data: { percent: number }) => {
      onProgress(data.percent);
    };
    ipcRenderer.on("llm:download-progress", handler);
    try {
      await ipcRenderer.invoke("llm:download");
    } finally {
      ipcRenderer.removeListener("llm:download-progress", handler);
    }
  },
  generateLine: async (prompt: string, speakerName: string): Promise<{ text: string }> =>
    ipcRenderer.invoke("llm:generate", prompt, speakerName),
};

contextBridge.exposeInMainWorld("dialogApi", api);
contextBridge.exposeInMainWorld("llmApi", llmApi);
