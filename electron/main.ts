import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import {
  createDialog,
  createProject,
  exportProjectToExtension,
  listProjects,
  openProject,
  removeDialog,
  removeProject,
  updateDialog,
  updateProject,
} from "./store";
import type { DialogFile, DialogType, ProjectFile } from "../shared/schemas";
import { downloadModel, generateLine, getModelStatus, disposeWorker } from "./llm/llmBridge";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("projects:list", async () => listProjects());
  ipcMain.handle("projects:create", async (_event, name: string) => createProject(name));
  ipcMain.handle("projects:open", async (_event, projectId: string) => openProject(projectId));
  ipcMain.handle("projects:remove", async (_event, projectId: string) => removeProject(projectId));

  ipcMain.handle("dialogs:create", async (_event, projectId: string, name: string, type: DialogType) =>
    createDialog(projectId, name, type),
  );
  ipcMain.handle("dialogs:update", async (_event, projectId: string, dialog: DialogFile) => updateDialog(projectId, dialog));
  ipcMain.handle("dialogs:remove", async (_event, projectId: string, dialogId: string) => removeDialog(projectId, dialogId));
  ipcMain.handle("projects:update", async (_event, projectId: string, project: ProjectFile) =>
    updateProject(projectId, project),
  );
  ipcMain.handle("projects:export", async (_event, projectId: string, dialogs: DialogFile[]) =>
    exportProjectToExtension(projectId, dialogs),
  );

  ipcMain.handle("llm:status", async () => getModelStatus());
  ipcMain.handle("llm:download", async (event) => {
    await downloadModel((percent) => {
      event.sender.send("llm:download-progress", { percent });
    });
  });
  ipcMain.handle("llm:generate", async (_event, prompt: string, speakerName: string) => {
    const text = await generateLine(prompt, speakerName);
    return { text };
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on('before-quit', () => {
  disposeWorker();
  console.log('worker disposed');
});
