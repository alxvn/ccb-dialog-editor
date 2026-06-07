import { createContext, useContext, type JSX, type ReactNode } from "react";
import type { DialogLine, Speaker } from "../../../shared/schemas";

type BranchingEditorContextValue = {
  speakers: Speaker[];
  playerSpeaker: string;
  location: string;
  getLinesBeforeNode: (nodeId: string) => DialogLine[];
};

const BranchingEditorContext = createContext<BranchingEditorContextValue>({
  speakers: [],
  playerSpeaker: "",
  location: "",
  getLinesBeforeNode: () => [],
});

type ProviderProps = {
  speakers: Speaker[];
  playerSpeaker: string;
  location: string;
  getLinesBeforeNode: (nodeId: string) => DialogLine[];
  children: ReactNode;
};

export function BranchingEditorProvider({
  speakers,
  playerSpeaker,
  location,
  getLinesBeforeNode,
  children,
}: ProviderProps): JSX.Element {
  return (
    <BranchingEditorContext.Provider value={{ speakers, playerSpeaker, location, getLinesBeforeNode }}>
      {children}
    </BranchingEditorContext.Provider>
  );
}

export function useBranchingEditorContext(): BranchingEditorContextValue {
  return useContext(BranchingEditorContext);
}

export function isConfiguredSpeaker(speakers: Speaker[], speakerName: string): boolean {
  return speakers.some((speaker) => speaker.name === speakerName && speaker.name.trim() !== "");
}
