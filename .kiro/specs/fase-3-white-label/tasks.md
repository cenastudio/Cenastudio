# Implementation Plan

## Overview

18 tasks em 5 waves sequenciais. Tasks dentro de cada wave são
paralelizáveis. Cada task cita os requirements que valida e as dependências.

## Tasks

### Wave 1 — Config central e infra (paralelizáveis)

- [x] 1. Criar `shared/color.ts` com utilitários de cor
  - Criar `shared/color.ts` exportando: `isValidHex(color: string): boolean`,
    `parseHexColor(hex: string): [number, number, number] | null`,
    `colorToRgbString(hex: string): string`, `hexToRgba(hex: string, alpha: number): string`.
  - Aceitar formatos `#RGB` (curto, expande) e `#RRGGBB`. Case-insensitive.
  - Retornar `null` (ou string default) para inputs inválidos ("foo", "", null).
  - Criar `client/src/test/color.test.ts` com casos: `#e85002` → `[232,80,2]`,
    `#000`, `#ffffff`, `#abc` → `#aabbcc` equivalente, inválido → null.
  - Rodar `npm run test client/src/test/color.test.ts` → esperado passar.
  - _Requirements: 3.2, 3.4, 6.5, 7.4, 9.2_
  - _Depends on: nenhuma_

- [x] 2. Criar `shared/slug.ts` com `slugify()`
  - Criar `shared/slug.ts` exportando `slugify(input: string): string`.
  - Basear no helper `safeFilename` de `client/src/lib/documentFormatter.ts` L78 (normalize + slug).
  - Criar `client/src/test/slug.test.ts` com casos: "Cena Studio" → "cena-studio",
    "Aurora Filmes 2024" → "aurora-filmes-2024", "" → "documento", "áéíóú" → "aeiou".
  - _Requirements: 6.8, 9.2_
  - _Depends on: nenhuma_

- [x] 3. Estender `shared/site.ts` com brand config completo
  - Editar `shared/site.ts`:
    - Adicionar interface `SiteConfig` conforme design.md (§ Components).
    - Ler env vars: `APP_NAME`, `APP_NAME_PARTS`, `APP_DOMAIN`,
      `APP_PRIMARY_COLOR`, `APP_LOGO_URL`, `SUPPORT_EMAIL` (server) OR
      `VITE_APP_*` equivalentes (client), com defaults preservando o
      comportamento atual.
    - Adicionar validação de cor via `isValidHex` de `shared/color.ts`.
    - Adicionar `title` como getter alias de `seoTitle` que emite
      `console.warn` deprecation uma única vez por sessão (usar Set flag).
    - Exportar `SITE_CONFIG` com todos os campos + `title` alias.
  - Criar `client/src/test/site.test.ts` com casos:
    - Default (sem env) → `brandName === "Cena Studio"`, `primaryColor === "#e85002"`.
    - `process.env.APP_NAME = "Aurora"` → `brandName === "Aurora"`.
    - `process.env.APP_PRIMARY_COLOR = "foo"` → `primaryColor === "#e85002"` + warn.
    - `SITE_CONFIG.title` retorna `seoTitle` + emite warn na primeira leitura.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.4, 8.5, 9.2_
  - _Depends on: 1_

- [x] 4. Prisma migration `add_studio_logo_url`
  - Editar `prisma/schema.prisma` L536-556: adicionar
    `logoUrl String? @map("logo_url")` após `primaryColor`.
  - Rodar `npx prisma migrate dev --name add_studio_logo_url` (local, cria migration em `prisma/migrations/`).
  - Verificar que a migration compila SQL válido para Postgres.
  - Editar `server/models/db.ts` linha ~250 (SQLite fallback CREATE TABLE):
    adicionar `logo_url TEXT` na definição da tabela.
  - Rodar `npm run test server/services/authService.test.ts` para garantir
    que DB inicializa sem regressão.
  - _Requirements: 4.1_
  - _Depends on: nenhuma_

