import { retryFailedDeliveries } from "../services/webhookService.js";
import { logger } from "../utils/logger.js";

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

let interval: NodeJS.Timeout | null = null;

export function startWebhookRetryJob(intervalMs = DEFAULT_INTERVAL_MS) {
  if (process.env.NODE_ENV === "test") return null;
  if (process.env.ENABLE_WEBHOOK_RETRY_JOB === "false") return null;
  if (interval) return interval;

  const run = async () => {
    try {
      const result = await retryFailedDeliveries();
      logger.info(result, "Webhook retry ran");
    } catch (error) {
      logger.error({ error }, "Webhook retry failed");
    }
  };

  interval = setInterval(run, intervalMs);
  interval.unref?.();
  void run();
  return interval;
}

export function stopWebhookRetryJob() {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
}
