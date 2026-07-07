export type WorkflowStageId = "entry" | "planning" | "production" | "review" | "delivery" | "closing";

export type ArtifactStatus = "draft" | "review" | "approved" | "archived";

export interface WorkflowAction {
  id: string;
  label: string;
  description: string;
  toolId?: string;
  toolSlug?: string;
  route: (projectId: number) => string;
}

export interface WorkflowStage {
  id: WorkflowStageId;
  number: string;
  label: string;
  labelEn: string;
  eyebrow: string;
  description: string;
  outcome: string;
  order?: number;
  actions: WorkflowAction[];
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "entry",
    number: "01",
    label: "Entrada",
    labelEn: "Intake",
    order: 1,
    eyebrow: "A história começa",
    description: "Transforme a demanda do cliente em escopo, valor e acordo claros.",
    outcome: "Job aprovado e pronto para ser planejado.",
    actions: [
      { id: "briefing", label: "Briefing", description: "Objetivo, público, entregáveis e restrições.", toolId: "07", toolSlug: "briefing", route: (id) => `/project/${id}/studio/briefing` },
      { id: "budget", label: "Orçamento", description: "Custos, margem e premissas do job.", toolId: "04", toolSlug: "orcamento", route: (id) => `/project/${id}/studio/orcamento` },
      { id: "proposal", label: "Proposta", description: "Escopo comercial pronto para aceite.", toolId: "05", toolSlug: "proposta", route: (id) => `/project/${id}/studio/proposta` },
      { id: "contract", label: "Contrato", description: "Responsabilidades e proteção formalizadas.", toolId: "06", toolSlug: "contrato", route: (id) => `/project/${id}/studio/contrato` },
    ],
  },
  {
    id: "planning",
    number: "02",
    label: "Planejamento",
    labelEn: "Planning",
    order: 2,
    eyebrow: "O job ganha forma",
    description: "Converta o acordo em narrativa, linguagem visual e plano executável.",
    outcome: "Equipe e set sabem exatamente o que produzir.",
    actions: [
      { id: "script", label: "Roteiro", description: "Narrativa e estrutura de cenas.", toolId: "01", toolSlug: "roteiro", route: (id) => `/project/${id}/studio/roteiro` },
      { id: "moodboard", label: "Moodboard", description: "Direção visual, luz e referências.", toolId: "08", toolSlug: "moodboard", route: (id) => `/project/${id}/studio/moodboard` },
      { id: "breakdown", label: "Decupagem", description: "Planos, lentes e movimentos.", toolId: "02", toolSlug: "decupagem", route: (id) => `/project/${id}/studio/decupagem` },
      { id: "schedule", label: "Cronograma", description: "Marcos, dependências e prazos.", toolId: "10", toolSlug: "cronograma", route: (id) => `/project/${id}/studio/cronograma` },
      { id: "callsheet", label: "Callsheet", description: "Equipe, horários e logística do set.", toolId: "03", toolSlug: "callsheet", route: (id) => `/project/${id}/studio/callsheet` },
      { id: "checklist", label: "Checklist", description: "Conferência técnica antes da captação.", toolId: "09", toolSlug: "checklist", route: (id) => `/project/${id}/studio/checklist` },
    ],
  },
  {
    id: "production",
    number: "03",
    label: "Produção",
    labelEn: "Production",
    order: 3,
    eyebrow: "O plano vira material",
    description: "Centralize equipe, referências, arquivos e decisões enquanto o job acontece.",
    outcome: "Material captado e organizado para pós-produção.",
    actions: [
      { id: "files", label: "Materiais", description: "Uploads, referências e arquivos de produção.", route: (id) => `/project/${id}/files` },
      { id: "team", label: "Equipe", description: "Responsáveis e colaboradores do job.", route: (id) => `/project/${id}/collaborators` },
      { id: "assistant", label: "Assistente", description: "Apoio transversal para decisões de produção.", toolId: "12", toolSlug: "assistente", route: (id) => `/project/${id}/studio/assistente` },
    ],
  },
  {
    id: "review",
    number: "04",
    label: "Revisão",
    labelEn: "Review",
    order: 4,
    eyebrow: "O cliente participa",
    description: "Compartilhe versões, concentre comentários e registre a aprovação.",
    outcome: "Versão final aprovada sem feedback espalhado.",
    actions: [
      { id: "reviews", label: "Aprovações", description: "Versões de vídeo, comentários e aceite.", route: (id) => `/project/${id}/video-reviews` },
      { id: "documents", label: "Documentos", description: "Revise os artefatos que acompanham o job.", route: (id) => `/project/${id}/documents` },
    ],
  },
  {
    id: "delivery",
    number: "05",
    label: "Entrega",
    labelEn: "Delivery",
    order: 5,
    eyebrow: "A promessa se concretiza",
    description: "Organize o pacote final, especificações, links e aceite do cliente.",
    outcome: "Entrega registrada, rastreável e pronta para consulta.",
    actions: [
      { id: "delivery-report", label: "Relatório de entrega", description: "Arquivos, formatos, links e observações finais.", toolId: "11", toolSlug: "entrega", route: (id) => `/project/${id}/studio/entrega` },
      { id: "delivery-files", label: "Pacote final", description: "Arquivos finais organizados no projeto.", route: (id) => `/project/${id}/files` },
      { id: "delivery-docs", label: "Documento final", description: "Prepare e exporte o documento de entrega.", route: (id) => `/project/${id}/documents` },
    ],
  },
  {
    id: "closing",
    number: "06",
    label: "Fechamento",
    labelEn: "Closing",
    order: 6,
    eyebrow: "O job vira aprendizado",
    description: "Conclua o projeto, confira resultado financeiro e preserve o histórico.",
    outcome: "Job encerrado com resultado e memória operacional.",
    actions: [
      { id: "finance", label: "Resultado financeiro", description: "Receita, custo e margem do trabalho.", route: (id) => `/analytics?projectId=${id}` },
      { id: "archive", label: "Histórico do projeto", description: "Documentos, versões e decisões preservados.", route: (id) => `/project/${id}` },
    ],
  },
];

