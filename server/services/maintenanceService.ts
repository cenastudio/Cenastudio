import { cleanupExpiredSessions, type SessionCleanupResult } from "./sessionService.js";
import { retryFailedDeliveries } from "./webhookService.js";

export interface MaintenanceResult {
  webhooks: {
    processed: number;
    succeeded: number;
    failed: number;
  };
  sessions: SessionCleanupResult;
}

export async function runScheduledMaintenance(): Promise<MaintenanceResult> {
  const [webhooks, sessions] = await Promise.all([
    retryFailedDeliveries(),
    cleanupExpiredSessions(),
  ]);

  return { webhooks, sessions };
}
