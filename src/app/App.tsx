import { JSX, useEffect, useMemo, useRef, useState } from "react";
import type { DialogFile, ProjectFile } from "../../shared/schemas";
import ConfirmModal from "../components/ConfirmModal";
import DialogEditor from "../components/DialogEditor";
import DialogList from "../components/DialogList";
import NamePromptModal from "../components/NamePromptModal";
import ProjectPicker from "../components/ProjectPicker";

type ProjectSummary = { id: string; name: string; projectDir: string };

type NamePromptConfig = {
  title: string;
  submitLabel?: string;
  onSubmit: (name: string) => void | Promise<void>;
};

type ConfirmConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export default function App(): JSX.Element {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectFile | null>(null);
  const [dialogsMap, setDialogsMap] = useState<Record<string, DialogFile>>({});
  const [activeDialogId, setActiveDialogId] = useState<string | null>(null);
  const [namePrompt, setNamePrompt] = useState<NamePromptConfig | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<ConfirmConfig | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    void window.dialogApi.listProjects().then(setProjects);
  }, []);

  const activeDialog = useMemo(() => (activeDialogId ? dialogsMap[activeDialogId] ?? null : null), [activeDialogId, dialogsMap]);

  const saveDialogDebounced = (nextDialog: DialogFile): void => {
    if (!project) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void window.dialogApi.updateDialog(project.id, nextDialog);
    }, 400);
  };

  const openNamePrompt = (config: NamePromptConfig): void => {
    setNamePrompt(config);
  };

  const closeNamePrompt = (): void => {
    setNamePrompt(null);
  };

  const openConfirm = (config: ConfirmConfig): void => {
    setConfirmPrompt(config);
  };

  const closeConfirm = (): void => {
    setConfirmPrompt(null);
  };

  const handleCreateProject = (): void => {
    openNamePrompt({
      title: "Project name",
      onSubmit: async (name) => {
        closeNamePrompt();
        const created = await window.dialogApi.createProject(name);
        setProjects((prev) => [...prev, created]);
        await handleOpenProject(created.id);
      },
    });
  };

  const handleOpenProject = async (projectId: string): Promise<void> => {
    const result = await window.dialogApi.openProject(projectId);
    setProject(result.project);
    const nextMap: Record<string, DialogFile> = {};
    result.dialogs.forEach((dialog) => {
      nextMap[dialog.id] = dialog;
    });
    setDialogsMap(nextMap);
    setActiveDialogId(result.dialogs[0]?.id ?? null);
  };

  const handleCreateDialog = (): void => {
    if (!project) return;
    openNamePrompt({
      title: "Dialog name",
      onSubmit: async (name) => {
        closeNamePrompt();
        const dialog = await window.dialogApi.createDialog(project.id, name);
        setProject((prev) =>
          prev ? { ...prev, dialogs: [...prev.dialogs, { id: dialog.id, name: dialog.name, file: `${dialog.id}.json` }] } : prev
        );
        setDialogsMap((prev) => ({ ...prev, [dialog.id]: dialog }));
        setActiveDialogId(dialog.id);
      },
    });
  };

  const updateDialogLocal = (nextDialog: DialogFile): void => {
    setDialogsMap((prev) => ({ ...prev, [nextDialog.id]: nextDialog }));
    setProject((prev) =>
      prev
        ? {
            ...prev,
            dialogs: prev.dialogs.map((ref) => (ref.id === nextDialog.id ? { ...ref, name: nextDialog.name } : ref)),
          }
        : prev
    );
    saveDialogDebounced(nextDialog);
  };

  const performRemoveDialog = async (dialogId: string): Promise<void> => {
    if (!project) return;
    await window.dialogApi.removeDialog(project.id, dialogId);
    const nextDialogs = project.dialogs.filter((d) => d.id !== dialogId);
    setDialogsMap((prev) => {
      const next = { ...prev };
      delete next[dialogId];
      return next;
    });
    setProject((prev) => (prev ? { ...prev, dialogs: nextDialogs } : prev));
    setActiveDialogId((current) => {
      if (current !== dialogId) return current;
      return nextDialogs[0]?.id ?? null;
    });
  };

  const requestRemoveDialog = (): void => {
    if (!project || !activeDialogId) return;
    const dialogName = project.dialogs.find((d) => d.id === activeDialogId)?.name ?? "this dialog";
    openConfirm({
      title: "Delete dialog?",
      message: `"${dialogName}" will be permanently deleted. This cannot be undone.`,
      onConfirm: async () => {
        closeConfirm();
        await performRemoveDialog(activeDialogId);
      },
    });
  };

  const performRemoveProject = async (projectId: string): Promise<void> => {
    await window.dialogApi.removeProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (project?.id === projectId) {
      setProject(null);
      setDialogsMap({});
      setActiveDialogId(null);
    }
  };

  const requestRemoveProject = (projectId: string, projectName: string): void => {
    openConfirm({
      title: "Delete project?",
      message: `"${projectName}" and all of its dialogs will be permanently deleted. This cannot be undone.`,
      onConfirm: async () => {
        closeConfirm();
        await performRemoveProject(projectId);
      },
    });
  };

  const handleExport = async (): Promise<void> => {
    if (!project) return;
    const dialogs = Object.values(dialogsMap);
    const outputPath = await window.dialogApi.exportProject(project.id, dialogs);
    setExportMessage(`Exported to ${outputPath}`);
    window.setTimeout(() => setExportMessage(null), 4000);
  };

  const namePromptModal = namePrompt ? (
    <NamePromptModal
      title={namePrompt.title}
      submitLabel={namePrompt.submitLabel}
      onCancel={closeNamePrompt}
      onSubmit={(name) => void namePrompt.onSubmit(name)}
    />
  ) : null;

  const confirmModal = confirmPrompt ? (
    <ConfirmModal
      title={confirmPrompt.title}
      message={confirmPrompt.message}
      confirmLabel={confirmPrompt.confirmLabel}
      onCancel={closeConfirm}
      onConfirm={() => void confirmPrompt.onConfirm()}
    />
  ) : null;

  if (!project) {
    return (
      <>
        <ProjectPicker
          projects={projects}
          onCreateProject={handleCreateProject}
          onOpenProject={handleOpenProject}
          onRemoveProject={requestRemoveProject}
        />
        {namePromptModal}
        {confirmModal}
      </>
    );
  }

  return (
    <main className="app-layout">
      <DialogList
        projectName={project.name}
        dialogs={project.dialogs}
        activeDialogId={activeDialogId}
        onCreateDialog={handleCreateDialog}
        onSelectDialog={setActiveDialogId}
        onRemoveProject={() => requestRemoveProject(project.id, project.name)}
      />
      {activeDialog ? (
        <DialogEditor
          dialog={activeDialog}
          onDialogNameChange={(name) => updateDialogLocal({ ...activeDialog, name })}
          onLinesChange={(lines) => updateDialogLocal({ ...activeDialog, lines })}
          onRemoveDialog={requestRemoveDialog}
          onExport={handleExport}
        />
      ) : (
        <section className="panel editor">
          <h2>No dialog selected</h2>
          <p>Create a new dialog from the sidebar.</p>
        </section>
      )}
      {exportMessage ? <div className="toast">{exportMessage}</div> : null}
      {namePromptModal}
      {confirmModal}
    </main>
  );
}
