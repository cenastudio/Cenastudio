import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { runScheduledMaintenance } from "../services/maintenanceService.js";
import { logger } from "../utils/logger.js";

const router = Router();

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authorization = req.get("authorization") ?? "";
  return safeEqual(authorization, `Bearer ${secret}`);
}

async function runMaintenance(req: Request, res: Response) {
  if (!isAuthorizedCronRequest(req)) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const result = await runScheduledMaintenance();
  logger.info({ result }, "Scheduled maintenance cron ran");
  res.json({ success: true, data: result });
}

router.get("/maintenance", runMaintenance);
router.post("/maintenance", runMaintenance);

export default router;
