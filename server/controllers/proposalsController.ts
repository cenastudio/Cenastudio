import type { RequestHandler } from "express";
import { randomBytes, createHash } from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { notifyUser } from "../services/notificationService.js";

function hashDocument(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

function proposalIdValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Proposta inválida", 400);
  return BigInt(parsed);
}

function serializeProposal(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", shareToken: "share_token",
    documentHash: "document_hash", acceptedAt: "accepted_at", acceptedByName: "accepted_by_name",
    acceptedIp: "accepted_ip", acceptedUserAgent: "accepted_user_agent",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_email = result.client.email;
    delete result.client;
  }
  return result;
}

// List proposals for a client (or all for the user)
export const listProposals: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId } = req.query;

    const rows = await prisma.proposal.findMany({
      where: {
        userId: BigInt(userId),
        ...(clientId ? { clientId: BigInt(Number(clientId)) } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, userId: true, clientId: true, title: true, total: true, status: true,
        shareToken: true, documentHash: true, acceptedAt: true, acceptedByName: true,
        acceptedIp: true, acceptedUserAgent: true, createdAt: true, updatedAt: true,
        client: { select: { name: true, email: true } },
        // html intentionally excluded from list — can be large; fetched via getProposal
      },
    });
    res.json({ success: true, data: rows.map(serializeProposal) });
  } catch (e) {
    next(e);
  }
};

export const getProposal: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalIdValue(req.params.id), userId: BigInt(userId) },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!proposal) throw new AppError("Proposta não encontrada", 404);
    res.json({ success: true, data: serializeProposal(proposal) });
  } catch (e) {
    next(e);
  }
};

// Create a proposal: persists the exact HTML, hashes it (so a later edit
// creates a distinguishable version), and returns a public share link.
export const createProposal: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, title, html, total } = req.body;

    if (!clientId) throw new AppError("O ID do cliente é obrigatório", 400);
    if (!title?.trim()) throw new AppError("O título da proposta é obrigatório", 400);
    if (!html?.trim()) throw new AppError("O conteúdo da proposta é obrigatório", 400);
    if (typeof total !== "number" || total < 0) throw new AppError("Valor total inválido", 400);

    const owner = BigInt(userId);
    const linkedClientId = BigInt(Number(clientId));
    const client = await prisma.client.findFirst({ where: { id: linkedClientId, userId: owner } });
    if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);

    const shareToken = randomBytes(24).toString("hex");
    const documentHash = hashDocument(html);

    const proposal = await prisma.proposal.create({
      data: {
        userId: owner,
        clientId: linkedClientId,
        title: title.trim(),
        html,
        total: Math.round(total),
        status: "sent",
        shareToken,
        documentHash,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...serializeProposal({ ...proposal, client }),
        proposal_url: `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/proposal/${shareToken}`,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const deleteProposal: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const result = await prisma.proposal.deleteMany({
      where: { id: proposalIdValue(req.params.id), userId: BigInt(userId) },
    });
    if (result.count === 0) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    next(e);
  }
};

// Public: fetch proposal HTML + status by share token (no auth).
export const getPublicProposal: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const proposal = await prisma.proposal.findUnique({
      where: { shareToken: token },
      include: { client: { select: { name: true } } },
    });
    if (!proposal) throw new AppError("Proposta não encontrada", 404);

    // Mark as "viewed" the first time it's opened publicly, without
    // overwriting a later "accepted"/"rejected" status.
    if (proposal.status === "sent") {
      await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "viewed" } });
    }

    res.json({
      success: true,
      data: {
        title: proposal.title,
        html: proposal.html,
        total: proposal.total,
        status: proposal.status === "sent" ? "viewed" : proposal.status,
        client_name: proposal.client.name,
        document_hash: proposal.documentHash,
        accepted_at: proposal.acceptedAt?.toISOString() ?? null,
        accepted_by_name: proposal.acceptedByName ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
};

// Public: accept the proposal. Records name, IP, user-agent and timestamp,
// and re-checks the stored hash against the current content so an edit
// made after sending doesn't silently get accepted under the old label.
export const acceptPublicProposal: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { name } = req.body;
    if (!name?.trim()) throw new AppError("Informe seu nome completo para aceitar.", 400);

    const proposal = await prisma.proposal.findUnique({ where: { shareToken: token } });
    if (!proposal) throw new AppError("Proposta não encontrada", 404);
    if (proposal.status === "accepted") throw new AppError("Esta proposta já foi aceita.", 409);
    if (proposal.status === "rejected") throw new AppError("Esta proposta foi rejeitada e não pode mais ser aceita.", 409);

    const currentHash = hashDocument(proposal.html);
    if (currentHash !== proposal.documentHash) {
      // Should not happen (html is immutable after creation in this flow),
      // but guards against any future edit-in-place code path.
      throw new AppError("O conteúdo da proposta foi alterado desde o envio. Solicite uma nova versão.", 409);
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedByName: name.trim(),
        acceptedIp: String(ip),
        acceptedUserAgent: String(userAgent),
      },
    });

    notifyUser(
      Number(updated.userId),
      "Proposta aceita!",
      `${name.trim()} aceitou a proposta "${updated.title}".`,
      "success",
      "/clients",
    );

    res.json({
      success: true,
      data: {
        status: updated.status,
        accepted_at: updated.acceptedAt?.toISOString(),
        accepted_by_name: updated.acceptedByName,
        document_hash: updated.documentHash,
      },
    });
  } catch (e) {
    next(e);
  }
};
