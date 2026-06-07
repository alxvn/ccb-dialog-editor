import { z } from "zod";

export const dialogActionIds = [
  "action_1",
  "action_2",
  "action_3",
  "action_4",
  "action_5",
  "action_6",
  "action_7",
  "action_8",
  "action_9",
  "action_10",
  "action_11",
  "action_12",
  "action_13",
  "action_14",
  "action_15",
] as const;

export const dialogTypeSchema = z.enum(["linear", "branching"]);
export type DialogType = z.infer<typeof dialogTypeSchema>;

export const dialogLineSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  text: z.string(),
  preAction: z.string().nullable().default(null),
  postAction: z.string().nullable().default(null),
  delay: z.number().nullable().default(null),
});

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const lineBranchingNodeSchema = z.object({
  id: z.string(),
  type: z.literal("line"),
  position: positionSchema,
  speaker: z.string(),
  text: z.string(),
  preAction: z.string().nullable().default(null),
  postAction: z.string().nullable().default(null),
  delay: z.number().nullable().default(null),
});

export const responseBranchingNodeSchema = z.object({
  id: z.string(),
  type: z.literal("response"),
  position: positionSchema,
  text: z.string(),
  preAction: z.string().nullable().default(null),
  postAction: z.string().nullable().default(null),
});

export const branchingNodeSchema = z.discriminatedUnion("type", [
  lineBranchingNodeSchema,
  responseBranchingNodeSchema,
]);

export const branchingEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
});

export const branchingViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const linearDialogFileSchema = z.object({
  type: z.literal("linear"),
  id: z.string(),
  name: z.string(),
  location: z.string().default(""),
  lines: z.array(dialogLineSchema),
});

export const branchingDialogFileSchema = z.object({
  type: z.literal("branching"),
  id: z.string(),
  name: z.string(),
  location: z.string().default(""),
  playerSpeaker: z.string().default(""),
  nodes: z.array(branchingNodeSchema),
  edges: z.array(branchingEdgeSchema),
  viewport: branchingViewportSchema.optional(),
});

const legacyDialogFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  lines: z.array(dialogLineSchema),
});

function preprocessDialogFile(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  let next = record;
  if (!("type" in record) && "lines" in record) {
    next = { ...record, type: "linear" };
  }
  if (next.type === "linear" && !("location" in next)) {
    next = { ...next, location: "" };
  }
  if (next.type === "branching") {
    if (!("location" in next)) {
      next = { ...next, location: "" };
    }
    if (!("playerSpeaker" in next)) {
      next = { ...next, playerSpeaker: "" };
    }
  }
  return next;
}

function preprocessProjectFile(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (!("speakers" in record)) {
    return { ...record, speakers: [] };
  }
  return value;
}

export const dialogFileSchema = z.preprocess(
  preprocessDialogFile,
  z.discriminatedUnion("type", [linearDialogFileSchema, branchingDialogFileSchema]),
);

export const dialogRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string(),
});

export const projectFileSchema = z.preprocess(
  preprocessProjectFile,
  z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    extensionPostfix: z.string().length(6).optional(),
    speakers: z.array(speakerSchema).default([]),
    dialogs: z.array(dialogRefSchema),
  }),
);

export const registryProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectDir: z.string(),
});

export const projectsRegistrySchema = z.object({
  version: z.literal(1),
  projects: z.array(registryProjectSchema),
  lastOpenedProjectId: z.string().nullable(),
  lastOpenedDialogId: z.string().nullable(),
});

export type Speaker = z.infer<typeof speakerSchema>;
export type DialogLine = z.infer<typeof dialogLineSchema>;
export type LineBranchingNode = z.infer<typeof lineBranchingNodeSchema>;
export type ResponseBranchingNode = z.infer<typeof responseBranchingNodeSchema>;
export type BranchingNode = z.infer<typeof branchingNodeSchema>;
export type BranchingEdge = z.infer<typeof branchingEdgeSchema>;
export type BranchingViewport = z.infer<typeof branchingViewportSchema>;
export type LinearDialogFile = z.infer<typeof linearDialogFileSchema>;
export type BranchingDialogFile = z.infer<typeof branchingDialogFileSchema>;
export type DialogFile = z.infer<typeof dialogFileSchema>;
export type ProjectDialogRef = z.infer<typeof dialogRefSchema>;
export type ProjectFile = z.infer<typeof projectFileSchema>;
export type RegistryProject = z.infer<typeof registryProjectSchema>;
export type ProjectsRegistry = z.infer<typeof projectsRegistrySchema>;

export const LINE_NODE_OUTPUT_HANDLES = ["out-0", "out-1", "out-2", "out-3"] as const;
export const LINE_NODE_INPUT_HANDLE = "in";
export const RESPONSE_NODE_INPUT_HANDLE = "in";
export const RESPONSE_NODE_OUTPUT_HANDLE = "out";