- [x] 5. Atualizar `.env.example` e `.env` local
  - Editar `.env.example` linhas 120-131 (área de emails). Adicionar bloco:
    ```
    # =============================================================================
    # White Label — brand overridable via env (Fase 3). Defaults reproduzem
    # o comportamento "Cena Studio" atual.
    APP_NAME=Cena Studio
    APP_NAME_PARTS=Cena|Studio
    APP_DOMAIN=cenastudio.dev
    APP_PRIMARY_COLOR=#e85002
    APP_LOGO_URL=
    SUPPORT_EMAIL=

    # Duplicatas com prefixo VITE_ para exposição no client (Vite não
    # expõe env vars sem prefixo VITE_).
    VITE_APP_NAME=Cena Studio
    VITE_APP_NAME_PARTS=Cena|Studio
    VITE_APP_DOMAIN=cenastudio.dev
    VITE_APP_PRIMARY_COLOR=#e85002
    VITE_APP_LOGO_URL=
    VITE_SUPPORT_EMAIL=
    ```
  - **NÃO** editar `.env` local (contém credenciais reais). Deixar operador
    fazer manualmente. Adicionar TODO comment no topo de `.env.example`.
  - _Requirements: 8.1, 8.2, 8.3_
  - _Depends on: nenhuma_

### Wave 2 — Injeção de tokens e componentes de brand (paralelizáveis)

- [x] 6. Refatorar `apply-tokens.ts` para consumir `SITE_CONFIG.primaryColor`
  - Editar `client/src/lib/design-system/apply-tokens.ts`:
    - Importar `SITE_CONFIG` de `@shared/site` e `colorToRgbString`, `hexToRgba` de `@shared/color`.
    - Derivar `rgb = colorToRgbString(SITE_CONFIG.primaryColor)` no topo do módulo.
    - Substituir os literais `"#e85002"` em `PLAN_TOKENS` (linhas 23, 34,
      50, 73, 98, 121) por `SITE_CONFIG.primaryColor`.
    - Substituir os literais `"rgba(232, 80, 2, X)"` (nas glows) por
      `\`rgba(\${rgb}, X)\`` interpolado.
    - Exportar `applyBrandTokens(root: HTMLElement = document.documentElement): void`
      que faz `root.style.setProperty("--ds-orange", SITE_CONFIG.primaryColor)` e
      `root.style.setProperty("--ds-orange-rgb", rgb)`.
  - Editar `client/src/main.tsx`: chamar `applyBrandTokens()` **antes** do
    `ReactDOM.createRoot(...)` — antes do primeiro paint, evita FOUC.
  - Editar `client/src/test/lib/apply-tokens.test.ts`:
    - Manter testes existentes verdes.
    - Adicionar caso: `applyBrandTokens()` define as duas variáveis.
    - Adicionar caso: `PLAN_TOKENS.free["--plan-accent-primary"]` bate com
      `SITE_CONFIG.primaryColor` (não é literal).
  - Rodar `npm run test client/src/test/lib/apply-tokens.test.ts` → passa.
  - _Requirements: 3.1, 3.2, 3.4, 7.4_
  - _Depends on: 1, 3_

- [x] 7. Refatorar `BrandLogo` para consumir `brandNameParts` e `logoUrl`
  - Editar `client/src/components/BrandLogo.tsx`:
    - Adicionar prop `variant?: "wordmark" | "image"` com default `"wordmark"`.
    - Renderizar wordmark de `SITE_CONFIG.brandNameParts` se presente,
      senão `SITE_CONFIG.brandName` como parte única.
    - Renderizar `<img src={SITE_CONFIG.logoUrl} alt={SITE_CONFIG.brandName}>`
      quando `variant="image"` + `logoUrl` presente.
    - Fallback: `onError` no `<img>` → renderizar wordmark automaticamente
      (usar `useState<boolean>` para hasError).
    - Preservar `aria-label={SITE_CONFIG.brandName}` (não `title` legacy).
  - Criar `client/src/test/BrandLogo.test.tsx` com 4 casos:
    1. Renderiza `brandNameParts` como 2 spans (mock `SITE_CONFIG.brandNameParts = ["Aurora", "Filmes"]`).
    2. Renderiza `brandName` como 1 span (mock `brandNameParts = undefined`).
    3. `variant="image"` renderiza `<img alt={brandName}>`.
    4. `onError` do `<img>` → renderiza wordmark.
  - Rodar `npm run test client/src/test/BrandLogo.test.tsx` → passa.
  - _Requirements: 2.1, 2.2, 2.5, 2.6_
  - _Depends on: 3_

