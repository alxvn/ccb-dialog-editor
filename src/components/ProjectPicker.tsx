import { JSX } from "react/jsx-runtime";

type ProjectSummary = { id: string; name: string; projectDir: string };

type Props = {
  projects: ProjectSummary[];
  onCreateProject: () => void;
  onOpenProject: (projectId: string) => void;
  onRemoveProject: (projectId: string, projectName: string) => void;
};

export default function ProjectPicker({ projects, onCreateProject, onOpenProject, onRemoveProject }: Props): JSX.Element {
  return (
    <section className="panel start-panel">
      <h1>Dialog Tool</h1>
      <p>Create a project or open an existing one.</p>
      <div className="actions-row">
        <button type="button" onClick={onCreateProject}>
          Create Project
        </button>
      </div>
      <h2>Existing Projects</h2>
      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul className="list">
          {projects.map((project) => (
            <li key={project.id} className="list-row">
              <button type="button" className="list-button" onClick={() => onOpenProject(project.id)}>
                {project.name}
              </button>
              <button
                type="button"
                className="danger list-row-action"
                title={`Delete ${project.name}`}
                onClick={() => onRemoveProject(project.id, project.name)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
