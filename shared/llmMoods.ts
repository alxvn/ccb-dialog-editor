export type ResponseMood = {
  id: string;
  label: string;
  instruction: string;
};

export const responseMoods: ResponseMood[] = [
  { id: "neutral", label: "Neutral", instruction: "Respond neutrally." },
  { id: "natural", label: "Natural", instruction: "Respond in a natural, conversational tone." },
  { id: "positive", label: "Positive", instruction: "Respond in a warm, optimistic way." },
  { id: "aggressive", label: "Aggressive", instruction: "Respond aggressively and confrontationally." },
  { id: "suspicious", label: "Suspicious", instruction: "Respond with suspicion and distrust." },
  { id: "nervous", label: "Nervous", instruction: "Respond anxiously, as if uneasy or frightened." },
  { id: "formal", label: "Formal", instruction: "Respond formally and professionally." },
  { id: "sarcastic", label: "Sarcastic", instruction: "Respond with dry sarcasm." },
  { id: "melancholic", label: "Melancholic", instruction: "Respond with sadness or regret." },
];

export function getMoodInstruction(moodId: string): string {
  const mood = responseMoods.find((m) => m.id === moodId);
  return mood?.instruction ?? responseMoods[0].instruction;
}
