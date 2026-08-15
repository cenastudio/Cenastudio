import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** login | register toggle */
  mode?: "login" | "register";
}

export default function AuthLayout({ title, subtitle, children, mode }: AuthLayoutProps) {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="cena-auth cinematic-theme dark min-h-screen flex flex-col lg:flex-row text-frame-white">
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] items-center p-14 xl:p-20">
        <div className="relative z-10 max-w-[520px]">
          <div className="flex items-baseline gap-3">
            <BrandLogo tone="onDark" className="text-3xl font-semibold" />
          </div>
          <h1 className="mt-10 max-w-[480px] font-frame-body text-[clamp(3.2rem,5vw,5.7rem)] font-light leading-[0.94] tracking-normal text-frame-white">
            {t("app.auth.studioReadyTitle")}
          </h1>
          <p className="mt-6 max-w-[430px] text-base font-light leading-relaxed text-frame-gray-light">
            {t("app.auth.studioReadyDescription")}
          </p>
          <div className="mt-10 grid gap-4">
            {["app.auth.featureFilmmakers", "app.auth.featureAI", "app.auth.featureSecure"].map(
              (featureKey) => (
                <div key={featureKey} className="flex items-center gap-3 text-sm font-light text-frame-gray-light">
                  <span className="h-1.5 w-1.5 shrink-0 bg-frame-orange" />
                  <span>{t(featureKey)}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-area flex-1 flex flex-col items-center justify-start lg:justify-center px-5 sm:px-9 py-5 lg:py-11">
        <div className="auth-mobile-header lg:hidden">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="auth-home-control"
            aria-label={t("app.auth.backToLanding")}
            title={t("app.auth.backToLanding")}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="auth-mobile-brand"
            aria-label={t("app.auth.backToLanding")}
          >
            <BrandLogo tone="onDark" className="text-[1.55rem] font-semibold" />
          </button>
          <LanguageSwitcher compact />
        </div>

        <div className="auth-desktop-language hidden lg:block">
          <LanguageSwitcher compact />
        </div>

        <div className="auth-panel w-full max-w-[430px] p-6 sm:p-8">
          {mode && (
            <div className="auth-desktop-switch mb-8 hidden border border-frame-gray-3 bg-frame-gray-1/30 p-1 lg:flex">
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className={`min-h-11 flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition ${
                  mode === "login"
                    ? "bg-frame-orange text-frame-black"
                    : "bg-transparent text-frame-gray-light hover:text-frame-white"
                }`}
              >
                {t("app.auth.loginTab")}
              </button>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className={`min-h-11 flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition ${
                  mode === "register"
                    ? "bg-frame-orange text-frame-black"
                    : "bg-transparent text-frame-gray-light hover:text-frame-white"
                }`}
              >
                {t("app.auth.registerTab")}
              </button>
            </div>
          )}

          <h2 className="frame-title text-[2.1rem] text-frame-white mb-1">{title}</h2>
          <p className="text-[0.88rem] text-frame-cream/75 font-light mb-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Shared auth field wrapper */
export function AuthField({
  label,
  children,
  htmlFor,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={htmlFor} className="block font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="mb-3.5 px-3 py-2.5 bg-[rgba(255,59,59,0.1)] border border-[rgba(255,59,59,0.3)] text-frame-red font-frame-mono text-[0.63rem]">
      {message}
    </div>
  );
}

export function AuthLink({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.8rem] text-frame-gray-light text-center mt-4">{children}</p>;
}

export function AuthLoadingAnimation({
  message,
}: {
  message?: string;
}) {
  const { t } = useLanguage();
  const statusMessage = message || t("app.auth.finalizingLogin");

  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <div className="auth-loading-stage" aria-hidden="true">
        <div className="auth-loading-halo" />
        <div className="auth-loading-orbit">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-loading-mark">
          <span className="auth-loading-mark-line" />
          <span className="auth-loading-mark-line" />
          <span className="auth-loading-mark-line" />
        </div>
      </div>

      <div className="space-y-1">
        <p className="auth-loading-label font-frame-mono text-[0.62rem] uppercase tracking-[0.18em] text-frame-orange">
          <span className="auth-loading-live-dot" aria-hidden="true" />
          {t("app.auth.authenticating")}
        </p>
        <p className="text-sm font-light text-frame-cream/75">{statusMessage}</p>
      </div>

      <div className="auth-loading-track" aria-hidden="true">
        <div className="auth-loading-runner" />
      </div>
    </div>
  );
}
