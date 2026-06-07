import { getMoodInstruction } from "./llmMoods";
import type { DialogLine, Speaker } from "./schemas";

export type PromptRole = "npc" | "player";

export type BuildNpcPromptParams = {
  speakerName: string;
  speakerDescription: string;
  location: string;
  linesBefore: DialogLine[];
  moodId: string;
  userPrompt: string;
  detailed: boolean;
  role?: PromptRole;
};

function formatDialogueHistory(lines: DialogLine[]): string {
  const entries = lines.filter((line) => line.text.trim() !== "");
  if (entries.length === 0) {
    return "";
  }
  return entries.map((line, index) => `${index + 1}. ${line.speaker}: ${line.text}`).join("\n");
}

export function findSpeakerDescription(speakers: Speaker[], speakerName: string): string {
  const speaker = speakers.find((s) => s.name === speakerName);
  return speaker?.description ?? "";
}

export function buildNpcPrompt(params: BuildNpcPromptParams): string {
  const {
    speakerName,
    speakerDescription,
    location,
    linesBefore,
    moodId,
    userPrompt,
    detailed,
    role = "npc",
  } = params;

  const sections: string[] = [];

  sections.push(
    role === "player"
      ? "You are the player character, choosing what to say next in the game dialogue."
      : "You are a game character, responding to the game dialogue.",
  );
  sections.push("");
  sections.push("#Character:");
  sections.push(`##Name: ${speakerName}`);
  if (speakerDescription.trim()) {
    sections.push(`##Description: ${speakerDescription.trim()}`);
  }
  sections.push("");

  if (location.trim()) {
    sections.push("#Location:");
    sections.push(location.trim());
    sections.push("");
  }

  const dialogue = formatDialogueHistory(linesBefore);
  if (dialogue) {
    sections.push("#Dialogue:");
    sections.push(dialogue);
    sections.push("");
  }

  sections.push("#Instruction:");
  sections.push(getMoodInstruction(moodId));
  if (userPrompt.trim()) {
    sections.push(userPrompt.trim());
  }
  sections.push(detailed ? "Answer in detail." : "Keep the response concise.");
  sections.push("");
  sections.push(
    role === "player"
      ? "Generate only the next player dialogue choice."
      : "Generate only the next dialogue line.",
  );

  const prompt = sections.join("\n");
  console.log(`buildNpcPrompt: ${prompt}`);

  return prompt;
}
