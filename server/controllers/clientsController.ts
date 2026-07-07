import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbClient, DbCount, DbSum } from "../models/types.js";
import { notifyAdmins, notifyUser } from "../services/notificationService.js";
import { lookupCnpj } from "../services/cnpjService.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { jsonSafe, withSnakeCase } from "../utils/prismaSerialization.js";
import { assertClientCapacity, getClientAllowance } from "../services/entitlementService.js";

const clientFields = {
  userId: "user_id",
  workflowStage: "workflow_stage",
  totalSpent: "total_spent",
  firstContactAt: "first_contact_at",
  lastContactAt: "last_contact_at",
  companySize: "company_size",
  annualRevenue: "annual_revenue",
  contactPerson: "contact_person",
  contactRole: "contact_role",
  billingCycle: "billing_cycle",
  paymentMethod: "payment_method",
  taxId: "tax_id",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function serializeClient(value: any) {
  return withSnakeCase(value, clientFields);
}

function serializeOpportunityRecord(value: any) {
  return withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", estimatedValue: "estimated_value",
    expectedCloseDate: "expected_close_date", lostReason: "lost_reason",
    createdAt: "created_at", updatedAt: "updated_at",
  });
}

function serializeInteractionRecord(value: any) {
  return withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", opportunityId: "opportunity_id",
    nextFollowUp: "next_follow_up", createdAt: "created_at",
  });
}

function clientBigInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Cliente inválido", 400);
  return BigInt(parsed);
}

