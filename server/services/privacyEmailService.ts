import { SITE_CONFIG } from "@shared/site";
import { sendEmail } from "./emailService.js";
import {
  renderTransactionalEmail,
  type TransactionalEmailLocale,
} from "./transactionalEmail.js";

export type PrivacyRequestType = "copy" | "correct" | "delete";

function firstName(name: string | null | undefined, locale: TransactionalEmailLocale): string {
  return name?.trim().split(/\s+/)[0] || (locale === "en" ? "there" : "por aí");
}

export async function sendPrivacyRequestReceivedEmail(input: {
  to: string;
  name: string | null | undefined;
  locale: TransactionalEmailLocale;
  type: PrivacyRequestType;
  requestId: string;
  estimatedDays: number;
  appUrl: string;
}) {
  const copy = input.locale === "en" ? {
    subject: `We received your privacy request — ${SITE_CONFIG.brandName}`,
    eyebrow: "Privacy and data",
    title: input.type === "delete" ? "Your deletion request is registered." : "Your privacy request is registered.",
    greeting: `Hi ${firstName(input.name, input.locale)},`,
    message: input.type === "copy"
      ? "We received your request for a copy of your data. We will process it within the applicable period."
      : input.type === "correct"
        ? "We received your request to correct personal data. We will review it within the applicable period."
        : "We received your request to delete your account. The account remains active during the protection period before irreversible anonymization.",
    protocol: "Protocol",
    timing: "Estimated period",
    timingValue: `${input.estimatedDays} days`,
    action: "Open Cena Studio",
    safety: "If you did not make this request, contact support immediately.",
  } : {
    subject: `Recebemos sua solicitação de privacidade — ${SITE_CONFIG.brandName}`,
    eyebrow: "Privacidade e dados",
    title: input.type === "delete" ? "Seu pedido de exclusão foi registrado." : "Sua solicitação de privacidade foi registrada.",
    greeting: `Olá, ${firstName(input.name, input.locale)}.`,
    message: input.type === "copy"
      ? "Recebemos seu pedido de cópia dos dados. Vamos processá-lo dentro do prazo aplicável."
      : input.type === "correct"
        ? "Recebemos seu pedido de correção de dados pessoais. Vamos analisá-lo dentro do prazo aplicável."
        : "Recebemos seu pedido de exclusão da conta. Ela permanece ativa durante o período de proteção antes da anonimização irreversível.",
    protocol: "Protocolo",
    timing: "Prazo estimado",
    timingValue: `${input.estimatedDays} dias`,
    action: "Abrir o Cena Studio",
    safety: "Se não foi você quem fez esta solicitação, entre em contato com o suporte imediatamente.",
  };

  return sendEmail({
    to: input.to,
    subject: copy.subject,
    ...renderTransactionalEmail({
      locale: input.locale,
      eyebrow: copy.eyebrow,
      title: copy.title,
      greeting: copy.greeting,
      paragraphs: [copy.message],
      details: [
        { label: copy.protocol, value: input.requestId },
        { label: copy.timing, value: copy.timingValue },
      ],
      action: { label: copy.action, url: input.appUrl },
      safetyNote: copy.safety,
    }),
  });
}

export async function sendPrivacyRequestResolvedEmail(input: {
  to: string;
  name: string | null | undefined;
  locale: TransactionalEmailLocale;
  type: PrivacyRequestType;
  status: "completed" | "rejected";
  requestId: string;
  appUrl: string;
}) {
  const completed = input.status === "completed";
  const deleted = input.type === "delete";
  const copy = input.locale === "en" ? {
    subject: completed && deleted
      ? `Your ${SITE_CONFIG.brandName} account was deleted`
      : completed
        ? `Your privacy request was completed — ${SITE_CONFIG.brandName}`
        : `Update on your privacy request — ${SITE_CONFIG.brandName}`,
    eyebrow: "Privacy and data",
    title: completed && deleted
      ? "Your account was deleted."
      : completed
        ? "Your request was completed."
        : "Your request was not completed.",
    greeting: `Hi ${firstName(input.name, input.locale)},`,
    message: completed && deleted
      ? "Your account has been irreversibly anonymized and its access credentials are no longer valid. Data that must be retained by law remains dissociated from your identity."
      : completed
        ? "Your privacy request has been processed."
        : "Your privacy request was not completed. Your account remains active.",
    protocol: "Protocol",
    action: "Open Cena Studio",
    safety: completed && deleted
      ? "If you did not request this deletion, contact support immediately."
      : "If you have questions, contact support through your account.",
  } : {
    subject: completed && deleted
      ? `Sua conta ${SITE_CONFIG.brandName} foi excluída`
      : completed
        ? `Sua solicitação de privacidade foi concluída — ${SITE_CONFIG.brandName}`
        : `Atualização sobre sua solicitação de privacidade — ${SITE_CONFIG.brandName}`,
    eyebrow: "Privacidade e dados",
    title: completed && deleted
      ? "Sua conta foi excluída."
      : completed
        ? "Sua solicitação foi concluída."
        : "Sua solicitação não foi concluída.",
    greeting: `Olá, ${firstName(input.name, input.locale)}.`,
    message: completed && deleted
      ? "Sua conta foi anonimizada de forma irreversível e as credenciais de acesso não são mais válidas. Dados que precisam ser retidos por obrigação legal permanecem dissociados da sua identidade."
      : completed
        ? "Sua solicitação de privacidade foi processada."
        : "Sua solicitação de privacidade não foi concluída. Sua conta continua ativa.",
    protocol: "Protocolo",
    action: "Abrir o Cena Studio",
    safety: completed && deleted
      ? "Se você não solicitou esta exclusão, entre em contato com o suporte imediatamente."
      : "Se tiver dúvidas, fale com o suporte pela sua conta.",
  };

  return sendEmail({
    to: input.to,
    subject: copy.subject,
    ...renderTransactionalEmail({
      locale: input.locale,
      eyebrow: copy.eyebrow,
      title: copy.title,
      greeting: copy.greeting,
      paragraphs: [copy.message],
      details: [{ label: copy.protocol, value: input.requestId }],
      action: completed && deleted ? undefined : { label: copy.action, url: input.appUrl },
      safetyNote: copy.safety,
    }),
  });
}
