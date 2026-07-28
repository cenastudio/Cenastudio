import { useState } from "react";
import { ApiError } from "@/lib/api";
import { portalApi } from "../portalApi";
import PortalLayout from "../PortalLayout";

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
      <p className="frame-label mb-2">// Conta</p>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-6">Trocar senha</h1>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
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
            className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus:outline-none focus:border-frame-orange"
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
            className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus:outline-none focus:border-frame-orange"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Senha alterada com sucesso.</p>}
        <button type="submit" disabled={isSubmitting} className="frame-btn-primary w-full">
          {isSubmitting ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
    </PortalLayout>
  );
}
