import { readFile } from "node:fs/promises";

const htmlPath = new URL("../dist/public/index.html", import.meta.url);
const html = await readFile(htmlPath, "utf8");
const expectedAppName = process.env.VITE_APP_NAME?.trim() || "Cena Studio";
const unresolvedPatterns = [/%VITE_[A-Z0-9_]+%/g, /__[A-Z0-9_]+__/g];
const unresolved = unresolvedPatterns.flatMap((pattern) => html.match(pattern) || []);
const requiredFragments = [
  `<title>${expectedAppName}`,
  'rel="canonical"',
  'property="og:url"',
  'property="og:image"',
  'name="twitter:image"',
  'type="application/ld+json"',
];
const missing = requiredFragments.filter((fragment) => !html.includes(fragment));

if (unresolved.length || missing.length) {
  if (unresolved.length) console.error(`Unresolved HTML placeholders: ${[...new Set(unresolved)].join(", ")}`);
  if (missing.length) console.error(`Missing SEO metadata: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Built HTML contains resolved brand and required SEO metadata.");
