import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./internalCron.js";

function requestWithAuthorization(value?: string) {
  return {
    get: (name: string) => {
      if (name.toLowerCase() !== "authorization") return undefined;
      return value;
    },
  } as any;
}

describe("internal cron authorization", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects cron requests when CRON_SECRET is not configured", () => {
    expect(isAuthorizedCronRequest(requestWithAuthorization("Bearer any"))).toBe(false);
  });

  it("rejects invalid bearer tokens", () => {
    process.env.CRON_SECRET = "local-cron-secret";

    expect(isAuthorizedCronRequest(requestWithAuthorization("Bearer wrong"))).toBe(false);
  });

  it("accepts the exact Vercel Cron bearer token", () => {
    process.env.CRON_SECRET = "local-cron-secret";

    expect(isAuthorizedCronRequest(requestWithAuthorization("Bearer local-cron-secret"))).toBe(true);
  });
});
