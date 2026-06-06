import { getMoodInstruction } from "./llmMoods";
import type { DialogLine, Speaker } from "./schemas";

export type BuildNpcPromptParams = {
  speakerName: string;
  speakerDescription: string;
  location: string;
  linesBefore: DialogLine[];
  moodId: string;
  userPrompt: string;
  detailed: boolean;
};

function formatDialogueHistory(lines: DialogLine[]): string {
  const entries = lines.filter((line) => line.text.trim() !== "");
  if (entries.length === 0) {
    return "";
  }
  return entries.map((line) => `${line.speaker}: ${line.text}`).join("\n");
}

export function findSpeakerDescription(speakers: Speaker[], speakerName: string): string {
  const speaker = speakers.find((s) => s.name === speakerName);
  return speaker?.description ?? "";
}

export function buildNpcPrompt(params: BuildNpcPromptParams): string {
  const {
    speakerDescription,
    location,
    linesBefore,
    moodId,
    userPrompt,
    detailed,
  } = params;

  const sections: string[] = [];

  sections.push("Character:");
  sections.push(speakerDescription.trim() || "(No description provided.)");
  sections.push("");

  if (location.trim()) {
    sections.push("Location:");
    sections.push(location.trim());
    sections.push("");
  }

  const dialogue = formatDialogueHistory(linesBefore);
  if (dialogue) {
    sections.push("Dialogue:");
    sections.push(dialogue);
    sections.push("");
  }

  sections.push("Instruction:");
  sections.push(getMoodInstruction(moodId));
  if (userPrompt.trim()) {
    sections.push(userPrompt.trim());
  }
  sections.push(detailed ? "Answer in detail." : "Keep the response concise.");
  sections.push("");
  sections.push("Generate only the next dialogue line.");

  return sections.join("\n");
}
