import { useState } from "react";
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
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">Nome *</label>
        <StyledInput value={data.name} onChange={f("name")} placeholder="Nome do cliente" disabled={disabled} />
      </div>
      <div className="space-y-2">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">Empresa</label>
        <StyledInput value={data.company} onChange={f("company")} placeholder="Nome da empresa" disabled={disabled} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">Email</label>
          <StyledInput value={data.email} onChange={f("email")} placeholder="email@exemplo.com" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">Telefone</label>
          <StyledInput value={data.phone} onChange={f("phone")} placeholder="+55 11 99999-9999" disabled={disabled} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">Segmento</label>
          <StyledSelect value={data.segment} onChange={f("segment")} disabled={disabled}>
            <option value="direct">Direto</option>
            <option value="agency">Agência</option>
            <option value="brand">Marca</option>
          </StyledSelect>
        </div>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">Status</label>
          <StyledSelect value={data.status} onChange={f("status")} disabled={disabled}>
            <option value="lead">Lead</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </StyledSelect>
        </div>
      </div>
      <CollapsibleSection title="Endereço" sectionKey="endereco" expanded={expandedSections.endereco} onToggle={toggleSection}>
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Endereço</label>
          <StyledInput value={data.address} onChange={f("address")} placeholder="Rua, número, complemento" disabled={disabled} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Cidade</label>
            <StyledInput value={data.city} onChange={f("city")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Estado</label>
            <StyledInput value={data.state} onChange={f("state")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">País</label>
            <StyledInput value={data.country} onChange={f("country")} disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Redes Sociais" sectionKey="social" expanded={expandedSections.social} onToggle={toggleSection}>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Website</label>
            <StyledInput value={data.website} onChange={f("website")} placeholder="https://" disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">LinkedIn</label>
            <StyledInput value={data.linkedin} onChange={f("linkedin")} placeholder="https://linkedin.com/" disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Instagram</label>
            <StyledInput value={data.instagram} onChange={f("instagram")} placeholder="https://instagram.com/" disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Informações da Empresa" sectionKey="empresa" expanded={expandedSections.empresa} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Indústria</label>
            <StyledInput value={data.industry} onChange={f("industry")} placeholder="Ex: Produção de Vídeo" disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Tamanho</label>
            <StyledSelect value={data.companySize} onChange={f("companySize")} disabled={disabled}>
              <option value="">Selecione</option>
              <option value="1-10">1-10 funcionários</option>
              <option value="11-50">11-50 funcionários</option>
              <option value="51-200">51-200 funcionários</option>
              <option value="201-500">201-500 funcionários</option>
              <option value="500+">500+ funcionários</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Receita Anual (R$)</label>
            <StyledInput value={data.annualRevenue} onChange={f("annualRevenue")} placeholder="0.00" disabled={disabled} type="number" />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Contato Principal" sectionKey="contato" expanded={expandedSections.contato} onToggle={toggleSection}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Pessoa de Contato</label>
            <StyledInput value={data.contactPerson} onChange={f("contactPerson")} disabled={disabled} />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Cargo</label>
            <StyledInput value={data.contactRole} onChange={f("contactRole")} placeholder="Ex: Diretor de Marketing" disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Financeiro" sectionKey="financeiro" expanded={expandedSections.financeiro} onToggle={toggleSection}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Valor contratado / acumulado (R$)</label>
            <StyledInput value={data.totalSpent} onChange={f("totalSpent")} placeholder="Ex: 800" disabled={disabled} type="number" />
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Ciclo de Cobrança</label>
            <StyledSelect value={data.billingCycle} onChange={f("billingCycle")} disabled={disabled}>
              <option value="">Selecione</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
              <option value="project">Por Projeto</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">Método de Pagamento</label>
            <StyledSelect value={data.paymentMethod} onChange={f("paymentMethod")} disabled={disabled}>
              <option value="">Selecione</option>
              <option value="pix">PIX</option>
              <option value="bank_transfer">Transferência</option>
              <option value="credit_card">Cartão</option>
              <option value="boleto">Boleto</option>
            </StyledSelect>
          </div>
          <div className="space-y-2">
            <label className="block font-frame-mono text-xs text-frame-gray-light uppercase">CNPJ/CPF</label>
            <StyledInput value={data.taxId} onChange={f("taxId")} placeholder="00.000.000/0000-00" disabled={disabled} />
          </div>
        </div>
      </CollapsibleSection>
      <div className="space-y-2 pt-4 border-t border-frame-gray-3">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">Notas</label>
        <textarea disabled={disabled} value={data.notes} onChange={(e) => onChange("notes", e.target.value)}
          className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange resize-none" rows={3} placeholder="Observações sobre o cliente..." />
      </div>
    </div>
  );
}
