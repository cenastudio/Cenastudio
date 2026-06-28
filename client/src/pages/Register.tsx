import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, startCheckout } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { register } = useAuth();
  const [, setLocation] = useLocation();

  const handleRegister = async () => {
    setInlineError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setInlineError("Preencha todos os campos.");
      return;
    }
    if (password.length < 8) {
      setInlineError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setInlineError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast.success("Conta criada com sucesso! Trial Pro de 14 dias ativado.");

      const params = new URLSearchParams(window.location.search);
      const plan = params.get("plan");
      if (plan && (plan === "pro" || plan === "studio")) {
        await startCheckout(plan);
        return;
      }
      setLocation("/tools");
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erro ao criar conta";
      setInlineError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRegister();
  };

  return (
    <AuthLayout mode="register" title="Criar conta" subtitle="Trial Pro de 14 dias incluído.">
      {inlineError && <AuthError message={inlineError} />}

      <AuthField label="Nome">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder="Seu nome"
        />
      </AuthField>

      <AuthField label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder="seu@email.com"
        />
      </AuthField>

      <AuthField label="Senha">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className="frame-input pr-10"
            placeholder="Mínimo 8 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-frame-gray-light hover:text-frame-white bg-transparent border-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </AuthField>

      <AuthField label="Confirmar senha">
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder="Repita a senha"
        />
      </AuthField>

      <button
        type="button"
        onClick={handleRegister}
        disabled={submitting}
        className="frame-btn-primary w-full mt-1.5 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar conta grátis"
        )}
      </button>

      <AuthLink>
        Já tem conta?{" "}
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="text-frame-orange bg-transparent border-none font-inherit"
        >
          Entrar
        </button>
      </AuthLink>
    </AuthLayout>
  );
}
