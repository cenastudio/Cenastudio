import AuthLayout, { AuthField, AuthLink, AuthLoadingAnimation } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Github, Loader2 } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error(t("app.errors.fillEmailPassword"));
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(t("app.auth.loginSuccess"));
      setLocation(user.role === "admin" ? "/admin" : "/tools");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleGitHubLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error(t("app.errors.supabaseNotConfigured"));
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
    <AuthLayout mode="login" title={t("app.common.login")} subtitle={t("app.auth.loginSubtitle")}>
      {submitting ? (
        <AuthLoadingAnimation message={t("app.auth.validatingAccess")} />
      ) : (
        <>
          <div className="mb-5 border border-frame-orange/25 bg-frame-orange/5 p-3">
            <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
              {t("app.auth.operationalAccess") as string}
            </p>
            <div className="mt-3 grid gap-2">
              {[
                t("app.auth.accessItemProjects") as string,
                t("app.auth.accessItemStudio") as string,
                t("app.auth.accessItemDelivery") as string,
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[0.72rem] text-frame-gray-light">
                  <CheckCircle2 className="h-3.5 w-3.5 text-frame-orange" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <AuthField label={t("app.auth.email")}>
            <input
              type="email"
              placeholder={t("app.auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyPress}
              className="frame-input"
            />
          </AuthField>

          <AuthField label={t("app.auth.password")}>
            <input
              type="password"
              placeholder={t("app.auth.passwordPlaceholder")}
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
                {t("app.auth.signingIn")}
              </>
            ) : (
              t("app.auth.accessStudio")
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
            {t("app.auth.loginWithGithub")}
          </button>

          <AuthLink>
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => setLocation("/register")}
              className="text-frame-orange bg-transparent border-none font-inherit"
            >
              {t("app.auth.createFreeAccount")}
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
