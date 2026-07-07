import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RequestHandler } from "express";

vi.mock("../services/aiService.js", () => ({
  generateForTool: vi.fn(async (_userId: number, toolId: string) => ({
    output: `Gerado para ${toolId}`,
    generationId: 123,
  })),
  trackUsage: vi.fn(async () => {}),
}));

vi.mock("../services/notificationService.js", () => ({
  notifyUser: vi.fn(),
  notifyAdmins: vi.fn(),
}));

type MockResponse = {
  statusCode: number;
  body: any;
  redirectedTo?: string;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  redirect: (url: string) => MockResponse;
  setHeader: (key: string, value: string) => MockResponse;
  sendFile: (filePath: string) => MockResponse;
};

let authService: typeof import("../services/authService.js");
let aiController: typeof import("./aiController.js");
let projectsController: typeof import("./projectsController.js");
let videoReviewsController: typeof import("./videoReviewsController.js");
let dbModule: typeof import("../models/db.js");
let user: { id: number; email: string; role: "user" };
let otherUser: { id: number; email: string; role: "user" };

function response(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    redirectedTo: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    redirect(url) { this.redirectedTo = url; return this; },
    setHeader(key, value) { this.headers[key] = value; return this; },
    sendFile(filePath) { this.body = { filePath }; return this; },
  };
}

async function invoke(handler: RequestHandler, req: Record<string, any>) {
  const res = response();
  let capturedError: unknown;
  await handler(req as any, res as any, (error?: unknown) => { capturedError = error; });
  if (capturedError) throw capturedError;
  return res;
}