- [x] 8. Refatorar `AuthLayout` para usar `BrandLogo`
  - Editar `client/src/components/AuthLayout.tsx` linhas 22-25:
    substituir o markup manual dos spans "Cena"/"Studio" por
    `<BrandLogo tone="onDark" className="text-3xl font-semibold" />`.
  - Verificar visualmente (dev server) que o layout do login preserva
    tamanho e cor esperados.
  - Rodar `npm run test` para garantir sem regressão.
  - Rodar `npx playwright test --grep "@fase1" --project=chromium-mobile --workers=1`
    → 6/6 verde (não deve quebrar).
  - _Requirements: 2.3_
  - _Depends on: 7_

- [x] 9. Substituir hex literal `#e85002` em `tokens.css`, `index.css` e `plan-tokens/*.css`
  - Editar `client/src/design-system/tokens.css`:
    - **Manter** L15 (`--ds-orange: #e85002;`) como fonte da verdade
      (será sobrescrito em runtime por `applyBrandTokens`).
    - Substituir L17 (`--ds-orange-2: #c10801;`) — considerar derivar
      via `color-mix()` ou manter como está (define escala de brand
      complementar, decisão de design: manter literal).
    - Substituir L40, 41, 45, 46, 48, 61-64, 102: linhas com hex `#e85002`
      derivado para versões `rgba(var(--ds-orange-rgb), X)`.
  - Editar `client/src/index.css`:
    - Linhas L20, 110, 117, 122, 125, 130, 138, 148, 167, 174, 179, 182, 187:
      substituir `#e85002` por `var(--ds-orange)` (ou `rgba(var(--ds-orange-rgb), X)`).
    - Linhas L1103, 1110, 2047-2051, 2091-2094, 2177: idem.
  - Editar `client/src/design-system/plan-tokens/free.css` L21, 53: substituir hex por `var(--ds-orange)`.
  - Editar `client/src/design-system/plan-tokens/pro.css` L23: idem.
  - Editar `client/src/design-system/plan-tokens/studio.css` L24, 83: idem.
  - **Validação:** `rg "#e85002" client/src/` DEVE retornar apenas tokens.css L15.
  - Rodar `npm run dev` e verificar visual no browser (nenhuma cor
    ficou preto/transparente por erro de sintaxe CSS).
  - _Requirements: 7.1, 7.2, 7.3_
  - _Depends on: 6_

### Wave 3 — Substituições em UI, i18n e server (paralelizáveis)

- [ ] 10. Migrar strings i18n com placeholder `{{brand}}` (deferido para Fase 4)
  - Criar `scripts/replace-brand-in-i18n.mjs`: script Node que abre
    `client/src/contexts/LanguageContext.tsx` e
    `client/src/contexts/translationsSupplemental.ts`, e substitui
    a string literal `"Cena Studio"` por `"{{brand}}"` **apenas em
    valores string** (não em keys, não em comentários).
  - Alternativa se script for arriscado: substituição manual guiada
    por grep, aplicando a mesma regra.
  - Rodar o script uma vez. Revisar diff manualmente (~30 substituições
    esperadas por locale × 2 locales = ~60 total).
  - Editar `client/src/contexts/LanguageContext.tsx` no helper `t()`:
    injetar `{{brand}}` automaticamente com `SITE_CONFIG.brandName` como
    default (conforme design.md § i18n).
  - Rodar `npm run test client/src/test/translations.test.ts` → verificar.
    Se algum teste espera literalmente "Cena Studio" no output do `t()`,
    ele deve continuar passando porque o auto-inject retorna "Cena Studio"
    com defaults. Se algum teste quer verificar o placeholder cru,
    atualizar para ler direto de `translations[locale][key]`.
  - Rodar Vitest completo → 1088/1088.
  - _Requirements: 5.2, 5.3, 5.6_
  - _Depends on: 3_

