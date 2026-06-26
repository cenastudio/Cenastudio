import { useEffect, useMemo, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Film,
  ListChecks,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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

function buildDocumentHtml(form: DocumentForm) {
  const doc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const metadata = [
    ["Cliente", form.client || "A definir"],
    ["Projeto", form.project || form.title],
    ["Formato", form.format],
    ["Duracao", form.duration],
    ["Prazo", form.deadline || "A definir"],
    ["Locacao", form.location || "A definir"],
  ];

  const content = documentSections(form)
    .map(([title, items]) => renderList(title, items, doc.accent))
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(doc.label)} - ${esc(form.title)}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#f4f0e8;color:#141414;font-family:Arial,sans-serif}
    .doc-page{max-width:880px;min-height:100vh;margin:0 auto;background:#f8f4ed;padding:48px}
    .doc-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:${doc.accent}}
    .doc-title{font-size:44px;line-height:.95;margin:10px 0 10px;font-weight:900;color:#111}
    .doc-muted{color:#666;line-height:1.5;font-size:14px}
    .doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid ${doc.accent};padding-bottom:22px}
    .doc-brand{text-align:right;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#666}
    .doc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:24px}
    .doc-field{border:1px solid #ddd4c7;background:#fffdf8;padding:11px}
    .doc-field-label{font-size:9px;color:#777;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
    .doc-field-value{font-size:12px;color:#1a1a1a;font-weight:700;line-height:1.45}
    .doc-section{margin-top:26px;padding-top:15px;border-top:1px solid #d8d0c3}
    .doc-section h2{font-size:11px;text-transform:uppercase;letter-spacing:.16em;margin:0 0 10px}
    .doc-list{display:grid;gap:7px}.doc-item{font-size:12px;line-height:1.48;padding:9px 11px;border-left:3px solid;background:#fffdf8}
    .doc-footer{margin-top:42px;padding-top:18px;border-top:1px solid #d8d0c3;display:flex;justify-content:space-between;gap:20px;color:#777;font-size:11px}
    @media print{body{background:#fff}.doc-page{max-width:none;padding:32px}.doc-section{break-inside:avoid}.doc-grid{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
  <main class="doc-page">
    <header class="doc-header">
      <div>
        <div class="doc-kicker">FRAME.AI Studio · ${esc(doc.label)}</div>
        <h1 class="doc-title">${esc(form.title || doc.label)}</h1>
        <div class="doc-muted">${esc(doc.description)}</div>
      </div>
      <div class="doc-brand">FRAME.AI<br/>Documento operacional<br/>${new Date().toLocaleDateString("pt-BR")}</div>
    </header>
    <div class="doc-grid">${metadata.map(([key, value]) => `<div class="doc-field"><div class="doc-field-label">${esc(key)}</div><div class="doc-field-value">${esc(value)}</div></div>`).join("")}</div>
    ${content}
    ${form.notes ? renderList("Notas adicionais", lines(form.notes), doc.accent) : ""}
    <footer class="doc-footer"><div>FRAME.AI Director · Documento pronto para producao</div><div>Gerado em ${new Date().toLocaleString("pt-BR")}</div></footer>
  </main>
</body>
</html>`;
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

function DocumentsContent() {
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [savedDocs, setSavedDocs] = useState<StudioDocument[]>([]);
  const selectedDoc = DOC_TYPES.find((item) => item.id === form.type) || DOC_TYPES[0];
  const html = useMemo(() => buildDocumentHtml(form), [form]);

  useEffect(() => {
    setSavedDocs(readSavedDocs());
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

  const exportPdf = (docHtml = html) => {
    printHtmlDocument(docHtml);
  };

  const copyHtml = async () => {
    await navigator.clipboard.writeText(html);
    toast.success("HTML do documento copiado");
  };

  const removeDoc = (id: string) => {
    const docs = savedDocs.filter((doc) => doc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    setSavedDocs(docs);
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <main className="px-4 sm:px-6 py-6 space-y-5">
        <section className="border border-frame-gray-3 bg-frame-gray-1/40 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="frame-label">// DOCUMENTOS STUDIO</p>
              <h1 className="frame-title text-[clamp(1.8rem,4vw,3.6rem)] leading-none mt-2">DOCUMENTOS OPERACIONAIS</h1>
              <p className="text-sm text-frame-gray-light max-w-2xl mt-3">
                Gere briefing, callsheet, orcamento, cronograma e checklist sem depender da IA. Preencha, visualize, salve e exporte em PDF.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveCurrent} className="frame-btn-ghost flex items-center gap-2">
                <Save className="w-4 h-4" />
                Salvar
              </button>
              <button type="button" onClick={copyHtml} className="frame-btn-ghost flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-5">
          <div className="space-y-4">
            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <p className="frame-label mb-3">// TIPO</p>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map((doc) => {
                  const Icon = doc.icon;
                  const active = form.type === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, type: doc.id, title: current.title === "Documento de producao" ? doc.label : current.title }))}
                      className={`text-left border p-3 transition ${active ? "border-frame-orange bg-frame-orange/10" : "border-frame-gray-3 bg-frame-black/20 hover:border-frame-gray-4"}`}
                    >
                      <Icon className="w-4 h-4 mb-2" style={{ color: doc.accent }} />
                      <div className="text-xs font-semibold uppercase tracking-wide">{doc.label}</div>
                      <div className="text-[0.6rem] text-frame-gray-light mt-1 leading-relaxed">{doc.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4 space-y-3">
              <p className="frame-label">// CAMPOS</p>
              <input className="frame-input w-full" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Titulo do documento" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="frame-input w-full" value={form.client} onChange={(event) => update("client", event.target.value)} placeholder="Cliente" />
                <input className="frame-input w-full" value={form.project} onChange={(event) => update("project", event.target.value)} placeholder="Projeto" />
                <input className="frame-input w-full" value={form.format} onChange={(event) => update("format", event.target.value)} placeholder="Formato" />
                <input className="frame-input w-full" value={form.duration} onChange={(event) => update("duration", event.target.value)} placeholder="Duracao" />
                <input className="frame-input w-full" type="date" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} />
                <input className="frame-input w-full" value={form.budget} onChange={(event) => update("budget", event.target.value)} placeholder="Orcamento" />
              </div>
              <input className="frame-input w-full" value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Locacao" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.objective} onChange={(event) => update("objective", event.target.value)} placeholder="Objetivo / mensagem central" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.audience} onChange={(event) => update("audience", event.target.value)} placeholder="Publico / contexto do cliente" />
              <textarea className="frame-input w-full min-h-[100px] resize-y" value={form.scope} onChange={(event) => update("scope", event.target.value)} placeholder="Escopo e entregaveis, um por linha" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.schedule} onChange={(event) => update("schedule", event.target.value)} placeholder="Agenda / marcos, um por linha" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.crew} onChange={(event) => update("crew", event.target.value)} placeholder="Equipe, um por linha" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.equipment} onChange={(event) => update("equipment", event.target.value)} placeholder="Equipamentos / tecnica, um por linha" />
              <textarea className="frame-input w-full min-h-[84px] resize-y" value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Notas adicionais" />
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="frame-label">// HISTORICO</p>
                <span className="text-xs text-frame-gray-light">{savedDocs.length}</span>
              </div>
              {savedDocs.length === 0 ? (
                <div className="border border-dashed border-frame-gray-3 p-4 text-sm text-frame-gray-light">
                  Nenhum documento salvo ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {savedDocs.map((doc) => (
                    <div key={doc.id} className="border border-frame-gray-3 bg-frame-black/30 p-3 flex gap-3 items-center">
                      <button type="button" onClick={() => exportPdf(doc.html)} className="flex-1 text-left min-w-0">
                        <div className="text-sm font-semibold truncate">{doc.title}</div>
                        <div className="text-[0.62rem] text-frame-gray-light truncate">
                          {DOC_TYPES.find((item) => item.id === doc.type)?.label} · {doc.client || "sem cliente"} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </button>
                      <button type="button" onClick={() => exportPdf(doc.html)} className="text-frame-orange hover:text-frame-white transition" title="Exportar PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeDoc(doc.id)} className="text-frame-gray-light hover:text-red-400 transition" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="border border-frame-gray-3 bg-frame-gray-1/30 overflow-hidden min-h-[760px] xl:sticky xl:top-24">
            <div className="h-12 border-b border-frame-gray-3 px-4 flex items-center justify-between">
              <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-orange">Preview PDF</span>
              <span className="text-[0.62rem] text-frame-gray-light">{selectedDoc.label}</span>
            </div>
            <iframe title="Preview do documento" srcDoc={html} className="w-full h-[720px] bg-[#f8f4ed]" />
          </aside>
        </section>
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
