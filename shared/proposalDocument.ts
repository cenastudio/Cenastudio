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

function renderProposalDocumentText(value?: string): string {
  return escapeProposalDocumentHtml(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
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
  const rows = input.lines.map((line, index) => `<article class="line-item"><div class="line-kicker">${String(index + 1).padStart(2, "0")} / ${escapeProposalDocumentHtml(text.service)}</div><strong>${escapeProposalDocumentHtml(line.name)}</strong>${line.description ? `<div class="line-description">${renderProposalDocumentText(line.description)}</div>` : ""}<div class="line-meta"><span>${escapeProposalDocumentHtml(text.quantity)} ${line.quantity ?? 1}</span><span>${escapeProposalDocumentHtml(text.unit)} ${line.unitPrice === undefined ? "-" : money(line.unitPrice)}</span><span>${escapeProposalDocumentHtml(text.total)} ${money(line.total)}</span></div></article>`).join("");
  const notes = input.notes ? `<section class="notes"><h2>${locale === "en" ? "Notes and conditions" : "Notas e condicoes"}</h2><div>${renderProposalDocumentText(input.notes)}</div></section>` : "";
  const fields = `${field(text.client, input.recipient.name)}${field(text.company, input.recipient.company)}${field(text.email, input.recipient.email)}${field(text.phone, input.recipient.phone)}${field(text.city, input.recipient.city || input.studio.city)}${field(text.deadline, input.deadline)}${field(text.payment, input.paymentTerms)}${field(text.validity, input.validityDays ? `${input.validityDays} ${text.days}` : undefined)}`;

  return `<!doctype html><html lang="${locale === "en" ? "en" : "pt-BR"}"><head><meta charset="utf-8"><title>${escapeProposalDocumentHtml(input.title)}</title><style>@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;background:#0d0d0d;color:#eee;font-family:Arial,sans-serif}.page{width:210mm;min-height:297mm;margin:auto;padding:13mm 15mm;background:linear-gradient(160deg,#15100d,#0d0d0d 45%,#050505)}.header{display:flex;justify-content:space-between;gap:16px;padding-bottom:13px;border-bottom:3px solid ${primary}}.brand{font-size:25px;font-weight:900;letter-spacing:.05em;color:#fff}.brand span{color:${primary}}.sub,dt{font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#999}.doc{text-align:right}.doc small{display:block;color:#999;font-size:8px;letter-spacing:.12em;text-transform:uppercase}.doc strong{display:block;margin:4px 0;color:${primary};font-size:21px}h1{margin:20px 0 7px;color:#fff;font-size:31px;line-height:1.02}.lead{margin:0;color:#aaa;font-size:12px;line-height:1.45}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:15px 0 0}.field{min-height:45px;padding:8px 9px;background:#151515;border:1px solid #292929}.field dt{margin-bottom:3px}.field dd{margin:0;color:#eee;font-size:10px;font-weight:700;line-height:1.25;overflow-wrap:anywhere}.section{margin-top:18px}.section h2,.notes h2{margin:0 0 9px;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:${primary}}.line-list{display:grid;gap:8px}.line-item{break-inside:avoid;page-break-inside:avoid;background:#141414;border:1px solid #292929;padding:11px 12px}.line-kicker{margin-bottom:6px;color:${primary};font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.line-item strong{display:block;color:#fff;font-size:13px;line-height:1.25}.line-description{margin-top:6px;color:#aaa;font-size:10.5px;line-height:1.48}.line-description p,.notes p{margin:0}.line-description p+p,.notes p+p{margin-top:7px}.line-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.line-meta span{padding:7px 8px;background:#101010;border:1px solid #262626;color:#bdbdbd;font-size:8.5px;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap}.totals{margin:9px 0 0 auto;width:min(100%,280px);border:1px solid #292929}.total-row{display:flex;justify-content:space-between;gap:12px;padding:8px 11px;border-top:1px solid #292929;color:#bbb;font-size:10px}.total-row:first-child{border-top:0}.notes{break-inside:auto;margin-top:11px;padding:11px 12px;border:1px solid #292929;background:#101010}.notes p{color:#aaa;font-size:10.5px;line-height:1.48}.final{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-top:11px;padding:12px 15px;border:1px solid ${primary};background:${primary}1a}.final small{color:${primary};font-size:9px;text-transform:uppercase;letter-spacing:.12em}.final strong{font-size:28px;color:#fff;white-space:nowrap}.terms{margin-top:12px;padding:10px 11px;border:1px solid #292929;color:#aaa;font-size:9.5px;line-height:1.45}.footer{display:flex;justify-content:space-between;gap:24px;margin-top:23px}.sign{width:42%;border-top:1px solid #444;padding-top:8px;text-align:center;color:#999;font-size:9px}@media print{html,body{width:210mm;background:#0d0d0d}.page{margin:0;box-shadow:none}.header,.field,.line-item,.final,.terms,.footer{break-inside:avoid;page-break-inside:avoid}}</style></head><body><main class="page"><header class="header"><div><div class="brand">${escapeProposalDocumentHtml(input.studio.name)}<span>.</span></div><div class="sub">${escapeProposalDocumentHtml(input.studio.legalName || text.document)}</div></div><div class="doc"><small>${text.document}</small><strong>${issuedAt.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}</strong><small>${escapeProposalDocumentHtml(input.studio.city || "")}</small></div></header><h1>${escapeProposalDocumentHtml(input.title)}</h1><p class="lead">${locale === "en" ? "A commercial scope prepared for this project." : "Um escopo comercial preparado para este projeto."}</p><dl class="grid">${fields}</dl><section class="section"><h2>${text.scope}</h2><div class="line-list">${rows}</div><div class="totals"><div class="total-row"><span>${text.subtotal}</span><strong>${money(input.subtotal)}</strong></div>${input.discount ? `<div class="total-row"><span>${text.discount}</span><strong>-${money(input.discount)}</strong></div>` : ""}</div>${notes}<div class="final"><div><small>${text.investment}</small></div><strong>${money(input.total)}</strong></div></section><div class="terms">${text.terms} ${input.validityDays ?? 15} ${text.days}.</div><footer class="footer"><div class="sign">${text.prepared}<br>${escapeProposalDocumentHtml(input.studio.signature || input.studio.email || input.studio.name)}</div><div class="sign">${text.to}<br>${escapeProposalDocumentHtml(input.recipient.name || input.recipient.company || "")}</div></footer></main></body></html>`;
}
