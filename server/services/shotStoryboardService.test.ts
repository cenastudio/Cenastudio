import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  uploadStoryboardFrame: vi.fn(),
}));

vi.mock("./supabaseStorage.js", () => storageMock);

let db: typeof import("../models/db.js").db;
let shotListService: typeof import("./shotListService.js");
let shotStoryboardService: typeof import("./shotStoryboardService.js");

describe("shotStoryboardService", () => {
  const ownerId = 1;
  const otherUserId = 2;
  const projectId = 1;
  const otherProjectId = 2;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-storyboard-")), "test.db");
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;

    const dbModule = await import("../models/db.js");
    await dbModule.initDatabase();
    db = dbModule.db;
    shotListService = await import("./shotListService.js");
    shotStoryboardService = await import("./shotStoryboardService.js");
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.STORYBOARD_IMAGE_API_KEY;
    delete process.env.STORYBOARD_IMAGE_MODEL;
    storageMock.uploadStoryboardFrame.mockResolvedValue({
      path: "1/1/1/storyboard.png",
      publicUrl: "https://storage.example.com/storyboard.png",
    });
    db.prepare("DELETE FROM shot_storyboard_frames").run();
    db.prepare("DELETE FROM shots").run();
    db.prepare("DELETE FROM shot_lists").run();
    db.prepare("DELETE FROM subscriptions").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(ownerId, "storyboard-owner@example.com", "hash");
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(otherUserId, "storyboard-other@example.com", "hash");
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, 'pro', 'active', datetime('now', '+1 month'))").run(ownerId);
    db.prepare("INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) VALUES (?, 'pro', 'active', datetime('now', '+1 month'))").run(otherUserId);
    db.prepare("INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)").run(projectId, ownerId, "Projeto Storyboard");
    db.prepare("INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)").run(otherProjectId, otherUserId, "Projeto Outro");
  });

  async function createOwnerShot() {
    return shotListService.addShot(ownerId, projectId, {
      scene: "1A",
      shotType: "Wide",
      description: "Personagem entra no set escuro",
      camera: "Alexa Mini",
      lens: "35mm",
      movement: "Dolly in",
      productionNotes: "Contraluz forte e atmosfera de suspense",
    });
  }

  it("creates storyboard frame revisions scoped to a shot", async () => {
    const shot = await createOwnerShot();

    const first = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Sketch inicial com silhueta na porta",
      finalPrompt: "black and white pencil storyboard frame",
      provider: "mock",
      model: "storyboard-mock",
      imageUrl: "https://cdn.example.com/frame-1.png",
      status: "generated",
    });
    const second = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Mais contraste no fundo",
      finalPrompt: "higher contrast pencil storyboard frame",
      provider: "mock",
      model: "storyboard-mock",
      imageUrl: "https://cdn.example.com/frame-2.png",
      status: "generated",
    });

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);

    const frames = await shotStoryboardService.listFrames(ownerId, shot.id);
    expect(frames.map((frame) => frame.id)).toEqual([second.id, first.id]);
    expect(frames[0]).toMatchObject({
      project_id: projectId,
      shot_id: shot.id,
      prompt: "Mais contraste no fundo",
      status: "generated",
    });
  });

  it("blocks cross-tenant list, create, approve and delete", async () => {
    const shot = await createOwnerShot();
    const frame = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Plano privado da produtora",
      finalPrompt: "private storyboard frame",
      provider: "mock",
      imageUrl: "https://cdn.example.com/private.png",
      status: "generated",
    });

    await expect(shotStoryboardService.listFrames(otherUserId, shot.id)).rejects.toMatchObject({ status: 404 });
    await expect(
      shotStoryboardService.createFrame(otherUserId, shot.id, {
        prompt: "Tentativa cross tenant",
        finalPrompt: "cross tenant",
        provider: "mock",
        status: "generated",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(shotStoryboardService.approveFrame(otherUserId, frame.id)).rejects.toMatchObject({ status: 404 });
    await expect(shotStoryboardService.deleteFrame(otherUserId, frame.id)).rejects.toMatchObject({ status: 404 });
  });

  it("approves a frame and updates the shot thumbnail without deleting prior revisions", async () => {
    const shot = await createOwnerShot();
    const first = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Primeira composicao",
      finalPrompt: "first storyboard",
      provider: "mock",
      imageUrl: "https://cdn.example.com/first.png",
      status: "generated",
    });
    const second = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Composicao aprovada",
      finalPrompt: "approved storyboard",
      provider: "mock",
      imageUrl: "https://cdn.example.com/approved.png",
      storagePath: "storyboards/user-1/project-1/shot-1/frame-2.png",
      status: "generated",
    });

    const approved = await shotStoryboardService.approveFrame(ownerId, second.id);

    expect(approved).toMatchObject({
      id: second.id,
      status: "approved",
      approved_by_id: ownerId,
      image_url: "https://cdn.example.com/approved.png",
    });
    expect(approved.approved_at).toBeTruthy();

    const storedShot = db.prepare("SELECT thumbnail_url FROM shots WHERE id = ?").get(shot.id) as { thumbnail_url: string };
    expect(storedShot.thumbnail_url).toBe("https://cdn.example.com/approved.png");

    const frames = await shotStoryboardService.listFrames(ownerId, shot.id);
    expect(frames.some((frame) => frame.id === first.id)).toBe(true);
    expect(frames.some((frame) => frame.id === second.id && frame.status === "approved")).toBe(true);
  });

  it("rejects approval when a generated frame has no image URL", async () => {
    const shot = await createOwnerShot();
    const failed = await shotStoryboardService.createFrame(ownerId, shot.id, {
      prompt: "Provider falhou",
      finalPrompt: "failed storyboard",
      provider: "mock",
      status: "failed",
      errorMessage: "provider unavailable",
    });

    await expect(shotStoryboardService.approveFrame(ownerId, failed.id)).rejects.toMatchObject({ status: 400 });
  });

  it("persists a failed frame when image generation is not configured", async () => {
    const shot = await createOwnerShot();
    delete process.env.STORYBOARD_IMAGE_PROVIDER;

    await expect(
      shotStoryboardService.generateFrame(ownerId, shot.id, { prompt: "Desenhar entrada dramática" }),
    ).rejects.toMatchObject({ status: 503 });

    const frames = await shotStoryboardService.listFrames(ownerId, shot.id);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      status: "failed",
      provider: "unconfigured",
      prompt: "Desenhar entrada dramática",
      error_message: "Storyboard image generation is not configured.",
    });
    expect(frames[0].final_prompt).toContain("Personagem entra no set escuro");
    expect(frames[0].final_prompt).toContain("Alexa Mini");
  });

  it("creates a generated frame through the mock image adapter in test/local mode", async () => {
    const shot = await createOwnerShot();
    process.env.STORYBOARD_IMAGE_PROVIDER = "mock";

    const frame = await shotStoryboardService.generateFrame(ownerId, shot.id, { prompt: "Quadro com luz de recorte" });

    expect(frame).toMatchObject({
      status: "generated",
      provider: "mock",
      model: "storyboard-mock",
      image_url: expect.stringContaining("mock-storyboard"),
    });
    expect(frame.final_prompt).toContain("Style: black and white pencil storyboard sketch");
  });

  it("generates through OpenRouter Images and stores the storyboard frame in Supabase Storage", async () => {
    const shot = await createOwnerShot();
    process.env.STORYBOARD_IMAGE_PROVIDER = "openrouter";
    process.env.OPENROUTER_API_KEY = "openrouter-test-key";
    process.env.STORYBOARD_IMAGE_MODEL = "google/gemini-3.1-flash-lite-image";
    const imageBytes = Buffer.from("storyboard image bytes");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: [{ b64_json: imageBytes.toString("base64"), media_type: "image/png" }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const frame = await shotStoryboardService.generateFrame(ownerId, shot.id, {
      prompt: "Plano em desenho a lápis com câmera baixa",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/images",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer openrouter-test-key" }),
      }),
    );
    expect(storageMock.uploadStoryboardFrame).toHaveBeenCalledWith(expect.objectContaining({
      userId: ownerId,
      projectId,
      shotId: shot.id,
      body: imageBytes,
      contentType: "image/png",
    }));
    expect(frame).toMatchObject({
      status: "generated",
      provider: "openrouter",
      model: "google/gemini-3.1-flash-lite-image",
      image_url: "https://storage.example.com/storyboard.png",
      storage_path: "1/1/1/storyboard.png",
    });
  });

  it("blocks monthly storyboard generation before creating a frame when the plan quota is reached", async () => {
    const shot = await createOwnerShot();
    process.env.STORYBOARD_IMAGE_PROVIDER = "mock";

    for (let index = 0; index < 25; index++) {
      await shotStoryboardService.createFrame(ownerId, shot.id, {
        prompt: `Frame ${index + 1}`,
        finalPrompt: `quota frame ${index + 1}`,
        provider: "mock",
        imageUrl: `https://cdn.example.com/quota-${index + 1}.png`,
        status: "generated",
      });
    }

    const allowance = await shotStoryboardService.getStoryboardGenerationAllowance(ownerId);
    expect(allowance).toMatchObject({ planId: "pro", used: 25, limit: 25, remaining: 0 });

    await expect(
      shotStoryboardService.generateFrame(ownerId, shot.id, { prompt: "Frame que excede a quota" }),
    ).rejects.toMatchObject({ status: 429 });

    const frames = await shotStoryboardService.listFrames(ownerId, shot.id);
    expect(frames).toHaveLength(25);
    expect(frames.some((frame) => frame.prompt === "Frame que excede a quota")).toBe(false);
  });
});
