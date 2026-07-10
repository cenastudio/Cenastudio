# Design — Fase 3: White Label básico (Nível 1)

## Overview

Esta fase é feita de **4 camadas de refatoração**, com dependência clara
entre elas:

```
Camada 1: config central (shared/site.ts + shared/color.ts)
    ↓
Camada 2: injeção runtime de tokens (apply-tokens.ts + main.tsx)
    ↓
Camada 3: consumidores (BrandLogo, AuthLayout, i18n, plan-tokens, PDF/DOCX)
    ↓
Camada 4: persistência por-usuário (StudioSetting logoUrl + upload endpoint)
```

Cada camada é validada isoladamente (unit tests) e depois combinada
(integration). A ordem é importante porque as camadas superiores dependem
das inferiores: injetar cor sem `SITE_CONFIG` estendido não faz sentido.

**Princípio guia:** _defaults preservam o comportamento atual_. Sem
env vars, o app roda idêntico ao Fase 2. Toda mudança é opt-in por
`.env`.

## Architecture

### Fluxo de dados de brand

```
                     ┌──────────────────┐
                     │  .env / .env.local│
                     │  APP_NAME=...    │
                     │  APP_PRIMARY_...  │
                     │  VITE_APP_NAME... │
                     └────────┬──────────┘
                              │
       server ──────────▼──────────── client
                              │
                     ┌────────▼──────────┐
                     │  shared/site.ts   │
                     │  reads env,       │
                     │  validates,       │
                     │  exposes          │
                     │  SITE_CONFIG      │
                     └────────┬──────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Server                Client CSS            Client React
   emailService          apply-tokens.ts        BrandLogo,
   meetingsController    injects into           AuthLayout,
   documentFormatter     document.docElement    i18n t()
   icsService            :root vars             injects
                                                {{brand}}
                              │
                              ▼
                     ┌───────────────────┐
                     │ user override      │
                     │ StudioSetting.     │
                     │ logoUrl loaded     │
                     │ on login,          │
                     │ patches            │
                     │ SITE_CONFIG runtime│
                     └───────────────────┘
```

### Camadas e módulos novos/modificados

| Camada | Arquivo | Tipo |
|---|---|---|
| 1 | `shared/site.ts` | modificar |
| 1 | `shared/color.ts` | criar |
| 1 | `shared/slug.ts` | criar |
| 2 | `client/src/main.tsx` | modificar (chama `applyBrandTokens` early) |
| 2 | `client/src/lib/design-system/apply-tokens.ts` | modificar |
| 3 | `client/src/components/BrandLogo.tsx` | modificar |
| 3 | `client/src/components/AuthLayout.tsx` | modificar |
| 3 | `client/src/contexts/LanguageContext.tsx` | modificar (t helper) |
| 3 | `client/src/contexts/translationsSupplemental.ts` | modificar (strings → placeholder) |
| 3 | `client/src/design-system/tokens.css` | modificar |
| 3 | `client/src/design-system/plan-tokens/{free,pro,studio}.css` | modificar |
| 3 | `client/src/index.css` | modificar |
| 3 | `client/src/lib/plan-config.ts` | modificar |
| 3 | `client/src/lib/design-system/token-resolver.ts` | modificar |
| 3 | `client/src/lib/design-system/shadows.ts` | modificar |
| 3 | `client/src/lib/documentFormatter.ts` | modificar |
| 3 | `client/src/lib/studioSettings.ts` | modificar (add logoUrl) |
| 3 | Vários componentes UI (AIChatbot, AppNavBar, Hero, ProductProofSection, Success, Profile, CommercialOverview, SharedReview) | modificar |
| 3 | `client/index.html` | modificar (placeholders `%VITE_APP_NAME%`) |
| 3 | `vite.config.ts` (se necessário) | verificar transformIndexHtml |
| 4 | `prisma/schema.prisma` | migration `logo_url` |
| 4 | `server/models/db.ts` | SQLite: add coluna |
| 4 | `server/controllers/studioSettingsController.ts` | modificar (add logoUrl) |
| 4 | `server/controllers/studioBrandingController.ts` | criar (endpoint upload) |
| 4 | `server/routes/studioBranding.ts` | criar |
| 4 | `server/services/supabaseStorage.ts` | adicionar `uploadBrandAsset()` |
| 4 | Server e client: `emailService`, `meetingsController`, `authController`, `icsService`, `helpChatbot`, `exportController` | modificar |
| doc | `docs/white-label/setup-guide.md` | criar |
| doc | `.env.example` | modificar |
| test | `client/src/test/site.test.ts` | criar |
| test | `client/src/test/color.test.ts` | criar |
| test | `client/src/test/BrandLogo.test.tsx` | criar |
| test | `client/src/test/apply-tokens.test.ts` | modificar |
| test | `server/controllers/studioSettings.test.ts` | ajustar |
| test | `server/controllers/collaborationSettings.test.ts` | ajustar L223, L250 |

