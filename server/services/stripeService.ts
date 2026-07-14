import Stripe from "stripe";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError("Pagamentos não configurados.", 503);
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
  });
}

function getPriceId(planId: string): string {
  const map: Record<string, string> = {
    pro: process.env.STRIPE_PRICE_PRO ?? "",
    studio: process.env.STRIPE_PRICE_STUDIO ?? "",
  };
  const priceId = map[planId];
  if (!priceId) {
    throw new AppError(`Plano inválido: ${planId}`, 400);
  }
  return priceId;
}

export async function createCheckoutSession(
  userId: number,
  email: string,
  planId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const stripe = getStripe();
  const priceId = getPriceId(planId);

  const success = new URL(successUrl);
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const resolvedSuccessUrl = success.toString().replace(
    "%7BCHECKOUT_SESSION_ID%7D",
    "{CHECKOUT_SESSION_ID}",
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: resolvedSuccessUrl,
    cancel_url: cancelUrl,
    metadata: { userId: String(userId), planId },
    subscription_data: {
      metadata: { userId: String(userId), planId },
    },
  });

  if (!session.url) {
    throw new AppError("Não foi possível iniciar o checkout.", 500);
  }

  return session;
}

interface StripeBillingRecord {
  planId: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

async function getStripeBillingRecord(userId: number): Promise<StripeBillingRecord | null> {
  if (shouldUsePrisma) {
    const uid = BigInt(userId);
    const [current, billing] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId: uid },
        orderBy: { id: "desc" },
        select: { planId: true, status: true, stripeSubscriptionId: true },
      }),
      prisma.subscription.findFirst({
        where: { userId: uid, stripeCustomerId: { not: null } },
        orderBy: { id: "desc" },
        select: { planId: true, status: true, stripeCustomerId: true },
      }),
    ]);
    if (!current && !billing) return null;

    if (billing?.stripeCustomerId) {
      const conflictingOwner = await prisma.subscription.findFirst({
        where: { stripeCustomerId: billing.stripeCustomerId, userId: { not: uid } },
        select: { id: true },
      });
      if (conflictingOwner) {
        throw new AppError("Conta de cobrança inconsistente. Fale com o suporte.", 409);
      }
    }

    return {
      planId: current?.planId || billing?.planId || "free",
      status: current?.status || billing?.status || "inactive",
      stripeCustomerId: billing?.stripeCustomerId || null,
      stripeSubscriptionId: current?.stripeSubscriptionId || null,
    };
  }

  const current = db.prepare(
    `SELECT plan_id, status, stripe_subscription_id
     FROM subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
  ).get(userId) as {
    plan_id: string;
    status: string;
    stripe_subscription_id: string | null;
  } | undefined;
  const billing = db.prepare(
    `SELECT plan_id, status, stripe_customer_id
     FROM subscriptions
     WHERE user_id = ? AND stripe_customer_id IS NOT NULL
     ORDER BY id DESC LIMIT 1`,
  ).get(userId) as {
    plan_id: string;
    status: string;
    stripe_customer_id: string;
  } | undefined;
  if (!current && !billing) return null;

  if (billing?.stripe_customer_id) {
    const conflictingOwner = db.prepare(
      "SELECT id FROM subscriptions WHERE stripe_customer_id = ? AND user_id != ? LIMIT 1",
    ).get(billing.stripe_customer_id, userId);
    if (conflictingOwner) {
      throw new AppError("Conta de cobrança inconsistente. Fale com o suporte.", 409);
    }
  }

  return {
    planId: current?.plan_id || billing?.plan_id || "free",
    status: current?.status || billing?.status || "inactive",
    stripeCustomerId: billing?.stripe_customer_id || null,
    stripeSubscriptionId: current?.stripe_subscription_id || null,
  };
}

export async function getBillingHistory(userId: number) {
  const record = await getStripeBillingRecord(userId);
  if (!record?.stripeCustomerId) {
    return { invoices: [], upcoming: null, totalsByCurrency: {}, canManageBilling: false };
  }

  const stripe = getStripe();
  const customerId = record.stripeCustomerId;
  const paidInvoices = await stripe.invoices.list({ customer: customerId, status: "paid", limit: 24 });
  const invoices = paidInvoices.data.map((invoice) => ({
    id: invoice.id,
    description: invoice.lines.data[0]?.description || `Cena Studio ${record.planId}`,
    status: invoice.status,
    currency: invoice.currency.toUpperCase(),
    amountPaid: invoice.amount_paid,
    paidAt: new Date((invoice.status_transitions.paid_at || invoice.created) * 1000).toISOString(),
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  }));

  let upcoming: {
    description: string;
    currency: string;
    amountDue: number;
    dueAt: string;
  } | null = null;

  if (record.stripeSubscriptionId && ["active", "trial", "trialing"].includes(record.status)) {
    const subscription = await stripe.subscriptions.retrieve(record.stripeSubscriptionId);
    const subscriptionCustomerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const metadataUserId = subscription.metadata?.userId;
    if (subscriptionCustomerId !== customerId || (metadataUserId && Number(metadataUserId) !== userId)) {
      throw new AppError("Assinatura de cobrança inconsistente. Fale com o suporte.", 409);
    }

    const amountDue = subscription.items.data.reduce(
      (sum, item) => sum + (item.price.unit_amount || 0) * (item.quantity || 1),
      0,
    );
    const currency = subscription.items.data[0]?.price.currency || invoices[0]?.currency || "brl";
    upcoming = {
      description: `Cena Studio ${record.planId}`,
      currency: currency.toUpperCase(),
      amountDue,
      dueAt: new Date(subscription.current_period_end * 1000).toISOString(),
    };
  }

  const totalsByCurrency = invoices.reduce<Record<string, number>>((totals, invoice) => {
    totals[invoice.currency] = (totals[invoice.currency] || 0) + invoice.amountPaid;
    return totals;
  }, {});

  return {
    invoices,
    upcoming,
    totalsByCurrency,
    canManageBilling: true,
  };
}

export async function createPortalSession(userId: number, returnUrl: string) {
  const record = await getStripeBillingRecord(userId);
  if (!record?.stripeCustomerId) {
    throw new AppError("Nenhuma assinatura Stripe encontrada.", 404);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: record.stripeCustomerId,
    return_url: returnUrl,
  });

  if (!session.url) {
    throw new AppError("Não foi possível abrir o portal de cobrança.", 500);
  }

  return session;
}

export async function syncCheckoutSession(userId: number, sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const metadataUserId = Number(session.metadata?.userId);
  if (metadataUserId !== userId) {
    throw new AppError("Sessão de checkout não pertence a este usuário.", 403);
  }

  const planId = requireStripePlanId(session.metadata?.planId);

  if (session.status !== "complete" || session.payment_status !== "paid") {
    return {
      synced: false,
      status: session.status,
      paymentStatus: session.payment_status,
      planId,
    };
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (!customerId || !subscription?.id) {
    throw new AppError("Assinatura Stripe incompleta.", 400);
  }

  await persistActiveStripeSubscription({ userId, planId, customerId, subscription });

  return {
    synced: true,
    status: session.status,
    paymentStatus: session.payment_status,
    planId,
  };
}

function requireStripePlanId(value: string | undefined): "pro" | "studio" {
  if (value !== "pro" && value !== "studio") {
    throw new AppError("Plano Stripe ausente ou inválido.", 400);
  }
  return value;
}

function stripeStatus(status: Stripe.Subscription.Status) {
  return status === "canceled" ? "cancelled" : status;
}

async function persistActiveStripeSubscription(input: {
  userId: number;
  planId: "pro" | "studio";
  customerId: string;
  subscription: Stripe.Subscription;
}) {
  const { userId, planId, customerId, subscription } = input;
  const uid = BigInt(userId);
  const periodStart = new Date(subscription.current_period_start * 1000);
  const periodEnd = new Date(subscription.current_period_end * 1000);

  if (shouldUsePrisma) {
    const conflict = await prisma.subscription.findFirst({
      where: {
        userId: { not: uid },
        OR: [
          { stripeSubscriptionId: subscription.id },
          { stripeCustomerId: customerId },
        ],
      },
      select: { id: true },
    });
    if (conflict) throw new AppError("Assinatura Stripe associada a outra conta.", 409);

    const targetWithSameSubscription = await prisma.subscription.findFirst({
      where: { userId: uid, stripeSubscriptionId: subscription.id },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const target = targetWithSameSubscription ?? await prisma.subscription.findFirst({
      where: { userId: uid },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const data = {
      planId,
      status: stripeStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };
    if (target) await prisma.subscription.update({ where: { id: target.id }, data });
    else await prisma.subscription.create({ data: { userId: uid, ...data } });
    return;
  }

  const conflict = db.prepare(
    `SELECT id FROM subscriptions
     WHERE user_id != ? AND (stripe_subscription_id = ? OR stripe_customer_id = ?)
     LIMIT 1`,
  ).get(userId, subscription.id, customerId);
  if (conflict) throw new AppError("Assinatura Stripe associada a outra conta.", 409);

  const target = db.prepare(
    `SELECT id FROM subscriptions
     WHERE user_id = ?
     ORDER BY CASE WHEN stripe_subscription_id = ? THEN 0 ELSE 1 END, id DESC
     LIMIT 1`,
  ).get(userId, subscription.id) as { id: number } | undefined;
  const values = [
    planId,
    stripeStatus(subscription.status),
    customerId,
    subscription.id,
    periodStart.toISOString(),
    periodEnd.toISOString(),
    subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  ];
  if (target) {
    const result = db.prepare(
      `UPDATE subscriptions
       SET plan_id = ?, status = ?, stripe_customer_id = ?, stripe_subscription_id = ?,
           current_period_start = ?, current_period_end = ?, trial_ends_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(...values, target.id, userId);
    if (result.changes !== 1) throw new AppError("Assinatura Stripe não foi persistida.", 500);
  } else {
    const result = db.prepare(
      `INSERT INTO subscriptions (
         user_id, plan_id, status, stripe_customer_id, stripe_subscription_id,
         current_period_start, current_period_end, trial_ends_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, ...values);
    if (result.changes !== 1) throw new AppError("Assinatura Stripe não foi persistida.", 500);
  }
}

async function updatePersistedStripeSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = Number(subscription.metadata?.userId) || null;
  const planId = subscription.metadata?.planId
    ? requireStripePlanId(subscription.metadata.planId)
    : null;
  const periodEnd = new Date(subscription.current_period_end * 1000);

  if (shouldUsePrisma) {
    const current = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, userId: true },
    });
    if (!current) throw new AppError("Assinatura Stripe ainda não persistida.", 409);
    if (metadataUserId && current.userId !== BigInt(metadataUserId)) {
      throw new AppError("Metadata Stripe não corresponde ao proprietário da assinatura.", 409);
    }
    await prisma.subscription.update({
      where: { id: current.id },
      data: {
        status: stripeStatus(subscription.status),
        currentPeriodEnd: periodEnd,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        ...(planId ? { planId } : {}),
      },
    });
    return;
  }

  const current = db.prepare(
    "SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1",
  ).get(subscription.id) as { id: number; user_id: number } | undefined;
  if (!current) throw new AppError("Assinatura Stripe ainda não persistida.", 409);
  if (metadataUserId && current.user_id !== metadataUserId) {
    throw new AppError("Metadata Stripe não corresponde ao proprietário da assinatura.", 409);
  }
  const result = db.prepare(
    `UPDATE subscriptions
     SET status = ?, current_period_end = ?, trial_ends_at = ?, plan_id = COALESCE(?, plan_id)
     WHERE id = ? AND stripe_subscription_id = ?`,
  ).run(
    stripeStatus(subscription.status),
    periodEnd.toISOString(),
    subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    planId,
    current.id,
    subscription.id,
  );
  if (result.changes !== 1) throw new AppError("Atualização Stripe não foi persistida.", 500);
}

/**
 * Best-effort cancellation of a user's active subscription, used by the LGPD
 * erasure flow. Cancels at Stripe when configured and always downgrades the
 * local record to a cancelled free plan. Never throws — data erasure must not
 * be blocked by a billing provider hiccup; failures are reported to the caller.
 */
export async function cancelSubscriptionForErasure(userId: number): Promise<{ stripeCancelled: boolean; error?: string }> {
  let stripeSubscriptionId: string | null = null;
  try {
    if (shouldUsePrisma) {
      const sub = await prisma.subscription.findFirst({
        where: { userId: BigInt(userId), stripeSubscriptionId: { not: null } },
        select: { stripeSubscriptionId: true },
      });
      stripeSubscriptionId = sub?.stripeSubscriptionId ?? null;
    } else {
      const sub = db.prepare(
        "SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND stripe_subscription_id IS NOT NULL LIMIT 1",
      ).get(userId) as { stripe_subscription_id: string } | undefined;
      stripeSubscriptionId = sub?.stripe_subscription_id ?? null;
    }

    let stripeCancelled = false;
    if (stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        await getStripe().subscriptions.cancel(stripeSubscriptionId);
        stripeCancelled = true;
      } catch (err) {
        // Subscription may already be gone at Stripe — proceed with local cleanup.
        return { stripeCancelled: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    // Always downgrade the local record so the erased account keeps no plan.
    if (shouldUsePrisma) {
      await prisma.subscription.updateMany({
        where: { userId: BigInt(userId) },
        data: { planId: "free", status: "cancelled", stripeSubscriptionId: null, trialEndsAt: null },
      });
    } else {
      db.prepare(
        "UPDATE subscriptions SET plan_id = 'free', status = 'cancelled', stripe_subscription_id = NULL, trial_ends_at = NULL WHERE user_id = ?",
      ).run(userId);
    }

    return { stripeCancelled };
  } catch (err) {
    return { stripeCancelled: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function cancelPersistedStripeSubscription(subscription: Stripe.Subscription) {
  const metadataUserId = Number(subscription.metadata?.userId) || null;
  if (shouldUsePrisma) {
    const current = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true, userId: true },
    });
    if (!current) throw new AppError("Assinatura Stripe ainda não persistida.", 409);
    if (metadataUserId && current.userId !== BigInt(metadataUserId)) {
      throw new AppError("Metadata Stripe não corresponde ao proprietário da assinatura.", 409);
    }
    await prisma.subscription.update({
      where: { id: current.id },
      data: {
        planId: "free",
        status: "cancelled",
        stripeSubscriptionId: null,
        trialEndsAt: null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
    return;
  }

  const current = db.prepare(
    "SELECT id, user_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1",
  ).get(subscription.id) as { id: number; user_id: number } | undefined;
  if (!current) throw new AppError("Assinatura Stripe ainda não persistida.", 409);
  if (metadataUserId && current.user_id !== metadataUserId) {
    throw new AppError("Metadata Stripe não corresponde ao proprietário da assinatura.", 409);
  }
  const result = db.prepare(
    `UPDATE subscriptions
     SET plan_id = 'free', status = 'cancelled', stripe_subscription_id = NULL,
         trial_ends_at = NULL, current_period_end = ?
     WHERE id = ? AND stripe_subscription_id = ?`,
  ).run(new Date(subscription.current_period_end * 1000).toISOString(), current.id, subscription.id);
  if (result.changes !== 1) throw new AppError("Cancelamento Stripe não foi persistido.", 500);
}

export async function handleWebhook(rawBody: Buffer, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError("Webhook secret não configurado.", 503);
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new AppError("Assinatura do webhook inválida.", 400);
  }

  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = Number(session.metadata?.userId);
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new AppError("Webhook Stripe sem usuário válido.", 400);
      }
      const planId = requireStripePlanId(session.metadata?.planId);
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!customerId || !subscriptionId) {
        throw new AppError("Webhook Stripe sem assinatura completa.", 400);
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await persistActiveStripeSubscription({ userId, planId, customerId, subscription });
      break;
    }
    case "customer.subscription.updated":
      await updatePersistedStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await cancelPersistedStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
}
