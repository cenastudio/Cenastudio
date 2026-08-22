import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  client: { findFirst: vi.fn() },
  studioSetting: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  proposal: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("../models/prisma.js", () => ({ prisma: prismaMock, shouldUsePrisma: true }));
vi.mock("../services/notificationService.js", () => ({ notifyUser: vi.fn() }));
vi.mock("../services/webhookService.js", () => ({ dispatchWebhookEvent: vi.fn() }));
vi.mock("../services/emailService.js", () => ({
  isEmailConfigured: true,
  sendEmail: vi.fn().mockResolvedValue({ id: "email_123" }),
}));

import {
  acceptPublicProposal,
  createProposal,
  getPublicProposal,
  revokeProposal,
  sendProposalToClient,
  updatePortalVisibility,
} from "./proposalsController.js";
import { sendEmail } from "../services/emailService.js";

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

const sentProposal = {
  id: 9n,
  userId: 1n,
  clientId: 2n,
  title: "Filme Aurora",
  html: "<h1>Filme Aurora</h1>",
  total: 125_000,
  status: "sent",
  shareToken: "share-token",
  documentHash: createHash("sha256").update("<h1>Filme Aurora</h1>", "utf8").digest("hex"),
  createdAt: new Date(),
  updatedAt: new Date(),
  acceptedAt: null,
  acceptedByName: null,
  client: { name: "Aurora", email: "contato@aurora.test" },
};

describe("proposal lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.client.findFirst.mockResolvedValue({ id: 2n, name: "Aurora", email: "contato@aurora.test" });
    prismaMock.user.findUnique.mockResolvedValue({ name: "Dante", regionalPrefs: { locale: "pt" } });
    prismaMock.studioSetting.findUnique.mockResolvedValue({
      studioName: "Cena Studio",
      signature: "Comercial Cena",
      email: "comercial@cena.test",
      phone: "(11) 90000-0000",
      website: "https://cena.test",
    });
  });

  it("creates a sent proposal only for a client owned by the studio", async () => {
    prismaMock.proposal.create.mockResolvedValue(sentProposal);

    const res = await invoke(createProposal, {
      user: { id: 1 },
      body: { clientId: 2, title: "Filme Aurora", html: sentProposal.html, total: 125_000 },
    });

    expect(res.statusCode).toBe(201);
    expect(prismaMock.proposal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 1n, clientId: 2n, status: "sent" }),
    }));
  });

  it("never releases a draft to the client portal", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({ id: 9n, status: "draft" });

    await expect(invoke(updatePortalVisibility, {
      user: { id: 1 }, params: { id: "9" }, body: { visible: true },
    })).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.proposal.update).not.toHaveBeenCalled();
  });

  it("turns a public sent proposal into viewed without changing its document", async () => {
    prismaMock.proposal.findUnique.mockResolvedValue(sentProposal);
    prismaMock.proposal.update.mockResolvedValue({ ...sentProposal, status: "viewed" });

    const res = await invoke(getPublicProposal, { params: { token: "share-token" } });

    expect(prismaMock.proposal.update).toHaveBeenCalledWith({ where: { id: 9n }, data: { status: "viewed" } });
    expect((res.body as { data: { status: string; document_hash: string } }).data).toMatchObject({
      status: "viewed",
      document_hash: sentProposal.documentHash,
    });
  });

  it("records an acceptance only when the stored document hash is intact", async () => {
    prismaMock.proposal.findUnique.mockResolvedValue(sentProposal);
    prismaMock.proposal.update.mockResolvedValue({
      ...sentProposal,
      status: "accepted",
      acceptedAt: new Date("2026-08-22T12:00:00.000Z"),
      acceptedByName: "Clara Aurora",
    });

    const res = await invoke(acceptPublicProposal, {
      params: { token: "share-token" },
      body: { name: "Clara Aurora" },
      headers: { "x-forwarded-for": "203.0.113.10" },
      socket: { remoteAddress: "127.0.0.1" },
    });

    expect(prismaMock.proposal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9n },
      data: expect.objectContaining({ status: "accepted", acceptedByName: "Clara Aurora" }),
    }));
    expect((res.body as { data: { status: string; accepted_by_name: string } }).data).toMatchObject({
      status: "accepted",
      accepted_by_name: "Clara Aurora",
    });
  });

  it("revokes only a non-accepted proposal and removes it from the portal", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({ id: 9n, status: "viewed" });

    const res = await invoke(revokeProposal, { user: { id: 1 }, params: { id: "9" } });

    expect(prismaMock.proposal.update).toHaveBeenCalledWith({
      where: { id: 9n },
      data: { status: "revoked", visibleInClientPortal: false },
    });
    expect((res.body as { data: { status: string; visible_in_client_portal: boolean } }).data).toEqual({
      id: 9,
      status: "revoked",
      visible_in_client_portal: false,
    });
  });

  it("protects an accepted proposal from revocation", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({ id: 9n, status: "accepted" });

    await expect(invoke(revokeProposal, { user: { id: 1 }, params: { id: "9" } }))
      .rejects.toMatchObject({ status: 409 });
  });

  it("sends an explicit proposal email and publishes the proposal when requested", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({
      ...sentProposal,
      status: "draft",
      client: { name: "Aurora", email: "cliente@aurora.test" },
    });
    prismaMock.proposal.update.mockResolvedValue({
      ...sentProposal,
      status: "sent",
      visibleInClientPortal: true,
      client: { name: "Aurora", email: "cliente@aurora.test" },
      project: null,
    });

    const res = await invoke(sendProposalToClient, {
      user: { id: 1 },
      params: { id: "9" },
      body: { visibleInClientPortal: true },
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "cliente@aurora.test",
      replyTo: "comercial@cena.test",
      subject: expect.stringContaining("Cena Studio"),
      html: expect.stringContaining("/proposal/share-token"),
    }));
    expect(prismaMock.proposal.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9n },
      data: { status: "sent", visibleInClientPortal: true },
    }));
    expect((res.body as { data: { email_sent: boolean; proposal_url: string } }).data).toMatchObject({
      email_sent: true,
      proposal_url: "http://localhost:5173/proposal/share-token",
    });
  });

  it("does not resend accepted proposals", async () => {
    prismaMock.proposal.findFirst.mockResolvedValue({
      ...sentProposal,
      status: "accepted",
      client: { name: "Aurora", email: "cliente@aurora.test" },
    });

    await expect(invoke(sendProposalToClient, {
      user: { id: 1 }, params: { id: "9" }, body: {},
    })).rejects.toMatchObject({ status: 409 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prismaMock.proposal.update).not.toHaveBeenCalled();
  });
});