- [x] 11. Substituir "Cena Studio" hardcoded em componentes UI e páginas
  - Grep `rg "Cena Studio" client/src/{components,pages}/` — resultados esperados
    (do context-gathering): `AIChatbot.tsx` L17,L104; `AppNavBar.tsx` L92;
    `landing/ProductProofSection.tsx` L168, L172; `landing/Hero.tsx` L135, L147;
    `pages/Success.tsx` L42; `pages/Dashboard.tsx` L265; `pages/SharedReview.tsx` L171;
    `pages/Profile.tsx` L124, L131, L681; `pages/CommercialOverview.tsx` L412.
  - Para cada arquivo: importar `SITE_CONFIG` de `@shared/site` e trocar
    literal "Cena Studio" por `SITE_CONFIG.brandName`.
  - Casos especiais:
    - `pages/CommercialOverview.tsx` L412: dentro de HTML export string —
      usar `${SITE_CONFIG.brandName}` em template literal.
    - `pages/Profile.tsx` L681: pode estar em texto renderizado (JSX) —
      substituir por `{SITE_CONFIG.brandName}`.
  - **Validação:** `rg "Cena Studio" client/src/{components,pages}/` DEVE
    retornar zero matches (excluindo comentários).
  - Rodar `npm run test` → 1088/1088.
  - _Requirements: 5.1_
  - _Depends on: 3_

- [x] 12. Substituir "Cena Studio" hardcoded em `documentFormatter.ts`
  - Editar `client/src/lib/documentFormatter.ts`:
    - Importar `SITE_CONFIG` de `@shared/site`, `parseHexColor`, `hexToRgba` de `@shared/color`.
    - L49: substituir `"CENA STUDIO"` literal por
      `SITE_CONFIG.brandName.toUpperCase()`.
    - L101: mesmo tratamento no DOCX header.
    - L146, L176, L220, L223: usa `SITE_CONFIG.title` — substituir por
      `SITE_CONFIG.brandName` (ou `seoTitle` conforme contexto — footer
      pode manter seoTitle se o design pedir).
    - L102-104: substituir cor hex `"FF4D00"` (formato docx sem `#`) por
      versão derivada de `SITE_CONFIG.primaryColor` (extrair helper:
      `hexWithoutHash(primaryColor)` → `"E85002"`).
    - L173, 179: substituir `pdf.setTextColor(255, 77, 0)` e
      `pdf.setDrawColor(255, 77, 0)` por
      `pdf.setTextColor(...parseHexColor(SITE_CONFIG.primaryColor))` e
      `pdf.setDrawColor(...parseHexColor(SITE_CONFIG.primaryColor))`.
    - L155, 223: substituir `SITE_CONFIG.title.toLowerCase()` no filename
      por `slugify(SITE_CONFIG.brandName)` importando de `shared/slug.ts`.
  - Rodar `npm run test client/src/test/documentFormatter.test.ts` → passa.
  - _Requirements: 5.1, 6.5, 6.8, 7.4_
  - _Depends on: 1, 2, 3_

