import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, startCheckout } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Register() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const requestedPlan = params.get("plan");
  const desiredPlan = requestedPlan === "studio" ? "studio" : requestedPlan === "pro" ? "pro" : undefined;

  // Capture referral code from URL and store in sessionStorage
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      sessionStorage.setItem('referralCode', ref);
      console.log('[Referral] Code captured from register URL:', ref);
    }
  }, [search]);

  const handleRegister = async () => {
    setInlineError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setInlineError(t("app.errors.fillAllFields"));
      return;
    }
    if (password.length < 8) {
      setInlineError(t("app.errors.passwordMinChars"));
      return;
    }
    if (password !== confirmPassword) {
      setInlineError(t("app.errors.passwordsDontMatch"));
      return;
    }
    setSubmitting(true);
    try {
      // Get referral code from sessionStorage
      const referralCode = sessionStorage.getItem('referralCode') || undefined;

      await register(name.trim(), email.trim(), password, desiredPlan, referralCode);

      // Clear referral code after successful registration
      if (referralCode) {
        sessionStorage.removeItem('referralCode');
      }

      toast.success(
        desiredPlan === "studio"
          ? "Conta criada. Conclua o pagamento para liberar o plano Produtora."
          : t("app.auth.accountCreatedWithTrial"),
      );

      if (desiredPlan) {
        await startCheckout(desiredPlan);
        return;
      }
      setLocation("/tools");
    } catch (error) {
      const msg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t("app.errors.createAccount");
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
    <AuthLayout mode="register" title={t("app.auth.createAccount")} subtitle={t("app.auth.trialIncluded")}>
      {inlineError && <AuthError message={inlineError} />}

      <AuthField label={t("app.auth.name")}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder={t("app.auth.namePlaceholder")}
        />
      </AuthField>

      <AuthField label={t("app.auth.email")}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder={t("app.auth.emailPlaceholder")}
        />
      </AuthField>

      <AuthField label={t("app.auth.password")}>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className="frame-input pr-10"
            placeholder={t("app.auth.passwordMinChars")}
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

      <AuthField label={t("app.auth.confirmPassword")}>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={handleKeyPress}
          className="frame-input"
          placeholder={t("app.auth.repeatPassword")}
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
            {t("app.auth.creatingAccount")}
          </>
        ) : (
          desiredPlan === "studio" ? "Criar conta e ir para pagamento" : t("app.auth.createFreeAccount")
        )}
      </button>

      <AuthLink>
        {t("app.auth.haveAccount")} {" "}
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="text-frame-orange bg-transparent border-none font-inherit"
        >
          {t("app.auth.loginTab")}
        </button>
      </AuthLink>
    </AuthLayout>
  );
}
