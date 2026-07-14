import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
  retrieveSubscription: vi.fn(),
}));

vi.mock("stripe", () => {
  class StripeMock {
    static webhooks = { constructEvent: vi.fn() };
    checkout = {
      sessions: {
        create: stripeMocks.createSession,
        retrieve: stripeMocks.retrieveSession,
      },
    };
    subscriptions = { retrieve: stripeMocks.retrieveSubscription };
    invoices = { list: vi.fn() };
    billingPortal = { sessions: { create: vi.fn() } };
  }
  return { default: StripeMock };
});

let stripeService: typeof import("./stripeService.js");
let db: typeof import("../models/db.js").db;
let userId: number;

const subscription = {
  id: "sub_test",
  status: "active",
  current_period_start: 1_700_000_000,
  current_period_end: 1_702_592_000,
  trial_end: null,
  metadata: { userId: "", planId: "pro" },
};

describe("stripeService persistence and return URLs", () => {
  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_PATH", path.join(mkdtempSync(path.join(tmpdir(), "cena-stripe-")), "test.db"));
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_placeholder");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_pro");
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("POSTGRES_PRISMA_URL", undefined);
    vi.stubEnv("POSTGRES_URL", undefined);
    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    const created = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, 'user', 1)",
    ).run("Stripe Test", `stripe-${Date.now()}@example.com`, "unused");
    userId = Number(created.lastInsertRowid);
    subscription.metadata.userId = String(userId);
    stripeService = await import("./stripeService.js");
  });

  afterAll(() => {
    db.close();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.createSession.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    stripeMocks.retrieveSession.mockResolvedValue({
      metadata: { userId: String(userId), planId: "pro" },
      status: "complete",
      payment_status: "paid",
      customer: "cus_test",
      subscription,
    });
  });

  it("preserves the plan query and adds session_id with an ampersand", async () => {
    await stripeService.createCheckoutSession(
      userId,
      "stripe@example.com",
      "pro",
      "https://app.example/success?plan=pro",
      "https://app.example/#pricing",
    );

    const payload = stripeMocks.createSession.mock.calls[0][0];
    expect(payload.success_url).toBe(
      "https://app.example/success?plan=pro&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(payload.success_url.match(/\?/g)).toHaveLength(1);
  });

  it("creates a subscription record when sync would otherwise update zero rows", async () => {
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);

    const result = await stripeService.syncCheckoutSession(userId, "cs_test");

    expect(result.synced).toBe(true);
    const persisted = db.prepare(
      "SELECT user_id, plan_id, stripe_customer_id, stripe_subscription_id FROM subscriptions WHERE user_id = ?",
    ).get(userId) as Record<string, unknown>;
    expect(persisted).toMatchObject({
      user_id: userId,
      plan_id: "pro",
      stripe_customer_id: "cus_test",
      stripe_subscription_id: "sub_test",
    });
  });
});