- [x] 13. Substituir "Cena Studio" e hex em server (emails, ICS, exports)
  - Editar `server/services/emailService.ts` L4:
    trocar `EMAIL_FROM` fallback literal `"Cena Studio <onboarding@resend.dev>"`
    por `\`\${SITE_CONFIG.brandName} <onboarding@resend.dev>\``.
    Importar `SITE_CONFIG` de `@shared/site`.
  - Editar `server/services/icsService.ts` L70: trocar `"Cena Studio"` no
    `PRODID` por `SITE_CONFIG.brandName`.
  - Editar `server/controllers/authController.ts` L78, L80-83: subject
    e HTML do `forgotPassword` usam `SITE_CONFIG.brandName`.
  - Editar `server/controllers/meetingsController.ts` L128, L134, L245, L266:
    trocar fallback `|| "Cena Studio"` por `|| SITE_CONFIG.brandName`,
    e `|| "#ff4d1d"` por `|| SITE_CONFIG.primaryColor`.
  - Editar `server/services/ai/helpChatbot.ts` L22, L24: trocar literais
    no system prompt por `SITE_CONFIG.brandName`.
  - Editar `server/controllers/exportController.ts` L134, L163, L190,
    L224, L263, L323, L390: filename prefix `cenastudio_*` → derivar de
    `slugify(SITE_CONFIG.brandName)`.
  - Editar `server/controllers/contactController.ts` L8 e
    `meetingsController.ts` L10: `CONTACT_EMAIL` deriva de
    `process.env.SUPPORT_EMAIL || SITE_CONFIG.supportEmail || "cenastudio@atomicmail.io"`.
  - Rodar `npm run test server/` → esperado passar.
  - _Requirements: 5.1, 6.1, 6.2, 6.3, 6.4, 6.7, 6.8_
  - _Depends on: 1, 2, 3_

- [x] 14. Substituir hex literal em `plan-config.ts`, `token-resolver.ts`, `shadows.ts`
  - Editar `client/src/lib/plan-config.ts` L30, 47, 65, 83: substituir
    `accentColor: "#e85002"` por `accentColor: SITE_CONFIG.primaryColor`.
  - Editar `client/src/lib/design-system/token-resolver.ts` L29, 30, 71,
    197, 204: substituir defaults `"#e85002"` por `SITE_CONFIG.primaryColor`.
  - Editar `client/src/lib/design-system/shadows.ts` L79, 231, 317:
    substituir hexes literais por `SITE_CONFIG.primaryColor` (com
    `colorToRgbString` para as rgba).
  - Rodar `npm run test` → 1088/1088.
  - **Validação:** `rg "255,\\s*80,\\s*2" client/src/` E
    `rg "255,\\s*77,\\s*0" client/src/` DEVEM retornar zero matches.
  - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7_
  - _Depends on: 1, 3_

- [x] 15. Substituir em `client/index.html` via Vite transformIndexHtml
  - Editar `client/index.html`:
    - Trocar L7 `<title>...</title>` por `<title>%VITE_APP_NAME% — Feito por filmmakers, para filmmakers</title>`.
    - Trocar L10 e L11 `content="Cena Studio..."` por versão com placeholder.
    - Trocar L15 `<meta property="og:site_name" content="Cena Studio" />` por
      `content="%VITE_APP_NAME%"`.
    - Trocar L16 `og:title` e L22 `twitter:title` idem.
  - Verificar que Vite tem o mecanismo de placeholder ligado (é o
    default do Vite — `%VITE_XXX%` no `index.html` é substituído em
    build e dev).
  - Rodar `npm run build` e verificar `dist/index.html` para confirmar
    que placeholder foi substituído pelos valores default.
  - _Requirements: 5.4_
  - _Depends on: 3_

### Wave 4 — Upload de logo e persistência

- [x] 16. Adicionar `logoUrl` em `StudioSetting` client + server
  - Editar `client/src/lib/studioSettings.ts`:
    - Interface `StudioSettings`: adicionar `logoUrl?: string | null`.
    - `DEFAULT_STUDIO_SETTINGS`: adicionar `logoUrl: null`.
  - Editar `server/controllers/studioSettingsController.ts` L17-28:
    - `DEFAULT_SETTINGS`: adicionar `logoUrl: null`.
    - `toClient()`: incluir `logoUrl: row.logo_url ?? null`.
    - `updateStudioSettings`: aceitar `logoUrl` no body (validação: string
      < 2000 chars OR null).
  - Rodar `npm run test server/controllers/studioSettings.test.ts` (se existir)
    → passa.
  - Editar `server/controllers/collaborationSettings.test.ts` L223, L250:
    substituir asserção literal `"Cena Studio"` por `SITE_CONFIG.brandName`
    (importar de `@shared/site`).
  - Rodar Vitest completo → 1088/1088.
  - _Requirements: 4.2, 4.3, 4.6, 4.7, 5.6, 9.1_
  - _Depends on: 3, 4_

