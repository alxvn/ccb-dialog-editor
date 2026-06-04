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

export const dialogLineSchema = z.object({
  id: z.string(),
  speaker: z.string(),
  text: z.string(),
  preAction: z.string().nullable().default(null),
  postAction: z.string().nullable().default(null),
  delay: z.number().nullable().default(null),
});

export const dialogFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  lines: z.array(dialogLineSchema)
});

export const dialogRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string()
});

export const projectFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  extensionPostfix: z.string().length(6).optional(),
  dialogs: z.array(dialogRefSchema)
});

export const registryProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectDir: z.string()
});

export const projectsRegistrySchema = z.object({
  version: z.literal(1),
  projects: z.array(registryProjectSchema),
  lastOpenedProjectId: z.string().nullable(),
  lastOpenedDialogId: z.string().nullable()
});

export type DialogLine = z.infer<typeof dialogLineSchema>;
export type DialogFile = z.infer<typeof dialogFileSchema>;
export type ProjectDialogRef = z.infer<typeof dialogRefSchema>;
export type ProjectFile = z.infer<typeof projectFileSchema>;
export type RegistryProject = z.infer<typeof registryProjectSchema>;
export type ProjectsRegistry = z.infer<typeof projectsRegistrySchema>;
