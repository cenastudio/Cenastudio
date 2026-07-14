import { describe, expect, it } from "vitest";
import { escapeHtml } from "./contactController.js";

describe("contactController escapeHtml", () => {
  it("neutralizes HTML tags from untrusted form input", () => {
    const malicious = '<img src=x onerror="alert(1)"><script>steal()</script>';
    const escaped = escapeHtml(malicious);

    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain("<script");
    expect(escaped).toContain("&lt;img");
    expect(escaped).toContain("&lt;script&gt;");
  });

  it("escapes the five significant HTML characters", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("handles nullish values without throwing", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("preserves legitimate plain text", () => {
    expect(escapeHtml("João da Silva")).toBe("João da Silva");
  });
});
