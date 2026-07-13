/**
 * LGPD Service
 *
 * Implementa os requisitos da Lei nº 13.709/2018 (LGPD) e GDPR
 * para conformidade legal e proteção de dados pessoais.
 *
 * Principais funcionalidades:
 * - Transparência de dados (Art. 9)
 * - Direitos do titular (Art. 18): acesso, correção, exclusão
 * - Controles de privacidade
 */

import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { sendEmail, isEmailConfigured } from "./emailService.js";
import { SITE_CONFIG } from "@shared/site";

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface DataStats {
  projects: { count: number; size: number };
  files: { count: number; size: number };
  clients: { count: number; size: number };
  reviews: { count: number; size: number };
  totalSize: number;
}

export interface PrivacySettings {
  profileVisibility: "public" | "team" | "private";
  allowSearchEngineIndexing: boolean;
  shareAnalyticsWithTeam: boolean;
}

export type LgpdRequestType = "copy" | "correct" | "delete";

// ────────────────────────────────────────────────────────────────
// TRANSPARÊNCIA DE DADOS (LGPD Art. 9)
// ────────────────────────────────────────────────────────────────

/**
 * Calcula estatísticas de dados armazenados do usuário
 * Implementa o direito à transparência (LGPD Art. 9)
 */
export async function calculateDataStats(userId: bigint): Promise<DataStats> {
  if (shouldUsePrisma) {
    const [projects, files, clients, reviews] = await Promise.all([
      // Projects: estimar 50KB por projeto (metadata JSON)
      prisma.project.count({ where: { userId } }),

      // Files: somar tamanho real dos arquivos
      prisma.file.aggregate({
        where: { userId },
        _count: true,
        _sum: { size: true },
      }),

      // Clients: estimar 5KB por cliente
      prisma.client.count({ where: { userId } }),

      // Reviews: estimar 100KB por review (com comentários)
      prisma.videoReview.count({ where: { userId } }),
    ]);

    const projectsSize = projects * 0.05; // 50KB em MB
    const filesSize = (files._sum.size || 0) / (1024 * 1024); // Bytes to MB
    const clientsSize = clients * 0.005; // 5KB em MB
    const reviewsSize = reviews * 0.1; // 100KB em MB

    return {
      projects: { count: projects, size: parseFloat(projectsSize.toFixed(2)) },
      files: { count: files._count || 0, size: parseFloat(filesSize.toFixed(2)) },
      clients: { count: clients, size: parseFloat(clientsSize.toFixed(2)) },
      reviews: { count: reviews, size: parseFloat(reviewsSize.toFixed(2)) },
      totalSize: parseFloat((projectsSize + filesSize + clientsSize + reviewsSize).toFixed(2)),
    };
  } else {
    // SQLite fallback
    const projects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?").get(userId) as { count: number };
    const files = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total FROM files WHERE user_id = ?").get(userId) as { count: number; total: number };
    const clients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE user_id = ?").get(userId) as { count: number };
    const reviews = db.prepare("SELECT COUNT(*) as count FROM video_reviews WHERE user_id = ?").get(userId) as { count: number };

    const projectsSize = projects.count * 0.05;
    const filesSize = files.total / (1024 * 1024);
    const clientsSize = clients.count * 0.005;
    const reviewsSize = reviews.count * 0.1;

    return {
      projects: { count: projects.count, size: parseFloat(projectsSize.toFixed(2)) },
      files: { count: files.count, size: parseFloat(filesSize.toFixed(2)) },
      clients: { count: clients.count, size: parseFloat(clientsSize.toFixed(2)) },
      reviews: { count: reviews.count, size: parseFloat(reviewsSize.toFixed(2)) },
      totalSize: parseFloat((projectsSize + filesSize + clientsSize + reviewsSize).toFixed(2)),
    };
  }
}

// ────────────────────────────────────────────────────────────────
// CONTROLES DE PRIVACIDADE
// ────────────────────────────────────────────────────────────────

/**
 * Salva configurações de privacidade do usuário
 */
export async function savePrivacySettings(
  userId: bigint,
  settings: PrivacySettings
): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.user.update({
      where: { id: userId },
      data: { privacySettings: settings as any },
    });
  } else {
    db.prepare(
      "UPDATE users SET privacy_settings = ? WHERE id = ?"
    ).run(JSON.stringify(settings), userId);
  }
}

/**
 * Obtém configurações de privacidade do usuário
 */
export async function getPrivacySettings(userId: bigint): Promise<PrivacySettings> {
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { privacySettings: true },
    });

    return (user?.privacySettings as PrivacySettings) || {
      profileVisibility: "team",
      allowSearchEngineIndexing: true,
      shareAnalyticsWithTeam: true,
    };
  } else {
    const row = db.prepare(
      "SELECT privacy_settings FROM users WHERE id = ?"
    ).get(userId) as { privacy_settings: string } | undefined;

    if (!row) {
      return {
        profileVisibility: "team",
        allowSearchEngineIndexing: true,
        shareAnalyticsWithTeam: true,
      };
    }

    return JSON.parse(row.privacy_settings);
  }
}

