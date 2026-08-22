import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  studioSetting: { upsert: vi.fn() },
}));

const storageMock = vi.hoisted(() => ({
  uploadBrandAsset: vi.fn(),
}));

vi.mock("../models/prisma.js", () => ({ prisma: prismaMock, shouldUsePrisma: true }));
vi.mock("../services/supabaseStorage.js", () => storageMock);

import { uploadStudioLogo } from "./studioSettingsController.js";

type MockResponse = {
  body: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
};

function response(): MockResponse {
  return {
    body: undefined,
    status() { return this; },
    json(body) { this.body = body; return this; },
  };
}

async function invoke(handler: RequestHandler, request: Record<string, unknown>) {
  const res = response();
  let error: unknown;
  await handler(request as any, res as any, (nextError?: unknown) => { error = nextError; });
  if (error) throw error;
  return res;
}

describe("uploadStudioLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.uploadBrandAsset.mockResolvedValue({ publicUrl: "https://cdn.example/logo.png" });
  });

  it("uploads a validated logo and stores the public URL", async () => {
    const res = await invoke(uploadStudioLogo, {
      user: { id: 7, role: "admin" },
      body: {
        fileData: Buffer.from("logo").toString("base64"),
        filename: "logo.png",
        mimeType: "image/png",
      },
    });

    expect(storageMock.uploadBrandAsset).toHaveBeenCalledWith({
      userId: 7,
      filename: "logo.png",
      body: expect.any(Buffer),
      contentType: "image/png",
    });
    expect(prismaMock.studioSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7n },
      update: expect.objectContaining({ logoUrl: "https://cdn.example/logo.png" }),
    }));
    expect((res.body as { data: { logoUrl: string } }).data.logoUrl).toBe("https://cdn.example/logo.png");
  });

  it("rejects unsupported logo formats", async () => {
    await expect(invoke(uploadStudioLogo, {
      user: { id: 7, role: "admin" },
      body: {
        fileData: Buffer.from("logo").toString("base64"),
        filename: "logo.txt",
        mimeType: "text/plain",
      },
    })).rejects.toMatchObject({ status: 400 });

    expect(storageMock.uploadBrandAsset).not.toHaveBeenCalled();
    expect(prismaMock.studioSetting.upsert).not.toHaveBeenCalled();
  });
});
