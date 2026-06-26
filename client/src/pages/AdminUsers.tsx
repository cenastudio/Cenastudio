import { useEffect, useState } from "react";
import { Crown, User as UserIcon, Search } from "lucide-react";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
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
}

const PLANS = [
  { id: "free", name: "Free", limit: 5 },
  { id: "pro", name: "Pro", limit: 50 },
  { id: "studio", name: "Studio", limit: -1 },
];

function AdminUsersContent() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin-users", { credentials: "include" });
      const data = await res.json();
      if (data.success) setUsers(data.data.users);
      else toast.error("Erro ao carregar usuários");
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user: ManagedUser) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/admin-user-role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${user.email} agora é ${newRole === "admin" ? "admin" : "usuário"}`);
        loadUsers();
      } else toast.error(data.error || "Erro");
    } catch {
      toast.error("Erro ao alterar permissão");
    }
  };

  const changePlan = async (user: ManagedUser, planId: string) => {
    try {
      const res = await fetch("/api/admin-user-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, planId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${user.email} agora é ${planId}`);
        loadUsers();
      } else toast.error(data.error || "Erro");
    } catch {
      toast.error("Erro ao alterar plano");
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      <main className="max-w-5xl w-full mx-auto px-6 py-10 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-frame-orange font-frame-mono text-xs tracking-[0.2em] uppercase mb-2">// PORTA DOS FUNDOS</p>
            <h1 className="text-3xl font-bold tracking-tight">GERENCIAR USUÁRIOS</h1>
            <p className="text-frame-gray-light text-sm mt-1">{users.length} usuários cadastrados</p>
          </div>
        </div>

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
            {filtered.map((user) => (
              <div
                key={user.id}
                className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 flex items-center gap-4 hover:border-frame-gray-4 transition"
              >
                <div className={`p-2 rounded-full ${user.role === "admin" ? "bg-frame-orange/10 text-frame-orange" : "bg-frame-gray-3 text-frame-gray-light"}`}>
                  {user.role === "admin" ? <Crown className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{user.name || "Sem nome"}</span>
                    {user.role === "admin" && (
                      <span className="text-[0.5rem] font-frame-mono uppercase tracking-wider text-frame-orange border border-frame-orange/30 px-1.5 py-0.5">Admin</span>
                    )}
                    {user.github_id && (
                      <span className="text-[0.5rem] text-frame-gray-light" title="Login via GitHub">GH</span>
                    )}
                  </div>
                  <p className="text-sm text-frame-gray-light truncate">{user.email}</p>
                  <p className="text-[0.55rem] text-frame-gray-muted font-frame-mono mt-0.5">
                    Criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    {user.plan_name && ` · ${user.plan_name}${user.generation_limit && user.generation_limit > 0 ? ` (${user.generation_limit}/mês)` : user.generation_limit === -1 ? " (ilimitado)" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={user.plan_name?.toLowerCase() || "free"}
                    onChange={(e) => changePlan(user, e.target.value)}
                    className="bg-frame-gray-2 border border-frame-gray-3 px-2 py-1.5 text-xs outline-none focus:border-frame-orange w-24"
                  >
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleRole(user)}
                    className={`px-3 py-1.5 text-xs border transition ${
                      user.role === "admin"
                        ? "border-frame-orange/30 text-frame-orange hover:bg-frame-orange/10"
                        : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50"
                    }`}
                  >
                    {user.role === "admin" ? "Rebaixar" : "Promover"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-20 text-frame-gray-light font-frame-mono text-xs">NENHUM USUÁRIO ENCONTRADO</div>
            )}
          </div>
        )}
      </main>
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
