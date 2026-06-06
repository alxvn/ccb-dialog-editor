import { JSX, useEffect, useRef, useState, type FormEvent } from "react";
import { responseMoods } from "../../shared/llmMoods";

export type GenerateLineFormValues = {
  moodId: string;
  detailed: boolean;
  userPrompt: string;
};

type Props = {
  onSubmit: (values: GenerateLineFormValues) => void;
  onCancel: () => void;
  generating: boolean;
};

export default function GenerateLineModal({ onSubmit, onCancel, generating }: Props): JSX.Element {
  const [moodId, setMoodId] = useState(responseMoods[0].id);
  const [detailed, setDetailed] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit({ moodId, detailed, userPrompt });
  };

  return (
    <div className="modal-overlay" onClick={generating ? undefined : onCancel} role="presentation">
      <div
        className="modal panel modal-wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="generate-line-title"
      >
        <h2 id="generate-line-title">Generate NPC Line</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="generate-mood">
            Response mood
          </label>
          <select
            id="generate-mood"
            value={moodId}
            disabled={generating}
            onChange={(event) => setMoodId(event.target.value)}
          >
            {responseMoods.map((mood) => (
              <option key={mood.id} value={mood.id}>
                {mood.label}
              </option>
            ))}
          </select>

          <label className="dialog-type-option generate-detailed-option">
            <input
              type="checkbox"
              checked={detailed}
              disabled={generating}
              onChange={(event) => setDetailed(event.target.checked)}
            />
            Make detailed response
          </label>

          <label className="field-label" htmlFor="generate-prompt">
            Prompt
          </label>
          <textarea
            id="generate-prompt"
            ref={textareaRef}
            className="generate-prompt-input"
            value={userPrompt}
            placeholder="Say you don't know"
            disabled={generating}
            onChange={(event) => setUserPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !generating) onCancel();
            }}
          />

          {generating ? <p className="generate-loading">Generating response...</p> : null}

          <div className="actions-row modal-actions">
            <button type="button" onClick={onCancel} disabled={generating}>
              Cancel
            </button>
            <button type="submit" disabled={generating}>
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
