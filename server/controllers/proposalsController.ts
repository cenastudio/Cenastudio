import type { RequestHandler } from "express";
import { randomBytes, createHash } from "crypto";
import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { notifyUser } from "../services/notificationService.js";
import { dispatchWebhookEvent } from "../services/webhookService.js";
import * as commercialProposalService from "../services/commercialProposalService.js";
import { sendEmail, isEmailConfigured } from "../services/emailService.js";
import { renderTransactionalEmail, type TransactionalEmailLocale } from "../services/transactionalEmail.js";
import { SITE_CONFIG } from "@shared/site";

const CONTACT_EMAIL = process.env.SUPPORT_EMAIL || SITE_CONFIG.supportEmail || "cenastudio@atomicmail.io";

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function hashDocument(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

// Public proposal links carry client PII, so they must not live forever.
// After this window a still-open link stops working (accepted proposals stay
// accessible as a record of the agreement). Configurable via env.
const PROPOSAL_SHARE_TTL_DAYS = Math.max(1, Number(process.env.PROPOSAL_SHARE_TTL_DAYS ?? 90));

/** Blocks a public share link that was revoked by the owner or has expired. */
export function assertProposalLinkUsable(proposal: { status: string; createdAt: Date }) {
  if (proposal.status === "draft") {
    throw new AppError("Esta proposta ainda não foi enviada ao cliente.", 404);
  }
  if (proposal.status === "revoked") {
    throw new AppError("Este link de proposta foi revogado pelo remetente.", 410);
  }
  if (proposal.status !== "accepted") {
    const expiryMs = proposal.createdAt.getTime() + PROPOSAL_SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > expiryMs) {
      throw new AppError("Este link de proposta expirou. Solicite um novo ao remetente.", 410);
    }
  }
}

function proposalIdValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Proposta inválida", 400);
  return BigInt(parsed);
}

function proposalClientIdValue(value: unknown) {
  const parsed = typeof value === "string" && !/^\d+$/.test(value.trim())
    ? Number.NaN
    : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError("O ID do cliente é inválido", 400);
  }
  return BigInt(parsed);
}

function proposalProjectIdValue(value: unknown) {
  const parsed = typeof value === "string" && !/^\d+$/.test(value.trim())
    ? Number.NaN
    : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError("O ID do projeto é inválido", 400);
  }
  return BigInt(parsed);
}

function proposalUrl(shareToken: string) {
  return `${getClientOrigin()}/proposal/${shareToken}`;
}

function firstName(value: string | null | undefined) {
  return (value || "").trim().split(" ")[0] || value || "";
}

function currencyValue(total: number, locale: TransactionalEmailLocale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(total / 100);
}

function resolveOwnerLocale(regionalPrefs: unknown): TransactionalEmailLocale {
  return (regionalPrefs as { locale?: string } | null)?.locale === "en" ? "en" : "pt";
}

function renderProposalSendEmail(input: {
  locale: TransactionalEmailLocale;
  studioName: string;
  contactLine?: string | null;
  clientName: string;
  proposalTitle: string;
  total: number;
  url: string;
}) {
  const locale = input.locale === "en" ? "en" : "pt";
  const copy = locale === "en"
    ? {
        eyebrow: "Commercial proposal",
        title: "Your proposal is ready for review",
        greeting: (name: string) => `Hi, ${name}.`,
        intro: (title: string, studio: string) => `${studio} sent the proposal "${title}" for your review.`,
        action: "Review Proposal",
        total: "Investment",
        validity: "Link validity",
        validityValue: `${PROPOSAL_SHARE_TTL_DAYS} days`,
        note: "Use this secure link to view and accept the proposal. If anything needs to change, reply to this email before accepting.",
        safety: "This link is transactional and expires automatically. Do not forward it to people outside the approval flow.",
        subject: (studio: string) => `${studio} sent you a proposal`,
      }
    : {
        eyebrow: "Proposta comercial",
        title: "Sua proposta esta pronta para revisao",
        greeting: (name: string) => `Ola, ${name}.`,
        intro: (title: string, studio: string) => `${studio} enviou a proposta "${title}" para sua revisao.`,
        action: "Revisar proposta",
        total: "Investimento",
        validity: "Validade do link",
        validityValue: `${PROPOSAL_SHARE_TTL_DAYS} dias`,
        note: "Use este link seguro para visualizar e aceitar a proposta. Se algo precisar mudar, responda este e-mail antes do aceite.",
        safety: "Este link e transacional e expira automaticamente. Nao encaminhe para pessoas fora do fluxo de aprovacao.",
        subject: (studio: string) => `${studio} enviou uma proposta para voce`,
      };

  const rendered = renderTransactionalEmail({
    locale,
    eyebrow: copy.eyebrow,
    title: copy.title,
    greeting: copy.greeting(firstName(input.clientName)),
    paragraphs: [
      copy.intro(input.proposalTitle, input.studioName),
      copy.note,
    ],
    details: [
      { label: copy.total, value: currencyValue(input.total, locale) },
      { label: copy.validity, value: copy.validityValue },
    ],
    action: { label: copy.action, url: input.url },
    safetyNote: copy.safety,
    footer: [input.studioName, input.contactLine || null].filter(Boolean).join("\n"),
  });

  return {
    subject: copy.subject(input.studioName),
    html: rendered.html,
    text: rendered.text,
  };
}