export const getCompanyByCnpj: RequestHandler = async (req, res, next) => {
  try {
    const data = await lookupCnpj(req.params.cnpj);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const getAllowance: RequestHandler = async (req, res, next) => {
  try {
    const data = await getClientAllowance(req.user!.id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

// List all clients for current user
export const listClients: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { status, segment, search } = req.query;

    if (shouldUsePrisma) {
      const rows = await prisma.client.findMany({
        where: {
          userId: BigInt(userId),
          ...(status ? { status: String(status) } : {}),
          ...(segment ? { segment: String(segment) } : {}),
          ...(search
            ? {
                OR: ["name", "company", "email"].map((field) => ({
                  [field]: { contains: String(search), mode: "insensitive" as const },
                })),
              }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
      });
      res.json({ success: true, data: rows.map(serializeClient) });
      return;
    }

    let query = "SELECT * FROM clients WHERE user_id = ?";
    const params: any[] = [userId];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (segment) {
      query += " AND segment = ?";
      params.push(segment);
    }

    if (search) {
      query += " AND (name LIKE ? OR company LIKE ? OR email LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY updated_at DESC";

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

// Get specific client details
export const getClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;

    if (shouldUsePrisma) {
      const client = await prisma.client.findFirst({
        where: { id: clientBigInt(clientId), userId: BigInt(userId) },
        include: {
          projects: { select: { id: true, name: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
          opportunities: { orderBy: { updatedAt: "desc" } },
          interactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      });
      if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      const { projects, opportunities, interactions, ...record } = client;

      const projectIds = projects.map((p) => p.id);
      const warnings: string[] = [];

      let financial: any[] = [];
      try {
        const financialRows = await prisma.financialEntry.findMany({
          where: { clientId: clientBigInt(clientId), userId: BigInt(userId) },
          orderBy: { dueDate: "desc" },
          select: { id: true, kind: true, description: true, amount: true, status: true, dueDate: true, category: true },
        });
        financial = financialRows.map((e) =>
          withSnakeCase(e as any, { dueDate: "due_date" })
        );
      } catch {
        warnings.push("financial");
      }

      let files: any[] = [];
      try {
        if (projectIds.length > 0) {
          const fileRows = await prisma.file.findMany({
            where: { projectId: { in: projectIds }, userId: BigInt(userId) },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: { id: true, originalName: true, mimeType: true, createdAt: true, projectId: true, project: { select: { name: true } } },
          });
          files = fileRows.map((f) =>
            withSnakeCase(
              { id: f.id, originalName: f.originalName, mimeType: f.mimeType, createdAt: f.createdAt, projectId: f.projectId, projectName: f.project?.name ?? null } as any,
              { originalName: "original_name", mimeType: "mime_type", createdAt: "created_at", projectId: "project_id", projectName: "project_name" }
            )
          );
        }
      } catch {
        warnings.push("files");
      }

      let videoReviews: any[] = [];
      try {
        if (projectIds.length > 0) {
          const vrRows = await prisma.videoReview.findMany({
            where: { projectId: { in: projectIds }, userId: BigInt(userId) },
            orderBy: { createdAt: "desc" },
            select: { id: true, projectId: true, title: true, status: true, createdAt: true, project: { select: { name: true } } },
          });
          videoReviews = vrRows.map((vr) =>
            withSnakeCase(
              { id: vr.id, projectId: vr.projectId, projectName: vr.project?.name ?? null, title: vr.title, status: vr.status, createdAt: vr.createdAt } as any,
              { projectId: "project_id", projectName: "project_name", createdAt: "created_at" }
            )
          );
        }
      } catch {
        warnings.push("videoReviews");
      }

      res.json({
        success: true,
        data: {
          client: serializeClient(record),
          projects: projects.map((item) => withSnakeCase(item as any, { createdAt: "created_at" })),
          opportunities: opportunities.map(serializeOpportunityRecord),
          interactions: interactions.map(serializeInteractionRecord),
          financial,
          files,
          videoReviews,
          ...(warnings.length ? { warnings } : {}),
        },
      });
      return;
    }

    const client = db
      .prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?")
      .get(clientId, userId);

    if (!client) {
      throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
    }

    // Get projects for this client
    const projects = db
      .prepare("SELECT id, name, status, created_at FROM projects WHERE client_id = ? ORDER BY created_at DESC")
      .all(clientId);

    // Get opportunities for this client
    const opportunities = db
      .prepare("SELECT * FROM opportunities WHERE client_id = ? ORDER BY updated_at DESC")
      .all(clientId);

    // Get recent interactions (limited to 20)
    const interactions = db
      .prepare("SELECT * FROM interactions WHERE client_id = ? ORDER BY created_at DESC LIMIT 20")
      .all(clientId);

    const warnings: string[] = [];

    // Get financial entries for this client
    let financial: any[] = [];
    try {
      financial = db
        .prepare(
          "SELECT id, kind, description, amount, status, due_date, category FROM financial_entries WHERE client_id = ? ORDER BY due_date DESC"
        )
        .all(clientId);
    } catch {
      warnings.push("financial");
      financial = [];
    }

    // Get files for all projects belonging to this client
    let files: any[] = [];
    try {
      const projectIds = (projects as any[]).map((p: any) => p.id);
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => "?").join(",");
        files = db
          .prepare(
            `SELECT f.id, f.original_name, f.mime_type, f.created_at, f.project_id, p.name as project_name
             FROM files f JOIN projects p ON p.id = f.project_id
             WHERE f.project_id IN (${placeholders})
             ORDER BY f.created_at DESC LIMIT 100`
          )
          .all(...projectIds);
      }
    } catch {
      warnings.push("files");
      files = [];
    }

    // Get video reviews for all projects belonging to this client
    let videoReviews: any[] = [];
    try {
      const projectIds = (projects as any[]).map((p: any) => p.id);
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => "?").join(",");
        videoReviews = db
          .prepare(
            `SELECT vr.id, vr.project_id, p.name as project_name, vr.title, vr.status, vr.created_at
             FROM video_reviews vr JOIN projects p ON p.id = vr.project_id
             WHERE vr.project_id IN (${placeholders})
             ORDER BY vr.created_at DESC`
          )
          .all(...projectIds);
      }
    } catch {
      warnings.push("videoReviews");
      videoReviews = [];
    }

    res.json({
      success: true,
      data: {
        client,
        projects: projects || [],
        opportunities: opportunities || [],
        interactions: interactions || [],
        financial,
        files,
        videoReviews,
        ...(warnings.length ? { warnings } : {}),
      },
    });
  } catch (e) {
    next(e);
  }
};

// Create a new client
export const createClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await assertClientCapacity(userId, req.user!.role);
    const {
      name, company, email, phone, segment, status, notes,
      address, city, state, country, website, linkedin, instagram,
      industry, company_size, annual_revenue, contact_person, contact_role,
      billing_cycle, payment_method, tax_id, total_spent, workflow_stage,
    } = req.body;

    if (!name || !name.trim()) {
      throw new AppError("O nome do cliente é obrigatório", 400);
    }

    if (shouldUsePrisma) {
      const now = new Date();
      const created = await prisma.client.create({
        data: {
          userId: BigInt(userId), name: name.trim(), company: company?.trim() || null,
          email: email?.trim() || null, phone: phone?.trim() || null, segment: segment || "direct",
          status: status || "lead", notes: notes?.trim() || null, address: address?.trim() || null,
          city: city?.trim() || null, state: state?.trim() || null, country: country?.trim() || null,
          website: website?.trim() || null, linkedin: linkedin?.trim() || null,
          instagram: instagram?.trim() || null, industry: industry?.trim() || null,
          companySize: company_size || null, annualRevenue: annual_revenue != null ? Number(annual_revenue) : null,
          contactPerson: contact_person?.trim() || null, contactRole: contact_role?.trim() || null,
          billingCycle: billing_cycle || null, paymentMethod: payment_method || null,
          taxId: tax_id?.trim() || null, totalSpent: total_spent != null ? Number(total_spent) || 0 : 0,
          workflowStage: workflow_stage || "prospect", firstContactAt: now, lastContactAt: now,
        },
      });
      res.json({ success: true, data: serializeClient(created) });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO clients (
          user_id, name, company, email, phone, segment, status, notes,
          address, city, state, country, website, linkedin, instagram,
          industry, company_size, annual_revenue, contact_person, contact_role,
          billing_cycle, payment_method, tax_id, total_spent, workflow_stage,
          first_contact_at, last_contact_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          datetime('now'), datetime('now')
        )`,
      )
      .run(
        userId,
        name.trim(),
        company?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        segment || "direct",
        status || "lead",
        notes?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        state?.trim() || null,
        country?.trim() || null,
        website?.trim() || null,
        linkedin?.trim() || null,
        instagram?.trim() || null,
        industry?.trim() || null,
        company_size || null,
        annual_revenue != null ? annual_revenue : null,
        contact_person?.trim() || null,
        contact_role?.trim() || null,
        billing_cycle || null,
        payment_method || null,
        tax_id?.trim() || null,
        total_spent != null ? Number(total_spent) || 0 : 0,
        workflow_stage || "prospect",
      );

    const newClient = db.prepare("SELECT * FROM clients WHERE id = ?").get(result.lastInsertRowid);
    const clientName = name.trim();
    notifyUser(userId, "Cliente cadastrado", `${clientName} entrou no seu CRM.`, "client", "/clients");
    notifyAdmins(
      "Novo cliente no CRM",
      `${req.user?.email || "Um usuário"} cadastrou ${clientName} como cliente.`,
      "client",
      "/clients",
    );

    res.json({ success: true, data: newClient });
  } catch (e) {
    next(e);
  }
};

// Update client
export const updateClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;
    const {
      name, company, email, phone, segment, status, notes, total_spent,
      address, city, state, country, website, linkedin, instagram,
      industry, company_size, annual_revenue, contact_person, contact_role,
      billing_cycle, payment_method, tax_id,
    } = req.body;

    if (shouldUsePrisma) {
      const id = clientBigInt(clientId);
      const client = await prisma.client.findFirst({ where: { id, userId: BigInt(userId) } });
      if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      const updated = await prisma.client.update({
        where: { id },
        data: {
          name: name?.trim() ?? client.name, company: company?.trim() ?? client.company,
          email: email?.trim() ?? client.email, phone: phone?.trim() ?? client.phone,
          segment: segment ?? client.segment, status: status ?? client.status,
          notes: notes?.trim() ?? client.notes, address: address?.trim() ?? client.address,
          city: city?.trim() ?? client.city, state: state?.trim() ?? client.state,
          country: country?.trim() ?? client.country, website: website?.trim() ?? client.website,
          linkedin: linkedin?.trim() ?? client.linkedin, instagram: instagram?.trim() ?? client.instagram,
          industry: industry?.trim() ?? client.industry, companySize: company_size ?? client.companySize,
          annualRevenue: annual_revenue != null ? Number(annual_revenue) : client.annualRevenue,
          contactPerson: contact_person?.trim() ?? client.contactPerson,
          contactRole: contact_role?.trim() ?? client.contactRole,
          billingCycle: billing_cycle ?? client.billingCycle,
          paymentMethod: payment_method ?? client.paymentMethod, taxId: tax_id?.trim() ?? client.taxId,
          totalSpent: total_spent !== undefined ? Number(total_spent) : client.totalSpent,
          lastContactAt: new Date(), updatedAt: new Date(),
        },
      });
      res.json({ success: true, data: serializeClient(updated) });
      return;
    }

    const client = db
      .prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?")
      .get(clientId, userId) as DbClient | undefined;

    if (!client) {
      throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
    }

    db.prepare(
      `UPDATE clients SET
        name = ?, company = ?, email = ?, phone = ?, segment = ?, status = ?, notes = ?,
        address = ?, city = ?, state = ?, country = ?,
        website = ?, linkedin = ?, instagram = ?,
        industry = ?, company_size = ?, annual_revenue = COALESCE(?, annual_revenue),
        contact_person = ?, contact_role = ?,
        billing_cycle = ?, payment_method = ?, tax_id = ?,
        total_spent = COALESCE(?, total_spent),
        last_contact_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    ).run(
      name?.trim() ?? client.name,
      company?.trim() ?? client.company,
      email?.trim() ?? client.email,
      phone?.trim() ?? client.phone,
      segment ?? client.segment,
      status ?? client.status,
      notes?.trim() ?? client.notes,
      address?.trim() ?? client.address,
      city?.trim() ?? client.city,
      state?.trim() ?? client.state,
      country?.trim() ?? client.country,
      website?.trim() ?? client.website,
      linkedin?.trim() ?? client.linkedin,
      instagram?.trim() ?? client.instagram,
      industry?.trim() ?? client.industry,
      company_size ?? client.company_size,
      annual_revenue != null ? annual_revenue : client.annual_revenue,
      contact_person?.trim() ?? client.contact_person,
      contact_role?.trim() ?? client.contact_role,
      billing_cycle ?? client.billing_cycle,
      payment_method ?? client.payment_method,
      tax_id?.trim() ?? client.tax_id,
      total_spent !== undefined ? total_spent : client.total_spent,
      clientId,
      userId,
    );

    const updated = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// Patch client (partial update for workflow_stage, etc.)
export const patchClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;
    const { workflow_stage } = req.body;

    if (shouldUsePrisma) {
      const id = clientBigInt(clientId);
      const client = await prisma.client.findFirst({ where: { id, userId: BigInt(userId) } });
      if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      const updated = await prisma.client.update({
        where: { id },
        data: workflow_stage ? { workflowStage: workflow_stage, updatedAt: new Date() } : {},
      });
      res.json({ success: true, data: serializeClient(updated) });
      return;
    }

    const client = db
      .prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?")
      .get(clientId, userId) as DbClient | undefined;

    if (!client) {
      throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
    }

    if (workflow_stage) {
      db.prepare(
        `UPDATE clients SET workflow_stage = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
      ).run(workflow_stage, clientId, userId);
    }

    const updated = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// Delete client
export const deleteClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;

    if (shouldUsePrisma) {
      const result = await prisma.client.deleteMany({
        where: { id: clientBigInt(clientId), userId: BigInt(userId) },
      });
      if (result.count === 0) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      res.json({ success: true, data: { id: Number(clientId) } });
      return;
    }

    const result = db.prepare("DELETE FROM clients WHERE id = ? AND user_id = ?").run(clientId, userId);

    if (result.changes === 0) {
      throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
    }

    res.json({ success: true, data: { id: Number(clientId) } });
  } catch (e) {
    next(e);
  }
};

// Get client statistics
export const getClientStats: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const [totalClients, activeClients, leadClients, totals, grouped, recent] = await Promise.all([
        prisma.client.count({ where: { userId: owner } }),
        prisma.client.count({ where: { userId: owner, status: "active" } }),
        prisma.client.count({ where: { userId: owner, status: "lead" } }),
        prisma.client.aggregate({ where: { userId: owner }, _sum: { totalSpent: true } }),
        prisma.client.groupBy({ by: ["segment"], where: { userId: owner }, _count: { _all: true } }),
        prisma.interaction.findMany({
          where: { client: { userId: owner } }, include: { client: { select: { name: true } } },
          orderBy: { createdAt: "desc" }, take: 5,
        }),
      ]);
      res.json({
        success: true,
        data: {
          totalClients, activeClients, leadClients, totalRevenue: totals._sum.totalSpent || 0,
          bySegment: grouped.map((item) => ({ segment: item.segment, count: item._count._all })),
          recentActivity: recent.map((item) => ({ ...serializeInteractionRecord(item), client_name: item.client?.name || null })),
        },
      });
      return;
    }

    const totalClients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE user_id = ?").get(userId) as DbCount;
    const activeClients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE user_id = ? AND status = 'active'").get(userId) as DbCount;
    const leadClients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE user_id = ? AND status = 'lead'").get(userId) as DbCount;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_spent), 0) as s FROM clients WHERE user_id = ?").get(userId) as DbSum;

    // Clients by segment
    const bySegment = db.prepare("SELECT segment, COUNT(*) as count FROM clients WHERE user_id = ? GROUP BY segment").all(userId);

    // Recent activity
    const recentActivity = db
      .prepare(
        `SELECT i.*, c.name as client_name FROM interactions i
         JOIN clients c ON i.client_id = c.id
         WHERE c.user_id = ?
         ORDER BY i.created_at DESC LIMIT 5`,
      )
      .all(userId);

    res.json({
      success: true,
      data: {
        totalClients: totalClients.c,
        activeClients: activeClients.c,
        leadClients: leadClients.c,
        totalRevenue: totalRevenue.s,
        bySegment,
        recentActivity,
      },
    });
  } catch (e) {
    next(e);
  }
};
