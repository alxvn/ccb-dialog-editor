import { JSX, useEffect, useRef, useState, type FormEvent } from "react";

type Props = {
  title: string;
  submitLabel?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
};

export default function NamePromptModal({
  title,
  submitLabel = "Create",
  onSubmit,
  onCancel,
}: Props): JSX.Element {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div className="modal panel" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="name-prompt-title">
        <h2 id="name-prompt-title">{title}</h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder="Name"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancel();
            }}
          />
          <div className="actions-row modal-actions">
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={!value.trim()}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
