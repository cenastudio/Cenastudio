import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import CommercialNav from "@/components/CommercialNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, BriefcaseBusiness, Building2, Calendar, DollarSign, FileText, Film, FolderOpen,
  Mail, MessageSquare, Phone, User, Loader2, Video,
} from "lucide-react";
import { toast } from "sonner";

interface ClientData {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  segment: string;
  status: string;
  workflow_stage?: string;
  notes?: string;
  total_spent: number;
  city?: string;
  state?: string;
  industry?: string;
  contact_person?: string;
  contact_role?: string;
  created_at: string;
}

interface ProjectItem {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

interface InteractionItem {
  id: number;
  type: string;
  subject: string;
  notes?: string;
  created_at: string;
}

interface FileItem {
  id: number;
  original_name: string;
  mime_type?: string;
  created_at: string;
  project_id?: number;
  project_name?: string;
}

interface FinancialItem {
  id: number;
  kind: string;
  description: string;
  amount: number;
  status: string;
  due_date?: string;
  category?: string;
}

interface OpportunityItem {
  id: number;
  title: string;
  stage: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  lost_reason: string | null;
}

interface VideoReviewItem {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  status: string;
  created_at: string;
}

interface SavedProposal {
  id: string;
  title: string;
  clientName: string;
  total: number;
  createdAt: string;
  status?: "draft" | "sent" | "viewed" | "accepted" | "rejected";
}

function ClientDetailContent() {
  const { t, locale } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");

  const [client, setClient] = useState<ClientData | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [interactions, setInteractions] = useState<InteractionItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [financial, setFinancial] = useState<FinancialItem[]>([]);
  const [videoReviews, setVideoReviews] = useState<VideoReviewItem[]>([]);
  const [proposals, setProposals] = useState<SavedProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const financialSummary = useMemo(() => {
    const totalIncome = financial
      .filter(e => e.kind === "income" && e.status === "settled")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = financial
      .filter(e => e.kind === "expense" && e.status === "settled")
      .reduce((sum, e) => sum + e.amount, 0);
    return { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses };
  }, [financial]);

  useEffect(() => {
    if (!clientId) return;
    loadAll();
  }, [clientId]);

  // Load saved proposals from localStorage, filtered by client name (non-blocking)
  useEffect(() => {
    if (!client) return;
    try {
      const raw = localStorage.getItem("frame.proposal.history.v1");
      const all: SavedProposal[] = raw ? JSON.parse(raw) : [];
      const clientProposals = all.filter(
        (p) => p.clientName && p.clientName.toLowerCase() === client.name.toLowerCase()
      );
      setProposals(clientProposals);
    } catch {
      setProposals([]);
    }
  }, [client]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { credentials: "include" });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.error("Client fetch failed:", res.status, errorText);
        throw new Error("Client not found");
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");

      const { data } = json;
      setClient(data.client);
      setProjects(data.projects ?? []);
      setOpportunities(data.opportunities ?? []);
      setInteractions(data.interactions ?? []);
      setFinancial(data.financial ?? []);
      setFiles(data.files ?? []);
      setVideoReviews(data.videoReviews ?? []);
    } catch (err) {
      console.error("ClientDetail load error:", err);
      toast.error(t("app.clientDetail.loadError") || "Erro ao carregar dados do cliente");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR");
  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
        <CommercialNav />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
        <CommercialNav />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-frame-gray-light">Cliente não encontrado</p>
          <button onClick={() => setLocation("/clients")} className="frame-btn-ghost">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      <CommercialNav />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 space-y-8">

        {/* Back Button */}
        <button onClick={() => setLocation("/clients")} className="flex items-center gap-2 text-frame-gray-light hover:text-frame-orange transition text-sm group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span className="font-frame-mono text-[0.65rem] uppercase tracking-wider">Voltar para Clientes</span>
        </button>

        {/* Hero Header */}
        <div className="glow-card p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Client Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 border-2 border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-frame-orange" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-frame-white mb-1">{client.name}</h1>
                  {client.company && <p className="text-base text-frame-gray-light">{client.company}</p>}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {client.workflow_stage && (
                  <span className="font-frame-mono text-[0.6rem] uppercase tracking-wider px-3 py-1.5 border border-frame-orange/40 text-frame-orange bg-frame-orange/[0.08]">
                    {client.workflow_stage}
                  </span>
                )}
                {client.industry && (
                  <span className="font-frame-mono text-[0.6rem] uppercase tracking-wider px-3 py-1.5 border border-frame-gray-3 text-frame-gray-light">
                    {client.industry}
                  </span>
                )}
                {client.segment && (
                  <span className="font-frame-mono text-[0.6rem] uppercase tracking-wider px-3 py-1.5 border border-frame-gray-3 text-frame-gray-light">
                    {client.segment}
                  </span>
                )}
              </div>

              {/* Contact Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {client.contact_person && (
                  <div className="flex items-center gap-2 text-sm text-frame-gray-light">
                    <User className="w-4 h-4 text-frame-orange shrink-0" />
                    <span>{client.contact_person}{client.contact_role ? ` · ${client.contact_role}` : ""}</span>
                  </div>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-frame-gray-light hover:text-frame-orange transition">
                    <Mail className="w-4 h-4 text-frame-orange shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-frame-gray-light hover:text-frame-orange transition">
                    <Phone className="w-4 h-4 text-frame-orange shrink-0" />
                    <span>{client.phone}</span>
                  </a>
                )}
                {client.city && (
                  <div className="flex items-center gap-2 text-sm text-frame-gray-light">
                    <Building2 className="w-4 h-4 text-frame-orange shrink-0" />
                    <span>{client.city}{client.state ? `, ${client.state}` : ""}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Value Card */}
            <div className="lg:w-64 shrink-0 border-2 border-frame-orange/30 bg-gradient-to-br from-frame-orange/[0.12] to-transparent p-6 text-center">
              <span className="block font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange mb-3">Valor Total Acumulado</span>
              <span className="block text-4xl font-bold text-frame-white">{formatCurrency(client.total_spent)}</span>
              <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-frame-orange/20">
                <div>
                  <span className="block text-xl font-bold text-green-400">{projects.length}</span>
                  <span className="block font-frame-mono text-[0.55rem] uppercase text-frame-gray-light mt-1">Projetos</span>
                </div>
                <div>
                  <span className="block text-xl font-bold text-blue-400">{opportunities.length}</span>
                  <span className="block font-frame-mono text-[0.55rem] uppercase text-frame-gray-light mt-1">Oportunidades</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button onClick={() => setLocation(`/dashboard?newProject=1&clientId=${clientId}`)} className="frame-btn-primary flex flex-col items-center gap-2 py-4 text-center">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-semibold">Novo Projeto</span>
            </button>
            <button onClick={() => setLocation(`/proposals?clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-4 text-center">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-semibold">Gerar Proposta</span>
            </button>
            <button onClick={() => setLocation(`/pipeline?new=1&clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-4 text-center">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-semibold">Nova Oportunidade</span>
            </button>
            <button onClick={() => setLocation(`/interactions?new=1&clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-4 text-center">
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-semibold">Registrar Interação</span>
            </button>
            <button onClick={() => setLocation(`/analytics?newEntry=1&clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-4 text-center">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-semibold">Lançamento</span>
            </button>
          </div>

          {/* Studio AI Actions */}
          <div className="mt-3">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light mb-3">Studio AI</p>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
              <button onClick={() => setLocation(`/studio/briefing?clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-3 text-center border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/[0.08]">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Briefing</span>
              </button>
              <button onClick={() => setLocation(`/studio/proposta?clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-3 text-center border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/[0.08]">
                <BriefcaseBusiness className="w-4 h-4" />
                <span className="text-xs">Proposta</span>
              </button>
              <button onClick={() => setLocation(`/studio/roteiro?clientId=${clientId}`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-3 text-center border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/[0.08]">
                <Film className="w-4 h-4" />
                <span className="text-xs">Roteiro</span>
              </button>
              <button onClick={() => setLocation(`/clients/${clientId}/editar`)} className="frame-btn-ghost flex flex-col items-center gap-2 py-3 text-center">
                <User className="w-4 h-4" />
                <span className="text-xs">Editar Cliente</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-frame-gray-3/20 rounded-none h-auto p-1 w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="projects" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Projetos · {projects.length}
            </TabsTrigger>
            <TabsTrigger value="oportunidades" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Oportunidades · {opportunities.length}
            </TabsTrigger>
            <TabsTrigger value="interactions" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Interações · {interactions.length}
            </TabsTrigger>
            <TabsTrigger value="files" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Arquivos · {files.length}
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Financeiro · {financial.length}
            </TabsTrigger>
            <TabsTrigger value="propostas" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Propostas · {proposals.length}
            </TabsTrigger>
            <TabsTrigger value="video-reviews" className="data-[state=active]:bg-frame-orange data-[state=active]:text-frame-black text-frame-gray-light font-frame-mono text-[0.65rem] tracking-wider uppercase px-5 py-2.5 rounded-none data-[state=active]:shadow-none transition-all">
              Vídeo Reviews · {videoReviews.length}
            </TabsTrigger>
          </TabsList>

          {/* PROJETOS */}
          <TabsContent value="projects">
            {projects.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <FileText className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light mb-5">Nenhum projeto vinculado a este cliente.</p>
                <button onClick={() => setLocation("/dashboard?newProject=1&clientId=" + clientId)} className="frame-btn-primary">+ Novo projeto</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((proj) => (
                  <button key={proj.id} onClick={() => setLocation(`/project/${proj.id}`)} className="glow-card p-5 text-left hover:border-frame-orange/50 transition-all group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <FileText className="w-5 h-5 text-frame-orange shrink-0" />
                      <span className="text-frame-orange text-xs font-frame-mono opacity-0 group-hover:opacity-100 transition">Abrir →</span>
                    </div>
                    <p className="font-semibold text-frame-white group-hover:text-frame-orange transition truncate">{proj.name}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[0.6rem] font-frame-mono uppercase px-2 py-0.5 border border-frame-gray-3 text-frame-gray-light">{proj.status}</span>
                      <span className="text-xs text-frame-gray-light">{formatDate(proj.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* OPORTUNIDADES */}
          <TabsContent value="oportunidades">
            {opportunities.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <DollarSign className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light mb-5">Nenhuma oportunidade vinculada a este cliente.</p>
                <button onClick={() => setLocation(`/pipeline?new=1&clientId=${clientId}`)} className="frame-btn-primary">
                  + Nova Oportunidade
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((opp) => (
                  <button
                    key={opp.id}
                    onClick={() => setLocation(`/pipeline?opportunityId=${opp.id}`)}
                    className="glow-card p-5 text-left hover:border-frame-orange/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="font-frame-mono text-[0.6rem] uppercase tracking-wider px-2 py-1 border border-frame-orange/30 text-frame-orange bg-frame-orange/[0.06]">
                        {opp.stage}
                      </span>
                      {opp.estimated_value != null && (
                        <span className="text-lg font-bold text-frame-orange">
                          {formatCurrency(opp.estimated_value)}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-frame-white group-hover:text-frame-orange transition truncate mb-3">{opp.title}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-frame-gray-light">
                      {opp.probability > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {opp.probability}% prob.
                        </span>
                      )}
                      {opp.expected_close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(opp.expected_close_date)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* INTERAÇÕES */}
          <TabsContent value="interactions">
            {interactions.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <MessageSquare className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light mb-5">Nenhuma interação registrada com este cliente.</p>
                <button onClick={() => setLocation(`/interactions?new=1&clientId=${clientId}`)} className="frame-btn-primary">+ Registrar interação</button>
              </div>
            ) : (
              <div className="space-y-3">
                {interactions.map((int) => (
                  <div key={int.id} className="glow-card p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-4 h-4 text-frame-orange shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="font-semibold text-sm text-frame-white">{int.subject || int.type}</span>
                          <span className="text-[0.6rem] text-frame-gray-light shrink-0">{formatDate(int.created_at)}</span>
                        </div>
                        {int.notes && <p className="text-xs text-frame-gray-light mt-2 line-clamp-2 leading-relaxed">{int.notes}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ARQUIVOS */}
          <TabsContent value="files">
            {files.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <FolderOpen className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light">Nenhum arquivo nos projetos deste cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {files.map((file) => (
                  <div key={file.id} className="glow-card p-4 flex items-start gap-3 group hover:border-frame-orange/50 transition-all">
                    <FolderOpen className="w-5 h-5 text-frame-orange shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-frame-white truncate group-hover:text-frame-orange transition">{file.original_name}</p>
                      <p className="text-[0.6rem] text-frame-gray-light mt-1.5">
                        {file.project_name && <span className="font-semibold">{file.project_name} · </span>}
                        {file.mime_type}
                      </p>
                      <p className="text-[0.6rem] text-frame-gray-light">{formatDate(file.created_at)}</p>
                      <a href={`/api/files/${file.id}/download`} className="text-frame-orange text-xs hover:underline mt-2 inline-block">
                        Download →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financial">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="glow-card p-5 text-center border-green-500/20 bg-green-500/[0.05]">
                <span className="block text-2xl font-bold text-green-400">{formatCurrency(financialSummary.totalIncome)}</span>
                <span className="block font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light mt-2">Total Receitas</span>
              </div>
              <div className="glow-card p-5 text-center border-red-500/20 bg-red-500/[0.05]">
                <span className="block text-2xl font-bold text-red-400">{formatCurrency(financialSummary.totalExpenses)}</span>
                <span className="block font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light mt-2">Total Despesas</span>
              </div>
              <div className="glow-card p-5 text-center border-frame-orange/30 bg-frame-orange/[0.08]">
                <span className={`block text-2xl font-bold ${financialSummary.netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatCurrency(financialSummary.netBalance)}
                </span>
                <span className="block font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange mt-2">Saldo Líquido</span>
              </div>
            </div>

            {/* Visual Chart */}
            {financial.length > 0 && (
              <div className="glow-card p-6 mb-6">
                <h3 className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange mb-5">Distribuição Financeira</h3>
                <div className="space-y-4">
                  {/* Income Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-green-400">Receitas</span>
                      <span className="text-xs text-frame-gray-light">
                        {financialSummary.totalIncome > 0
                          ? `${Math.round((financialSummary.totalIncome / (financialSummary.totalIncome + financialSummary.totalExpenses)) * 100)}%`
                          : "0%"
                        }
                      </span>
                    </div>
                    <div className="h-8 bg-frame-gray-3/30 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 transition-all duration-700 ease-out flex items-center justify-end px-3"
                        style={{
                          width: financialSummary.totalIncome + financialSummary.totalExpenses > 0
                            ? `${(financialSummary.totalIncome / (financialSummary.totalIncome + financialSummary.totalExpenses)) * 100}%`
                            : "0%"
                        }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow">
                          {formatCurrency(financialSummary.totalIncome)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expenses Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-red-400">Despesas</span>
                      <span className="text-xs text-frame-gray-light">
                        {financialSummary.totalExpenses > 0
                          ? `${Math.round((financialSummary.totalExpenses / (financialSummary.totalIncome + financialSummary.totalExpenses)) * 100)}%`
                          : "0%"
                        }
                      </span>
                    </div>
                    <div className="h-8 bg-frame-gray-3/30 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700 ease-out flex items-center justify-end px-3"
                        style={{
                          width: financialSummary.totalIncome + financialSummary.totalExpenses > 0
                            ? `${(financialSummary.totalExpenses / (financialSummary.totalIncome + financialSummary.totalExpenses)) * 100}%`
                            : "0%"
                        }}
                      >
                        <span className="text-xs font-bold text-white drop-shadow">
                          {formatCurrency(financialSummary.totalExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Net Balance Indicator */}
                  <div className="pt-4 border-t border-frame-gray-3/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-frame-white">Resultado</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${financialSummary.netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {financialSummary.netBalance >= 0 ? "+" : ""}{formatCurrency(financialSummary.netBalance)}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${financialSummary.netBalance >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Entries List */}
            {financial.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <DollarSign className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light mb-5">Nenhum lançamento financeiro vinculado a este cliente.</p>
                <button onClick={() => setLocation(`/analytics?newEntry=1&clientId=${clientId}`)} className="frame-btn-primary">Novo Lançamento</button>
              </div>
            ) : (
              <>
                <h3 className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange mb-4">Histórico de Lançamentos</h3>
                <div className="space-y-2">
                  {financial.map((entry) => (
                    <div key={entry.id} className="glow-card p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.kind === "income" ? "bg-green-400" : "bg-red-400"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-frame-white truncate font-medium">{entry.description}</p>
                          <p className="text-[0.6rem] text-frame-gray-light mt-0.5">
                            {entry.category && `${entry.category} · `}
                            {entry.due_date && formatDate(entry.due_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-base font-bold ${entry.kind === "income" ? "text-green-400" : "text-red-400"}`}>
                          {entry.kind === "income" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </span>
                        <span className={`text-[0.6rem] font-frame-mono uppercase px-2 py-1 border ${
                          entry.status === "settled"
                            ? "border-green-500/30 text-green-400 bg-green-400/[0.06]"
                            : "border-yellow-500/30 text-yellow-400 bg-yellow-400/[0.06]"
                        }`}>
                          {entry.status === "settled" ? "Pago" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* PROPOSTAS */}
          <TabsContent value="propostas" className="mt-5">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-frame-gray-3/40">
              <div>
                <h3 className="text-lg font-bold text-frame-white">Propostas Comerciais</h3>
                <p className="text-xs text-frame-gray-light mt-1">
                  {proposals.length === 0 ? "Nenhuma proposta criada ainda" : `${proposals.length} proposta${proposals.length > 1 ? "s" : ""} disponível${proposals.length > 1 ? "eis" : ""}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocation(`/studio/proposta?clientId=${clientId}`)}
                  className="frame-btn-ghost flex items-center gap-1.5 text-xs"
                >
                  <BriefcaseBusiness className="w-3.5 h-3.5" />
                  AI Studio
                </button>
                <button
                  onClick={() => setLocation(`/proposals?clientId=${clientId}`)}
                  className="frame-btn-primary flex items-center gap-1.5 text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Catálogo/Docs
                </button>
              </div>
            </div>

            {proposals.length === 0 ? (
              <div className="frame-empty-state p-12 text-center space-y-5">
                <div className="w-16 h-16 mx-auto border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-frame-orange" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-frame-white mb-2">Nenhuma proposta criada</p>
                  <p className="text-xs text-frame-gray-light max-w-sm mx-auto leading-relaxed">
                    Crie propostas usando IA ou monte manualmente com o catálogo de serviços
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setLocation(`/studio/proposta?clientId=${clientId}`)}
                    className="frame-btn-ghost flex items-center gap-1.5"
                  >
                    <BriefcaseBusiness className="w-4 h-4" />
                    Gerar com IA
                  </button>
                  <button
                    onClick={() => setLocation(`/proposals?clientId=${clientId}`)}
                    className="frame-btn-primary flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    Criar no Catálogo
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {proposals.map((proposal) => {
                  const isAIGenerated = proposal.template === "creative" || !proposal.template;
                  const origin = isAIGenerated ? "AI Studio" : "Catálogo";

                  return (
                    <div key={proposal.id} className="glow-card p-5 flex flex-col gap-4 hover:border-frame-orange/40 transition-colors group">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[0.55rem] font-frame-mono uppercase tracking-wider px-2 py-0.5 border ${
                              isAIGenerated
                                ? "border-purple-500/30 text-purple-400 bg-purple-400/[0.06]"
                                : "border-blue-500/30 text-blue-400 bg-blue-400/[0.06]"
                            }`}>
                              {origin}
                            </span>
                            {proposal.status && (
                              <span className={`text-[0.55rem] font-frame-mono uppercase tracking-wider px-2 py-0.5 border ${
                                proposal.status === "accepted"
                                  ? "border-green-500/30 text-green-400 bg-green-400/[0.06]"
                                  : proposal.status === "rejected"
                                  ? "border-red-500/30 text-red-400 bg-red-400/[0.06]"
                                  : proposal.status === "sent"
                                  ? "border-blue-500/30 text-blue-400 bg-blue-400/[0.06]"
                                  : proposal.status === "viewed"
                                  ? "border-yellow-500/30 text-yellow-400 bg-yellow-400/[0.06]"
                                  : "border-frame-gray-3 text-frame-gray-light"
                              }`}>
                                {proposal.status === "accepted" ? "✓ Aceita"
                                  : proposal.status === "rejected" ? "✗ Recusada"
                                  : proposal.status === "sent" ? "→ Enviada"
                                  : proposal.status === "viewed" ? "◉ Visualizada"
                                  : "◦ Rascunho"}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-frame-white truncate group-hover:text-frame-orange transition">
                            {proposal.title}
                          </h4>
                          <p className="text-[0.6rem] text-frame-gray-light mt-1">
                            Criada em {proposal.createdAt ? formatDate(proposal.createdAt) : "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-bold text-frame-orange block">
                            {formatCurrency(proposal.total)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-frame-gray-3/40">
                        <button
                          onClick={() => {
                            const iframe = document.createElement("iframe");
                            iframe.style.position = "fixed";
                            iframe.style.right = "0";
                            iframe.style.bottom = "0";
                            iframe.style.width = "0";
                            iframe.style.height = "0";
                            iframe.style.border = "0";
                            iframe.style.opacity = "0";
                            document.body.appendChild(iframe);
                            iframe.onload = () => {
                              const frameWindow = iframe.contentWindow;
                              if (frameWindow) {
                                frameWindow.focus();
                                frameWindow.print();
                                setTimeout(() => iframe.remove(), 1000);
                              }
                            };
                            iframe.srcdoc = proposal.html;
                          }}
                          className="flex-1 frame-btn-ghost flex items-center justify-center gap-1.5 text-xs"
                          title="Visualizar/Imprimir PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          onClick={() => {
                            setLocation(isAIGenerated
                              ? `/studio/proposta?clientId=${clientId}`
                              : `/proposals?clientId=${clientId}`
                            );
                          }}
                          className="flex-1 frame-btn-ghost flex items-center justify-center gap-1.5 text-xs"
                          title="Duplicar e editar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir proposta "${proposal.title}"?`)) {
                              const raw = localStorage.getItem("frame.proposal.history.v1");
                              const all: SavedProposal[] = raw ? JSON.parse(raw) : [];
                              const updated = all.filter(p => p.id !== proposal.id);
                              localStorage.setItem("frame.proposal.history.v1", JSON.stringify(updated));
                              setProposals(updated.filter(p =>
                                p.clientName && p.clientName.toLowerCase() === client.name.toLowerCase()
                              ));
                              toast.success("Proposta excluída");
                            }
                          }}
                          className="frame-btn-ghost flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:border-red-400/50"
                          title="Excluir proposta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* VÍDEO REVIEWS */}
          <TabsContent value="video-reviews">
            {videoReviews.length === 0 ? (
              <div className="frame-empty-state p-12 text-center">
                <Video className="w-12 h-12 text-frame-gray-3 mx-auto mb-4" />
                <p className="text-sm text-frame-gray-light">Nenhum vídeo review vinculado a este cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoReviews.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => setLocation(`/video-reviews/${review.project_id}`)}
                    className="glow-card p-5 text-left hover:border-frame-orange/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <Video className="w-5 h-5 text-frame-orange shrink-0" />
                      <span className={`font-frame-mono text-[0.55rem] uppercase tracking-wider px-2 py-1 border ${
                        review.status === "approved"
                          ? "border-green-500/30 text-green-400 bg-green-400/[0.06]"
                          : review.status === "rejected"
                          ? "border-red-500/30 text-red-400 bg-red-400/[0.06]"
                          : "border-frame-orange/30 text-frame-orange bg-frame-orange/[0.06]"
                      }`}>
                        {review.status}
                      </span>
                    </div>
                    <p className="font-semibold text-frame-white group-hover:text-frame-orange transition truncate mb-2">{review.title}</p>
                    <p className="text-xs text-frame-gray-light">{review.project_name}</p>
                    <p className="text-[0.6rem] text-frame-gray-light mt-1">{formatDate(review.created_at)}</p>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Notes Section */}
        {client.notes && (
          <div className="glow-card p-6">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Observações
            </p>
            <p className="text-sm text-frame-gray-light whitespace-pre-wrap leading-relaxed">{client.notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClientDetail() {
  return (
    <ProtectedRoute>
      <ClientDetailContent />
    </ProtectedRoute>
  );
}
