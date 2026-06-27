import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";

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
    <div className="cinematic-theme min-h-screen flex flex-col lg:flex-row bg-frame-black text-frame-white">
      {/* Left panel — cinematic reel */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-end p-14 overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#1a0800] to-[#0d0d0d]">
        <div className="absolute inset-0 flex flex-wrap gap-0.5 p-0.5 opacity-10">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 min-w-[60px] h-20 bg-gradient-to-br from-[#222] to-[#111] border border-[#2a2a2a] rounded-sm animate-pulse"
              style={{ animationDelay: `${(i % 8) * 0.3}s`, animationDuration: "3s" }}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,77,0,0.02) 4px, rgba(255,77,0,0.02) 5px)",
          }}
        />
        <div className="relative z-10">
          <BrandLogo className="scale-[1.45] origin-left" />
          <p className="mt-2.5 text-sm text-frame-gray-light font-light max-w-[310px] leading-relaxed">
            Plataforma operacional audiovisual feita por filmmakers, para filmmakers.
          </p>
          <div className="mt-7 flex flex-col gap-2">
            {["12 ferramentas IA especializadas", "Trial Pro de 14 dias grátis", "Workflow profissional"].map(
              (feat) => (
                <div key={feat} className="flex items-center gap-2 text-[0.78rem] text-frame-gray-light">
                  <span className="text-frame-orange shrink-0">▸</span>
                  {feat}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-9 py-11 bg-frame-black">
        <div className="w-full max-w-[430px] border border-frame-gray-3 bg-frame-gray-1/45 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          {mode && (
            <div className="flex mb-8 border border-frame-gray-3">
              <button
                type="button"
                onClick={() => setLocation("/login")}
                className={`flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition-all ${
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
                className={`flex-1 py-2.5 font-frame-mono text-[0.63rem] tracking-[0.12em] uppercase transition-all ${
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
