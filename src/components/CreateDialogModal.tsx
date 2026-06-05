import { JSX, useEffect, useRef, useState, type FormEvent } from "react";
import type { DialogType } from "../../shared/schemas";

type Props = {
  onSubmit: (name: string, type: DialogType) => void;
  onCancel: () => void;
};

export default function CreateDialogModal({ onSubmit, onCancel }: Props): JSX.Element {
  const [name, setName] = useState("");
  const [dialogType, setDialogType] = useState<DialogType>("linear");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, dialogType);
  };

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div className="modal panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="create-dialog-title">
        <h2 id="create-dialog-title">New dialog</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="create-dialog-name">
            Name
          </label>
          <input
            id="create-dialog-name"
            ref={inputRef}
            type="text"
            value={name}
            placeholder="Dialog name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
          />
          <fieldset className="dialog-type-fieldset">
            <legend className="field-label">Type</legend>
            <label className="dialog-type-option">
              <input
                type="radio"
                name="dialogType"
                value="linear"
                checked={dialogType === "linear"}
                onChange={() => setDialogType("linear")}
              />
              Linear
            </label>
            <label className="dialog-type-option">
              <input
                type="radio"
                name="dialogType"
                value="branching"
                checked={dialogType === "branching"}
                onChange={() => setDialogType("branching")}
              />
              Branching
            </label>
          </fieldset>
          <div className="actions-row modal-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim()}>
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