describe("AI, projects and video review critical flows", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.LOG_LEVEL = "error";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-ai-projects-reviews-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    dbModule = await import("../models/db.js");
    dbModule.initDatabase();
    authService = await import("../services/authService.js");
    aiController = await import("./aiController.js");
    projectsController = await import("./projectsController.js");
    videoReviewsController = await import("./videoReviewsController.js");

    const stamp = Date.now();
    user = await authService.registerUser("Flow Owner", `flow-owner-${stamp}@example.com`, "password-123");
    otherUser = await authService.registerUser("Other Owner", `other-owner-${stamp}@example.com`, "password-123");
  });

  it("generates through AI only after incrementing usage and blocks when monthly plan limit is reached", async () => {
    const period = new Date().toISOString().slice(0, 7);
    dbModule.db.prepare("UPDATE subscriptions SET plan_id = 'free', status = 'active', trial_ends_at = NULL WHERE user_id = ?").run(user.id);

    const generated = await invoke(aiController.generate, {
      user,
      body: { toolId: "1", input: { prompt: "Gerar roteiro curto" } },
    });
    expect(generated.body).toMatchObject({
      success: true,
      data: { output: "Gerado para 1", generationId: 123 },
    });

    const usage = dbModule.db
      .prepare("SELECT count FROM usage WHERE user_id = ? AND tool_id = ? AND period = ?")
      .get(user.id, "1", period) as { count: number };
    expect(usage.count).toBe(1);

    dbModule.db.prepare("UPDATE usage SET count = 5 WHERE user_id = ? AND period = ?").run(user.id, period);
    await expect(invoke(aiController.generate, {
      user,
      body: { toolId: "1", input: { prompt: "Passou do limite" } },
    })).rejects.toMatchObject({ status: 403 });
  });

  it("persists project state and denies access to projects owned by another user", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Projeto Protegido", description: "Teste", metadataJson: "{\"kind\":\"film\"}" },
    });
    const projectId = String(project.body.data.id);

    const saved = await invoke(projectsController.saveToolState, {
      user,
      params: { id: projectId },
      body: { toolId: "1", formData: { prompt: "Cena 1" }, outputData: "Tratamento salvo" },
    });
    expect(saved.body.data).toEqual({ projectId: Number(projectId), toolId: "1" });

    const state = await invoke(projectsController.getToolState, {
      user,
      params: { id: projectId, toolId: "1" },
    });
    expect(state.body.data.formData).toEqual({ prompt: "Cena 1" });
    expect(state.body.data.outputData).toBe("Tratamento salvo");

    await expect(invoke(projectsController.getProject, {
      user: otherUser,
      params: { id: projectId },
    })).rejects.toMatchObject({ status: 404 });

    await expect(invoke(projectsController.saveToolState, {
      user: otherUser,
      params: { id: projectId },
      body: { toolId: "1", formData: {}, outputData: "" },
    })).rejects.toMatchObject({ status: 403 });
  });

  it("filters generation history by active project when requested", async () => {
    const projectA = await invoke(projectsController.createProject, {
      user,
      body: { name: "Historico Projeto A", metadataJson: "{}" },
    });
    const projectB = await invoke(projectsController.createProject, {
      user,
      body: { name: "Historico Projeto B", metadataJson: "{}" },
    });

    dbModule.db
      .prepare("INSERT INTO generations (user_id, tool_id, input, output, project_id) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, "07", JSON.stringify({ cliente: "A" }), "Briefing A", projectA.body.data.id);
    dbModule.db
      .prepare("INSERT INTO generations (user_id, tool_id, input, output, project_id) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, "07", JSON.stringify({ cliente: "B" }), "Briefing B", projectB.body.data.id);

    const scoped = await invoke(aiController.getHistory, {
      user,
      params: { toolId: "07" },
      query: { projectId: String(projectA.body.data.id) },
    });

    expect(scoped.body.data).toHaveLength(1);
    expect(scoped.body.data[0]).toMatchObject({
      output: "Briefing A",
      projectName: "Historico Projeto A",
    });

    const all = await invoke(aiController.getHistory, {
      user,
      params: { toolId: "07" },
      query: {},
    });
    expect(all.body.data.map((item: { output: string }) => item.output)).toEqual(
      expect.arrayContaining(["Briefing A", "Briefing B"]),
    );
  });

  it("covers video review sharing, public comments, decisions and owner-only mutations", async () => {
    const project = await invoke(projectsController.createProject, {
      user,
      body: { name: "Review Projeto", metadataJson: "{}" },
    });

    const created = await invoke(videoReviewsController.createVideoReview, {
      user,
      body: {
        projectId: project.body.data.id,
        title: "Corte v1",
        description: "Primeira versao",
        videoUrl: "https://cdn.example.com/video.mp4",
      },
    });
    expect(created.body.data.share_token).toBeTruthy();
    const reviewId = String(created.body.data.id);
    const token = created.body.data.share_token;

    const shared = await invoke(videoReviewsController.accessSharedReview, {
      params: { token },
    });
    expect(shared.body.data.title).toBe("Corte v1");

    const comment = await invoke(videoReviewsController.addSharedComment, {
      params: { token },
      body: {
        timestampSeconds: 12,
        comment: "Ajustar trilha",
        authorName: "Cliente",
        annotations: [{ x: 10, y: 20 }],
      },
    });
    expect(comment.body.data.annotations).toEqual([{ x: 10, y: 20 }]);

    const decision = await invoke(videoReviewsController.updateSharedReviewStatus, {
      params: { token },
      body: { status: "changes_requested", authorName: "Cliente", comment: "Precisa ajuste" },
    });
    expect(decision.body.data.status).toBe("changes_requested");
    expect(decision.body.data.comments.some((item: any) => item.comment.includes("Precisa ajuste"))).toBe(true);

    const ownerView = await invoke(videoReviewsController.getVideoReview, {
      user,
      params: { id: reviewId },
    });
    expect(ownerView.body.data.comments.length).toBeGreaterThanOrEqual(2);

    const commentId = ownerView.body.data.comments[0].id;
    const resolved = await invoke(videoReviewsController.resolveComment, {
      user,
      params: { id: String(commentId) },
      body: { resolved: true },
    });
    expect(resolved.body.data.resolved).toBe(1);

    await expect(invoke(videoReviewsController.updateVideoReview, {
      user: otherUser,
      params: { id: reviewId },
      body: { title: "Tentativa externa" },
    })).rejects.toMatchObject({ status: 403 });

    const removed = await invoke(videoReviewsController.deleteVideoReview, {
      user,
      params: { id: reviewId },
    });
    expect(removed.body.success).toBe(true);
  });
});