export function validateProposalPayload(input: Record<string, unknown>) {
  const clientId = proposalClientIdValue(input.clientId);
  const total = input.total;
  if (typeof input.title !== "string" || !input.title.trim()) {
    throw new AppError("O título da proposta é obrigatório", 400);
  }
  if (typeof input.html !== "string" || !input.html.trim()) {
    throw new AppError("O conteúdo da proposta é obrigatório", 400);
  }
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
    throw new AppError("Valor total inválido", 400);
  }

  return {
    clientId,
    title: input.title.trim(),
    html: input.html,
    total,
  };
}

function serializeProposal(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", shareToken: "share_token",
    projectId: "project_id", sourceBudgetId: "source_budget_id", sourceGenerationId: "source_generation_id",
    commercialSnapshot: "commercial_snapshot",
    documentHash: "document_hash", acceptedAt: "accepted_at", acceptedByName: "accepted_by_name",
    acceptedIp: "accepted_ip", acceptedUserAgent: "accepted_user_agent",
    visibleInClientPortal: "visible_in_client_portal",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_email = result.client.email;
    delete result.client;
  }
  if (result.project) {
    result.project_name = result.project.name;
    delete result.project;
  }
  return result;
}

function serializeSqliteProposal(row: any) {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    client_id: Number(row.client_id),
    project_id: row.project_id == null ? null : Number(row.project_id),
    source_budget_id: row.source_budget_id == null ? null : Number(row.source_budget_id),
    source_generation_id: row.source_generation_id == null ? null : Number(row.source_generation_id),
    commercial_snapshot: row.commercial_snapshot ? JSON.parse(row.commercial_snapshot) : null,
    title: row.title,
    html: row.html,
    total: Number(row.total),
    status: row.status,
    share_token: row.share_token,
    document_hash: row.document_hash,
    accepted_at: row.accepted_at,
    accepted_by_name: row.accepted_by_name,
    accepted_ip: row.accepted_ip,
    accepted_user_agent: row.accepted_user_agent,
    visible_in_client_portal: Boolean(row.visible_in_client_portal),
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...(row.client_name ? { client_name: row.client_name } : {}),
    ...(row.client_email ? { client_email: row.client_email } : {}),
    ...(row.project_name ? { project_name: row.project_name } : {}),
  };
}

function selectSqliteProposalById(id: bigint, userId: number) {
  return db
    .prepare(
      `SELECT p.*, c.name AS client_name, c.email AS client_email, pr.name AS project_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN projects pr ON pr.id = p.project_id
       WHERE p.id = ? AND p.user_id = ?`,
    )
    .get(Number(id), userId) as any;
}

