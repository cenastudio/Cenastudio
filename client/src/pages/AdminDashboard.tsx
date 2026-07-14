import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle, Ban, Clock, Crown, DollarSign, Gift, KeyRound, Megaphone, Plus, RotateCcw, Search,
  Settings2, ShieldCheck, Sparkles, Trash2, TrendingUp, Users, Wrench, Bot, FileCheck,
} from "lucide-react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import { TabsContent } from "@/components/ui/tabs";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ApiError, api, ToolFromApi,
  type AdminMetrics, type AdminUserDetail, type AdminActionLogEntry,
  type AdminLgpdRequest, type AdminReferralSummary, type AdminReferralEntry, type AdminAiUsage,
} from "@/lib/api";

interface ManagedUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
  github_id: string | null;
  created_at: string;
  disabled?: boolean;
  plan_name: string | null;
  generation_limit: number | null;
  project_count?: number;
  file_count?: number;
  review_count?: number;
}

type PlanId = "free" | "pro" | "studio" | "whitelabel" | "enterprise";

const PLANS: { id: PlanId; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "studio", label: "Studio" },
  { id: "whitelabel", label: "Whitelabel" },
  { id: "enterprise", label: "Enterprise" },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  role: "user" as "user" | "admin",
  planId: "pro" as PlanId,
};

/* ─── Helper: Plan badge color ─── */
function planBadgeClass(plan: string | null) {
  const p = (plan || "").toLowerCase();
  if (p === "studio") return "border-frame-orange text-frame-orange";
  if (p === "pro") return "border-frame-green text-frame-green";
  return "border-frame-gray-3 text-frame-gray-light";
}

