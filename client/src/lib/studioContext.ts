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
