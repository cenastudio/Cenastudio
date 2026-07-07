import type { Request, RequestHandler, Response } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import type { DbClient, DbOpportunity, DbProject } from "../models/types.js";

const clientSnakeFields = {
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

const projectSnakeFields = {
  userId: "user_id",
  clientId: "client_id",
  metadataJson: "metadata_json",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

const opportunitySnakeFields = {
  userId: "user_id",
  clientId: "client_id",
  estimatedValue: "estimated_value",
  expectedCloseDate: "expected_close_date",
  lostReason: "lost_reason",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function serializePrismaClient(value: any) {
  return withSnakeCase(value, clientSnakeFields);
}

function serializePrismaProjectRow(value: any) {
  const safe = withSnakeCase(value, projectSnakeFields) as any;
  safe.client_name = safe.client?.company || safe.client?.name || null;
  delete safe.client;
  return safe;
}

function serializePrismaOpportunity(value: any) {
  const safe = withSnakeCase(value, opportunitySnakeFields) as any;
  safe.client_name = safe.client?.company || safe.client?.name || null;
  delete safe.client;
  return safe;
}
import {
  exportToExcel,
  formatProjectsForExcel,
  formatClientsForExcel,
  formatOpportunitiesForExcel,
} from "../services/export/excelExporter.js";
import {
  exportToCsv,
  formatProjectsForCsv,
  formatClientsForCsv,
  formatOpportunitiesForCsv,
} from "../services/export/csvExporter.js";
import {
  exportToPdf,
  formatProjectsForPdf,
  formatClientsForPdf,
} from "../services/export/pdfExporter.js";

function positiveId(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${label} inválido`, 400);
  return parsed;
}

function toCsvRows(rows: Array<Record<string, any>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: any) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

function sendJsonOrCsv(req: Request, res: Response, rows: Array<Record<string, any>>, filenameBase: string) {
  const format = String(req.query.format || "json").toLowerCase();
  if (format === "csv") {
    const csv = toCsvRows(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
    res.send("\uFEFF" + csv);
    return;
  }
  res.json({ success: true, data: rows });
}

/**
 * GET /api/export/projects/:id
 * Exporta um único projeto (JSON/CSV via ?format=)
 */
export const exportProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = positiveId(req.params.id, "Projeto");

    let project: Record<string, any> | undefined;
    if (shouldUsePrisma) {
      const found = await prisma.project.findFirst({
        where: { id: BigInt(projectId), userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
      });
      project = found ? serializePrismaProjectRow(found) : undefined;
    } else {
      project = db
        .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
        .get(projectId, userId) as DbProject | undefined;
    }

    if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);

    sendJsonOrCsv(req, res, [project], `cenastudio_projeto_${projectId}`);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/export/clients/:id
 * Exporta um único cliente (JSON/CSV via ?format=)
 */
export const exportClient: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const clientId = positiveId(req.params.id, "Cliente");

    let client: Record<string, any> | undefined;
    if (shouldUsePrisma) {
      const found = await prisma.client.findFirst({
        where: { id: BigInt(clientId), userId: BigInt(userId) },
      });
      client = found ? serializePrismaClient(found) : undefined;
    } else {
      client = db
        .prepare("SELECT * FROM clients WHERE id = ? AND user_id = ?")
        .get(clientId, userId) as DbClient | undefined;
    }

    if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);

    sendJsonOrCsv(req, res, [client], `cenastudio_cliente_${clientId}`);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/export/clients
 * Exporta todos os clientes do usuário (JSON/CSV via ?format=)
 */
export const exportAllClients: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    let clients: Array<Record<string, any>>;
    if (shouldUsePrisma) {
      const rows = await prisma.client.findMany({
        where: { userId: BigInt(userId) },
        orderBy: { createdAt: "desc" },
      });
      clients = rows.map((row) => serializePrismaClient(row));
    } else {
      clients = db
        .prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC")
        .all(userId) as DbClient[];
    }

    sendJsonOrCsv(req, res, clients, "cenastudio_clientes");
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/export/pipeline
 * Exporta oportunidades do pipeline (JSON/CSV via ?format=)
 */
export const exportPipeline: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    let opportunities: Array<Record<string, any>>;
    if (shouldUsePrisma) {
      const rows = await prisma.opportunity.findMany({
        where: { userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { updatedAt: "desc" },
      });
      opportunities = rows.map((row) => serializePrismaOpportunity(row));
    } else {
      opportunities = db
        .prepare(
          `SELECT o.*, COALESCE(c.company, c.name) AS client_name
           FROM opportunities o
           LEFT JOIN clients c ON c.id = o.client_id
           WHERE o.user_id = ?
           ORDER BY o.updated_at DESC`,
        )
        .all(userId) as DbOpportunity[];
    }

    sendJsonOrCsv(req, res, opportunities, "cenastudio_pipeline");
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/export/projects/:format(excel|csv|pdf)
 * Exporta lista de projetos em formato avançado
 */
export async function exportProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const { format } = req.params;

    let projects: any[];
    if (shouldUsePrisma) {
      const rows = await prisma.project.findMany({
        where: { userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      });
      projects = rows.map((row) => serializePrismaProjectRow(row));
    } else {
      const stmt = db.prepare(`
        SELECT p.*, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      projects = stmt.all(userId) as any[];
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `cenastudio_projetos_${timestamp}`;

    if (format === "excel") {
      const formattedData = formatProjectsForExcel(projects);
      const buffer = exportToExcel({ data: formattedData, sheetName: "Projetos", filename });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else if (format === "csv") {
      const formattedData = formatProjectsForCsv(projects);
      const csv = exportToCsv({ data: formattedData });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.send("\uFEFF" + csv);
    } else if (format === "pdf") {
      const formatted = formatProjectsForPdf(projects);
      const buffer = exportToPdf({
        title: formatted.title,
        subtitle: `Total: ${projects.length} projetos`,
        data: formatted.data,
        columns: formatted.columns,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      res.send(buffer);
    } else {
      res.status(400).json({ error: "Formato inválido. Use: excel, csv ou pdf" });
    }
  } catch (error) {
    console.error("Error exporting projects:", error);
    res.status(500).json({ error: "Erro ao exportar projetos" });
  }
}

/**
 * GET /api/export/clients/:format(excel|csv|pdf)
 * Exporta lista de clientes em formato avançado
 */
export async function exportClients(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const { format } = req.params;

    let clients: any[];
    if (shouldUsePrisma) {
      const rows = await prisma.client.findMany({
        where: { userId: BigInt(userId) },
        orderBy: { createdAt: "desc" },
      });
      clients = rows.map((row) => serializePrismaClient(row));
    } else {
      const stmt = db.prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC");
      clients = stmt.all(userId) as any[];
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `cenastudio_clientes_${timestamp}`;

    if (format === "excel") {
      const formattedData = formatClientsForExcel(clients);
      const buffer = exportToExcel({ data: formattedData, sheetName: "Clientes", filename });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else if (format === "csv") {
      const formattedData = formatClientsForCsv(clients);
      const csv = exportToCsv({ data: formattedData });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.send("\uFEFF" + csv);
    } else if (format === "pdf") {
      const formatted = formatClientsForPdf(clients);
      const buffer = exportToPdf({
        title: formatted.title,
        subtitle: `Total: ${clients.length} clientes`,
        data: formatted.data,
        columns: formatted.columns,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      res.send(buffer);
    } else {
      res.status(400).json({ error: "Formato inválido. Use: excel, csv ou pdf" });
    }
  } catch (error) {
    console.error("Error exporting clients:", error);
    res.status(500).json({ error: "Erro ao exportar clientes" });
  }
}

/**
 * GET /api/export/opportunities/:format(excel|csv)
 * Exporta lista de oportunidades em formato avançado
 */
export async function exportOpportunities(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const { format } = req.params;

    let opportunities: any[];
    if (shouldUsePrisma) {
      const rows = await prisma.opportunity.findMany({
        where: { userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" },
      });
      opportunities = rows.map((row) => serializePrismaOpportunity(row));
    } else {
      const stmt = db.prepare(`
        SELECT o.*, c.name as client_name
        FROM opportunities o
        LEFT JOIN clients c ON o.client_id = c.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `);
      opportunities = stmt.all(userId) as any[];
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `cenastudio_oportunidades_${timestamp}`;

    if (format === "excel") {
      const formattedData = formatOpportunitiesForExcel(opportunities);
      const buffer = exportToExcel({ data: formattedData, sheetName: "Oportunidades", filename });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
    } else if (format === "csv") {
      const formattedData = formatOpportunitiesForCsv(opportunities);
      const csv = exportToCsv({ data: formattedData });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      res.send("\uFEFF" + csv);
    } else {
      res.status(400).json({ error: "Formato inválido. Use: excel ou csv" });
    }
  } catch (error) {
    console.error("Error exporting opportunities:", error);
    res.status(500).json({ error: "Erro ao exportar oportunidades" });
  }
}
