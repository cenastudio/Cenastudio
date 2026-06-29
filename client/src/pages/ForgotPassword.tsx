import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const { t } = useLanguage();

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError(t("app.errors.provideEmail"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("app.errors.sendRequest"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t("app.auth.recoverPassword")} subtitle={t("app.auth.recoverPasswordSubtitle")}>
      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-frame-white">Verifique seu e-mail</p>
          <p className="text-sm text-frame-gray-light font-light">
            Se o e-mail existir em nossa base, você receberá as instruções para redefinir sua senha.
          </p>
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="frame-btn-ghost w-full"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <>
          {error && <AuthError message={error} />}
          <AuthField label={t("app.auth.email")}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="frame-input"
              placeholder={t("app.auth.emailPlaceholder")}
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
                Enviando...
              </>
            ) : (
              t("app.auth.sendInstructions")
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
        </>
      )}
    </AuthLayout>
  );
}
