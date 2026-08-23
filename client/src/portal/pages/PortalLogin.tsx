import { useState, useEffect } from "react";
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

  // Portal do cliente usa tema escuro independente do app da produtora.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.dataset.theme = "dark";
  }, []);

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
    <div className="min-h-screen bg-frame-black px-4 py-8 md:px-8 flex items-center">
      <main className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="border border-frame-gray-3 bg-frame-gray-1/20 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <p className="frame-label mb-3">// Portal do Cliente</p>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-frame-white leading-tight">
              Acompanhe sua producao sem perder nada pelo caminho.
            </h1>
            <p className="mt-4 max-w-xl text-sm md:text-base leading-relaxed text-frame-gray-light">
              Projetos, arquivos, propostas e reunioes ficam organizados em uma area segura liberada pela produtora.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Projetos", "Arquivos", "Agenda"].map((item) => (
              <div key={item} className="border border-frame-gray-3 bg-frame-black/40 p-4">
                <p className="font-frame-mono text-[0.65rem] uppercase tracking-wider text-frame-orange">{item}</p>
                <p className="mt-2 text-xs leading-relaxed text-frame-gray-light">Tudo separado por contexto para revisar com calma.</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-frame-gray-3 bg-frame-gray-1/30 p-6 md:p-8">
          <p className="frame-label mb-2">// Acesso seguro</p>
          <h2 className="text-2xl font-bold tracking-tight text-frame-white mb-2">Entrar</h2>
          <p className="text-sm text-frame-gray-light mb-6">Use as credenciais enviadas pela produtora.</p>

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
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
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
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
            />
          </div>
          {error && <p className="text-sm text-frame-red">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 w-full justify-center">
            {isSubmitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
        </section>
      </main>
    </div>
  );
}
