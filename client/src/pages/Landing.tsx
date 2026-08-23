import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Navigation from "@/components/landing/Navigation";
import PricingSection from "@/components/landing/PricingSection";
import ToolsSection from "@/components/landing/ToolsSection";
import ProductProofSection from "@/components/landing/ProductProofSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { CheckoutModal } from "@/components/landing/modals/CheckoutModal";
import { ContactModal } from "@/components/landing/modals/ContactModal";
import { DemoModal } from "@/components/landing/modals/DemoModal";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, BriefcaseBusiness, Clapperboard, FileCheck2, FolderKanban, PackageCheck } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

const OPERATING_STAGES = [
  { label: "Comercial", detail: "Lead, proposta e interação", icon: BriefcaseBusiness },
  { label: "Projeto", detail: "Briefing, orçamento e hub", icon: FolderKanban },
  { label: "Produção", detail: "Shot list, IA e arquivos", icon: Clapperboard },
  { label: "Aprovação", detail: "Cliente, versões e aceite", icon: FileCheck2 },
  { label: "Entrega", detail: "Portal, arquivos e reunião", icon: PackageCheck },
];

function LandingOperatingMap() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <section className="border-y border-white/10 bg-frame-gray-1/20 py-8 sm:py-10">
      <div className="landing-shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:items-end">
          <div className="min-w-0">
            <p className="landing-eyebrow mb-3">Mapa operacional</p>
            <h2 className="landing-heading text-[clamp(2rem,4vw,3.8rem)]">A promessa vira tela guiada.</h2>
            <p className="landing-copy mt-4 max-w-[520px]">
              O Cena organiza o caminho inteiro: vender, preparar, produzir, aprovar, entregar e medir.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {OPERATING_STAGES.map(({ label, detail, icon: Icon }, index) => (
              <div key={label} className="min-h-[138px] min-w-0 border border-white/12 bg-black/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-frame-mono text-[0.52rem] uppercase tracking-[0.14em] text-frame-orange">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
                </div>
                <strong className="mt-5 block text-sm text-frame-white">{label}</strong>
                <span className="mt-2 block text-xs leading-snug text-frame-gray-light">{detail}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLocation("/register")}
          className="mt-6 inline-flex min-h-11 items-center gap-2 border border-frame-orange/40 bg-frame-orange/10 px-4 text-sm font-semibold text-frame-orange transition hover:border-frame-orange hover:bg-frame-orange hover:text-frame-black"
        >
          {t("app.landing.hero.cta") as string}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function Landing() {
  const { modals } = useApp();
  const search = useSearch();
  const [, setLocation] = useLocation();

  // Capture referral code from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(search);
    const ref = params.get('ref');

    if (ref) {
      // Store referral code in sessionStorage for registration
      sessionStorage.setItem('referralCode', ref);
      console.log('[Referral] Code captured:', ref);
    }
  }, [search]);

  return (
    <div className="cena-landing min-h-screen overflow-x-hidden bg-frame-black">
      <Navigation />
      <Hero />
      <LandingOperatingMap />
      <ProductProofSection />
      <ToolsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
      {modals.contact && <ContactModal />}
      {modals.checkout && <CheckoutModal />}
      {modals.demo && <DemoModal />}
    </div>
  );
}
