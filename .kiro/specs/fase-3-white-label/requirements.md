# Requirements — Fase 3: White Label básico (Nível 1)

## Introdução

Esta fase transforma o CenaStudio de "produto de marca única" em produto
**white label deploy-por-cliente**: uma mesma base de código roda como
"Cena Studio", "Aurora Filmes", "Nível de Cinema", etc., trocando apenas
variáveis de ambiente e (opcionalmente) o logo carregado em runtime.
Não é multi-tenant. Cada deploy continua servindo uma marca — mas nenhuma
linha do código guarda "Cena Studio" ou `#e85002` como valor fixo.

**Referência de plano macro:**
[`WHITE_LABEL_PLAN.md`](../../../WHITE_LABEL_PLAN.md) §3 "Nível 1".

**Entrada:** o mapeamento de acoplamento à marca gerado pelo
sub-agent context-gatherer, sumariado na seção "Contexto" abaixo.

**Fora do escopo (para Fase 4 / Nível 2, opcional):**

- Multi-tenant (uma instância servindo N marcas simultaneamente).
- Middleware de resolução de tenant por subdomínio.
- Model `Tenant` no Prisma.
- Stripe Connect para repasse.
- Painel de "operador" gerenciando múltiplas marcas.

## Contexto (achados relevantes)

O sub-agent mapeou 4 famílias de acoplamento:

1. **Texto "Cena Studio"** em ~25 arquivos: 6 em componentes de UI visível
   (BrandLogo, AuthLayout, AIChatbot, AppNavBar, Hero, ProductProofSection),
   ~15 em strings i18n (LanguageContext + translationsSupplemental),
   3 em HTML estático (`client/index.html`, `terms-of-use.html`,
   `privacy-policy.html`), e ~10 em server (emails, ICS, `documentFormatter`).
2. **Cor `#e85002` (e derivados como `#ff4d1d`, `#FF4D00`, `255,77,0`)**
   em `tokens.css`, `index.css`, `apply-tokens.ts` (`PLAN_TOKENS`),
   `plan-tokens/*.css`, `documentFormatter.ts` e outros — sempre como hex
   literal, não como referência a `var(--ds-orange)`.
3. **StudioSetting já existe** com colunas `studioName`, `primaryColor`,
   `email`, `phone`, `website`, `signature` (por-usuário, via
   localStorage no client + Prisma no server) — **falta `logoUrl`**.
   Já é lido por `meetingsController` para email de convite. Não é lido
   pelas superfícies globais (BrandLogo, AuthLayout, documentFormatter).
4. **Env vars**: hoje só existem `RESEND_API_KEY` e `EMAIL_FROM`. Falta
   `APP_NAME`, `APP_PRIMARY_COLOR`, `APP_LOGO_URL`, `APP_DOMAIN`,
   `SUPPORT_EMAIL` como env vars canônicas de marca.

## Requirements

### Requirement 1 — Config central de marca (`shared/site.ts`) estendido

**User Story:** Como pessoa que faz deploy do sistema para um novo cliente
(marca), quero configurar nome, cor primária, logo e domínio uma única vez
via variáveis de ambiente, para não precisar editar código em cada deploy.

#### Acceptance Criteria

1. WHEN o sistema inicializa THEN `shared/site.ts` DEVE exportar
   `SITE_CONFIG` com os campos: `brandName` (string curta, ex.
   "Cena Studio"), `brandNameParts` (tupla `[string, string]` opcional,
   ex. `["Cena", "Studio"]`, para o wordmark de duas cores), `seoTitle`
   (string longa, o antigo `title`), `description`, `domain`,
   `primaryColor` (hex, ex. "#e85002"), `logoUrl` (string opcional, ex.
   "/assets/logo-white.png" ou URL absoluta), `supportEmail` (string
   opcional, ex. "contato@cenastudio.com.br").
2. WHEN o sistema roda no servidor THEN `SITE_CONFIG` DEVE ler seus valores
   de `process.env.APP_NAME`, `process.env.APP_DOMAIN`,
   `process.env.APP_PRIMARY_COLOR`, `process.env.APP_LOGO_URL`,
   `process.env.SUPPORT_EMAIL`, com **defaults iguais aos valores atuais
   de "Cena Studio"** (para preservar o comportamento sem env vars
   configuradas).
