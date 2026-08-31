# Architecture Decisions - Cena Studio

Este documento documenta as decisões de arquitetura significativas do Cena Studio, seguindo o padrão [Architecture Decision Records (ADR)](https://adr.github.io/).

## 📋 Índice

- [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
- [Decisões de Arquitetura](#decisões-de-arquitetura)
- [Padrões de Design](#padrões-de-design)
- [Trade-offs Considerados](#trade-offs-considerados)

---

## 🏗️ Visão Geral da Arquitetura

### Stack Tecnológico

```
Frontend (Client)
├── React 19 + TypeScript
├── Vite (Build tool)
├── Tailwind CSS v4 (Estilização)
├── Wouter (Roteamento SPA)
└── Radix UI (Componentes)

Backend (Server)
├── Express + TypeScript
├── PostgreSQL via Prisma (banco principal, produção e dev)
├── SQLite (better-sqlite3) - fallback local quando DATABASE_URL não está definida
├── JWT httpOnly cookie (Autenticação)
└── Passport.js (GitHub OAuth opcional)

Infraestrutura
├── Vercel (hosting)
├── Supabase Postgres (banco de produção)
├── Cloudinary (thumbnails/imagens)
├── Supabase Storage (upload de arquivos de projeto, opcional)
└── GitHub Actions (CI: typecheck + build)
```

> **Nota sobre Supabase:** em 14/08/2026 a produção foi verificada em
> Vercel + Supabase Postgres. O runtime usa `SUPABASE_DATABASE_URL` como
> string preferencial de Postgres, com `DATABASE_URL`/`POSTGRES_*` apenas
> como fallbacks de compatibilidade.

### Arquitetura de Camadas

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (React Components + Pages)         │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│          API Layer                  │
│  (Express Routes + Controllers)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Business Logic Layer        │
│  (Services - Auth, AI, CRM, etc.)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Data Access Layer          │
│  (Prisma → PostgreSQL, fallback SQLite) │
└─────────────────────────────────────┘
```

---

## 📐 Decisões de Arquitetura

### ADR-001: Monolito vs Microservices

**Status:** Aceito
**Data:** 2024
**Contexto:** Precisamos decidir entre arquitetura monolítica ou microservices.

**Decisão:** Monolito modular

**Rationale:**
- Time pequeno (1-3 desenvolvedores)
- Complexidade de microservices não justificada ainda
- Deploy mais simples
- Menor overhead operacional
- Escala horizontal ainda não necessária

**Consequências:**
- Positivas:
  - Desenvolvimento mais rápido
  - Debugging mais simples
  - Menor latência entre componentes

- Negativas:
  - Escala vertical limitada
  - Acoplamento potencial entre módulos
  - Deploy monolítico (todo ou nada)

**Revisão:** Reavaliar quando atingir 10k usuários ou 50+ req/s

---

### ADR-002: SQLite vs Postgres (Runtime)

**Status:** Aceito, revisado em 14/08/2026 (produção atual: Vercel + Supabase Postgres)
**Data:** 2024, migrações subsequentes em 30/06/2026, julho/2026 e 14/08/2026
**Contexto:** Escolher banco de dados para runtime.

**Decisão:** PostgreSQL como banco principal (via Prisma + `@prisma/adapter-pg`),
hospedado no Supabase. Em produção serverless, usar `SUPABASE_DATABASE_URL`
com o transaction pooler do Supabase. SQLite (`better-sqlite3`) permanece como *fallback*
automático quando nenhuma `SUPABASE_DATABASE_URL`/`DATABASE_URL`/`POSTGRES_URL` está configurada
(`server/models/prisma.ts`, flag `shouldUsePrisma`) — útil para rodar o
projeto localmente sem depender de um Postgres externo.

**Rationale:**
- SQLite (fallback local):
  - Zero configuração
  - Não requer credenciais externas para rodar `npm run dev`

- PostgreSQL / Supabase (produção):
  - Escalável, backup gerenciado pela plataforma
  - Pooler apropriado para Vercel serverless
  - Integração direta com Supabase Auth/Storage quando esses recursos forem usados

**Consequências:**
- Positivas:
  - Setup local sem dependências externas
  - Produção com Postgres real e gerenciado

- Negativas:
  - Duas implementações de query para manter em alguns services (Prisma
    para Postgres, `better-sqlite3` para o fallback) — mitigado mantendo
    a lógica de negócio nos services e replicando apenas o acesso a dados

**Incidente relevante (14/07/2026):** o pool de conexões Postgres estava
configurado com `max: 1` (uma única conexão para todo o processo), o que
fazia a aplicação parecer "cair" com apenas 2 usuários simultâneos —
qualquer segunda requisição concorrente esperava a única conexão liberar
e podia expirar por timeout. Corrigido para `max: 10` (o Postgres do
Railway suporta até 100 conexões). Ver `CHANGELOG.md`.

**Incidente relevante (14/08/2026):** após importação de dados para Supabase,
as sequences de tabelas com `id` ficaram atrasadas, causando erros
`Unique constraint failed on id` em notifications, sessions e workspaces.
Mitigação permanente: `npm run db:reset-sequences` após importações manuais.

**Revisão:** Antes de qualquer nova migração de provedor, validar dump, restore,
sequences e smoke tests de autenticação/IA/Shot List no destino.

---

### ADR-003: React vs Next.js

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher framework frontend.

**Decisão:** React + Vite (sem Next.js)

**Rationale:**
- Vite:
  - Dev server extremamente rápido
  - Build otimizado por padrão
  - Menor configuração

- Next.js não escolhido porque:
  - SSR não necessário (app é SPA)
  - API routes não necessárias (tem Express backend)
  - Overhead de configuração
  - Vite mais simples para nosso caso

**Consequências:**
- Positivas:
  - DX (developer experience) excelente
  - HMR instantâneo
  - Build rápido

- Negativas:
  - Sem SEO otimizado (landing precisa ser SSR)
  - Sem image optimization automática
  - Sem ISR (incremental static regeneration)

**Mitigação:**
- Landing page pode ser migrada para Next.js se SEO crítico
- Usar CDN para assets estáticos

**Revisão:** Considerar Next.js se SEO se tornar crítico

---

### ADR-004: Express vs Fastify vs Koa

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher framework backend.

**Decisão:** Express

**Rationale:**
- Express:
  - Ecossistema maduro
  - Middleware abundante
  - Documentação extensa
  - Time já familiarizado

- Fastify/Koa não escolhidos porque:
  - Ecossistema menor
  - Curva de aprendizado
  - Express suficiente para nossas necessidades

**Consequências:**
- Positivas:
  - Middleware readily available
  - Comunidade grande
  - Facilidade de hiring

- Negativas:
  - Performance inferior a Fastify
  - TypeScript support não nativo (requer @types)
  - Callbacks (embora com async/await mitigado)

**Revisão:** Considerar Fastify se performance se tornar bottleneck

---

### ADR-005: Wouter vs React Router

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher biblioteca de roteamento.

**Decisão:** Wouter

**Rationale:**
- Wouter:
  - API mais simples
  - Menor bundle size (3KB vs 15KB)
  - Hooks-first design
  - Suporte a hash routing nativo

- React Router não escolhido porque:
  - Overkill para SPA simples
  - Bundle size maior
  - API mais complexa

**Consequências:**
- Positivas:
  - Bundle menor
  - API mais simples
  - Performance melhor

- Negativas:
  - Ecossistema menor
  - Menos recursos de data fetching
  - Comunidade menor

**Revisão:** Considerar React Router se features avançadas de roteamento necessárias

---

### ADR-006: Radix UI vs Headless UI vs Chakra UI

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher biblioteca de componentes UI.

**Decisão:** Radix UI + Tailwind CSS

**Rationale:**
- Radix UI:
  - Componentes headless (estilo customizável)
  - Acessibilidade nativa (WAI-ARIA)
  - Não styled (liberdade total)
  - Performance excelente

- Headless UI não escolhido:
  - Focado em Tailwind (mas Radix também funciona bem)
  - Ecossistema menor

- Chakra UI não escolhido:
  - Styled components (menos flexível)
  - Bundle size maior
  - Opiniated design system

**Consequências:**
- Positivas:
  - Acessibilidade garantida
  - Estilo 100% customizável
  - Performance excelente
  - Bundle size pequeno

- Negativas:
  - Mais código para estilizar
  - Sem design system pré-definido
  - Curva de aprendizado para composição

**Mitigação:**
- Criar design system interno
- Usar shadcn/ui (baseado em Radix) para componentes comuns

**Revisão:** N/A (decisão sólida)

---

### ADR-007: Anthropic vs NVIDIA vs OpenAI

**Status:** Aceito (com fallback)
**Data:** 2024
**Contexto:** Escolher provider de IA.

**Decisão:** NVIDIA como primary, Anthropic como fallback

**Rationale:**
- NVIDIA:
  - Custo menor (NVIDIA API mais barato)
  - Modelo minimax-m3 multimodal
  - Timeout configurável
  - Thinking mode disponível

- Anthropic:
  - Claude Sonnet 4 (modelo superior)
  - Context window maior
  - Melhor para reasoning complexo
  - Mais caro

- OpenAI não escolhido:
  - GPT-4 mais caro
  - Rate limits mais restritivos

**Consequências:**
- Positivas:
  - Custo menor com NVIDIA
  - Fallback para Anthropic se necessário
  - Flexibilidade de escolha

- Negativas:
  - Dois providers para manter
  - Qualidade de output pode variar
  - Complexidade de switching

**Mitigação:**
- Abstração em `aiService.ts` para switching fácil
- Feature flag para trocar provider sem deploy

**Revisão:** Reavaliar custos e qualidade mensalmente

---

### ADR-008: JWT vs Sessions vs Supabase Auth

**Status:** Superseded by ADR-011

> A escolha de autenticação (JWT em cookie httpOnly) segue valendo. O que foi
> superado é a seção **Mitigação** abaixo — Redis blacklist, access token de
> 15min e refresh token nunca foram implementados. Ver ADR-011 para a estratégia
> de revogação em vigor.

**Data:** 2024
**Contexto:** Escolher método de autenticação.

**Decisão:** JWT httpOnly cookies + Supabase Auth (híbrido)

**Rationale:**
- JWT:
  - Stateless (escala horizontal)
  - Compatível com SPA
  - httpOnly cookies seguros contra XSS

- Sessions não escolhidas:
  - Stateful (requer store)
  - Escala mais complexa

- Supabase Auth:
  - Já configurado
  - OAuth integrado
  - Row Level Security
  - Usado para auth futuro

**Consequências:**
- Positivas:
  - Escalabilidade
  - Segurança (httpOnly)
  - Integração com Supabase

- Negativas:
  - Revogação complexa (blacklist necessário)
  - Token size limit
  - Refresh token logic

**Mitigação:**
- Implementar token blacklist em Redis
- Short-lived access tokens (15min)
- Long-lived refresh tokens (7 dias)

**Revisão:** N/A (padrão da indústria)

---

### ADR-009: Stripe vs Paddle vs LemonSqueezy

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher processador de pagamentos.

**Decisão:** Stripe Checkout para planos self-service (Free/Pro/Studio);
contato consultivo via WhatsApp para os tiers White-Label/Enterprise
(venda negociada caso a caso, sem checkout automático).

**Rationale:**
- Stripe:
  - Ecossistema maduro, webhooks confiáveis, suporte global
  - Fluxo real: `startCheckout()` (`client/src/lib/api.ts`) →
    `POST /api/checkout/session` → Stripe Checkout hospedado →
    webhook confirma assinatura
- WhatsApp (só para White-Label/Enterprise):
  - Esses planos exigem negociação (preço, contrato, integração
    dedicada) — não fazem sentido como checkout self-service

**Consequências:**
- Positivas: cobertura automática para os planos de maior volume
  (Free/Pro/Studio), sem overhead de negociação manual nesses tiers
- Negativas: dependência de um único processador de pagamento

**Pendência conhecida (14/07/2026):** as chaves Stripe configuradas em
produção são de **modo teste** (`sk_test_`/`pk_test_`), não modo live —
ninguém consegue pagar de verdade ainda. Ver `.private/PROXIMOS_PASSOS.md`.

**Revisão:** N/A.

---

### ADR-010: Vercel vs Railway vs Self-hosted

**Status:** Aceito, revisado — produção atual em Vercel
**Data:** decisão original 2024, Railway em julho/2026, retorno a Vercel em 14/08/2026
**Contexto:** Escolher plataforma de hosting.

**Decisão:** Vercel para hosting da aplicação; Supabase Postgres como banco
gerenciado separado.

**Rationale:**
- Vercel está conectado ao repositório `cenastudio/Cenastudio` e publica a
  branch `main` automaticamente.
- Supabase pooler removeu o bloqueio anterior de conexão direta Postgres em
  ambiente serverless.
- O backend Express é empacotado como handler único em `api/index.js`, mantendo
  o monolito modular sem reescrever rotas para outro framework.

**Consequências:**
- Positivas:
  - Deploy simples via GitHub/Vercel
  - Banco gerenciado no Supabase, separado do ciclo de build do app
  - Domínio de produção e preview ficam no mesmo painel Vercel
- Negativas:
  - Exige pooler/connection string correta para evitar timeout em serverless
  - Jobs longos e schedulers continuam inadequados dentro do runtime Vercel

**Revisão:** Se houver necessidade de workers persistentes ou jobs agendados,
adicionar um serviço separado para jobs em vez de mover o app inteiro de volta.

---

### ADR-011: Invalidação de JWT via deny-list em `user_sessions`

**Status:** Aceito
**Data:** 2026-07 (decisão tomada no código; registrada retroativamente em 2026-07-26)
**Contexto:** JWT é stateless e não pode ser revogado sem estado externo. O
ADR-008 previa como mitigação um blacklist em Redis com access tokens de 15min —
não foi o caminho seguido. Este ADR substitui aquela mitigação.

**Decisão:** Deny-list em tabela Postgres `user_sessions`.

**Rationale:**
- Postgres já existe no stack; Redis adicionaria ~$10/mês sem outro uso
- `tokenHash` (SHA256 do JWT) evita guardar o token original no banco
- Revogação por `revokedAt` (soft revoke) em vez de delete: a linha precisa
  sobreviver para que o token continue reconhecido como morto
- `authenticate` chama `isTokenRevoked()` e rejeita apenas quando existe linha
  **com** `revokedAt` preenchido

**Consequências:**
- Positivas:
  - Revogação remota funciona (encerrar sessão → 401 no próximo request)
  - Custo zero de infraestrutura adicional
  - Índices em `userId` e `tokenHash` mantêm a consulta por request barata
- Negativas:
  - Token sem linha correspondente é **aceito**. Isso é deliberado: o
    `trackSession()` é fire-and-forget, e tratar "sem linha" como revogado
    quebraria o primeiro request logo após o login
  - Difere da proposta original (allow-list), que rejeitaria token desconhecido
  - Uma consulta ao banco por request autenticado

**Risco aceito:** se a tabela `user_sessions` for perdida/truncada, todos os
tokens ativos voltam a valer até expirar (até 7 dias) sem nenhuma forma de
revogação nesse intervalo. Revisar esta decisão se o produto passar a lidar com
dado sensível de cliente em maior volume, ou após o primeiro incidente de
segurança real.

**Revisão:** condicionada aos dois gatilhos acima.

---

### ADR-012: Dois domínios de autenticação (app e Portal do Cliente)

**Status:** Aceito
**Data:** 2026-07-26
**Contexto:** O Portal do Cliente expõe projetos a pessoas externas ao estúdio,
que não têm conta em `users`. Era preciso autenticá-las sem criá-las como
usuários do app nem lhes dar qualquer alcance sobre rotas internas. A spec
`.kiro/specs/portal-do-cliente-OK/` foi encerrada após a implementação e a
validação dos fluxos de acesso, por isso a decisão é `Aceito`.

**Decisão:** Um segundo domínio de autenticação, paralelo ao do app.

- Credencial própria em `client_portal_access`: `email` + `passwordHash`
  (bcrypt, cost 12), desacoplada da tabela `users`
- Sessão por JWT de 7 dias em cookie httpOnly `client_portal_token`
  (`sameSite: lax`, `secure` em produção), separado do `frame_token` do app
- O JWT do portal é assinado com o **mesmo segredo** do app
  (`getJwtSecret()`); o que distingue os dois é a claim `type: "client-portal"`,
  verificada em `authenticateClientPortal`
- Revogação sem tabela própria: o middleware rejeita o token quando
  `access.updatedAt > payload.iat * 1000`. Trocar a senha ou desativar o acesso
  invalida todos os tokens emitidos antes disso. O flag `active` é revalidado a
  cada request

**Rationale:**
- Cliente externo não deve existir em `users`: evita contaminar contagem de
  usuários, planos, entitlements e o próprio painel admin
- Cookie com nome distinto impede que o navegador envie a credencial do portal
  para rotas do app e vice-versa
- Revogação por timestamp dispensa uma segunda tabela de sessões e não tem o
  ponto cego do ADR-011

**Consequências:**
- Positivas:
  - **Revogação mais rigorosa que a do ADR-011.** Aqui o estado é revalidado a
    cada request (`active` + `updatedAt` vs `iat`), então desativar um acesso
    corta as sessões existentes imediatamente. No ADR-011, token sem linha
    correspondente é aceito. Se a estratégia do app for revista, este é o
    desenho a seguir
  - Superfície pequena: um middleware, um service, uma tabela
  - Sem custo de infraestrutura adicional
- Negativas:
  - Dois caminhos de autenticação para manter em sincronia
  - Segredo compartilhado acopla os dois domínios: rotacionar o segredo do app
    invalida todas as sessões de portal ao mesmo tempo
  - `bcrypt.hashSync` (cost 12) é síncrono e bloqueia o event loop no login e na
    criação de acesso; aceitável no volume atual, revisar se o portal virar rota
    de tráfego alto

**Risco mitigado em 2026-08-31:** token confusion se algum código futuro esquecer
de checar a claim `type`. O `authenticate` do app agora rejeita explicitamente
qualquer payload com `type` diferente de `"app"`, e o token emitido pelo app
carrega `type: "app"`. Tokens antigos sem `type` continuam aceitos até expirar,
para não derrubar sessões legítimas durante o deploy. Regressão coberta em
`server/controllers/coreFlow.test.ts`: um token `client-portal` enviado como
`frame_token` recebe 401.

**Revisão:** revisar se o portal passar a receber tráfego relevante (ver nota
sobre `hashSync`) ou se os domínios de autenticação deixarem de compartilhar
`JWT_SECRET`.

---

### ADR-013: Ponte Orçamento IA → módulo de Orçamento via bloco JSON delimitado

**Status:** Aceito
**Data:** 2026-07-26
**Contexto:** A ferramenta 04 (Orçamento) gera um documento em texto e não
alimenta o módulo estruturado de Orçamento — o usuário redigita tudo em
`Budget.tsx`. A spec `.kiro/specs/qualidade-raciocinio-ia/` (A4) apresentava duas
opções: (1) parsear o texto gerado, (2) pedir ao modelo um bloco JSON junto do
texto. Três achados no código decidem a questão:

1. **O texto gerado não é markdown estruturado e não é estável.** `generateForTool`
   (`server/services/aiService.ts`) anexa ao system prompt uma regra obrigatória
   que **proíbe** markdown (`**`, `#`, `-`, ` ``` `). O que chega ao cliente é
   prosa em caixa-alta com bullets `•`, e `cleanGeneratedText`
   (`client/src/lib/documentFormatter.ts`) ainda reescreve `|` de tabela para
   ` · ` e remove cercas de código. Parsear isso é parsear um formato que o
   próprio sistema instrui o modelo a não garantir.
2. **Depois da A1, cada rubrica é uma faixa, não um número.** O `promptRole` da 04
   exige "FAIXA, NUNCA NÚMERO ÚNICO" (`R$ 8.450 – R$ 15.400`). Uma linha de
   orçamento passa a ter dois números, e `BudgetEntry.amount` / `budgeted` é um
   `Int` único. Qual dos dois vale não é dedutível do texto — precisa ser
   declarado.
3. **Estimativa não é gasto realizado.** `BudgetEntry` é o razão de despesa real
   (`entryDate`, `receiptUrl`), e `dreService.ts` calcula
   `directCosts = budgetService.getOverview().totalSpent`, que é a soma de
   `BudgetEntry`. Escrever a estimativa da IA como `BudgetEntry` injetaria custo
   fictício no DRE e, como `getOverview` marca `over` para categoria com gasto e
   sem orçamento, faria o projeto nascer "Estourado".

**Decisão:** Opção 2 (JSON estruturado), com três ajustes que o código impõe.

- **Delimitador não é cerca de código.** O bloco vai no fim da resposta entre
  duas linhas sentinela em texto puro, porque ` ``` ` é proibido pelas regras de
  formatação globais:

  ```
  <<<CENA_BUDGET_JSON
  { ...json... }
  CENA_BUDGET_JSON>>>
  ```

- **Destino é o baseline do `Budget`, não `BudgetEntry`.** A ponte chama
  `updateBudgetBaseline` (`PUT /api/budgets/:projectId`), populando
  `Budget.totalAmount`, `Budget.currency` e `Budget.categories`
  (`[{ name, budgeted }]`). `addEntry` nunca é usado pela ponte. **Isto supera a
  redação de `requirements.md` A4 e de `design.md` A4**, que falavam em popular
  `BudgetEntry`.
- **Sem fallback de parsing de prosa.** Se o bloco não existe ou não valida, a
  ponte não tenta ler o texto — ela se desabilita e manda o usuário para o
  preenchimento manual. Meia-extração errada é pior que nenhuma num módulo
  financeiro.

**Contrato JSON (`cena.budget.v1`)** — o que a A4.2 faz o modelo emitir e a
A4.4/A4.5 consomem:

```json
{
  "schema": "cena.budget.v1",
  "currency": "BRL",
  "categories": [
    { "key": "preproducao",    "label": "Pré-produção",  "min": 1200, "max": 2000 },
    { "key": "equipe",         "label": "Equipe",        "min": 3300, "max": 5500 },
    { "key": "equipamento",    "label": "Equipamento",   "min": 1200, "max": 2400 },
    { "key": "locacao",        "label": "Locação",       "min":  600, "max": 1200 },
    { "key": "alimentacao",    "label": "Alimentação",   "min":  150, "max":  300 },
    { "key": "transporte",     "label": "Transporte",    "min":  200, "max":  400 },
    { "key": "posproducao",    "label": "Pós-produção",  "min": 1800, "max": 3600 },
    { "key": "administrativo", "label": "Administrativo","min": 1352, "max": 2464 }
  ],
  "margin": { "min": 1690, "max": 3080 },
  "assumptions": "1 diária de 10h em BH, equipe de 3, pós por entrega"
}
```

Regras do contrato:

- `key` vem de um conjunto fechado: `preproducao`, `equipe`, `equipamento`,
  `locacao`, `arte`, `alimentacao`, `transporte`, `posproducao`,
  `administrativo`, `outros`. Chave desconhecida é remapeada para `outros`, não
  rejeitada. `label` é o texto que vai para `Budget.categories[].name` — fica no
  idioma da geração (`locale`), enquanto `key` é o identificador estável usado na
  validação.
- **Unidade: reais, número JSON** (`1200`, `1200.5`), sem `"R$"`, sem separador
  de milhar, sem string. A conversão para os centavos do banco é do consumidor:
  `Math.round(valor * 100)`. Pedir centavos ao modelo trocaria um erro de
  formatação por um erro de aritmética.
- `min ≤ max`, ambos finitos e `≥ 0`. Máximo de 12 categorias e 4 KB de bloco.
  Categorias repetidas são somadas pelo consumidor. Resolvido na A4.4, onde o
  limite não dizia o comportamento: **excesso de rubricas** mantém as 12
  primeiras válidas e lista as demais como descartadas (não invalida o bloco);
  **bloco acima de 4 KB** é inválido sem tentativa de `JSON.parse`; na **soma de
  chaves repetidas** o `label` da linha resultante é o da primeira ocorrência.
- **Faixa → valor único:** o diálogo de confirmação (A4.3) oferece *piso* e
  *teto*, com **teto pré-selecionado**, e o valor escolhido vira `budgeted`.
  Teto por padrão porque `budgeted` é o limite autorizado: usar o piso marcaria
  "Estourado" (`pct ≥ 1` em `getOverview`) em projetos que estão dentro da
  estimativa, e alerta que sempre dispara deixa de ser alerta.
- **`total` do modelo é ignorado.** `totalAmount` é recalculado como Σ
  `budgeted`, igual ao que `Budget.tsx` já faz ao salvar o baseline pela tela.
- **`margin` nunca entra no baseline.** Margem da produtora é receita, não custo;
  incluí-la infla o teto e esconde estouro. Vai só para exibição no diálogo.
  `administrativo` carrega apenas impostos e reserva de imprevistos.
- **Nada é gravado sem confirmação humana.** A ponte sempre abre o diálogo com o
  que extraiu antes de chamar a API.
- `updateBudgetBaseline` **substitui** as categorias existentes. Quando já houver
  baseline, o diálogo avisa e exige confirmação explícita. Sem merge na v1.

**Bloco ausente ou inválido:**

- `output` sem sentinela, `JSON.parse` falhando, `schema` diferente de
  `cena.budget.v1`, ou zero categorias válidas → botão inerte com a explicação
  "este orçamento foi gerado sem os dados estruturados" e link para a tela de
  Orçamento do projeto. Gerações anteriores à A4.2 caem aqui por definição —
  é o comportamento esperado, não erro.
- Validade parcial: categorias válidas são mantidas, as inválidas são descartadas
  e listadas no diálogo. Se sobrar zero, trata-se como inválido.

**Consequências:**

- Positivas:
  - A extração passa a depender de um contrato versionado (`schema`), não do
    humor do modelo na formatação.
  - Funciona a partir do histórico: o bloco é persistido em `generations.output`,
    então a ponte roda em geração antiga sem regerar.
  - `BudgetEntry` continua significando exclusivamente gasto real — DRE e alertas
    seguem confiáveis.
- Negativas:
  - O bloco é lixo visual e precisa ser removido antes de exibir, copiar e
    exportar e antes de o output ser reinjetado como contexto de prompt. A A4.4
    centralizou isso em `stripBudgetBlock` (`shared/budgetBlock.ts`), aplicado em
    `cleanGeneratedText` (cobre exibição, cópia, PDF e DOCX), no
    `buildProjectContext` do servidor, no contexto do Assistente, no prompt de
    refino e no preview do histórico. `BudgetBridgeAction` é o único consumidor
    que recebe o output cru — é ele que precisa do bloco.
  - Modelo free pode emitir JSON malformado; nesse caso a ponte simplesmente não
    aparece, e a A4.6 precisa medir com que frequência isso acontece.
  - Custo de tokens por geração um pouco maior.
  - A escolha piso/teto é do usuário, o que adiciona um passo à UI.

**Revisão:** se a taxa de bloco inválido medida na A4.6 for alta, a saída para
gerar o JSON numa segunda chamada dedicada (prompt curto, só JSON) já está
compatível com este contrato — o `schema` continua o mesmo. Rever também ao
introduzir tabela de preços própria do sistema (alternativa registrada em
`design.md` A1).

---

### ADR-014: Roteamento de modelo e amostragem por criticidade da ferramenta

**Status:** Aceito; escolha da faixa alta respaldada pelo eval da Fase D do spec
`qualidade-raciocinio-ia` em 2026-08-14.
**Data:** 2026-07-27
**Contexto:** `resolveToolModel` agrupava as 12 ferramentas de IA por tema:
`CALCULATION_TOOLS` (04 Orçamento, 05 Proposta, 06 Contrato) e `MARKETING_TOOLS`
(07 Briefing, 08 Moodboard, 11 Entrega). Tema é a variável errada. O que importa
para escolher modelo e temperatura é **quanto custa estar errado**:

- Proposta (05) ficava junto de Orçamento por "ter número", mas erro nela é uma
  renegociação; erro no orçamento é prejuízo.
- Callsheet (03) e Checklist de Set (09) não tinham roteamento nenhum — caíam no
  modelo padrão. São justamente os dois documentos que erram em cima de gente
  parada no set.
- Todas as 12 usavam a mesma temperatura global (`OPENROUTER_TEMPERATURE=0.7`).
  0.7 é alto para cláusula de contrato e baixo para moodboard.

**Decisão:** classificar por criticidade de erro e derivar duas coisas dessa
classificação — modelo e amostragem.

| Faixa | Ferramentas | Critério |
|---|---|---|
| `high` | 03 Callsheet, 04 Orçamento, 06 Contrato, 09 Checklist | erro custa dinheiro, prazo ou exposição jurídica |
| `medium` | 01 Roteiro, 02 Decupagem, 05 Proposta, 10 Cronograma, 11 Entrega | erro custa retrabalho |
| `creative` | 07 Briefing, 08 Moodboard, 12 Assistente | erro é questão de gosto |

Ferramenta não classificada cai em `medium`, não em `creative` — fail-safe para
não mandar ferramenta nova para a temperatura mais alta por omissão.

Perfis de amostragem (`TEMPERATURE_PROFILES`): `precision` 0.2 / `standard` 0.6 /
`creative` 0.8, `top_p` 0.95 nos três. O mapa de perfil **não** é espelho da
criticidade: Roteiro (01) é `medium` mas usa `creative`, porque errar num roteiro
é barato e variação ali é o que se quer. É a única exceção, e é deliberada.

Precedência: o perfil da ferramenta vence `OPENROUTER_TEMPERATURE` /
`NVIDIA_TEMPERATURE`. O específico ganha do global; as variáveis continuam
valendo para chamadas que não vêm de uma ferramenta (`server/services/ai/aiHelper.ts`).

**Escolha da faixa `high`:** `TIER_MODEL.high` usa
`nvidia/nemotron-3-super-120b-a12b:free`. O eval comparativo de 2026-08-14 mediu
os 4 tools de alta criticidade (03 Callsheet, 04 Orçamento, 06 Contrato,
09 Checklist), 16 casos e 87 critérios automáticos/manuais no runner
`npm run eval:ai`.

Resultados principais:

- `poolside/laguna-m.1:free` (modelo provisório anterior): 16/16 chamadas com
  `HTTP 404: No endpoints found`; não é mais operacional.
- `nvidia/nemotron-3-ultra-550b-a55b:free`: 47/61 critérios automáticos (77,0%),
  com 4 respostas vazias em 16 casos.
- `google/gemma-4-31b-it:free`: 16/16 chamadas com `HTTP 429`; não mediu nada.
- `nvidia/nemotron-3-super-120b-a12b:free`: 63/76 critérios automáticos (82,9%),
  com 1 resposta vazia em 16 casos. Foi melhor em disponibilidade e placar geral.

O resultado não encerra a qualidade das ferramentas. Orçamento e Checklist ainda
mostraram falhas de aderência (disclaimer, markdown, caixas verificáveis e
briefing mínimo), mas trocar o modelo provisório morto por Nemotron Super remove
uma falha objetiva de produção e melhora o baseline da faixa alta.

**Consequências:**
- Positivas:
  - Callsheet e Checklist passam a ser roteadas com a mesma prioridade de
    Orçamento e Contrato, o que antes não acontecia.
  - Contrato e orçamento ficam mais repetíveis (0.2), moodboard e briefing mais
    variados (0.8), sem trocar de modelo.
  - Faixa e perfil são função pura testável (`aiServiceRouting.test.ts`, 12
    testes), e "ferramenta nova sem classificação" deixa de ser falha silenciosa.
- Negativas:
  - A faixa `high` segue em modelo gratuito, portanto sujeita a rate limit,
    degradação e retirada do catálogo sem aviso. O eval escolhe o melhor candidato
    operacional do momento, não uma garantia de SLA.
  - Quem tinha ajustado `OPENROUTER_TEMPERATURE` no ambiente perde efeito nas 8
    ferramentas mapeadas.
  - O catálogo `:free` do OpenRouter muda sem aviso, então tanto `TIER_MODEL`
    quanto a cadeia de fallback são referências que envelhecem. Reconferir a cada
    mexida em roteamento.

**Revisão:** ao fechar o primeiro cliente pagante, revisar a faixa `high` para
modelo pago (gatilho em `docs/STATUS.md`, Seção 3). Antes disso, as próximas
melhorias de IA devem atacar as falhas observadas no eval: robustez do bloco
`cena.budget.v1` em briefings mínimos e aderência de Checklist a itens
verificáveis sem markdown.

---

### ADR-015: Orçamento interno e proposta comercial vinculados por snapshot

**Status:** Aceito
**Data:** 2026-08-22
**Contexto:** `Budget` é o plano de custo 1:1 de um `Project`, enquanto
`Proposal` é o documento comercial associado somente a um `Client`. Sem vínculo
entre eles, gerar uma proposta a partir de um orçamento exige cópia manual e não
preserva qual cenário foi efetivamente enviado. Fundir as entidades confundiria
custo previsto, gasto realizado e preço ofertado ao cliente.

**Decisão:** As entidades permanecem separadas. A proposta recebe campos
opcionais `projectId`, `sourceBudgetId`, `sourceGenerationId` e
`commercialSnapshot`.

- `projectId` fornece contexto operacional, mas não torna o projeto dono do
  documento comercial.
- `sourceBudgetId` e `sourceGenerationId` são proveniência, não fonte mutável de
  verdade. Seus relacionamentos usam `ON DELETE SET NULL`.
- `commercialSnapshot` é o payload estruturado, versionado e imutável que gerou
  o HTML e os totais da proposta. Histórico anterior fica com snapshot nulo.
- Apenas rascunhos podem ser atualizados. Ao enviar, visualizar ou aceitar, a
  proposta vira uma versão imutável; uma alteração posterior cria um novo
  rascunho/revisão, nunca altera o documento original.
- O fluxo existente de criação direta continua criando `sent`, preservando links
  públicos e integrações. O novo fluxo IA/orçamento cria explicitamente
  `draft` antes de qualquer envio.

**Consequências:**

- Positivas: preço enviado pode ser auditado mesmo após mudança no orçamento;
  Comercial e Produção ganham uma ligação rastreável; dados existentes seguem
  legíveis sem backfill inventado.
- Negativas: aparecem estados e versões adicionais na UI; é necessário manter
  as migrations Postgres e o fallback SQLite em paridade.

**Revisão:** antes de gerar recebíveis automáticos a partir de proposta aceita,
definir no módulo Financeiro o evento comercial, impostos e política de
cancelamento. Aceite de proposta por si só não cria lançamento financeiro.

---

### ADR-016: Descoberta operacional como camada transversal

**Status:** Aceito
**Data:** 2026-08-23
**Contexto:** A landing explicava a promessa do Cena melhor que o app. Dentro do
produto, módulos como Comercial, Produção, Documentos e Portal existiam, mas a
jornada ficava escondida em abas, atalhos, comando global ou memória do usuário.
Isso deixava telas funcionais com sensação de blocos isolados.

**Decisão:** A navegação e as telas operacionais devem expor a jornada
`Comercial -> Projeto -> Produção -> Aprovação -> Entrega -> Financeiro`.
Essa camada é transversal e composta por três peças reutilizáveis:

- mapa operacional visível;
- próximas ações contextuais antes de listas secundárias;
- catálogo de módulos agrupado pelo momento do trabalho.

Dashboard, Project Hub, Comercial, Cliente, Documentos e Portal passam a usar
essa lógica antes de painéis densos. A navegação principal deixa de ser só
quatro áreas amplas e mostra também Projeto, Aprovação e Entrega.

**Consequências:**

- Positivas: o app conta a mesma promessa da landing dentro do fluxo real;
  usuários descobrem módulos sem depender de "Mais" ou busca; mobile ganha
  etapas claras antes de blocos longos.
- Negativas: mais itens no topo exigem disciplina de hierarquia visual e testes
  de overflow a cada mudança de navegação.

**Revisão:** reavaliar depois da próxima auditoria de uso real se o catálogo
deve virar uma superfície persistente global ou continuar contextual por tela.

---

### ADR-017: Asset Library como view operacional sobre Arquivos

**Status:** Aceito
**Data:** 2026-08-31
**Contexto:** O produto tem telas chamadas "Arquivos" e "Assets", mas o código
real não tem model `Asset`, migration própria nem storage separado. `Assets.tsx`
consome os mesmos dados de arquivos (`/files/all`, `/files/:id/download`) e
funciona como recorte de biblioteca para produção. Documentos históricos
afirmavam que havia um módulo de Asset Library completo, o que não corresponde
ao repositório.

**Decisão:** manter Asset Library como view operacional sobre `files`.

- `files` continua sendo a entidade canônica para uploads, download, storage,
  visibilidade no Portal e vínculo com projeto.
- `Assets.tsx` pode oferecer filtros, linguagem de biblioteca e organização por
  uso audiovisual, mas não cria uma segunda entidade.
- Não criar model `Asset` até existir uma necessidade real que `files` não cubra:
  versionamento independente, licenciamento, reutilização entre projetos sem
  duplicar arquivo, ou taxonomia persistida de mídia.

**Consequências:**
- Positivas:
  - evita duplicar storage/permissões;
  - reduz risco de arquivo aparecer em uma superfície e não em outra;
  - encerra a ambiguidade criada pelos relatórios antigos.
- Negativas:
  - o nome "Assets" pode sugerir um módulo mais rico do que existe;
  - filtros avançados de biblioteca continuam limitados pelo schema de `files`.

**Revisão:** reabrir apenas se uma tarefa de produto exigir asset reutilizável
entre projetos ou governança de direitos/licenças separada do arquivo.

---

### ADR-018: `sessionService` mantém acesso dual Prisma/SQLite

**Status:** Aceito
**Data:** 2026-08-31
**Contexto:** `sessionService.ts` implementa tracking, listagem, revogação e poda
de sessões tanto via Prisma/Postgres quanto via SQL direto no SQLite local. Isso
parece duplicação, mas segue a decisão do ADR-002: Postgres é o runtime principal
e SQLite permanece como fallback local quando nenhuma URL de Postgres está
configurada.

**Decisão:** manter os dois caminhos no `sessionService` enquanto o fallback
SQLite existir.

- Produção usa Prisma/Postgres (`shouldUsePrisma === true`).
- Testes e desenvolvimento sem banco externo usam SQLite com `DATABASE_PATH`.
- A regra de negócio fica compartilhada no service; a duplicação aceitável é só
  de acesso a dados.
- Mudança futura para remover SQLite deve ser feita no ADR-002 antes de apagar
  os branches SQL do service.

**Consequências:**
- Positivas:
  - testes de auth/sessão continuam sem depender de Supabase;
  - onboarding local segue simples;
  - revogação de sessão continua coberta nos dois runtimes.
- Negativas:
  - cada alteração em sessão precisa manter paridade Postgres/SQLite;
  - há custo de manutenção e risco de divergência.

**Revisão:** quando o projeto decidir abandonar SQLite local, remover os branches
SQL crus em uma única frente com testes de auth, sessões e portal.

---

## 🎨 Padrões de Design

### Controller Pattern

Controllers handle HTTP requests/responses only:

```typescript
// ✅ Bom
export async function createUser(req: Request, res: Response) {
  const data = await userService.create(req.body)
  res.json({ success: true, data })
}

// ❌ Ruim
export async function createUser(req: Request, res: Response) {
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const user = db.prepare('INSERT INTO users...').run(...)
  res.json(user)
}
```

### Service Pattern

Services contain business logic:

```typescript
// ✅ Bom
export async function create(data: CreateUserDto): Promise<User> {
  const existing = await findByEmail(data.email)
  if (existing) throw new ConflictError('Email already exists')

  const hashedPassword = await hashPassword(data.password)
  return prisma.user.create({ data: { ...data, passwordHash: hashedPassword } })
}

// ❌ Ruim
export async function create(data: any) {
  return db.prepare('INSERT INTO users...').run(data)
}
```

### Repository Pattern (Futuro)

After Prisma migration:

```typescript
export class UserRepository {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: CreateUserDto): Promise<User> {
    return prisma.user.create({ data })
  }
}
```

### Context Pattern (React)

Global state with React Context:

```typescript
// ✅ Bom
const AuthContext = createContext<AuthContextType>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // ...
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Custom Hook Pattern

Reusable logic:

```typescript
// ✅ Bom
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

---

## ⚖️ Trade-offs Considerados

### Performance vs Developer Experience

**Decisão:** Priorizar DX com performance aceitável

**Rationale:**
- Time pequeno
- Velocidade de desenvolvimento crítica
- Performance pode ser otimizada depois

**Trade-offs:**
- SQLite em dev (rápido setup) vs Postgres em prod (melhor performance)
- React vs Svelte (React mais popular, Svelte mais rápido)
- Express vs Fastify (Express mais familiar, Fastify mais rápido)

### Simplicidade vs Flexibilidade

**Decisão:** Priorizar simplicidade com extensibilidade

**Rationale:**
- Evitar over-engineering
- YAGNI (You Aren't Gonna Need It)
- KISS (Keep It Simple, Stupid)

**Trade-offs:**
- Monolito vs Microservices (monolito mais simples)
- Wouter vs React Router (Wouter mais simples)
- Radix UI vs Chakra UI (Radix mais flexível)

### Cost vs Features

**Decisão:** Balancear custo com features necessárias

**Rationale:**
- Bootstrapped company
- Otimizar para custo-benefício

**Trade-offs:**
- NVIDIA vs Anthropic (NVIDIA mais barato)
- Vercel free tier vs paid (free tier suficiente inicialmente)
- Supabase free vs paid (free tier suficiente inicialmente)

---

## 🔄 Evolução da Arquitetura

### Fase Atual

- Monolito modular
- PostgreSQL (Supabase) via Prisma em produção; SQLite como fallback local
- React + Vite
- Express backend
- JWT httpOnly cookie auth
- CI (GitHub Actions: typecheck + build)
- Painel admin com audit log de ações administrativas

### Próxima Fase

- Stripe em modo live (bloqueador para vendas reais)
- Rotação de credenciais expostas no histórico do git (ver `SECURITY.md`)
- Redis cache (se necessário)
- Monitoring externo (Sentry ou similar)

### Futura (Scale-up)

- Microservices (se necessário)
- Message queue (RabbitMQ/Redis)
- CDN para assets
- Load balancing
- Database sharding

---

## 📚 Referências

- [The Twelve-Factor App](https://12factor.net/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [Architecture Decision Records](https://adr.github.io/)

---

**Última atualização:** 23 de agosto de 2026
