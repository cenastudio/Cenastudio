import { cleanupExpiredSessions } from "../services/sessionService.js";
import { logger } from "../utils/logger.js";

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;

let interval: NodeJS.Timeout | null = null;

export function startSessionCleanupJob(intervalMs = DEFAULT_INTERVAL_MS) {
  if (process.env.NODE_ENV === "test") return null;
  if (process.env.NODE_ENV !== "production" && process.env.ENABLE_SESSION_CLEANUP_JOB !== "true") return null;
  if (process.env.ENABLE_SESSION_CLEANUP_JOB === "false") return null;
  if (interval) return interval;

  const run = async () => {
    try {
      const result = await cleanupExpiredSessions();
      logger.info({ deleted: result.deleted, cutoff: result.cutoff }, "Session cleanup ran");
    } catch (error) {
      logger.error({ error }, "Session cleanup failed");
    }
  };

  interval = setInterval(run, intervalMs);
  interval.unref?.();
  void run();
  return interval;
}

export function stopSessionCleanupJob() {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
}
