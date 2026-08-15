import { SITE_CONFIG } from "@shared/site";

export type TransactionalEmailLocale = "pt" | "en";

export interface TransactionalEmailAction {
  label: string;
  url: string;
}

export interface TransactionalEmailDetail {
  label: string;
  value: string;
}

export interface TransactionalEmailInput {
  locale: TransactionalEmailLocale;
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  details?: TransactionalEmailDetail[];
  action?: TransactionalEmailAction;
  safetyNote?: string;
  footer?: string;
}

export interface RenderedTransactionalEmail {
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeActionUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function nonEmpty(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

/**
 * Renders the shared, email-client-safe Cena Studio transaction shell.
 * Domain services own the event-specific copy and decide whether an action
 * exists; this layer only accepts plain text and safe absolute URLs.
 */
export function renderTransactionalEmail(input: TransactionalEmailInput): RenderedTransactionalEmail {
  const brand = SITE_CONFIG.brandName;
  const accent = SITE_CONFIG.primaryColor;
  const actionUrl = input.action ? sanitizeActionUrl(input.action.url) : null;
  const paragraphs = nonEmpty(input.paragraphs);
  const details = input.details?.filter((detail) => detail.label.trim() && detail.value.trim()) ?? [];
  const footer = input.footer?.trim() || (input.locale === "en"
    ? `This is a transactional email from ${brand}.`
    : `Este e um e-mail transacional do ${brand}.`);
  const support = SITE_CONFIG.supportEmail.trim();

  const greetingHtml = input.greeting?.trim()
    ? `<p style="margin:0 0 20px;color:#f5f5f5;font-size:16px;line-height:24px;">${escapeHtml(input.greeting.trim())}</p>`
    : "";
  const paragraphHtml = paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;color:#d1d1d1;font-size:16px;line-height:25px;">${escapeHtml(paragraph)}</p>`)
    .join("");
  const detailsHtml = details.length === 0 ? "" : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;border:1px solid #333333;background:#111111;">
      <tbody>
        ${details.map((detail) => `
          <tr>
            <td style="padding:13px 16px;border-bottom:1px solid #292929;color:#a3a3a3;font-size:12px;line-height:18px;letter-spacing:.4px;text-transform:uppercase;">${escapeHtml(detail.label)}</td>
            <td style="padding:13px 16px;border-bottom:1px solid #292929;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;text-align:right;">${escapeHtml(detail.value)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
  const actionHtml = actionUrl && input.action ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 24px;">
      <tr>
        <td bgcolor="${accent}" style="background:${accent};">
          <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 22px;color:#090909;font-family:Arial,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${escapeHtml(input.action.label)}</a>
        </td>
      </tr>
    </table>` : "";
  const safetyHtml = input.safetyNote?.trim()
    ? `<p style="margin:24px 0 0;padding:16px;border-left:3px solid ${accent};background:#111111;color:#bcbcbc;font-size:13px;line-height:20px;">${escapeHtml(input.safetyNote.trim())}</p>`
    : "";
  const supportHtml = support
    ? `<a href="mailto:${escapeHtml(support)}" style="color:#d1d1d1;text-decoration:underline;">${escapeHtml(support)}</a>`
    : escapeHtml(brand);

  const html = `<!doctype html>
<html lang="${input.locale === "en" ? "en" : "pt-BR"}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
  </head>
  <body style="margin:0;padding:0;background:#080808;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#080808;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#171717;border:1px solid #333333;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #333333;">
                <span style="color:#ffffff;font-family:Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-.4px;">${escapeHtml(brand)}</span>
                <span style="color:${accent};font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;margin-left:8px;">STUDIO</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 28px 32px;">
                <p style="margin:0 0 12px;color:${accent};font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;line-height:16px;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</p>
                <h1 style="margin:0 0 24px;color:#ffffff;font-family:Arial,sans-serif;font-size:30px;font-weight:700;letter-spacing:0;line-height:36px;">${escapeHtml(input.title)}</h1>
                ${greetingHtml}
                ${paragraphHtml}
                ${detailsHtml}
                ${actionHtml}
                ${safetyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#101010;border-top:1px solid #333333;color:#8c8c8c;font-family:Arial,sans-serif;font-size:12px;line-height:19px;">
                <p style="margin:0 0 6px;">${escapeHtml(footer)}</p>
                <p style="margin:0;">${supportHtml}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts = [
    brand,
    input.eyebrow.trim(),
    input.title.trim(),
    input.greeting?.trim() || "",
    ...paragraphs,
    ...details.map((detail) => `${detail.label.trim()}: ${detail.value.trim()}`),
    actionUrl && input.action ? `${input.action.label.trim()}: ${actionUrl}` : "",
    input.safetyNote?.trim() || "",
    footer,
    support || "",
  ];

  return { html, text: nonEmpty(textParts).join("\n\n") };
}