- [ ] 17. Endpoint `POST /api/studio-settings/logo` para upload (deferido para Fase 4 — operador seta via env `APP_LOGO_URL` ou `PUT /api/studio-settings`)
  - Criar `server/services/supabaseStorage.ts::uploadBrandAsset({userId, file, mimeType, filename})` —
    análogo a `uploadProjectFile`. Bucket sugerido: `studio-branding`.
    Se o bucket não existir, log claro em stderr no primeiro upload.
  - Criar `server/controllers/studioBrandingController.ts::uploadLogo` conforme design.md:
    - `authenticate + requireOperationalPlan` (mesmo padrão de `studioSettings`).
    - `multer` para parse de `multipart/form-data` (usar helper existente
      se já configurado em `server/middleware`).
    - Validação mime (png/jpeg/svg+xml/webp) + size (<5MB).
    - Chama `uploadBrandAsset`, recebe `publicUrl`.
    - `prisma.studioSetting.upsert` com `logoUrl: publicUrl`.
    - Responde `{ success: true, data: { logoUrl } }`.
  - Criar `server/routes/studioBranding.ts` (ou adicionar no
    `server/routes/studioSettings.ts` existente): rota
    `POST /api/studio-settings/logo`.
  - Registrar rota em `server/app.ts` OR no index de rotas apropriado.
  - Criar `server/controllers/studioBranding.test.ts` (novo) com 3 casos:
    1. Sucesso: mime válido, salva `logoUrl` retornado.
    2. Erro: mime inválido → 400.
    3. Erro: size > 5MB → 400.
    (Mockar `uploadBrandAsset` para não bater no Supabase real.)
  - _Requirements: 4.4, 4.5_
  - _Depends on: 4, 16_

### Wave 5 — Validação final, docs, commit

