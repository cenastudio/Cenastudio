import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Crown, KeyRound, Plus, Search, Trash2, User as UserIcon } from "lucide-react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, api } from "@/lib/api";
import { toast } from "sonner";

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

const PLANS = [
  { id: "free", name: "Free", limit: 5 },
  { id: "pro", name: "Pro", limit: 50 },
  { id: "studio", name: "Studio", limit: -1 },
];

const INITIAL_CREATE_FORM = {
  name: "",
  email: "",
  password: "",
  role: "user" as "user" | "admin",
  planId: "pro" as "free" | "pro" | "studio",
};

function AdminUsersContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.admin.users();
      setUsers((data.users || []) as ManagedUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (managedUser: ManagedUser) => {
    const newRole = managedUser.role === "admin" ? "user" : "admin";
    try {
      await api.admin.updateUserRole(managedUser.id, newRole);
      toast.success(`${managedUser.email} agora é ${newRole === "admin" ? "admin" : "usuário"}`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao alterar permissão");
    }
  };

  const changePlan = async (managedUser: ManagedUser, planId: string) => {
    try {
      await api.admin.updateUserPlan(managedUser.id, planId as "free" | "pro" | "studio");
      toast.success(`${managedUser.email} agora é ${planId}`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao alterar plano");
    }
  };

  const createUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      toast.error("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.");
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
      toast.success(`Conta criada para ${createForm.email.trim()}`);
      setCreateForm(INITIAL_CREATE_FORM);
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const openDelete = (managedUser: ManagedUser) => {
    setDeleteTarget(managedUser);
    setDeleteConfirm("");
  };

  const closeDelete = () => {
    if (deletingId) return;
    setDeleteTarget(null);
    setDeleteConfirm("");
  };

  const deleteUser = async () => {
    if (!deleteTarget || deleteConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) return;
    setDeletingId(deleteTarget.id);
    try {
      await api.admin.deleteUser(deleteTarget.id);
      toast.success(`Conta ${deleteTarget.email} apagada`);
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadUsers();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Erro ao apagar conta");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.name || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [users, search],
  );

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      <main id="main-content" className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <p className="text-frame-orange font-frame-mono text-xs tracking-[0.2em] uppercase mb-2">// ACESSOS E CONTAS</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">GERENCIAR USUÁRIOS</h1>
            <p className="text-frame-gray-light text-sm mt-1">{users.length} usuários cadastrados</p>
          </div>
        </div>

        <section className="border border-frame-gray-3 bg-frame-gray-1/35 p-4 sm:p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] uppercase text-frame-orange mb-1">// CRIAR ACESSO</p>
              <h2 className="text-lg font-semibold">Conta personalizada para teste</h2>
              <p className="text-sm text-frame-gray-light mt-1">Defina senha, plano e permissao antes de enviar para cliente, parceiro ou avaliador.</p>
            </div>
            <div className="hidden sm:flex h-10 w-10 items-center justify-center border border-frame-gray-3 text-frame-orange">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_150px] gap-3">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Nome"
              className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-frame-orange"
            />
            <input
              value={createForm.email}
              onChange={(e) => setCreateForm((current) => ({ ...current, email: e.target.value }))}
              placeholder="email@cliente.com"
              type="email"
              className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-frame-orange"
            />
            <select
              value={createForm.planId}
              onChange={(e) => setCreateForm((current) => ({ ...current, planId: e.target.value as "free" | "pro" | "studio" }))}
              className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-frame-orange"
            >
              {PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.name}</option>
              ))}
            </select>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((current) => ({ ...current, role: e.target.value as "user" | "admin" }))}
              className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-frame-orange"
            >
              <option value="user">Usuário</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 mt-3">
            <input
              value={createForm.password}
              onChange={(e) => setCreateForm((current) => ({ ...current, password: e.target.value }))}
              placeholder="Senha temporaria (min. 6 caracteres)"
              type="text"
              className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-frame-orange"
            />
            <button
              type="button"
              onClick={createUser}
              disabled={creating}
              className="bg-frame-orange text-frame-black px-4 py-2.5 font-frame-mono text-[0.68rem] tracking-[0.14em] uppercase font-semibold hover:bg-frame-orange-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Criando..." : "Criar usuário"}
            </button>
          </div>
        </section>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
          <input
            type="text"
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-frame-orange"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">CARREGANDO...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((managedUser) => {
              const isCurrentUser = currentUser?.id === managedUser.id;
              return (
                <div
                  key={managedUser.id}
                  className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 flex flex-col lg:flex-row lg:items-center gap-4 hover:border-frame-gray-4 transition"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
                    <div className={`p-2 rounded-full shrink-0 ${managedUser.role === "admin" ? "bg-frame-orange/10 text-frame-orange" : "bg-frame-gray-3 text-frame-gray-light"}`}>
                      {managedUser.role === "admin" ? <Crown className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold truncate max-w-full">{managedUser.name || "Sem nome"}</span>
                        {managedUser.role === "admin" && (
                          <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-frame-orange border border-frame-orange/30 px-1.5 py-0.5">Admin</span>
                        )}
                        {isCurrentUser && (
                          <span className="text-[0.62rem] font-frame-mono uppercase tracking-wider text-frame-gold border border-frame-gold/30 px-1.5 py-0.5">Você</span>
                        )}
                        {managedUser.github_id && (
                          <span className="text-[0.62rem] text-frame-gray-light border border-frame-gray-3 px-1.5 py-0.5" title="Login via GitHub">GH</span>
                        )}
                      </div>
                      <p className="text-sm text-frame-gray-light truncate">{managedUser.email}</p>
                      <p className="text-[0.64rem] text-frame-gray-muted font-frame-mono mt-0.5 leading-relaxed">
                        Criado em {new Date(managedUser.created_at).toLocaleDateString("pt-BR")}
                        {managedUser.plan_name && ` · ${managedUser.plan_name}${managedUser.generation_limit && managedUser.generation_limit > 0 ? ` (${managedUser.generation_limit}/mês)` : managedUser.generation_limit === -1 ? " (ilimitado)" : ""}`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[0.64rem] font-frame-mono uppercase tracking-[0.12em] text-frame-gray-light">
                        <span className="border border-frame-gray-3 px-2 py-1">{managedUser.project_count || 0} projetos</span>
                        <span className="border border-frame-gray-3 px-2 py-1">{managedUser.file_count || 0} arquivos</span>
                        <span className="border border-frame-gray-3 px-2 py-1">{managedUser.review_count || 0} reviews</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_44px] lg:flex lg:items-center gap-2 shrink-0 w-full lg:w-auto">
                    <select
                      value={managedUser.plan_name?.toLowerCase() || "free"}
                      onChange={(e) => changePlan(managedUser, e.target.value)}
                      className="bg-frame-gray-2 border border-frame-gray-3 px-2 py-2.5 lg:py-1.5 text-xs outline-none focus:border-frame-orange w-full lg:w-24"
                    >
                      {PLANS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => toggleRole(managedUser)}
                      disabled={isCurrentUser}
                      className={`px-3 py-2.5 lg:py-1.5 text-xs border transition w-full lg:w-auto disabled:opacity-40 disabled:cursor-not-allowed ${
                        managedUser.role === "admin"
                          ? "border-frame-orange/30 text-frame-orange hover:bg-frame-orange/10"
                          : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50"
                      }`}
                    >
                      {managedUser.role === "admin" ? "Rebaixar" : "Promover"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(managedUser)}
                      disabled={isCurrentUser}
                      title={isCurrentUser ? "Você não pode apagar a conta logada" : "Apagar conta"}
                      className="h-10 lg:h-8 border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">NENHUM USUÁRIO ENCONTRADO</div>
            )}
          </div>
        )}
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg border border-red-500/30 bg-frame-black p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 text-red-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-frame-mono text-[0.65rem] uppercase tracking-[0.18em] text-red-300">Ação destrutiva</p>
                <h2 className="text-xl font-semibold mt-1">Apagar conta de usuário</h2>
                <p className="text-sm text-frame-gray-light mt-2 leading-relaxed">
                  Isso remove a conta e os dados vinculados por cascade: projetos, clientes, arquivos, reviews, comentários, notificações, cota e histórico de IA.
                </p>
              </div>
            </div>

            <div className="mt-5 border border-frame-gray-3 bg-frame-gray-1/40 p-3 text-sm">
              <p className="font-semibold">{deleteTarget.name || "Sem nome"}</p>
              <p className="text-frame-gray-light">{deleteTarget.email}</p>
              <p className="text-[0.6rem] font-frame-mono uppercase tracking-[0.12em] text-frame-gray-muted mt-2">
                {deleteTarget.project_count || 0} projetos · {deleteTarget.file_count || 0} arquivos · {deleteTarget.review_count || 0} reviews
              </p>
            </div>

            <label className="block mt-5 text-xs font-frame-mono uppercase tracking-[0.16em] text-frame-gray-light">
              Digite o e-mail para confirmar
            </label>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={deleteTarget.email}
              className="mt-2 w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2.5 text-sm outline-none focus:border-red-400"
            />

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={closeDelete} className="border border-frame-gray-3 px-4 py-2.5 text-sm text-frame-gray-light hover:border-frame-gray-2" disabled={!!deletingId}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteUser}
                disabled={deleteConfirm.trim().toLowerCase() !== deleteTarget.email.toLowerCase() || deletingId === deleteTarget.id}
                className="bg-red-500 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-400"
              >
                {deletingId === deleteTarget.id ? "Apagando..." : "Apagar conta definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsers() {
  return (
    <ProtectedRoute adminOnly>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}
