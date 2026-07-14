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
import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";

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
