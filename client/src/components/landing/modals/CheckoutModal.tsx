import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { startCheckout } from "@/lib/api";
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from "@/lib/constants";
import { toStripePlanId } from "@/lib/plans";
import { MessageCircle, Copy, Check, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export function CheckoutModal() {
  const { modals, closeModal, selectedPlan } = useApp();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isOpen = modals.checkout;

  const planId = selectedPlan ?? "profissional";
  const planLabel = planId === "produtora" ? "Studio" : "Pro";
  const stripePlanId = toStripePlanId(planId);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE(planLabel),
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://wa.me/${WHATSAPP_NUMBER}`);
    setCopied(true);
    toast.success("Número copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStripeCheckout = async () => {
    if (!stripePlanId) {
      toast.error("Plano inválido.");
      return;
    }

    if (!isAuthenticated) {
      closeModal("checkout");
      setLocation("/login");
      toast.message("Entre na sua conta para assinar com segurança.");
      return;
    }

    setIsCheckingOut(true);
    try {
      await startCheckout(stripePlanId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar checkout");
      setIsCheckingOut(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal("checkout")}>
      <DialogContent className="sm:max-w-md bg-frame-gray-2 border border-frame-gray-3">
        <DialogHeader>
          <DialogTitle className="frame-title text-2xl text-frame-white">Adquirir plano {planLabel}</DialogTitle>
          <DialogDescription className="text-frame-gray-light font-light">
            Assine com cartão pelo Stripe ou fale com o time comercial para PIX, transferência ou boleto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="border border-frame-orange/30 bg-frame-orange/[0.05] p-5 text-center space-y-3">
            <CreditCard className="w-9 h-9 text-frame-orange mx-auto" />
            <p className="text-sm text-frame-white font-medium">
              Checkout seguro em modo teste pelo Stripe
            </p>
            <button
              type="button"
              disabled={isCheckingOut}
              onClick={handleStripeCheckout}
              className="inline-flex items-center justify-center gap-2 bg-frame-orange hover:bg-frame-orange/90 disabled:opacity-60 text-frame-black font-semibold px-6 py-3 text-sm transition mt-2 w-full"
            >
              {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {isAuthenticated ? "Assinar com Stripe" : "Entrar para assinar"}
            </button>
          </div>

          <div className="border border-frame-orange/20 bg-frame-orange/[0.03] p-6 text-center space-y-3">
            <MessageCircle className="w-10 h-10 text-frame-orange mx-auto" />
            <p className="text-sm text-frame-white font-medium">
              Prefere PIX, transferência ou boleto?
            </p>
            <p className="text-xs text-frame-gray-light">
              Respondemos em até 2 horas em dias úteis.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-frame-orange hover:bg-frame-orange/90 text-frame-black font-semibold px-6 py-3 text-sm transition mt-2"
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-between border border-frame-gray-3 p-3">
            <span className="text-xs font-frame-mono text-frame-gray-light">{WHATSAPP_NUMBER}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-frame-orange hover:text-frame-white transition p-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-frame-gray-muted text-center font-light">
            Aceitamos PIX, transferência bancária e boleto. Pagamento 100% seguro.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
