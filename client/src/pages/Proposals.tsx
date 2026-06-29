import { useEffect, useMemo, useState } from "react";
import { useLanguage, type Translate } from "@/contexts/LanguageContext";
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

function printHtmlDocument(docHtml: string, preparationError: string) {
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
      toast.error(preparationError);
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

function buildProposalHtml(form: ProposalForm, lines: ProposalLine[], studio: StudioSettings, t: Translate, locale: "pt" | "en") {
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
  <title>${esc(t("app.proposals.documentTitle"))} - ${esc(form.clientName || form.company || t("app.proposals.clientFallback"))}</title>
  <style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;min-height:100%;background:#0d0d0d;color:#e8e8e8;font-family:Arial,sans-serif}
    body{background:radial-gradient(circle at 88% 5%,${studio.primaryColor}2e,transparent 34%),linear-gradient(135deg,#15100d 0%,#0d0d0d 42%,#050505 100%)}
    .page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm;background:radial-gradient(circle at 92% 4%,${studio.primaryColor}30,transparent 33%),linear-gradient(180deg,#111 0%,#0d0d0d 100%);position:relative;overflow:hidden}
    .page:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,80,2,.08),transparent 32%),radial-gradient(circle at 10% 92%,rgba(217,195,171,.08),transparent 32%);pointer-events:none}
    .page>*{position:relative;z-index:1}.header{display:flex;justify-content:space-between;gap:32px;padding-bottom:28px;border-bottom:3px solid ${studio.primaryColor}}
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
    @media screen{.page{box-shadow:0 22px 70px rgba(0,0,0,.34)}}
    @media print{html,body{width:210mm;min-height:297mm;background:#0d0d0d}.page{width:210mm;min-height:297mm;margin:0;padding:18mm;box-shadow:none}.section{break-inside:avoid}}
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div><div class="brand">${esc(studio.studioName)}<span>.</span></div><div class="sub">${esc(studio.legalName || t("app.proposals.commercialProposal"))}</div></div>
      <div class="doc"><small>${esc(t("app.proposals.documentTitle"))}</small><strong>#${docNumber}</strong><small>${new Date().toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}</small></div>
    </header>
    <h1>${esc(form.projectTitle || t("app.proposals.audiovisualProposal"))}</h1>
    <p class="muted">${esc(t("app.proposals.documentDescription"))}</p>
    <div class="grid">
      ${[
        [t("app.proposals.clientLabel"), form.clientName || t("app.proposals.toDefine")],
        [t("app.proposals.companyLabel"), form.company || t("app.proposals.toDefine")],
        [t("app.proposals.emailLabel"), form.email || t("app.proposals.toDefine")],
        ["WhatsApp", form.phone || t("app.proposals.toDefine")],
        [t("app.proposals.cityLabel"), form.city || studio.city || t("app.proposals.toDefine")],
        [t("app.proposals.deadlineLabel"), form.deadline || t("app.proposals.toDefine")],
        [t("app.proposals.validityLabel"), `${form.validityDays || 15} ${t("app.proposals.days")}`],
        [t("app.proposals.paymentLabel"), form.paymentTerms],
      ].map(([label, value]) => `<div class="field"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join("")}
    </div>
    <section class="section">
      <div class="section-title">${esc(t("app.proposals.servicesScope"))}</div>
      <table><thead><tr><th>${esc(t("app.proposals.service"))}</th><th>${esc(t("app.proposals.quantityShort"))}</th><th>${esc(t("app.proposals.unitPrice"))}</th><th>${esc(t("app.proposals.total"))}</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>${esc(t("app.proposals.subtotal"))}</span><strong>${formatCurrency(subtotal)}</strong></div>
        ${form.discount ? `<div class="total-row"><span>${esc(t("app.proposals.discount"))} (${form.discount}%)</span><strong>-${formatCurrency(discountValue)}</strong></div>` : ""}
      </div>
      <div class="final"><div><small>${esc(t("app.proposals.projectTotal"))}</small>${form.notes ? `<p class="muted">${esc(form.notes)}</p>` : ""}</div><strong>${formatCurrency(total)}</strong></div>
    </section>
    <div class="terms">${esc(t("app.proposals.termsPrefix"))} ${form.validityDays || 15} ${esc(t("app.proposals.termsSuffix"))}</div>
    <footer class="footer"><div class="sign">${esc(studio.studioName)}<br/>${esc(studio.signature || studio.email || t("app.proposals.commercialLead"))}</div><div class="sign">${esc(form.clientName || t("app.proposals.clientFallback"))}<br/>${esc(t("app.proposals.proposalAcceptance"))}</div></footer>
  </main>
</body>
</html>`;
}

function ProposalsContent() {
  const { t, locale } = useLanguage();
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
  const proposalHtml = useMemo(() => buildProposalHtml(proposal, selected, studio, t, locale), [proposal, selected, studio, t, locale]);

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
      toast.error(t("app.errors.requiredServiceName") as string);
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
    toast.success(t("app.proposals.serviceSaved") as string);
  };

  const removeService = (id: string) => {
    persistCatalog(catalog.filter((item) => item.id !== id));
    setSelected((current) => current.filter((item) => item.id !== id));
  };

  const exportPdf = (html = proposalHtml, requireSelection = true) => {
    if (requireSelection && !selected.length) {
      toast.error(t("app.errors.selectAtLeastOneService") as string);
      return;
    }
    printHtmlDocument(html, t("app.errors.couldNotPreparePdf"));
  };

  const saveProposal = () => {
    if (!selected.length) {
      toast.error(t("app.errors.selectAtLeastOneService") as string);
      return;
    }
    const item: SavedProposal = {
      id: crypto.randomUUID(),
      title: proposal.projectTitle || t("app.proposals.audiovisualProposal"),
      clientName: proposal.clientName || proposal.company || t("app.proposals.clientFallback"),
      total,
      html: proposalHtml,
      createdAt: new Date().toISOString(),
    };
    persistHistory([item, ...history].slice(0, 40));
    toast.success(t("app.proposals.savedToHistory") as string);
  };

  const copySummary = async () => {
    const summary = `${proposal.projectTitle}\n${t("app.proposals.clientLabel")}: ${proposal.clientName || proposal.company || t("app.proposals.toDefine")}\n${t("app.proposals.total")}: ${formatCurrency(total)}\n${t("app.proposals.services")}:\n${selected.map((item) => `- ${item.quantity}x ${item.name}: ${formatCurrency(item.price * item.quantity)}`).join("\n")}`;
    await navigator.clipboard.writeText(summary);
    toast.success(t("app.common.copied") as string);
  };

  return (
    <div className="proposal-machine min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <main id="main-content" className="px-4 sm:px-8 py-8 space-y-6">
        <section className="proposal-hero p-5 sm:p-7">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div>
              <p className="frame-label">{t("app.proposals.label") as string}</p>
              <h1 className="proposal-title frame-title text-[clamp(2rem,4vw,3.8rem)] leading-none mt-3">{t("app.proposals.title") as string}</h1>
              <p className="proposal-subtitle text-sm max-w-3xl mt-3">
                {t("app.proposals.subtitle") as string}
              </p>
            </div>
            <div className="proposal-totals grid grid-cols-3 gap-2 min-w-[320px]">
              <div className="proposal-total-card p-3">
                <p className="text-[0.64rem] font-frame-mono uppercase text-frame-gray-light">{t("app.common.subtotal") as string}</p>
                <p className="text-sm font-bold">{formatCurrency(subtotal)}</p>
              </div>
              <div className="proposal-total-card p-3">
                <p className="text-[0.64rem] font-frame-mono uppercase text-frame-gray-light">{t("app.common.discount") as string}</p>
                <p className="text-sm font-bold text-green-400">{formatCurrency(discountValue)}</p>
              </div>
              <div className="proposal-total-card proposal-total-card-accent p-3">
                <p className="text-[0.64rem] font-frame-mono uppercase text-frame-orange">{t("app.common.total") as string}</p>
                <p className="text-sm font-bold">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 2xl:grid-cols-[360px_minmax(0,1fr)_440px] gap-6 items-start">
          <aside className="space-y-4">
            <div className="proposal-panel p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="frame-label">{t("app.proposals.catalog") as string}</p>
                <button type="button" onClick={saveService} className="frame-btn-ghost flex items-center gap-2">
                  <PackagePlus className="w-4 h-4" />
                  {t("app.proposals.saveService") as string}
                </button>
              </div>
              <div className="space-y-3">
                <input className="frame-input w-full" value={editingService.name} onChange={(event) => setEditingService((current) => ({ ...current, name: event.target.value }))} placeholder={t("app.proposals.serviceNamePlaceholder") as string} />
                <input className="frame-input w-full" value={editingService.category} onChange={(event) => setEditingService((current) => ({ ...current, category: event.target.value }))} placeholder={t("app.proposals.categoryPlaceholder") as string} />
                <input className="frame-input w-full" type="number" value={editingService.price || ""} onChange={(event) => setEditingService((current) => ({ ...current, price: Number(event.target.value) }))} placeholder={t("app.proposals.baseValuePlaceholder") as string} />
                <textarea className="frame-input w-full min-h-[78px] resize-y" value={editingService.description} onChange={(event) => setEditingService((current) => ({ ...current, description: event.target.value }))} placeholder={t("app.proposals.descriptionPlaceholder") as string} />
              </div>
            </div>

            <div className="proposal-panel p-5">
              <p className="frame-label mb-3">{t("app.proposals.savedServices") as string}</p>
              <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
                {catalog.map((service) => (
                  <div key={service.id} className="proposal-service-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => addLine(service)} className="text-left flex-1 min-w-0">
                        <div className="text-sm font-semibold">{service.name}</div>
                        <div className="text-[0.6rem] text-frame-gray-light mt-1">{service.category} · {formatCurrency(service.price)}</div>
                        <p className="text-xs text-frame-gray-light/70 mt-2 leading-relaxed">{service.description}</p>
                      </button>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditingService(service)} className="text-frame-orange hover:text-frame-white p-1" title={t("app.common.edit") as string}>
                          <FileSignature className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => removeService(service.id)} className="text-frame-gray-light hover:text-red-400 p-1" title={t("app.common.delete") as string}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={() => addLine(service)} className="mt-3 frame-btn-ghost w-full flex items-center justify-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      {t("app.common.add") as string}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="proposal-panel p-5 sm:p-6">
              <p className="frame-label mb-3">{t("app.proposals.proposalData") as string}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="frame-input w-full" value={proposal.projectTitle} onChange={(event) => updateProposal("projectTitle", event.target.value)} placeholder={t("app.proposals.proposalTitlePlaceholder") as string} />
                <input className="frame-input w-full" value={proposal.clientName} onChange={(event) => updateProposal("clientName", event.target.value)} placeholder={t("app.proposals.clientNamePlaceholder") as string} />
                <input className="frame-input w-full" value={proposal.company} onChange={(event) => updateProposal("company", event.target.value)} placeholder={t("app.proposals.companyPlaceholder") as string} />
                <input className="frame-input w-full" value={proposal.email} onChange={(event) => updateProposal("email", event.target.value)} placeholder={t("app.common.email") as string} />
                <input className="frame-input w-full" value={proposal.phone} onChange={(event) => updateProposal("phone", event.target.value)} placeholder={t("app.common.whatsapp") as string} />
                <input className="frame-input w-full" value={proposal.city} onChange={(event) => updateProposal("city", event.target.value)} placeholder={t("app.common.city") as string} />
                <input className="frame-input w-full" type="date" value={proposal.deadline} onChange={(event) => updateProposal("deadline", event.target.value)} />
                <input className="frame-input w-full" type="number" value={proposal.validityDays} onChange={(event) => updateProposal("validityDays", Number(event.target.value))} placeholder={t("app.proposals.validityDaysPlaceholder") as string} />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                <input className="frame-input w-full" value={proposal.paymentTerms} onChange={(event) => updateProposal("paymentTerms", event.target.value)} placeholder={t("app.proposals.paymentTermsPlaceholder") as string} />
                <input className="frame-input w-full" type="number" min={0} max={70} value={proposal.discount} onChange={(event) => updateProposal("discount", Number(event.target.value))} placeholder={t("app.proposals.discountPlaceholder") as string} />
              </div>
              <textarea className="frame-input w-full min-h-[108px] resize-y mt-4" value={proposal.notes} onChange={(event) => updateProposal("notes", event.target.value)} placeholder={t("app.proposals.notesPlaceholder") as string} />
            </div>

            <div className="proposal-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="frame-label">{t("app.proposals.proposalItems") as string}</p>
                <span className="text-xs text-frame-gray-light">{selected.length} {t("app.proposals.items") as string}</span>
              </div>
              {selected.length === 0 ? (
                <div className="proposal-empty p-10 text-center text-sm text-frame-gray-light">
                  {t("app.proposals.emptySelection") as string}
                </div>
              ) : (
                <div className="space-y-3">
                  {selected.map((line) => (
                    <div key={line.id} className="proposal-line grid grid-cols-1 lg:grid-cols-[1fr_90px_140px_120px_auto] gap-3 items-center p-4">
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

            <div className="proposal-actions grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button type="button" onClick={saveProposal} className="frame-btn-ghost flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {t("app.common.save") as string}
              </button>
              <button type="button" onClick={copySummary} className="frame-btn-ghost flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" />
                {t("app.common.copy") as string}
              </button>
              <button type="button" onClick={() => exportPdf()} className="frame-btn-primary flex items-center justify-center gap-2 col-span-2">
                <Download className="w-4 h-4" />
                {t("app.common.exportPdf") as string}
              </button>
            </div>

            <div className="proposal-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="frame-label">{t("app.common.history") as string}</p>
                <span className="text-xs text-frame-gray-light">{history.length}</span>
              </div>
              {history.length === 0 ? (
                <div className="proposal-empty p-4 text-sm text-frame-gray-light">
                  {t("app.proposals.noSavedProposals") as string}
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div key={item.id} className="proposal-line flex items-center gap-3 p-3">
                      <BriefcaseBusiness className="w-4 h-4 text-frame-orange shrink-0" />
                      <button type="button" onClick={() => exportPdf(item.html, false)} className="flex-1 text-left min-w-0">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className="text-[0.62rem] text-frame-gray-light truncate">{item.clientName} · {formatCurrency(item.total)} · {new Date(item.createdAt).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}</div>
                      </button>
                      <button type="button" onClick={() => exportPdf(item.html, false)} className="text-frame-orange hover:text-frame-white" title={t("app.common.export") as string}>
                        <Download className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => persistHistory(history.filter((saved) => saved.id !== item.id))} className="text-frame-gray-light hover:text-red-400" title={t("app.common.delete") as string}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="proposal-preview overflow-hidden min-h-[720px] 2xl:sticky 2xl:top-24">
            <div className="h-14 border-b border-frame-gray-3 px-5 flex items-center justify-between">
              <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-orange">{t("app.proposals.preview") as string}</span>
              <span className="text-[0.62rem] text-frame-gray-light">{formatCurrency(total)}</span>
            </div>
            {selected.length ? (
              <iframe title={t("app.proposals.proposalPreview") as string} srcDoc={proposalHtml} className="w-full h-[680px] bg-[#0d0d0d]" />
            ) : (
              <div className="proposal-preview-empty h-[680px] flex items-center justify-center p-8 text-center text-frame-gray-light">
                <div className="proposal-paper-ghost">
                  <div className="proposal-paper-top" />
                  <FileSignature className="w-12 h-12 mx-auto my-8 text-frame-orange" />
                  <div className="space-y-3">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="text-sm mt-8">{t("app.proposals.addServicesPreview") as string}</p>
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
