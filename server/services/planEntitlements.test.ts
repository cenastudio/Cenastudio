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
});
