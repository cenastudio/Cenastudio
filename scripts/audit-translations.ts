import fs from "node:fs";
import path from "node:path";
import { translate, type Language } from "../client/src/contexts/LanguageContext";

const sourceRoot = path.resolve(process.cwd(), "client/src");

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : sourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

const keys = new Set<string>();
for (const file of sourceFiles(sourceRoot)) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) keys.add(match[1]);
  for (const match of source.matchAll(/\blabelKey:\s*["']([^"']+)["']/g)) keys.add(match[1]);
}

for (const locale of ["pt", "en"] satisfies Language[]) {
  const missing = [...keys].filter((key) => translate(locale, key) === key).sort();
  const groups = Object.entries(
    missing.reduce<Record<string, number>>((result, key) => {
      const group = key.split(".").slice(0, 2).join(".");
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  console.log(`\n${locale.toUpperCase()}: ${missing.length} missing keys`);
  for (const [group, count] of groups) console.log(`${String(count).padStart(4)}  ${group}`);
  if (process.argv.includes("--all")) console.log(missing.join("\n"));
}
