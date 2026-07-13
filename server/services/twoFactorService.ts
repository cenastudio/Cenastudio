/**
 * Two-Factor Authentication (2FA) Service
 *
 * Implementa autenticação de dois fatores usando TOTP (Time-based One-Time Password)
 * compatível com Google Authenticator, Authy, Microsoft Authenticator, etc.
 *
 * Padrão: RFC 6238 (TOTP)
 */

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { SITE_CONFIG } from "@shared/site";
import crypto from "crypto";

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export interface TwoFactorSetupResponse {
  qrCode: string;           // data:image/png;base64,...
  secret: string;           // Secret em base32 para entrada manual
  backupCodes: string[];    // 5 códigos de backup
}

// ────────────────────────────────────────────────────────────────
// 2FA SETUP
// ────────────────────────────────────────────────────────────────

/**
 * Gera QR Code e secret TOTP para configurar 2FA
 * O usuário deve escanear o QR Code com Google Authenticator
 */
export async function setup2FA(
  userId: bigint,
  userEmail: string,
  userName: string | null
): Promise<TwoFactorSetupResponse> {
  // Gerar secret TOTP
  const secret = speakeasy.generateSecret({
    name: `${SITE_CONFIG.brandName} (${userName || userEmail})`,
    issuer: SITE_CONFIG.brandName,
    length: 32,
  });

  if (!secret.otpauth_url || !secret.base32) {
    throw new Error("Erro ao gerar secret TOTP");
  }

  // Gerar QR Code como data URL
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  // Gerar 5 códigos de backup (8 caracteres cada, formato: XXXX-YYYY)
  const backupCodes = Array.from({ length: 5 }, () => {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
  });

  // Hash dos códigos de backup antes de salvar
  const hashedBackupCodes = backupCodes.map((code) =>
    crypto.createHash("sha256").update(code).digest("hex")
  );

  // Salvar no banco (ainda não ativa o 2FA, só depois da verificação)
  if (shouldUsePrisma) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        backupCodes: hashedBackupCodes as any,
        twoFactorEnabled: false, // Ativa apenas após verificação
      },
    });
  } else {
    db.prepare(
      `UPDATE users
       SET two_factor_secret = ?, backup_codes = ?, two_factor_enabled = 0
       WHERE id = ?`
    ).run(secret.base32, JSON.stringify(hashedBackupCodes), userId);
  }

  console.log(`[2FA] Setup iniciado para usuário ${userId}`);

  return {
    qrCode,
    secret: secret.base32!,
    backupCodes, // Retorna em plain text APENAS na criação
  };
}

// ────────────────────────────────────────────────────────────────
// 2FA VERIFICATION
// ────────────────────────────────────────────────────────────────

/**
 * Verifica código 2FA (6 dígitos) e ativa o 2FA se correto
 */
export async function verify2FA(
  userId: bigint,
  code: string
): Promise<boolean> {
  // Buscar secret do usuário
  let secret: string | null = null;

  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });
    secret = user?.twoFactorSecret || null;
  } else {
    const row = db.prepare(
      "SELECT two_factor_secret FROM users WHERE id = ?"
    ).get(userId) as { two_factor_secret: string | null } | undefined;
    secret = row?.two_factor_secret || null;
  }

  if (!secret) {
    throw new Error("2FA não foi configurado");
  }

  // Verificar código TOTP
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 2, // Aceita ±2 time steps (60s antes/depois)
  });

  if (!isValid) {
    return false;
  }

  // Se código válido, ativar 2FA
  if (shouldUsePrisma) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  } else {
    db.prepare(
      "UPDATE users SET two_factor_enabled = 1 WHERE id = ?"
    ).run(userId);
  }

  console.log(`[2FA] Ativado com sucesso para usuário ${userId}`);

  return true;
}

/**
 * Valida código 2FA durante login (não ativa, apenas verifica)
 */
export async function validate2FACode(
  userId: bigint,
  code: string
): Promise<boolean> {
  let secret: string | null = null;
  let backupCodes: string[] = [];

  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        backupCodes: true,
      },
    });
    secret = user?.twoFactorSecret || null;
    backupCodes = (user?.backupCodes as string[]) || [];
  } else {
    const row = db.prepare(
      "SELECT two_factor_secret, backup_codes FROM users WHERE id = ?"
    ).get(userId) as { two_factor_secret: string | null; backup_codes: string } | undefined;
    secret = row?.two_factor_secret || null;
    backupCodes = row?.backup_codes ? JSON.parse(row.backup_codes) : [];
  }

  if (!secret) {
    return false;
  }

  // Verificar código TOTP
  const isTotpValid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 2,
  });

  if (isTotpValid) {
    return true;
  }

  // Se TOTP falhou, tentar backup code
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const backupIndex = backupCodes.indexOf(codeHash);

  if (backupIndex !== -1) {
    // Backup code válido, remover da lista (one-time use)
    backupCodes.splice(backupIndex, 1);

    if (shouldUsePrisma) {
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: backupCodes as any },
      });
    } else {
      db.prepare(
        "UPDATE users SET backup_codes = ? WHERE id = ?"
      ).run(JSON.stringify(backupCodes), userId);
    }

    console.log(`[2FA] Backup code usado para usuário ${userId}. Restantes: ${backupCodes.length}`);
    return true;
  }

  return false;
}

// ────────────────────────────────────────────────────────────────
// 2FA DISABLE
// ────────────────────────────────────────────────────────────────

/**
 * Desativa 2FA e limpa secret/backup codes
 */
export async function disable2FA(userId: bigint): Promise<void> {
  if (shouldUsePrisma) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [] as any,
      },
    });
  } else {
    db.prepare(
      `UPDATE users
       SET two_factor_enabled = 0, two_factor_secret = NULL, backup_codes = '[]'
       WHERE id = ?`
    ).run(userId);
  }

  console.log(`[2FA] Desativado para usuário ${userId}`);
}

// ────────────────────────────────────────────────────────────────
// 2FA STATUS
// ────────────────────────────────────────────────────────────────

/**
 * Verifica se 2FA está ativado para o usuário
 */
export async function is2FAEnabled(userId: bigint): Promise<boolean> {
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled || false;
  } else {
    const row = db.prepare(
      "SELECT two_factor_enabled FROM users WHERE id = ?"
    ).get(userId) as { two_factor_enabled: number } | undefined;
    return row?.two_factor_enabled === 1;
  }
}

// ────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────

export default {
  setup2FA,
  verify2FA,
  validate2FACode,
  disable2FA,
  is2FAEnabled,
};
