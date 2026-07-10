import { describe, it, expect } from "vitest";
import { slugify } from "@shared/slug";

describe("shared/slug", () => {
  it("slugifies simple strings", () => {
    expect(slugify("Cena Studio")).toBe("cena-studio");
    expect(slugify("Aurora Filmes 2024")).toBe("aurora-filmes-2024");
  });

  it("removes accents", () => {
    expect(slugify("áéíóú")).toBe("aeiou");
    expect(slugify("ação")).toBe("acao");
    expect(slugify("Coração de Cinema")).toBe("coracao-de-cinema");
  });

  it("collapses repeated non-alphanumeric runs into single dash", () => {
    expect(slugify("Cena   Studio")).toBe("cena-studio");
    expect(slugify("A -- B")).toBe("a-b");
    expect(slugify("foo!!!bar")).toBe("foo-bar");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("  Cena  ")).toBe("cena");
    expect(slugify("--foo--")).toBe("foo");
  });

  it("falls back to 'documento' for empty / all-punctuation input", () => {
    expect(slugify("")).toBe("documento");
    expect(slugify("!!!")).toBe("documento");
    expect(slugify("---")).toBe("documento");
    expect(slugify("   ")).toBe("documento");
  });

  it("handles non-string input safely", () => {
    expect(slugify(null)).toBe("documento");
    expect(slugify(undefined)).toBe("documento");
    expect(slugify(123)).toBe("documento");
  });
});
