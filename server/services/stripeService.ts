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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
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

  const planId = session.metadata?.planId;
  if (!planId || !["pro", "studio"].includes(planId)) {
    throw new AppError("Plano da sessão inválido.", 400);
  }

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
  const subscriptionId = subscription?.id;

  if (!customerId || !subscriptionId || !subscription) {
    throw new AppError("Assinatura Stripe incompleta.", 400);
  }

  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  if (shouldUsePrisma) {
    await prisma.subscription.updateMany({ where: { userId: BigInt(userId) }, data: {
      planId, status: "active", stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId,
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(periodEnd), trialEndsAt: null,
    } });
  } else db.prepare(
    `UPDATE subscriptions
     SET plan_id = ?, status = 'active', stripe_customer_id = ?, stripe_subscription_id = ?,
         current_period_start = datetime('now'), current_period_end = ?, trial_ends_at = NULL
     WHERE user_id = ?`,
  ).run(planId, customerId, subscriptionId, periodEnd, userId);

  return {
    synced: true,
    status: session.status,
    paymentStatus: session.payment_status,
    planId,
  };
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
      const planId = session.metadata?.planId;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (!userId || !planId || !subscriptionId) break;

      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

      if (shouldUsePrisma) {
        await prisma.subscription.updateMany({ where: { userId: BigInt(userId) }, data: {
          planId, status: "active", stripeCustomerId: customerId ?? null,
          stripeSubscriptionId: subscriptionId, currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(periodEnd), trialEndsAt: null,
        } });
      } else db.prepare(
        `UPDATE subscriptions
         SET plan_id = ?, status = 'active', stripe_customer_id = ?, stripe_subscription_id = ?,
             current_period_start = datetime('now'), current_period_end = ?, trial_ends_at = NULL
         WHERE user_id = ?`,
      ).run(planId, customerId ?? null, subscriptionId, periodEnd, userId);

      console.log(`[Stripe] User ${userId} upgraded to ${planId}`);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = Number(sub.metadata?.userId);
      if (!userId) break;

      const status =
        sub.status === "active"
          ? "active"
          : sub.status === "canceled"
            ? "cancelled"
            : sub.status;
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      const planId = sub.metadata?.planId;

      if (shouldUsePrisma) {
        await prisma.subscription.updateMany({ where: { userId: BigInt(userId) }, data: {
          status, currentPeriodEnd: new Date(periodEnd), ...(planId ? { planId } : {}),
        } });
      } else if (planId) {
        db.prepare(
          `UPDATE subscriptions SET status = ?, current_period_end = ?, plan_id = ?
           WHERE user_id = ?`,
        ).run(status, periodEnd, planId, userId);
      } else {
        db.prepare(
          `UPDATE subscriptions SET status = ?, current_period_end = ? WHERE user_id = ?`,
        ).run(status, periodEnd, userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = Number(sub.metadata?.userId);
      if (!userId) break;

      if (shouldUsePrisma) {
        const existing = await prisma.subscription.findFirst({ where: { userId: BigInt(userId) }, select: { id: true } });
        if (existing) {
          await prisma.subscription.update({ where: { id: existing.id }, data: {
            planId: "free", status: "cancelled", stripeSubscriptionId: null,
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          } });
        } else {
          await prisma.subscription.create({ data: {
            userId: BigInt(userId), planId: "free", status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          } });
        }
      } else {
      const existingSub = db.prepare("SELECT id FROM subscriptions WHERE user_id = ?").get(userId);
      if (existingSub) {
        db.prepare(
          `UPDATE subscriptions SET plan_id = 'free', status = 'cancelled',
           stripe_subscription_id = NULL, current_period_end = datetime('now', '+1 month')
           WHERE user_id = ?`,
        ).run(userId);
      } else {
        db.prepare(
          `INSERT INTO subscriptions (user_id, plan_id, status, current_period_end)
           VALUES (?, 'free', 'active', datetime('now', '+1 month'))`,
        ).run(userId);
      }
      }

      console.log(`[Stripe] User ${userId} downgraded to free (subscription cancelled)`);
      break;
    }
    default:
      break;
  }
}
