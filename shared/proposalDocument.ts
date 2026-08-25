export type ProposalDocumentLocale = "pt" | "en";

export interface ProposalDocumentLine {
  name: string;
  description?: string;
  quantity?: number;
  /** Monetary value in cents. */
  unitPrice?: number;
  /** Monetary value in cents. */
  total: number;
}

export interface ProposalDocumentInput {
  locale: ProposalDocumentLocale;
  currency: string;
  title: string;
  studio: { name: string; legalName?: string; email?: string; signature?: string; city?: string; primaryColor?: string };
  recipient: { name?: string; company?: string; email?: string; phone?: string; city?: string };
  lines: ProposalDocumentLine[];
  /** Monetary value in cents. */
  subtotal: number;
  /** Monetary value in cents. */
  discount?: number;
  /** Monetary value in cents. */
  total: number;
  deadline?: string;
  paymentTerms?: string;
  validityDays?: number;
  notes?: string;
  issuedAt?: Date;
}

const DEFAULT_PRIMARY = "#e85002";

export function escapeProposalDocumentHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

export function formatProposalDocumentCurrency(cents: number, currency: string, locale: ProposalDocumentLocale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
    style: "currency", currency,
  }).format(cents / 100);
}

export function proposalMoneyToCents(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function renderProposalDocument(input: ProposalDocumentInput): string {
  const locale = input.locale;
  const text = locale === "en"
    ? { document: "Commercial proposal", scope: "Scope", client: "Client", company: "Company", email: "Email", phone: "Phone", city: "City", deadline: "Deadline", payment: "Payment", validity: "Validity", service: "Service", quantity: "Qty.", unit: "Unit", total: "Total", subtotal: "Subtotal", discount: "Discount", investment: "Project investment", terms: "This proposal is valid for", days: "days", prepared: "Prepared by", to: "Prepared for" }
    : { document: "Proposta comercial", scope: "Escopo", client: "Cliente", company: "Empresa", email: "E-mail", phone: "Telefone", city: "Cidade", deadline: "Prazo", payment: "Pagamento", validity: "Validade", service: "Serviço", quantity: "Qtd.", unit: "Unitário", total: "Total", subtotal: "Subtotal", discount: "Desconto", investment: "Investimento do projeto", terms: "Esta proposta é válida por", days: "dias", prepared: "Preparado por", to: "Preparado para" };
  const primary = /^#[0-9a-f]{6}$/i.test(input.studio.primaryColor || "") ? input.studio.primaryColor! : DEFAULT_PRIMARY;
  const issuedAt = input.issuedAt ?? new Date();
  const money = (value: number) => formatProposalDocumentCurrency(value, input.currency, locale);
  const field = (label: string, value?: string) => value ? `<div class="field"><dt>${escapeProposalDocumentHtml(label)}</dt><dd>${escapeProposalDocumentHtml(value)}</dd></div>` : "";
  const rows = input.lines.map((line) => `<tr><td><strong>${escapeProposalDocumentHtml(line.name)}</strong>${line.description ? `<small>${escapeProposalDocumentHtml(line.description)}</small>` : ""}</td><td>${line.quantity ?? 1}</td><td>${line.unitPrice === undefined ? "—" : money(line.unitPrice)}</td><td>${money(line.total)}</td></tr>`).join("");

  return `<!doctype html><html lang="${locale === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8"><title>${escapeProposalDocumentHtml(input.title)}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;background:#0d0d0d;color:#eee;font-family:Arial,sans-serif}.page{width:210mm;min-height:297mm;margin:auto;padding:14mm 16mm;background:linear-gradient(160deg,#15100d,#0d0d0d 45%,#050505)}.header{display:flex;justify-content:space-between;gap:16px;padding-bottom:15px;border-bottom:3px solid ${primary}}.brand{font-size:26px;font-weight:900;letter-spacing:.05em;color:#fff}.brand span{color:${primary}}.sub,dt,th{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#999}.doc{text-align:right}.doc strong{display:block;margin:4px 0;color:${primary};font-size:22px}h1{margin:26px 0 7px;color:#fff;font-size:34px;line-height:1}.lead{color:#aaa;line-height:1.45}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:18px 0}.field{padding:9px 11px;background:#151515;border:1px solid #292929}.field dt{margin-bottom:3px}.field dd{margin:0;color:#eee;font-size:11px;font-weight:700;line-height:1.25}.section{margin-top:22px}.section h2{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:${primary}}table{width:100%;border-collapse:collapse;background:#141414;border:1px solid #292929}th{padding:9px;text-align:left;background:#1b1b1b}td{padding:9px;border-top:1px solid #292929;font-size:11px;color:#ddd;vertical-align:top;line-height:1.25}td:nth-child(2){text-align:center}td:nth-child(3),td:nth-child(4){text-align:right;white-space:nowrap}td small{display:block;color:#999;margin-top:3px;line-height:1.25}.totals{margin:10px 0 0 auto;width:min(100%,300px);border:1px solid #292929}.total-row{display:flex;justify-content:space-between;padding:9px 12px;border-top:1px solid #292929;color:#bbb}.total-row:first-child{border-top:0}.final{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-top:12px;padding:14px 16px;border:1px solid ${primary};background:${primary}1a}.final .lead{margin:8px 0 0;font-size:10px;line-height:1.35}.final strong{font-size:28px;color:#fff;white-space:nowrap}.terms{margin-top:16px;padding:12px;border:1px solid #292929;color:#aaa;font-size:10px;line-height:1.45}.footer{display:flex;justify-content:space-between;gap:24px;margin-top:30px}.sign{width:42%;border-top:1px solid #444;padding-top:8px;text-align:center;color:#999;font-size:9px}@media print{html,body{width:210mm;background:#0d0d0d}.page{margin:0;box-shadow:none}.header,.field,tr,.final,.terms,.footer{break-inside:avoid;page-break-inside:avoid}}</style></head><body><main class="page"><header class="header"><div><div class="brand">${escapeProposalDocumentHtml(input.studio.name)}<span>.</span></div><div class="sub">${escapeProposalDocumentHtml(input.studio.legalName || text.document)}</div></div><div class="doc"><small>${text.document}</small><strong>${issuedAt.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}</strong><small>${escapeProposalDocumentHtml(input.studio.city || "")}</small></div></header><h1>${escapeProposalDocumentHtml(input.title)}</h1><p class="lead">${locale === "en" ? "A commercial scope prepared for this project." : "Um escopo comercial preparado para este projeto."}</p><dl class="grid">${field(text.client, input.recipient.name)}${field(text.company, input.recipient.company)}${field(text.email, input.recipient.email)}${field(text.phone, input.recipient.phone)}${field(text.city, input.recipient.city || input.studio.city)}${field(text.deadline, input.deadline)}${field(text.payment, input.paymentTerms)}${field(text.validity, input.validityDays ? `${input.validityDays} ${text.days}` : undefined)}</dl><section class="section"><h2>${text.scope}</h2><table><thead><tr><th>${text.service}</th><th>${text.quantity}</th><th>${text.unit}</th><th>${text.total}</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div class="total-row"><span>${text.subtotal}</span><strong>${money(input.subtotal)}</strong></div>${input.discount ? `<div class="total-row"><span>${text.discount}</span><strong>-${money(input.discount)}</strong></div>` : ""}</div><div class="final"><div><small>${text.investment}</small>${input.notes ? `<p class="lead">${escapeProposalDocumentHtml(input.notes)}</p>` : ""}</div><strong>${money(input.total)}</strong></div></section><div class="terms">${text.terms} ${input.validityDays ?? 15} ${text.days}.</div><footer class="footer"><div class="sign">${text.prepared}<br>${escapeProposalDocumentHtml(input.studio.signature || input.studio.email || input.studio.name)}</div><div class="sign">${text.to}<br>${escapeProposalDocumentHtml(input.recipient.name || input.recipient.company || "")}</div></footer></main></body></html>`;
}
