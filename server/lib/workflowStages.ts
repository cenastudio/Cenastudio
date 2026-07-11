/**
 * Server-side mirror of client/src/lib/workflow.ts.
 *
 * The project already duplicates workflow concepts between client and
 * server (e.g. `toolId`/`toolSlug` tracked via `populatedStates`), so this
 * file follows the same established pattern instead of introducing a new
 * shared import between client and server.
 *
 * Used by taskService.ts to validate that a Task's optional `stageId`/
 * `toolSlug` references a real step of the project workflow before
 * persisting it. Keep in sync with WORKFLOW_STAGES in
 * client/src/lib/workflow.ts whenever a stage or tool is added/removed.
 */

export type WorkflowStageId =
  | "entry"
  | "planning"
  | "production"
  | "review"
  | "delivery"
  | "closing";

export const VALID_STAGE_IDS: readonly WorkflowStageId[] = [
  "entry",
  "planning",
  "production",
  "review",
  "delivery",
  "closing",
];

export const VALID_TOOL_SLUGS: readonly string[] = [
  // entry
  "briefing",
  "orcamento",
  "proposta",
  "contrato",
  // planning
  "roteiro",
  "moodboard",
  "decupagem",
  "cronograma",
  "callsheet",
  "checklist",
  // production
  "assistente",
  // delivery
  "entrega",
];

export function isValidStageId(value: string | null | undefined): boolean {
  if (!value) return true; // optional field
  return (VALID_STAGE_IDS as string[]).includes(value);
}

export function isValidToolSlug(value: string | null | undefined): boolean {
  if (!value) return true; // optional field
  return VALID_TOOL_SLUGS.includes(value);
}
