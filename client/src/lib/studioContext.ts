import type { Client, Project } from "./api";

export interface StudioLinkedContext {
  projectId?: number;
  projectName?: string;
  clientId?: number | null;
  clientName?: string;
  clientCompany?: string;
  sourceLabel: string;
  prefill: Record<string, string>;
}

interface CreativeGoals {
  format?: string;
  client?: string;
  tone?: string;
  cameraModel?: string;
  budget?: string;
}

interface ParsedProjectMetadata {
  creativeGoals?: CreativeGoals;
}

function parseProjectMetadata(project?: Project | null): ParsedProjectMetadata {
  if (!project?.metadataJson) return {};
  try {
    const parsed = JSON.parse(project.metadataJson) as ParsedProjectMetadata;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function compact(values: Array<string | null | undefined>, separator = " ") {
  return values.map((value) => String(value || "").trim()).filter(Boolean).join(separator);
}

function isoDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function field(value?: string | null) {
  return String(value || "").trim();
}

function pickObjective(project?: Project | null, goals?: CreativeGoals) {
  return field(project?.description) || field(goals?.client);
}

function buildPrefillForSlug(slug: string, project?: Project | null, client?: Client | null) {
  const metadata = parseProjectMetadata(project);
  const goals = metadata.creativeGoals || {};
  const projectName = field(project?.name);
  const clientName = field(client?.company) || field(client?.name) || field(project?.clientName) || field(goals.client);
  const clientIndustry = field(client?.industry);
  const cityState = compact([client?.city, client?.state], " / ");
  const address = compact([client?.address, cityState], " - ");
  const objective = pickObjective(project, goals);
  const format = field(goals.format);
  const tone = field(goals.tone);
  const budget = field(goals.budget);
  const camera = field(goals.cameraModel);
  const createdAt = isoDate(project?.createdAt);

  const commonDoc = {
    title: projectName,
    project: projectName,
    client: clientName,
    objective,
    format,
    budget,
  };

  const map: Record<string, Record<string, string>> = {
    briefing: {
      cliente: clientName,
      segmento: clientIndustry,
      tipo: format,
      objetivo: objective,
      referencias: tone,
    },
    roteiro: {
      titulo: projectName,
      formato: format,
      genero: tone,
      sinopse: objective,
    },
    decupagem: {
      cena: objective || projectName,
      duracao: format,
      camera,
      referencia: tone,
    },
    callsheet: {
      producao: projectName,
      cidade: cityState,
      endereco: address,
    },
    orcamento: {
      tipo: format,
      locacoes: cityState,
      camera,
    },
    proposta: {
      cliente: clientName,
      escopo: objective,
      valor: budget,
      tom: tone,
    },
    contrato: {
      contratante: clientName,
      cpf_contratante: field(client?.tax_id),
      objeto: objective || projectName,
      valor: budget,
    },
    moodboard: {
      tom: tone,
      descricao: objective || projectName,
      aspecto: format,
      referencia: tone,
    },
    cronograma: {
      nome: projectName,
      inicio: createdAt,
      tipo: format,
      entregaveis: objective,
    },
    entrega: {
      nome: projectName,
      cliente: clientName,
      inicio: createdAt,
      especificacoes: format,
      notas: objective,
    },
    checklist: {
      tipo: format || objective,
      locacao: address,
    },
    briefingDoc: commonDoc,
  };

  return Object.fromEntries(Object.entries(map[slug] || {}).filter(([, value]) => value));
}

export function buildStudioLinkedContext(
  slug: string,
  project?: Project | null,
  client?: Client | null,
): StudioLinkedContext | null {
  if (!project && !client) return null;

  const metadata = parseProjectMetadata(project);
  const clientName =
    field(client?.company) ||
    field(client?.name) ||
    field(project?.clientName) ||
    field(metadata.creativeGoals?.client);
  const prefill = buildPrefillForSlug(slug, project, client);

  if (!Object.keys(prefill).length && !project && !clientName) return null;

  return {
    projectId: project?.id,
    projectName: field(project?.name),
    clientId: project?.clientId,
    clientName,
    clientCompany: field(client?.company),
    sourceLabel: compact([field(project?.name), clientName], " / "),
    prefill,
  };
}

export function mergeStudioPrefill(
  current: Record<string, string>,
  prefill: Record<string, string>,
  overwrite = false,
) {
  const merged = { ...current };
  let applied = 0;

  for (const [key, value] of Object.entries(prefill)) {
    if (!value) continue;
    const currentValue = field(merged[key]);
    if (overwrite || !currentValue) {
      if (merged[key] !== value) applied += 1;
      merged[key] = value;
    }
  }

  return { merged, applied };
}

export function countFillableFields(current: Record<string, string>, prefill: Record<string, string>) {
  return Object.entries(prefill).filter(([key, value]) => value && !field(current[key])).length;
}

export function buildDocumentPrefill(project?: Project | null, client?: Client | null) {
  const metadata = parseProjectMetadata(project);
  const goals = metadata.creativeGoals || {};
  const clientName = field(client?.company) || field(client?.name) || field(project?.clientName) || field(goals.client);
  const cityState = compact([client?.city, client?.state], " / ");
  return {
    title: field(project?.name) || "Documento de producao",
    project: field(project?.name),
    client: clientName,
    objective: pickObjective(project, goals),
    format: field(goals.format),
    budget: field(goals.budget),
    location: compact([client?.address, cityState], " - "),
    notes: field(goals.tone),
  };
}

// ─── PROJECT TYPE TEMPLATES ─────────────────────────────────────────────────
export interface ProjectTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  prefill: Record<string, Record<string, string>>; // slug → field → value
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "reel-30s",
    label: "Reel 30s",
    icon: "📱",
    description: "Conteúdo vertical para Instagram/TikTok",
    prefill: {
      roteiro:  { formato: "Reel 30 segundos", genero: "Dinâmico, direto ao ponto", duracao: "30s" },
      briefing: { tipo: "Reel 30s Instagram/TikTok", objetivo: "Engajamento e alcance nas redes sociais" },
      orcamento: { tipo: "Reel 30s", locacoes: "1 locação", camera: "Sony FX3 ou similar" },
      moodboard: { aspecto: "9:16 vertical", tom: "Energético, contemporâneo, jovem" },
      cronograma: { tipo: "Reel 30s" },
    },
  },
  {
    id: "comercial-tv",
    label: "Comercial TV",
    icon: "📺",
    description: "Filme publicitário 30-60 segundos",
    prefill: {
      roteiro:  { formato: "Comercial TV 30 segundos", genero: "Publicitário", duracao: "30s" },
      briefing: { tipo: "Comercial TV", objetivo: "Brand awareness e geração de vendas" },
      orcamento: { tipo: "Comercial TV 30s", camera: "ARRI Alexa ou RED" },
      decupagem: { duracao: "30s" },
      moodboard: { aspecto: "16:9 1920x1080" },
    },
  },
  {
    id: "institucional",
    label: "Institucional",
    icon: "🏢",
    description: "Vídeo corporativo 2-5 minutos",
    prefill: {
      roteiro:  { formato: "Vídeo Institucional", genero: "Corporativo, profissional", duracao: "3 minutos" },
      briefing: { tipo: "Vídeo Institucional", objetivo: "Apresentar a empresa e seus diferenciais" },
      orcamento: { tipo: "Institucional 3min" },
      moodboard: { aspecto: "16:9", tom: "Profissional, confiável, moderno" },
      cronograma: { tipo: "Institucional 2-5min" },
    },
  },
  {
    id: "documentario",
    label: "Documentário",
    icon: "🎞",
    description: "Documentário curto 10-30 minutos",
    prefill: {
      roteiro:  { formato: "Documentário", genero: "Documental, observacional", duracao: "15-30 minutos" },
      briefing: { tipo: "Documentário", objetivo: "Contar uma história real com profundidade narrativa" },
      moodboard: { aspecto: "16:9 / 2.39:1 anamórfico", tom: "Natural, autêntico, íntimo" },
      decupagem: { camera: "Sony FX6 ou BMPCC" },
    },
  },
  {
    id: "social-media",
    label: "Social Media",
    icon: "📲",
    description: "Pacote de conteúdo para redes sociais",
    prefill: {
      roteiro:  { formato: "Múltiplos formatos: feed 1:1, stories 9:16, reels 9:16", duracao: "15-60s por peça" },
      briefing: { tipo: "Pacote Social Media", objetivo: "Presença constante nas redes com conteúdo de valor" },
      orcamento: { tipo: "Social Media — pacote mensal" },
      cronograma: { tipo: "Pacote Social Media mensal" },
    },
  },
  {
    id: "evento",
    label: "Cobertura de Evento",
    icon: "🎪",
    description: "Captação e edição de evento ao vivo",
    prefill: {
      roteiro:  { formato: "Cobertura de Evento", genero: "Documental ao vivo" },
      briefing: { tipo: "Cobertura de Evento", objetivo: "Documentar e divulgar o evento" },
      callsheet: {},
      checklist: { tipo: "Evento externo multicâmera" },
    },
  },
];

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find(t => t.id === id);
}

export function applyTemplateToSlug(
  template: ProjectTemplate,
  slug: string,
  currentData: Record<string, string>,
): { merged: Record<string, string>; applied: number } {
  const templateFields = template.prefill[slug] || {};
  return mergeStudioPrefill(currentData, templateFields, false);
}