- [x] 18. Docs, guardrails de grep, validação final, commit isolado
  - Criar `docs/white-label/setup-guide.md` conforme design.md:
    - Passos de deploy para nova marca.
    - Lista de env vars com defaults e comentário.
    - Referência a `WHITE_LABEL_PLAN.md`.
    - Nota sobre HTML legal + favicon SVG (out of scope Fase 3).
    - Nota sobre bucket Supabase `studio-branding` (operador cria).
    - Contraste WCAG: link para coolors.co.
  - Atualizar `PLANO-IDEAL-PROXIMOS-PASSOS.md`: Fase 3 → ✅ concluída
    com data. Fase 4 (multi-tenant) → "⏸️ Aguardando decisão de negócio".
  - Atualizar `WHITE_LABEL_PLAN.md`: seção §3 "Nível 1" com nota
    "✅ Concluído — ver `.kiro/specs/fase-3-white-label/` e commit XXX".
  - **Guardrails de grep** (comandos de validação):
    - `rg "Cena Studio" client/src/{components,pages}/` → zero matches em
      texto renderizado.
    - `rg "#e85002" client/src/design-system/` → apenas L15 de `tokens.css`.
    - `rg "255,\\s*80,\\s*2" client/src/` → zero.
    - `rg "255,\\s*77,\\s*0" client/src/` → zero.
  - Rodar `npm run test` → esperado: 1088/1088 (mais os ~10 testes novos
    das tasks 1, 2, 3, 6, 7, 17 = **1098+**).
  - Rodar `npx playwright test --grep "@fase1" --project=chromium-mobile --workers=1`
    → esperado 6/6 verde (Fase 2 sem regressão).
  - Rodar `npx playwright test` (suíte completa) → dentro do orçamento.
  - `git add` isolado dos arquivos da Fase 3 (spec + código + docs, sem
    Fase 2 changes ou outros arquivos não-relacionados).
  - Criar commit local `feat(brand): Fase 3 - white label básico (Nível 1)`
    com corpo listando cada requirement resolvido.
  - **NÃO fazer push** (regra: commit local, isolado por fase).
  - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3_
  - _Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "4", "5"],
      "description": "Utilitários shared, SITE_CONFIG estendido, migration Prisma, .env.example. Task 3 depende só da 1."
    },
    {
      "wave": 2,
      "tasks": ["6", "7", "8", "9"],
      "description": "apply-tokens, BrandLogo, AuthLayout (usa BrandLogo), CSS tokens (depende do apply-tokens)."
    },
    {
      "wave": 3,
      "tasks": ["10", "11", "12", "13", "14", "15"],
      "description": "Substituições UI, i18n, documentFormatter, server, plan-config e HTML."
    },
    {
      "wave": 4,
      "tasks": ["16", "17"],
      "description": "StudioSetting.logoUrl no client+server + endpoint de upload."
    },
    {
      "wave": 5,
      "tasks": ["18"],
      "description": "Docs, validações finais, commit."
    }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": ["1"],
    "4": [],
    "5": [],
    "6": ["1", "3"],
    "7": ["3"],
    "8": ["7"],
    "9": ["6"],
    "10": ["3"],
    "11": ["3"],
    "12": ["1", "2", "3"],
    "13": ["1", "2", "3"],
    "14": ["1", "3"],
    "15": ["3"],
    "16": ["3", "4"],
    "17": ["4", "16"],
    "18": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17"]
  }
}
```

Total: 18 tasks, 5 waves. Com `MAX_CONCURRENT_SUBAGENTS=5`:

- Wave 1 (5 tasks) — 1 rodada (5 paralelas).
- Wave 2 (4 tasks) — 1 rodada.
- Wave 3 (6 tasks) — 2 rodadas (5 + 1).
- Wave 4 (2 tasks) — 1 rodada.
- Wave 5 (1 task) — 1 rodada.

## Notes

### Regra "sem regressão" de facto

Cada task tem passo explícito de "rodar `npm run test` → 1088/1088" (ou
o novo total após tasks 1, 2, 3, 6, 7, 17 adicionarem testes). Isso é o
guarda-corpo contra regressão silenciosa.

### Rollback local por task

Cada task é localizada em 1-4 arquivos. Se algo quebrar, `git checkout
--` do arquivo afetado reverte só aquela task. Isso é intencional.

### Sobre a task 15 (Vite placeholders)

Vite substitui `%VITE_XXX%` em `index.html` automaticamente. Sem
necessidade de plugin novo. Requer que as env vars estejam presentes
no `.env` (ou `.env.local`) durante `npm run build` e `npm run dev`.

### Sobre o script da task 10

Recomendado: implementar como Node script simples, rodar uma vez, e
descartar (não committar). Se preferir manter, adicionar em
`scripts/replace-brand-in-i18n.mjs` com nota "one-shot migration".

### Sobre a task 17 (upload de logo)

O bucket `studio-branding` do Supabase é pré-requisito operacional.
Setup-guide da task 18 documenta como criar. Testes da task 17 mockam
a chamada de storage.

### Sobre a task 4 (migration)

A migration é aditiva (`logo_url` nullable). Zero risco de perda de
dados. Rollback trivial via `prisma migrate resolve --rolled-back
<migration-name>`.

### Sobre a task 9 (CSS)

Substituir hex literal em CSS é mecânico mas requer atenção. A regra
básica: `#e85002` em `background`, `color`, `border-color` etc.
vira `var(--ds-orange)`. Em contextos rgba, vira `rgba(var(--ds-orange-rgb), X)`.

## Referências

- Design: [`design.md`](./design.md)
- Requirements: [`requirements.md`](./requirements.md)
- WHITE_LABEL_PLAN: [`../../../WHITE_LABEL_PLAN.md`](../../../WHITE_LABEL_PLAN.md)
- Plano macro: [`../../../PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md)
- Fase 2 spec: [`../fase-2-layout-mobile-e-tabs/`](../fase-2-layout-mobile-e-tabs/)
