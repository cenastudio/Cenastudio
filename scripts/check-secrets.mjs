import { execFileSync } from "node:child_process";

const mode = process.argv.includes("--all") ? "all" : "staged";

const checks = [
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["GitHub token", /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["Resend key", /\bre_[A-Za-z0-9_-]{20,}\b/],
  ["Supabase key", /\bsb(?:p|_secret|_publishable)_[A-Za-z0-9_-]{20,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["JWT-like token", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["private key block", /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/],
  ["Postgres URL with password", /postgres(?:ql)?:\/\/[^:\s/]+:(?!\[?[A-Z_ -]+\]?@)[^@\s]{8,}@/i],
  ["production credential assignment", /^(?:RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|DATABASE_URL|SUPABASE_DATABASE_URL|JWT_SECRET|GITHUB_CLIENT_SECRET|STRIPE_SECRET_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|NVIDIA_API_KEY)\s*=\s*(?!\$\{|<|\[|\"\"|''|changeme|example)[^\s#]{12,}/im],
];

const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".lock",
]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function extensionOf(file) {
  const slash = file.lastIndexOf("/");
  const dot = file.lastIndexOf(".");
  return dot > slash ? file.slice(dot).toLowerCase() : "";
}

function fileList() {
  const args = mode === "staged"
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
    : ["ls-files", "-z"];
  const output = git(args);
  return output ? output.split("\0").filter(Boolean) : [];
}

function fileContent(file) {
  try {
    if (mode === "all") {
      return execFileSync("git", ["show", `:${file}`], { encoding: "utf8", maxBuffer: 2_000_000 });
    }

    // Pre-commit must examine only added lines. Existing documentation may
    // intentionally show redacted configuration examples; it is not being
    // committed again and must not mask a newly added secret elsewhere.
    const diff = execFileSync(
      "git",
      ["diff", "--cached", "--no-ext-diff", "--unified=0", "--", file],
      { encoding: "utf8", maxBuffer: 2_000_000 },
    );
    return diff
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1))
      .join("\n");
  } catch {
    return "";
  }
}

const findings = [];
for (const file of fileList()) {
  if (!file || binaryExtensions.has(extensionOf(file))) continue;

  const content = fileContent(file);
  if (!content || content.includes("secret-scan: allow")) continue;

  for (const [label, pattern] of checks) {
    const match = content.match(pattern);
    if (!match || match.index === undefined) continue;
    findings.push({ file, label });
  }
}

if (findings.length > 0) {
  console.error("\n[secret-scan] Commit blocked: a possible secret was found.");
  for (const finding of findings) {
    console.error(`- ${finding.file} (${finding.label})`);
  }
  console.error("Remove it from the change and keep the real value only in a secret manager or local ignored file. The value is intentionally not printed.");
  process.exit(1);
}

console.log(`[secret-scan] ${mode === "staged" ? "Staged changes" : "Tracked files"} contain no detected secrets.`);