// List proposals for a client (or all for the user)
export const listProposals: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, projectId } = req.query;
    const linkedClientId = clientId === undefined ? undefined : proposalClientIdValue(clientId);
    const linkedProjectId = projectId === undefined ? undefined : proposalProjectIdValue(projectId);

    if (!shouldUsePrisma) {
      const conditions = ["p.user_id = ?"];
      const values: Array<number> = [userId];
      if (linkedClientId) {
        conditions.push("p.client_id = ?");
        values.push(Number(linkedClientId));
      }
      if (linkedProjectId) {
        conditions.push("p.project_id = ?");
        values.push(Number(linkedProjectId));
      }
      const rows = db
        .prepare(
          `SELECT p.*, c.name AS client_name, c.email AS client_email, pr.name AS project_name
           FROM proposals p
           JOIN clients c ON c.id = p.client_id
           LEFT JOIN projects pr ON pr.id = p.project_id
           WHERE ${conditions.join(" AND ")}
           ORDER BY p.created_at DESC
           LIMIT 100`,
        )
        .all(...values) as any[];
      res.json({ success: true, data: rows.map(serializeSqliteProposal) });
      return;
    }

    const rows = await prisma.proposal.findMany({
      where: {
        userId: BigInt(userId),
        ...(linkedClientId ? { clientId: linkedClientId } : {}),
        ...(linkedProjectId ? { projectId: linkedProjectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, userId: true, clientId: true, projectId: true, sourceBudgetId: true, sourceGenerationId: true,
        commercialSnapshot: true,
        title: true, total: true, status: true,
        shareToken: true, documentHash: true, acceptedAt: true, acceptedByName: true,
        acceptedIp: true, acceptedUserAgent: true, visibleInClientPortal: true, createdAt: true, updatedAt: true,
        client: { select: { name: true, email: true } },
        project: { select: { name: true } },
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
    const id = proposalIdValue(req.params.id);

    if (!shouldUsePrisma) {
      const row = selectSqliteProposalById(id, userId);
      if (!row) throw new AppError("Proposta não encontrada", 404);
      res.json({ success: true, data: serializeSqliteProposal(row) });
      return;
    }

    const proposal = await prisma.proposal.findFirst({
      where: { id, userId: BigInt(userId) },
      include: { client: { select: { name: true, email: true } }, project: { select: { name: true } } },
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
    const { clientId, title, html, total } = validateProposalPayload(req.body ?? {});

    const shareToken = randomBytes(24).toString("hex");
    const documentHash = hashDocument(html);

    if (!shouldUsePrisma) {
      const sqliteClient = db.prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?").get(Number(clientId), userId) as any;
      if (!sqliteClient) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      const result = db
        .prepare(
          `INSERT INTO proposals (user_id, client_id, title, html, total, status, share_token, document_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, datetime('now'), datetime('now'))`,
        )
        .run(userId, Number(clientId), title, html, total, shareToken, documentHash);
      const row = selectSqliteProposalById(BigInt(Number(result.lastInsertRowid)), userId);
      res.status(201).json({
        success: true,
        data: {
          ...serializeSqliteProposal(row),
          proposal_url: proposalUrl(shareToken),
        },
      });
      return;
    }

    const owner = BigInt(userId);
    const client = await prisma.client.findFirst({ where: { id: clientId, userId: owner } });
    if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);

    const proposal = await prisma.proposal.create({
      data: {
        userId: owner,
        clientId,
        title,
        html,
        total,
        status: "sent",
        shareToken,
        documentHash,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...serializeProposal({ ...proposal, client }),
        proposal_url: proposalUrl(shareToken),
      },
    });
  } catch (e) {
    next(e);
  }
};

export const sendProposalToClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = proposalIdValue(req.params.id);
    const { visibleInClientPortal } = req.body as { visibleInClientPortal?: boolean };
    if (visibleInClientPortal !== undefined && typeof visibleInClientPortal !== "boolean") {
      throw new AppError("visibleInClientPortal deve ser booleano", 400);
    }

    if (!shouldUsePrisma) {
      const row = selectSqliteProposalById(id, userId);
      if (!row) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
      if (row.status === "revoked") throw new AppError("Uma proposta revogada não pode ser enviada.", 409);
      if (row.status === "accepted") throw new AppError("Uma proposta já aceita não deve ser reenviada.", 409);
      if (!row.client_email) throw new AppError("Cadastre um e-mail no cliente antes de enviar a proposta.", 409);

      const nextStatus = row.status === "draft" ? "sent" : row.status;
      db
        .prepare(
          `UPDATE proposals
           SET status = ?, visible_in_client_portal = CASE WHEN ? IS NULL THEN visible_in_client_portal ELSE ? END, updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
        )
        .run(nextStatus, visibleInClientPortal === undefined ? null : 1, visibleInClientPortal ? 1 : 0, Number(id), userId);
      const updated = selectSqliteProposalById(id, userId);
      res.json({
        success: true,
        data: {
          ...serializeSqliteProposal(updated),
          proposal_url: proposalUrl(updated.share_token),
          email_sent: false,
          email_configured: false,
          email_error: isEmailConfigured ? "Envio de e-mail indisponível no fallback SQLite." : null,
        },
      });
      return;
    }

    const owner = BigInt(userId);
    const proposal = await prisma.proposal.findFirst({
      where: { id, userId: owner },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!proposal) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
    if (proposal.status === "revoked") throw new AppError("Uma proposta revogada não pode ser enviada.", 409);
    if (proposal.status === "accepted") throw new AppError("Uma proposta já aceita não deve ser reenviada.", 409);
    if (!proposal.client.email) throw new AppError("Cadastre um e-mail no cliente antes de enviar a proposta.", 409);

    const url = proposalUrl(proposal.shareToken);
    const ownerUser = await prisma.user.findUnique({
      where: { id: owner },
      select: { regionalPrefs: true, name: true },
    });
    const studioSettings = await prisma.studioSetting.findUnique({ where: { userId: owner } });
    const studioName = studioSettings?.studioName || ownerUser?.name || SITE_CONFIG.brandName;
    const studioReplyTo = studioSettings?.email?.trim() || CONTACT_EMAIL;
    const contactLine = [studioSettings?.phone?.trim(), studioSettings?.website?.trim()].filter(Boolean).join(" · ");
    const locale = resolveOwnerLocale(ownerUser?.regionalPrefs);

    let emailSent = false;
    let emailError: string | null = null;

    if (isEmailConfigured) {
      try {
        const email = renderProposalSendEmail({
          locale,
          studioName,
          contactLine,
          clientName: proposal.client.name,
          proposalTitle: proposal.title,
          total: proposal.total,
          url,
        });
        await sendEmail({
          to: proposal.client.email,
          replyTo: studioReplyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        emailSent = true;
      } catch (error) {
        emailError = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
      }
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: proposal.status === "draft" ? "sent" : proposal.status,
        ...(visibleInClientPortal === undefined ? {} : { visibleInClientPortal }),
      },
      include: { client: { select: { name: true, email: true } }, project: { select: { name: true } } },
    });

    res.json({
      success: true,
      data: {
        ...serializeProposal(updated),
        proposal_url: url,
        email_sent: emailSent,
        email_configured: isEmailConfigured,
        email_error: emailError,
      },
    });
  } catch (e) {
    next(e);
  }
};

// Builds a private commercial draft from a project's internal budget. It is
// intentionally separate from createProposal, which preserves the legacy
// behavior of immediately sending a manually assembled proposal.
export const createDraftFromBudget: RequestHandler = async (req, res, next) => {
  try {
    const { proposal, reused } = await commercialProposalService.createOrUpdateDraftFromBudget(
      req.user!.id,
      req.body ?? {},
    );
    res.status(reused ? 200 : 201).json({
      success: true,
      data: { ...serializeProposal(proposal), reused },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProposal: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = proposalIdValue(req.params.id);
    if (!shouldUsePrisma) {
      const result = db.prepare("DELETE FROM proposals WHERE id = ? AND user_id = ?").run(Number(id), userId);
      if (result.changes === 0) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
      res.json({ success: true, data: { id: Number(req.params.id) } });
      return;
    }
    const result = await prisma.proposal.deleteMany({
      where: { id, userId: BigInt(userId) },
    });
    if (result.count === 0) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
    res.json({ success: true, data: { id: Number(req.params.id) } });
  } catch (e) {
    next(e);
  }
};

export const updatePortalVisibility: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { visible } = req.body as { visible?: boolean };
    if (typeof visible !== "boolean") throw new AppError("Visible flag is required", 400);

    const id = proposalIdValue(req.params.id);
    if (!shouldUsePrisma) {
      const proposal = db.prepare("SELECT id, status FROM proposals WHERE id = ? AND user_id = ?").get(Number(id), userId) as any;
      if (!proposal) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
      if (visible && (proposal.status === "revoked" || proposal.status === "draft")) {
        throw new AppError("Envie a proposta antes de liberá-la no portal.", 409);
      }
      db
        .prepare("UPDATE proposals SET visible_in_client_portal = ?, updated_at = datetime('now') WHERE id = ?")
        .run(visible ? 1 : 0, Number(id));
      const row = selectSqliteProposalById(id, userId);
      res.json({ success: true, data: serializeSqliteProposal(row) });
      return;
    }

    const proposal = await prisma.proposal.findFirst({
      where: { id, userId: BigInt(userId) },
      select: { id: true, status: true },
    });
    if (!proposal) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
    if (visible && (proposal.status === "revoked" || proposal.status === "draft")) {
      throw new AppError("Envie a proposta antes de liberá-la no portal.", 409);
    }

    const updated = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { visibleInClientPortal: visible },
      include: { client: { select: { name: true, email: true } } },
    });
    res.json({ success: true, data: serializeProposal(updated) });
  } catch (e) {
    next(e);
  }
};

// Revoke the public share link (owner only). An accepted proposal keeps its
// record and cannot be revoked; anything else becomes inaccessible publicly.
export const revokeProposal: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = proposalIdValue(req.params.id);
    if (!shouldUsePrisma) {
      const proposal = db.prepare("SELECT id, status FROM proposals WHERE id = ? AND user_id = ?").get(Number(id), userId) as any;
      if (!proposal) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
      if (proposal.status === "accepted") {
        throw new AppError("Uma proposta já aceita não pode ter o link revogado.", 409);
      }
      db
        .prepare("UPDATE proposals SET status = 'revoked', visible_in_client_portal = 0, updated_at = datetime('now') WHERE id = ?")
        .run(Number(id));
      res.json({ success: true, data: { id: Number(req.params.id), status: "revoked", visible_in_client_portal: false } });
      return;
    }
    const proposal = await prisma.proposal.findFirst({
      where: { id, userId: BigInt(userId) },
      select: { id: true, status: true },
    });
    if (!proposal) throw new AppError("Proposta não encontrada ou acesso não autorizado", 404);
    if (proposal.status === "accepted") {
      throw new AppError("Uma proposta já aceita não pode ter o link revogado.", 409);
    }
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "revoked", visibleInClientPortal: false } });
    res.json({ success: true, data: { id: Number(req.params.id), status: "revoked", visible_in_client_portal: false } });
  } catch (e) {
    next(e);
  }
};

// Public: fetch proposal HTML + status by share token (no auth).
export const getPublicProposal: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!shouldUsePrisma) {
      const proposal = db
        .prepare(
          `SELECT p.*, c.name AS client_name
           FROM proposals p
           JOIN clients c ON c.id = p.client_id
           WHERE p.share_token = ?`,
        )
        .get(token) as any;
      if (!proposal) throw new AppError("Proposta não encontrada", 404);
      assertProposalLinkUsable({ status: proposal.status, createdAt: new Date(proposal.created_at) });
      if (proposal.status === "sent") {
        db.prepare("UPDATE proposals SET status = 'viewed', updated_at = datetime('now') WHERE id = ?").run(proposal.id);
      }
      res.json({
        success: true,
        data: {
          title: proposal.title,
          html: proposal.html,
          total: Number(proposal.total),
          status: proposal.status === "sent" ? "viewed" : proposal.status,
          client_name: proposal.client_name,
          document_hash: proposal.document_hash,
          accepted_at: proposal.accepted_at,
          accepted_by_name: proposal.accepted_by_name,
        },
      });
      return;
    }

    const proposal = await prisma.proposal.findUnique({
      where: { shareToken: token },
      include: { client: { select: { name: true } } },
    });
    if (!proposal) throw new AppError("Proposta não encontrada", 404);
    assertProposalLinkUsable(proposal);

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

    if (!shouldUsePrisma) {
      const proposal = db.prepare("SELECT * FROM proposals WHERE share_token = ?").get(token) as any;
      if (!proposal) throw new AppError("Proposta não encontrada", 404);
      assertProposalLinkUsable({ status: proposal.status, createdAt: new Date(proposal.created_at) });
      if (proposal.status === "accepted") throw new AppError("Esta proposta já foi aceita.", 409);
      if (proposal.status === "rejected") throw new AppError("Esta proposta foi rejeitada e não pode mais ser aceita.", 409);

      const currentHash = hashDocument(proposal.html);
      if (currentHash !== proposal.document_hash) {
        throw new AppError("O conteúdo da proposta foi alterado desde o envio. Solicite uma nova versão.", 409);
      }

      const forwardedFor = req.headers["x-forwarded-for"];
      const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0]) || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const acceptedAt = new Date().toISOString();

      db
        .prepare(
          `UPDATE proposals
           SET status = 'accepted', accepted_at = ?, accepted_by_name = ?, accepted_ip = ?, accepted_user_agent = ?, updated_at = datetime('now')
           WHERE id = ?`,
        )
        .run(acceptedAt, name.trim(), String(ip), String(userAgent), proposal.id);

      notifyUser(
        Number(proposal.user_id),
        "Proposta aceita!",
        `${name.trim()} aceitou a proposta "${proposal.title}".`,
        "success",
        "/clients",
      );
      dispatchWebhookEvent(Number(proposal.user_id), "proposal.accepted", {
        proposalId: Number(proposal.id), title: proposal.title, acceptedByName: name.trim(),
      });

      res.json({
        success: true,
        data: {
          status: "accepted",
          accepted_at: acceptedAt,
          accepted_by_name: name.trim(),
          document_hash: proposal.document_hash,
        },
      });
      return;
    }

    const proposal = await prisma.proposal.findUnique({ where: { shareToken: token } });
    if (!proposal) throw new AppError("Proposta não encontrada", 404);
    assertProposalLinkUsable(proposal);
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
    dispatchWebhookEvent(Number(updated.userId), "proposal.accepted", {
      proposalId: Number(updated.id), title: updated.title, acceptedByName: name.trim(),
    });

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
