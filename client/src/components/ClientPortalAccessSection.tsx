import { useEffect, useState } from "react";
import { Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
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
  const [showResetForm, setShowResetForm] = useState(false);
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
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
      await api.clients.portalAccess.create(clientId, { email, password });
      toast.success("Acesso ao portal criado. Compartilhe a senha com o cliente.");
      setShowCreateForm(false);
      setPassword("");
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.clients.portalAccess.resetPassword(clientId, password);
      toast.success("Senha redefinida. Compartilhe a nova senha com o cliente.");
      setShowResetForm(false);
      setPassword("");
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

  if (loading) {
    return <p className="text-sm text-frame-gray-light">Carregando...</p>;
  }

  const hasAccess = status && status.createdAt;

  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Portal do Cliente</h3>
        {hasAccess && (
          <span
            className={`text-[0.6rem] font-frame-mono uppercase px-2 py-0.5 border ${
              status?.active ? "border-green-500/40 text-green-400" : "border-frame-gray-3 text-frame-gray-light"
            }`}
          >
            {status?.active ? "Ativo" : "Inativo"}
          </span>
        )}
      </div>

      {!hasAccess && !showCreateForm && (
        <div>
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
            className="frame-btn-primary"
          >
            Criar acesso ao portal
          </button>
          {allowance && !allowance.canActivate && (
            <p className="text-xs text-red-400 mt-2">
              Limite de portais ativos do plano {allowance.planId.toUpperCase()} atingido. Faça upgrade para ativar mais.
            </p>
          )}
        </div>
      )}

      {!hasAccess && showCreateForm && (
        <form onSubmit={handleCreate} className="space-y-3 max-w-sm">
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
              className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
            />
          </div>
          <div>
            <label htmlFor="portal-access-password" className="block font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mb-1">
              Senha inicial
            </label>
            <input
              id="portal-access-password"
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Defina uma senha para o cliente"
              className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="frame-btn-primary">
              Criar acesso
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="frame-btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {hasAccess && (
        <div className="space-y-3">
          <p className="text-sm text-frame-white">{status?.email}</p>
          {status?.lastLoginAt && (
            <p className="text-xs text-frame-gray-light">Último acesso: {new Date(status.lastLoginAt).toLocaleString("pt-BR")}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyPortalLink} className="frame-btn-secondary flex items-center gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> Copiar link do portal
            </button>
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={isSubmitting}
              className="frame-btn-secondary flex items-center gap-1.5 text-xs"
            >
              {status?.active ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {status?.active ? "Desativar" : "Reativar"}
            </button>
            <button
              type="button"
              onClick={() => setShowResetForm((v) => !v)}
              className="frame-btn-secondary flex items-center gap-1.5 text-xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Redefinir senha
            </button>
          </div>

          {showResetForm && (
            <form onSubmit={handleResetPassword} className="flex flex-wrap items-end gap-2 max-w-sm">
              <div className="flex-1 min-w-[180px]">
                <label htmlFor="portal-reset-password" className="block font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mb-1">
                  Nova senha
                </label>
                <input
                  id="portal-reset-password"
                  type="text"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white text-sm focus:outline-none focus:border-frame-orange"
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="frame-btn-primary">
                Salvar
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
