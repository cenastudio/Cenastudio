import { useState } from "react";
import { useLocation } from "wouter";
import { ApiError } from "@/lib/api";
import { usePortalAuth } from "../PortalAuthContext";

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      setLocation("/portal/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-frame-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-frame-gray-3 bg-frame-gray-1/30 p-8">
        <p className="frame-label mb-2">// Portal do Cliente</p>
        <h1 className="text-2xl font-bold tracking-tight text-frame-white mb-6">Entrar</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="portal-email" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Email
            </label>
            <input
              id="portal-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus:outline-none focus:border-frame-orange"
            />
          </div>
          <div>
            <label htmlFor="portal-password" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Senha
            </label>
            <input
              id="portal-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus:outline-none focus:border-frame-orange"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="frame-btn-primary w-full">
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
