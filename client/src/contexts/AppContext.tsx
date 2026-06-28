import React, { createContext, useCallback, useContext, useState } from "react";
import { api, redirectToStripe } from "@/lib/api";
import { toStripePlanId } from "@/lib/plans";
import type { AppContextType, CheckoutFormData, ContactFormData } from "@/lib/types";
import type { PlanTier } from "@shared/site";
import { toast } from "sonner";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [modals, setModals] = useState({
    checkout: false,
    contact: false,
    demo: false,
  });

  const openModal = useCallback((modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: false }));
  }, []);

  const submitContact = useCallback(
    async (data: ContactFormData) => {
      setIsLoading(true);
      try {
        const result = await api.contact.submit(data);
        toast.success(result.message);
        closeModal("contact");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [closeModal],
  );

  const submitCheckout = useCallback(
    async (data: CheckoutFormData) => {
      setIsLoading(true);
      try {
        const stripePlanId = toStripePlanId(data.planId);
        if (!stripePlanId) {
          toast.error("Plano inválido.");
          return;
        }
        const { url } = await api.checkout.session(stripePlanId);
        closeModal("checkout");
        redirectToStripe(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao processar checkout");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [closeModal],
  );

  const submitDemo = useCallback(
    async (data: { email: string; name: string }) => {
      setIsLoading(true);
      try {
        const result = await api.contact.demo(data);
        toast.success(result.message);
        closeModal("demo");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao agendar demo");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [closeModal],
  );

  const value: AppContextType = {
    isLoading,
    selectedPlan,
    modals,
    selectPlan: setSelectedPlan,
    openModal,
    closeModal,
    submitContact,
    submitCheckout,
    submitDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
