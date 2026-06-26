import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FolderKanban,
  Zap,
  Calendar,
  Activity,
  RefreshCw,
  Download,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface OverallAnalytics {
  projects: { total: number; active: number };
  clients: { total: number; totalValue: number };
  pipeline: { totalOpportunities: number; pipelineValue: number; wonThisMonth: number };
  ai: { totalGenerations: number };
  team: { totalCollaborators: number };
}

interface RevenueAnalytics {
  revenueByMonth: Array<{ month: string; revenue: number; count: number }>;
  revenueBySegment: Array<{ segment: string; revenue: number; count: number }>;
  avgDealSize: number;
  winRate: number;
}

interface ActivityAnalytics {
  recentProjects: number;
  recentGenerations: number;
  recentInteractions: number;
  recentFiles: number;
  activityByDay: Array<{ day: string; count: number }>;
}

function AnalyticsContent() {
  const [, setLocation] = useLocation();
  const [overall, setOverall] = useState<OverallAnalytics | null>(null);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [activity, setActivity] = useState<ActivityAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setRefreshing(true);

      const [overallRes, revenueRes, activityRes] = await Promise.all([
        fetch("/api/analytics-overall", { credentials: "include" }),
        fetch("/api/analytics-revenue", { credentials: "include" }),
        fetch("/api/analytics-activity", { credentials: "include" }),
      ]);

      const overallData = await overallRes.json();
      const revenueData = await revenueRes.json();
      const activityData = await activityRes.json();

      if (overallData.success) setOverall(overallData.data);
      if (revenueData.success) setRevenue(revenueData.data);
      if (activityData.success) setActivity(activityData.data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Erro ao carregar analytics");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  const formatPercent = (value: number) => {
    return value.toFixed(1) + "%";
  };

  const exportPipeline = (format: "csv" | "json") => {
    window.open(`/api/export-pipeline?format=${format}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <p className="frame-label mb-2">// DASHBOARD</p>
            <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)]">
              ANALYTICS
            </h1>
            <p className="text-frame-gray-light text-sm mt-2">
              Métricas e relatórios do seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 w-full xl:w-auto">
            <button onClick={() => setLocation("/pipeline")} className="frame-btn-ghost flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pipeline
            </button>
            <button onClick={() => setLocation("/dashboard")} className="frame-btn-ghost flex items-center justify-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Projetos
            </button>
            <button onClick={() => setLocation("/files")} className="frame-btn-ghost flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Arquivos
            </button>
            <button onClick={() => exportPipeline("csv")} className="frame-btn-ghost flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={loadAnalytics}
              disabled={refreshing}
              className="frame-btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange" />
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            {overall && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FolderKanban className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Projetos
                      </p>
                      <p className="text-2xl font-bold">{overall.projects.total}</p>
                      <p className="text-xs text-frame-gray-light">
                        {overall.projects.active} ativos
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Clientes
                      </p>
                      <p className="text-2xl font-bold">{overall.clients.total}</p>
                      <p className="text-xs text-frame-orange">
                        {formatCurrency(overall.clients.totalValue)}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Pipeline
                      </p>
                      <p className="text-2xl font-bold">
                        {overall.pipeline.totalOpportunities}
                      </p>
                      <p className="text-xs text-frame-orange">
                        {formatCurrency(overall.pipeline.pipelineValue)}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Zap className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        AI Gerações
                      </p>
                      <p className="text-2xl font-bold">
                        {overall.ai.totalGenerations}
                      </p>
                      <p className="text-xs text-frame-gray-light">Total</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Users className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Equipe
                      </p>
                      <p className="text-2xl font-bold">
                        {overall.team.totalCollaborators}
                      </p>
                      <p className="text-xs text-frame-gray-light">Colaboradores</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {overall && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ActionCard
                  title="Pipeline comercial"
                  description={`${overall.pipeline.totalOpportunities} oportunidades abertas para revisar.`}
                  action="Abrir funil"
                  onClick={() => setLocation("/pipeline")}
                />
                <ActionCard
                  title="Projetos ativos"
                  description={`${overall.projects.active} projetos ativos pedindo acompanhamento.`}
                  action="Ver painel"
                  onClick={() => setLocation("/dashboard")}
                />
                <ActionCard
                  title="Exportar relatório"
                  description="Baixe os dados do funil para conferência, backup ou reunião."
                  action="Exportar JSON"
                  onClick={() => exportPipeline("json")}
                />
              </div>
            )}

            {/* Revenue Analytics */}
            {revenue && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/10 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-frame-orange" />
                    <h3 className="font-frame-mono text-sm uppercase tracking-wider">
                      Receita Mensal
                    </h3>
                  </div>

                  {revenue.revenueByMonth.length > 0 ? (
                    <div className="space-y-3">
                      {revenue.revenueByMonth.map((item) => (
                        <div key={item.month} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-frame-gray-light">{item.month}</span>
                            <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                          </div>
                          <div className="w-full bg-frame-gray-3 rounded-full h-2">
                            <div
                              className="bg-frame-orange h-2 rounded-full"
                              style={{
                                width: `${(item.revenue / Math.max(...revenue.revenueByMonth.map((r) => r.revenue))) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-frame-gray-light">
                            {item.count} negócios fechados
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-frame-gray-light text-sm">Sem dados de receita</p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/10 p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-frame-orange" />
                    <h3 className="font-frame-mono text-sm uppercase tracking-wider">
                      Métricas de Vendas
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-frame-gray-2 p-4">
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider mb-1">
                        Ticket Médio
                      </p>
                      <p className="text-xl font-bold">{formatCurrency(revenue.avgDealSize)}</p>
                    </div>
                    <div className="bg-frame-gray-2 p-4">
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider mb-1">
                        Taxa de Conversão
                      </p>
                      <p className="text-xl font-bold">{formatPercent(revenue.winRate)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider mb-2">
                      Receita por Segmento
                    </p>
                    {revenue.revenueBySegment.length > 0 ? (
                      <div className="space-y-3">
                        {(() => {
                          const maxRevenue = Math.max(...revenue.revenueBySegment.map((r) => r.revenue));
                          const segmentColors = ["bg-blue-400", "bg-purple-400", "bg-green-400", "bg-yellow-400", "bg-pink-400", "bg-cyan-400"];
                          return revenue.revenueBySegment.map((item, idx) => (
                            <div key={item.segment}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-frame-gray-light">{item.segment || "Sem segmento"}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-frame-gray-light">{item.count} negócios</span>
                                  <span className="font-semibold min-w-[80px] text-right">{formatCurrency(item.revenue)}</span>
                                </div>
                              </div>
                              <div className="w-full bg-frame-gray-3 rounded-full h-2.5">
                                <div
                                  className={`${segmentColors[idx % segmentColors.length]} h-2.5 rounded-full transition-all`}
                                  style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                                />
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <p className="text-frame-gray-light text-sm">Sem dados por segmento</p>
                    )}
                  </div>
                </motion.div>
              </div>
            )}

            {/* Activity Analytics */}
            {activity && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-frame-gray-3 bg-frame-gray-1/10 p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-frame-orange" />
                  <h3 className="font-frame-mono text-sm uppercase tracking-wider">
                    Atividade Recente (30 dias)
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-frame-gray-2 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FolderKanban className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Projetos
                      </p>
                    </div>
                    <p className="text-2xl font-bold">{activity.recentProjects}</p>
                  </div>

                  <div className="bg-frame-gray-2 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Gerações AI
                      </p>
                    </div>
                    <p className="text-2xl font-bold">{activity.recentGenerations}</p>
                  </div>

                  <div className="bg-frame-gray-2 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Interações
                      </p>
                    </div>
                    <p className="text-2xl font-bold">{activity.recentInteractions}</p>
                  </div>

                  <div className="bg-frame-gray-2 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-purple-400" />
                      <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider">
                        Arquivos
                      </p>
                    </div>
                    <p className="text-2xl font-bold">{activity.recentFiles}</p>
                  </div>
                </div>

                {activity.activityByDay.length > 0 && (
                  <div>
                    <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider mb-2">
                      Atividade Diária (últimos 10 dias)
                    </p>
                    <div className="space-y-1.5">
                      {(() => {
                        const maxCount = Math.max(...activity.activityByDay.slice(0, 10).map((a) => a.count));
                        return activity.activityByDay.slice(0, 10).map((item) => (
                          <div key={item.day} className="flex items-center gap-3">
                            <span className="text-xs text-frame-gray-light w-24 shrink-0 text-right">{item.day}</span>
                            <div className="flex-1 bg-frame-gray-3 rounded-full h-3">
                              <div
                                className="bg-frame-orange h-3 rounded-full transition-all"
                                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold w-12 text-right">{item.count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ActionCard({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 text-left hover:border-frame-orange/50 hover:bg-frame-orange/[0.03] transition group"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-frame-mono text-xs uppercase tracking-[0.14em] text-frame-orange mb-2">{title}</p>
          <p className="text-sm text-frame-gray-light leading-relaxed">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition shrink-0" />
      </div>
      <p className="mt-4 text-xs font-frame-mono uppercase tracking-[0.12em] text-frame-white">{action}</p>
    </button>
  );
}

export default function Analytics() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
