import { z } from "zod";

export const generateSchema = z.object({
  toolId: z.string().min(1, "toolId is required"),
  input: z.record(z.string(), z.string()).default({}),
  projectId: z.number().int().positive().optional(),
  model: z.string().min(1).optional(),
  locale: z.enum(["pt", "en"]).optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;
