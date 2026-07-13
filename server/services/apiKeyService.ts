/**
 * API Keys Service
 *
 * Gerenciamento de chaves de API para integrações externas
 * (webhooks, scripts, automações, ferramentas de terceiros)
 *
 * Formato da chave: cena_abc123xyz789...
 * Armazenamento: Hash SHA-256 da chave completa
 */

import crypto from "crypto";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;  // "cena_abc123xyz..."
  createdAt: string;
  lastUsed: string | null;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;  // Chave completa, exibida APENAS na criação
  keyPrefix: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────
// CREATE API KEY
// ────────────────────────────────────────────────────────────────

/**
 * Cria uma nova API Key
 * A chave completa é retornada APENAS na criação e nunca mais exibida
 */
export async function createApiKey(
  userId: number,
  name: string
): Promise<ApiKeyCreated> {
  // Gerar chave única com prefixo "cena_"
  const randomBytes = crypto.randomBytes(32).toString("hex"); // 64 chars
  const key = `cena_${randomBytes}`;

  // Hash SHA-256 da chave para armazenar
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  // Prefix para exibição (20 primeiros chars)
  const keyPrefix = key.substring(0, 20) + "...";

  // Salvar no banco
  if (shouldUsePrisma) {
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: BigInt(userId),
        name,
        keyHash,
        keyPrefix,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key, // Chave completa APENAS aqui
      keyPrefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt.toISOString(),
    };
  } else {
    const id = `apk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    db.prepare(
      `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(id, userId, name, keyHash, keyPrefix);

    const row = db.prepare(
      "SELECT id, name, key_prefix, created_at FROM api_keys WHERE id = ?"
    ).get(id) as { id: string; name: string; key_prefix: string; created_at: string };

    return {
      id: row.id,
      name: row.name,
      key,
      keyPrefix: row.key_prefix,
      createdAt: row.created_at,
    };
  }
}

// ────────────────────────────────────────────────────────────────
// LIST API KEYS
// ────────────────────────────────────────────────────────────────

/**
 * Lista todas as API Keys do usuário (sem a chave completa)
 */
export async function listApiKeys(userId: number): Promise<ApiKeyItem[]> {
  if (shouldUsePrisma) {
    const keys = await prisma.apiKey.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsed: true,
      },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt.toISOString(),
      lastUsed: k.lastUsed?.toISOString() || null,
    }));
  } else {
    const keys = db.prepare(
      `SELECT id, name, key_prefix, created_at, last_used
       FROM api_keys WHERE user_id = ?
       ORDER BY created_at DESC`
    ).all(userId) as Array<{
      id: string;
      name: string;
      key_prefix: string;
      created_at: string;
      last_used: string | null;
    }>;

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key_prefix,
      createdAt: k.created_at,
      lastUsed: k.last_used,
    }));
  }
}

// ────────────────────────────────────────────────────────────────
// REVOKE API KEY
// ────────────────────────────────────────────────────────────────

/**
 * Revoga (deleta) uma API Key
 */
export async function revokeApiKey(userId: number, keyId: string): Promise<void> {
  if (shouldUsePrisma) {
    const deleted = await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId: BigInt(userId), // Segurança: só pode deletar próprias chaves
      },
    });

    if (deleted.count === 0) {
      throw new Error("API Key não encontrada");
    }
  } else {
    const result = db.prepare(
      "DELETE FROM api_keys WHERE id = ? AND user_id = ?"
    ).run(keyId, userId);

    if (result.changes === 0) {
      throw new Error("API Key não encontrada");
    }
  }

  console.log(`[API Keys] Chave revogada: ${keyId} (user: ${userId})`);
}

// ────────────────────────────────────────────────────────────────
// VALIDATE API KEY (for authentication)
// ────────────────────────────────────────────────────────────────

/**
 * Valida uma API Key e retorna o userId se válida
 * Atualiza lastUsed automaticamente
 *
 * Uso: middleware de autenticação via API Key
 */
export async function validateApiKey(key: string): Promise<bigint | null> {
  if (!key || !key.startsWith("cena_")) {
    return null;
  }

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  if (shouldUsePrisma) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, userId: true },
    });

    if (!apiKey) {
      return null;
    }

    // Atualizar lastUsed (fire-and-forget)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsed: new Date() },
      })
      .catch((err) => console.error("[API Keys] Erro ao atualizar lastUsed:", err));

    return apiKey.userId;
  } else {
    const row = db.prepare(
      "SELECT id, user_id FROM api_keys WHERE key_hash = ?"
    ).get(keyHash) as { id: string; user_id: bigint } | undefined;

    if (!row) {
      return null;
    }

    // Atualizar lastUsed
    db.prepare(
      "UPDATE api_keys SET last_used = datetime('now') WHERE id = ?"
    ).run(row.id);

    return row.user_id;
  }
}

// ────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────

export default {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  validateApiKey,
};
