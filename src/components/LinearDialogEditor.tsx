import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DialogLine, LinearDialogFile } from "../../shared/schemas";
import { dialogActionIds } from "../../shared/schemas";
import { JSX } from "react/jsx-runtime";

const emptyLineFields = {
  preAction: null,
  postAction: null,
  delay: null,
} as const;

function parseDelayInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
}

type Props = {
  dialog: LinearDialogFile;
  onDialogNameChange: (name: string) => void;
  onLinesChange: (lines: DialogLine[]) => void;
  onRemoveDialog: () => void;
  onExport: () => void;
};

type LineItemProps = {
  line: DialogLine;
  onChange: (nextLine: DialogLine) => void;
  onRemove: () => void;
};

function SortableLineItem({ line, onChange, onRemove }: LineItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: line.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="line-item">
      <button className="drag-handle" type="button" {...attributes} {...listeners}>
        ::
      </button>
      <input
        value={line.speaker}
        placeholder="Speaker"
        onChange={(event) => onChange({ ...line, speaker: event.target.value })}
      />
      <select
        value={line.preAction ?? ""}
        onChange={(event) =>
          onChange({ ...line, preAction: event.target.value === "" ? null : event.target.value })
        }
        aria-label="Pre action"
      >
        <option value="">None</option>
        {dialogActionIds.map((actionId) => (
          <option key={actionId} value={actionId}>
            {actionId}
          </option>
        ))}
      </select>
      <select
        value={line.postAction ?? ""}
        onChange={(event) =>
          onChange({ ...line, postAction: event.target.value === "" ? null : event.target.value })
        }
        aria-label="Post action"
      >
        <option value="">None</option>
        {dialogActionIds.map((actionId) => (
          <option key={actionId} value={actionId}>
            {actionId}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        step={1}
        value={line.delay ?? ""}
        placeholder="Delay (ms)"
        onChange={(event) => onChange({ ...line, delay: parseDelayInput(event.target.value) })}
        aria-label="Delay in milliseconds"
      />
      <textarea
        value={line.text}
        placeholder="Line"
        onChange={(event) => onChange({ ...line, text: event.target.value })}
      />
      <button type="button" className="danger" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

export default function LinearDialogEditor({
  dialog,
  onDialogNameChange,
  onLinesChange,
  onRemoveDialog,
  onExport,
}: Props): JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor));

  const onAddLine = (): void => {
    onLinesChange([
      ...dialog.lines,
      { id: crypto.randomUUID(), speaker: "", text: "", ...emptyLineFields },
    ]);
  };

  const onLineChange = (lineId: string, nextLine: DialogLine): void => {
    onLinesChange(dialog.lines.map((line) => (line.id === lineId ? nextLine : line)));
  };

  const onLineRemove = (lineId: string): void => {
    onLinesChange(dialog.lines.filter((line) => line.id !== lineId));
  };

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dialog.lines.findIndex((line) => line.id === active.id);
    const newIndex = dialog.lines.findIndex((line) => line.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onLinesChange(arrayMove(dialog.lines, oldIndex, newIndex));
  };

  return (
    <section className="panel editor">
      <div className="editor-header">
        <input value={dialog.name} onChange={(event) => onDialogNameChange(event.target.value)} className="dialog-title" />
        <div className="actions-row">
          <button type="button" onClick={onAddLine}>
            +
          </button>
          <button type="button" onClick={onExport}>
            Export
          </button>
          <button type="button" className="danger" onClick={onRemoveDialog}>
            Delete Dialog
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={dialog.lines.map((line) => line.id)} strategy={verticalListSortingStrategy}>
          <div className="lines-list">
            {dialog.lines.map((line) => (
              <SortableLineItem
                key={line.id}
                line={line}
                onChange={(nextLine) => onLineChange(line.id, nextLine)}
                onRemove={() => onLineRemove(line.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