/* ─── Helper: Avatar color by role ─── */
function avatarClass(role: string) {
  return role === "admin"
    ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
    : "border-frame-gray-3 bg-frame-gray-2 text-frame-gray-light";
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN CONTENT
   ═══════════════════════════════════════════════════════════════════════════ */
function AdminContent() {
  const { t, locale } = useLanguage();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();

  // ─── State ───
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  // User detail / management drawer
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [subForm, setSubForm] = useState<{ planId: PlanId; status: "active" | "trial" | "canceled"; trialDays: string }>({
    planId: "pro", status: "active", trialDays: "14",
  });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AdminActionLogEntry[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [lgpdRequests, setLgpdRequests] = useState<AdminLgpdRequest[]>([]);
  const [lgpdLoaded, setLgpdLoaded] = useState(false);
  const [lgpdBusyId, setLgpdBusyId] = useState<string | null>(null);
  const [referralSummary, setReferralSummary] = useState<AdminReferralSummary | null>(null);
  const [referralEntries, setReferralEntries] = useState<AdminReferralEntry[]>([]);
  const [referralLoaded, setReferralLoaded] = useState(false);
  const [aiUsage, setAiUsage] = useState<AdminAiUsage | null>(null);
  const [aiUsageLoaded, setAiUsageLoaded] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: "", message: "" });
  const [broadcastSending, setBroadcastSending] = useState(false);

  // ─── Data Loading ───
  const loadData = async () => {
    setLoading(true);
    try {
      const [toolList, userData, metricsData] = await Promise.all([
        api.admin.listTools(),
        api.admin.users(),
        api.admin.metrics().catch(() => null),
      ]);
      setTools(toolList);
      setUsers((userData.users || []) as ManagedUser[]);
      if (metricsData) setMetrics(metricsData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.errors.loadAdmin"));
    } finally {
      setLoading(false);
    }
  };

  // ─── User detail / management ───
  const openDetail = async (userId: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setTempPassword(null);
    try {
      const d = await api.admin.userDetail(userId);
      setDetail(d);
      setSubForm({
        planId: (d.subscription?.planId as PlanId) || "pro",
        status: (d.subscription?.status as "active" | "trial" | "canceled") === "canceled" ? "canceled" : (d.subscription?.status === "trial" ? "trial" : "active"),
        trialDays: "14",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar detalhes");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSuspend = async () => {
    if (!detail) return;
    const next = !detail.disabled;
    setDetailBusy(true);
    try {
      await api.admin.setUserStatus(detail.id, next);
      setDetail({ ...detail, disabled: next });
      toast.success(next ? "Conta suspensa" : "Conta reativada");
      loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao alterar status");
    } finally {
      setDetailBusy(false);
    }
  };

  const applySubscription = async () => {
    if (!detail) return;
    setDetailBusy(true);
    try {
      await api.admin.updateSubscription(detail.id, {
        planId: subForm.planId,
        status: subForm.status,
        trialDays: subForm.status === "trial" ? Number(subForm.trialDays) || 14 : undefined,
      });
      toast.success("Assinatura atualizada");
      await openDetail(detail.id);
      loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao atualizar assinatura");
    } finally {
      setDetailBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!detail) return;
    setDetailBusy(true);
    try {
      const { tempPassword: tp } = await api.admin.resetUserPassword(detail.id);
      setTempPassword(tp);
      toast.success("Senha temporária gerada");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao resetar senha");
    } finally {
      setDetailBusy(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (activeTab === "audit" && !auditLoaded) {
      api.admin.auditLog(100)
        .then((entries) => { setAuditLog(entries); setAuditLoaded(true); })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar auditoria"));
    }
    if (activeTab === "lgpd" && !lgpdLoaded) {
      api.admin.lgpdRequests()
        .then((reqs) => { setLgpdRequests(reqs); setLgpdLoaded(true); })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar solicitações LGPD"));
    }
    if (activeTab === "referrals" && !referralLoaded) {
      api.admin.referralOverview()
        .then((d) => { setReferralSummary(d.summary); setReferralEntries(d.entries); setReferralLoaded(true); })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar indicações"));
    }
    if (activeTab === "ai-usage" && !aiUsageLoaded) {
      api.admin.aiUsage()
        .then((d) => { setAiUsage(d); setAiUsageLoaded(true); })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar uso de IA"));
    }
  }, [activeTab, auditLoaded, lgpdLoaded, referralLoaded, aiUsageLoaded]);

  const processLgpd = async (id: string, status: "completed" | "rejected") => {
    setLgpdBusyId(id);
    try {
      await api.admin.processLgpdRequest(id, status);
      setLgpdRequests((prev) => prev.map((r) => r.id === id ? { ...r, status, processedAt: new Date().toISOString() } : r));
      toast.success(status === "completed" ? "Solicitação concluída" : "Solicitação rejeitada");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao processar solicitação");
    } finally {
      setLgpdBusyId(null);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error("Preencha título e mensagem.");
      return;
    }
    setBroadcastSending(true);
    try {
      const { recipientCount } = await api.admin.broadcast(broadcastForm.title.trim(), broadcastForm.message.trim());
      toast.success(`Aviso enviado para ${recipientCount} usuários`);
      setBroadcastOpen(false);
      setBroadcastForm({ title: "", message: "" });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao enviar aviso");
    } finally {
      setBroadcastSending(false);
    }
  };

  // ─── Computed ───
  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin").length;
    const paid = users.filter((u) => {
      const p = u.plan_name?.toLowerCase();
      return p === "pro" || p === "studio";
    }).length;
    const activeTools = tools.filter((t) => t.isActive).length;
    return { admins, paid, activeTools };
  }, [users, tools]);

  const filteredUsers = useMemo(
    () => users.filter((u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase())
    ),
    [users, search],
  );

  const recentUsers = useMemo(
    () => [...users].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5),
    [users],
  );

  // ─── Actions ───
  const createUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      toast.error(t("app.errors.fillNameEmailPassword"));
      return;
    }
    setCreating(true);
    try {
      await api.admin.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        planId: createForm.planId,
      });
      toast.success(t("app.admin.accountCreated"));
      setCreateForm(INITIAL_FORM);
      setCreateOpen(false);
      await loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("app.admin.createUserError"));
    } finally {
      setCreating(false);
    }
  };

  const toggleRole = async (u: ManagedUser) => {
    const newRole = u.role === "admin" ? "user" : "admin";
    try {
      await api.admin.updateUserRole(u.id, newRole);
      toast.success(`${u.email} ${newRole === "admin" ? t("app.admin.nowAdmin") : t("app.admin.nowUser")}`);
      loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("app.admin.roleUpdateError"));
    }
  };

  const changePlan = async (u: ManagedUser, planId: string) => {
    try {
      await api.admin.updateUserPlan(u.id, planId as PlanId);
      toast.success(`${u.email} → ${planId}`);
      loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("app.admin.planUpdateError"));
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget || deleteConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.admin.deleteUser(deleteTarget.id);
      toast.success(t("app.admin.accountDeleted"));
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadData();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("app.admin.deleteUserError"));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleTool = async (tool: ToolFromApi) => {
    try {
      await api.admin.updateTool(tool.id, { isActive: !tool.isActive });
      setTools((prev) => prev.map((t) => t.id === tool.id ? { ...t, isActive: !t.isActive } : t));
      toast.success(`${tool.name} ${!tool.isActive ? t("app.admin.toolEnabled") : t("app.admin.toolDisabled")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.errors.updateTool"));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      <main id="main-content" className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1">
        {/* Hero header */}
        <div className="mb-6">
          <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] uppercase text-adaptive-primary mb-1">
            // {t("app.admin.adminTitle")}
          </p>
          <h1 className="frame-title text-2xl sm:text-3xl text-frame-white">
            {t("app.admin.administration")}
          </h1>
          <p className="text-frame-gray-light text-sm mt-1">
            {t("app.admin.adminSubtitle")}
          </p>
        </div>

        {/* Tabs */}
        <ResponsiveTabs
          tabs={[
            { value: "overview", label: t("app.admin.tabOverview") as string },
            { value: "users", label: t("app.admin.users") as string },
            { value: "tools", label: t("app.admin.tabTools") as string },
            { value: "referrals", label: "Indicações" },
            { value: "lgpd", label: "LGPD" },
            { value: "ai-usage", label: "Uso de IA" },
            { value: "audit", label: "Auditoria" },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
        >

          {/* ═══ TAB: OVERVIEW ═══ */}
          <TabsContent value="overview" className="mt-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
              {[
                { label: t("app.admin.users"), value: metrics?.totalUsers ?? users.length, icon: Users, accent: "border-b-frame-orange" },
                { label: "MRR (R$)", value: metrics ? metrics.mrrBrl.toLocaleString("pt-BR") : "—", icon: DollarSign, accent: "border-b-frame-green" },
                { label: t("app.admin.paidAccounts"), value: metrics?.paidActive ?? stats.paid, icon: Sparkles, accent: "border-b-frame-green" },
                { label: "Em trial", value: metrics?.trials ?? "—", icon: Clock, accent: "border-b-[#4d9fff]" },
                { label: "Novos (30d)", value: metrics?.newUsers30d ?? "—", icon: TrendingUp, accent: "border-b-frame-orange" },
                { label: "Novos (7d)", value: metrics?.newUsers7d ?? "—", icon: TrendingUp, accent: "border-b-[#4d9fff]" },
                { label: t("app.admin.admins"), value: metrics?.admins ?? stats.admins, icon: Crown, accent: "border-b-[#4d9fff]" },
                { label: "Suspensos", value: metrics?.disabled ?? "—", icon: Ban, accent: "border-b-red-500" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`bg-frame-gray-2 border border-frame-gray-3 p-5 border-b-2 ${stat.accent}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-frame-mono text-[0.64rem] tracking-[0.14em] uppercase text-frame-gray-light">{stat.label}</p>
                      <Icon className="w-4 h-4 text-frame-gray-light" />
                    </div>
                    <p className="frame-title text-[2.6rem] text-frame-white leading-none mt-2">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <section className="border border-frame-gray-3 bg-frame-gray-1/20 p-5 sm:p-6 mb-6">
              <h2 className="font-frame-mono text-[0.68rem] tracking-[0.16em] uppercase text-adaptive-primary mb-4">
                {t("app.admin.recentActivity")}
              </h2>
              {loading ? (
                <p className="text-sm text-frame-gray-light">{t("app.common.loading")}</p>
              ) : (
                <div className="space-y-2">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3 border border-frame-gray-3 p-3 bg-frame-black/25">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{u.name || t("app.admin.noName")}</p>
                        <p className="text-xs text-frame-gray-light truncate">{u.email}</p>
                      </div>
                      <span className={`text-[0.62rem] font-frame-mono uppercase border px-1.5 py-0.5 shrink-0 ${planBadgeClass(u.plan_name)}`}>
                        {u.plan_name || "Free"}
                      </span>
                      <span className="text-[0.6rem] text-frame-gray-muted font-frame-mono shrink-0">
                        {new Date(u.created_at).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setCreateOpen(true)} className="frame-btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> {t("app.admin.createUser")}
              </button>
              <button type="button" onClick={() => setActiveTab("users")} className="frame-btn-ghost flex items-center gap-2">
                <Users className="w-4 h-4" /> {t("app.admin.viewAllUsers")}
              </button>
              <button type="button" onClick={() => setBroadcastOpen(true)} className="frame-btn-ghost flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> Enviar aviso
              </button>
            </div>
          </TabsContent>

          {/* ═══ TAB: USERS ═══ */}
          <TabsContent value="users" className="mt-6">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                <input
                  type="text"
                  placeholder={t("app.admin.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full frame-input pl-10"
                />
              </div>
              <button type="button" onClick={() => setCreateOpen(true)} className="frame-btn-primary flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> {t("app.admin.createUser")}
              </button>
            </div>

            {/* User list */}
            {loading ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isCurrentUser = currentUser?.id === u.id;
                  return (
                    <div key={u.id} className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:border-frame-gray-4 transition">
                      {/* Avatar + Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 ${avatarClass(u.role)}`}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold truncate">{u.name || t("app.admin.noName")}</span>
                            <span className={`text-[0.62rem] font-frame-mono uppercase border px-1.5 py-0.5 ${planBadgeClass(u.plan_name)}`}>
                              {u.plan_name || "Free"}
                            </span>
                            {u.role === "admin" && (
                              <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-adaptive-primary border border-frame-orange/30 px-1.5 py-0.5">Admin</span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-frame-gold border border-frame-gold/30 px-1.5 py-0.5">{t("app.admin.you")}</span>
                            )}
                            {u.disabled && (
                              <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-red-300 border border-red-500/40 px-1.5 py-0.5">Suspenso</span>
                            )}
                          </div>
                          <p className="text-sm text-frame-gray-light truncate">{u.email}</p>
                          <p className="text-[0.64rem] text-frame-gray-muted font-frame-mono mt-0.5">
                            {t("app.admin.createdAt")} {new Date(u.created_at).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}
                            {" · "}{u.project_count || 0} {t("app.admin.projects")}
                            {" · "}{u.file_count || 0} {t("app.admin.files")}
                            {" · "}{u.review_count || 0} {t("app.admin.reviews")}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={u.plan_name?.toLowerCase() || "free"}
                          onChange={(e) => changePlan(u, e.target.value)}
                          className="bg-frame-gray-2 border border-frame-gray-3 px-2 py-1.5 text-xs outline-none focus:border-frame-orange w-24"
                        >
                          {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => toggleRole(u)}
                          disabled={isCurrentUser}
                          className={`px-3 py-1.5 min-h-11 text-xs border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.role === "admin"
                              ? "border-frame-orange/30 text-frame-orange hover:bg-frame-orange/10"
                              : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50"
                          }`}
                        >
                          {u.role === "admin" ? t("app.admin.demote") : t("app.admin.promote")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetail(u.id)}
                          title="Gerenciar usuário"
                          className="h-11 w-11 border border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50 hover:text-frame-orange flex items-center justify-center transition"
                        >
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteTarget(u); setDeleteConfirm(""); }}
                          disabled={isCurrentUser}
                          title={isCurrentUser ? t("app.admin.cannotDeleteSelf") as string : t("app.admin.deleteAccount") as string}
                          className="h-11 w-11 border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.admin.noUsersFound")}</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB: TOOLS ═══ */}
          <TabsContent value="tools" className="mt-6">
            {loading ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tools.map((tool) => (
                  <div key={tool.id} className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-frame-gray-light shrink-0" />
                        <p className="font-semibold text-sm truncate">{tool.name}</p>
                      </div>
                      <p className="text-[0.64rem] text-frame-gray-muted font-frame-mono mt-1 truncate">{tool.slug}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => toggleTool(tool)}
                      data-touch-target-exempt
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                        tool.isActive ? "bg-frame-orange" : "bg-frame-gray-3"
                      }`}
                      aria-label={`${tool.name} toggle`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          tool.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB: REFERRALS ═══ */}
          <TabsContent value="referrals" className="mt-6">
            {!referralLoaded ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                  {[
                    { label: "Total de indicações", value: referralSummary?.totalReferrals ?? 0 },
                    { label: "Convertidas", value: referralSummary?.totalConverted ?? 0 },
                    { label: "Recompensadas", value: referralSummary?.totalRewarded ?? 0 },
                  ].map((s) => (
                    <div key={s.label} className="bg-frame-gray-2 border border-frame-gray-3 p-4 border-b-2 border-b-frame-orange">
                      <p className="font-frame-mono text-[0.64rem] tracking-[0.14em] uppercase text-frame-gray-light">{s.label}</p>
                      <p className="frame-title text-3xl text-frame-white leading-none mt-2">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {referralEntries.map((entry) => (
                    <div key={entry.id} className="border border-frame-gray-3 bg-frame-gray-1/20 p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className={`text-[0.62rem] font-frame-mono uppercase border px-1.5 py-0.5 shrink-0 w-fit ${
                        entry.status === "rewarded" ? "border-frame-green/40 text-frame-green"
                        : entry.status === "converted" ? "border-[#4d9fff]/40 text-[#4d9fff]"
                        : "border-frame-gray-3 text-frame-gray-light"
                      }`}>
                        {entry.status}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          <span className="text-frame-white">{entry.referrer.email}</span>
                          <span className="text-frame-gray-muted"> indicou </span>
                          <span className="text-frame-white">{entry.referredUser?.email ?? "—"}</span>
                        </p>
                        {entry.rewardType && (
                          <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono flex items-center gap-1">
                            <Gift className="w-3 h-3" /> {entry.rewardType}
                          </p>
                        )}
                      </div>
                      <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono shrink-0">
                        {new Date(entry.createdAt).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}
                      </p>
                    </div>
                  ))}
                  {referralEntries.length === 0 && (
                    <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">Nenhuma indicação registrada ainda.</div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══ TAB: LGPD ═══ */}
          <TabsContent value="lgpd" className="mt-6">
            <p className="text-xs text-frame-gray-light mb-4">
              Solicitações de cópia, correção ou exclusão de dados feitas pelos usuários (LGPD Art. 18). Processe dentro do prazo legal indicado no protocolo.
            </p>
            {!lgpdLoaded ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : (
              <div className="space-y-2">
                {lgpdRequests.map((r) => (
                  <div key={r.id} className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      <FileCheck className="w-4 h-4 text-frame-gray-light" />
                      <span className="text-[0.62rem] font-frame-mono uppercase border border-frame-gray-3 px-1.5 py-0.5">
                        {r.type === "copy" ? "Cópia" : r.type === "correct" ? "Correção" : "Exclusão"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{r.user.name || r.user.email} <span className="text-frame-gray-muted">— {r.user.email}</span></p>
                      <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono">
                        Protocolo {r.id} · {new Date(r.createdAt).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")}
                      </p>
                    </div>
                    <span className={`text-[0.62rem] font-frame-mono uppercase border px-1.5 py-0.5 shrink-0 w-fit ${
                      r.status === "completed" ? "border-frame-green/40 text-frame-green"
                      : r.status === "rejected" ? "border-red-500/40 text-red-300"
                      : "border-frame-orange/40 text-frame-orange"
                    }`}>
                      {r.status}
                    </span>
                    {r.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => processLgpd(r.id, "completed")}
                          disabled={lgpdBusyId === r.id}
                          className="px-3 py-1.5 min-h-11 text-xs border border-frame-green/40 text-frame-green hover:bg-frame-green/10 disabled:opacity-40 transition"
                        >
                          Concluir
                        </button>
                        <button
                          type="button"
                          onClick={() => processLgpd(r.id, "rejected")}
                          disabled={lgpdBusyId === r.id}
                          className="px-3 py-1.5 min-h-11 text-xs border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40 transition"
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {lgpdRequests.length === 0 && (
                  <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">Nenhuma solicitação LGPD registrada.</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══ TAB: AI USAGE ═══ */}
          <TabsContent value="ai-usage" className="mt-6">
            {!aiUsageLoaded ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mb-6">
                  {[
                    { label: "Total de gerações", value: aiUsage?.totalGenerations ?? 0 },
                    { label: "Últimas 24h", value: aiUsage?.last24h ?? 0 },
                    { label: "Últimos 7 dias", value: aiUsage?.last7d ?? 0 },
                    { label: "Últimos 30 dias", value: aiUsage?.last30d ?? 0 },
                  ].map((s) => (
                    <div key={s.label} className="bg-frame-gray-2 border border-frame-gray-3 p-4 border-b-2 border-b-frame-orange">
                      <p className="font-frame-mono text-[0.64rem] tracking-[0.14em] uppercase text-frame-gray-light">{s.label}</p>
                      <p className="frame-title text-3xl text-frame-white leading-none mt-2">{s.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono mb-4">
                  Volume real de uso. Não exibimos custo estimado em R$ porque parte das ferramentas roda em modelos gratuitos com fallback (não há contagem de tokens/custo por chamada salva).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-frame-mono text-[0.66rem] uppercase tracking-[0.14em] text-adaptive-primary mb-3 flex items-center gap-2">
                      <Bot className="w-4 h-4" /> Por ferramenta
                    </h3>
                    <div className="space-y-1.5">
                      {aiUsage?.byTool.map((t2) => (
                        <div key={t2.toolId} className="flex items-center justify-between border border-frame-gray-3 bg-frame-gray-1/20 px-3 py-2">
                          <span className="text-sm truncate">{t2.toolName}</span>
                          <span className="font-frame-mono text-xs text-frame-gray-light shrink-0">{t2.count}</span>
                        </div>
                      ))}
                      {(!aiUsage || aiUsage.byTool.length === 0) && (
                        <p className="text-xs text-frame-gray-light">Sem gerações registradas.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-frame-mono text-[0.66rem] uppercase tracking-[0.14em] text-adaptive-primary mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Top usuários
                    </h3>
                    <div className="space-y-1.5">
                      {aiUsage?.topUsers.map((u) => (
                        <div key={u.userId} className="flex items-center justify-between border border-frame-gray-3 bg-frame-gray-1/20 px-3 py-2">
                          <span className="text-sm truncate">{u.email}</span>
                          <span className="font-frame-mono text-xs text-frame-gray-light shrink-0">{u.count}</span>
                        </div>
                      ))}
                      {(!aiUsage || aiUsage.topUsers.length === 0) && (
                        <p className="text-xs text-frame-gray-light">Sem gerações registradas.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══ TAB: AUDIT LOG ═══ */}
          <TabsContent value="audit" className="mt-6">
            <p className="text-xs text-frame-gray-light mb-4">
              Toda ação administrativa (suspender conta, alterar plano/assinatura, resetar senha, promover/remover admin, gerenciar ferramentas) fica registrada aqui — quem fez, quando, e a partir de qual IP.
            </p>
            {!auditLoaded ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">{t("app.common.loading")}</div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">Nenhuma ação registrada ainda.</div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="border border-frame-gray-3 bg-frame-gray-1/20 p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="font-frame-mono text-[0.62rem] uppercase tracking-wider text-adaptive-primary border border-frame-orange/30 px-1.5 py-0.5 shrink-0 w-fit">
                      {entry.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        <span className="text-frame-gray-light">{entry.adminEmail}</span>
                        {entry.targetId && <span className="text-frame-gray-muted"> → alvo #{entry.targetId}</span>}
                      </p>
                      {Object.keys(entry.details || {}).length > 0 && (
                        <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono truncate">
                          {JSON.stringify(entry.details)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[0.62rem] text-frame-gray-muted font-frame-mono">
                        {new Date(entry.createdAt).toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
                      </p>
                      {entry.ipAddress && <p className="text-[0.6rem] text-frame-gray-muted font-frame-mono">{entry.ipAddress}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </ResponsiveTabs>
      </main>

      {/* ═══ CREATE USER MODAL ═══ */}
      <AnimatedModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("app.admin.createUser") as string}
        description={t("app.admin.createUserModalDesc") as string}
        footer={
          <>
            <button type="button" onClick={() => setCreateOpen(false)} className="frame-btn-ghost">
              {t("app.common.cancel")}
            </button>
            <button type="button" onClick={createUser} disabled={creating} className="frame-btn-primary disabled:opacity-60">
              {creating ? t("app.admin.creating") : t("app.admin.createAndRelease")}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              {t("app.common.name")}
            </label>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder={t("app.admin.namePlaceholder") as string}
              className="frame-input w-full"
            />
          </div>
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              {t("app.common.email")}
            </label>
            <input
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder={t("app.admin.emailPlaceholder") as string}
              type="email"
              className="frame-input w-full"
            />
          </div>
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              {t("app.admin.temporaryPassword")}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <input
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder={t("app.admin.tempPasswordPlaceholder") as string}
                className="frame-input w-full pl-10"
              />
            </div>
          </div>
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              {t("app.common.role")}
            </label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as "user" | "admin" })}
              className="frame-input w-full"
            >
              <option value="user">{t("app.admin.userRole")}</option>
              <option value="admin">{t("app.admin.adminTitle")}</option>
            </select>
          </div>
        </div>

        {/* Plan picker */}
        <div className="mt-4">
          <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-2 block">
            {t("app.admin.planLabel")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setCreateForm({ ...createForm, planId: plan.id })}
                className={`border p-3 text-center transition ${
                  createForm.planId === plan.id
                    ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
                    : "border-frame-gray-3 bg-transparent text-frame-gray-light hover:border-frame-orange/50"
                }`}
              >
                <span className="font-frame-mono text-[0.68rem] uppercase tracking-[0.12em]">{plan.label}</span>
              </button>
            ))}
          </div>
        </div>
      </AnimatedModal>

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      <AnimatedModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deletingId) { setDeleteTarget(null); setDeleteConfirm(""); } }}
        title={t("app.admin.deleteUserAccount") as string}
        description={t("app.admin.deleteUserAccountDesc") as string}
        className="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
              disabled={!!deletingId}
              className="frame-btn-ghost"
            >
              {t("app.common.cancel")}
            </button>
            <button
              type="button"
              onClick={deleteUser}
              disabled={!deleteTarget || deleteConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase() || deletingId === deleteTarget.id}
              className="bg-red-500 text-white px-4 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-400 transition"
            >
              {deletingId === deleteTarget?.id ? t("app.admin.deleting") : t("app.admin.deletePermanently")}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-500/10 text-red-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1/40 p-3 text-sm flex-1">
                <p className="font-semibold">{deleteTarget.name || t("app.admin.noName")}</p>
                <p className="text-frame-gray-light">{deleteTarget.email}</p>
                <p className="text-[0.6rem] font-frame-mono uppercase tracking-[0.12em] text-frame-gray-muted mt-2">
                  {deleteTarget.project_count || 0} {t("app.admin.projects")} · {deleteTarget.file_count || 0} {t("app.admin.files")} · {deleteTarget.review_count || 0} {t("app.admin.reviews")}
                </p>
              </div>
            </div>
            <label className="block text-xs font-frame-mono uppercase tracking-[0.16em] text-frame-gray-light mb-2">
              {t("app.admin.typeEmailToConfirm")}
            </label>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.email}
              className="w-full frame-input focus:border-red-400"
            />
          </div>
        )}
      </AnimatedModal>

      {/* ═══ USER MANAGEMENT MODAL ═══ */}
      <AnimatedModal
        isOpen={detailOpen}
        onClose={() => { if (!detailBusy) { setDetailOpen(false); setDetail(null); setTempPassword(null); } }}
        title="Gerenciar usuário"
        description="Assinatura, acesso e ações de suporte."
        className="max-w-2xl"
      >
        {detailLoading || !detail ? (
          <p className="text-sm text-frame-gray-light py-8 text-center">{t("app.common.loading")}</p>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 ${avatarClass(detail.role)}`}>
                {(detail.name || detail.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate">{detail.name || t("app.admin.noName")}</span>
                  {detail.role === "admin" && <span className="text-[0.6rem] font-frame-mono uppercase text-adaptive-primary border border-frame-orange/30 px-1.5 py-0.5">Admin</span>}
                  {detail.disabled
                    ? <span className="text-[0.6rem] font-frame-mono uppercase text-red-300 border border-red-500/40 px-1.5 py-0.5">Suspenso</span>
                    : <span className="text-[0.6rem] font-frame-mono uppercase text-frame-green border border-frame-green/40 px-1.5 py-0.5">Ativo</span>}
                </div>
                <p className="text-sm text-frame-gray-light truncate">{detail.email}</p>
              </div>
            </div>

            {/* Usage */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
              {[
                { l: "Projetos", v: detail.usage.projects },
                { l: "Arquivos", v: detail.usage.files },
                { l: "Reviews", v: detail.usage.videoReviews },
                { l: "Clientes", v: detail.usage.clients },
                { l: "Gerações", v: detail.usage.generations },
              ].map((s) => (
                <div key={s.l} className="border border-frame-gray-3 bg-frame-gray-1/20 py-2">
                  <p className="frame-title text-lg text-frame-white leading-none">{s.v}</p>
                  <p className="text-[0.55rem] font-frame-mono uppercase tracking-wider text-frame-gray-muted mt-1">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Subscription current state */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-frame-orange" />
                <h3 className="font-frame-mono text-[0.66rem] uppercase tracking-[0.14em] text-adaptive-primary">Assinatura</h3>
              </div>
              {detail.subscription ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-frame-gray-light mb-4">
                  <p>Plano: <span className="text-frame-white">{detail.subscription.planName}</span></p>
                  <p>Status: <span className="text-frame-white">{detail.subscription.status}</span></p>
                  <p>Trial até: <span className="text-frame-white">{detail.subscription.trialEndsAt ? new Date(detail.subscription.trialEndsAt).toLocaleDateString("pt-BR") : "—"}</span></p>
                  <p>Período até: <span className="text-frame-white">{detail.subscription.currentPeriodEnd ? new Date(detail.subscription.currentPeriodEnd).toLocaleDateString("pt-BR") : "—"}</span></p>
                  <p className="col-span-2 truncate">Stripe: <span className="text-frame-white">{detail.subscription.stripeCustomerId || "sem cliente Stripe"}</span></p>
                </div>
              ) : (
                <p className="text-xs text-frame-gray-light mb-4">Sem assinatura registrada.</p>
              )}

              {/* Subscription editor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={subForm.planId} onChange={(e) => setSubForm({ ...subForm, planId: e.target.value as PlanId })} className="frame-input">
                  {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <select value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value as "active" | "trial" | "canceled" })} className="frame-input">
                  <option value="active">Ativo (cortesia/pago)</option>
                  <option value="trial">Trial</option>
                  <option value="canceled">Cancelado</option>
                </select>
                {subForm.status === "trial" ? (
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                    <input type="number" min="1" value={subForm.trialDays} onChange={(e) => setSubForm({ ...subForm, trialDays: e.target.value })} className="frame-input w-full pl-10" placeholder="dias" />
                  </div>
                ) : <div />}
              </div>
              <button type="button" onClick={applySubscription} disabled={detailBusy} className="frame-btn-primary mt-3 text-sm disabled:opacity-60">
                Aplicar assinatura
              </button>
            </div>

            {/* Support actions */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-frame-orange" />
                <h3 className="font-frame-mono text-[0.66rem] uppercase tracking-[0.14em] text-adaptive-primary">Suporte</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleSuspend}
                  disabled={detailBusy || detail.id === currentUser?.id}
                  title={detail.id === currentUser?.id ? "Você não pode suspender a própria conta" : undefined}
                  className={`px-3 py-2 min-h-11 text-xs border flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    detail.disabled
                      ? "border-frame-green/40 text-frame-green hover:bg-frame-green/10"
                      : "border-red-500/40 text-red-300 hover:bg-red-500/10"
                  }`}
                >
                  <Ban className="w-4 h-4" /> {detail.disabled ? "Reativar conta" : "Suspender conta"}
                </button>
                <button type="button" onClick={resetPassword} disabled={detailBusy} className="px-3 py-2 min-h-11 text-xs border border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50 hover:text-frame-orange flex items-center gap-2 transition disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Resetar senha
                </button>
              </div>
              {tempPassword && (
                <div className="border border-frame-orange/40 bg-frame-orange/5 p-3">
                  <p className="text-[0.6rem] font-frame-mono uppercase tracking-wider text-frame-gray-light mb-1">Senha temporária (mostre ao usuário — não será exibida de novo)</p>
                  <code className="text-sm text-frame-orange break-all">{tempPassword}</code>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* ═══ BROADCAST ANNOUNCEMENT MODAL ═══ */}
      <AnimatedModal
        isOpen={broadcastOpen}
        onClose={() => { if (!broadcastSending) setBroadcastOpen(false); }}
        title="Enviar aviso para todos os usuários"
        description="Cria uma notificação para cada conta ativa (contas suspensas não recebem)."
        footer={
          <>
            <button type="button" onClick={() => setBroadcastOpen(false)} disabled={broadcastSending} className="frame-btn-ghost">
              {t("app.common.cancel")}
            </button>
            <button type="button" onClick={sendBroadcast} disabled={broadcastSending} className="frame-btn-primary disabled:opacity-60">
              {broadcastSending ? "Enviando..." : "Enviar aviso"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">Título</label>
            <input
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              placeholder="Ex: Nova funcionalidade disponível"
              className="frame-input w-full"
            />
          </div>
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">Mensagem</label>
            <textarea
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              placeholder="Escreva o aviso..."
              className="frame-input w-full min-h-[100px]"
            />
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTED COMPONENT (with ProtectedRoute)
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <AdminContent />
    </ProtectedRoute>
  );
}
