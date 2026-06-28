import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const token = useMemo(() => getTokenFromUrl(), []);

  const handleSubmit = async () => {
    if (!token) {
      setError("Link inválido. Solicite um novo token de recuperação.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, password);
      toast.success("Senha redefinida com sucesso!");
      setLocation("/login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao redefinir senha";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="O token de recuperação está ausente ou expirou.">
        <AuthError message="Token inválido ou ausente." />
        <button
          type="button"
          onClick={() => setLocation("/forgot-password")}
          className="frame-btn-primary w-full"
        >
          Solicitar novo link
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Defina uma nova senha para sua conta.">
      {error && <AuthError message={error} />}
      <AuthField label="Nova senha">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="frame-input"
        />
      </AuthField>
      <AuthField label="Confirmar senha">
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="frame-input"
        />
      </AuthField>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="frame-btn-primary w-full flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </>
        ) : (
          "Redefinir senha"
        )}
      </button>
      <AuthLink>
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="text-frame-orange bg-transparent border-none font-inherit"
        >
          Voltar ao login
        </button>
      </AuthLink>
    </AuthLayout>
  );
}