## Components and Interfaces

### `shared/site.ts` — API pública

```ts
export interface SiteConfig {
  /** Nome curto exibido em UI, emails, PDFs. Ex.: "Cena Studio" */
  brandName: string;

  /** Partes separadas do wordmark, se aplicável. Ex.: ["Cena", "Studio"] */
  brandNameParts?: [string, string];

  /** Título longo para SEO. Ex.: "Cena Studio — Software para..." */
  seoTitle: string;

  /** Alias de compatibilidade — igual a seoTitle. Emite deprecation warn. */
  title: string;

  /** Descrição SEO */
  description: string;

  /** Domínio do deploy. Ex.: "cenastudio.dev" */
  domain: string;

  /** Cor primária hex #RRGGBB. Ex.: "#e85002" */
  primaryColor: string;

  /** URL do logo (relativo ou absoluto). Ex.: "/assets/logo.png" */
  logoUrl: string | null;

  /** Email de suporte. Ex.: "contato@cenastudio.com.br" */
  supportEmail: string | null;
}

export const SITE_CONFIG: SiteConfig;

/** Detecta se estamos no server-side (Node) para escolher fonte de env. */
export function isServer(): boolean;
```

**Implementação** (pseudocódigo):

```ts
const isServerRuntime = typeof window === "undefined";

function readEnv(serverKey: string, clientKey: string, fallback: string): string {
  if (isServerRuntime) {
    return process.env[serverKey] || fallback;
  }
  // Vite: import.meta.env é typed, injetado no build.
  // Uso dinâmico requer key literal ou fallback tipado.
  return (import.meta.env as any)[clientKey] || fallback;
}

const DEFAULTS = {
  brandName: "Cena Studio",
  brandNamePartsRaw: "Cena|Studio",
  seoTitle: "Cena Studio — Software para Produtoras de Vídeo | Gestão com IA",
  description: "Software para produtoras...",
  domain: "cenastudio.dev",
  primaryColor: "#e85002",
  logoUrl: "",
  supportEmail: "",
};

const brandName = readEnv("APP_NAME", "VITE_APP_NAME", DEFAULTS.brandName);
const brandNamePartsRaw = readEnv("APP_NAME_PARTS", "VITE_APP_NAME_PARTS", DEFAULTS.brandNamePartsRaw);
const brandNameParts = brandNamePartsRaw.includes("|")
  ? (brandNamePartsRaw.split("|").slice(0, 2) as [string, string])
  : undefined;

const primaryColorRaw = readEnv("APP_PRIMARY_COLOR", "VITE_APP_PRIMARY_COLOR", DEFAULTS.primaryColor);
const primaryColor = isValidHex(primaryColorRaw) ? primaryColorRaw : DEFAULTS.primaryColor;
if (primaryColor !== primaryColorRaw) {
  logOnce("warn", `[SITE_CONFIG] APP_PRIMARY_COLOR "${primaryColorRaw}" inválido — usando "${primaryColor}".`);
}

// alias title
Object.defineProperty(SITE_CONFIG, "title", {
  get() {
    logOnce("warn", "[SITE_CONFIG] .title está deprecated; use .seoTitle.");
    return SITE_CONFIG.seoTitle;
  },
});
```

**Decisão explícita:** o alias `title` é backward-compat. Não é obrigatório
substituir todos os consumidores em uma única sessão de refactor — o alias
existe para dar espaço temporal, e cada tarefa da Fase 3 substitui o
callsite quando muda o arquivo por outra razão.

### `shared/color.ts` — API

```ts
/** Valida se string bate com #RGB ou #RRGGBB. */
export function isValidHex(color: string): boolean;

/** Converte "#RRGGBB" ou "#RGB" para tupla [r, g, b] de 0-255. */
export function parseHexColor(hex: string): [number, number, number] | null;

/** Converte para string "R, G, B" (sem parênteses, sem prefixo). */
export function colorToRgbString(hex: string): string;

/** Converte para "rgba(R, G, B, alpha)". */
export function hexToRgba(hex: string, alpha: number): string;
```

