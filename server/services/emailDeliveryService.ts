import type { Prisma } from "@prisma/client";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { isEmailConfigured, sendEmail } from "./emailService.js";
import { renderTransactionalEmail, type TransactionalEmailLocale } from "./transactionalEmail.js";

export type BillingEmailKind = "subscription_activated" | "payment_failed" | "subscription_cancelled";

interface BillingEmailInput {
  userId: number;
  toEmail: string;
  userName?: string | null;
  planId?: string | null;
  eventId: string;
  kind: BillingEmailKind;
  hostedInvoiceUrl?: string | null;
}

function billingCopy(input: BillingEmailInput) {
  const locale: TransactionalEmailLocale = "pt";
  const plan = input.planId ? input.planId.toUpperCase() : "CENA";
  const greeting = input.userName?.trim() ? `Oi, ${input.userName.trim()}.` : "Oi.";

  if (input.kind === "payment_failed") {
    return {
      locale,
      subject: "Pagamento do Cena Studio precisa de atenção",
      rendered: renderTransactionalEmail({
        locale,
        eyebrow: "Cobranca",
        title: "Seu pagamento nao foi concluido",
        greeting,
        paragraphs: [
          "A Stripe avisou que uma tentativa de pagamento do Cena Studio falhou.",
          "Seu acesso nao e removido automaticamente por este e-mail, mas vale revisar o metodo de pagamento para evitar interrupcao no plano.",
        ],
        details: [{ label: "Plano", value: plan }],
        action: input.hostedInvoiceUrl ? { label: "Revisar pagamento", url: input.hostedInvoiceUrl } : undefined,
        safetyNote: "O Cena Studio nunca pede senha ou codigo de verificacao por e-mail.",
      }),
    };
  }

  if (input.kind === "subscription_cancelled") {
    return {
      locale,
      subject: "Assinatura do Cena Studio cancelada",
      rendered: renderTransactionalEmail({
        locale,
        eyebrow: "Cobranca",
        title: "Sua assinatura foi cancelada",
        greeting,
        paragraphs: [
          "Recebemos a confirmacao de cancelamento da sua assinatura.",
          "O historico da conta continua preservado conforme as regras do plano e das configuracoes de privacidade.",
        ],
        details: [{ label: "Plano", value: plan }],
        safetyNote: "Se voce nao reconhece essa alteracao, responda este e-mail ou fale com o suporte.",
      }),
    };
  }

  return {
    locale,
    subject: "Plano do Cena Studio ativado",
    rendered: renderTransactionalEmail({
      locale,
      eyebrow: "Cobranca",
      title: "Seu plano esta ativo",
      greeting,
      paragraphs: [
        "Pagamento confirmado. Seu plano do Cena Studio foi ativado e os recursos correspondentes ja podem ser usados na conta.",
        "A Stripe continua responsavel pelos recibos fiscais e pela gestao do metodo de pagamento.",
      ],
      details: [{ label: "Plano", value: plan }],
      safetyNote: "Este e-mail confirma acesso ao produto; recibos e notas seguem pela Stripe quando aplicavel.",
    }),
  };
}

export async function sendBillingEmailOnce(input: BillingEmailInput) {
  if (!shouldUsePrisma) return { status: "skipped" as const, reason: "postgres_required" };

  const prepared = billingCopy(input);
  const idempotencyKey = `stripe:${input.eventId}:${input.kind}`;
  const payload: Prisma.InputJsonObject = {
    kind: input.kind,
    planId: input.planId ?? null,
    hostedInvoiceUrl: input.hostedInvoiceUrl ?? null,
  };

  try {
    const delivery = await prisma.emailDelivery.create({
      data: {
        userId: BigInt(input.userId),
        idempotencyKey,
        eventType: `stripe.${input.kind}`,
        template: input.kind,
        toEmail: input.toEmail,
        subject: prepared.subject,
        status: isEmailConfigured ? "queued" : "skipped",
        payload,
        errorMessage: isEmailConfigured ? null : "RESEND_API_KEY ausente.",
      },
    });

    if (!isEmailConfigured) return { status: "skipped" as const, deliveryId: Number(delivery.id) };

    try {
      const sent = await sendEmail({
        to: input.toEmail,
        subject: prepared.subject,
        html: prepared.rendered.html,
        text: prepared.rendered.text,
      });
      const updated = await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "sent",
          providerMessageId: sent.id,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      return { status: "sent" as const, deliveryId: Number(updated.id), providerMessageId: sent.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
      const failed = await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", errorMessage: message },
      });
      return { status: "failed" as const, deliveryId: Number(failed.id), error: message };
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { status: "duplicate" as const };
    }
    throw error;
  }
}
