import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Navigation from "@/components/landing/Navigation";
import PricingSection from "@/components/landing/PricingSection";
import ToolsSection from "@/components/landing/ToolsSection";
import ProductProofSection from "@/components/landing/ProductProofSection";
import ObjectionsSection from "@/components/landing/ObjectionsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { CheckoutModal } from "@/components/landing/modals/CheckoutModal";
import { ContactModal } from "@/components/landing/modals/ContactModal";
import { DemoModal } from "@/components/landing/modals/DemoModal";
import { useApp } from "@/contexts/AppContext";
import { useEffect } from "react";

export default function Landing() {
  const { modals } = useApp();

  // Force dark theme for landing page
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#0a0a0a';

    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="cena-landing min-h-screen overflow-x-hidden bg-frame-black">
      <Navigation />
      <Hero />
      <ProductProofSection />
      <ToolsSection />
      <ObjectionsSection />
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