// ────────────────────────────────────────────────────────────────
// SOLICITAÇÕES LGPD/GDPR (Art. 18)
// ────────────────────────────────────────────────────────────────

/**
 * Cria uma solicitação LGPD (cópia, correção ou exclusão de dados)
 * Implementa LGPD Art. 18 (Direitos do titular)
 */
export async function createLgpdRequest(
  userId: bigint,
  type: LgpdRequestType,
  userEmail: string,
  userName: string | null
): Promise<{ requestId: string; estimatedDays: number }> {
  // Gerar ID único
  const requestId = `LGPD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  // Definir prazos legais conforme LGPD
  const estimatedDays = type === "copy" ? 30 : type === "correct" ? 5 : 7;

  // Salvar no banco
  if (shouldUsePrisma) {
    await prisma.lgpdRequest.create({
      data: {
        id: requestId,
        userId,
        type,
        status: "pending",
      },
    });
  } else {
    db.prepare(
      `INSERT INTO lgpd_requests (id, user_id, type, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`
    ).run(requestId, userId, type);
  }

  // Enviar email de confirmação ao usuário (best-effort)
  if (isEmailConfigured) {
    const typeLabels = {
      copy: "Cópia dos Dados",
      correct: "Correção de Dados",
      delete: "Exclusão de Dados",
    };

    const typeDescriptions = {
      copy: `Você receberá um arquivo JSON com todos os seus dados em até ${estimatedDays} dias, conforme LGPD Art. 18, II.`,
      correct: `Entraremos em contato em até ${estimatedDays} dias úteis para corrigir os dados informados, conforme LGPD Art. 18, III.`,
      delete: `Seus dados serão permanentemente excluídos em até ${estimatedDays} dias úteis, conforme LGPD Art. 18, VI. Esta ação é irreversível.`,
    };

    sendEmail({
      to: userEmail,
      subject: `Solicitação LGPD Recebida: ${typeLabels[type]} — ${SITE_CONFIG.brandName}`,
      html: `
        <p>Olá${userName ? ` ${userName}` : ""},</p>
        <p>Recebemos sua solicitação LGPD de <strong>${typeLabels[type]}</strong>.</p>
        <p><strong>Protocolo:</strong> ${requestId}</p>
        <p>${typeDescriptions[type]}</p>
        <hr/>
        <p style="color:#888;font-size:0.9em">
          Esta solicitação está em conformidade com a Lei nº 13.709/2018 (LGPD) e GDPR.<br/>
          Para dúvidas, entre em contato: privacidade@cenastudio.com.br
        </p>
      `,
      text: `
Solicitação LGPD Recebida

Olá${userName ? ` ${userName}` : ""},

Recebemos sua solicitação de ${typeLabels[type]}.
Protocolo: ${requestId}

${typeDescriptions[type]}

Esta solicitação está em conformidade com a LGPD (Lei nº 13.709/2018) e GDPR.
Dúvidas: privacidade@cenastudio.com.br
      `.trim(),
    }).catch((err) => {
      console.error(`[lgpdService] Falha ao enviar email de confirmação:`, err);
    });
  }

  // Log para auditoria (console por enquanto, ideal seria um sistema de logs separado)
  console.log(`[LGPD] Nova solicitação: ${requestId} | Tipo: ${type} | User: ${userId} | Status: pending`);

  return { requestId, estimatedDays };
}

/**
 * Lista solicitações LGPD do usuário
 */
export async function listUserLgpdRequests(userId: bigint) {
  if (shouldUsePrisma) {
    return await prisma.lgpdRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        processedAt: true,
        notes: true,
      },
    });
  } else {
    return db.prepare(
      `SELECT id, type, status, created_at, processed_at, notes
       FROM lgpd_requests WHERE user_id = ?
       ORDER BY created_at DESC`
    ).all(userId);
  }
}

/**
 * Processa uma solicitação LGPD (admin only)
 * Este método seria chamado por um painel administrativo
 */
export async function processLgpdRequest(
  requestId: string,
  status: "completed" | "rejected",
  processedBy: string,
  notes?: string
): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.lgpdRequest.update({
      where: { id: requestId },
      data: {
        status,
        processedAt: new Date(),
        processedBy,
        notes,
      },
    });
  } else {
    db.prepare(
      `UPDATE lgpd_requests
       SET status = ?, processed_at = datetime('now'), processed_by = ?, notes = ?
       WHERE id = ?`
    ).run(status, processedBy, notes || null, requestId);
  }

  console.log(`[LGPD] Solicitação processada: ${requestId} | Status: ${status} | Por: ${processedBy}`);
}

// ────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────

export default {
  calculateDataStats,
  savePrivacySettings,
  getPrivacySettings,
  createLgpdRequest,
  listUserLgpdRequests,
  processLgpdRequest,
};
