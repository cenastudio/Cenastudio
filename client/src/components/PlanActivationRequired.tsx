import { useAuth } from "@/contexts/AuthContext";
import { startCheckout } from "@/lib/api";
import { translate } from "@/contexts/LanguageContext";
import { CreditCard, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function PlanActivationRequired() {
  const { logout } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);

  const activate = async () => {
    setCheckingOut(true);
    try {
      await startCheckout("studio");
    } catch (error) {
      const locale = (localStorage.getItem("language") as "pt" | "en") || "pt";
      toast.error(error instanceof Error ? error.message : translate(locale, "app.errors.openPayment"));
      setCheckingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-frame-black text-frame-white">
      <header className="h-[72px] border-b border-frame-gray-3">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5 lg:px-10">
          <span className="font-frame-mono text-xs uppercase">
            Cena <span className="text-frame-orange">Studio</span>
          </span>
          <button type="button" onClick={() => void logout()} className="frame-btn-ghost inline-flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1200px] items-center gap-10 px-5 py-12 lg:grid-cols-[1fr_360px] lg:px-10">
        <section>
          <p className="frame-label mb-4">// Ativação da produtora</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
            Seu espaço está criado. Falta ativar a operação.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-frame-gray-light">
            O plano Produtora libera clientes ilimitados, equipe, arquivos e aprovações compartilhadas somente após a confirmação segura do pagamento.
          </p>
        </section>

        <aside className="border border-frame-gray-3 bg-frame-gray-1/50 p-6">
          <ShieldCheck className="h-8 w-8 text-frame-orange" />
          <p className="mt-5 font-frame-mono text-[0.65rem] uppercase text-frame-orange">Plano Produtora</p>
          <p className="mt-2 text-sm leading-6 text-frame-gray-light">
            Sua conta e seus dados estão preservados enquanto a assinatura aguarda ativação.
          </p>
          <button
            type="button"
            onClick={() => void activate()}
            disabled={checkingOut}
            className="frame-btn-primary mt-6 inline-flex w-full items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            {checkingOut ? "Abrindo pagamento" : "Ativar plano"}
          </button>
        </aside>
      </div>
    </main>
  );
}
