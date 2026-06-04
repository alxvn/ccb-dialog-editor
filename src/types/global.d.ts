import type { DialogFile, ProjectFile } from "../../shared/schemas";

type ProjectSummary = { id: string; name: string; projectDir: string };
type OpenProjectResult = { project: ProjectFile; dialogs: DialogFile[] };

declare global {
  interface Window {
    dialogApi: {
      listProjects: () => Promise<ProjectSummary[]>;
      createProject: (name: string) => Promise<ProjectSummary>;
      openProject: (projectId: string) => Promise<OpenProjectResult>;
      removeProject: (projectId: string) => Promise<void>;
      createDialog: (projectId: string, name: string) => Promise<DialogFile>;
      updateDialog: (projectId: string, dialog: DialogFile) => Promise<DialogFile>;
      removeDialog: (projectId: string, dialogId: string) => Promise<void>;
      exportProject: (projectId: string, dialogs: DialogFile[]) => Promise<string>;
    };
  }
}

export {};
