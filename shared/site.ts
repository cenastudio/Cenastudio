/**
 * Central site / brand configuration for the white-label pipeline (Fase 3).
 *
 * Read once at module load. Server-side reads from `process.env.APP_*`;
 * client-side reads from `import.meta.env.VITE_APP_*`. Defaults preserve
 * the current "Cena Studio" behavior when no env vars are set.
 *
 * See docs/white-label/setup-guide.md for the operator workflow and
 * .kiro/specs/fase-3-white-label/design.md for the design rationale.
 */

import { isValidHex } from "./color";

export interface SiteConfig {
  /** Short display name shown in UI, emails, PDFs. E.g., "Cena Studio". */
  brandName: string;
  /** Optional two-part wordmark for split-color rendering. `undefined`
   *  means render `brandName` as a single part. */
  brandNameParts?: [string, string];
  /** Long SEO / marketing title. E.g., "Cena Studio — Software para ...". */
  seoTitle: string;
  /** SEO description (meta description). */
  description: string;
  /** Deploy domain. E.g., "cenastudio.dev". */
  domain: string;
  /** Primary hex color, always `#RRGGBB`. Validated at load; invalid
   *  inputs are logged and replaced by the default. */
  primaryColor: string;
  /** Logo URL (relative or absolute). Empty string when not set. */
  logoUrl: string;
  /** Support email visible in footers / emails. Empty string when not set. */
  supportEmail: string;
  /** Deprecated alias of `seoTitle`. Emits a console.warn once per session. */
  readonly title: string;
}

// ---------------------------------------------------------------------------
// Defaults preserve the current "Cena Studio" behavior. If an operator
// deploys without setting any env vars, the app renders identically to
// pre-Fase 3.
// ---------------------------------------------------------------------------

const DEFAULTS = {
  brandName: "Cena Studio",
  brandNamePartsRaw: "Cena|Studio",
  seoTitle: "Cena Studio — Software para Produtoras de Vídeo | Gestão com IA",
  description:
    "Software para produtoras de vídeo: gerencie clientes, projetos, arquivos e aprovações em um só lugar. Gere documentos com IA e economize 10h/semana. Teste grátis.",
  domain: "cenastudio.dev",
  primaryColor: "#e85002",
  logoUrl: "",
  supportEmail: "",
};

// ---------------------------------------------------------------------------
// Env reading — server vs. client.
//
// Vite replaces `import.meta.env.VITE_*` at build time with static strings.
// Bundlers (esbuild/rollup) cannot resolve dynamic `import.meta.env[key]`
// lookups the same way, so we explicitly check each expected key.
// ---------------------------------------------------------------------------

/** Detects Node/server context (no window/document). Exported for tests. */
export function isServer(): boolean {
  return typeof window === "undefined";
}

function serverEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function clientEnv(key: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any)?.env;
    if (!env) return undefined;
    const value = env[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Reads an env var, preferring server (process.env.APP_*) or client
 *  (import.meta.env.VITE_APP_*) depending on runtime. Falls back to the
 *  default value. Exported for tests. */
export function readBrandEnv(
  serverKey: string,
  clientKey: string,
  fallback: string,
): string {
  const value = isServer() ? serverEnv(serverKey) : clientEnv(clientKey);
  return value ?? fallback;
}

// ---------------------------------------------------------------------------
// One-time warning helper. Avoids spamming the console for repeated reads
// of deprecated fields or invalid env vars.
// ---------------------------------------------------------------------------

const warnedKeys = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  // Use console.warn intentionally — this is developer-facing telemetry.
  // eslint-disable-next-line no-console
  console.warn(message);
}

/** Test-only helper: clears the "warned once" cache between tests so
 *  each test can independently observe the warning. Not intended for
 *  production code. */
export function _resetWarnCache(): void {
  warnedKeys.clear();
}

// ---------------------------------------------------------------------------
// Resolve config values (executes at module load).
// ---------------------------------------------------------------------------

function resolveBrandNameParts(raw: string): [string, string] | undefined {
  if (!raw.includes("|")) return undefined;
  const [first, second] = raw.split("|", 2);
  if (!first || !second) return undefined;
  return [first, second];
}

function resolvePrimaryColor(raw: string): string {
  if (isValidHex(raw)) {
    // Ensure canonical `#RRGGBB` form with leading `#`.
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    return normalized.toLowerCase();
  }
  warnOnce(
    `primary-color:${raw}`,
    `[SITE_CONFIG] APP_PRIMARY_COLOR "${raw}" is not a valid hex — falling back to "${DEFAULTS.primaryColor}".`,
  );
  return DEFAULTS.primaryColor;
}

const brandName = readBrandEnv("APP_NAME", "VITE_APP_NAME", DEFAULTS.brandName);
const brandNamePartsRaw = readBrandEnv(
  "APP_NAME_PARTS",
  "VITE_APP_NAME_PARTS",
  DEFAULTS.brandNamePartsRaw,
);
const brandNameParts = resolveBrandNameParts(brandNamePartsRaw);
const seoTitle = readBrandEnv("APP_SEO_TITLE", "VITE_APP_SEO_TITLE", DEFAULTS.seoTitle);
const description = readBrandEnv(
  "APP_DESCRIPTION",
  "VITE_APP_DESCRIPTION",
  DEFAULTS.description,
);
const domain = readBrandEnv("APP_DOMAIN", "VITE_APP_DOMAIN", DEFAULTS.domain);
const primaryColorRaw = readBrandEnv(
  "APP_PRIMARY_COLOR",
  "VITE_APP_PRIMARY_COLOR",
  DEFAULTS.primaryColor,
);
const primaryColor = resolvePrimaryColor(primaryColorRaw);
const logoUrl = readBrandEnv("APP_LOGO_URL", "VITE_APP_LOGO_URL", DEFAULTS.logoUrl);
const supportEmail = readBrandEnv(
  "SUPPORT_EMAIL",
  "VITE_SUPPORT_EMAIL",
  DEFAULTS.supportEmail,
);

