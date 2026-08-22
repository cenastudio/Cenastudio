import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  videoReview: { findFirst: vi.fn(), update: vi.fn() },
  user: { findUnique: vi.fn() },
  studioSetting: { findUnique: vi.fn() },
}));

vi.mock("../models/prisma.js", () => ({ prisma: prismaMock, shouldUsePrisma: true }));
vi.mock("../services/emailService.js", () => ({
  isEmailConfigured: true,
  sendEmail: vi.fn().mockResolvedValue({ id: "email_123" }),
}));

import { sendEmail } from "../services/emailService.js";
import { sendVideoReviewToClient } from "./videoReviewsController.js";

type MockResponse = {
  statusCode: number;
  body: unknown;
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

async function invoke(handler: RequestHandler, request: Record<string, unknown>) {
  const res = response();
  let error: unknown;
  await handler(request as any, res as any, (nextError?: unknown) => { error = nextError; });
  if (error) throw error;
  return res;
}

const review = {
  id: 11n,
  userId: 1n,
  projectId: 7n,
  fileId: null,
  title: "Corte 01",
  description: "Revisao do filme",
  status: "draft",
  shareToken: null,
  expiresAt: null,
  videoUrl: "https://video.test/corte",
  createdAt: new Date("2026-08-22T10:00:00.000Z"),
  updatedAt: new Date("2026-08-22T10:00:00.000Z"),
  project: {
    name: "Filme Aurora",
    client: { name: "Clara Aurora", email: "clara@aurora.test" },
  },
};

describe("sendVideoReviewToClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ name: "Dante", regionalPrefs: { locale: "pt" } });
    prismaMock.studioSetting.findUnique.mockResolvedValue({
      studioName: "Cena Studio",
      email: "comercial@cena.test",
      phone: "(11) 90000-0000",
      website: "https://cena.test",
    });
    prismaMock.videoReview.findFirst.mockResolvedValue(review);
    prismaMock.videoReview.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...review,
      ...data,
      file: null,
      project: { name: "Filme Aurora" },
    }));
  });

  it("renews the share token, marks pending review and emails the linked client", async () => {
    const res = await invoke(sendVideoReviewToClient, {
      user: { id: 1 },
      params: { id: "11" },
      body: { expiresInDays: 7 },
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "clara@aurora.test",
      replyTo: "comercial@cena.test",
      subject: expect.stringContaining("Cena Studio"),
      html: expect.stringContaining("/review/"),
    }));
    expect(prismaMock.videoReview.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11n },
      data: expect.objectContaining({ status: "pending_review" }),
    }));
    expect((res.body as { data: { email_sent: boolean; shareUrl: string; recipient_email: string } }).data)
      .toMatchObject({
        email_sent: true,
        recipient_email: "clara@aurora.test",
      });
  });

  it("blocks finalized reviews from being resent", async () => {
    prismaMock.videoReview.findFirst.mockResolvedValue({ ...review, status: "approved" });

    await expect(invoke(sendVideoReviewToClient, {
      user: { id: 1 },
      params: { id: "11" },
      body: {},
    })).rejects.toMatchObject({ status: 409 });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(prismaMock.videoReview.update).not.toHaveBeenCalled();
  });

  it("requires a linked client email or explicit valid recipient", async () => {
    prismaMock.videoReview.findFirst.mockResolvedValue({
      ...review,
      project: { name: "Filme Aurora", client: { name: "Clara Aurora", email: null } },
    });

    await expect(invoke(sendVideoReviewToClient, {
      user: { id: 1 },
      params: { id: "11" },
      body: {},
    })).rejects.toMatchObject({ status: 409 });
  });
});
