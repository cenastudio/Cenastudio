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

const COMMON_FIELDS: DocumentGroup = {
  title: "// IDENTIFICACAO",
  fields: [
    { key: "title", label: "Titulo", placeholder: "Ex: Campanha de lancamento", span: "full" },
    { key: "client", label: "Cliente", placeholder: "Ex: Aurora Brand" },
    { key: "project", label: "Projeto", placeholder: "Ex: Filme manifesto 2026" },
  ],
};

const DOCUMENT_FORMS: Record<DocType, DocumentGroup[]> = {
  briefing: [
    COMMON_FIELDS,
    {
      title: "// ESTRATEGIA",
      fields: [
        { key: "objective", label: "Objetivo principal", placeholder: "O que este video precisa resolver?", kind: "textarea", span: "full" },
        { key: "audience", label: "Publico e contexto", placeholder: "Quem assiste, onde e com qual expectativa?", kind: "textarea", span: "full" },
        { key: "format", label: "Formato final", placeholder: "16:9 + cortes verticais" },
        { key: "duration", label: "Duracao alvo", placeholder: "60-90s" },
        { key: "deadline", label: "Prazo", placeholder: "Prazo", kind: "date" },
        { key: "budget", label: "Investimento", placeholder: "R$ 12k-18k" },
      ],
    },
    {
      title: "// ESCOPO",
      fields: [
        { key: "scope", label: "Entregaveis", placeholder: "Um entregavel por linha", kind: "textarea", span: "full" },
        { key: "notes", label: "Riscos e referencias", placeholder: "Restricoes, tom, referencias, aprovadores", kind: "textarea", span: "full" },
      ],
    },
  ],
  roteiro: [
    COMMON_FIELDS,
    {
      title: "// NARRATIVA",
      fields: [
        { key: "objective", label: "Promessa narrativa", placeholder: "Qual ideia o roteiro precisa defender?", kind: "textarea", span: "full" },
        { key: "audience", label: "Tom e publico", placeholder: "Premium, direto, emocional, institucional", kind: "textarea", span: "full" },
        { key: "duration", label: "Duracao", placeholder: "45s" },
        { key: "format", label: "Formato", placeholder: "Reels, YouTube, TV" },
      ],
    },
    {
      title: "// CENAS",
      fields: [
        { key: "scope", label: "Beat sheet / cenas", placeholder: "Gancho\nConflito\nProva visual\nCTA", kind: "textarea", span: "full" },
        { key: "notes", label: "Locucao, falas ou CTA", placeholder: "Texto guia, falas obrigatorias e finalizacao", kind: "textarea", span: "full" },
      ],
    },
  ],
  callsheet: [
    COMMON_FIELDS,
    {
      title: "// SET",
      fields: [
        { key: "deadline", label: "Data de gravacao", placeholder: "Data", kind: "date" },
        { key: "location", label: "Locacao", placeholder: "Endereco, ponto de encontro, estacionamento", span: "full" },
        { key: "schedule", label: "Agenda do dia", placeholder: "07:00 chegada equipe\n08:00 luz\n09:00 gravacao", kind: "textarea", span: "full" },
      ],
    },
    {
      title: "// PRODUCAO",
      fields: [
        { key: "crew", label: "Equipe e contatos", placeholder: "Direcao - Nome - telefone", kind: "textarea", span: "full" },
        { key: "equipment", label: "Equipamentos", placeholder: "Camera, lentes, audio, luz, midias", kind: "textarea", span: "full" },
        { key: "notes", label: "Observacoes de set", placeholder: "Figurino, alimentacao, riscos, autorizacoes", kind: "textarea", span: "full" },
      ],
    },
  ],
  decupagem: [
    COMMON_FIELDS,
    {
      title: "// PLANEJAMENTO VISUAL",
      fields: [
        { key: "objective", label: "Direcao de cena", placeholder: "Qual sensacao a imagem deve passar?", kind: "textarea", span: "full" },
        { key: "scope", label: "Lista de planos", placeholder: "Plano 01 - aberto - objetivo\nPlano 02 - close - detalhe", kind: "textarea", span: "full" },
        { key: "equipment", label: "Lentes, camera e movimento", placeholder: "35mm handheld, slider, drone", kind: "textarea", span: "full" },
        { key: "location", label: "Ambientes", placeholder: "Locacoes ou cenarios por bloco", span: "full" },
      ],
    },
  ],
  orcamento: [
    COMMON_FIELDS,
    {
      title: "// COMERCIAL",
      fields: [
        { key: "budget", label: "Investimento base", placeholder: "R$ 18.000" },
        { key: "deadline", label: "Validade", placeholder: "Data", kind: "date" },
        { key: "scope", label: "Itens inclusos", placeholder: "Pre-producao\nCaptacao\nEdicao\nFinalizacao", kind: "textarea", span: "full" },
        { key: "crew", label: "Equipe prevista", placeholder: "Equipe compacta, equipe completa, diaria extra", kind: "textarea", span: "full" },
        { key: "equipment", label: "Equipamentos previstos", placeholder: "Camera, luz, audio, estudio, drone", kind: "textarea", span: "full" },
        { key: "notes", label: "Condicoes comerciais", placeholder: "Pagamento, alteracoes, direitos de uso, deslocamento", kind: "textarea", span: "full" },
      ],
    },
  ],
  cronograma: [
    COMMON_FIELDS,
    {
      title: "// FLUXO",
      fields: [
        { key: "deadline", label: "Entrega final", placeholder: "Data", kind: "date" },
        { key: "schedule", label: "Marcos e datas", placeholder: "Briefing aprovado - 01/07\nGravacao - 05/07\nCorte 1 - 10/07", kind: "textarea", span: "full" },
        { key: "scope", label: "Dependencias", placeholder: "Materiais do cliente, aprovadores, agenda de talentos", kind: "textarea", span: "full" },
        { key: "notes", label: "Rodadas e regras", placeholder: "Prazo por rodada, responsavel pelo aceite", kind: "textarea", span: "full" },
      ],
    },
  ],
  checklist: [
    COMMON_FIELDS,
    {
      title: "// PRE-SET",
      fields: [
        { key: "deadline", label: "Data do set", placeholder: "Data", kind: "date" },
        { key: "location", label: "Locacao / base", placeholder: "Endereco e ponto de apoio", span: "full" },
        { key: "equipment", label: "Checklist tecnico", placeholder: "Baterias\nCartoes\nAudio\nLuz\nBackup", kind: "textarea", span: "full" },
        { key: "crew", label: "Responsaveis", placeholder: "Quem confere cada etapa?", kind: "textarea", span: "full" },
        { key: "notes", label: "Fechamento", placeholder: "Backup duplo, pastas, envio ao editor", kind: "textarea", span: "full" },
      ],
    },
  ],
  entrega: [
    COMMON_FIELDS,
    {
      title: "// PACOTE FINAL",
      fields: [
        { key: "scope", label: "Arquivos entregues", placeholder: "Master 4K\nVersao vertical\nLegenda\nThumbnail", kind: "textarea", span: "full" },
        { key: "format", label: "Formatos", placeholder: "MP4 H.264, ProRes, JPG" },
        { key: "deadline", label: "Data de envio", placeholder: "Data", kind: "date" },
        { key: "location", label: "Link de entrega", placeholder: "Drive, Vimeo, WeTransfer", span: "full" },
        { key: "notes", label: "Aceite e observacoes", placeholder: "Prazo de revisao final, aceite, proximos passos", kind: "textarea", span: "full" },
      ],
    },
  ],
};

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