3. WHEN o sistema roda no cliente (browser) THEN `SITE_CONFIG` DEVE ler
   seus valores de `import.meta.env.VITE_APP_NAME`,
   `VITE_APP_DOMAIN`, `VITE_APP_PRIMARY_COLOR`, `VITE_APP_LOGO_URL`,
   `VITE_SUPPORT_EMAIL`, com os mesmos defaults.
4. WHEN um consumidor importa `SITE_CONFIG` THEN o campo `title` legado
   (SEO longo) DEVE continuar disponível como alias de `seoTitle` para
   não quebrar `documentFormatter.ts`, `pages/Success.tsx` e demais
   consumidores existentes que ainda dependam dele. Alias emite deprecation
   warning em `console.warn` uma única vez por sessão (helper flag).
5. WHEN `APP_NAME` está vazio ou ausente THEN o sistema DEVE cair no
   default "Cena Studio" sem lançar exceção e sem crash.
6. WHEN uma cor primária inválida é passada (não bate com `#RRGGBB` ou
   `#RGB`) THEN o sistema DEVE ignorar o valor, aplicar o default
   "#e85002" e logar `console.warn` uma vez.
7. WHEN o arquivo `.env.example` é lido THEN ele DEVE conter as 5 novas
   env vars documentadas com comentário explicando cada uma e o default.

### Requirement 2 — BrandLogo e AuthLayout dinâmicos

**User Story:** Como usuário final acessando o app, quero ver o nome da
marca configurada no deploy (em toda tela), não um valor fixo "Cena Studio".

#### Acceptance Criteria

1. WHEN `BrandLogo` renderiza THEN ele DEVE ler as duas partes do wordmark
   de `SITE_CONFIG.brandNameParts`, caindo em `SITE_CONFIG.brandName`
   como parte única se `brandNameParts` não estiver definido.
2. WHEN `SITE_CONFIG.logoUrl` está definido AND é uma URL válida THEN
   `BrandLogo` DEVE aceitar uma prop `variant?: "wordmark" | "image"` (default
   `"wordmark"`) e, quando `variant="image"`, renderizar `<img
   src={logoUrl} alt={brandName}>` no lugar do wordmark textual.
3. WHEN `AuthLayout` renderiza THEN ele DEVE consumir `<BrandLogo tone="onDark" />`
   no lugar do markup atual duplicado nos spans "Cena" + "Studio" (L22-25
   de `AuthLayout.tsx`).
4. WHEN qualquer componente de UI que hoje mostra "Cena Studio" como texto
   literal (mapeados no context-gathering: `AIChatbot`, `AppNavBar`
   linha 92, `Hero.tsx` linha 135 e 147, `ProductProofSection.tsx` linha
   168 e 172) THEN ele DEVE ler `SITE_CONFIG.brandName` no lugar do texto
   literal.
5. WHEN `SITE_CONFIG.brandName` muda em runtime (mudança de env var + rebuild)
   THEN todas as superfícies acima renderizam o novo valor sem edição de
   código adicional.
6. WHEN `BrandLogo` renderiza no modo `variant="image"` AND o `logoUrl`
   falha de carregar THEN ele DEVE cair em `variant="wordmark"`
   automaticamente (fallback via `onError`).

### Requirement 3 — Cor primária injetada nas CSS variables

**User Story:** Como pessoa configurando o white label para um cliente,
quero definir uma cor primária diferente sem editar CSS, para que toda a
interface (botões, glows, shadows, tabs, indicadores) reflita a cor da
marca do cliente.

#### Acceptance Criteria

1. WHEN o app inicializa (client) THEN um script deve executar antes do
   primeiro paint do React (via `client/index.html` inline OR
   `apply-tokens.ts` importado no `main.tsx`) que injeta
   `SITE_CONFIG.primaryColor` como o valor da CSS variable `--ds-orange`
   no `document.documentElement`.
2. WHEN a cor primária é injetada THEN o valor também DEVE ser exposto
   como `--ds-orange-rgb` (formato "R, G, B" sem parênteses, ex.
   `"232, 80, 2"`) para que consumidores de `rgba(var(--ds-orange-rgb),
   ALPHA)` funcionem.
3. WHEN o `tokens.css` ou `index.css` contêm hex literal `#e85002`
   (fora da definição base da variável) THEN eles DEVEM ser substituídos
   por `var(--ds-orange)` ou `rgba(var(--ds-orange-rgb), ALPHA)`.