Testes cobrem: `#e85002`, `#000`, `#ffffff`, cor inválida `"foo"`, `null`,
`""`, cor curta `#abc` (expande para `#aabbcc`), com/sem `#`.

### `shared/slug.ts` — API

```ts
/** Slugify: "Cena Studio" → "cena-studio". */
export function slugify(input: string): string;
```

Deriva do helper `safeFilename` já existente em
`documentFormatter.ts` L78. Extrai para `shared/` para reuso em
`exportController.ts`.

### `BrandLogo` — API estendida

```tsx
interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  variant?: "wordmark" | "image";
  tone?: "auto" | "onDark";
}

// Sem props → wordmark textual usando SITE_CONFIG.brandNameParts ou brandName.
// variant="image" → renderiza <img src={SITE_CONFIG.logoUrl}> com fallback
//                    para wordmark se logoUrl vazio OR erro de carregamento.
```

**Comportamento por variant:**

- `wordmark` (default): renderiza `<span>{part1}</span><span/><span>{part2}</span>`
  se `brandNameParts` presente, senão `<span>{brandName}</span>` único.
- `image`: renderiza `<img src={logoUrl} alt={brandName}>` com
  `onError={() => setUseWordmark(true)}` que degrada para wordmark.

### `AuthLayout` — refactor

Substituir L22-25 direto:

```tsx
// Antes:
<span className="text-3xl font-semibold ... text-frame-white">Cena</span>
<span className="font-frame-mono ... text-frame-orange">Studio</span>

// Depois:
<BrandLogo tone="onDark" className="text-3xl font-semibold" />
```

Isso remove a duplicação de markup e delega o wordmark a `BrandLogo`.

### `apply-tokens.ts` — refactor

**Antes** (hardcoded):

```ts
const PLAN_TOKENS = {
  brand: { "--plan-accent-primary": "#e85002", ... },
  free: { "--plan-accent-primary": "#e85002", ... },
  ...
};
```

**Depois** (deriva de `SITE_CONFIG.primaryColor`):

```ts
import { SITE_CONFIG } from "@shared/site";
import { colorToRgbString, hexToRgba } from "@shared/color";

const rgb = colorToRgbString(SITE_CONFIG.primaryColor);

const GLOW_SM = `0 0 12px rgba(${rgb}, 0.25)`;
const GLOW_MD = `0 0 24px rgba(${rgb}, 0.3)`;
const GLOW_LG = `0 0 40px rgba(${rgb}, 0.35)`;

const PLAN_TOKENS = {
  brand: {
    "--plan-accent-primary": SITE_CONFIG.primaryColor,
    ...
  },
  ...
};

/** Nova função: injeta a cor primária em --ds-orange e --ds-orange-rgb. */
export function applyBrandTokens(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--ds-orange", SITE_CONFIG.primaryColor);
  root.style.setProperty("--ds-orange-rgb", rgb);
}
```

Em `main.tsx`, chamar `applyBrandTokens()` antes de `ReactDOM.createRoot(...)`
para evitar FOUC (flash of unstyled color) — a cor da marca já está no
`:root` quando o primeiro paint acontece.

### i18n com placeholder `{{brand}}`

Estratégia **auto-inject**: o helper `t()` sempre substitui `{{brand}}` por
`SITE_CONFIG.brandName`, além dos placeholders explícitos passados por
callsite.

Antes:

```ts
// Em translationsSupplemental.ts:
"landing.hero.description": "Cena Studio é uma plataforma..."

// Uso:
t("landing.hero.description")
```

Depois:

```ts
"landing.hero.description": "{{brand}} é uma plataforma..."

// Uso: t() injeta automaticamente
t("landing.hero.description")
// → "Cena Studio é uma plataforma..." (com APP_NAME não setada)
// → "Aurora Filmes é uma plataforma..." (com APP_NAME=Aurora Filmes)
```

Implementação em `LanguageContext.tsx`:

```ts
function t(key: string, params?: Record<string, string | number>): string {
  let str = translations[locale][key] ?? key;
  const brand = params?.brand ?? SITE_CONFIG.brandName;
  str = str.replace(/\{\{brand\}\}/g, brand);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (k !== "brand") str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return str;
}
```

