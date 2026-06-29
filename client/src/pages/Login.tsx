import AuthLayout, { AuthField, AuthLink, AuthLoadingAnimation } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Github, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha email e senha");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success("Login efetuado com sucesso!");
      setLocation(user.role === "admin" ? "/admin" : "/tools");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no login");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleGitHubLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Supabase não está configurado para login GitHub.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <AuthLayout mode="login" title="Entrar" subtitle="Acesse seu estúdio e ferramentas IA.">
      {submitting ? (
        <AuthLoadingAnimation message="Validando acesso e abrindo seu estúdio..." />
      ) : (
        <>
          <AuthField label="Email">
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              className="frame-input"
            />
          </AuthField>

          <AuthField label="Senha">
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              className="frame-input"
            />
          </AuthField>

          <button
            type="button"
            onClick={handleLogin}
            disabled={submitting}
            className="frame-btn-primary w-full mt-1.5 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Acessar estúdio"
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-frame-gray-3" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-frame-gray-light">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGitHubLogin}
            className="frame-btn-ghost w-full flex items-center justify-center gap-2"
          >
            <Github className="w-5 h-5" />
            Entrar com GitHub
          </button>

          <AuthLink>
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => setLocation("/register")}
              className="text-frame-orange bg-transparent border-none font-inherit"
            >
              Criar conta grátis
            </button>
          </AuthLink>
          <AuthLink>
            <button
              type="button"
              onClick={() => setLocation("/forgot-password")}
              className="text-frame-orange bg-transparent border-none font-inherit"
            >
              Esqueceu a senha?
            </button>
          </AuthLink>
        </>
      )}
    </AuthLayout>
  );
}
