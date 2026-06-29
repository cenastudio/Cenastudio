import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClientFormFields, { type ClientFormData, defaultClientData } from "@/components/ClientFormFields";
import { toast } from "sonner";

function EditClientContent() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [, params] = useRoute("/clients/:id/editar");
  const clientId = params?.id;
  const [data, setData] = useState<ClientFormData>({ ...defaultClientData });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/clients/${clientId}`, { credentials: "include" })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          const c = result.data.client ?? result.data;
          setData({
            name: c.name || "",
            company: c.company || "",
            email: c.email || "",
            phone: c.phone || "",
            segment: c.segment || "direct",
            status: c.status || "lead",
            notes: c.notes || "",
            address: c.address || "",
            city: c.city || "",
            state: c.state || "",
            country: c.country || "",
            website: c.website || "",
            linkedin: c.linkedin || "",
            instagram: c.instagram || "",
            industry: c.industry || "",
            companySize: c.company_size || "",
            annualRevenue: c.annual_revenue?.toString() || "",
            contactPerson: c.contact_person || "",
            contactRole: c.contact_role || "",
            billingCycle: c.billing_cycle || "",
            paymentMethod: c.payment_method || "",
            taxId: c.tax_id || "",
            totalSpent: c.total_spent?.toString() || "",
          });
        } else {
          setError(result.error || t("app.errors.notFound") as string);
        }
      })
      .catch(() => setError(t("app.errors.generic") as string))
      .finally(() => setIsLoading(false));
  }, [clientId]);

  const handleChange = (field: keyof ClientFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim() || !clientId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
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
        toast.success(t("app.clients.clientUpdated") as string);
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

  const handleDelete = async () => {
    if (!clientId) return;
    if (!confirm(t("app.common.confirmDelete") as string)) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        toast.success(t("app.clients.clientDeleted") as string);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-frame-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4">
        <p className="text-frame-red font-frame-mono text-sm">{error}</p>
        <button type="button" onClick={() => setLocation("/clients")} className="frame-btn-ghost">{t("app.common.goBack") as string}</button>
      </div>
    );
  }

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
        <p className="frame-label mb-2">// {t("app.clients.editClient") as string}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">{t("app.clients.editClient") as string}</h1>
        <form onSubmit={handleSubmit} className="border border-frame-gray-3 bg-frame-gray-1/10 p-6">
          <ClientFormFields data={data} onChange={handleChange} disabled={isSubmitting} />
          <div className="flex gap-3 mt-6 pt-4 border-t border-frame-gray-3">
            <button type="button" onClick={() => setLocation("/clients")} disabled={isSubmitting} className="frame-btn-ghost flex-1">
              {t("app.common.cancel") as string}
            </button>
            <button type="submit" disabled={isSubmitting || !data.name.trim()} className="frame-btn-primary flex-1">
              {isSubmitting ? t("app.common.loading") as string : t("app.common.saveChanges") as string}
            </button>
          </div>
        </form>
        <div className="mt-6 pt-6 border-t border-frame-gray-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="frame-btn-ghost text-frame-red border-frame-red/30 hover:border-frame-red hover:text-frame-red flex items-center gap-2"
          >
            {t("app.common.delete") as string}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditClient() {
  return (
    <ProtectedRoute>
      <EditClientContent />
    </ProtectedRoute>
  );
}
