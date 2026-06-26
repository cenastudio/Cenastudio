import { z } from "zod";

export const generateSchema = z.object({
  toolId: z.string().min(1, "toolId is required"),
  input: z.record(z.string(), z.string()).default({}),
  projectId: z.number().int().positive().optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
