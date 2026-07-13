/**
 * Plan Configuration Tests
 *
 * Tests for plan-config utility functions
 */

import { describe, it, expect } from "vitest";
import {
  getPlanMetadata,
  hasPlanAccess,
  getNextPlan,
  getPlanDisplayName,
  isPlanPending,
  isPremiumPlan,
  PLAN_HIERARCHY,
} from "@/lib/plan-config";
import type { PlanMode } from "@/types/plan";
import { SITE_CONFIG } from "@shared/site";

describe("plan-config", () => {
  describe("PLAN_HIERARCHY", () => {
    it("should have correct hierarchy order", () => {
      expect(PLAN_HIERARCHY.brand).toBe(0);
      expect(PLAN_HIERARCHY.free).toBe(1);
      expect(PLAN_HIERARCHY.pro).toBe(2);
      expect(PLAN_HIERARCHY.studio).toBe(3);
      expect(PLAN_HIERARCHY["studio-pending"]).toBe(3);
      expect(PLAN_HIERARCHY.whitelabel).toBe(4);
      expect(PLAN_HIERARCHY.enterprise).toBe(5);
      expect(PLAN_HIERARCHY.admin).toBe(6);
    });

    it("should have studio and studio-pending at same level", () => {
      expect(PLAN_HIERARCHY.studio).toBe(PLAN_HIERARCHY["studio-pending"]);
    });
  });

  describe("getPlanMetadata", () => {
    it("should return metadata for free plan", () => {
      const metadata = getPlanMetadata("free");

      expect(metadata.id).toBe("free");
      expect(metadata.displayName).toBe("Free");
      expect(metadata.visualIdentity).toBe("minimal");
      // Fase 3: accentColor is env-driven via SITE_CONFIG.primaryColor
      // (lowercased on load). Default is the pre-Fase-3 orange.
      expect(metadata.accentColor).toBe(SITE_CONFIG.primaryColor);
      expect(metadata.supportsCommercialHub).toBe(false);
      expect(metadata.supportsPipeline).toBe(false);
    });

    it("should return metadata for pro plan", () => {
      const metadata = getPlanMetadata("pro");

      expect(metadata.id).toBe("pro");
      expect(metadata.displayName).toBe("Pro");
      expect(metadata.visualIdentity).toBe("cockpit");
      expect(metadata.supportsPipeline).toBe(true);
      expect(metadata.supportsVideoReviews).toBe(true);
      expect(metadata.supportsCommercialHub).toBe(false);
    });

    it("should return metadata for studio plan", () => {
      const metadata = getPlanMetadata("studio");

      expect(metadata.id).toBe("studio");
      expect(metadata.displayName).toBe("Studio");
      expect(metadata.visualIdentity).toBe("command-center");
      expect(metadata.supportsCommercialHub).toBe(true);
      expect(metadata.supportsFinancialModules).toBe(true);
      expect(metadata.supportsAPI).toBe(true);
      expect(metadata.maxTeamMembers).toBe(-1); // unlimited
    });

    it("should return metadata for admin plan", () => {
      const metadata = getPlanMetadata("admin");

      expect(metadata.id).toBe("admin");
      expect(metadata.displayName).toBe("Admin");
      expect(metadata.visualIdentity).toBe("command-center");
      expect(metadata.maxTeamMembers).toBe(-1);
    });

    it("should return metadata for brand mode", () => {
      const metadata = getPlanMetadata("brand");

      expect(metadata.id).toBe("brand");
      expect(metadata.displayName).toBe("Brand");
      expect(metadata.featureCount).toBe(0);
    });
  });

  describe("hasPlanAccess", () => {
    it("should allow free to access free features", () => {
      expect(hasPlanAccess("free", "free")).toBe(true);
    });

    it("should not allow free to access pro features", () => {
      expect(hasPlanAccess("free", "pro")).toBe(false);
    });

    it("should allow pro to access free features", () => {
      expect(hasPlanAccess("pro", "free")).toBe(true);
    });

    it("should allow pro to access pro features", () => {
      expect(hasPlanAccess("pro", "pro")).toBe(true);
    });

    it("should not allow pro to access studio features", () => {
      expect(hasPlanAccess("pro", "studio")).toBe(false);
    });

    it("should allow studio to access everything except admin", () => {
      expect(hasPlanAccess("studio", "free")).toBe(true);
      expect(hasPlanAccess("studio", "pro")).toBe(true);
      expect(hasPlanAccess("studio", "studio")).toBe(true);
      expect(hasPlanAccess("studio", "admin")).toBe(false);
    });

    it("should allow admin to access everything", () => {
      expect(hasPlanAccess("admin", "free")).toBe(true);
      expect(hasPlanAccess("admin", "pro")).toBe(true);
      expect(hasPlanAccess("admin", "studio")).toBe(true);
      expect(hasPlanAccess("admin", "admin")).toBe(true);
    });

    it("should treat studio-pending same as studio", () => {
      expect(hasPlanAccess("studio-pending", "pro")).toBe(true);
      expect(hasPlanAccess("studio-pending", "studio")).toBe(true);
    });

    it("should not allow brand mode to access paid features", () => {
      expect(hasPlanAccess("brand", "free")).toBe(false);
      expect(hasPlanAccess("brand", "pro")).toBe(false);
      expect(hasPlanAccess("brand", "studio")).toBe(false);
    });
  });

  describe("getNextPlan", () => {
    it("should return pro for free plan", () => {
      expect(getNextPlan("free")).toBe("pro");
    });

    it("should return studio for pro plan", () => {
      expect(getNextPlan("pro")).toBe("studio");
    });

    it("should return undefined for studio (highest)", () => {
      expect(getNextPlan("studio")).toBeUndefined();
    });

    it("should return undefined for admin", () => {
      expect(getNextPlan("admin")).toBeUndefined();
    });

    it("should return undefined for brand", () => {
      expect(getNextPlan("brand")).toBeUndefined();
    });

    it("should return undefined for studio-pending", () => {
      expect(getNextPlan("studio-pending")).toBeUndefined();
    });
  });

  describe("getPlanDisplayName", () => {
    it("should return formatted name for each plan", () => {
      expect(getPlanDisplayName("brand")).toBe("Brand");
      expect(getPlanDisplayName("free")).toBe("Free");
      expect(getPlanDisplayName("pro")).toBe("Pro");
      expect(getPlanDisplayName("studio")).toBe("Studio");
      expect(getPlanDisplayName("studio-pending")).toBe("Studio (Pending)");
      expect(getPlanDisplayName("admin")).toBe("Admin");
    });
  });

  describe("isPlanPending", () => {
    it("should return true only for studio-pending", () => {
      expect(isPlanPending("studio-pending")).toBe(true);
    });

    it("should return false for other plans", () => {
      expect(isPlanPending("free")).toBe(false);
      expect(isPlanPending("pro")).toBe(false);
      expect(isPlanPending("studio")).toBe(false);
      expect(isPlanPending("admin")).toBe(false);
      expect(isPlanPending("brand")).toBe(false);
    });
  });

  describe("isPremiumPlan", () => {
    it("should return true for paid plans", () => {
      expect(isPremiumPlan("pro")).toBe(true);
      expect(isPremiumPlan("studio")).toBe(true);
      expect(isPremiumPlan("studio-pending")).toBe(true);
      expect(isPremiumPlan("admin")).toBe(true);
    });

    it("should return false for free and brand", () => {
      expect(isPremiumPlan("free")).toBe(false);
      expect(isPremiumPlan("brand")).toBe(false);
    });
  });

  describe("Plan features", () => {
    it("should have correct feature counts", () => {
      const freeMetadata = getPlanMetadata("free");
      const proMetadata = getPlanMetadata("pro");
      const studioMetadata = getPlanMetadata("studio");

      expect(freeMetadata.featureCount).toBe(8);
      expect(proMetadata.featureCount).toBe(12);
      expect(studioMetadata.featureCount).toBe(-1); // unlimited
    });

    it("should have correct team member limits", () => {
      const freeMetadata = getPlanMetadata("free");
      const proMetadata = getPlanMetadata("pro");
      const studioMetadata = getPlanMetadata("studio");

      expect(freeMetadata.maxTeamMembers).toBe(1);
      expect(proMetadata.maxTeamMembers).toBe(5);
      expect(studioMetadata.maxTeamMembers).toBe(-1); // unlimited
    });

    it("should have studio-specific features", () => {
      const studioMetadata = getPlanMetadata("studio");

      expect(studioMetadata.supportsCommercialHub).toBe(true);
      expect(studioMetadata.supportsFinancialModules).toBe(true);
      expect(studioMetadata.supportsCustomBranding).toBe(true);
      expect(studioMetadata.supportsAPI).toBe(true);
    });

    it("should have pro-specific features", () => {
      const proMetadata = getPlanMetadata("pro");

      expect(proMetadata.supportsPipeline).toBe(true);
      expect(proMetadata.supportsVideoReviews).toBe(true);
      expect(proMetadata.supportsCommercialHub).toBe(false); // Studio only
    });
  });

  describe("Visual identity", () => {
    it("should have correct visual identity per plan", () => {
      expect(getPlanMetadata("brand").visualIdentity).toBe("minimal");
      expect(getPlanMetadata("free").visualIdentity).toBe("minimal");
      expect(getPlanMetadata("pro").visualIdentity).toBe("cockpit");
      expect(getPlanMetadata("studio").visualIdentity).toBe("command-center");
      expect(getPlanMetadata("admin").visualIdentity).toBe("command-center");
    });

    it("should have consistent primary accent color", () => {
      const plans: PlanMode[] = ["brand", "free", "pro", "studio", "admin"];
      // Fase 3: accent is env-driven — derives from SITE_CONFIG.primaryColor.
      const expectedColor = SITE_CONFIG.primaryColor;

      plans.forEach((plan) => {
        expect(getPlanMetadata(plan).accentColor).toBe(expectedColor);
      });
    });
  });
});