// ---------------------------------------------------------------------------
// Public export.
// The `title` field is a deprecated getter alias of `seoTitle`. Accessing
// it emits a one-time deprecation warning to nudge migration to the
// explicit `seoTitle` / `brandName` fields.
// ---------------------------------------------------------------------------

const baseConfig: Omit<SiteConfig, "title"> = {
  brandName,
  brandNameParts,
  seoTitle,
  description,
  domain,
  primaryColor,
  logoUrl,
  supportEmail,
};

export const SITE_CONFIG: SiteConfig = Object.defineProperty(
  { ...baseConfig } as SiteConfig,
  "title",
  {
    enumerable: true,
    get() {
      warnOnce(
        "site-config-title-alias",
        "[SITE_CONFIG] `title` is deprecated — use `seoTitle` (for SEO) or `brandName` (for short display).",
      );
      return seoTitle;
    },
  },
);

// ---------------------------------------------------------------------------
// Legacy exports preserved for backward compatibility with existing consumers.
// ---------------------------------------------------------------------------

export const NAVIGATION = [
  { label: "navigation.howItWorks", href: "#how-it-works" },
  { label: "navigation.tools", href: "#tools" },
  { label: "navigation.pricing", href: "#pricing" },
  { label: "navigation.contact", href: "#contact" },
];

export const HERO = {
  tag: "Feito por filmmakers, para filmmakers",
  title: ["DO BRIEFING", "À ENTREGA", "EM UM SÓ LUGAR"],
  subtitle:
    "Pare de perder tempo entre WhatsApp, Drive, planilhas e e-mails. Centralize cliente, equipe, arquivos e aprovações em um único lugar — pra você voltar a fazer cinema.",
  cta: {
    primary: { label: "Experimentar grátis por 14 dias", href: "/login" },
    secondary: { label: "Ver produto funcionando", href: "#product-proof" },
  },
  stats: [
    { number: "87+", label: "Produtoras ativas" },
    { number: "10h", label: "Economizadas/semana" },
    { number: "4.8★", label: "Avaliação média" },
  ],
};

export type PlanTier = "iniciante" | "profissional" | "produtora";

export const PRICING = [
  {
    id: "iniciante" as PlanTier,
    tier: "// Free",
    price: "R$0",
    period: "/mês",
    description: "Para freelancers validarem o fluxo com até 5 clientes",
    features: [
      "5 gerações com IA/mês",
      "Acesso inicial às ferramentas",
      "Export .txt",
      "Projetos para teste",
      "CRM básico de clientes",
      "Até 5 clientes cadastrados",
      "Suporte por email",
    ],
    cta: { label: "Começar Grátis", href: "#" },
    highlight: false,
  },
  {
    id: "profissional" as PlanTier,
    tier: "// Pro",
    price: "R$199",
    period: "/mês — mais popular",
    description: "Para profissionais operarem até 15 clientes ativos",
    roi: "💡 Economize 10h/mês em burocracia",
    features: [
      "15 clientes",
      "+ Clientes adicionais",
      "100 gerações com IA/mês",
      "Fluxos principais de produção",
      "Histórico completo",
      "Export PDF e DOCX",
      "Review de vídeos com anotações",
      "CRM completo + pipeline",
      "Suporte prioritário",
    ],
    cta: { label: "Assinar Pro", href: "#" },
    highlight: true,
  },
  {
    id: "produtora" as PlanTier,
    tier: "// Studio",
    price: "R$399",
    period: "/mês — ativação após pagamento",
    description: "Para produtoras com equipe, 50 clientes e operação compartilhada",
    roi: "🚀 Ganhe 20% mais capacidade operacional sem contratar",
    features: [
      "50 clientes",
      "+ Clientes adicionais",
      "Tudo do Profissional",
      "Gerações ilimitadas",
      "Projetos e pastas",
      "Equipe e colaboradores",
      "Arquivos e aprovações por projeto",
      "Suporte prioritário",
      "Relatórios operacionais",
    ],
    cta: { label: "Ativar Produtora", href: "#" },
    highlight: false,
  },
];

export const MARQUEE_ITEMS = [
  "PRÉ-PRODUÇÃO",
  "ROTEIRO IA",
  "CALLSHEET",
  "DECUPAGEM",
  "ORÇAMENTO",
  "CONTRATO",
  "PROPOSTA",
  "BRIEFING",
  "MOODBOARD",
  "CHECKLIST",
  "CRONOGRAMA",
  "ENTREGA",
  "ARQUIVOS",
  "REVIEW DE VÍDEO",
  "CRM",
  "PIPELINE",
  "ANALYTICS",
];

export const FOOTER_LINKS = {
  tools: {
    title: "Plataforma",
    links: [
      { label: "Produto real", href: "#product-proof" },
      { label: "Estúdio IA", href: "#tools" },
      { label: "Arquivos", href: "#tools" },
      { label: "Review de Vídeo", href: "#tools" },
    ],
  },
  company: {
    title: "Operação",
    links: [
      { label: "Sobre", href: "#about" },
      { label: "Fluxo", href: "#about" },
      { label: "Preços", href: "#pricing" },
      { label: "Contato", href: "#contact" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Termos", href: "#" },
      { label: "Privacidade", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
  support: {
    title: "Suporte",
    links: [
      { label: "Agendar demo", href: "#contact" },
      { label: "Central do produto", href: "#product-proof" },
      { label: "Planos", href: "#pricing" },
      { label: "Login", href: "/login" },
    ],
  },
};