4. WHEN o `apply-tokens.ts` define `PLAN_TOKENS` THEN cada `"#e85002"`
   literal DEVE ser substituído por `SITE_CONFIG.primaryColor`, e cada
   `"rgba(232, 80, 2, X)"` DEVE ser substituído por
   `"rgba(${primaryColorRgb}, X)"` computado a partir de `SITE_CONFIG.primaryColor`.
5. WHEN a cor primária é `#ffcc00` (amarelo) THEN a UI inteira reflete a
   cor amarela sem regressão visual estrutural (bordas, tipografia,
   layout preservados; apenas hue muda).
6. WHEN `SITE_CONFIG.primaryColor` é uma cor com contraste baixo em fundo
   escuro (ex.: `#333333`) THEN o sistema aplica a cor mesmo assim (não
   é responsabilidade do sistema recusar). Documentação (§ Nota) alerta
   sobre WCAG contrast.
7. WHEN Vitest roda `apply-tokens.test.ts` (existente + casos novos) THEN
   testes DEVEM cobrir: injeção correta em cada plano, override por
   `SITE_CONFIG.primaryColor`, fallback quando `SITE_CONFIG.primaryColor`
   é inválida.

### Requirement 4 — StudioSetting: coluna `logoUrl` + endpoint de upload

**User Story:** Como usuário admin do studio, quero fazer upload de um
logo do meu deploy (via UI de Configurações), para que ele apareça
automaticamente em emails, PDFs e documentos gerados sem redeploy.

#### Acceptance Criteria

1. WHEN o schema do banco é migrado THEN a tabela `studio_settings` DEVE
   ter uma nova coluna `logo_url` (nullable, string), com migration
   Prisma correspondente aplicada no `dev.db` (SQLite) e no Postgres
   (via `prisma migrate dev`).
2. WHEN o cliente chama `GET /api/studio-settings` THEN a resposta DEVE
   incluir `logoUrl` no shape (nullable).
3. WHEN o cliente chama `PUT /api/studio-settings` com `logoUrl` no body
   THEN o valor DEVE ser salvo na coluna, com validação: string ou null,
   comprimento < 2000 chars, formato URL ou path relativo.
4. WHEN o cliente chama `POST /api/studio-settings/logo` com um arquivo
   binário (multipart/form-data) THEN o servidor DEVE:
   - Validar tipo (png/jpeg/svg/webp), tamanho (<5MB).
   - Fazer upload via helper análogo a `uploadProjectFile` de
     `server/services/supabaseStorage.ts` (bucket dedicado
     `studio-branding` ou similar).
   - Salvar a URL retornada em `studio_settings.logo_url` do usuário
     autenticado.
   - Retornar `{ logoUrl }` no response.
5. WHEN um usuário sem plano operacional (Free) tenta acessar o endpoint
   THEN a rota DEVE responder 403 (respeita o middleware
   `requireOperationalPlan` já existente para `studioSettingsController`).
6. WHEN o usuário faz login THEN o cliente DEVE ler `studio.logoUrl` do
   `/api/studio-settings` e, se presente, sobrepor `SITE_CONFIG.logoUrl`
   no runtime do client (permite override por-usuário em cima da env var).
7. WHEN o usuário limpa o logo (remove) THEN o endpoint aceita
   `{ logoUrl: null }` e volta para o `SITE_CONFIG.logoUrl` do deploy.

### Requirement 5 — Substituir "Cena Studio" hardcoded em texto de UI

**User Story:** Como pessoa lendo o código, quero encontrar zero
ocorrências de "Cena Studio" como string literal em componentes visíveis
ao usuário, para saber que o deploy é 100% white label.

#### Acceptance Criteria

1. WHEN o grep `rg "Cena Studio" client/src/{components,pages}/` roda
   THEN ele DEVE retornar zero matches em texto renderizado (props,
   children, `aria-label`, `alt`). Excepcionalmente permitido: comentários
   descritivos e strings de placeholders/fallbacks quando `SITE_CONFIG` é
   indisponível.
2. WHEN o grep roda em `contexts/LanguageContext.tsx` e
   `contexts/translationsSupplemental.ts` THEN cada string i18n que hoje
   contém "Cena Studio" DEVE ser transformada em template com placeholder
   `{{brand}}`, e o helper `t()` DEVE aceitar um segundo argumento com
   `{ brand: SITE_CONFIG.brandName }` OR haver um `t` override que
   sempre injeta `{ brand: SITE_CONFIG.brandName }` automaticamente.
