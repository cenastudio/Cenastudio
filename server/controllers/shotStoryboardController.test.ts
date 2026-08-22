import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

let db: typeof import("../models/db.js").db;
let shotListService: typeof import("../services/shotListService.js");
let shotStoryboardService: typeof import("../services/shotStoryboardService.js");
let shotStoryboardController: typeof import("./shotStoryboardController.js");
let authMiddleware: typeof import("../middleware/authenticate.js");
let planAccess: typeof import("../middleware/planAccess.js");

type MockResponse = {
  statusCode: number;
  body: any;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, any>) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("shotStoryboardController", () => {
  const user = { id: 1, role: "user" as const };
  const projectId = 1;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-storyboard-controller-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    shotListService = await import("../services/shotListService.js");
    shotStoryboardService = await import("../services/shotStoryboardService.js");
    shotStoryboardController = await import("./shotStoryboardController.js");
    authMiddleware = await import("../middleware/authenticate.js");
    planAccess = await import("../middleware/planAccess.js");
  });

  beforeEach(() => {
    process.env.STORYBOARD_IMAGE_PROVIDER = "mock";
    db.prepare("DELETE FROM shot_storyboard_frames").run();
    db.prepare("DELETE FROM shots").run();
    db.prepare("DELETE FROM shot_lists").run();
    db.prepare("DELETE FROM subscriptions").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(user.id, "storyboard-controller@example.com", "hash");
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, 'pro', 'active', datetime('now', '+1 month'))").run(user.id);
    db.prepare("INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)").run(projectId, user.id, "Projeto Storyboard Controller");
  });

  async function createShot() {
    return shotListService.addShot(user.id, projectId, {
      scene: "2B",
      shotType: "Close",
      description: "Mão pega a claquete",
    });
  }

  it("lists frames for a shot", async () => {
    const shot = await createShot();
    const frame = await shotStoryboardService.createFrame(user.id, shot.id, {
      prompt: "Close da claquete",
      finalPrompt: "pencil storyboard close",
      provider: "mock",
      imageUrl: "https://cdn.example.com/close.png",
      status: "generated",
    });

    const res = await invoke(shotStoryboardController.listFrames, { user, params: { id: String(shot.id) } });

    expect(res.body).toMatchObject({
      success: true,
      data: [expect.objectContaining({ id: frame.id, prompt: "Close da claquete" })],
    });
  });

  it("generates a frame through the adapter", async () => {
    const shot = await createShot();

    const res = await invoke(shotStoryboardController.generateFrame, {
      user,
      params: { id: String(shot.id) },
      body: { prompt: "Storyboard da claquete no primeiro plano", aspectRatio: "16:9" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      status: "generated",
      provider: "mock",
      image_url: expect.stringContaining("mock-storyboard"),
    });
  });

  it("approves and deletes frames", async () => {
    const shot = await createShot();
    const frame = await shotStoryboardService.createFrame(user.id, shot.id, {
      prompt: "Frame aprovado",
      finalPrompt: "approved frame",
      provider: "mock",
      imageUrl: "https://cdn.example.com/approved-controller.png",
      status: "generated",
    });

    const approved = await invoke(shotStoryboardController.approveFrame, { user, params: { frameId: String(frame.id) } });
    expect(approved.body.data.status).toBe("approved");
    expect((db.prepare("SELECT thumbnail_url FROM shots WHERE id = ?").get(shot.id) as any).thumbnail_url).toBe(
      "https://cdn.example.com/approved-controller.png",
    );

    const deleted = await invoke(shotStoryboardController.deleteFrame, { user, params: { frameId: String(frame.id) } });
    expect(deleted.body).toEqual({ success: true, data: null });
  });

  it("rejects invalid ids and missing prompt", async () => {
    await expect(
      invoke(shotStoryboardController.listFrames, { user, params: { id: "abc" } }),
    ).rejects.toMatchObject({ status: 400 });

    const shot = await createShot();
    await expect(
      invoke(shotStoryboardController.generateFrame, { user, params: { id: String(shot.id) }, body: {} }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("keeps storyboard endpoints behind auth and the Shot List plan gate", async () => {
    db.prepare(
      "INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, 'free', 'active', datetime('now', '+1 month'))",
    ).run(user.id);

    await expect(invoke(authMiddleware.authenticate, { cookies: {} })).rejects.toMatchObject({ status: 401 });
    await expect(invoke(planAccess.requireStudioPlan("shotList"), { user })).rejects.toMatchObject({ status: 402 });
  });
});
