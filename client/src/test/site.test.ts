import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Tests for shared/site.ts brand configuration.
 *
 * Vitest runs these tests in a jsdom environment, so `window` is defined
 * and `isServer()` returns false. That means the module reads from
 * `import.meta.env.VITE_APP_*` — which `vi.stubEnv()` sets alongside
 * `process.env`.
 */

async function loadSite() {
  vi.resetModules();
  return await import("@shared/site");
}

describe("shared/site — SITE_CONFIG env-driven brand config", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses defaults when no env vars are set", async () => {
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.brandName).toBe("Cena Studio");
    expect(SITE_CONFIG.brandNameParts).toEqual(["Cena", "Studio"]);
    expect(SITE_CONFIG.primaryColor).toBe("#e85002");
    expect(SITE_CONFIG.domain).toBe("cenastudio.dev");
    expect(SITE_CONFIG.logoUrl).toBe("");
    expect(SITE_CONFIG.supportEmail).toBe("");
    expect(SITE_CONFIG.seoTitle).toContain("Cena Studio");
  });

  it("reads VITE_APP_NAME override", async () => {
    vi.stubEnv("VITE_APP_NAME", "Aurora Filmes");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.brandName).toBe("Aurora Filmes");
  });

  it("splits VITE_APP_NAME_PARTS on '|' when both halves are non-empty", async () => {
    vi.stubEnv("VITE_APP_NAME_PARTS", "Aurora|Filmes");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.brandNameParts).toEqual(["Aurora", "Filmes"]);
  });

  it("returns undefined brandNameParts when there is no '|'", async () => {
    vi.stubEnv("VITE_APP_NAME_PARTS", "AuroraFilmes");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.brandNameParts).toBeUndefined();
  });

  it("reads a valid VITE_APP_PRIMARY_COLOR", async () => {
    vi.stubEnv("VITE_APP_PRIMARY_COLOR", "#3366ff");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.primaryColor).toBe("#3366ff");
  });

  it("falls back to default and warns when primary color is invalid", async () => {
    vi.stubEnv("VITE_APP_PRIMARY_COLOR", "not-a-color");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.primaryColor).toBe("#e85002");
    expect(warnSpy).toHaveBeenCalled();
    const message = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(message).toMatch(/APP_PRIMARY_COLOR/);
  });

  it("reads VITE_APP_DOMAIN, VITE_APP_LOGO_URL and VITE_SUPPORT_EMAIL", async () => {
    vi.stubEnv("VITE_APP_DOMAIN", "aurora.example");
    vi.stubEnv("VITE_APP_LOGO_URL", "https://cdn.example/logo.png");
    vi.stubEnv("VITE_SUPPORT_EMAIL", "help@aurora.example");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.domain).toBe("aurora.example");
    expect(SITE_CONFIG.logoUrl).toBe("https://cdn.example/logo.png");
    expect(SITE_CONFIG.supportEmail).toBe("help@aurora.example");
  });

  it("exposes `title` as a deprecated alias of `seoTitle`", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SITE_CONFIG } = await loadSite();
    const alias = SITE_CONFIG.title;
    expect(alias).toBe(SITE_CONFIG.seoTitle);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/`title` is deprecated/),
    );
  });

  it("warns only once per session for the title deprecation", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SITE_CONFIG } = await loadSite();
    void SITE_CONFIG.title;
    void SITE_CONFIG.title;
    void SITE_CONFIG.title;
    const titleWarnings = warnSpy.mock.calls.filter((call) =>
      String(call[0] ?? "").includes("`title` is deprecated"),
    );
    expect(titleWarnings.length).toBe(1);
  });

  it("normalizes primary color to lowercase with leading `#`", async () => {
    vi.stubEnv("VITE_APP_PRIMARY_COLOR", "AABBCC");
    const { SITE_CONFIG } = await loadSite();
    expect(SITE_CONFIG.primaryColor).toBe("#aabbcc");
  });

  it("isServer() returns a boolean without throwing", async () => {
    const { isServer } = await loadSite();
    expect(typeof isServer).toBe("function");
    expect(typeof isServer()).toBe("boolean");
  });
});
