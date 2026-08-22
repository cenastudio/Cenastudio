import { useEffect, useState } from "react";
import { CalendarDays, Copy, FileText, FolderKanban, KeyRound, ReceiptText, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type ClientPortalAccessStatus, type ClientPortalAllowance } from "@/lib/api";

interface ClientPortalAccessSectionProps {
  clientId: number;
  defaultEmail?: string;
}

/**
 * Seção "Portal do Cliente" em ClientDetail.tsx (spec: portal-do-cliente).
 * Gestão do acesso pelo dono da produtora: criar, ativar/desativar, redefinir senha.
 */
export default function ClientPortalAccessSection({ clientId, defaultEmail }: ClientPortalAccessSectionProps) {
  const [status, setStatus] = useState<ClientPortalAccessStatus | null>(null);
  const [allowance, setAllowance] = useState<ClientPortalAllowance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
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
    setIsSubmitting(true);
    try {
      const created = await api.clients.portalAccess.create(clientId, { email });
      setActivationUrl(created.activationUrl || null);
      toast.success(created.activationEmailSent ? "Convite enviado para o cliente." : "Convite criado. Copie o link de ativação.");
      setShowCreateForm(false);
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
    { label: "Projetos", detail: "Projetos vinculados a este cliente.", icon: FolderKanban },
    { label: "Arquivos", detail: "Materiais anexados aos projetos do cliente.", icon: FileText },
    { label: "Propostas", detail: "Historico comercial conectado ao cliente.", icon: ReceiptText },
    { label: "Reunioes", detail: "Agenda e historico de encontros.", icon: CalendarDays },
  ];

  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-5">
        <div>
          <h3 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Portal do Cliente</h3>
          <p className="mt-2 max-w-2xl text-sm text-frame-gray-light leading-relaxed">
            Central para controlar o acesso do cliente e confirmar o que ele consegue acompanhar: projetos, arquivos, propostas e reunioes ligados a este cadastro. O cliente cria a propria senha por link seguro.
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
        {portalSurface.map(({ label, detail, icon: Icon }) => (
          <div key={label} className="border border-frame-gray-3/70 bg-frame-black/30 p-3">
            <div className="flex items-center gap-2 text-frame-white">
              <Icon className="h-4 w-4 text-frame-orange" />
              <p className="font-frame-mono text-[0.65rem] uppercase tracking-wider">{label}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-frame-gray-light">{detail}</p>
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
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            disabled={allowance ? !allowance.canActivate : false}
            className="frame-btn-primary min-h-11 justify-center"
          >
            Criar acesso ao portal
          </button>
          {allowance && !allowance.canActivate && (
            <p className="text-xs text-frame-red mt-2">
              Limite de portais ativos do plano {allowance.planId.toUpperCase()} atingido. Faça upgrade para ativar mais.
            </p>
          )}
        </div>
      )}

      {!hasAccess && showCreateForm && (
        <form onSubmit={handleCreate} className="space-y-3 max-w-lg border border-frame-gray-3/70 bg-frame-black/20 p-4">
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
          <p className="text-xs leading-relaxed text-frame-gray-light">
            O cliente recebera um convite para criar a propria senha. Nenhuma senha temporaria precisa ser compartilhada pela produtora.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 justify-center">
              Enviar convite
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="frame-btn-secondary min-h-11 justify-center">
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
              onClick={handleResetPassword}
              disabled={isSubmitting}
              className="frame-btn-secondary min-h-11 flex items-center gap-1.5 text-xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Enviar novo link de senha
            </button>
          </div>

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
