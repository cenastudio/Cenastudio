describe("health routes", () => {
  it("reports liveness", async () => {
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.DATABASE_PATH = `/tmp/cena-health-${process.pid}.db`;
    process.env.LOG_LEVEL = "error";

    const { buildHealthPayload } = await import("./health.js");
    const payload = buildHealthPayload();

    expect(payload.status).toBe("ok");
    expect(payload.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("reports readiness with database status", async () => {
    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    process.env.DATABASE_PATH = `/tmp/cena-health-${process.pid}.db`;
    process.env.LOG_LEVEL = "error";

    const { buildReadinessPayload } = await import("./health.js");
    const payload = await buildReadinessPayload();

    expect(payload.ready).toBe(true);
    expect(payload.checks.database.status).toBe("ok");
  });
});
