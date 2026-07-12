/**
 * Mapeamento de role livre de `Collaborator` → enum fechado `TeamRole`.
 * Spec: team-task-delegation, Fase 5 (migração Collaborator → Team).
 *
 * Extraído para módulo próprio (em vez de inline no script) para ser
 * coberto por teste automático — é a única lógica não-trivial da migração,
 * e um mapeamento errado atribuiria a permissão errada a um membro.
 */

export type TeamRole = "producer" | "editor" | "viewer";

export interface RoleMapResult {
  role: TeamRole;
  /** true quando o role de origem não tinha equivalência clara e caiu em viewer. */
  needsReview: boolean;
}

/**
 * Regras (design.md, Fase 5):
 *   admin | director | producer  → producer
 *   editor | camera              → editor
 *   member | viewer | (vazio)    → viewer
 *   qualquer outro               → viewer + needsReview (revisão manual)
 */
export function mapCollaboratorRole(freeRole: string | null | undefined): RoleMapResult {
  const r = (freeRole || "").toLowerCase().trim();
  if (["admin", "director", "producer"].includes(r)) return { role: "producer", needsReview: false };
  if (["editor", "camera"].includes(r)) return { role: "editor", needsReview: false };
  if (["member", "", "viewer"].includes(r)) return { role: "viewer", needsReview: false };
  return { role: "viewer", needsReview: true };
}
