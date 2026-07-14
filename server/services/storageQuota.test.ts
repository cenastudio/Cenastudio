import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { getPlanEntitlement } from "../../shared/planEntitlements.js";

let authService: typeof import("./authService.js");
let entitlementService: typeof import("./entitlementService.js");
let dbModule: typeof import("../models/db.js");

const GB = 1024 * 1024 * 1024;

describe("storage quota entitlements", () => {
  it("assigns a real per-plan storage limit (not a hardcoded 10GB)", () => {
    expect(getPlanEntitlement("free").storageLimitBytes).toBe(2 * GB);
    expect(getPlanEntitlement("pro").storageLimitBytes).toBe(25 * GB);
    expect(getPlanEntitlement("studio").storageLimitBytes).toBe(250 * GB);
    expect(getPlanEntitlement("enterprise").storageLimitBytes).toBe(-1);
  });
});

describe("entitlementService.assertStorageCapacity", () => {
  let userId: number;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-quota-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
    entitlementService = await import("./entitlementService.js");

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Free plan → 2 GB quota (registerUser would grant a Pro trial instead).
    const user = await authService.createManagedUser({
      name: "Quota User",
      email: `quota-${stamp}@example.com`,
      password: "password-123",
      role: "user",
      planId: "free",
    });
    userId = user.id;
  });

  it("allows an upload that fits within the plan quota", async () => {
    await expect(entitlementService.assertStorageCapacity(userId, 100 * 1024 * 1024)).resolves.toBeUndefined();
  });

  it("blocks an upload that would exceed the plan quota", async () => {
    // Simulate 1.9 GB already stored on a 2 GB free plan.
    dbModule.db
      .prepare("INSERT INTO files (user_id, filename, original_name, path, size) VALUES (?, ?, ?, ?, ?)")
      .run(userId, "big.bin", "big.bin", `${userId}/1/big.bin`, Math.floor(1.9 * GB));

    // A 500 MB upload pushes past 2 GB → must be rejected with 413.
    await expect(entitlementService.assertStorageCapacity(userId, 500 * 1024 * 1024)).rejects.toMatchObject({ status: 413 });
  });

  it("never blocks admins", async () => {
    await expect(entitlementService.assertStorageCapacity(userId, 10 * GB, "admin")).resolves.toBeUndefined();
  });
});
