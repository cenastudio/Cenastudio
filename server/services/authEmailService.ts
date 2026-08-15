import { SITE_CONFIG } from "@shared/site";
import { sendEmail } from "./emailService.js";
import {
  renderTransactionalEmail,
  type TransactionalEmailLocale,
} from "./transactionalEmail.js";

export type AuthEmailLocale = TransactionalEmailLocale;

function firstName(name: string | null | undefined, locale: AuthEmailLocale) {
  const value = name?.trim().split(/\s+/)[0];
  return value || (locale === "en" ? "there" : "por aí");
}

export async function sendAccountCreatedEmail(input: {
  to: string;
  name: string | null | undefined;
  locale: AuthEmailLocale;
  planId: "pro" | "studio";
  appUrl: string;
}) {
  const name = firstName(input.name, input.locale);
  const studioPending = input.planId === "studio";
  const copy = input.locale === "en"
    ? {
      subject: `Your ${SITE_CONFIG.brandName} account is ready`,
      eyebrow: "Account ready",
      title: "Welcome to a better production rhythm.",
      greeting: `Hi ${name},`,
      messages: [studioPending
        ? "Your account is ready. Complete payment to activate the Studio plan."
        : "Your account is ready with 14 days of Pro access to start your first workflow."],
      action: "Open Cena Studio",
      safety: "If you did not create this account, contact support immediately.",
    }
    : {
      subject: `Sua conta ${SITE_CONFIG.brandName} está pronta`,
      eyebrow: "Conta pronta",
      title: "Bem-vinda ao ritmo da sua produtora.",
      greeting: `Olá, ${name}.`,
      messages: [studioPending
        ? "Sua conta está pronta. Conclua o pagamento para ativar o plano Produtora."
        : "Sua conta está pronta com 14 dias de acesso Pro para iniciar seu primeiro fluxo."],
      action: "Abrir o Cena Studio",
      safety: "Se você não criou esta conta, entre em contato com o suporte imediatamente.",
    };

  return sendEmail({
    to: input.to,
    subject: copy.subject,
    ...renderTransactionalEmail({
      locale: input.locale,
      eyebrow: copy.eyebrow,
      title: copy.title,
      greeting: copy.greeting,
      paragraphs: copy.messages,
      action: { label: copy.action, url: input.appUrl },
      safetyNote: copy.safety,
    }),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  locale: AuthEmailLocale;
  resetUrl: string;
}) {
  const copy = input.locale === "en"
    ? {
      subject: `Password reset — ${SITE_CONFIG.brandName}`,
      eyebrow: "Account security",
      title: "Create a new password.",
      messages: ["We received a request to reset your password."],
      action: "Create a new password",
      safety: "This link expires in 1 hour. If you did not request it, ignore this email.",
    }
    : {
      subject: `Redefinição de senha — ${SITE_CONFIG.brandName}`,
      eyebrow: "Segurança da conta",
      title: "Crie uma nova senha.",
      messages: ["Recebemos uma solicitação para redefinir sua senha."],
      action: "Criar nova senha",
      safety: "Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.",
    };

  return sendEmail({
    to: input.to,
    subject: copy.subject,
    ...renderTransactionalEmail({
      locale: input.locale,
      eyebrow: copy.eyebrow,
      title: copy.title,
      paragraphs: copy.messages,
      action: { label: copy.action, url: input.resetUrl },
      safetyNote: copy.safety,
    }),
  });
}

export async function sendPasswordChangedEmail(input: {
  to: string;
  locale: AuthEmailLocale;
  appUrl: string;
}) {
  const copy = input.locale === "en"
    ? {
      subject: `Your password was changed — ${SITE_CONFIG.brandName}`,
      eyebrow: "Account security",
      title: "Your password was changed.",
      messages: ["Your password was changed successfully."],
      action: "Open Cena Studio",
      safety: "If this was not you, reset your password immediately and contact support.",
    }
    : {
      subject: `Sua senha foi alterada — ${SITE_CONFIG.brandName}`,
      eyebrow: "Segurança da conta",
      title: "Sua senha foi alterada.",
      messages: ["Sua senha foi alterada com sucesso."],
      action: "Abrir o Cena Studio",
      safety: "Se não foi você, redefina sua senha imediatamente e entre em contato com o suporte.",
    };

  return sendEmail({
    to: input.to,
    subject: copy.subject,
    ...renderTransactionalEmail({
      locale: input.locale,
      eyebrow: copy.eyebrow,
      title: copy.title,
      paragraphs: copy.messages,
      action: { label: copy.action, url: input.appUrl },
      safetyNote: copy.safety,
    }),
  });
}
