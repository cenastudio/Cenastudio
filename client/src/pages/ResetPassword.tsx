import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

export default function ResetPassword() {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const token = useMemo(() => getTokenFromUrl(), []);

  const handleSubmit = async () => {
    if (!token) {
      setError(t("app.errors.invalidToken"));
      return;
    }
    if (password.length < 8) {
      setError(t("app.errors.passwordMinChars"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("app.errors.passwordsDontMatch"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, password);
      toast.success(t("app.auth.passwordResetSuccess"));
      setLocation("/login");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("app.auth.passwordResetError");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title={t("app.auth.invalidLink")} subtitle={t("app.auth.invalidLinkSubtitle")}>
        <AuthError message={t("app.errors.invalidTokenMessage")} />
        <button
          type="button"
          onClick={() => setLocation("/forgot-password")}
          className="frame-btn-primary w-full"
        >
          {t("app.auth.requestNewLink")}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("app.auth.newPassword")} subtitle={t("app.auth.newPasswordSubtitle")}>
      {error && <AuthError message={error} />}
      <AuthField label={t("app.auth.newPassword")}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="frame-input"
        />
      </AuthField>
      <AuthField label={t("app.auth.confirmPassword")}>
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
            {t("app.auth.saving")}
          </>
        ) : (
          t("app.auth.resetPassword")
        )}
      </button>
      <AuthLink>
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="text-frame-orange bg-transparent border-none font-inherit"
        >
          {t("app.auth.backToLogin")}
        </button>
      </AuthLink>
    </AuthLayout>
  );
}
