import { describe, expect, it } from "vitest";
import { getPlanEntitlement } from "../../shared/planEntitlements.js";

/**
 * These assertions lock the enforced entitlements to what each plan advertises
 * in the pricing/seed copy (server/models/prismaSeed.ts). They exist to catch
 * regressions where marketing promises something the code does not deliver.
 * Convention: teamMemberLimit -1 = unlimited, 0 = feature unavailable;
 * clientLimit null = unlimited.
 */
describe("plan entitlements match advertised plans", () => {
  it("free has no team seats", () => {
    expect(getPlanEntitlement("free").teamMemberLimit).toBe(0);
  });

  it("pro advertises 'Colaboração (5 membros)'", () => {
    expect(getPlanEntitlement("pro").teamMemberLimit).toBe(5);
  });

  it("studio advertises 'Equipe ilimitada'", () => {
    expect(getPlanEntitlement("studio").teamMemberLimit).toBe(-1);
  });

  it("white-label advertises '10 usuários de equipe' and 'Clientes ilimitados'", () => {
    const wl = getPlanEntitlement("whitelabel");
    expect(wl.teamMemberLimit).toBe(10);
    expect(wl.clientLimit).toBeNull();
  });

  it("enterprise advertises 'Usuários ilimitados'", () => {
    expect(getPlanEntitlement("enterprise").teamMemberLimit).toBe(-1);
  });

  it("free does not include pipeline, video reviews, proposals, webhooks or calendar export", () => {
    const free = getPlanEntitlement("free");
    expect(free.pipeline).toBe(false);
    expect(free.videoReviews).toBe(false);
    expect(free.proposals).toBe(false);
    expect(free.webhooks).toBe(false);
    expect(free.calendarExport).toBe(false);
  });

  it("pro advertises 'Review de vídeos com anotações', 'Portal do cliente com aprovações' and 'CRM completo + pipeline comercial'", () => {
    const pro = getPlanEntitlement("pro");
    expect(pro.pipeline).toBe(true);
    expect(pro.videoReviews).toBe(true);
    expect(pro.proposals).toBe(true);
    // Webhooks and calendar export remain Studio+ per shared/site.ts PRICING.
    expect(pro.webhooks).toBe(false);
    expect(pro.calendarExport).toBe(false);
  });

  it("studio advertises 'Webhooks para automação' and 'Exportar cronograma para agenda (.ics)'", () => {
    const studio = getPlanEntitlement("studio");
    expect(studio.webhooks).toBe(true);
    expect(studio.calendarExport).toBe(true);
    expect(studio.pipeline).toBe(true);
    expect(studio.videoReviews).toBe(true);
    expect(studio.proposals).toBe(true);
  });
});
