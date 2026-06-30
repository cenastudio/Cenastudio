import { useEffect, useMemo, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import { api } from "@/lib/api";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Film,
  ListChecks,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { readStudioSettings, saveStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import { useLanguage, type Translate } from "@/contexts/LanguageContext";

type DocType = "briefing" | "roteiro" | "callsheet" | "decupagem" | "orcamento" | "cronograma" | "checklist" | "entrega";

interface StudioDocument {
  id: string;
  type: DocType;
  title: string;
  client: string;
  project: string;
  html: string;
  createdAt: string;
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
      toast.error("Não foi possível preparar o PDF");
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
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [savedDocs, setSavedDocs] = useState<StudioDocument[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const selectedDoc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const documentForms = useMemo(() => createDocumentForms(t), [t]);
  const activeGroups = documentForms[form.type];
  const html = useMemo(() => buildDocumentHtml(form, studio, t), [form, studio, t]);

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

  const update = (key: keyof DocumentForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const saveCurrent = () => {
    const next: StudioDocument = {
      id: crypto.randomUUID(),
      type: form.type,
      title: form.title || selectedDoc.label,
      client: form.client,
      project: form.project,
      html,
      createdAt: new Date().toISOString(),
    };
    const docs = [next, ...savedDocs].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    setSavedDocs(docs);
    toast.success(t("app.documents.documentSaved"));
  };

  const saveAndClose = () => {
    saveCurrent();
    setIsEditorOpen(false);
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
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 space-y-5 max-w-[1680px] mx-auto">
        <section className="border border-frame-gray-3 bg-frame-gray-1/60 p-4 sm:p-5 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="frame-label">// {t("app.documents.studioDocuments")}</p>
              <h1 className="frame-title text-[clamp(1.8rem,4vw,3.6rem)] leading-none mt-2">{t("app.documents.operationalDocuments")}</h1>
              <p className="text-sm text-frame-gray-light max-w-2xl mt-3">
                {t("app.documents.pageDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIsEditorOpen(true)} className="frame-btn-ghost flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                {t("app.documents.editContent")}
              </button>
              <button type="button" onClick={copyText} className="frame-btn-ghost flex items-center gap-2">
                <Copy className="w-4 h-4" />
                {t("app.documents.copyText")}
              </button>
              <button type="button" onClick={exportDocx} className="frame-btn-ghost flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Word
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("app.documents.exportPdf")}
              </button>
            </div>
          </div>
        </section>

        <section className="app-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="frame-label">// {t("app.documents.documentType")}</p>
              <p className="mt-1 text-xs text-frame-gray-light">{t("app.documents.chooseDocumentHint")}</p>
            </div>
            <span className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em]" style={{ color: selectedDoc.accent }}>
              {selectedDoc.label}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {DOC_TYPES.map((doc) => {
              const Icon = doc.icon;
              const active = form.type === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setForm((current) => nextFormForType(current, doc.id))}
                  className={`min-h-[86px] border p-3 text-left transition ${
                    active
                      ? "bg-frame-orange/8 shadow-[inset_0_-3px_0_var(--color-frame-orange)]"
                      : "border-frame-gray-3 bg-frame-black/10 hover:bg-frame-gray-2/30"
                  }`}
                  style={{ borderColor: active ? doc.accent : undefined }}
                >
                  <Icon className="mb-3 h-4 w-4" style={{ color: doc.accent }} />
                  <span className="block text-xs font-semibold uppercase tracking-wide">{doc.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="app-panel overflow-hidden shadow-[0_26px_100px_rgba(0,0,0,0.24)]">
            <div className="flex flex-col gap-3 border-b border-frame-gray-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em]" style={{ color: selectedDoc.accent }}>
                  {t("app.documents.preview") + " " + selectedDoc.label}
                </span>
                <p className="mt-1 text-xs text-frame-gray-light">
                  {t("app.documents.pdfInfo")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setIsEditorOpen(true)} className="frame-btn-ghost flex items-center gap-2 px-3 py-2">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("app.common.edit")}
                </button>
                <button type="button" onClick={copyText} className="frame-btn-ghost flex items-center gap-2 px-3 py-2">
                  <Copy className="h-3.5 w-3.5" />
                  {t("app.common.copy")}
                </button>
                <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2 px-3 py-2">
                  <Download className="h-3.5 w-3.5" />
                  {t("app.documents.exportPdf")}
                </button>
              </div>
            </div>
            <div className="bg-frame-black/20 p-3 sm:p-6">
              <iframe
                title={t("app.documents.documentPreview") as string}
                srcDoc={html}
                className="mx-auto h-[min(980px,calc(100vh-190px))] min-h-[680px] w-full max-w-[920px] bg-[#f8f4ed] shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
              />
            </div>
          </div>

          <aside className="app-panel p-4 xl:sticky xl:top-24">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="frame-label">// {t("app.documents.history")}</p>
                <p className="mt-1 text-xs text-frame-gray-light">{t("app.documents.savedVersionsHint")}</p>
              </div>
              <span className="font-frame-mono text-[0.62rem] text-frame-gray-light">{savedDocs.length}</span>
            </div>
            {savedDocs.length === 0 ? (
              <div className="border border-dashed border-frame-gray-3 p-5 text-sm leading-relaxed text-frame-gray-light">
                {t("app.documents.emptyHistoryHint")}
              </div>
            ) : (
              <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {savedDocs.map((doc) => {
                  const docType = DOC_TYPES.find((item) => item.id === doc.type);
                  return (
                    <div key={doc.id} className="border border-frame-gray-3 bg-frame-black/15 p-3">
                      <button type="button" onClick={() => exportPdf(doc.html)} className="w-full text-left">
                        <span className="block font-frame-mono text-[0.54rem] uppercase tracking-[0.1em]" style={{ color: docType?.accent }}>
                          {docType?.label}
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold">{doc.title}</span>
                        <span className="mt-1 block truncate text-[0.62rem] text-frame-gray-light">
                          {doc.client || t("app.documents.withoutClient")} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </button>
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-frame-gray-3 pt-2">
                        <button type="button" onClick={() => exportPdf(doc.html)} className="text-frame-orange transition hover:text-frame-white" title={t("app.common.exportPdf")}>
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeDoc(doc.id)} className="text-frame-gray-light transition hover:text-red-400" title={t("app.common.delete")}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </section>
      </main>

      <AnimatedModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={`${t("app.common.edit")} ${selectedDoc.label}`}
        description={t("app.documents.editModalDescription")}
        className="max-w-5xl"
        footer={
          <>
            <button type="button" onClick={() => setIsEditorOpen(false)} className="frame-btn-ghost">
              Fechar sem salvar
            </button>
            <button type="button" onClick={saveAndClose} className="frame-btn-primary flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar e fechar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {activeGroups.map((group) => (
            <section key={group.title} className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <p className="mb-3 font-frame-mono text-[0.64rem] uppercase tracking-[0.18em]" style={{ color: selectedDoc.accent }}>
                {group.title}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      </AnimatedModal>
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
