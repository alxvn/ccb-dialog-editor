import type { DialogFile, DialogType, ProjectFile } from "../../shared/schemas";

type ProjectSummary = { id: string; name: string; projectDir: string };
type OpenProjectResult = { project: ProjectFile; dialogs: DialogFile[] };

declare global {
  interface Window {
    dialogApi: {
      listProjects: () => Promise<ProjectSummary[]>;
      createProject: (name: string) => Promise<ProjectSummary>;
      openProject: (projectId: string) => Promise<OpenProjectResult>;
      removeProject: (projectId: string) => Promise<void>;
      updateProject: (projectId: string, project: ProjectFile) => Promise<ProjectFile>;
      createDialog: (projectId: string, name: string, type: DialogType) => Promise<DialogFile>;
      updateDialog: (projectId: string, dialog: DialogFile) => Promise<DialogFile>;
      removeDialog: (projectId: string, dialogId: string) => Promise<void>;
      exportProject: (projectId: string, dialogs: DialogFile[]) => Promise<string>;
    };
    llmApi: {
      getStatus: () => Promise<{ downloaded: boolean }>;
      downloadModel: (onProgress: (percent: number) => void) => Promise<void>;
      generateLine: (prompt: string, speakerName: string) => Promise<{ text: string }>;
    };
  }
}

export {};
