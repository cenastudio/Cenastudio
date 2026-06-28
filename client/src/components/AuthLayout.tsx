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
      <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] flex-col justify-end p-14">
        <div className="landing-glow-orbit -left-36 top-12" />
        <div className="absolute inset-10 border border-[var(--border)]/60 bg-[var(--frame-orange-bg)] backdrop-blur-sm" />
        <div className="auth-panel absolute left-20 right-20 top-[42%] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-frame-gray-3 pb-3">
            <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">Operação ao vivo</span>
            <span className="h-2 w-2 bg-frame-orange" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["08", "Jobs"],
              ["12", "Docs"],
              ["03", "Reviews"],
            ].map(([value, label]) => (
              <div key={label} className="border border-frame-gray-3 p-3">
                <p className="font-frame-display text-3xl leading-none text-frame-white">{value}</p>
                <p className="mt-1 font-frame-mono text-[0.52rem] uppercase tracking-[0.14em] text-frame-gray-light">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold leading-none text-frame-white">Cena</span>
            <span className="font-frame-mono text-[0.72rem] uppercase tracking-[0.22em] text-frame-orange">Studio</span>
          </div>
          <p className="mt-2.5 text-sm text-frame-gray-light font-light max-w-[330px] leading-relaxed">
            Plataforma operacional audiovisual feita por filmmakers, para filmmakers.
          </p>
          <div className="mt-7 grid gap-2">
            {["IA aplicada ao fluxo de produção", "Trial Pro de 14 dias grátis", "Workflow profissional"].map(
              (feat) => (
                <div key={feat} className="landing-pill w-fit">
                  <span className="h-1.5 w-1.5 bg-frame-orange" />
                  {feat}
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
