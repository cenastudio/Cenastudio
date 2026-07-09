/**
 * Apply Tokens Tests
 *
 * Tests for CSS token application system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyPlanTokens } from "@/lib/design-system/apply-tokens";
import type { PlanMode } from "@/types/plan";

describe("apply-tokens", () => {
  beforeEach(() => {
    // Reset document element
    document.documentElement.removeAttribute("data-plan");
    document.documentElement.style.cssText = "";
  });

  describe("applyPlanTokens", () => {
    it("should set data-plan attribute", () => {
      applyPlanTokens("free");
      expect(document.documentElement.getAttribute("data-plan")).toBe("free");

      applyPlanTokens("pro");
      expect(document.documentElement.getAttribute("data-plan")).toBe("pro");

      applyPlanTokens("studio");
      expect(document.documentElement.getAttribute("data-plan")).toBe("studio");
    });

    it("should apply free plan tokens", () => {
      applyPlanTokens("free");

      const style = document.documentElement.style;

      // Check typography scale
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.0");

      // Check primary accent
      expect(style.getPropertyValue("--plan-accent-primary")).toBe("#e85002");

      // Check no financial accent
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("");

      // Check no glow effects
      expect(style.getPropertyValue("--plan-glow-sm")).toBe("");
      expect(style.getPropertyValue("--plan-glow-md")).toBe("");
      expect(style.getPropertyValue("--plan-glow-lg")).toBe("");
    });

    it("should apply pro plan tokens", () => {
      applyPlanTokens("pro");

      const style = document.documentElement.style;

      // Check enhanced typography scale
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.06");

      // Check primary accent
      expect(style.getPropertyValue("--plan-accent-primary")).toBe("#e85002");

      // Check no financial accent (Pro doesn't have it)
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("");

      // Check glow effects present
      expect(style.getPropertyValue("--plan-glow-sm")).toContain("rgba(232, 80, 2");
      expect(style.getPropertyValue("--plan-glow-md")).toContain("rgba(232, 80, 2");
      expect(style.getPropertyValue("--plan-glow-lg")).toContain("rgba(232, 80, 2");
    });

    it("should apply studio plan tokens", () => {
      applyPlanTokens("studio");

      const style = document.documentElement.style;

      // Check premium typography scale
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.08");

      // Check primary accent (orange)
      expect(style.getPropertyValue("--plan-accent-primary")).toBe("#e85002");

      // Studio has the dual-accent system: gold for financial context
      // (see design-system/plan-tokens/studio.css)
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("#d8b343");

      // Check glow effects present
      expect(style.getPropertyValue("--plan-glow-primary")).toContain("rgba(232, 80, 2");
    });

    it("should apply admin plan tokens", () => {
      applyPlanTokens("admin");

      const style = document.documentElement.style;

      // Admin should have same tokens as studio
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.08");
      expect(style.getPropertyValue("--plan-accent-primary")).toBe("#e85002");
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("#d8b343");
    });

    it("should apply brand mode tokens", () => {
      applyPlanTokens("brand");

      const style = document.documentElement.style;

      // Brand should be minimal like free
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.0");
      expect(style.getPropertyValue("--plan-accent-primary")).toBe("#e85002");
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("");
    });

    it("should handle studio-pending same as studio", () => {
      applyPlanTokens("studio-pending");

      const style = document.documentElement.style;

      // Should have studio tokens
      expect(style.getPropertyValue("--plan-typography-scale")).toBe("1.08");
      expect(style.getPropertyValue("--plan-accent-financial")).toBe("#d8b343");
    });

    it("should update tokens when plan changes", () => {
      // Start with free
      applyPlanTokens("free");
      expect(document.documentElement.getAttribute("data-plan")).toBe("free");
      expect(document.documentElement.style.getPropertyValue("--plan-typography-scale")).toBe("1.0");

      // Upgrade to pro
      applyPlanTokens("pro");
      expect(document.documentElement.getAttribute("data-plan")).toBe("pro");
      expect(document.documentElement.style.getPropertyValue("--plan-typography-scale")).toBe("1.06");

      // Upgrade to studio
      applyPlanTokens("studio");
      expect(document.documentElement.getAttribute("data-plan")).toBe("studio");
      expect(document.documentElement.style.getPropertyValue("--plan-typography-scale")).toBe("1.08");
      expect(document.documentElement.style.getPropertyValue("--plan-accent-financial")).toBe("#d8b343");
    });

    it("should have consistent primary accent across all plans", () => {
      const plans: PlanMode[] = ["brand", "free", "pro", "studio", "admin"];
      const expectedAccent = "#e85002";

      plans.forEach((plan) => {
        applyPlanTokens(plan);
        expect(document.documentElement.style.getPropertyValue("--plan-accent-primary")).toBe(expectedAccent);
      });
    });

    it("should only have the gold financial accent in Studio-tier plans", () => {
      // Brand, Free and Pro don't have the dual-accent system (see
      // plan-tokens/free.css and plan-tokens/pro.css: "intentionally omitted").
      const singleAccentPlans: PlanMode[] = ["brand", "free", "pro"];
      singleAccentPlans.forEach((plan) => {
        applyPlanTokens(plan);
        expect(document.documentElement.style.getPropertyValue("--plan-accent-financial")).toBe("");
      });

      // Studio, Studio-pending and Admin have the gold financial accent
      // (see plan-tokens/studio.css).
      const dualAccentPlans: PlanMode[] = ["studio", "studio-pending", "admin"];
      dualAccentPlans.forEach((plan) => {
        applyPlanTokens(plan);
        expect(document.documentElement.style.getPropertyValue("--plan-accent-financial")).toBe("#d8b343");
      });
    });

    it("should only have glow effects in pro, studio and admin", () => {
      // Free and brand: no glow
      applyPlanTokens("free");
      expect(document.documentElement.style.getPropertyValue("--plan-glow-sm")).toBe("");

      applyPlanTokens("brand");
      expect(document.documentElement.style.getPropertyValue("--plan-glow-sm")).toBe("");

      // Pro, studio, admin: glow
      applyPlanTokens("pro");
      expect(document.documentElement.style.getPropertyValue("--plan-glow-sm")).toContain("rgba");

      applyPlanTokens("studio");
      expect(document.documentElement.style.getPropertyValue("--plan-glow-sm")).toContain("rgba");

      applyPlanTokens("admin");
      expect(document.documentElement.style.getPropertyValue("--plan-glow-sm")).toContain("rgba");
    });

    it("should have correct typography scale progression", () => {
      applyPlanTokens("free");
      const freeScale = parseFloat(document.documentElement.style.getPropertyValue("--plan-typography-scale"));

      applyPlanTokens("pro");
      const proScale = parseFloat(document.documentElement.style.getPropertyValue("--plan-typography-scale"));

      applyPlanTokens("studio");
      const studioScale = parseFloat(document.documentElement.style.getPropertyValue("--plan-typography-scale"));

      // Should increase progressively
      expect(freeScale).toBeLessThan(proScale);
      expect(proScale).toBeLessThan(studioScale);

      // Specific values
      expect(freeScale).toBe(1.0);
      expect(proScale).toBe(1.06);
      expect(studioScale).toBe(1.08);
    });
  });

  describe("Token format", () => {
    it("should use correct CSS custom property names", () => {
      applyPlanTokens("studio");
      const style = document.documentElement.style;

      // Check all token names are correct (no prefixes)
      expect(style.getPropertyValue("--plan-typography-scale")).toBeTruthy();
      expect(style.getPropertyValue("--plan-accent-primary")).toBeTruthy();
      expect(style.getPropertyValue("--plan-accent-financial")).toBeTruthy();
      expect(style.getPropertyValue("--plan-glow-sm")).toBeTruthy();
      expect(style.getPropertyValue("--plan-glow-md")).toBeTruthy();
      expect(style.getPropertyValue("--plan-glow-lg")).toBeTruthy();

      // Should NOT have old prefixed names
      expect(style.getPropertyValue("--plan--plan-typography-scale")).toBeFalsy();
    });

    it("should use lowercase hex colors", () => {
      applyPlanTokens("studio");
      const style = document.documentElement.style;

      const primary = style.getPropertyValue("--plan-accent-primary");
      const financial = style.getPropertyValue("--plan-accent-financial");

      expect(primary).toBe("#e85002"); // lowercase
      expect(financial).toBe("#d8b343"); // lowercase
    });

    it("should format glow effects as box-shadow values", () => {
      applyPlanTokens("pro");
      const style = document.documentElement.style;

      const glowSm = style.getPropertyValue("--plan-glow-sm");
      const glowMd = style.getPropertyValue("--plan-glow-md");
      const glowLg = style.getPropertyValue("--plan-glow-lg");

      // Should be valid box-shadow syntax: "<offset-x> <offset-y> <blur> rgba(...)"
      // matching the 2-value-offset glow format already used across
      // design-system/plan-tokens/*.css (e.g. "0 0 24px rgba(232, 80, 2, 0.3)").
      expect(glowSm).toMatch(/^\d+ \d+ \d+px rgba\(/);
      expect(glowMd).toMatch(/^\d+ \d+ \d+px rgba\(/);
      expect(glowLg).toMatch(/^\d+ \d+ \d+px rgba\(/);
    });
  });
});
