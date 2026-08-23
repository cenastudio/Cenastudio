import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ApiError } from "@/lib/api";
import { isStrongPassword, passwordRequirements } from "@/lib/passwordPolicy";
import { portalApi } from "../portalApi";

export default function PortalActivate() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRules = passwordRequirements(password);
  const passwordIsStrong = isStrongPassword(password);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.dataset.theme = "dark";
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Link de ativacao invalido.");
      return;
    }
    if (!passwordIsStrong) {
      setError("Crie uma senha forte antes de continuar.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }
    setIsSubmitting(true);
    try {
      await portalApi.auth.activate(token, password);
      setLocation("/portal/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel ativar o acesso.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-frame-black px-4 py-8 md:px-8 flex items-center">
      <main className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="border border-frame-gray-3 bg-frame-gray-1/20 p-6 md:p-8">
          <p className="frame-label mb-3">Portal do Cliente</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-frame-white leading-tight">
            Crie sua senha de acesso.
          </h1>
          <p className="mt-4 max-w-xl text-sm md:text-base leading-relaxed text-frame-gray-light">
            Este link foi enviado pela produtora para liberar uma area segura com projetos, arquivos, propostas e reunioes.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="border border-frame-gray-3 bg-frame-gray-1/30 p-6 md:p-8 space-y-4">
          <div>
            <label htmlFor="portal-new-password" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Nova senha
            </label>
            <input
              id="portal-new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
            />
          </div>
          <div>
            <label htmlFor="portal-confirm-password" className="block font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-1">
              Confirmar senha
            </label>
            <input
              id="portal-confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-11 w-full bg-frame-black border border-frame-gray-3 px-3 py-2 text-frame-white focus-visible:border-frame-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frame-orange/30"
            />
          </div>
          <ul className="grid gap-2 text-xs text-frame-gray-light sm:grid-cols-2">
            {passwordRules.map((rule) => (
              <li key={rule.key} className={rule.met ? "text-frame-orange" : ""}>
                {rule.key === "app.auth.passwordRuleLength" && "10+ caracteres"}
                {rule.key === "app.auth.passwordRuleMaxLength" && "Ate 128 caracteres"}
                {rule.key === "app.auth.passwordRuleUppercase" && "Uma maiuscula"}
                {rule.key === "app.auth.passwordRuleLowercase" && "Uma minuscula"}
                {rule.key === "app.auth.passwordRuleNumber" && "Um numero"}
                {rule.key === "app.auth.passwordRuleSymbol" && "Um simbolo"}
              </li>
            ))}
          </ul>
          {error && <p className="text-sm text-frame-red">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="frame-btn-primary min-h-11 w-full justify-center">
            {isSubmitting ? "Ativando…" : "Criar senha e entrar"}
          </button>
        </form>
      </main>
    </div>
  );
}