const TOOL_STAGE = new Map<string, WorkflowStageId>();
for (const stage of WORKFLOW_STAGES) {
  for (const action of stage.actions) {
    if (action.toolId) TOOL_STAGE.set(action.toolId, stage.id);
    if (action.toolSlug) TOOL_STAGE.set(action.toolSlug, stage.id);
  }
}

export function getWorkflowStage(id: string | null | undefined): WorkflowStage {
  return WORKFLOW_STAGES.find((stage) => stage.id === id) || WORKFLOW_STAGES[0];
}

export function getStageForTool(tool: string | null | undefined): WorkflowStageId {
  return TOOL_STAGE.get(tool || "") || "planning";
}

export function getStageForLocation(location: string): WorkflowStageId {
  const journey = location.match(/\/journey\/([^/?#]+)/)?.[1];
  if (journey && WORKFLOW_STAGES.some((stage) => stage.id === journey)) return journey as WorkflowStageId;
  const studioTool = location.match(/\/studio\/([^/?#]+)/)?.[1];
  if (studioTool) return getStageForTool(studioTool);
  if (location.includes("video-reviews")) return "review";
  if (location.includes("/files") || location.includes("/collaborators")) return "production";
  if (location.includes("/documents")) return "review";
  return "entry";
}

export function isActionComplete(action: WorkflowAction, populatedStates: string[]): boolean {
  return Boolean(
    (action.toolId && populatedStates.includes(action.toolId)) ||
    (action.toolSlug && populatedStates.includes(action.toolSlug)),
  );
}

export function getArtifactStatus(formData?: Record<string, string>): ArtifactStatus {
  const status = formData?.__artifactStatus;
  return status === "review" || status === "approved" || status === "archived" ? status : "draft";
}

export function getArtifactVersion(formData?: Record<string, string>): number {
  const version = Number(formData?.__artifactVersion || "1");
  return Number.isFinite(version) && version > 0 ? version : 1;
}

export function visibleFormValues(formData: Record<string, string>): string[] {
  return Object.entries(formData)
    .filter(([key, value]) => !key.startsWith("__") && Boolean(value))
    .map(([, value]) => value);
}

// ─── NEXT TOOL SUGGESTIONS ─────────────────────────────────────────────────
// Maps tool slug → recommended next tool(s) in the workflow
export const NEXT_TOOL_SUGGESTIONS: Record<string, Array<{ slug: string; label: string; reason: string }>> = {
  briefing:    [{ slug: "orcamento",  label: "Orçamento",       reason: "Com o briefing pronto, monte o orçamento do job" },
                { slug: "proposta",   label: "Proposta",         reason: "Transforme o briefing em proposta comercial" }],
  orcamento:   [{ slug: "proposta",   label: "Proposta",         reason: "Combine orçamento e escopo em uma proposta" },
                { slug: "contrato",   label: "Contrato",         reason: "Formalize o acordo com o cliente" }],
  proposta:    [{ slug: "contrato",   label: "Contrato",         reason: "Proposta aceita? Assine o contrato" },
                { slug: "briefing",   label: "Briefing",         reason: "Detalhe o briefing criativo do job" }],
  contrato:    [{ slug: "roteiro",    label: "Roteiro",          reason: "Job fechado — comece o roteiro" },
                { slug: "moodboard",  label: "Moodboard & Look", reason: "Defina a identidade visual do projeto" }],
  roteiro:     [{ slug: "moodboard",  label: "Moodboard & Look", reason: "Visual complementa a narrativa do roteiro" },
                { slug: "decupagem",  label: "Decupagem",        reason: "Transforme o roteiro em plano de câmera" }],
  moodboard:   [{ slug: "decupagem",  label: "Decupagem",        reason: "Com a direção visual definida, planeje os planos" },
                { slug: "callsheet",  label: "Callsheet",        reason: "Prepare a logística do dia de filmagem" }],
  decupagem:   [{ slug: "callsheet",  label: "Callsheet",        reason: "Com a decupagem pronta, monte o callsheet" },
                { slug: "cronograma", label: "Cronograma",       reason: "Planeje os prazos do projeto" }],
  cronograma:  [{ slug: "callsheet",  label: "Callsheet",        reason: "Distribua o cronograma para a equipe" },
                { slug: "checklist",  label: "Checklist de Set", reason: "Garanta que o set esteja completo" }],
  callsheet:   [{ slug: "checklist",  label: "Checklist de Set", reason: "Confira os equipamentos antes de filmar" }],
  checklist:   [{ slug: "entrega",    label: "Relatório de Entrega", reason: "Filmagem concluída? Documente a entrega" }],
  entrega:     [{ slug: "assistente", label: "Assistente",       reason: "Precisa de ajuda com o fechamento do projeto?" }],
};

export function getNextToolSuggestions(slug: string): Array<{ slug: string; label: string; reason: string }> {
  return NEXT_TOOL_SUGGESTIONS[slug] || [];
}
