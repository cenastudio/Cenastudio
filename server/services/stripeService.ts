import Stripe from "stripe";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";

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

export async function createPortalSession(userId: number, returnUrl: string) {
  const stripe = getStripe();

  const sub = db
    .prepare(
      `SELECT stripe_customer_id FROM subscriptions
       WHERE user_id = ? AND stripe_customer_id IS NOT NULL
       ORDER BY id DESC LIMIT 1`,
    )
    .get(userId) as { stripe_customer_id: string } | undefined;

  if (!sub?.stripe_customer_id) {
    throw new AppError("Nenhuma assinatura Stripe encontrada.", 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
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

  db.prepare(
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

      db.prepare(
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

      if (planId) {
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

      console.log(`[Stripe] User ${userId} downgraded to free (subscription cancelled)`);
      break;
    }
    default:
      break;
  }
}
