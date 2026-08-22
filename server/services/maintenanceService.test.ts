import { beforeEach, describe, expect, it, vi } from "vitest";

const cleanupExpiredSessions = vi.fn();
const retryFailedDeliveries = vi.fn();

vi.mock("./sessionService.js", () => ({ cleanupExpiredSessions }));
vi.mock("./webhookService.js", () => ({ retryFailedDeliveries }));

const { runScheduledMaintenance } = await import("./maintenanceService.js");

describe("runScheduledMaintenance", () => {
  beforeEach(() => {
    cleanupExpiredSessions.mockReset();
    retryFailedDeliveries.mockReset();
  });

  it("runs webhook retry and session cleanup in one cron pass", async () => {
    retryFailedDeliveries.mockResolvedValue({ processed: 2, succeeded: 1, failed: 1 });
    cleanupExpiredSessions.mockResolvedValue({ deleted: 3, cutoff: "2026-08-15T00:00:00.000Z" });

    await expect(runScheduledMaintenance()).resolves.toEqual({
      webhooks: { processed: 2, succeeded: 1, failed: 1 },
      sessions: { deleted: 3, cutoff: "2026-08-15T00:00:00.000Z" },
    });
    expect(retryFailedDeliveries).toHaveBeenCalledTimes(1);
    expect(cleanupExpiredSessions).toHaveBeenCalledTimes(1);
  });
});
