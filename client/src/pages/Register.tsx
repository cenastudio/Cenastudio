import AuthLayout, { AuthError, AuthField, AuthLink } from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, startCheckout } from "@/lib/api";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, isStrongPassword, passwordRequirements } from "@/lib/passwordPolicy";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import TurnstileChallenge from "@/components/auth/TurnstileChallenge";

export default function Register() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();

  const params = new URLSearchParams(search);
  const requestedPlan = params.get("plan");
  const desiredPlan = requestedPlan === "studio" ? "studio" : requestedPlan === "pro" ? "pro" : undefined;
  const passwordRules = passwordRequirements(password);
  const passwordIsStrong = isStrongPassword(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  // Capture referral code from URL and store in sessionStorage
  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      sessionStorage.setItem('referralCode', ref);
    }
  }, [search]);

  useEffect(() => {
    api.auth.providers()
      .then((providers) => setTurnstileEnabled(providers.turnstile))
      .catch(() => setTurnstileEnabled(false));
  }, []);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInlineError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setInlineError(t("app.errors.fillAllFields"));
      return;
    }
    if (name.trim().length < 2) {
      setInlineError(t("app.auth.nameMinChars"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setInlineError(t("app.auth.invalidEmail"));
      return;
    }
    if (!passwordIsStrong) {
      setInlineError(t("app.auth.passwordRulesIncomplete"));
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

      await register(name.trim(), email.trim(), password, desiredPlan, referralCode, turnstileToken);

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

  return (
    <AuthLayout
      mode="register"
      title={t("app.auth.createAccount")}
      subtitle={t("app.auth.registerSubtitle")}
      mobileIntent={t("app.auth.registerMobileIntent")}
    >
      <form noValidate onSubmit={handleRegister}>
        {inlineError && <AuthError message={inlineError} />}

        <section className="auth-register-handoff" aria-labelledby="register-handoff-title">
          <div>
            <p className="auth-register-kicker">{t("app.auth.registerHandoffEyebrow")}</p>
            <h3 id="register-handoff-title">{t("app.auth.registerHandoffTitle")}</h3>
          </div>
          <ol>
            {[
              ["app.auth.registerStepAccount", "app.auth.registerStepAccountDesc"],
              ["app.auth.registerStepFirstJob", "app.auth.registerStepFirstJobDesc"],
              ["app.auth.registerStepStudio", "app.auth.registerStepStudioDesc"],
            ].map(([titleKey, descKey], index) => (
              <li key={titleKey}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <strong>{t(titleKey)}</strong>
                  <p>{t(descKey)}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="auth-register-trial">{t("app.auth.trialIncluded")}</p>
        </section>

        <AuthField label={t("app.auth.name")} htmlFor="register-name" className="mb-3">
          <input
            id="register-name"
            autoComplete="name"
            autoCapitalize="words"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            className="frame-input"
            placeholder={t("app.auth.namePlaceholder")}
          />
        </AuthField>

        <AuthField label={t("app.auth.email")} htmlFor="register-email" className="mb-3">
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="frame-input"
            placeholder={t("app.auth.emailPlaceholder")}
          />
        </AuthField>

        <AuthField label={t("app.auth.password")} htmlFor="register-password" className="mb-3">
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="frame-input pr-12"
              placeholder={t("app.auth.passwordPlaceholder")}
              aria-describedby="register-password-rules"
              aria-invalid={password.length > 0 && !passwordIsStrong}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="auth-password-visibility"
              aria-label={showPassword ? t("app.auth.hidePassword") : t("app.auth.showPassword")}
              title={showPassword ? t("app.auth.hidePassword") : t("app.auth.showPassword")}
            >
              {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          <div id="register-password-rules" className="auth-password-rules" aria-live="polite">
            <p>{t("app.auth.passwordRulesHint")}</p>
            <ul>
              {passwordRules.map((rule) => (
                <li key={rule.key} data-met={rule.met || undefined}>
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {t(rule.key)}
                </li>
              ))}
            </ul>
          </div>
        </AuthField>

        <AuthField label={t("app.auth.confirmPassword")} htmlFor="register-confirm-password" className="mb-3">
          <input
            id="register-confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className="frame-input"
            placeholder={t("app.auth.repeatPassword")}
            aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
          />
          {confirmPassword && (
            <p className={`auth-password-match ${passwordsMatch ? "is-valid" : "is-invalid"}`} role="status">
              <Check className="h-3 w-3" aria-hidden="true" />
              {passwordsMatch ? t("app.auth.passwordsMatch") : t("app.auth.passwordsDontMatch")}
            </p>
          )}
        </AuthField>

        <TurnstileChallenge enabled={turnstileEnabled} onTokenChange={setTurnstileToken} />

        <button
          type="submit"
          disabled={submitting || (turnstileEnabled && !turnstileToken)}
          className="frame-btn-primary w-full mt-1.5 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("app.auth.creatingAccount")}
            </>
          ) : (
            desiredPlan === "studio" ? t("app.auth.createAndCheckout") : t("app.auth.createAndStart")
          )}
        </button>

        <AuthLink>
          {t("app.auth.haveAccount")} {" "}
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="auth-text-link"
          >
            {t("app.auth.loginTab")}
          </button>
        </AuthLink>
      </form>
    </AuthLayout>
  );
}