function documentSections(form: DocumentForm) {
  const baseScope = lines(form.scope);
  const baseSchedule = lines(form.schedule);
  const baseCrew = lines(form.crew);
  const baseEquipment = lines(form.equipment);
  const defaults = {
    briefing: [
      ["Objetivo e Publico", [form.objective || "Objetivo do projeto a definir", form.audience && `Publico: ${form.audience}`].filter(Boolean)],
      ["Escopo e Entregaveis", baseScope.length ? baseScope : ["Video principal", "Versoes para redes sociais", "Arquivos finais organizados"]],
      ["Riscos e Cuidados", ["Alinhar aprovadores antes da primeira versao", "Confirmar autorizacoes de imagem", "Definir prazo de feedback"]],
    ],
    roteiro: [
      ["Estrutura Narrativa", baseScope.length ? baseScope : ["Gancho inicial", "Desenvolvimento da promessa", "Prova visual", "CTA final"]],
      ["Direcao de Cena", ["Priorizar acoes filmaveis", "Prever respiros para B-roll", "Manter ritmo compativel com o canal"]],
    ],
    callsheet: [
      ["Agenda do Dia", baseSchedule.length ? baseSchedule : ["Call time geral", "Montagem de equipamento", "Gravacao", "Backup e desmobilizacao"]],
      ["Equipe", baseCrew.length ? baseCrew : ["Direcao", "Camera", "Som", "Producao"]],
      ["Equipamentos", baseEquipment.length ? baseEquipment : ["Camera principal", "Audio dedicado", "Kit de luz", "Midias e backup"]],
    ],
    decupagem: [
      ["Lista de Planos", baseScope.length ? baseScope : ["Plano aberto de contexto", "Plano medio de acao", "Close de detalhe", "B-roll de apoio"]],
      ["Tecnica", baseEquipment.length ? baseEquipment : ["Lentes definidas por cena", "Movimentos planejados", "Audio sincronizado"]],
    ],
    orcamento: [
      ["Composicao do Investimento", [`Orcamento base: ${form.budget || "a definir"}`, "Equipe", "Equipamentos", "Pos-producao"]],
      ["Condicoes", ["Alteracoes fora do escopo geram novo ajuste", "Direitos e uso comercial devem estar no contrato", "Pagamento conforme combinado"]],
    ],
    cronograma: [
      ["Marcos", baseSchedule.length ? baseSchedule : ["Briefing aprovado", "Captacao", "Primeiro corte", "Revisao", "Entrega final"]],
      ["Aprovacao", ["Definir responsavel pelo aceite", "Centralizar comentarios por link", "Registrar rodada final"]],
    ],
    checklist: [
      ["Pre-set", ["Baterias carregadas", "Cartoes formatados", "Backup preparado", "Contatos confirmados"]],
      ["Fechamento", ["Backup duplo", "Conferencia de audio", "Material organizado por pasta", "Proxima etapa enviada ao cliente"]],
    ],
    entrega: [
      ["Pacote Final", baseScope.length ? baseScope : ["MP4 final", "Versoes sociais", "Legenda quando aplicavel", "Link de download"]],
      ["Aceite", ["Cliente recebeu materiais", "Prazo de revisao final confirmado", "Novas alteracoes entram como novo escopo"]],
    ],
  } satisfies Record<DocType, Array<[string, string[]]>>;
  return defaults[form.type];
}