3. WHEN a estratégia i18n escolhida é "auto-inject" THEN o helper `t()`
   DEVE substituir `{{brand}}` por `SITE_CONFIG.brandName` em TODAS as
   traduções pt/en, sem exigir que o call-site passe o parâmetro.
4. WHEN qualquer meta tag em `client/index.html` faz referência a
   "Cena Studio" THEN ela DEVE ser substituída por placeholder
   `%VITE_APP_NAME%` processado pelo Vite `transformIndexHtml` OR
   permanecer como default (documentação alerta que meta tags requerem
   rebuild). Estratégia recomendada: placeholder.
5. WHEN `client/public/terms-of-use.html` e `privacy-policy.html` são
   páginas de documento legal com "Cena Studio" repetido dezenas de vezes
   THEN elas DEVEM permanecer como estão nesta fase (out of scope), com
   uma TODO comment no topo do arquivo indicando: "Legal template — substituir
   Brand em Fase 4 quando template server-side existir".
6. WHEN Vitest passa após as substituições THEN todos os 1088 testes
   continuam verdes. Testes que assertavam "Cena Studio" literal (ex.:
   `collaborationSettings.test.ts` L223, L250) DEVEM ser atualizados para
   asserto dinâmico (`expect(x).toBe(SITE_CONFIG.brandName)` ou setar
   `process.env.APP_NAME` no beforeEach do teste).

### Requirement 6 — Server-side: emails, ICS, PDF/DOCX parametrizados

**User Story:** Como cliente final recebendo um email do studio, quero ver
a marca correta do studio no assunto, no header do email, no arquivo .ics
de reunião, e no PDF/DOCX exportado.

#### Acceptance Criteria

1. WHEN o servidor envia email de reset de senha (`authController.ts`
   `forgotPassword`) THEN o subject e o corpo DEVEM usar
   `SITE_CONFIG.brandName` no lugar do literal "Cena Studio".
2. WHEN o servidor envia email de convite de reunião
   (`meetingsController.ts` L127-181) THEN o fallback do `studioName`
   (`|| "Cena Studio"`) DEVE ser trocado por `|| SITE_CONFIG.brandName`,
   e o fallback do `brandColor` (`|| "#ff4d1d"`) DEVE ser trocado por
   `|| SITE_CONFIG.primaryColor`. A cascata continua: user studio setting
   > env var default.
3. WHEN o `emailService.ts` define `EMAIL_FROM` fallback THEN o fallback
   DEVE ser `${SITE_CONFIG.brandName} <onboarding@resend.dev>` no lugar
   do literal.
4. WHEN o `icsService.ts` gera evento THEN o `PRODID` DEVE ser
   `-//${SITE_CONFIG.brandName}//Meetings//PT-BR` no lugar do literal.
5. WHEN o `documentFormatter.ts` gera texto/DOCX/PDF THEN o header
   `"CENA STUDIO"` DEVE ser substituído por
   `SITE_CONFIG.brandName.toUpperCase()`, e cores literais `"FF4D00"` /
   `[255, 77, 0]` DEVEM ser derivadas de `SITE_CONFIG.primaryColor`
   (parseHex helper novo em `shared/color.ts`).
6. WHEN o `Profile.tsx` gera receipt HTML (L124-131) e
   `CommercialOverview.tsx` gera export HTML (L412) THEN ambos DEVEM
   usar `SITE_CONFIG.brandName`.
7. WHEN o `helpChatbot.ts` L22-24 monta o system prompt de IA THEN ele
   DEVE usar `SITE_CONFIG.brandName` no lugar do literal (afeta
   respostas do bot mostradas ao usuário).
8. WHEN o `exportController.ts` gera filename `cenastudio_*` (L134, 163,
   190, 224, 263, 323, 390) THEN o prefixo DEVE ser derivado de
   `slugify(SITE_CONFIG.brandName)` (helper novo em `shared/slug.ts`
   OR reuso do `safeFilename` que já existe em `documentFormatter.ts`
   linha 78, extraído para `shared/`).
9. WHEN a suíte Vitest roda THEN todos os testes de emails/ICS/exports
   continuam verdes (com `process.env.APP_NAME` setado no `test/setup.ts`
   OR asserts atualizados).

### Requirement 7 — Substituir cor hex literal em plan-tokens e demais CSS

**User Story:** Como pessoa mantendo o design system, quero que a cor
primária apareça em um único lugar (definição da CSS var), para que
mudanças de marca não exijam grep-and-replace.

#### Acceptance Criteria

