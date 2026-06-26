import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ArrowLeft, Crown, KeyRound, LogOut, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface AdminUser {
  id: number;
  email: string;
  role: string;
  name?: string | null;
  plan_name?: string | null;
  generation_limit?: number | null;
}

type PlanId = "free" | "pro" | "studio";

const PLANS: Array<{ id: PlanId; label: string; detail: string }> = [
  { id: "pro", label: "Pro", detail: "50 geracoes + ferramentas pagas" },
  { id: "studio", label: "Studio", detail: "Ilimitado + acesso total" },
  { id: "free", label: "Free", detail: "Teste limitado" },
];

function AdminContent() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [toolCount, setToolCount] = useState(0);
  const [activeToolCount, setActiveToolCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "Conta Teste",
    email: "",
    password: "Teste12345",
    role: "user" as "user" | "admin",
    planId: "pro" as PlanId,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [toolList, userData] = await Promise.all([api.admin.listTools(), api.admin.users()]);
      setToolCount(toolList.length);
      setActiveToolCount(toolList.filter((tool) => tool.isActive).length);
      setUsers((userData.users || []) as AdminUser[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin").length;
    const paid = users.filter((user) => {
      const plan = user.plan_name?.toLowerCase();
      return plan === "pro" || plan === "studio";
    }).length;
    return { admins, paid };
  }, [users]);

  const createUser = async () => {
    if (!form.email.trim()) {
      toast.error("Informe o e-mail da conta");
      return;
    }
    setCreating(true);
    try {
      await api.admin.createUser({
        name: form.name.trim() || "Conta Teste",
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        planId: form.planId,
      });
      toast.success("Conta criada e liberada");
      setForm((current) => ({ ...current, email: "", password: "Teste12345" }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white pt-[62px]">
      <header className="fixed top-0 left-0 right-0 z-50 frame-nav">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/tools")}
            className="font-frame-mono text-[0.58rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2.5 py-1.5 transition hover:border-frame-orange hover:text-frame-orange flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="font-frame-display text-[1.55rem] tracking-[0.1em] text-frame-white bg-transparent border-none"
          >
            FRAME<span className="text-frame-orange">.</span>AI
          </button>
        </div>
        <p className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gold hidden sm:block">
          Admin
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation("/admin/gerenciar")}
            className="font-frame-mono text-[0.58rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gold/50 text-frame-gold px-2.5 py-1.5 transition hover:border-frame-orange hover:text-frame-orange flex items-center gap-1.5"
          >
            <Users className="w-3 h-3" />
            Usuarios
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="font-frame-mono text-[0.58rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2.5 py-1.5 transition hover:border-frame-red hover:text-frame-red flex items-center gap-1.5"
          >
            <LogOut className="w-3 h-3" />
            Sair
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-9 py-7 border-b border-frame-gray-2">
        <p className="frame-label text-frame-gold">Administracao</p>
        <h1 className="frame-title text-[2.1rem] text-frame-white">
          GERENCIAR <span className="text-frame-gold">ACESSOS</span>
        </h1>
      </div>

      <div className="px-4 sm:px-9 py-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
          {[
            { label: "Usuarios", value: users.length, icon: Users, accent: "border-b-frame-orange" },
            { label: "Contas pagas", value: stats.paid, icon: Sparkles, accent: "border-b-frame-green" },
            { label: "Admins", value: stats.admins, icon: Crown, accent: "border-b-[#4d9fff]" },
            { label: "Ferramentas ativas", value: `${activeToolCount}/${toolCount}`, icon: ShieldCheck, accent: "border-b-frame-gold" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`bg-frame-gray-2 border border-frame-gray-3 p-5 relative overflow-hidden border-b-2 ${stat.accent}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-frame-mono text-[0.56rem] tracking-[0.14em] uppercase text-frame-gray-light">
                    {stat.label}
                  </p>
                  <Icon className="w-4 h-4 text-frame-gray-light" />
                </div>
                <p className="frame-title text-[2.6rem] text-frame-white leading-none mt-2">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5">
          <div className="bg-frame-gray-2 border border-frame-gray-3 p-5 sm:p-6">
            <h2 className="font-frame-mono text-[0.68rem] tracking-[0.16em] uppercase text-frame-orange mb-5 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Criar usuario de acesso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <input
                placeholder="Nome"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="frame-input"
              />
              <input
                placeholder="email@cliente.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="frame-input"
              />
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                <input
                  placeholder="Senha provisoria"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="frame-input pl-10"
                />
              </div>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "user" | "admin" })}
                className="frame-input"
              >
                <option value="user">Usuario comum</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setForm({ ...form, planId: plan.id })}
                  className={`border p-4 text-left transition ${
                    form.planId === plan.id
                      ? "border-frame-orange bg-frame-orange/10"
                      : "border-frame-gray-3 bg-transparent hover:border-frame-orange/50"
                  }`}
                >
                  <span className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-white">
                    {plan.label}
                  </span>
                  <span className="block text-xs text-frame-gray-light mt-2 leading-relaxed">{plan.detail}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={createUser}
              disabled={creating}
              className="frame-btn-primary mt-5 disabled:opacity-60"
            >
              {creating ? "Criando..." : "Criar conta e liberar acesso"}
            </button>
          </div>

          <aside className="bg-frame-gray-2 border border-frame-gray-3 p-5 sm:p-6">
            <h2 className="font-frame-mono text-[0.68rem] tracking-[0.16em] uppercase text-frame-gold mb-4">
              Ultimos usuarios
            </h2>
            {loading ? (
              <p className="text-sm text-frame-gray-light">Carregando...</p>
            ) : (
              <div className="space-y-2">
                {users.slice(0, 6).map((user) => (
                  <div key={user.id} className="border border-frame-gray-3 p-3 bg-frame-black/25">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{user.name || "Sem nome"}</p>
                      <span className="font-frame-mono text-[0.52rem] uppercase text-frame-orange">
                        {user.plan_name || "Sem plano"}
                      </span>
                    </div>
                    <p className="text-xs text-frame-gray-light truncate mt-1">{user.email}</p>
                    <p className="text-[0.55rem] text-frame-gray-muted font-frame-mono uppercase mt-1">
                      {user.role === "admin" ? "Admin" : "Usuario"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setLocation("/admin/gerenciar")}
              className="frame-btn-ghost w-full mt-4"
            >
              Gerenciar todos
            </button>
          </aside>
        </section>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <AdminContent />
    </ProtectedRoute>
  );
}
