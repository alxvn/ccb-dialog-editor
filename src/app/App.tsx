import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCopperCubeDialogExtension } from "../../shared/exportFormat";
import type { BranchingDialogFile, DialogFile, DialogType, LinearDialogFile, ProjectFile, Speaker } from "../../shared/schemas";
import BranchingDialogEditor from "../components/branching/BranchingDialogEditor";
import ConfirmModal from "../components/ConfirmModal";
import CreateDialogModal from "../components/CreateDialogModal";
import DialogList from "../components/DialogList";
import LinearDialogEditor from "../components/LinearDialogEditor";
import ModelDownloadPanel from "../components/ModelDownloadPanel";
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const projectSaveTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    void window.dialogApi.listProjects().then(setProjects);
  }, []);

  const activeDialog = useMemo(() => (activeDialogId ? dialogsMap[activeDialogId] ?? null : null), [activeDialogId, dialogsMap]);

  const dialogTypes = useMemo(() => {
    const types: Record<string, DialogType> = {};
    Object.values(dialogsMap).forEach((dialog) => {
      types[dialog.id] = dialog.type;
    });
    return types;
  }, [dialogsMap]);

  const saveDialogDebounced = (nextDialog: DialogFile): void => {
    if (!project) return;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void window.dialogApi.updateDialog(project.id, nextDialog);
    }, 400);
  };

  const saveProjectDebounced = (nextProject: ProjectFile): void => {
    window.clearTimeout(projectSaveTimerRef.current);
    projectSaveTimerRef.current = window.setTimeout(() => {
      void window.dialogApi.updateProject(nextProject.id, nextProject);
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
    setShowCreateDialog(true);
  };

  const handleCreateDialogSubmit = async (name: string, type: DialogType): Promise<void> => {
    if (!project) return;
    setShowCreateDialog(false);
    const dialog = await window.dialogApi.createDialog(project.id, name, type);
    setProject((prev) =>
      prev ? { ...prev, dialogs: [...prev.dialogs, { id: dialog.id, name: dialog.name, file: `${dialog.id}.json` }] } : prev,
    );
    setDialogsMap((prev) => ({ ...prev, [dialog.id]: dialog }));
    setActiveDialogId(dialog.id);
  };

  const updateDialogLocal = useCallback((nextDialog: DialogFile): void => {
    setDialogsMap((prev) => {
      const current = prev[nextDialog.id];
      if (current && JSON.stringify(current) === JSON.stringify(nextDialog)) {
        return prev;
      }
      return { ...prev, [nextDialog.id]: nextDialog };
    });
    setProject((prev) => {
      if (!prev) return prev;
      const ref = prev.dialogs.find((d) => d.id === nextDialog.id);
      if (ref?.name === nextDialog.name) {
        return prev;
      }
      return {
        ...prev,
        dialogs: prev.dialogs.map((dialogRef) =>
          dialogRef.id === nextDialog.id ? { ...dialogRef, name: nextDialog.name } : dialogRef,
        ),
      };
    });
    saveDialogDebounced(nextDialog);
  }, [project]);

  const updateProjectLocal = useCallback(
    (nextProject: ProjectFile): void => {
      setProject((prev) => {
        if (!prev) return prev;
        if (JSON.stringify(prev) === JSON.stringify(nextProject)) {
          return prev;
        }
        return nextProject;
      });
      saveProjectDebounced(nextProject);
    },
    [],
  );

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

  const handleExport = async (dialogOverride?: DialogFile): Promise<void> => {
    if (!project) return;
    const extensionPostfix = await window.dialogApi.ensureExtensionPostfix(project.id);
    if (project.extensionPostfix !== extensionPostfix) {
      updateProjectLocal({ ...project, extensionPostfix });
    }
    const dialogs = Object.values(dialogsMap).map((dialog) =>
      dialogOverride && dialog.id === dialogOverride.id ? dialogOverride : dialog,
    );
    const extensionText = buildCopperCubeDialogExtension(
      project.name,
      extensionPostfix,
      dialogs,
    );
    const outputPath = await window.dialogApi.writeExtension(project.id, extensionText);
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

  const createDialogModal = showCreateDialog ? (
    <CreateDialogModal onCancel={() => setShowCreateDialog(false)} onSubmit={(name, type) => void handleCreateDialogSubmit(name, type)} />
  ) : null;

  if (!project) {
    return (
      <>
        <div className="start-layout">
          <ProjectPicker
            projects={projects}
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onRemoveProject={requestRemoveProject}
          />
          <ModelDownloadPanel />
        </div>
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
        dialogTypes={dialogTypes}
        activeDialogId={activeDialogId}
        onCreateDialog={handleCreateDialog}
        onSelectDialog={setActiveDialogId}
        onRemoveProject={() => requestRemoveProject(project.id, project.name)}
      />
      {activeDialog?.type === "branching" ? (
        <BranchingDialogEditor
          dialog={activeDialog as BranchingDialogFile}
          speakers={project.speakers ?? []}
          onDialogChange={updateDialogLocal}
          onDialogNameChange={(name) => updateDialogLocal({ ...activeDialog, name })}
          onLocationChange={(location) => updateDialogLocal({ ...activeDialog, location })}
          onPlayerSpeakerChange={(playerSpeaker) => updateDialogLocal({ ...activeDialog, playerSpeaker })}
          onSpeakersChange={(speakers: Speaker[]) => updateProjectLocal({ ...project, speakers })}
          onRemoveDialog={requestRemoveDialog}
          onExport={handleExport}
        />
      ) : activeDialog?.type === "linear" ? (
        <LinearDialogEditor
          dialog={activeDialog as LinearDialogFile}
          speakers={project.speakers ?? []}
          onDialogNameChange={(name) => updateDialogLocal({ ...activeDialog, name })}
          onLocationChange={(location) => updateDialogLocal({ ...activeDialog, location })}
          onSpeakersChange={(speakers: Speaker[]) => updateProjectLocal({ ...project, speakers })}
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
      {createDialogModal}
    </main>
  );
}
