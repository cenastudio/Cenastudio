import { useState } from "react";
import { ApiError } from "@/lib/api";
import { portalApi } from "../portalApi";
import PortalLayout from "../PortalLayout";
import { PortalPageHeader } from "../portalUi";

export default function PortalAccount() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      await portalApi.auth.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PortalLayout>
      <PortalPageHeader
        eyebrow="Conta"
        title="Seguranca do acesso"
        description="Mantenha sua senha atualizada para proteger arquivos, propostas e reunioes liberadas pela produtora."
      />

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-5">
          <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">O que este acesso protege</h2>
          <div className="space-y-3 text-sm text-frame-gray-light">
            <p>Arquivos liberados, historico de propostas, reunioes agendadas e paineis dos projetos vinculados ao cliente.</p>
            <p>Se a senha foi compartilhada fora do time certo, troque agora e avise a produtora.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-frame-gray-3 bg-frame-gray-1/30 p-5 space-y-4">
          <div>
            <label htmlFor="current-password" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Senha atual
            </label>
            <input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Nova senha
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
            />
          </div>
          {error && <p className="text-sm text-frame-red">{error}</p>}
          {success && <p className="text-sm text-frame-green">Senha alterada com sucesso.</p>}
          <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 w-full justify-center">
            {isSubmitting ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </PortalLayout>
  );
}