1. WHEN o grep `rg "#e85002" client/src/design-system/` roda THEN ele DEVE
   retornar apenas a linha 15 de `tokens.css` (definição base
   `--ds-orange: #e85002;`), zero em outros lugares.
2. WHEN o grep `rg "255,\\s*80,\\s*2" client/src/` OR
   `rg "255,\\s*77,\\s*0" client/src/` roda THEN ele DEVE retornar zero
   matches (todos derivados usam `var(--ds-orange-rgb)` ou similar).
3. WHEN os arquivos `plan-tokens/free.css`, `pro.css`, `studio.css` são
   inspecionados THEN os hexes literais `#e85002` DEVEM ser substituídos
   por `var(--ds-orange)`.
4. WHEN `apply-tokens.ts` define `PLAN_TOKENS` THEN as strings de rgba
   e hex DEVEM ser derivadas dinamicamente de `SITE_CONFIG.primaryColor`
   (helper `colorToRgb()` novo).
5. WHEN `plan-config.ts` define `accentColor` por plano (L30, 47, 65, 83)
   THEN o valor DEVE apontar para `SITE_CONFIG.primaryColor` no lugar do
   hex literal.
6. WHEN `token-resolver.ts` define defaults de fallback (L29, 30, 71,
   197, 204) THEN o hex literal `#e85002` DEVE ser trocado por
   `SITE_CONFIG.primaryColor`.
7. WHEN `shadows.ts` (L79, 231, 317) define sombras com cor primária THEN
   o hex literal DEVE ser trocado por `SITE_CONFIG.primaryColor` (com
   `colorToRgb` para os rgba).
8. WHEN `client/public/terms-of-use.html` e `privacy-policy.html` têm
   `--orange: #e85002` na linha 9 THEN eles PERMANECEM como estão nesta
   fase (out of scope, mesma justificativa do Requirement 5.5).

### Requirement 8 — `.env.example` documentado e defaults preservados

**User Story:** Como pessoa fazendo deploy em um cliente novo, quero
copiar `.env.example` para `.env`, preencher 5 linhas de marca, e ter o
sistema rodando com a nova marca sem outra edição de código.

#### Acceptance Criteria

1. WHEN o arquivo `.env.example` é lido THEN ele DEVE conter as seguintes
   entradas comentadas (comentário explicativo acima de cada uma):
   ```
   # Brand — nome curto exibido em toda a UI, emails, PDFs.
   APP_NAME=Cena Studio
   # Optional: partes separadas do wordmark (ex.: "Cena|Studio" para
   # duas cores diferentes). Vazio usa APP_NAME como parte única.
   APP_NAME_PARTS=Cena|Studio
   # Domínio primário do deploy (usado em emails, share links, SEO).
   APP_DOMAIN=cenastudio.dev
   # Cor primária hex — botões, glows, tabs, shadows.
   APP_PRIMARY_COLOR=#e85002
   # URL relativa ou absoluta do logo (opcional).
   APP_LOGO_URL=
   # Email de suporte visível em rodapés/emails.
   SUPPORT_EMAIL=
   ```
2. WHEN Vite lê `.env` THEN as mesmas variáveis também devem ter versão
   `VITE_APP_*` presente para exposição no client — no `.env.example`
   ficam alinhadas em bloco separado com comentário: "Duplicatas com
   prefixo `VITE_` para exposição no build do client (Vite não expõe
   env vars sem prefixo `VITE_`)".
3. WHEN nenhuma env var é preenchida THEN o sistema roda como
   "Cena Studio" cor `#e85002` (comportamento hoje, preservado).
4. WHEN `APP_NAME_PARTS=Aurora|Filmes` está setado THEN o `BrandLogo`
   renderiza "Aurora" + "Filmes" com estilos separados (parte 1 branco,
   parte 2 cor primária), como faz hoje com "Cena" + "Studio".
5. WHEN `APP_NAME_PARTS` está vazio E `APP_NAME=AuroraFilmes` THEN o
   `BrandLogo` renderiza "AuroraFilmes" como parte única, sem cor
   secundária.

### Requirement 9 — Testes: sem regressão, novos casos para brand-aware

**User Story:** Como pessoa mantendo a suíte de testes, quero ter certeza
de que o white label não quebrou nada e que novos comportamentos
brand-aware estão cobertos.

#### Acceptance Criteria

