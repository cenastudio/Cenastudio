import fs from "node:fs";
import path from "node:path";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider, translate, type Language, useLanguage } from "@/contexts/LanguageContext";

const SOURCE_ROOT = path.resolve(process.cwd(), "client/src");

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "test" ? [] : sourceFiles(entryPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

function translationKeys(): string[] {
  const keys = new Set<string>();
  for (const file of sourceFiles(SOURCE_ROOT)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
      keys.add(match[1]);
    }
    for (const match of source.matchAll(/\blabelKey:\s*["']([^"']+)["']/g)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
}

describe("translations", () => {
  it.each(["pt", "en"] satisfies Language[])("defines every static key in %s", (locale) => {
    const missing = translationKeys().filter((key) => translate(locale, key) === key);

    expect(missing).toEqual([]);
  });

  it("updates visible copy when the language changes", () => {
    function LanguageProbe() {
      const { locale, setLocale, t } = useLanguage();
      return React.createElement(
        "button",
        { type: "button", onClick: () => setLocale(locale === "pt" ? "en" : "pt") },
        t("app.landing.hero.cta")
      );
    }

    render(React.createElement(LanguageProvider, null, React.createElement(LanguageProbe)));
    expect(screen.getByRole("button")).toHaveTextContent("Entrar no estúdio");

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("Enter studio");
  });
});
