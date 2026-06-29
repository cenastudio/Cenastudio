import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKOUT_MODAL_PLAN, planDisplayLabel } from "@/lib/plans";
import { useApp } from "@/contexts/AppContext";
import { api, openBillingPortal, ApiError } from "@/lib/api";
import { CalendarClock, Crown, LogOut, ShieldCheck, UserRound, Zap, Settings, Users, Save, Building2, Phone } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

function formatDate(value: string | null | undefined, noDateLabel: string) {
  if (!value) return noDateLabel;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function ProfileContent() {
  const { t } = useLanguage();
  const { user, plan, logout, refresh } = useAuth();
  const { openModal, selectPlan } = useApp();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [studioName, setStudioName] = useState("");
  const [studioRole, setStudioRole] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setStudioName(user?.studioName || "");
    setStudioRole(user?.studioRole || "");
    setPhone(user?.phone || "");
  }, [user]);

  const planLabel = plan
    ? planDisplayLabel(plan.planId, plan.planName, plan.status, plan.trialEndsAt)
    : t("app.errors.planNotLoaded");

  const handlePlanAction = async () => {
    if (!plan || plan.planId === "free" || plan.status === "trial") {
      selectPlan(CHECKOUT_MODAL_PLAN);
      openModal("checkout");
      return;
    }

    try {
      await openBillingPortal();
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("app.errors.openPortal");
      toast.error(msg);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.auth.updateProfile({ name, studioName, studioRole, phone });
      await refresh();
      toast.success(t("app.profile.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.updateProfile"));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 space-y-8">
        <div className="border-b border-frame-gray-3 pb-6">
          <p className="frame-label mb-2">// Conta</p>
          <h1 className="frame-title text-[clamp(2.2rem,4vw,3.8rem)]">
            PERFIL DO <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">ESTUDIO</em>
          </h1>
          <p className="text-frame-gray-light text-sm mt-3 max-w-2xl">
            Dados da conta, acesso atual e plano ativo para operar o Cena Studio.
          </p>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
          <div className="border border-frame-gray-3 bg-frame-gray-2/55 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${
                  user?.role === "admin"
                    ? "bg-frame-gold text-frame-black"
                    : "bg-frame-orange text-frame-black"
                }`}
              >
                {(user?.name ?? user?.email ?? "F").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] text-frame-orange uppercase">
                  Usuario ativo
                </p>
                <h2 className="frame-title text-[2rem] mt-1 truncate">
                  {user?.name || t("app.profile.defaultAccountName")}
                </h2>
                <p className="text-frame-gray-light text-sm break-all">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              <div className="border border-frame-gray-3 bg-frame-gray-1 p-4">
                <UserRound className="w-5 h-5 text-frame-orange mb-3" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                  Tipo de conta
                </p>
                <p className="text-lg font-semibold mt-1">
                  {user?.role === "admin" ? t("app.profile.admin") : t("app.profile.user")}
                </p>
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1 p-4">
                <ShieldCheck className="w-5 h-5 text-frame-orange mb-3" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                  Acesso
                </p>
                <p className="text-lg font-semibold mt-1">
                  {user?.role === "admin" ? t("app.profile.fullAccess") : "Workspace"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button type="button" onClick={() => setLocation("/dashboard")} className="frame-btn-primary flex-1">
                Abrir painel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="frame-btn-ghost flex-1 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>

          <div className="border border-frame-gray-3 bg-frame-gray-2/55 p-6 space-y-5 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
            <div>
              <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] text-frame-orange uppercase">
                Dados editáveis
              </p>
              <h2 className="frame-title text-[2rem] mt-1">STUDIO / USUÁRIO</h2>
              <p className="text-frame-gray-light text-sm mt-2">
                Atualize como a conta aparece internamente, para equipe, aprovações e operação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Nome do usuário</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input value={name} onChange={(e) => setName(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.profile.namePlaceholder")} />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Telefone</span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.profile.phonePlaceholder")} />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Nome do studio</span>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input value={studioName} onChange={(e) => setStudioName(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.profile.studioNamePlaceholder")} />
                </div>
              </label>
              <label className="space-y-2">
                <span className="frame-label text-frame-gray-light">Função no studio</span>
                <input value={studioRole} onChange={(e) => setStudioRole(e.target.value)} className="frame-input w-full" placeholder={t("app.profile.studioRolePlaceholder")} />
              </label>
            </div>

            <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="frame-btn-primary flex items-center justify-center gap-2 w-full md:w-auto">
              <Save className="w-4 h-4" />
              {savingProfile ? t("app.common.saving") : t("app.profile.saveProfile")}
            </button>
          </div>

          {user?.role === "admin" && (
            <div className="border border-frame-gold/50 bg-frame-gold/10 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] text-frame-gold uppercase">
                    Administracao
                  </p>
                  <h2 className="frame-title text-[2rem] mt-1">GERENCIAR CONTAS</h2>
                  <p className="text-frame-gray-light text-sm mt-2 max-w-md">
                    Promote e rebaixe administradores, altere planos e monitore todos os usuarios da plataforma.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation("/admin/gerenciar")}
                  className="frame-btn-primary flex items-center gap-2 shrink-0"
                >
                  <Users className="w-4 h-4" />
                  Gerenciar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="border border-frame-gold/35 bg-frame-black/60 p-4">
                  <Settings className="w-5 h-5 text-frame-gold mb-3" />
                  <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                    Painel Admin
                  </p>
                  <button
                    type="button"
                    onClick={() => setLocation("/admin")}
                    className="text-frame-gold underline underline-offset-4 text-sm mt-2 hover:text-frame-orange transition"
                  >
                    Acessar dashboard →
                  </button>
                </div>
                <div className="border border-frame-gold/35 bg-frame-black/60 p-4">
                  <Users className="w-5 h-5 text-frame-gold mb-3" />
                  <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                    Usuarios
                  </p>
                  <p className="text-lg font-semibold mt-1 text-frame-gold">
                    Acesso total
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border border-frame-gray-3 bg-frame-gray-2/55 p-6 space-y-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] text-frame-orange uppercase">
                  Plano atual
                </p>
                <h2 className="frame-title text-[2.4rem] mt-1">{planLabel}</h2>
                <p className="text-frame-gray-light text-sm mt-2">
                  Novos usuarios entram com teste Pro por 14 dias. Administradores mantem acesso total.
                </p>
              </div>
              <button type="button" onClick={handlePlanAction} className="frame-btn-ghost shrink-0">
                Gerenciar plano
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="border border-frame-gray-3 bg-frame-gray-1 p-4">
                <Crown className="w-5 h-5 text-frame-gold mb-3" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                  Status
                </p>
                <p className="text-lg font-semibold mt-1">{plan?.status || "—"}</p>
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1 p-4">
                <Zap className="w-5 h-5 text-frame-orange mb-3" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                  Geracoes
                </p>
                <p className="text-lg font-semibold mt-1">
                  {plan?.generationLimit === -1 ? "Ilimitado" : `${plan?.generationLimit ?? 0}/mes`}
                </p>
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1 p-4">
                <CalendarClock className="w-5 h-5 text-frame-orange mb-3" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.16em] uppercase text-frame-gray-light">
                  Trial ate
                </p>
                <p className="text-sm font-semibold mt-1">{formatDate(plan?.trialEndsAt, t("app.errors.noDateSet"))}</p>
              </div>
            </div>

            <div className="border-t border-frame-gray-3 pt-5">
              <p className="font-frame-mono text-[0.64rem] tracking-[0.18em] uppercase text-frame-gray-light mb-3">
                Recursos liberados
              </p>
              <div className="flex flex-wrap gap-2">
                {(plan?.features?.length ? plan.features : ["Ferramentas IA", "Projetos", "Historico"]).map(
                  (feature) => (
                    <span key={feature} className="frame-tag">
                      {feature}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
