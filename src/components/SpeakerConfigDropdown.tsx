import { JSX, useEffect, useRef, useState } from "react";
import type { Speaker } from "../../shared/schemas";

type Props = {
  speakers: Speaker[];
  onSpeakersChange: (speakers: Speaker[]) => void;
};

function createEmptySpeaker(): Speaker {
  return { id: crypto.randomUUID(), name: "", description: "" };
}

export default function SpeakerConfigDropdown({ speakers, onSpeakersChange }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const updateSpeaker = (speakerId: string, patch: Partial<Speaker>): void => {
    onSpeakersChange(speakers.map((speaker) => (speaker.id === speakerId ? { ...speaker, ...patch } : speaker)));
  };

  const removeSpeaker = (speakerId: string): void => {
    onSpeakersChange(speakers.filter((speaker) => speaker.id !== speakerId));
  };

  const addSpeaker = (): void => {
    onSpeakersChange([...speakers, createEmptySpeaker()]);
  };

  return (
    <div className="speaker-dropdown" ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        Speakers ({speakers.length})
      </button>
      {open ? (
        <div className="speaker-dropdown-panel panel">
          <div className="speaker-dropdown-header">
            <strong>Project Speakers</strong>
            <button type="button" onClick={addSpeaker}>
              + Add
            </button>
          </div>
          {speakers.length === 0 ? (
            <p className="speaker-dropdown-empty">No speakers configured yet.</p>
          ) : (
            <ul className="speaker-list">
              {speakers.map((speaker) => (
                <li key={speaker.id} className="speaker-row">
                  <input
                    value={speaker.name}
                    placeholder="Speaker name"
                    onChange={(event) => updateSpeaker(speaker.id, { name: event.target.value })}
                  />
                  <textarea
                    value={speaker.description}
                    placeholder="Description (personality, role, etc.)"
                    onChange={(event) => updateSpeaker(speaker.id, { description: event.target.value })}
                  />
                  <button type="button" className="danger" onClick={() => removeSpeaker(speaker.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
