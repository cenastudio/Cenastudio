import { useAuth } from "@/contexts/AuthContext";
import { api, openBillingPortal } from "@/lib/api";
import { SITE_CONFIG } from "@shared/site";
import { motion } from "framer-motion";
import { CheckCircle, CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function getQueryParams() {
  if (typeof window === "undefined") {
    return { plan: null as string | null, sessionId: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    plan: params.get("plan"),
    sessionId: params.get("session_id"),
  };
}

const PLAN_NAMES: Record<string, string> = {
  pro: "Pro",
  studio: "Studio",
  free: "Free",
};

export default function Success() {
  const [, setLocation] = useLocation();
  const { refresh, plan, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { plan: planParam, sessionId } = useMemo(() => getQueryParams(), []);

  useEffect(() => {
    async function confirmCheckout() {
      setLoading(true);
      try {
        if (sessionId && isAuthenticated) {
          setSyncing(true);
          const result = await api.checkout.syncSession(sessionId);
          if (result.synced) {
            toast.success("Assinatura confirmada no Cena Studio.");
          }
        }
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao confirmar assinatura");
        await refresh();
      } finally {
        setSyncing(false);
        setLoading(false);
      }
    }

    void confirmCheckout();
  }, [refresh, sessionId, isAuthenticated]);

  useEffect(() => {
    if (!loading && !sessionId && !planParam) {
      setLocation("/tools");
    }
  }, [loading, sessionId, planParam, setLocation]);

  const planName =
    plan?.planName ?? (planParam ? (PLAN_NAMES[planParam] ?? planParam) : SITE_CONFIG.title);

  const title = sessionId
    ? `Assinatura ativada! Bem-vindo ao plano ${planName}.`
    : "Tudo pronto!";

  const description = sessionId
    ? "Seu pagamento foi confirmado. Você já pode usar todas as ferramentas do seu plano."
    : "Sua solicitação foi processada com sucesso.";

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center">
        <p className="font-frame-mono text-[0.65rem] tracking-[0.15em] uppercase text-frame-gray-light">
          {syncing ? "Sincronizando assinatura..." : "Confirmando assinatura..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center px-8 py-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <CheckCircle size={72} className="text-frame-orange mx-auto" strokeWidth={1.5} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="frame-label mb-3"
        >
          // Sucesso
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="frame-title text-[clamp(2rem,5vw,3.5rem)] text-frame-white mb-4"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-frame-gray-light text-[0.93rem] font-light mb-8 max-w-xl mx-auto leading-relaxed"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setLocation("/tools")}
              className="frame-btn-primary"
            >
              Acessar o studio
            </button>
          ) : (
            <button type="button" onClick={() => setLocation("/login")} className="frame-btn-primary">
              Fazer login
            </button>
          )}
          {isAuthenticated && sessionId && (
            <button
              type="button"
              onClick={() => {
                openBillingPortal().catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Erro ao abrir portal");
                });
              }}
              className="frame-btn-ghost inline-flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Gerenciar cobrança
            </button>
          )}
          <button type="button" onClick={() => setLocation("/")} className="frame-btn-ghost">
            Voltar ao home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
