import { useEffect, useMemo, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import {
  BriefcaseBusiness,
  Copy,
  Download,
  FileSignature,
  PackagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { readStudioSettings, saveStudioSettings, type StudioSettings } from "@/lib/studioSettings";

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface ProposalLine extends ServiceItem {
  quantity: number;
}

interface ProposalForm {
  clientName: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  projectTitle: string;
  deadline: string;
  validityDays: number;
  paymentTerms: string;
  discount: number;
  notes: string;
}

interface SavedProposal {
  id: string;
  title: string;
  clientName: string;
  total: number;
  html: string;
  createdAt: string;
}

const CATALOG_KEY = "frame.proposal.catalog.v1";
const HISTORY_KEY = "frame.proposal.history.v1";

const DEFAULT_CATALOG: ServiceItem[] = [
  {
    id: "institucional",
    name: "Video institucional",
    description: "Filme principal com roteiro, captacao, edicao, cor e entrega final.",
    price: 4500,
    category: "Producao",
  },
  {
    id: "reels-pack",
    name: "Pacote Reels",
    description: "4 videos verticais editados para campanha ou conteudo recorrente.",
    price: 2800,
    category: "Social",
  },
  {
    id: "evento",
    name: "Cobertura de evento",
    description: "Captação audiovisual, melhores momentos e entrega otimizada.",
    price: 6500,
    category: "Evento",
  },
  {
    id: "fotografia",
    name: "Still / Fotos de apoio",
    description: "Banco de imagens para campanha, bastidores e social media.",
    price: 1800,
    category: "Extra",
  },
  {
    id: "motion",
    name: "Motion graphics",
    description: "Vinhetas, textos animados, lower thirds e grafismos.",
    price: 2200,
    category: "Pos-producao",
  },
  {
    id: "drone",
    name: "Drone",
    description: "Imagens aereas com operador habilitado e arquivos finais.",
    price: 1500,
    category: "Extra",
  },
];

const initialProposal: ProposalForm = {
  clientName: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  projectTitle: "Proposta audiovisual",
  deadline: "",
  validityDays: 15,
  paymentTerms: "50% na assinatura + 50% na entrega",
  discount: 0,
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
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

function buildProposalHtml(form: ProposalForm, lines: ProposalLine[], studio: StudioSettings) {
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = Math.round((subtotal * form.discount) / 100);
  const total = subtotal - discountValue;
  const docNumber = String(Date.now()).slice(-6);
  const rows = lines.map((item) => `
    <tr>
      <td><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></td>
      <td>${item.quantity}x</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proposta - ${esc(form.clientName || form.company || "Cliente")}</title>
  <style>
    *{box-sizing:border-box} body{margin:0;background:#0d0d0d;color:#e8e8e8;font-family:Arial,sans-serif;padding:46px}
    .page{max-width:900px;margin:0 auto}.header{display:flex;justify-content:space-between;gap:32px;padding-bottom:28px;border-bottom:3px solid ${studio.primaryColor}}
    .brand{font-size:34px;font-weight:900;letter-spacing:.06em;color:#fff}.brand span{color:${studio.primaryColor}}.sub{font-size:11px;color:${studio.primaryColor};font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-top:5px}
    .doc{text-align:right}.doc small{display:block;color:#777;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.doc strong{display:block;color:${studio.primaryColor};font-size:28px;margin-top:4px}
    h1{font-size:42px;line-height:1;margin:38px 0 10px;color:#fff}.muted{color:#999;line-height:1.55}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:28px 0}.field{background:#151515;border:1px solid #252525;padding:13px 15px}.label{font-size:9px;color:#777;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}.value{font-size:13px;color:#eee;font-weight:700}
    .section{margin-top:34px}.section-title{font-size:11px;color:${studio.primaryColor};font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;background:#141414;border:1px solid #252525} th{padding:12px 14px;text-align:left;background:#1b1b1b;color:#777;font-size:10px;text-transform:uppercase;letter-spacing:.1em}
    td{padding:13px 14px;border-top:1px solid #252525;color:#ddd;font-size:13px;vertical-align:top}td:nth-child(2){text-align:center}td:nth-child(3),td:nth-child(4){text-align:right}td small{display:block;color:#777;font-size:11px;margin-top:3px;line-height:1.35}
    .totals{margin-top:12px;background:#141414;border:1px solid #252525}.total-row{display:flex;justify-content:space-between;padding:12px 18px;border-top:1px solid #252525;color:#aaa}.total-row:first-child{border-top:0}
    .final{margin-top:16px;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 24px;border:1px solid ${studio.primaryColor}77;background:linear-gradient(135deg,${studio.primaryColor}29,rgba(0,0,0,0))}
    .final small{display:block;color:${studio.primaryColor};font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.final strong{font-size:40px;color:#fff}
    .terms{background:#111;border:1px solid #242424;padding:20px;margin-top:28px;color:#aaa;font-size:12px;line-height:1.7}.footer{display:flex;justify-content:space-between;gap:40px;margin-top:56px}.sign{width:240px;border-top:1px solid #333;padding-top:8px;text-align:center;color:#777;font-size:10px}
    @media print{body{padding:28px;background:#0d0d0d}.section{break-inside:avoid}}
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div><div class="brand">${esc(studio.studioName)}<span>.</span></div><div class="sub">${esc(studio.legalName || "Proposta comercial audiovisual")}</div></div>
      <div class="doc"><small>Proposta</small><strong>#${docNumber}</strong><small>${new Date().toLocaleDateString("pt-BR")}</small></div>
    </header>
    <h1>${esc(form.projectTitle || "Proposta audiovisual")}</h1>
    <p class="muted">Escopo, investimento e condicoes comerciais para producao audiovisual.</p>
    <div class="grid">
      ${[
        ["Cliente", form.clientName || "A definir"],
        ["Empresa", form.company || "A definir"],
        ["Email", form.email || "A definir"],
        ["WhatsApp", form.phone || "A definir"],
        ["Cidade", form.city || studio.city || "A definir"],
        ["Prazo", form.deadline || "A definir"],
        ["Validade", `${form.validityDays || 15} dias`],
        ["Pagamento", form.paymentTerms],
      ].map(([label, value]) => `<div class="field"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join("")}
    </div>
    <section class="section">
      <div class="section-title">Escopo de servicos</div>
      <table><thead><tr><th>Servico</th><th>Qtd.</th><th>Unitario</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><strong>${formatCurrency(subtotal)}</strong></div>
        ${form.discount ? `<div class="total-row"><span>Desconto (${form.discount}%)</span><strong>-${formatCurrency(discountValue)}</strong></div>` : ""}
      </div>
      <div class="final"><div><small>Valor total do projeto</small>${form.notes ? `<p class="muted">${esc(form.notes)}</p>` : ""}</div><strong>${formatCurrency(total)}</strong></div>
    </section>
    <div class="terms">Esta proposta tem validade de ${form.validityDays || 15} dias. Alteracoes fora do escopo podem gerar revisao de valores e prazos. Direitos, uso de imagem, entregaveis finais e pagamentos seguem as condicoes comerciais aprovadas pelas partes.</div>
    <footer class="footer"><div class="sign">${esc(studio.studioName)}<br/>${esc(studio.signature || studio.email || "Responsavel comercial")}</div><div class="sign">${esc(form.clientName || "Cliente")}<br/>Aceite da proposta</div></footer>
  </main>
</body>
</html>`;
}

function ProposalsContent() {
  const [catalog, setCatalog] = useState<ServiceItem[]>(DEFAULT_CATALOG);
  const [proposal, setProposal] = useState<ProposalForm>(initialProposal);
  const [selected, setSelected] = useState<ProposalLine[]>([]);
  const [history, setHistory] = useState<SavedProposal[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());
  const [editingService, setEditingService] = useState<ServiceItem>({
    id: "",
    name: "",
    description: "",
    price: 0,
    category: "Personalizado",
  });

  useEffect(() => {
    setCatalog(readJson(CATALOG_KEY, DEFAULT_CATALOG));
    setHistory(readJson(HISTORY_KEY, []));
    setStudio(readStudioSettings());
    api.studioSettings
      .get()
      .then((data) => {
        setStudio(data);
        saveStudioSettings(data);
      })
      .catch(() => null);
  }, []);

  const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = Math.round((subtotal * proposal.discount) / 100);
  const total = subtotal - discountValue;
  const proposalHtml = useMemo(() => buildProposalHtml(proposal, selected, studio), [proposal, selected, studio]);

  const persistCatalog = (items: ServiceItem[]) => {
    setCatalog(items);
    localStorage.setItem(CATALOG_KEY, JSON.stringify(items));
  };

  const persistHistory = (items: SavedProposal[]) => {
    setHistory(items);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  };

  const updateProposal = (key: keyof ProposalForm, value: string | number) => {
    setProposal((current) => ({ ...current, [key]: value }));
  };

  const addLine = (service: ServiceItem) => {
    setSelected((current) => {
      const existing = current.find((item) => item.id === service.id);
      if (existing) {
        return current.map((item) => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...service, quantity: 1 }];
    });
  };

  const updateLine = (id: string, data: Partial<ProposalLine>) => {
    setSelected((current) => current.map((item) => item.id === id ? { ...item, ...data } : item));
  };

  const saveService = () => {
    if (!editingService.name.trim()) {
      toast.error("Nome do servico e obrigatorio");
      return;
    }
    const service = {
      ...editingService,
      id: editingService.id || `service_${Date.now()}`,
      price: Number(editingService.price) || 0,
    };
    const next = catalog.some((item) => item.id === service.id)
      ? catalog.map((item) => item.id === service.id ? service : item)
      : [service, ...catalog];
    persistCatalog(next);
    setEditingService({ id: "", name: "", description: "", price: 0, category: "Personalizado" });
    toast.success("Servico salvo no catalogo");
  };

  const removeService = (id: string) => {
    persistCatalog(catalog.filter((item) => item.id !== id));
    setSelected((current) => current.filter((item) => item.id !== id));
  };

  const exportPdf = (html = proposalHtml, requireSelection = true) => {
    if (requireSelection && !selected.length) {
      toast.error("Selecione pelo menos um servico");
      return;
    }
    printHtmlDocument(html);
  };

  const saveProposal = () => {
    if (!selected.length) {
      toast.error("Selecione pelo menos um servico");
      return;
    }
    const item: SavedProposal = {
      id: crypto.randomUUID(),
      title: proposal.projectTitle || "Proposta audiovisual",
      clientName: proposal.clientName || proposal.company || "Cliente",
      total,
      html: proposalHtml,
      createdAt: new Date().toISOString(),
    };
    persistHistory([item, ...history].slice(0, 40));
    toast.success("Proposta salva no historico");
  };

  const copySummary = async () => {
    const summary = `${proposal.projectTitle}\nCliente: ${proposal.clientName || proposal.company || "A definir"}\nTotal: ${formatCurrency(total)}\nServicos:\n${selected.map((item) => `- ${item.quantity}x ${item.name}: ${formatCurrency(item.price * item.quantity)}`).join("\n")}`;
    await navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado");
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <main className="px-4 sm:px-6 py-6 space-y-5">
        <section className="border border-frame-gray-3 bg-frame-gray-1/40 p-4 sm:p-5">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div>
              <p className="frame-label">// PROPOSTAS & PACOTES</p>
              <h1 className="frame-title text-[clamp(1.8rem,4vw,3.6rem)] leading-none mt-2">MAQUINA COMERCIAL DA PRODUTORA</h1>
              <p className="text-sm text-frame-gray-light max-w-3xl mt-3">
                Configure servicos, monte pacotes, ajuste valores, aplique desconto e gere proposta PDF pronta para enviar.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 min-w-[320px]">
              <div className="border border-frame-gray-3 bg-frame-black/30 p-3">
                <p className="text-[0.55rem] font-frame-mono uppercase text-frame-gray-light">Subtotal</p>
                <p className="text-sm font-bold">{formatCurrency(subtotal)}</p>
              </div>
              <div className="border border-frame-gray-3 bg-frame-black/30 p-3">
                <p className="text-[0.55rem] font-frame-mono uppercase text-frame-gray-light">Desconto</p>
                <p className="text-sm font-bold text-green-400">{formatCurrency(discountValue)}</p>
              </div>
              <div className="border border-frame-orange bg-frame-orange/10 p-3">
                <p className="text-[0.55rem] font-frame-mono uppercase text-frame-orange">Total</p>
                <p className="text-sm font-bold">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)_460px] gap-5">
          <aside className="space-y-4">
            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="frame-label">// CATALOGO</p>
                <button type="button" onClick={saveService} className="frame-btn-ghost flex items-center gap-2">
                  <PackagePlus className="w-4 h-4" />
                  Salvar servico
                </button>
              </div>
              <div className="space-y-3">
                <input className="frame-input w-full" value={editingService.name} onChange={(event) => setEditingService((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do servico ou pacote" />
                <input className="frame-input w-full" value={editingService.category} onChange={(event) => setEditingService((current) => ({ ...current, category: event.target.value }))} placeholder="Categoria" />
                <input className="frame-input w-full" type="number" value={editingService.price || ""} onChange={(event) => setEditingService((current) => ({ ...current, price: Number(event.target.value) }))} placeholder="Valor base" />
                <textarea className="frame-input w-full min-h-[78px] resize-y" value={editingService.description} onChange={(event) => setEditingService((current) => ({ ...current, description: event.target.value }))} placeholder="Descricao comercial" />
              </div>
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <p className="frame-label mb-3">// SERVICOS SALVOS</p>
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {catalog.map((service) => (
                  <div key={service.id} className="border border-frame-gray-3 bg-frame-black/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => addLine(service)} className="text-left flex-1 min-w-0">
                        <div className="text-sm font-semibold">{service.name}</div>
                        <div className="text-[0.6rem] text-frame-gray-light mt-1">{service.category} · {formatCurrency(service.price)}</div>
                        <p className="text-xs text-frame-gray-light/70 mt-2 leading-relaxed">{service.description}</p>
                      </button>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditingService(service)} className="text-frame-orange hover:text-frame-white p-1" title="Editar">
                          <FileSignature className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => removeService(service.id)} className="text-frame-gray-light hover:text-red-400 p-1" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={() => addLine(service)} className="mt-3 frame-btn-ghost w-full flex items-center justify-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <p className="frame-label mb-3">// DADOS DA PROPOSTA</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input className="frame-input w-full" value={proposal.projectTitle} onChange={(event) => updateProposal("projectTitle", event.target.value)} placeholder="Titulo da proposta" />
                <input className="frame-input w-full" value={proposal.clientName} onChange={(event) => updateProposal("clientName", event.target.value)} placeholder="Responsavel" />
                <input className="frame-input w-full" value={proposal.company} onChange={(event) => updateProposal("company", event.target.value)} placeholder="Empresa" />
                <input className="frame-input w-full" value={proposal.email} onChange={(event) => updateProposal("email", event.target.value)} placeholder="Email" />
                <input className="frame-input w-full" value={proposal.phone} onChange={(event) => updateProposal("phone", event.target.value)} placeholder="WhatsApp" />
                <input className="frame-input w-full" value={proposal.city} onChange={(event) => updateProposal("city", event.target.value)} placeholder="Cidade" />
                <input className="frame-input w-full" type="date" value={proposal.deadline} onChange={(event) => updateProposal("deadline", event.target.value)} />
                <input className="frame-input w-full" type="number" value={proposal.validityDays} onChange={(event) => updateProposal("validityDays", Number(event.target.value))} placeholder="Validade em dias" />
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                <input className="frame-input w-full" value={proposal.paymentTerms} onChange={(event) => updateProposal("paymentTerms", event.target.value)} placeholder="Condicoes de pagamento" />
                <input className="frame-input w-full" type="number" min={0} max={70} value={proposal.discount} onChange={(event) => updateProposal("discount", Number(event.target.value))} placeholder="Desconto %" />
              </div>
              <textarea className="frame-input w-full min-h-[88px] resize-y mt-3" value={proposal.notes} onChange={(event) => updateProposal("notes", event.target.value)} placeholder="Observacoes comerciais, escopo especial ou premissas" />
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="frame-label">// ITENS DA PROPOSTA</p>
                <span className="text-xs text-frame-gray-light">{selected.length} item(ns)</span>
              </div>
              {selected.length === 0 ? (
                <div className="border border-dashed border-frame-gray-3 p-8 text-center text-sm text-frame-gray-light">
                  Selecione servicos do catalogo para montar a proposta.
                </div>
              ) : (
                <div className="space-y-2">
                  {selected.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 lg:grid-cols-[1fr_90px_140px_120px_auto] gap-2 items-center border border-frame-gray-3 bg-frame-black/30 p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{line.name}</div>
                        <div className="text-xs text-frame-gray-light truncate">{line.description}</div>
                      </div>
                      <input className="frame-input w-full" type="number" min={1} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                      <input className="frame-input w-full" type="number" min={0} value={line.price} onChange={(event) => updateLine(line.id, { price: Number(event.target.value) || 0 })} />
                      <div className="text-sm font-bold text-right">{formatCurrency(line.price * line.quantity)}</div>
                      <button type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== line.id))} className="text-frame-gray-light hover:text-red-400 justify-self-end p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <button type="button" onClick={saveProposal} className="frame-btn-ghost flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                Salvar
              </button>
              <button type="button" onClick={copySummary} className="frame-btn-ghost flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" />
                Copiar
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center justify-center gap-2 col-span-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="frame-label">// HISTORICO</p>
                <span className="text-xs text-frame-gray-light">{history.length}</span>
              </div>
              {history.length === 0 ? (
                <div className="border border-dashed border-frame-gray-3 p-4 text-sm text-frame-gray-light">
                  Nenhuma proposta salva ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 border border-frame-gray-3 bg-frame-black/30 p-3">
                      <BriefcaseBusiness className="w-4 h-4 text-frame-orange shrink-0" />
                      <button type="button" onClick={() => exportPdf(item.html, false)} className="flex-1 text-left min-w-0">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className="text-[0.62rem] text-frame-gray-light truncate">{item.clientName} · {formatCurrency(item.total)} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</div>
                      </button>
                      <button type="button" onClick={() => exportPdf(item.html, false)} className="text-frame-orange hover:text-frame-white" title="Exportar">
                        <Download className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => persistHistory(history.filter((saved) => saved.id !== item.id))} className="text-frame-gray-light hover:text-red-400" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="border border-frame-gray-3 bg-frame-gray-1/30 overflow-hidden min-h-[720px] 2xl:sticky 2xl:top-24">
            <div className="h-12 border-b border-frame-gray-3 px-4 flex items-center justify-between">
              <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-orange">Preview proposta</span>
              <span className="text-[0.62rem] text-frame-gray-light">{formatCurrency(total)}</span>
            </div>
            {selected.length ? (
              <iframe title="Preview da proposta" srcDoc={proposalHtml} className="w-full h-[680px] bg-[#0d0d0d]" />
            ) : (
              <div className="h-[680px] flex items-center justify-center p-8 text-center text-frame-gray-light">
                <div>
                  <FileSignature className="w-14 h-14 mx-auto mb-4 text-frame-orange" />
                  <p className="text-sm">Adicione servicos para gerar o preview da proposta.</p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default function Proposals() {
  return (
    <ProtectedRoute>
      <ProposalsContent />
    </ProtectedRoute>
  );
}