Migração: um script (`scripts/replace-brand-in-i18n.mjs`) faz o
substitute em batch, trocando `"Cena Studio"` por `"{{brand}}"` nas 15
strings identificadas. Rodar uma vez, revisar diff, commitar. **Não
tocar em strings pt/en em separado** — o script é agnóstico e cobre
ambos os locales no mesmo arquivo.

### `client/index.html` — placeholders para meta tags

Estratégia: usar o mecanismo `transformIndexHtml` do Vite (built-in).
Substituir literais por `%VITE_APP_NAME%` e `%VITE_APP_DOMAIN%`:

```html
<title>%VITE_APP_NAME% — %VITE_APP_TAGLINE%</title>
<meta name="description" content="..." />
<meta property="og:site_name" content="%VITE_APP_NAME%" />
```

Vite substitui automaticamente pelos valores de `import.meta.env` no
build. **Nota:** essa substituição acontece no **build**, não no
runtime. Deploy multi-marca requer rebuild — aceitável para Fase 3
(operador roda `pnpm build` com env vars do cliente).

Alternativa runtime (mais complexa): atualizar `<title>` do
`document.title` via `useEffect` no `App.tsx`, e meta tags via
`document.head` — feito automaticamente no primeiro render.
Recomendação: usar **as duas** (Vite transformIndexHtml para o valor
inicial, JS para hot reload em dev).

### `prisma/schema.prisma` — migration

```prisma
model StudioSetting {
  userId       BigInt   @id @map("user_id")
  studioName   String   @default("Cena Studio") @map("studio_name")
  legalName    String   @default("") @map("legal_name")
  document     String   @default("")
  email        String   @default("")
  phone        String   @default("")
  city         String   @default("")
  website      String   @default("")
  signature    String   @default("Responsavel comercial")
  primaryColor String   @default("#ff4d1d") @map("primary_color")
+ logoUrl      String?  @map("logo_url")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_studio_settings_user_id")
  @@map("studio_settings")
}
```

Migration: `prisma migrate dev --name add_studio_logo_url`.

Fallback SQLite (dev.db): `server/models/db.ts` L250 tem o create table
manual. Adicionar `logo_url TEXT` na definição.

### Endpoint de upload de logo

**Rota:** `POST /api/studio-settings/logo`
**Middleware:** `authenticate + requireOperationalPlan + multer`
**Body:** `multipart/form-data` com campo `file`

**Handler (`studioBrandingController.ts`):**

```ts
export async function uploadLogo(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.id;
  const file = req.file;
  if (!file) return res.status(400).json({ error: "file required" });

  // Valida mime + size
  const allowedMimes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  if (!allowedMimes.includes(file.mimetype)) {
    return res.status(400).json({ error: "unsupported mime" });
  }
  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "file too large (max 5MB)" });
  }

  // Faz upload via supabaseStorage
  const { publicUrl } = await uploadBrandAsset({
    userId,
    file: file.buffer,
    mimeType: file.mimetype,
    filename: `logo-${Date.now()}${extFromMime(file.mimetype)}`,
  });

  // Salva no banco
  await prisma.studioSetting.upsert({
    where: { userId: BigInt(userId) },
    create: { userId: BigInt(userId), studioName: SITE_CONFIG.brandName, logoUrl: publicUrl },
    update: { logoUrl: publicUrl, updatedAt: new Date() },
  });

  res.json({ success: true, data: { logoUrl: publicUrl } });
}
```

**`supabaseStorage.ts::uploadBrandAsset`:** análogo a `uploadProjectFile`,
mas usa bucket `studio-branding` (a criar no Supabase dashboard, público
com read anônimo, escrita autenticada apenas).

## Data Models

### Env vars

```
# --- Brand (server-side) ---
APP_NAME=Cena Studio
APP_NAME_PARTS=Cena|Studio
APP_DOMAIN=cenastudio.dev
APP_PRIMARY_COLOR=#e85002
APP_LOGO_URL=
SUPPORT_EMAIL=

# --- Brand (client-side, VITE_ prefixed) ---
VITE_APP_NAME=Cena Studio
VITE_APP_NAME_PARTS=Cena|Studio
VITE_APP_DOMAIN=cenastudio.dev
VITE_APP_PRIMARY_COLOR=#e85002
VITE_APP_LOGO_URL=
VITE_SUPPORT_EMAIL=
```

**Convenção:** operador preenche uma vez ambos os blocos (server +
client) com os mesmos valores. Setup-guide documenta.

### StudioSetting extendido

Diff:

