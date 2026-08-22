import { useEffect, useState } from "react";
import { CalendarDays, Copy, FileText, FolderKanban, KeyRound, ReceiptText, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type ClientPortalAccessStatus, type ClientPortalAllowance } from "@/lib/api";
import { useLocation } from "wouter";

interface ClientPortalAccessSectionProps {
  clientId: number;
  defaultEmail?: string;
}

/**
 * Seção "Portal do Cliente" em ClientDetail.tsx (spec: portal-do-cliente).
 * Gestão do acesso pelo dono da produtora: criar, ativar/desativar, redefinir senha.
 */
export default function ClientPortalAccessSection({ clientId, defaultEmail }: ClientPortalAccessSectionProps) {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<ClientPortalAccessStatus | null>(null);
  const [allowance, setAllowance] = useState<ClientPortalAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<"invite" | "manual">("manual");
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [activationUrl, setActivationUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.clients.portalAccess.getStatus(clientId),
      api.clients.portalAccess.allowance(),
    ])
      .then(([statusData, allowanceData]) => {
        setStatus(statusData);
        setAllowance(allowanceData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const manualPassword = createMode === "manual" ? password.trim() : undefined;
    if (manualPassword && manualPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (manualPassword && manualPassword !== passwordConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await api.clients.portalAccess.create(clientId, { email, password: manualPassword });
      setActivationUrl(created.activationUrl || null);
      toast.success(manualPassword ? "Portal ativado com a senha definida pela produtora." : created.activationEmailSent ? "Convite enviado para o cliente." : "Convite criado. Copie o link de ativação.");
      setShowCreateForm(false);
      setPassword("");
      setPasswordConfirm("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive() {
    if (!status) return;
    setIsSubmitting(true);
    try {
      await api.clients.portalAccess.updateStatus(clientId, !status.active);
      toast.success(status.active ? "Acesso desativado." : "Acesso reativado.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o acesso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setIsSubmitting(true);
    try {
      const result = await api.clients.portalAccess.resetPassword(clientId);
      setActivationUrl(result.activationUrl || null);
      toast.success(result.activationEmailSent ? "Novo convite enviado para o cliente." : "Novo link de ativação criado.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    const nextPassword = password.trim();
    if (nextPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (nextPassword !== passwordConfirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await api.clients.portalAccess.resetPassword(clientId, nextPassword);
      setStatus(updated);
      setActivationUrl(null);
      setPassword("");
      setPasswordConfirm("");
      setShowPasswordReset(false);
      toast.success("Senha do portal definida. O cliente já pode entrar e trocar depois.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível definir a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/login`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link do portal copiado."));
  }

  function copyActivationLink() {
    if (!activationUrl) return;
    navigator.clipboard.writeText(activationUrl).then(() => toast.success("Link de ativação copiado."));
  }

  if (loading) {
    return <p className="text-sm text-frame-gray-light">Carregando...</p>;
  }

  const hasAccess = status && status.createdAt;
  const portalLink = typeof window !== "undefined" ? `${window.location.origin}/portal/login` : "/portal/login";
  const portalSurface = [
    { label: "Projetos", detail: "Vincule o cliente no cadastro do projeto.", action: "Abrir projetos", route: "/projects", icon: FolderKanban },
    { label: "Arquivos", detail: "Use o globo nos arquivos para liberar no portal.", action: "Publicar arquivos", route: "/files-unified?tab=project", icon: FileText },
    { label: "Propostas", detail: "Envie a proposta e marque como visível no portal.", action: "Ver propostas", route: `/clients/${clientId}?tab=proposals`, icon: ReceiptText },
    { label: "Reuniões", detail: "Ao agendar, marque se o cliente pode ver.", action: "Agendar reunião", route: `/clients/${clientId}?tab=interactions`, icon: CalendarDays },
  ];

  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <h3 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Portal do Cliente</h3>
          <p className="mt-2 max-w-2xl text-sm text-frame-gray-light leading-relaxed">
            Central para controlar login, senha e tudo que o cliente consegue acompanhar. Defina a senha agora ou envie um link seguro; depois o cliente pode trocar a senha dentro do portal.
          </p>
        </div>
        {hasAccess && (
          <span
            className={`w-fit text-[0.6rem] font-frame-mono uppercase px-2 py-1 border ${
              status?.active ? "border-frame-green/40 text-frame-green" : "border-frame-gray-3 text-frame-gray-light"
            }`}
          >
            {status?.active ? "Ativo" : "Inativo"}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {portalSurface.map(({ label, detail, action, route, icon: Icon }) => (
          <div key={label} className="border border-frame-gray-3/70 bg-frame-black/30 p-3">
            <div className="flex items-center gap-2 text-frame-white">
              <Icon className="h-4 w-4 text-frame-orange" />
              <p className="font-frame-mono text-[0.65rem] uppercase tracking-wider">{label}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-frame-gray-light">{detail}</p>
            <button
              type="button"
              onClick={() => setLocation(route)}
              className="mt-3 min-h-8 border border-frame-gray-3 px-2.5 font-frame-mono text-[0.55rem] uppercase tracking-[0.12em] text-frame-gray-light transition hover:border-frame-orange hover:text-frame-orange"
            >
              {action}
            </button>
          </div>
        ))}
      </div>

      {!hasAccess && !showCreateForm && (
        <div className="border border-frame-gray-3/70 bg-frame-black/20 p-4">
          <p className="text-sm text-frame-gray-light mb-3">
            Este cliente ainda não tem acesso ao portal.
            {allowance && allowance.limit !== null && (
              <span className="block mt-1 font-frame-mono text-[0.65rem] uppercase">
                Plano {allowance.planId}: {allowance.used} de {allowance.limit} portais ativos
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setCreateMode("manual"); setShowCreateForm(true); }}
              disabled={allowance ? !allowance.canActivate : false}
              className="frame-btn-primary min-h-11 justify-center"
            >
              Definir senha e ativar
            </button>
            <button
              type="button"
              onClick={() => { setCreateMode("invite"); setShowCreateForm(true); }}
              disabled={allowance ? !allowance.canActivate : false}
              className="frame-btn-secondary min-h-11 justify-center"
            >
              Enviar convite por link
            </button>
          </div>
          {allowance && !allowance.canActivate && (
            <p className="text-xs text-frame-red mt-2">
              Limite de portais ativos do plano {allowance.planId.toUpperCase()} atingido. Faça upgrade para ativar mais.
            </p>
          )}
        </div>
      )}

      {!hasAccess && showCreateForm && (
        <form onSubmit={handleCreate} className="space-y-3 max-w-xl border border-frame-gray-3/70 bg-frame-black/20 p-4">
          <div className="grid grid-cols-2 gap-2 border border-frame-gray-3 p-1">
            <button
              type="button"
              onClick={() => setCreateMode("manual")}
              className={`min-h-10 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] ${createMode === "manual" ? "bg-frame-orange text-frame-black" : "text-frame-gray-light"}`}
            >
              Definir senha
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("invite")}
              className={`min-h-10 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] ${createMode === "invite" ? "bg-frame-orange text-frame-black" : "text-frame-gray-light"}`}
            >
              Enviar link
            </button>
          </div>
          <div>
            <label htmlFor="portal-access-email" className="block font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mb-1">
              Email do cliente
            </label>
            <input
              id="portal-access-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
            />
          </div>
          {createMode === "manual" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="portal-access-password" className="block font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mb-1">
                  Senha inicial
                </label>
                <input
                  id="portal-access-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
                />
              </div>
              <div>
                <label htmlFor="portal-access-password-confirm" className="block font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mb-1">
                  Confirmar senha
                </label>
                <input
                  id="portal-access-password-confirm"
                  type="password"
                  required
                  minLength={6}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
                />
              </div>
            </div>
          )}
          <p className="text-xs leading-relaxed text-frame-gray-light">
            {createMode === "manual"
              ? "A senha não fica visível depois de salvar. Passe ao cliente por um canal seguro; ele pode alterar dentro do portal."
              : "O cliente receberá um convite para criar a própria senha por link seguro."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 justify-center">
              {createMode === "manual" ? "Ativar com senha" : "Enviar convite"}
            </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(false);
              setPassword("");
              setPasswordConfirm("");
            }}
            className="frame-btn-secondary min-h-11 justify-center"
          >
            Cancelar
          </button>
          </div>
        </form>
      )}

      {hasAccess && (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr]">
            <div className="border border-frame-gray-3/70 bg-frame-black/20 p-4">
              <p className="frame-label mb-2">Login do cliente</p>
              <p className="text-sm text-frame-white break-words">{status?.email}</p>
              {status?.activationPending && (
                <p className="text-xs text-frame-orange mt-2">
                  Convite pendente ate {status.activationTokenExpiresAt ? new Date(status.activationTokenExpiresAt).toLocaleString("pt-BR") : "expirar"}.
                </p>
              )}
              {status?.lastLoginAt && (
                <p className="text-xs text-frame-gray-light mt-2">Ultimo acesso: {new Date(status.lastLoginAt).toLocaleString("pt-BR")}</p>
              )}
            </div>
            <div className="border border-frame-gray-3/70 bg-frame-black/20 p-4">
              <p className="frame-label mb-2">Link de acesso</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={portalLink}
                  className="min-h-11 flex-1 bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-gray-light text-sm focus:outline-none"
                />
                <button type="button" onClick={copyPortalLink} className="frame-btn-secondary min-h-11 justify-center">
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isSubmitting}
              className="frame-btn-secondary min-h-11 flex items-center gap-1.5 text-xs"
            >
              {status?.active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {status?.active ? "Desativar" : "Reativar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPasswordReset((current) => !current);
                setPassword("");
                setPasswordConfirm("");
              }}
              disabled={isSubmitting}
              className="frame-btn-primary min-h-11 flex items-center gap-1.5 text-xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Definir nova senha
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isSubmitting}
              className="frame-btn-secondary min-h-11 flex items-center gap-1.5 text-xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Enviar link de senha
            </button>
          </div>

          {showPasswordReset && (
            <form onSubmit={handleSetPassword} className="grid gap-3 border border-frame-orange/30 bg-frame-orange/[0.04] p-4 sm:grid-cols-[1fr_1fr_auto]">
              <label>
                <span className="block font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light mb-1">Nova senha</span>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
                />
              </label>
              <label>
                <span className="block font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light mb-1">Confirmar</span>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
                />
              </label>
              <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 self-end justify-center">
                Salvar senha
              </button>
            </form>
          )}

          {activationUrl && (
            <div className="border border-frame-orange/30 bg-frame-orange/[0.04] p-4">
              <p className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange">Link de ativacao</p>
              <p className="mt-2 text-sm leading-relaxed text-frame-gray-light">
                Use este link somente se o e-mail transacional ainda nao estiver configurado no ambiente.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={activationUrl}
                  className="min-h-11 flex-1 bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-gray-light text-sm focus:outline-none"
                />
                <button type="button" onClick={copyActivationLink} className="frame-btn-secondary min-h-11 justify-center">
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            </div>
          )}

          <div className="border border-frame-orange/30 bg-frame-orange/[0.04] p-4">
            <p className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange">Como lancar coisas para este portal</p>
            <p className="mt-2 text-sm leading-relaxed text-frame-gray-light">
              Vincule projetos, arquivos, propostas e reunioes ao cadastro deste cliente. O portal mostra somente dados deste cliente, separado da area interna da produtora.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
