import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

let authService: typeof import("./authService.js");
let teamService: typeof import("./teamService.js");
let dbModule: typeof import("../models/db.js");

async function createOwner(planId: string, tag: string) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return authService.createManagedUser({
    name: `Owner ${tag}`,
    email: `owner-${tag}-${stamp}@example.com`,
    password: "password-123",
    role: "user",
    planId,
  });
}

async function addMember(ownerId: number, i: number) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return teamService.createTeamMember(ownerId, {
    name: `Member ${i}`,
    email: `member-${i}-${stamp}@example.com`,
    password: "password-123",
    role: "viewer",
  });
}

describe("teamService capacity is driven by plan entitlements", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-team-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("./authService.js");
    teamService = await import("./teamService.js");
  });

  it("allows a Pro owner exactly 5 members and rejects the 6th", async () => {
    const owner = await createOwner("pro", "pro");

    for (let i = 1; i <= 5; i++) {
      await addMember(owner.id, i);
    }
    expect((await teamService.listTeamMembers(owner.id)).length).toBe(5);

    await expect(addMember(owner.id, 6)).rejects.toMatchObject({ status: 402 });
  });

  it("rejects team members for a Free owner (feature not included)", async () => {
    const owner = await createOwner("free", "free");
    await expect(addMember(owner.id, 1)).rejects.toMatchObject({ status: 402 });
  });

  it("allows a Studio owner to exceed 5 members (unlimited)", async () => {
    const owner = await createOwner("studio", "studio");
    for (let i = 1; i <= 6; i++) {
      await addMember(owner.id, i);
    }
    expect((await teamService.listTeamMembers(owner.id)).length).toBe(6);
  });
});
