import type { PlanTier } from "@shared/site";

export type { PlanTier };
export type Language = "pt" | "en";

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  type: "contact" | "demo" | "support";
}

export interface CheckoutFormData {
  planId: PlanTier;
  fullName: string;
  email: string;
  company?: string;
  phone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  cardNumber: string;
  cardExpiry: string;
  cardCVC: string;
}

export interface AppContextType {
  isLoading: boolean;
  selectedPlan: PlanTier | null;
  modals: {
    checkout: boolean;
    contact: boolean;
    demo: boolean;
  };
  selectPlan: (plan: PlanTier) => void;
  openModal: (modal: keyof AppContextType["modals"]) => void;
  closeModal: (modal: keyof AppContextType["modals"]) => void;
  submitContact: (data: ContactFormData) => Promise<void>;
  submitCheckout: (data: CheckoutFormData) => Promise<void>;
  submitDemo: (data: { email: string; name: string }) => Promise<void>;
}

export interface LandingTranslations {
  navigation: {
    product: string;
    tools: string;
    about: string;
    pricing: string;
    contact: string;
  };
  hero: {
    tag: string;
    title: [string, string, string];
    subtitle: string;
    cta: {
      primary: string;
      secondary: string;
    };
    stats: Array<{ number: string; label: string }>;
  };
  login: string;
  start: string;
  openMenu: string;
  closeMenu: string;
  proof: {
    eyebrow: string;
    heading: string;
    copy: string;
  };
  useCases: {
    eyebrow: string;
    heading: string;
    copy: string;
  };
  workflow: {
    eyebrow: string;
    heading: string;
    copy: string;
  };
  seePlatform: string;
  contact: {
    eyebrow: string;
    heading: string;
    copy: string;
    sendMessage: string;
    scheduleDemo: string;
  };
  footer: {
    platform: string;
    operation: string;
    legal: string;
    support: string;
    realProduct: string;
    studioIA: string;
    files: string;
    videoReview: string;
    about: string;
    flow: string;
    plans: string;
    contact: string;
    terms: string;
    privacy: string;
    cookies: string;
    scheduleDemo: string;
    productCenter: string;
    login: string;
  };
}

export type Translations = LandingTranslations;
