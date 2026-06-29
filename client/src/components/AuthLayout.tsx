import { useLocation } from "wouter";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** login | register toggle */
  mode?: "login" | "register";
}

export default function AuthLayout({ title, subtitle, children, mode }: AuthLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="cena-auth cinematic-theme dark min-h-screen flex flex-col lg:flex-row text-frame-white">
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] items-center p-14 xl:p-20">
        <div className="landing-glow-orbit -left-36 top-12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_38%,rgba(232,80,2,0.2),transparent_34%)]" />
        <div className="relative z-10 max-w-[520px]">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold leading-none text-frame-white">Cena</span>
            <span className="font-frame-mono text-[0.72rem] uppercase tracking-[0.22em] text-frame-orange">Studio</span>
          </div>
          <h1 className="mt-10 max-w-[480px] font-frame-body text-[clamp(3.2rem,5vw,5.7rem)] font-light leading-[0.94] tracking-normal text-frame-white">
            Seu estúdio pronto para operar.
          </h1>
          <p className="mt-6 max-w-[430px] text-base font-light leading-relaxed text-frame-gray-light">
            Projetos, documentos, equipe, arquivos e aprovações entram no mesmo fluxo de produção.
          </p>
          <div className="mt-10 grid gap-4">
            {["Feito por filmmakers, para filmmakers.", "IA aplicada ao fluxo de produção.", "Acesso seguro ao ambiente do estúdio."].map(
              (feat) => (
                <div key={feat} className="flex items-center gap-3 text-sm font-light text-frame-gray-light">
                  <span className="h-1.5 w-1.5 shrink-0 bg-frame-orange" />
                  <span>{feat}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-9 py-11">
        <div className="auth-panel w-full max-w-[430px] p-6 sm:p-8">
          {mode && (
            <div className="mb-8 flex border border-frame-gray-3 bg-frame-gray-1/30 p-1">
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className={`flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition ${
                  mode === "login"
                    ? "bg-frame-orange text-frame-black"
                    : "bg-transparent text-frame-gray-light hover:text-frame-white"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className={`flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition ${
                  mode === "register"
                    ? "bg-frame-orange text-frame-black"
                    : "bg-transparent text-frame-gray-light hover:text-frame-white"
                }`}
              >
                Criar conta
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light mb-1.5">
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
  message = "Finalizando login...",
}: {
  message?: string;
}) {
  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <div className="auth-loading-stage" aria-hidden="true">
        <div className="auth-loading-orbit auth-loading-orbit-outer" />
        <div className="auth-loading-orbit auth-loading-orbit-inner" />
        <div className="auth-loading-core">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-loading-scan" />
      </div>

      <div className="space-y-1">
        <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.18em] text-frame-orange">
          Autenticando
        </p>
        <p className="text-sm font-light text-frame-cream/75">{message}</p>
      </div>

      <div className="auth-loading-track" aria-hidden="true">
        <div className="auth-loading-runner" />
        <div className="auth-loading-sparks">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
