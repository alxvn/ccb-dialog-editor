import { contextBridge, ipcRenderer } from "electron";
import type { DialogFile, DialogType } from "../shared/schemas";

const api = {
  listProjects: async () => ipcRenderer.invoke("projects:list"),
  createProject: async (name: string) => ipcRenderer.invoke("projects:create", name),
  openProject: async (projectId: string) => ipcRenderer.invoke("projects:open", projectId),
  removeProject: async (projectId: string) => ipcRenderer.invoke("projects:remove", projectId),
  createDialog: async (projectId: string, name: string, type: DialogType) =>
    ipcRenderer.invoke("dialogs:create", projectId, name, type),
  updateDialog: async (projectId: string, dialog: DialogFile) => ipcRenderer.invoke("dialogs:update", projectId, dialog),
  removeDialog: async (projectId: string, dialogId: string) => ipcRenderer.invoke("dialogs:remove", projectId, dialogId),
  exportProject: async (projectId: string, dialogs: DialogFile[]) =>
    ipcRenderer.invoke("projects:export", projectId, dialogs),
};

contextBridge.exposeInMainWorld("dialogApi", api);
