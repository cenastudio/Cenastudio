import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { useClientIdFromQuery } from "@/hooks/useClientIdFromQuery";
import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { api, type ProposalItem } from "@/lib/api";
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
import { proposalMoneyToCents, renderProposalDocument } from "@shared/proposalDocument";

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
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  template?: 'modern' | 'corporate' | 'creative';
}

const CATALOG_KEY = "frame.proposal.catalog.v1";
const HISTORY_KEY = "frame.proposal.history.v1";

const DEFAULT_CATALOG_KEYS: Array<{ id: string; nameKey: string; descKey: string; price: number; categoryKey: string }> = [
  {
    id: "institucional",
    nameKey: "app.proposals.catalogInstitucionalName",
    descKey: "app.proposals.catalogInstitucionalDesc",
    price: 4500,
    categoryKey: "app.proposals.categoryProducao",
  },
  {
    id: "reels-pack",
    nameKey: "app.proposals.catalogReelsName",
    descKey: "app.proposals.catalogReelsDesc",
    price: 2800,
    categoryKey: "app.proposals.categorySocial",
  },
  {
    id: "evento",
    nameKey: "app.proposals.catalogEventoName",
    descKey: "app.proposals.catalogEventoDesc",
    price: 6500,
    categoryKey: "app.proposals.categoryEvento",
  },
  {
    id: "fotografia",
    nameKey: "app.proposals.catalogFotoName",
    descKey: "app.proposals.catalogFotoDesc",
    price: 1800,
    categoryKey: "app.proposals.categoryExtra",
  },
  {
    id: "motion",
    nameKey: "app.proposals.catalogMotionName",
    descKey: "app.proposals.catalogMotionDesc",
    price: 2200,
    categoryKey: "app.proposals.categoryPosProducao",
  },
  {
    id: "drone",
    nameKey: "app.proposals.catalogDroneName",
    descKey: "app.proposals.catalogDroneDesc",
    price: 1500,
    categoryKey: "app.proposals.categoryExtra",
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

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeProposalFilename(value: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "proposta-comercial";
}

async function downloadProposalPdf(docHtml: string, title: string, preparationError: string) {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const html2canvas = html2canvasModule.default;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  try {
    const frameDocument = iframe.contentDocument;
    if (!frameDocument) throw new Error(preparationError);
    frameDocument.open();
    frameDocument.write(docHtml);
    frameDocument.close();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const page = frameDocument?.querySelector<HTMLElement>(".page");
    if (!page) throw new Error(preparationError);
    await frameDocument?.fonts?.ready;

    const canvas = await html2canvas(page, {
      backgroundColor: "rgb(5, 5, 5)",
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageHeightPx = Math.floor(canvas.width * (pageHeightMm / pageWidthMm));
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const context = slice.getContext("2d");
      if (!context) throw new Error(preparationError);
      context.fillStyle = "rgb(5, 5, 5)";
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (pageIndex > 0) pdf.addPage();
      const heightMm = (sliceHeight / canvas.width) * pageWidthMm;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidthMm, heightMm);
      sourceY += sliceHeight;
      pageIndex += 1;
    }

    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeProposalFilename(title)}.pdf`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : preparationError);
  } finally {
    iframe.remove();
  }
}

function buildUnifiedProposalHtml(form: ProposalForm, lines: ProposalLine[], studio: StudioSettings, locale: "pt" | "en") {
  const subtotal = lines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.round((subtotal * form.discount) / 100);
  const total = subtotal - discount;
  return renderProposalDocument({
    locale,
    currency: "BRL",
    title: form.projectTitle || (locale === "en" ? "Audiovisual proposal" : "Proposta audiovisual"),
    studio: {
      name: studio.studioName,
      legalName: studio.legalName,
      email: studio.email,
      signature: studio.signature,
      city: studio.city,
      primaryColor: studio.primaryColor,
    },
    recipient: { name: form.clientName, company: form.company, email: form.email, phone: form.phone, city: form.city },
    lines: lines.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: proposalMoneyToCents(item.price),
      total: proposalMoneyToCents(item.price * item.quantity),
    })),
    subtotal: proposalMoneyToCents(subtotal),
    discount: proposalMoneyToCents(discount),
    total: proposalMoneyToCents(total),
    deadline: form.deadline,
    paymentTerms: form.paymentTerms,
    validityDays: form.validityDays,
    notes: form.notes,
  });
}

function ProposalsContent({ embedded }: { embedded?: boolean }) {
  const { t, locale } = useLanguage();
  const [, setLocation] = useLocation();

  const buildDefaultCatalog = (): ServiceItem[] => DEFAULT_CATALOG_KEYS.map((item) => ({
    id: item.id,
    name: t(item.nameKey) as string,
    description: t(item.descKey) as string,
    price: item.price,
    category: t(item.categoryKey) as string,
  }));

  const [catalog, setCatalog] = useState<ServiceItem[]>(() => buildDefaultCatalog());
  const [proposal, setProposal] = useState<ProposalForm>(initialProposal);
  const [selected, setSelected] = useState<ProposalLine[]>([]);
  const [history, setHistory] = useState<SavedProposal[]>([]);
  const [connectedProposals, setConnectedProposals] = useState<ProposalItem[]>([]);
  const [studio, setStudio] = useState<StudioSettings>(() => readStudioSettings());
  const [clients, setClients] = useState<Array<{ id: number; name: string; company?: string | null; email?: string | null; phone?: string | null }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [editingService, setEditingService] = useState<ServiceItem>({
    id: "",
    name: "",
    description: "",
    price: 0,
    category: t("app.proposals.categoryCustom") as string,
  });

  const clientIdParam = useClientIdFromQuery();

  // When clientIdParam changes and clients are already loaded, auto-select matching client
  useEffect(() => {
    if (clientIdParam === null) return;
    if (clients.length === 0) return;
    const client = clients.find((c) => c.id === clientIdParam);
    if (client) {
      setSelectedClientId(String(client.id));
    }
  }, [clientIdParam, clients]);

  useEffect(() => {
    setCatalog(readJson(CATALOG_KEY, buildDefaultCatalog()));
    setHistory(readJson(HISTORY_KEY, []));
    setStudio(readStudioSettings());
    api.studioSettings
      .get()
      .then((data) => {
        setStudio(data);
        saveStudioSettings(data);
      })
      .catch(() => null);
    api.proposals.list().then(setConnectedProposals).catch(() => setConnectedProposals([]));
    // Fetch real clients
    fetch("/api/clients", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.success) setClients(Array.isArray(data.data) ? data.data : []); })
      .catch(() => setClients([]));
  }, []);

  // When client is selected, auto-fill proposal fields
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => String(c.id) === selectedClientId);
    if (client) {
      setProposal((current) => ({
        ...current,
        clientName: client.name,
        company: client.company || current.company,
        email: client.email || current.email,
        phone: client.phone || current.phone,
      }));
    }
  }, [selectedClientId, clients]);

  const hasClients = clients.length > 0;
  const hasSelectedClient = Boolean(selectedClientId);

  const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = Math.round((subtotal * proposal.discount) / 100);
  const total = subtotal - discountValue;
  const proposalHtml = useMemo(() => buildUnifiedProposalHtml(proposal, selected, studio, locale), [proposal, selected, studio, locale]);
  const projectBackedProposals = connectedProposals.filter((item) => item.source_budget_id);

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
    setEditingService({ id: "", name: "", description: "", price: 0, category: t("app.proposals.categoryCustom") as string });
    toast.success(t("app.proposals.serviceSaved") as string);
  };

  const removeService = (id: string) => {
    persistCatalog(catalog.filter((item) => item.id !== id));
    setSelected((current) => current.filter((item) => item.id !== id));
  };

  const exportPdf = async (html = proposalHtml, requireSelection = true, title = proposal.projectTitle) => {
    if (requireSelection && !selected.length) {
      toast.error(t("app.errors.selectAtLeastOneService") as string);
      return;
    }
    await downloadProposalPdf(html, title || (t("app.proposals.audiovisualProposal") as string), t("app.errors.couldNotPreparePdf") as string);
  };

  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [sentProposalUrl, setSentProposalUrl] = useState<string | null>(null);

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

  const sendProposalForAcceptance = async () => {
    if (!selected.length) {
      toast.error(t("app.errors.selectAtLeastOneService") as string);
      return;
    }
    if (!selectedClientId) {
      toast.error(t("app.proposals.chooseClient") as string);
      return;
    }
    setIsSendingProposal(true);
    try {
      const created = await api.proposals.create({
        clientId: Number(selectedClientId),
        title: proposal.projectTitle || (t("app.proposals.audiovisualProposal") as string),
        html: proposalHtml,
        total: proposalMoneyToCents(total),
      });
      setSentProposalUrl(created.proposal_url);
      toast.success(t("app.proposals.sentForAcceptance") as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (t("app.errors.couldNotPreparePdf") as string));
    } finally {
      setIsSendingProposal(false);
    }
  };

  const copySummary = async () => {
    const summary = `${proposal.projectTitle}\n${t("app.proposals.clientLabel")}: ${proposal.clientName || proposal.company || t("app.proposals.toDefine")}\n${t("app.proposals.total")}: ${formatCurrency(total)}\n${t("app.proposals.services")}:\n${selected.map((item) => `- ${item.quantity}x ${item.name}: ${formatCurrency(item.price * item.quantity)}`).join("\n")}`;
    await navigator.clipboard.writeText(summary);
    toast.success(t("app.common.copied") as string);
  };

  return (
    <div className={`proposal-machine ${embedded ? "" : "min-h-screen"} bg-frame-black text-frame-white font-frame-body`}>
      {!embedded && <AppNavBar />}
      <main id="main-content" className="px-4 sm:px-8 py-8 space-y-6">

        {/* Client gate: require client selection first */}
        {!hasClients ? (
          <section className="max-w-2xl mx-auto py-16 space-y-6 text-center">
            <EmptyState
              icon={FileSignature}
              title={t("app.proposals.startWithClient") as string}
              description={t("app.proposals.startWithClientDesc") as string}
              action={{
                label: t("app.proposals.registerFirstClient") as string,
                icon: Plus,
                onClick: () => setLocation("/clients/new"),
              }}
            />
          </section>
        ) : !hasSelectedClient ? (
          <section className="max-w-3xl mx-auto py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.16em] text-adaptive-primary">
                {t("app.proposals.builderEyebrow") as string}
              </p>
              <h2 className="text-3xl font-bold text-frame-white tracking-tight">
                {t("app.proposals.newProposal") as string}
              </h2>
              <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                {t("app.proposals.builderDesc") as string}
              </p>
            </div>

            {/* Steps indicator */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">
                  {t("app.proposals.step1") as string}
                </p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.proposals.step1Desc") as string}
                </p>
              </div>
              <div className="border border-frame-gray-3/30 p-5 opacity-40">
                <span className="font-frame-mono text-[0.6rem] text-frame-gray-light tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-gray-light">
                  {t("app.proposals.step2") as string}
                </p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.proposals.step2Desc") as string}
                </p>
              </div>
              <div className="border border-frame-gray-3/30 p-5 opacity-40">
                <span className="font-frame-mono text-[0.6rem] text-frame-gray-light tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-gray-light">
                  {t("app.proposals.step3") as string}
                </p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  {t("app.proposals.step3Desc") as string}
                </p>
              </div>
            </div>

            {/* Client selector card */}
            <div className="border border-frame-orange/25 bg-gradient-to-b from-frame-orange/[0.06] to-transparent p-7 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 shrink-0 border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                  <BriefcaseBusiness className="w-5 h-5 text-frame-orange" />
                </div>
                <div>
                  <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-adaptive-primary mb-1">
                    {t("app.proposals.stepLabel") as string} 1
                  </p>
                  <p className="text-base font-semibold text-frame-white">
                    {t("app.proposals.whoIsFor") as string}
                  </p>
                  <p className="text-xs text-frame-gray-light mt-1 leading-relaxed">
                    {t("app.proposals.selectClientHint") as string}
                  </p>
                </div>
              </div>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="frame-input w-full !py-3 text-sm"
              >
                <option value="">{t("app.proposals.chooseClient") as string}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` · ${c.company}` : ""}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between">
                <p className="text-[0.65rem] text-frame-gray-light">
                  {clients.length} {t("app.proposals.clientsRegistered") as string}
                </p>
                <button type="button" onClick={() => setLocation("/clients/new")} className="inline-flex items-center min-h-11 px-3 py-2 text-[0.65rem] font-frame-mono text-frame-orange hover:text-frame-white transition tracking-wider">
                  {t("app.proposals.newClient") as string}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
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
                <p className="text-[0.64rem] font-frame-mono uppercase text-adaptive-primary">{t("app.common.total") as string}</p>
                <p className="text-sm font-bold">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
        </section>

        {projectBackedProposals.length > 0 && (
          <section className="border border-frame-orange/35 bg-frame-orange/[0.04] p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="frame-label">{locale === "en" ? "Connected commercial work" : "Comercial conectado"}</p>
                <p className="mt-1 text-sm text-frame-gray-light">
                  {locale === "en"
                    ? "Project budgets and AI proposals already turned into internal commercial drafts."
                    : "Orçamentos de projeto e propostas de IA já transformados em rascunhos internos."}
                </p>
              </div>
              <span className="font-frame-mono text-[0.58rem] text-frame-orange">{projectBackedProposals.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
              {projectBackedProposals.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLocation(`/clients/${item.client_id}?tab=propostas`)}
                  className="flex min-h-11 items-center gap-3 border border-frame-gray-3/70 bg-frame-black/30 px-3 py-3 text-left transition hover:border-frame-orange/60"
                >
                  <FileSignature className="h-4 w-4 shrink-0 text-frame-orange" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-frame-white">{item.project_name || item.title}</span>
                    <span className="mt-1 block text-[0.6rem] text-frame-gray-light">
                      {item.source_generation_id
                        ? locale === "en" ? "AI + budget" : "IA + orçamento"
                        : locale === "en" ? "Project budget" : "Orçamento do projeto"}
                    </span>
                  </span>
                  <span className="font-frame-mono text-[0.58rem] text-frame-orange">v{item.commercial_snapshot?.revision ?? 1}</span>
                </button>
              ))}
            </div>
          </section>
        )}

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
              <p className="frame-label mb-2">{t("app.proposals.savedServices") as string}</p>
              <p className="text-[0.65rem] text-frame-gray-light mb-4 leading-relaxed">
                {t("app.proposals.catalogDesc") as string}
              </p>
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
              <button type="button" onClick={() => exportPdf()} className="frame-btn-ghost flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                {t("app.common.exportPdf") as string}
              </button>
              <button type="button" onClick={sendProposalForAcceptance} disabled={isSendingProposal} className="frame-btn-primary flex items-center justify-center gap-2">
                <FileSignature className="w-4 h-4" />
                {isSendingProposal ? (locale === "en" ? "Sending..." : "Enviando...") : (t("app.proposals.sendForAcceptance") as string)}
              </button>
            </div>

            {sentProposalUrl && (
              <div className="proposal-panel p-5 space-y-3 border-frame-orange/40">
                <p className="frame-label">{t("app.proposals.acceptanceLinkReady") as string}</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={sentProposalUrl} className="frame-input w-full text-xs" onFocus={(e) => e.target.select()} />
                  <button
                    type="button"
                    onClick={async () => { await navigator.clipboard.writeText(sentProposalUrl); toast.success(t("app.common.copied") as string); }}
                    className="frame-btn-ghost !py-2.5 !px-3 shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[0.68rem] text-frame-gray-light leading-relaxed">
                  {t("app.proposals.acceptanceLinkHint") as string}
                </p>
              </div>
            )}

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
              <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-adaptive-primary">{t("app.proposals.preview") as string}</span>
              <span className="text-[0.62rem] text-frame-gray-light">{formatCurrency(total)}</span>
            </div>
            {selected.length ? (
              <iframe title={t("app.proposals.proposalPreview") as string} srcDoc={proposalHtml} className="w-full h-[680px] bg-[var(--ds-surface-tooltip)]" />
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
          </>
        )}
      </main>
    </div>
  );
}

export default function Proposals({ embedded }: { embedded?: boolean }) {
  if (embedded) {
    return (
      <FeatureUpgradeRequired feature="proposals" variant="full">
        <ProposalsContent embedded />
      </FeatureUpgradeRequired>
    );
  }
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="proposals" variant="full">
        <ProposalsContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
