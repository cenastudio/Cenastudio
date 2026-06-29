import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbClient, DbCount, DbSum } from "../models/types.js";
import { notifyAdmins, notifyUser } from "../services/notificationService.js";

// List all clients for current user
export const listClients: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { status, segment, search } = req.query;

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
export const getClient: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;

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

    // Get recent interactions
    const interactions = db
      .prepare("SELECT * FROM interactions WHERE client_id = ? ORDER BY created_at DESC LIMIT 10")
      .all(clientId);

    res.json({
      success: true,
      data: {
        client,
        projects: projects || [],
        opportunities: opportunities || [],
        interactions: interactions || [],
      },
    });
  } catch (e) {
    next(e);
  }
};

// Create a new client
export const createClient: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      name, company, email, phone, segment, status, notes,
      address, city, state, country, website, linkedin, instagram,
      industry, company_size, annual_revenue, contact_person, contact_role,
      billing_cycle, payment_method, tax_id, total_spent, workflow_stage,
    } = req.body;

    if (!name || !name.trim()) {
      throw new AppError("O nome do cliente é obrigatório", 400);
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
export const updateClient: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;
    const {
      name, company, email, phone, segment, status, notes, total_spent,
      address, city, state, country, website, linkedin, instagram,
      industry, company_size, annual_revenue, contact_person, contact_role,
      billing_cycle, payment_method, tax_id,
    } = req.body;

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
export const patchClient: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;
    const { workflow_stage } = req.body;

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
export const deleteClient: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = req.params.id;

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
export const getClientStats: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

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
