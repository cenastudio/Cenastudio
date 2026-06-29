import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClientFormFields, { type ClientFormData, defaultClientData } from "@/components/ClientFormFields";
import { toast } from "sonner";

function NewClientContent() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [data, setData] = useState<ClientFormData>({ ...defaultClientData });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(), company: data.company.trim() || undefined,
          email: data.email.trim() || undefined, phone: data.phone.trim() || undefined,
          segment: data.segment, status: data.status, notes: data.notes.trim() || undefined,
          address: data.address.trim() || undefined, city: data.city.trim() || undefined,
          state: data.state.trim() || undefined, country: data.country.trim() || undefined,
          website: data.website.trim() || undefined, linkedin: data.linkedin.trim() || undefined,
          instagram: data.instagram.trim() || undefined, industry: data.industry.trim() || undefined,
          company_size: data.companySize.trim() || undefined,
          annual_revenue: data.annualRevenue ? parseInt(data.annualRevenue) : undefined,
          contact_person: data.contactPerson.trim() || undefined,
          contact_role: data.contactRole.trim() || undefined,
          billing_cycle: data.billingCycle.trim() || undefined,
          payment_method: data.paymentMethod.trim() || undefined,
          tax_id: data.taxId.trim() || undefined,
          total_spent: data.totalSpent ? Number(data.totalSpent) : undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(t("app.clients.clientCreated") as string);
        setLocation("/clients");
      } else {
        toast.error(result.error || t("app.errors.generic") as string);
      }
    } catch {
      toast.error(t("app.errors.generic") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          type="button"
          onClick={() => setLocation("/clients")}
          className="flex items-center gap-2 font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase text-frame-gray-light hover:text-frame-white transition bg-transparent border-none mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("app.common.goBack") as string}
        </button>
        <p className="frame-label mb-2">// {t("app.clients.newClient") as string}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{t("app.clients.newClient") as string}</h1>
        <form onSubmit={handleSubmit} className="border border-frame-gray-3 bg-frame-gray-1/10 p-6">
          <ClientFormFields data={data} onChange={handleChange} disabled={isSubmitting} />
          <div className="flex gap-3 mt-6 pt-4 border-t border-frame-gray-3">
            <button type="button" onClick={() => setLocation("/clients")} disabled={isSubmitting} className="frame-btn-ghost flex-1">
              {t("app.common.cancel") as string}
            </button>
            <button type="submit" disabled={isSubmitting || !data.name.trim()} className="frame-btn-primary flex-1">
              {isSubmitting ? t("app.studio.projectSelector.creating") as string : t("app.clients.newClient") as string}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewClient() {
  return (
    <ProtectedRoute>
      <NewClientContent />
    </ProtectedRoute>
  );
}
