import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let db: typeof import("../models/db.js").db;
let shotListService: typeof import("./shotListService.js");
let shotStoryboardService: typeof import("./shotStoryboardService.js");

describe("shot list PDF export", () => {
  const userId = 1;
  const projectId = 1;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = "test";
    process.env.DATABASE_PATH = path.join(mkdtempSync(path.join(tmpdir(), "cena-shotlist-pdf-")), "test.db");
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
    db.prepare("DELETE FROM shot_storyboard_frames").run();
    db.prepare("DELETE FROM shots").run();
    db.prepare("DELETE FROM shot_lists").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(userId, "shotlist-pdf@example.com", "hash");
    db.prepare("INSERT INTO projects (id, user_id, name) VALUES (?, ?, ?)").run(projectId, userId, "Projeto PDF Storyboard");
  });

  async function createShot() {
    return shotListService.addShot(userId, projectId, {
      scene: "4C",
      shotType: "Wide",
      description: "Plano aberto do set com storyboard aprovado",
      camera: "Alexa Mini",
      lens: "24mm",
      movement: "Dolly",
      durationSec: 120,
    });
  }

  it("fetches an approved storyboard thumbnail while generating the shot list PDF", async () => {
    const shot = await createShot();
    const approvedImageUrl = "https://cdn.example.com/storyboard-approved.png";
    const frame = await shotStoryboardService.createFrame(userId, shot.id, {
      prompt: "Plano aberto em desenho a lapis",
      finalPrompt: "approved storyboard sketch",
      provider: "mock",
      imageUrl: approvedImageUrl,
      status: "generated",
    });
    await shotStoryboardService.approveFrame(userId, frame.id);

    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l0u7WQAAAABJRU5ErkJggg==",
      "base64",
    );
    const fetchMock = vi.fn(async () => new Response(pngBytes, { status: 200, headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);

    const pdf = await shotListService.generateShotListPdf(userId, projectId);

    expect(fetchMock).toHaveBeenCalledWith(approvedImageUrl);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("keeps exporting the PDF when the approved storyboard image cannot be loaded", async () => {
    const shot = await createShot();
    await shotListService.updateShot(userId, shot.id, {
      thumbnailUrl: "https://cdn.example.com/missing-storyboard.png",
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));

    const pdf = await shotListService.generateShotListPdf(userId, projectId);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
