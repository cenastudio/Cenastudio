import { Router } from "express";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

const router = Router();

async function checkDatabase() {
  try {
    if (shouldUsePrisma) await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    else db.prepare("SELECT 1 AS ok").get();
    return { status: "ok" as const };
  } catch (error) {
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Database check failed",
    };
  }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const heapRatio = usage.heapTotal > 0 ? usage.heapUsed / usage.heapTotal : 0;
  return {
    status: heapRatio > 0.9 ? ("warn" as const) : ("ok" as const),
    heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(usage.heapTotal / 1024 / 1024),
  };
}

export function buildHealthPayload() {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  };
}

export async function buildReadinessPayload() {
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
  };
  const ready = checks.database.status === "ok";

  return {
    ready,
    timestamp: new Date().toISOString(),
    checks,
  };
}

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: buildHealthPayload(),
  });
});

router.get("/ready", async (_req, res) => {
  const data = await buildReadinessPayload();
  res.status(data.ready ? 200 : 503).json({
    success: data.ready,
    data,
  });
});

export default router;