1. WHEN Vitest roda THEN todos os 1088 testes existentes continuam
   verdes (isso inclui a atualização de `collaborationSettings.test.ts`
   L223, L250 para usar `SITE_CONFIG.brandName` no lugar do literal
   "Cena Studio").
2. WHEN a Fase 3 adiciona testes novos THEN eles DEVEM cobrir:
   - `shared/site.ts`: leitura de env vars server + client, defaults,
     validação de cor inválida.
   - `shared/color.ts`: `parseHexColor()`, `colorToRgb()`, `hexToRgba()`,
     casos inválidos, cores curtas `#abc`.
   - `BrandLogo`: renderiza `brandName`, `brandNameParts`, fallback,
     variant `image` com fallback de erro.
   - `apply-tokens.ts`: injeção da cor primária, PLAN_TOKENS derivado.
   - `studioSettingsController`: upload de logo (mock supabaseStorage),
     salvamento de logoUrl, validação de mime/size.
3. WHEN Playwright roda THEN a suíte E2E existente `@fase1` (6 testes)
   continua verde. Nenhum teste E2E novo é obrigatório nesta fase, mas
   um smoke test opcional (`launch.spec.ts` extension) pode confirmar
   que `APP_NAME=OutraMarca` reflete no header, se time permitir.

### Requirement 10 — Documentação e migração para operadores

**User Story:** Como operador que vai clonar o deploy para um cliente
novo, quero seguir um checklist claro de 5 passos, para deploy uma marca
em <30 minutos.

#### Acceptance Criteria

1. WHEN a Fase 3 é entregue THEN o repo DEVE conter
   `docs/white-label/setup-guide.md` com:
   - Passo a passo de deploy para nova marca (env vars, migration,
     upload de logo).
   - Lista de env vars com defaults e o que cada uma controla.
   - Referência a `WHITE_LABEL_PLAN.md` para o "porquê".
   - Nota explicando o que NÃO é branding automatizado nesta fase
     (HTML legal, favicon `.svg` estático — precisa substituir arquivo).
2. WHEN o `PLANO-IDEAL-PROXIMOS-PASSOS.md` é atualizado THEN a Fase 3
   é marcada como ✅ concluída com data, e a Fase 4 (multi-tenant, se
   ativada) fica listada como "⏸️ Aguardando decisão de negócio".
3. WHEN o `WHITE_LABEL_PLAN.md` é atualizado THEN a seção §3 "Nível 1"
   é marcada como concluída com referência ao commit e à Fase 3.

## Notas técnicas

### Nomenclatura das env vars

Escolha proposta:

- Server-side lê `process.env.APP_*` (sem prefixo).
- Client-side (browser) lê `import.meta.env.VITE_APP_*` (Vite exige
  prefixo `VITE_` para expor no bundle).
- Os dois convivem em `.env` e no `shared/site.ts` faz merge com
  `typeof window === "undefined"` ternário. Precedência: env var setada
  > default do código.

### Contraste WCAG da cor primária

O sistema **não valida** contraste automaticamente nesta fase. Se o
operador escolher uma cor com contraste ruim (ex.: `#a0a0a0` em fundo
`#0a0a0a`), a UI ficará ruim mas não quebra. O `docs/white-label/setup-guide.md`
inclui nota explicando o trade-off e recomenda ferramentas como
[coolors.co/contrast-checker](https://coolors.co/contrast-checker).

### Estratégia i18n com placeholder

O helper `t()` em `LanguageContext.tsx` já suporta interpolação simples
(padrão `{{ variavel }}`). A Fase 3 estende para injeção automática de
`{{brand}}` em toda tradução, sem quebrar as interpolações existentes
(que passam explicitamente o parâmetro). O placeholder é global; se
alguém passa `{ brand: "OutroValor" }` explicitamente, esse valor
sobrescreve o global.

### Sobre o favicon SVG

O arquivo `client/public/favicon.svg?v=2` referenciado em
`client/index.html` L27 é estático e provavelmente exibe a marca gráfica
"Cena Studio". Trocar dinamicamente exige regenerar/servir SVG por
usuário. Fica **fora do escopo** — o operador substitui o arquivo
manualmente ao clonar o deploy. Isso é documentado no setup-guide.

### Sobre `client/public/assets/logo.png`, `logo-white.png`

Existem como arquivos estáticos mas não são referenciados por nenhum
componente hoje. Ficam disponíveis para o operador substituir na hora
de configurar `APP_LOGO_URL=/assets/logo-white.png`. A Fase 3 não os
apaga.
