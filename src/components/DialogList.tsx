import { JSX } from "react/jsx-runtime";
import type { ProjectDialogRef } from "../../shared/schemas";

type Props = {
  projectName: string;
  dialogs: ProjectDialogRef[];
  activeDialogId: string | null;
  onCreateDialog: () => void;
  onSelectDialog: (dialogId: string) => void;
  onRemoveProject: () => void;
};

export default function DialogList({
  projectName,
  dialogs,
  activeDialogId,
  onCreateDialog,
  onSelectDialog,
  onRemoveProject,
}: Props): JSX.Element {
  return (
    <aside className="sidebar panel">
      <div className="project-bar">
        <h1 className="project-title">{projectName}</h1>
        <button type="button" className="danger" onClick={onRemoveProject}>
          Delete Project
        </button>
      </div>
      <div className="sidebar-header">
        <h2>Dialogs</h2>
        <button type="button" onClick={onCreateDialog}>
          New Dialog
        </button>
      </div>
      <ul className="list">
        {dialogs.map((dialog) => (
          <li key={dialog.id}>
            <div className="list-row">
              <button
                type="button"
                className={dialog.id === activeDialogId ? "list-button active" : "list-button"}
                onClick={() => onSelectDialog(dialog.id)}
              >
                {dialog.name}
              </button>
              <button
                type="button"
                className="list-row-action"
                title="Copy name"
                aria-label={`Copy name: ${dialog.name}`}
                onClick={() => void navigator.clipboard.writeText(dialog.name)}
              >
                Copy
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