```ts
// Antes:
{ studioName, legalName, ..., primaryColor }

// Depois:
{ studioName, legalName, ..., primaryColor, logoUrl: string | null }
```

Client `readStudioSettings()` retorna com `logoUrl: null` como default.
Server `DEFAULT_SETTINGS` idem.

## Error Handling

### Env var inválida (cor primária)

- Log: `console.warn("[SITE_CONFIG] APP_PRIMARY_COLOR '${raw}' inválido — usando '#e85002'.")` (uma vez por sessão).
- Fallback: default `#e85002`.

### Upload de logo com mime não suportado

- HTTP 400 com `{ error: "unsupported mime", allowedMimes: [...] }`.

### Upload de logo com arquivo > 5MB

- HTTP 400 com `{ error: "file too large", maxSizeMB: 5 }`.

### Supabase Storage falhando

- HTTP 502 com `{ error: "storage unavailable" }`.
- Não persiste `logoUrl` no banco.

### `SITE_CONFIG.logoUrl` inválido ou 404 no browser

- `BrandLogo` cai em `variant="wordmark"` via `onError`.

## Testing Strategy

### Unit tests (Vitest)

- `shared/site.test.ts`:
  - Default sem env vars.
  - Override via `process.env.APP_NAME`.
  - Cor inválida → default + warn.
  - Alias `title` funciona + emite deprecation.
- `shared/color.test.ts`:
  - `parseHexColor("#e85002")` → `[232, 80, 2]`.
  - `parseHexColor("#000")` → `[0, 0, 0]`.
  - `parseHexColor("foo")` → `null`.
  - `hexToRgba("#e85002", 0.5)` → `"rgba(232, 80, 2, 0.5)"`.
- `BrandLogo.test.tsx`:
  - Renderiza `brandNameParts` como dois spans.
  - Renderiza `brandName` como span único quando `brandNameParts` vazio.
  - `variant="image"` renderiza `<img>` com `alt={brandName}`.
  - Fallback: erro no `<img>` → wordmark.
- `apply-tokens.test.ts` (extensão):
  - `applyBrandTokens()` injeta `--ds-orange` e `--ds-orange-rgb`.
  - `PLAN_TOKENS.free["--plan-accent-primary"]` reflete
    `SITE_CONFIG.primaryColor`.
- `studioSettingsController.test.ts` (extensão):
  - `getStudioSettings` retorna `logoUrl` (null quando não setado).
  - `updateStudioSettings` aceita `logoUrl: null`.
  - `uploadLogo` valida mime, salva URL retornada.

### Integration tests (opcional)

Não obrigatório nesta fase. Se time permitir:
- Playwright: `APP_NAME=OutraMarca pnpm build` e verificar que o
  `page.title()` mostra "OutraMarca" no login.

### Vitest coverage esperado

Todos os 1088 testes existentes verdes + ~10 novos testes
(BrandLogo, site, color, apply-tokens estendido, studioSettings estendido).
Alvo: **1098-1100 total, 100% pass**.

## Migration Strategy

### Ordem de execução das tasks

Definida em `tasks.md`. Resumo:

1. **Wave 1 (paralelo):** `shared/site.ts`, `shared/color.ts`,
   `shared/slug.ts`, migration Prisma, `.env.example`.
2. **Wave 2:** `apply-tokens.ts` refactor, `BrandLogo` refactor,
   `AuthLayout` refactor, i18n placeholder script.
3. **Wave 3:** substituições em UI components + server (emails, ICS,
   documentFormatter).
4. **Wave 4:** endpoint upload de logo + doc + `.env.example` finalização.
5. **Wave 5:** validação (Vitest, Playwright, grep sem "Cena Studio").

### Rollback local por task

Cada task é localizada em 1-3 arquivos. Se algo quebrar, `git checkout
--` do arquivo afetado reverte só aquela task, mantendo o resto.

### Compatibilidade com Fase 2

Fase 2 não introduziu novos consumidores de cor primária ou nome de
marca — trabalhou em layout. Fase 3 não colide com Fase 2, muito pelo
contrário: os componentes que Fase 2 tocou (`ResponsiveTabs`,
`AppNavBar`, `ProjectHub`) usam `text-frame-orange` (via Tailwind alias
para CSS var), portanto herdam a cor da marca automaticamente após a
injeção da Camada 2. Zero conflitos.

### Compatibilidade com Vitest 1088/1088

