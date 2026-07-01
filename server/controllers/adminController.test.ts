import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

vi.mock("../services/authService.js", () => ({
  countUsers: vi.fn(async () => 2),
  listAllUsers: vi.fn(async () => [{ id: 1, email: "admin@cenastudio.com.br" }]),
  createManagedUser: vi.fn(async (body) => ({ id: 3, ...body })),
  updateUserRole: vi.fn(async () => undefined),
  updateUserPlan: vi.fn(async () => undefined),
  deleteManagedUser: vi.fn(async () => ({ id: 3, deleted: true })),
}));

vi.mock("../services/toolService.js", () => ({
  listAllTools: vi.fn(async () => [{ id: 1, name: "Tool" }]),
  updateTool: vi.fn(async (id, body) => ({ id, ...body })),
  createTool: vi.fn(async (body) => ({ id: 10, ...body })),
  softDeleteTool: vi.fn(async (id) => ({ id, active: false })),
}));

const adminController = await import("./adminController.js");
const authService = await import("../services/authService.js");

function response() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, any> = {}) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("adminController", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists users with count and user rows", async () => {
    const res = await invoke(adminController.listUsers);
    expect(res.body).toEqual({
      success: true,
      data: { count: 2, users: [{ id: 1, email: "admin@cenastudio.com.br" }] },
    });
  });

  it("creates managed users with 201 status", async () => {
    const res = await invoke(adminController.createManagedUser, {
      body: { name: "User", email: "user@example.com", role: "user", planId: "pro" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.email).toBe("user@example.com");
  });

  it("passes actor id when updating role and deleting users", async () => {
    await invoke(adminController.updateUserRole, {
      params: { id: "3" },
      body: { role: "admin" },
      user: { id: 1 },
    });
    expect(authService.updateUserRole).toHaveBeenCalledWith(3, "admin", 1);

    const deleted = await invoke(adminController.deleteManagedUser, {
      params: { id: "3" },
      user: { id: 1 },
    });
    expect(deleted.body.data).toEqual({ id: 3, deleted: true });
  });

  it("rejects delete without session before calling service", async () => {
    const res = await invoke(adminController.deleteManagedUser, { params: { id: "3" } });
    expect(res.statusCode).toBe(401);
    expect(authService.deleteManagedUser).not.toHaveBeenCalled();
  });
});
