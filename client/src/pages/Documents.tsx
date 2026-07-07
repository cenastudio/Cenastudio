import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import ProjectNav from "@/components/ProjectNav";
import { api } from "@/lib/api";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Film,
  Link2,
  ListChecks,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { readStudioSettings, saveStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import { useLanguage, type Translate } from "@/contexts/LanguageContext";
import { useProject } from "@/contexts/ProjectContext";
import { buildDocumentPrefill } from "@/lib/studioContext";
import type { Client } from "@/lib/api";
import { getArtifactStatus, getArtifactVersion, type ArtifactStatus } from "@/lib/workflow";

type DocType = "briefing" | "roteiro" | "callsheet" | "decupagem" | "orcamento" | "cronograma" | "checklist" | "entrega";

interface StudioDocument {
  id: string;
  type: DocType;
  title: string;
  client: string;
  project: string;
  html: string;
  createdAt: string;
  projectId?: number | null;
  status?: ArtifactStatus;
  version?: number;
}

interface DocumentForm {
  type: DocType;
  title: string;
  client: string;
  project: string;
  objective: string;
  audience: string;
  format: string;
  duration: string;
  deadline: string;
  budget: string;
  location: string;
  crew: string;
  equipment: string;
  scope: string;
  schedule: string;
  notes: string;
}

const STORAGE_KEY = "frame.documents.v1";

const DOC_TYPES: Array<{ id: DocType; label: string; icon: typeof FileText; accent: string; description: string }> = [
  { id: "briefing", label: "Briefing", icon: FileText, accent: "#ff4d1d", description: "Objetivo, publico, mensagem, riscos e escopo inicial." },
  { id: "roteiro", label: "Roteiro", icon: Film, accent: "#f59e0b", description: "Estrutura de cenas, beat sheet, locucao e CTA." },
  { id: "callsheet", label: "Callsheet", icon: ClipboardList, accent: "#06b6d4", description: "Dia de set, horarios, equipe, locacao e contatos." },
  { id: "decupagem", label: "Decupagem", icon: ListChecks, accent: "#8b5cf6", description: "Planos, lentes, movimentos, cobertura e tecnica." },
  { id: "orcamento", label: "Orcamento", icon: FileText, accent: "#22c55e", description: "Investimento, entregaveis, condicoes e premissas." },
  { id: "cronograma", label: "Cronograma", icon: CalendarDays, accent: "#38bdf8", description: "Marcos, datas, dependencias e rodadas de aprovacao." },
  { id: "checklist", label: "Checklist", icon: Check, accent: "#eab308", description: "Pre-set, tecnica, backup, fechamento e entrega." },
  { id: "entrega", label: "Entrega", icon: Download, accent: "#10b981", description: "Pacote final, links, formatos, aceite e observacoes." },
];

type FieldKind = "input" | "textarea" | "date";

interface DocumentField {
  key: keyof DocumentForm;
  label: string;
  placeholder: string;
  kind?: FieldKind;
  span?: "full" | "half";
}

interface DocumentGroup {
  title: string;
  fields: DocumentField[];
}

function createDocumentForms(t: Translate): Record<DocType, DocumentGroup[]> {
const COMMON_FIELDS: DocumentGroup = {
  title: t("app.documents.identificationSection"),
  fields: [
    { key: "title", label: t("app.documents.titleField"), placeholder: t("app.documents.titlePlaceholder"), span: "full" },
    { key: "client", label: t("app.common.client"), placeholder: t("app.documents.clientPlaceholder") },
    { key: "project", label: t("app.common.project"), placeholder: t("app.documents.projectPlaceholder") },
  ],
};

const DOCUMENT_FORMS: Record<DocType, DocumentGroup[]> = {
  briefing: [
    COMMON_FIELDS,
    {
      title: t("app.documents.strategySection"),
      fields: [
        { key: "objective", label: t("app.documents.mainObjective"), placeholder: t("app.documents.objectivePlaceholder"), kind: "textarea", span: "full" },
        { key: "audience", label: t("app.documents.audienceContext"), placeholder: t("app.documents.audiencePlaceholder"), kind: "textarea", span: "full" },
        { key: "format", label: t("app.documents.finalFormat"), placeholder: t("app.documents.formatPlaceholder") },
        { key: "duration", label: t("app.documents.targetDuration"), placeholder: t("app.documents.durationPlaceholder") },
        { key: "deadline", label: t("app.common.deadline"), placeholder: t("app.common.deadline"), kind: "date" },
        { key: "budget", label: t("app.common.budget"), placeholder: t("app.documents.budgetPlaceholder") },
      ],
    },
    {
      title: t("app.documents.scopeSection"),
      fields: [
        { key: "scope", label: t("app.documents.deliverables"), placeholder: t("app.documents.deliverablePlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: t("app.documents.risksReferences"), placeholder: t("app.documents.notesPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  roteiro: [
    COMMON_FIELDS,
    {
      title: t("app.documents.narrativeSection"),
      fields: [
        { key: "objective", label: t("app.documents.narrativePromise"), placeholder: t("app.documents.scriptIdeaPlaceholder"), kind: "textarea", span: "full" },
        { key: "audience", label: t("app.documents.toneAudience"), placeholder: t("app.documents.scriptTonePlaceholder"), kind: "textarea", span: "full" },
        { key: "duration", label: t("app.common.duration"), placeholder: t("app.documents.scriptDurationPlaceholder") },
        { key: "format", label: "Formato", placeholder: t("app.documents.scriptFormatPlaceholder") },
      ],
    },
    {
      title: t("app.documents.scenesSection"),
      fields: [
        { key: "scope", label: "Beat sheet / cenas", placeholder: t("app.documents.beatSheetPlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: "Locucao, falas ou CTA", placeholder: t("app.documents.scriptNotesPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  callsheet: [
    COMMON_FIELDS,
    {
      title: t("app.documents.setSection"),
      fields: [
        { key: "deadline", label: t("app.documents.shootDate"), placeholder: t("app.documents.datePlaceholder"), kind: "date" },
        { key: "location", label: t("app.documents.location"), placeholder: t("app.documents.addressPlaceholder"), span: "full" },
        { key: "schedule", label: t("app.documents.daySchedule"), placeholder: t("app.documents.schedulePlaceholder"), kind: "textarea", span: "full" },
      ],
    },
    {
      title: t("app.documents.productionSection"),
      fields: [
        { key: "crew", label: t("app.documents.teamContacts"), placeholder: t("app.documents.teamPlaceholder"), kind: "textarea", span: "full" },
        { key: "equipment", label: t("app.documents.equipment"), placeholder: t("app.documents.equipmentPlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: t("app.documents.setNotes"), placeholder: t("app.documents.setNotesPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  decupagem: [
    COMMON_FIELDS,
    {
      title: t("app.documents.visualPlanningSection"),
      fields: [
        { key: "objective", label: t("app.documents.sceneDirection"), placeholder: t("app.documents.sceneDirectionPlaceholder"), kind: "textarea", span: "full" },
        { key: "scope", label: t("app.documents.shotList"), placeholder: t("app.documents.shotListPlaceholder"), kind: "textarea", span: "full" },
        { key: "equipment", label: t("app.documents.lensesCameraMovement"), placeholder: t("app.documents.lensesPlaceholder"), kind: "textarea", span: "full" },
        { key: "location", label: t("app.documents.environments"), placeholder: t("app.documents.environmentsPlaceholder"), span: "full" },
      ],
    },
  ],
  orcamento: [
    COMMON_FIELDS,
    {
      title: t("app.documents.commercialSection"),
      fields: [
        { key: "budget", label: t("app.documents.baseInvestment"), placeholder: t("app.documents.budgetValuePlaceholder") },
        { key: "deadline", label: t("app.common.validity"), placeholder: t("app.documents.datePlaceholder"), kind: "date" },
        { key: "scope", label: t("app.documents.includedItems"), placeholder: t("app.documents.includedItemsPlaceholder"), kind: "textarea", span: "full" },
        { key: "crew", label: t("app.documents.plannedTeam"), placeholder: t("app.documents.plannedTeamPlaceholder"), kind: "textarea", span: "full" },
        { key: "equipment", label: t("app.documents.plannedEquipment"), placeholder: t("app.documents.plannedEquipmentPlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: t("app.documents.commercialConditions"), placeholder: t("app.documents.commercialConditionsPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  cronograma: [
    COMMON_FIELDS,
    {
      title: t("app.documents.flowSection"),
      fields: [
        { key: "deadline", label: t("app.documents.finalDelivery"), placeholder: t("app.documents.datePlaceholder"), kind: "date" },
        { key: "schedule", label: t("app.documents.milestonesDates"), placeholder: t("app.documents.milestonesPlaceholder"), kind: "textarea", span: "full" },
        { key: "scope", label: t("app.documents.dependencies"), placeholder: t("app.documents.dependenciesPlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: t("app.documents.roundsRules"), placeholder: t("app.documents.roundsPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  checklist: [
    COMMON_FIELDS,
    {
      title: t("app.documents.presetSection"),
      fields: [
        { key: "deadline", label: t("app.documents.setDate"), placeholder: t("app.documents.datePlaceholder"), kind: "date" },
        { key: "location", label: t("app.documents.locationBase"), placeholder: "Endereco e ponto de apoio", span: "full" },
        { key: "equipment", label: t("app.documents.technicalChecklist"), placeholder: t("app.documents.checklistTechPlaceholder"), kind: "textarea", span: "full" },
        { key: "crew", label: t("app.documents.responsibles"), placeholder: t("app.documents.responsiblesPlaceholder"), kind: "textarea", span: "full" },
        { key: "notes", label: t("app.documents.closing"), placeholder: t("app.documents.closingPlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
  entrega: [
    COMMON_FIELDS,
    {
      title: t("app.documents.finalPackageSection"),
      fields: [
        { key: "scope", label: t("app.documents.deliveredFiles"), placeholder: t("app.documents.deliveredFilesPlaceholder"), kind: "textarea", span: "full" },
        { key: "format", label: t("app.common.formats"), placeholder: t("app.documents.formatsPlaceholder") },
        { key: "deadline", label: t("app.documents.shipDate"), placeholder: t("app.documents.datePlaceholder"), kind: "date" },
        { key: "location", label: t("app.documents.deliveryLink"), placeholder: t("app.documents.deliveryLinkPlaceholder"), span: "full" },
        { key: "notes", label: t("app.documents.acceptanceNotes"), placeholder: t("app.documents.acceptancePlaceholder"), kind: "textarea", span: "full" },
      ],
    },
  ],
};
return DOCUMENT_FORMS;
}

const initialForm: DocumentForm = {
  type: "briefing",
  title: "Documento de producao",
  client: "",
  project: "",
  objective: "",
  audience: "",
  format: "16:9",
  duration: "60-120s",
  deadline: "",
  budget: "",
  location: "",
  crew: "",
  equipment: "",
  scope: "",
  schedule: "",
  notes: "",
};

function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function lines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderList(title: string, items: string[], accent: string) {
  if (!items.length) return "";
  return `<section class="doc-section"><h2 style="color:${accent}">${esc(title)}</h2><div class="doc-list">${items
    .map((item) => `<div class="doc-item" style="border-left-color:${accent}">${esc(item)}</div>`)
    .join("")}</div></section>`;
}

function documentSections(form: DocumentForm, t: Translate) {
  const baseScope = lines(form.scope);
  const baseSchedule = lines(form.schedule);
  const baseCrew = lines(form.crew);
  const baseEquipment = lines(form.equipment);
  const defaults = {
    briefing: [
      ["Objetivo e Publico", [form.objective || "Objetivo do projeto a definir", form.audience && `Publico: ${form.audience}`].filter(Boolean)],
      ["Escopo e Entregaveis", baseScope.length ? baseScope : [t("app.documents.mainVideo"), "Versoes para redes sociais", "Arquivos finais organizados"]],
      ["Riscos e Cuidados", ["Alinhar aprovadores antes da primeira versao", "Confirmar autorizacoes de imagem", "Definir prazo de feedback"]],
    ],
    roteiro: [
      ["Estrutura Narrativa", baseScope.length ? baseScope : [t("app.documents.initialHook"), "Desenvolvimento da promessa", t("app.documents.visualProof"), "CTA final"]],
      ["Direcao de Cena", ["Priorizar acoes filmaveis", "Prever respiros para B-roll", "Manter ritmo compativel com o canal"]],
    ],
    callsheet: [
      ["Agenda do Dia", baseSchedule.length ? baseSchedule : ["Call time geral", "Montagem de equipamento", "Gravacao", "Backup e desmobilizacao"]],
      ["Equipe", baseCrew.length ? baseCrew : ["Direcao", "Camera", "Som", "Producao"]],
      [t("app.documents.equipment"), baseEquipment.length ? baseEquipment : [t("app.documents.mainCamera"), t("app.documents.dedicatedAudio"), "Kit de luz", "Midias e backup"]],
    ],
    decupagem: [
      ["Lista de Planos", baseScope.length ? baseScope : ["Plano aberto de contexto", "Plano medio de acao", "Close de detalhe", "B-roll de apoio"]],
      ["Tecnica", baseEquipment.length ? baseEquipment : ["Lentes definidas por cena", t("app.documents.plannedMovements"), t("app.documents.syncedAudio")]],
    ],
    orcamento: [
      ["Composicao do Investimento", [`Orcamento base: ${form.budget || "a definir"}`, "Equipe", t("app.documents.equipment"), "Pos-producao"]],
      ["Condicoes", ["Alteracoes fora do escopo geram novo ajuste", "Direitos e uso comercial devem estar no contrato", "Pagamento conforme combinado"]],
    ],
    cronograma: [
      ["Marcos", baseSchedule.length ? baseSchedule : [t("app.documents.briefingApproved"), "Captacao", t("app.documents.firstCut"), "Revisao", t("app.documents.finalDelivery")]],
      ["Aprovacao", ["Definir responsavel pelo aceite", "Centralizar comentarios por link", "Registrar rodada final"]],
    ],
    checklist: [
      ["Pre-set", [t("app.documents.batteriesCharged"), t("app.documents.cardsFormatted"), t("app.documents.backupReady"), t("app.documents.contactsConfirmed")]],
      [t("app.documents.closing"), [t("app.documents.doubleBackup"), "Conferencia de audio", "Material organizado por pasta", "Proxima etapa enviada ao cliente"]],
    ],
    entrega: [
      ["Pacote Final", baseScope.length ? baseScope : ["MP4 final", t("app.documents.socialVersions"), "Legenda quando aplicavel", "Link de download"]],
      ["Aceite", ["Cliente recebeu materiais", "Prazo de revisao final confirmado", "Novas alteracoes entram como novo escopo"]],
    ],
  } satisfies Record<DocType, Array<[string, string[]]>>;
  return defaults[form.type];
}

function buildDocumentHtml(form: DocumentForm, studio: StudioSettings, t: Translate) {
  const doc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const accent = doc.accent;
  const accentSoft = `${accent}14`;
  const accentTint = `${accent}22`;
  const metadata = [
    [t("app.common.client"), form.client || t("app.common.toBeDefined")],
    [t("app.common.project"), form.project || form.title],
    ["Formato", form.format],
    [t("app.common.duration"), form.duration],
    [t("app.common.deadline"), form.deadline || t("app.common.toBeDefined")],
    [t("app.documents.location"), form.location || t("app.common.toBeDefined")],
    ["Produtora", studio.studioName],
    ["Contato", studio.email || studio.phone || t("app.common.toBeDefined")],
    ["Cidade", studio.city || t("app.common.toBeDefined")],
  ];

  const content = documentSections(form, t)
    .map(([title, items]) => renderList(title, items, accent))
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(doc.label)} - ${esc(form.title)}</title>
  <style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;min-height:100%;background:#f2ede4;color:#141414;font-family:Arial,sans-serif}
    body{background:linear-gradient(135deg,${accentSoft},#f7f1e8 38%,#eee6da 100%)}
    .doc-page{width:210mm;min-height:297mm;margin:0 auto;background:linear-gradient(180deg,#fbf7f0 0%,#f5eee4 100%);padding:18mm;position:relative;overflow:visible}
    .doc-page:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 12% 4%,${accentTint},transparent 34%),radial-gradient(circle at 92% 92%,rgba(217,195,171,.32),transparent 34%);pointer-events:none}
    .doc-page>*{position:relative;z-index:1}
    .doc-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:${accent}}
    .doc-title{font-size:44px;line-height:.95;margin:10px 0 10px;font-weight:900;color:#111}
    .doc-muted{color:#666;line-height:1.5;font-size:14px}
    .doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid ${accent};padding-bottom:22px}
    .doc-brand{text-align:right;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#666}
    .doc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:24px}
    .doc-field{border:1px solid #ddd4c7;background:rgba(255,253,248,.88);padding:11px}
    .doc-field-label{font-size:9px;color:#777;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
    .doc-field-value{font-size:12px;color:#1a1a1a;font-weight:700;line-height:1.45}
    .doc-section{margin-top:26px;padding-top:15px;border-top:1px solid #d8d0c3}
    .doc-section h2{font-size:11px;text-transform:uppercase;letter-spacing:.16em;margin:0 0 10px}
    .doc-list{display:grid;gap:7px}.doc-item{font-size:12px;line-height:1.48;padding:9px 11px;border-left:3px solid;background:rgba(255,253,248,.9)}
    .doc-footer{margin-top:42px;padding-top:18px;border-top:1px solid #d8d0c3;display:flex;justify-content:space-between;gap:20px;color:#777;font-size:11px}
    @media screen{html,body{width:100%}.doc-page{width:100%;margin:0;box-shadow:0 22px 70px rgba(0,0,0,.16)}}
    @media print{
      html,body{width:210mm;min-height:297mm;background:#f2ede4}
      body:before{content:"";position:fixed;inset:0;background:radial-gradient(circle at 12% 4%,${accentTint},transparent 34%),radial-gradient(circle at 92% 92%,rgba(217,195,171,.26),transparent 34%),linear-gradient(180deg,#fbf7f0 0%,#f5eee4 100%);z-index:0}
      .doc-page{width:210mm;min-height:297mm;height:auto;margin:0;padding:16mm;box-shadow:none;background:linear-gradient(180deg,#fbf7f0 0%,#f5eee4 100%);overflow:visible;-webkit-box-decoration-break:clone;box-decoration-break:clone}
      .doc-page:before{display:none}
      .doc-page>*{position:relative;z-index:1}
      .doc-header,.doc-field,.doc-item,.doc-footer{break-inside:avoid;page-break-inside:avoid}
      .doc-section h2{break-after:avoid;page-break-after:avoid}
      .doc-grid{grid-template-columns:1fr 1fr}
    }
  </style>
</head>
<body>
  <main class="doc-page">
    <header class="doc-header">
      <div>
        <div class="doc-kicker">${esc(studio.studioName)} · ${esc(doc.label)}</div>
        <h1 class="doc-title">${esc(form.title || doc.label)}</h1>
        <div class="doc-muted">${esc(doc.description)}</div>
      </div>
      <div class="doc-brand">${esc(studio.studioName)}<br/>${esc(studio.email || studio.phone || t("app.documents.operationalDocument"))}<br/>${new Date().toLocaleDateString("pt-BR")}</div>
    </header>
    <div class="doc-grid">${metadata.map(([key, value]) => `<div class="doc-field"><div class="doc-field-label">${esc(key)}</div><div class="doc-field-value">${esc(value)}</div></div>`).join("")}</div>
    ${content}
    ${form.notes ? renderList(t("app.documents.additionalNotes"), lines(form.notes), accent) : ""}
    <footer class="doc-footer"><div>${esc(studio.studioName)} · ${esc(studio.signature)}</div><div>Gerado em ${new Date().toLocaleString("pt-BR")}</div></footer>
  </main>
</body>
</html>`;
}

function buildDocumentText(form: DocumentForm, studio: StudioSettings, t: Translate) {
  const doc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const metadata = [
    [t("app.common.client"), form.client || t("app.common.toBeDefined")],
    [t("app.common.project"), form.project || form.title],
    ["Formato", form.format || t("app.common.toBeDefined")],
    [t("app.common.duration"), form.duration || t("app.common.toBeDefined")],
    [t("app.common.deadline"), form.deadline || t("app.common.toBeDefined")],
    [t("app.documents.location"), form.location || t("app.common.toBeDefined")],
  ];
  const sections = documentSections(form, t)
    .map(([title, items]) => `${title.toUpperCase()}\n${items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");

  return [
    studio.studioName,
    doc.label.toUpperCase(),
    form.title || doc.label,
    "",
    ...metadata.map(([label, value]) => `${label}: ${value}`),
    "",
    sections,
    form.notes ? `\n\nNOTAS ADICIONAIS\n${lines(form.notes).map((item) => `- ${item}`).join("\n")}` : "",
  ].join("\n");
}

function readSavedDocs(): StudioDocument[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as StudioDocument[];
  } catch {
    return [];
  }
}

function printHtmlDocument(docHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      toast.error(t("app.studio.documentError"));
      return;
    }
    frameWindow.focus();
    frameWindow.onafterprint = cleanup;
    window.setTimeout(() => {
      frameWindow.print();
      cleanup();
    }, 250);
  };

  iframe.srcdoc = docHtml;
}

function nextFormForType(current: DocumentForm, type: DocType): DocumentForm {
  const doc = DOC_TYPES.find((item) => item.id === type) || DOC_TYPES[0];
  const oldDefaultTitle = DOC_TYPES.some((item) => item.label === current.title) || current.title === initialForm.title;
  return {
    ...current,
    type,
    title: oldDefaultTitle ? doc.label : current.title,
  };
}

function mergeDocumentContext(current: DocumentForm, prefill: Partial<DocumentForm>) {
  const next = { ...current };
  let applied = 0;
  for (const [key, value] of Object.entries(prefill) as Array<[keyof DocumentForm, string]>) {
    if (!value) continue;
    const currentValue = String(next[key] || "").trim();
    const defaultValue = String(initialForm[key] || "").trim();
    if (!currentValue || currentValue === defaultValue) {
      if (next[key] !== value) applied += 1;
      next[key] = value as never;
    }
  }
  return { next, applied };
}

function FormField({ field, value, onChange }: { field: DocumentField; value: string; onChange: (value: string) => void }) {
  const className = "frame-input w-full bg-frame-gray-2/90 min-h-0";
  return (
    <label className={field.span === "full" ? "sm:col-span-2" : ""}>
      <span className="block font-frame-mono text-[0.62rem] tracking-[0.13em] uppercase text-frame-gray-light mb-1.5">
        {field.label}
      </span>
      {field.kind === "textarea" ? (
        <textarea
          className={`${className} min-h-[94px] resize-y leading-relaxed`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      ) : (
        <input
          className={className}
          type={field.kind === "date" ? "date" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </label>
  );
}

function DocumentsContent() {
  const { t } = useLanguage();
  const [, projectParams] = useRoute("/project/:projectId/documents");
  const { activeProject, selectProject } = useProject();
  const projectIdParam = projectParams?.projectId ? Number(projectParams.projectId) : null;
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [savedDocs, setSavedDocs] = useState<StudioDocument[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [linkedClient, setLinkedClient] = useState<Client | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus>("draft");
  const [artifactVersion, setArtifactVersion] = useState(1);
  const selectedDoc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const documentForms = useMemo(() => createDocumentForms(t), [t]);
  const activeGroups = documentForms[form.type];
  const html = useMemo(() => buildDocumentHtml(form, studio, t), [form, studio, t]);
  const visibleDocs = useMemo(
    () => projectIdParam
      ? savedDocs.filter((doc) => doc.projectId === projectIdParam || (!doc.projectId && doc.project === activeProject?.name))
      : savedDocs,
    [savedDocs, projectIdParam, activeProject?.name],
  );

  useEffect(() => {
    setSavedDocs(readSavedDocs());
    setStudio(readStudioSettings());
    api.studioSettings
      .get()
      .then((data) => {
        setStudio(data);
        saveStudioSettings(data);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (projectIdParam) {
      selectProject(projectIdParam);
    }
  }, [projectIdParam]);

  useEffect(() => {
    let cancelled = false;
    if (!activeProject?.clientId) {
      setLinkedClient(null);
      return;
    }
    api.clients.get(activeProject.clientId)
      .then((details) => {
        if (!cancelled) setLinkedClient(details.client);
      })
      .catch(() => {
        if (!cancelled) setLinkedClient(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.clientId]);

  useEffect(() => {
    if (!activeProject) return;
    const prefill = buildDocumentPrefill(activeProject, linkedClient);
    setForm((current) => mergeDocumentContext(current, prefill).next);
  }, [activeProject, linkedClient]);

  useEffect(() => {
    if (!projectIdParam) return;
    let cancelled = false;
    api.projects.getState(projectIdParam, `document:${form.type}`)
      .then((state) => {
        if (cancelled || !state) return;
        setForm((current) => ({ ...current, ...state.formData, type: current.type } as DocumentForm));
        setArtifactStatus(getArtifactStatus(state.formData));
        setArtifactVersion(getArtifactVersion(state.formData));
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, [projectIdParam, form.type]);

  const update = (key: keyof DocumentForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const applyLinkedContext = () => {
    if (!activeProject) return;
    const { next, applied } = mergeDocumentContext(form, buildDocumentPrefill(activeProject, linkedClient));
    setForm(next);
    toast[applied ? "success" : "info"](applied ? "Documento atualizado com projeto e cliente." : "Documento já está sincronizado.");
  };

  const saveCurrent = async () => {
    const previousVersions = visibleDocs.filter((doc) => doc.type === form.type).map((doc) => doc.version || 1);
    const nextVersion = Math.max(0, ...previousVersions, artifactVersion - 1) + 1;
    const next: StudioDocument = {
      id: crypto.randomUUID(),
      type: form.type,
      title: form.title || selectedDoc.label,
      client: form.client,
      project: form.project,
      html,
      createdAt: new Date().toISOString(),
      projectId: projectIdParam,
      status: "draft",
      version: nextVersion,
    };
    const docs = [next, ...savedDocs].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    setSavedDocs(docs);
    setArtifactStatus("draft");
    setArtifactVersion(nextVersion);
    if (projectIdParam) {
      const stateForm = { ...form, __artifactStatus: "draft", __artifactVersion: String(nextVersion) } as unknown as Record<string, string>;
      await api.projects.saveState(projectIdParam, `document:${form.type}`, stateForm, html);
    }
    toast.success(t("app.documents.documentSaved"));
  };

  const saveAndClose = async () => {
    await saveCurrent();
    setIsEditorOpen(false);
  };

  const updateArtifactStatus = async (status: ArtifactStatus) => {
    setArtifactStatus(status);
    if (projectIdParam) {
      const stateForm = { ...form, __artifactStatus: status, __artifactVersion: String(artifactVersion) } as unknown as Record<string, string>;
      await api.projects.saveState(projectIdParam, `document:${form.type}`, stateForm, html);
    }
    setSavedDocs((current) => {
      const next = current.map((doc) => doc.projectId === projectIdParam && doc.type === form.type && (doc.version || 1) === artifactVersion ? { ...doc, status } : doc);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`Documento marcado como ${status === "draft" ? "rascunho" : status === "review" ? "em revisão" : status === "approved" ? "aprovado" : "arquivado"}.`);
  };

  const exportPdf = (docHtml = html) => {
    printHtmlDocument(docHtml);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(buildDocumentText(form, studio, t));
    toast.success(t("app.documents.textCopied"));
  };

  const exportDocx = async () => {
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
    const docType = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
    const docColor = docType.accent.replace("#", "").toUpperCase();
    const children = [
      new Paragraph({ children: [new TextRun({ text: studio.studioName, bold: true, color: docColor, size: 20 })] }),
      new Paragraph({ text: form.title || docType.label, heading: HeadingLevel.TITLE }),
      new Paragraph({ text: `${docType.label} - ${form.client || "Cliente a definir"} - ${form.project || "Projeto a definir"}` }),
      new Paragraph({ text: "" }),
      ...documentSections(form, t).flatMap(([title, items]) => [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
        ...items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      ]),
      ...(form.notes
        ? [
            new Paragraph({ text: t("app.documents.additionalNotes"), heading: HeadingLevel.HEADING_2 }),
            ...lines(form.notes).map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
          ]
        : []),
    ];
    const documentFile = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(documentFile);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(form.title || docType.label).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("app.documents.wordGenerated"));
  };

  const removeDoc = (id: string) => {
    const docs = savedDocs.filter((doc) => doc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    setSavedDocs(docs);
  };


  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      {projectIdParam && <ProjectNav projectId={projectIdParam} />}
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1680px] mx-auto space-y-4">

        {/* ═══ HEADER ═══ */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Documentos de produção</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">Documentos do job</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-md leading-relaxed">
              Escolha o tipo de documento, preencha os campos à esquerda e veja o PDF profissional sendo montado em tempo real à direita. Quando pronto, exporte ou salve uma versão.
            </p>
            {/* Workflow steps */}
            <div className="flex gap-2 mt-3">
              <div className="border border-frame-orange/30 bg-frame-orange/[0.06] px-2.5 py-1.5 text-center">
                <span className="block font-frame-mono text-[0.48rem] text-frame-orange">01</span>
                <span className="block text-[0.55rem] font-medium text-frame-white mt-0.5">Escolher tipo</span>
              </div>
              <div className="border border-frame-gray-3/40 px-2.5 py-1.5 text-center">
                <span className="block font-frame-mono text-[0.48rem] text-frame-gray-light">02</span>
                <span className="block text-[0.55rem] font-medium text-frame-gray-light mt-0.5">Preencher</span>
              </div>
              <div className="border border-frame-gray-3/40 px-2.5 py-1.5 text-center">
                <span className="block font-frame-mono text-[0.48rem] text-frame-gray-light">03</span>
                <span className="block text-[0.55rem] font-medium text-frame-gray-light mt-0.5">Revisar preview</span>
              </div>
              <div className="border border-frame-gray-3/40 px-2.5 py-1.5 text-center">
                <span className="block font-frame-mono text-[0.48rem] text-frame-gray-light">04</span>
                <span className="block text-[0.55rem] font-medium text-frame-gray-light mt-0.5">Exportar PDF</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {activeProject && (
              <button type="button" onClick={applyLinkedContext} className="frame-btn-ghost flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Contexto
              </button>
            )}
            <button type="button" onClick={copyText} className="frame-btn-ghost flex items-center gap-2">
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <button type="button" onClick={exportDocx} className="frame-btn-ghost flex items-center gap-2">
              <FileText className="w-4 h-4" /> Word
            </button>
            <button type="button" onClick={() => saveCurrent()} className="frame-btn-ghost flex items-center gap-2">
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </header>

        {/* ═══ DOC TYPE TABS ═══ */}
        <nav className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {DOC_TYPES.map((doc) => {
            const Icon = doc.icon;
            const active = form.type === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setForm((current) => nextFormForType(current, doc.id))}
                className={`flex items-center gap-1.5 px-3 py-2 border whitespace-nowrap transition text-[0.62rem] font-semibold uppercase tracking-wider ${
                  active
                    ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
                    : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/40 hover:text-frame-white"
                }`}
              >
                <Icon className="w-3 h-3" />
                {doc.label}
              </button>
            );
          })}
        </nav>

        {/* ═══ STATUS (in project) ═══ */}
        {projectIdParam && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-frame-gray-3 bg-frame-gray-1/15 px-4 py-2.5">
            <span className="text-xs text-frame-gray-light">
              <span className="font-frame-mono text-frame-orange text-[0.55rem]">v{artifactVersion}</span>
              {" · "}{activeProject?.name} · {form.client || "Sem cliente"}
            </span>
            <div className="flex gap-1">
              {([["draft", "Rascunho"], ["review", "Revisão"], ["approved", "Aprovado"], ["archived", "Arquivado"]] as const).map(([status, label]) => (
                <button key={status} type="button" onClick={() => void updateArtifactStatus(status)} className={`min-h-7 border px-2.5 font-frame-mono text-[0.5rem] uppercase tracking-wider transition ${artifactStatus === status ? "border-frame-orange bg-frame-orange/10 text-frame-orange" : "border-frame-gray-3 text-frame-gray-light hover:text-frame-white"}`}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SPLIT VIEW: Form (left) | Preview (right) ═══ */}
        <div className="grid grid-cols-1 xl:grid-cols-[440px_minmax(0,1fr)] gap-4 items-start">

          {/* LEFT: Inline Form */}
          <aside className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-100px)] xl:overflow-y-auto xl:pr-2 scrollbar-thin">
            {activeGroups.map((group) => (
              <section key={group.title} className="border border-frame-gray-3 bg-frame-gray-1/15 p-4">
                <p className="mb-3 font-frame-mono text-[0.58rem] uppercase tracking-[0.14em]" style={{ color: selectedDoc.accent }}>
                  {group.title}
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {group.fields.map((field) => (
                    <FormField
                      key={`${group.title}-${field.key}`}
                      field={field}
                      value={String(form[field.key] ?? "")}
                      onChange={(value) => update(field.key, value)}
                    />
                  ))}
                </div>
              </section>
            ))}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => saveCurrent()} className="frame-btn-ghost flex-1 flex items-center justify-center gap-1.5 text-xs">
                <Save className="w-3 h-3" /> Salvar versão
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs">
                <Download className="w-3 h-3" /> Exportar PDF
              </button>
            </div>
          </aside>

          {/* RIGHT: Live Preview + History */}
          <div className="space-y-4">
            <section className="border border-frame-gray-3 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-frame-gray-3 bg-frame-gray-1/20">
                <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.1em]" style={{ color: selectedDoc.accent }}>
                  Preview · {selectedDoc.label}
                </span>
                <button type="button" onClick={() => exportPdf()} className="text-frame-orange hover:text-frame-white transition" title="PDF">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="bg-frame-black/30 p-3 sm:p-4">
                <iframe
                  title="Preview do documento"
                  srcDoc={html}
                  className="mx-auto w-full max-w-[820px] h-[min(850px,calc(100vh-220px))] min-h-[550px] bg-[#f8f4ed] shadow-[0_18px_60px_rgba(0,0,0,0.25)]"
                />
              </div>
            </section>

            {/* History */}
            <section className="border border-frame-gray-3 p-4">
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.1em] text-frame-gray-light mb-3">
                Histórico · {visibleDocs.length} versões
              </p>
              {visibleDocs.length === 0 ? (
                <div className="frame-empty-state p-4 text-xs text-frame-gray-light text-center">
                  Salve a primeira versão para criar histórico.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {visibleDocs.map((doc) => {
                    const docType = DOC_TYPES.find((item) => item.id === doc.type);
                    return (
                      <div key={doc.id} className="border border-frame-gray-3 bg-frame-black/20 p-2.5 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => exportPdf(doc.html)} className="text-left min-w-0 flex-1">
                          <span className="block font-frame-mono text-[0.5rem] uppercase" style={{ color: docType?.accent }}>{docType?.label} · v{doc.version || 1}</span>
                          <span className="block truncate text-xs font-medium mt-0.5">{doc.title}</span>
                        </button>
                        <button type="button" onClick={() => removeDoc(doc.id)} className="text-frame-gray-light hover:text-red-400 transition p-1 shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Documents() {
  return (
    <ProtectedRoute>
      <DocumentsContent />
    </ProtectedRoute>
  );
}
