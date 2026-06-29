import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function CollapsibleSection({
  title,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-frame-gray-3">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-frame-gray-1/20 transition"
      >
        <span className="font-frame-mono text-xs text-frame-orange uppercase tracking-wider">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-frame-gray-light transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  segment: string;
  status: string;
  notes: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  linkedin: string;
  instagram: string;
  industry: string;
  companySize: string;
  annualRevenue: string;
  contactPerson: string;
  contactRole: string;
  billingCycle: string;
  paymentMethod: string;
  taxId: string;
  totalSpent: string;
}

interface ClientFormFieldsProps {
  data: ClientFormData;
  onChange: (field: keyof ClientFormData, value: string) => void;
  disabled?: boolean;
}

export type { ClientFormData };

export const defaultClientData: ClientFormData = {
  name: "", company: "", email: "", phone: "",
  segment: "direct", status: "lead", notes: "",
  address: "", city: "", state: "", country: "",
  website: "", linkedin: "", instagram: "",
  industry: "", companySize: "", annualRevenue: "",
  contactPerson: "", contactRole: "",
  billingCycle: "", paymentMethod: "", taxId: "", totalSpent: "",
};

function StyledInput({ value, onChange, placeholder, disabled, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input type={type} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange" placeholder={placeholder} />
  );
}

function StyledSelect({ value, onChange, disabled, children }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <select disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange">
      {children}
    </select>
  );
}

export default function ClientFormFields({ data, onChange, disabled }: ClientFormFieldsProps) {
  const { t } = useLanguage();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    endereco: false, social: false, empresa: false, contato: false, financeiro: false,
  });
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };
  const f = (field: keyof ClientFormData) => (v: string) => onChange(field, v);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.name") as string} *</label>
        <StyledInput value={data.name} onChange={f("name")} placeholder={t("app.common.clientNamePlaceholder") as string} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.company") as string}</label>
        <StyledInput value={data.company} onChange={f("company")} placeholder={t("app.common.companyNamePlaceholder") as string} disabled={disabled} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.email") as string}</label>
          <StyledInput value={data.email} onChange={f("email")} placeholder={t("app.common.emailPlaceholder") as string} disabled={disabled} />
        </div>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.phone") as string}</label>
          <StyledInput value={data.phone} onChange={f("phone")} placeholder={t("app.common.phonePlaceholder") as string} disabled={disabled} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.segment") as string}</label>
          <StyledSelect value={data.segment} onChange={f("segment")} disabled={disabled}>
            <option value="direct">{t("app.common.segmentDirect") as string}</option>
            <option value="agency">{t("app.common.segmentAgency") as string}</option>
            <option value="brand">{t("app.common.segmentBrand") as string}</option>
          </StyledSelect>
        </div>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.status") as string}</label>
          <StyledSelect value={data.status} onChange={f("status")} disabled={disabled}>
            <option value="lead">{t("app.common.statusLead") as string}</option>
            <option value="active">{t("app.common.statusActive") as string}</option>
            <option value="inactive">{t("app.common.statusInactive") as string}</option>
          </StyledSelect>
        </div>
      </div>
      <CollapsibleSection title={t("app.common.address") as string} sectionKey="endereco" expanded={expandedSections.endereco} onToggle={toggleSection}>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.address") as string}</label>
          <StyledInput value={data.address} onChange={f("address")} placeholder={t("app.common.addressPlaceholder") as string} disabled={disabled} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.city") as string}</label>
            <StyledInput value={data.city} onChange={f("city")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.state") as string}</label>
            <StyledInput value={data.state} onChange={f("state")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.country") as string}</label>
            <StyledInput value={data.country} onChange={f("country")} disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title={t("app.common.socialMedia") as string} sectionKey="social" expanded={expandedSections.social} onToggle={toggleSection}>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.website") as string}</label>
            <StyledInput value={data.website} onChange={f("website")} placeholder="https://" disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.linkedin") as string}</label>
            <StyledInput value={data.linkedin} onChange={f("linkedin")} placeholder="https://linkedin.com/" disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.instagram") as string}</label>
            <StyledInput value={data.instagram} onChange={f("instagram")} placeholder="https://instagram.com/" disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title={t("app.common.companyInfo") as string} sectionKey="empresa" expanded={expandedSections.empresa} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.industry") as string}</label>
            <StyledInput value={data.industry} onChange={f("industry")} placeholder={t("app.common.industryPlaceholder") as string} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.companySize") as string}</label>
            <StyledSelect value={data.companySize} onChange={f("companySize")} disabled={disabled}>
              <option value="">{t("app.common.select") as string}</option>
              <option value="1-10">{t("app.common.size1to10") as string}</option>
              <option value="11-50">{t("app.common.size11to50") as string}</option>
              <option value="51-200">{t("app.common.size51to200") as string}</option>
              <option value="201-500">{t("app.common.size201to500") as string}</option>
              <option value="500+">{t("app.common.size500plus") as string}</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.annualRevenue") as string}</label>
            <StyledInput value={data.annualRevenue} onChange={f("annualRevenue")} placeholder="0.00" disabled={disabled} type="number" />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title={t("app.common.mainContact") as string} sectionKey="contato" expanded={expandedSections.contato} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.contactPerson") as string}</label>
            <StyledInput value={data.contactPerson} onChange={f("contactPerson")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.role") as string}</label>
            <StyledInput value={data.contactRole} onChange={f("contactRole")} placeholder={t("app.common.rolePlaceholder") as string} disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title={t("app.common.financial") as string} sectionKey="financeiro" expanded={expandedSections.financeiro} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.contractedValue") as string}</label>
            <StyledInput value={data.totalSpent} onChange={f("totalSpent")} placeholder={t("app.common.contractedValuePlaceholder") as string} disabled={disabled} type="number" />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.billingCycle") as string}</label>
            <StyledSelect value={data.billingCycle} onChange={f("billingCycle")} disabled={disabled}>
              <option value="">{t("app.common.select") as string}</option>
              <option value="monthly">{t("app.common.billingMonthly") as string}</option>
              <option value="quarterly">{t("app.common.billingQuarterly") as string}</option>
              <option value="annual">{t("app.common.billingAnnual") as string}</option>
              <option value="project">{t("app.common.billingPerProject") as string}</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.paymentMethod") as string}</label>
            <StyledSelect value={data.paymentMethod} onChange={f("paymentMethod")} disabled={disabled}>
              <option value="">{t("app.common.select") as string}</option>
              <option value="pix">{t("app.common.paymentPix") as string}</option>
              <option value="bank_transfer">{t("app.common.paymentTransfer") as string}</option>
              <option value="credit_card">{t("app.common.paymentCard") as string}</option>
              <option value="boleto">{t("app.common.paymentBoleto") as string}</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">{t("app.common.taxId") as string}</label>
            <StyledInput value={data.taxId} onChange={f("taxId")} placeholder={t("app.common.taxIdPlaceholder") as string} disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <div className="space-y-2 pt-4 border-t border-frame-gray-3">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.common.notes") as string}</label>
        <textarea disabled={disabled} value={data.notes} onChange={(e) => onChange("notes", e.target.value)}
          className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange resize-none" rows={3} placeholder={t("app.common.notesPlaceholder") as string} />
      </div>
    </div>
  );
}
