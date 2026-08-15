import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["client/src/components", "client/src/pages"];
const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|md)$/;
const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/g;

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    return SOURCE_FILE.test(entry.name) ? [path] : [];
  });
}

const violations = ROOTS.flatMap((root) =>
  collectFiles(root).flatMap((file) => {
    const contents = readFileSync(file, "utf8");
    const matches = [...contents.matchAll(HEX_COLOR)];
    return matches.map((match) => ({
      file: relative(process.cwd(), file),
      color: match[0],
      line: contents.slice(0, match.index).split("\n").length,
    }));
  }),
);

if (violations.length > 0) {
  console.error("Design token check failed. Move color values to client/src/design-system/ and use their token or preset.");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line} ${violation.color}`);
  }
  process.exit(1);
}

console.log("Design token check passed: no literal hex colors in components or pages.");