O único ponto de fricção: 2 testes que asseguram "Cena Studio" como
literal (`collaborationSettings.test.ts` L223, L250). Fix:

```ts
// Antes:
expect(defaults.body.data.studioName).toBe("Cena Studio");

// Depois:
import { SITE_CONFIG } from "@shared/site";
expect(defaults.body.data.studioName).toBe(SITE_CONFIG.brandName);
```

## Design decisions

### D1: Auto-inject `{{brand}}` no `t()` vs. call-site explícito

**Escolhido:** Auto-inject. Callsite não precisa passar `{brand: SITE_CONFIG.brandName}`
manualmente.

**Alternativa considerada:** Call-site passa explicitamente. Rejeitada
porque exige tocar em ~50 callsites de `t()` que hoje esperam retorno
já-interpolado, alta chance de missing spots.

**Trade-off:** Auto-inject cria mágica invisível. Mitigado por:
comentário no helper explicando o comportamento, teste unitário
verificando que `t("some.key.without.brand")` funciona sem params.

### D2: Env vars server-only vs. VITE_ duplicadas

**Escolhido:** Duplicadas. Server lê `APP_*`, client lê `VITE_APP_*`.

**Alternativa considerada:** Server expõe via endpoint `/api/config` e
client faz fetch no bootstrap. Rejeitada porque:
- Adiciona latência antes do primeiro paint (FOUC ao carregar cor).
- Complica dev (precisa ligar server pra ver a marca no client).
- SSR-lite (Vite não faz SSR mas pré-renderiza) não recebe o valor.

**Trade-off:** operador preenche duas vezes as mesmas envs. Mitigado
por: setup-guide documenta explicitamente, `.env.example` mostra os
dois blocos alinhados.

### D3: `logoUrl` no `StudioSetting` (por usuário) vs. env global

**Escolhido:** os dois. `SITE_CONFIG.logoUrl` é fallback via env, e
`StudioSetting.logoUrl` sobrescreve por usuário quando presente.

**Motivação:** o cenário Nível 1 é "1 deploy = 1 marca", mas o
`StudioSetting` já existe e já é per-user. Mantê-lo por-user permite
que o admin do studio troque a logo sem alterar `.env`, e mais tarde
(Nível 2 multi-tenant), migrar de `StudioSetting.logoUrl` para
`Tenant.logoUrl` é trivial.

**Trade-off:** duas fontes de verdade. Mitigado por: precedência clara
(user > env > default), documentada no setup-guide.

### D4: HTML legal (`terms-of-use.html`, `privacy-policy.html`) — out of scope

**Motivação:** substituir dezenas de ocorrências de "Cena Studio" em
templates legais estáticos é trabalho manual + revisão jurídica.
Não é o gargalo do MVP white label. Operador atualiza manualmente na
Fase 3 → registra TODO comment no topo apontando para futuro template
server-side na Fase 4.

**Trade-off:** o white label não é 100% no dia 1. Documentado.

### D5: Favicon SVG — substituído manualmente pelo operador

**Motivação:** gerar SVG dinâmico por marca é significativamente mais
complexo (SVG parametrizado, ou geração runtime via `<svg>` inline no
HTML). Ganho marginal para MVP.

**Trade-off:** `client/public/favicon.svg` continua com o SVG de "Cena
Studio". Setup-guide documenta: "substitua `client/public/favicon.svg`
por seu SVG antes do build."

### D6: Migration `logo_url` — nullable, sem default

**Motivação:** usuários existentes já têm `StudioSetting` sem `logoUrl`.
Nullable evita quebrar dados existentes. Sem default (não `""`) porque
`null` é semanticamente distinto de "logo vazio explicitamente".

### D7: Bucket Supabase `studio-branding` — público leitura, autenticado escrita

**Motivação:** logos são visíveis publicamente (aparecem em emails
para clientes, share links de review). Escrita autenticada evita
uploads não-autorizados.

**Config Supabase:** operador cria bucket manualmente uma vez.
Setup-guide documenta o comando/click path.

## References

- [Requirements](./requirements.md)
- [`WHITE_LABEL_PLAN.md`](../../../WHITE_LABEL_PLAN.md) §3 "Nível 1"
- [`PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md)
- Fase 1: [`FASE_1_ACHADOS.md`](../../../FASE_1_ACHADOS.md)
- Fase 2 spec: [`../fase-2-layout-mobile-e-tabs/`](../fase-2-layout-mobile-e-tabs/)
