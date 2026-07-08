import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Cena Studio <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(RESEND_API_KEY);

let client: Resend | null = null;
function getClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada. Envio de email está desabilitado.");
  }
  if (!client) {
    client = new Resend(RESEND_API_KEY);
  }
  return client;
}

export interface EmailAttachment {
  /** File name shown to the recipient, e.g. "reuniao.ics" */
  filename: string;
  /** Raw file content */
  content: Buffer | string;
  /** MIME type, e.g. "text/calendar" */
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

/**
 * Sends an email via Resend. Callers should treat failures as non-fatal
 * for the primary action (e.g. a meeting is still created even if the
 * confirmation email fails) — log/store the error and let the UI show
 * a fallback (like the WhatsApp link) instead of throwing.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string | null }> {
  if (!isEmailConfigured) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(error.message || "Falha ao enviar email via Resend.");
  }

  return { id: data?.id ?? null };
}