function buildDocumentHtml(form: DocumentForm, studio: StudioSettings) {
  const doc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const accent = doc.accent;
  const accentSoft = `${accent}14`;
  const accentTint = `${accent}22`;
  const metadata = [
    ["Cliente", form.client || "A definir"],
    ["Projeto", form.project || form.title],
    ["Formato", form.format],
    ["Duracao", form.duration],
    ["Prazo", form.deadline || "A definir"],
    ["Locacao", form.location || "A definir"],
    ["Produtora", studio.studioName],
    ["Contato", studio.email || studio.phone || "A definir"],
    ["Cidade", studio.city || "A definir"],
  ];

  const content = documentSections(form)
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
    .doc-page{width:210mm;min-height:297mm;margin:0 auto;background:linear-gradient(180deg,#fbf7f0 0%,#f5eee4 100%);padding:18mm;position:relative;overflow:hidden}
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
    @media print{html,body{width:210mm;min-height:297mm;background:#f2ede4}.doc-page{width:210mm;min-height:297mm;margin:0;padding:18mm;box-shadow:none}.doc-section{break-inside:avoid}.doc-grid{grid-template-columns:1fr 1fr}}
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
      <div class="doc-brand">${esc(studio.studioName)}<br/>${esc(studio.email || studio.phone || "Documento operacional")}<br/>${new Date().toLocaleDateString("pt-BR")}</div>
    </header>
    <div class="doc-grid">${metadata.map(([key, value]) => `<div class="doc-field"><div class="doc-field-label">${esc(key)}</div><div class="doc-field-value">${esc(value)}</div></div>`).join("")}</div>
    ${content}
    ${form.notes ? renderList("Notas adicionais", lines(form.notes), accent) : ""}
    <footer class="doc-footer"><div>${esc(studio.studioName)} · ${esc(studio.signature)}</div><div>Gerado em ${new Date().toLocaleString("pt-BR")}</div></footer>
  </main>
</body>
</html>`;
}

function buildDocumentText(form: DocumentForm, studio: StudioSettings) {
  const doc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const metadata = [
    ["Cliente", form.client || "A definir"],
    ["Projeto", form.project || form.title],
    ["Formato", form.format || "A definir"],
    ["Duracao", form.duration || "A definir"],
    ["Prazo", form.deadline || "A definir"],
    ["Locacao", form.location || "A definir"],
  ];
  const sections = documentSections(form)
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
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [savedDocs, setSavedDocs] = useState<StudioDocument[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const selectedDoc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const activeGroups = DOCUMENT_FORMS[form.type];
  const html = useMemo(() => buildDocumentHtml(form, studio), [form, studio]);

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
    toast.success("Documento salvo no Studio");
  };

  const saveAndClose = () => {
    saveCurrent();
    setIsEditorOpen(false);
  };

  const exportPdf = (docHtml = html) => {
    printHtmlDocument(docHtml);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(buildDocumentText(form, studio));
    toast.success("Texto limpo copiado");
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
      ...documentSections(form).flatMap(([title, items]) => [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
        ...items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      ]),
      ...(form.notes
        ? [
            new Paragraph({ text: "Notas adicionais", heading: HeadingLevel.HEADING_2 }),
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
    toast.success("Documento Word gerado");
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
              <p className="frame-label">// DOCUMENTOS STUDIO</p>
              <h1 className="frame-title text-[clamp(1.8rem,4vw,3.6rem)] leading-none mt-2">DOCUMENTOS OPERACIONAIS</h1>
              <p className="text-sm text-frame-gray-light max-w-2xl mt-3">
                Cada documento tem formulario proprio, preview limpo e exportacao em PDF para cliente, set e producao.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIsEditorOpen(true)} className="frame-btn-ghost flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Editar conteúdo
              </button>
              <button type="button" onClick={copyText} className="frame-btn-ghost flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copiar texto
              </button>
              <button type="button" onClick={exportDocx} className="frame-btn-ghost flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Word
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </section>

        <section className="app-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="frame-label">// TIPO DE DOCUMENTO</p>
              <p className="mt-1 text-xs text-frame-gray-light">Escolha a peça e edite somente quando precisar.</p>
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
                  Preview {selectedDoc.label}
                </span>
                <p className="mt-1 text-xs text-frame-gray-light">
                  O PDF exportado preserva esta cor e ocupa a folha inteira.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setIsEditorOpen(true)} className="frame-btn-ghost flex items-center gap-2 px-3 py-2">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button type="button" onClick={copyText} className="frame-btn-ghost flex items-center gap-2 px-3 py-2">
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
                <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2 px-3 py-2">
                  <Download className="h-3.5 w-3.5" />
                  Exportar PDF
                </button>
              </div>
            </div>
            <div className="bg-frame-black/20 p-3 sm:p-6">
              <iframe
                title="Preview do documento"
                srcDoc={html}
                className="mx-auto h-[min(980px,calc(100vh-190px))] min-h-[680px] w-full max-w-[920px] bg-[#f8f4ed] shadow-[0_22px_70px_rgba(0,0,0,0.28)]"
              />
            </div>
          </div>

          <aside className="app-panel p-4 xl:sticky xl:top-24">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="frame-label">// HISTÓRICO</p>
                <p className="mt-1 text-xs text-frame-gray-light">Versões salvas para reexportar.</p>
              </div>
              <span className="font-frame-mono text-[0.62rem] text-frame-gray-light">{savedDocs.length}</span>
            </div>
            {savedDocs.length === 0 ? (
              <div className="border border-dashed border-frame-gray-3 p-5 text-sm leading-relaxed text-frame-gray-light">
                Edite o documento e use “Salvar e fechar” para criar a primeira versão.
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
                          {doc.client || "Sem cliente"} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </button>
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-frame-gray-3 pt-2">
                        <button type="button" onClick={() => exportPdf(doc.html)} className="text-frame-orange transition hover:text-frame-white" title="Exportar PDF">
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => removeDoc(doc.id)} className="text-frame-gray-light transition hover:text-red-400" title="Excluir">
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
        title={`Editar ${selectedDoc.label}`}
        description="Preencha os dados, salve a versão e volte ao preview para exportar."
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
