import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle, Crown, KeyRound, Plus, Search,
  ShieldCheck, Sparkles, Trash2, Users, Wrench,
} from "lucide-react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ApiError, api, ToolFromApi } from "@/lib/api";

interface ManagedUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
  github_id: string | null;
  created_at: string;
  plan_name: string | null;
  generation_limit: number | null;
  project_count?: number;
  file_count?: number;
  review_count?: number;
}

type PlanId = "free" | "pro" | "studio";

const PLANS: { id: PlanId; label: string }[] = [
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
  { id: "studio", label: "Studio" },
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

  // ─── Data Loading ───
  const loadData = async () => {
    setLoading(true);
    try {
      const [toolList, userData] = await Promise.all([
        api.admin.listTools(),
        api.admin.users(),
      ]);
      setTools(toolList);
      setUsers((userData.users || []) as ManagedUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.errors.loadAdmin"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
          <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] uppercase text-frame-orange mb-1">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
          <TabsList className="bg-transparent border-b border-frame-gray-3 rounded-none h-auto p-0 w-full justify-start gap-0 overflow-x-auto scrollbar-none">
            <TabsTrigger
              value="overview"
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-frame-orange data-[state=active]:bg-transparent data-[state=active]:text-frame-orange text-frame-gray-light font-frame-mono text-[0.68rem] tracking-[0.12em] uppercase px-4 py-3 data-[state=active]:shadow-none"
            >
              {t("app.admin.tabOverview")}
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-frame-orange data-[state=active]:bg-transparent data-[state=active]:text-frame-orange text-frame-gray-light font-frame-mono text-[0.68rem] tracking-[0.12em] uppercase px-4 py-3 data-[state=active]:shadow-none"
            >
              {t("app.admin.users")}
            </TabsTrigger>
            <TabsTrigger
              value="tools"
              className="rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-frame-orange data-[state=active]:bg-transparent data-[state=active]:text-frame-orange text-frame-gray-light font-frame-mono text-[0.68rem] tracking-[0.12em] uppercase px-4 py-3 data-[state=active]:shadow-none"
            >
              {t("app.admin.tabTools")}
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB: OVERVIEW ═══ */}
          <TabsContent value="overview" className="mt-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
              {[
                { label: t("app.admin.users"), value: users.length, icon: Users, accent: "border-b-frame-orange" },
                { label: t("app.admin.paidAccounts"), value: stats.paid, icon: Sparkles, accent: "border-b-frame-green" },
                { label: t("app.admin.admins"), value: stats.admins, icon: Crown, accent: "border-b-[#4d9fff]" },
                { label: t("app.admin.activeTools"), value: `${stats.activeTools}/${tools.length}`, icon: ShieldCheck, accent: "border-b-frame-orange" },
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
              <h2 className="font-frame-mono text-[0.68rem] tracking-[0.16em] uppercase text-frame-orange mb-4">
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
                              <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-frame-orange border border-frame-orange/30 px-1.5 py-0.5">Admin</span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-frame-gold border border-frame-gold/30 px-1.5 py-0.5">{t("app.admin.you")}</span>
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
                          className={`px-3 py-1.5 text-xs border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.role === "admin"
                              ? "border-frame-orange/30 text-frame-orange hover:bg-frame-orange/10"
                              : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50"
                          }`}
                        >
                          {u.role === "admin" ? t("app.admin.demote") : t("app.admin.promote")}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteTarget(u); setDeleteConfirm(""); }}
                          disabled={isCurrentUser}
                          title={isCurrentUser ? t("app.admin.cannotDeleteSelf") as string : t("app.admin.deleteAccount") as string}
                          className="h-8 w-8 border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
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
        </Tabs>
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
