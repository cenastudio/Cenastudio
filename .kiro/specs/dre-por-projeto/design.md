# Design — DRE por Projeto

## Overview

Este spec adiciona um relatório de resultado (DRE) por projeto individual,
seguindo 100% os padrões já estabelecidos pelo spec anterior
`landing-features-implementation` (Budget Tracking é o par mais próximo:
mesmo dono de dados — projeto —, mesmo nível de plano, mesmo estilo de
overview agregado).

**Pré-requisito estrutural (Requisito 1):** `FinancialEntry` ganha um campo
opcional `projectId`. Sem isso o sistema não tem como somar receita real por
projeto — hoje receita só se vincula a `Client`/`Opportunity`.

**Escopo:**
1. Migração aditiva: `FinancialEntry.projectId` (Prisma + SQLite dual-path) — P0
2. `dreService`: cálculo do relatório (receita → deduções → custos diretos → despesas alocadas → resultado) — P0
3. Seletor de projeto nos formulários de lançamento financeiro existentes (`Analytics.tsx`, `ClientDetail.tsx`) — P0
4. Configuração de deduções e despesas alocadas por projeto (`Dre` model, 1:1 com Project) — P1/P2
5. Página `Dre.tsx` (`/project/:projectId/dre`) + tab em `ProjectNav` + export PDF — P1
6. Feature flag `projectDre` (gating Studio+, espelhando `budgetTracking`) — P1

**Princípios herdados (inegociáveis):**
- Backend dual Prisma(Postgres)/SQLite via `shouldUsePrisma`.
- Migration SQL aditiva + `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE ADD COLUMN` em `db.ts`.
- Serialização via `withSnakeCase()`.
- Design system `frame-*`, accent `#E85002`, empty-state quadrado laranja + fluxo `01/02/03` (padrão de `Budget.tsx`).
- Navegação: tab em `ProjectNav` + rota em `App.tsx` + bloco em `api.ts`.
- Valores monetários em inteiro de centavos (padrão já usado em `FinancialEntry.amount`, `BudgetEntry.amount`).

## Architecture

### Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                          │
│  ProjectNav: + aba "DRE" (ícone FileBarChart), gated               │
│              canAccessFeature("project-dre")                       │
│  Analytics.tsx / ClientDetail.tsx: seletor opcional de projeto     │
│              no form de FinancialEntry (create/edit)               │
│  Dre.tsx (/project/:projectId/dre): relatório + config + export PDF│
│              │ fetch (api.dre)                                    │
└──────────────┼────────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND                                                           │
│   /api/dre/:projectId          dreController → dreService          │
│   /api/analytics/finance/*     ganha projectId opcional no body    │
│   Guard: authenticate → requireStudioPlan("projectDre")            │
└──────────────┼────────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  DB — Prisma (Postgres) + fallback SQLite                          │
│   financial_entries.project_id (NOVA coluna, nullable)             │
│   dre_settings (NOVA tabela, 1:1 com projects)                     │
│     — deduções e despesas alocadas configuradas pelo usuário       │
└─────────────────────────────────────────────────────────────────┘
```

### Por que uma tabela nova (`dre_settings`) em vez de reaproveitar `Budget`

`Budget.categories` (JSON) já guarda o orçamento por categoria — isso continua
sendo a fonte de "custos diretos" (Requisito 2, lido via `budgetService.getOverview`,
sem duplicar dados). Mas deduções (Requisito 3) e despesas alocadas (Requisito 4)
são configurações **novas**, específicas do DRE, que não existem em nenhum
model hoje. Colocar isso dentro de `Budget` misturaria dois conceitos (orçamento
operacional vs. configuração de relatório contábil) e forçaria mudar o schema
de uma feature já em produção. Uma tabela `DreSettings` nova, 1:1 com `Project`
(mesmo padrão de `Budget`), mantém as duas features independentes.

### Cálculo do DRE (fonte de cada linha)

| Linha | Fonte |
|---|---|
| Receita bruta | `SUM(FinancialEntry.amount)` WHERE `kind='income'`, `status='settled'`, `projectId = X` |
| Deduções | `DreSettings.deductions` (JSON `[{name, type: 'percent'|'fixed', value}]`) aplicado sobre a receita bruta |
| Receita líquida | Receita bruta − Deduções |
| Custos diretos | `SUM(BudgetEntry.amount)` do `Budget` do projeto (reuso de `budgetService`, sem duplicar) |
| Resultado bruto | Receita líquida − Custos diretos |
| Despesas alocadas | `DreSettings.allocatedExpense` (`{ mode: 'fixed'|'percent', value }`), 0 se não configurado |
| Resultado líquido | Resultado bruto − Despesas alocadas |

Todo o cálculo é feito em memória no `dreService`, sem view SQL nova — os dados
já existem em `financial_entries` e `budget_entries`; o serviço apenas agrega.

### Plan gating

Segue exatamente o padrão de `budgetTracking`:
- `shared/planEntitlements.ts`: novo `FeatureFlagId = "projectDre"`, adicionado
  a `PlanEntitlement` e a cada `PLAN_ENTITLEMENTS[plan]`, com o mesmo valor de
  `budgetTracking` por plano (`false` em free/pro, `true` em studio/whitelabel/enterprise)
  — decide o Requisito 6.2 do requirements.md.
- `client/src/lib/feature-gating/gate.ts`: `"project-dre": "studio"` em `FEATURE_REQUIREMENTS`.
- `client/src/types/plan.ts`: adicionar `"project-dre"` à união `FeatureName`.
- `server/routes/dre.ts`: `router.use(authenticate, requireStudioPlan("projectDre"))`.
- `FeatureUpgradeRequired.tsx`: nova entrada `"project-dre"` (copy própria, "DRE por Projeto").

## Components and Interfaces

### Backend — schema (Prisma)

```prisma
model FinancialEntry {
  // ...campos existentes...
  projectId BigInt? @map("project_id")
  project   Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([projectId], map: "idx_financial_entries_project_id")
}

model Project {
  // ...relations existentes...
  financialEntries FinancialEntry[]
  dreSettings      DreSettings?
}

model DreSettings {
  id                 BigInt   @id @default(autoincrement())
  userId             BigInt   @map("user_id")
  projectId          BigInt   @unique @map("project_id")
  deductions         Json     @default("[]") // [{ name, type: "percent"|"fixed", value }]
  allocatedExpenseMode  String? @map("allocated_expense_mode") // "fixed" | "percent" | null
  allocatedExpenseValue Int?    @map("allocated_expense_value") // cents ou pontos-base (%), conforme mode
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_dre_settings_user_id")
  @@map("dre_settings")
}
```

Migration Prisma: `npx prisma migrate dev --name add_project_dre` — puramente
aditiva (nova coluna nullable + nova tabela). Não altera nem remove nada
existente (Requisito 7.2).

### Backend — SQLite dual-path (`server/models/db.ts`)

```sql
-- financial_entries: nova coluna aditiva (idempotente)
ALTER TABLE financial_entries ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
-- (encapsulado em helper tipo ensureFinancialEntryColumns(), seguindo o padrão
--  de ensureProjectColumns/ensureClientColumns já existentes — usa PRAGMA
--  table_info para checar se a coluna já existe antes de ALTER, pois SQLite
--  não suporta "ADD COLUMN IF NOT EXISTS")

CREATE TABLE IF NOT EXISTS dre_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  deductions TEXT NOT NULL DEFAULT '[]',
  allocated_expense_mode TEXT,
  allocated_expense_value INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Backend — rotas (`routes/dre.ts`, guard `requireStudioPlan("projectDre")`)

```
GET  /api/dre/:projectId              getReport      → DreReport completo
PUT  /api/dre/:projectId/settings     updateSettings → deductions + allocatedExpense
```

`dreService`:
- `getOrCreateSettings(userId, projectId)` — espelha `getOrCreateBudget`.
- `updateSettings(userId, projectId, { deductions, allocatedExpense })` — validação: `type` ∈ `percent|fixed`, `value >= 0`; se `percent`, `value` é pontos-base (0–10000 = 0%–100%) para evitar float.
- `getReport(userId, projectId)` → `DreReport`:
  ```ts
  interface DreReport {
    projectId: number;
    currency: string;
    grossRevenue: number;
    deductions: Array<{ name: string; type: "percent" | "fixed"; value: number; amount: number }>;
    totalDeductions: number;
    netRevenue: number;
    directCosts: number;         // reuso de budgetService.getOverview().totalSpent
    grossResult: number;
    allocatedExpense: number;
    netResult: number;
    hasRevenueData: boolean;     // false se nenhum FinancialEntry vinculado (Requisito 2.2)
    hasBudgetData: boolean;      // false se Budget do projeto está vazio (Requisito 2.3)
  }
  ```
- Reaproveita `budgetService.getOverview()` internamente para `directCosts` —
  nenhuma duplicação de lógica de agregação de orçamento.
- Ownership check via `assertProjectOwnership` (mesmo helper de `budgetService`,
  extraído para `server/services/projectAccess.ts` se ainda não compartilhado,
  ou duplicado no mesmo padrão local se a extração for maior escopo do que o
  necessário aqui — decisão de implementação, não bloqueante).

### Backend — extensão dos endpoints de FinancialEntry existentes

`analyticsController.createFinancialEntry`/`updateFinancialEntry` (rotas já
existentes `POST/PATCH /api/analytics/finance/entries`) ganham `projectId?`
opcional no body, validado (se presente, projeto deve pertencer ao usuário —
mesmo padrão de validação de `clientId` já existente ali). Nenhuma rota nova
aqui — apenas o campo extra propagado ao Prisma/SQLite.

### Frontend — páginas e navegação

| Página | Rota | Nav | Ícone | Empty-state |
|---|---|---|---|---|
| `Dre.tsx` | `/project/:projectId/dre` | ProjectNav | `FileBarChart` | "Vincule receitas e defina orçamento" → 01/02/03 |

- `ProjectNav.tsx`: novo bloco `canAccessDre = canAccessFeature("project-dre", planMode).hasAccess`,
  botão condicional ao lado de "Orçamento" (mesmo padrão de `isBudgetActive`).
- `App.tsx`: `<Route path="/project/:projectId/dre" component={Dre} />`.
- `client/src/lib/api.ts`: bloco `api.dre = { getReport, updateSettings }`.
- `Analytics.tsx` / `ClientDetail.tsx`: no dialog de criar/editar `FinancialEntry`,
  novo `<select>` opcional "Vincular a projeto" — lista projetos do `clientId`
  selecionado (se houver) via `api.projects.listByClient` (novo, ou filtro
  client-side se a lista de projetos já é carregada na página) ou todos os
  projetos do usuário como fallback.
- Export PDF: replica `printHtmlDocument` localmente em `Dre.tsx` (função não
  exportável, confirmado no levantamento do spec anterior — não existe módulo
  compartilhado real, apesar do nome sugerir isso em `Documents.tsx`/`Proposals.tsx`).
- Cálculo de deduções/despesas alocadas no formulário de configuração usa o
  mesmo padrão de `CategoryDraft`/linhas editáveis de `Budget.tsx`.
- Estado vazio (nenhuma receita nem orçamento): reusa o bloco visual 01/02/03
  de `Budget.tsx`, adaptado para "Vincule receita → Defina orçamento → Veja o resultado".

## Data Models

```ts
// client/src/lib/api.ts — novos tipos
export interface DreDeduction {
  name: string;
  type: "percent" | "fixed";
  value: number; // fixed: centavos; percent: pontos-base (10000 = 100%)
  amount: number; // calculado pelo backend, somente leitura
}

export interface DreReport {
  projectId: number;
  currency: string;
  grossRevenue: number;
  deductions: DreDeduction[];
  totalDeductions: number;
  netRevenue: number;
  directCosts: number;
  grossResult: number;
  allocatedExpense: number;
  netResult: number;
  hasRevenueData: boolean;
  hasBudgetData: boolean;
}

export interface DreSettingsInput {
  deductions: Array<{ name: string; type: "percent" | "fixed"; value: number }>;
  allocatedExpense: { mode: "fixed" | "percent"; value: number } | null;
}
```

## Error Handling

- Projeto inexistente/não pertence ao usuário → 404 `AppError` (mesmo padrão
  de `assertProjectOwnership`).
- `updateSettings` com dedução sem `name` ou `value < 0` → 400.
- `allocatedExpense.mode = "percent"` com `value > 10000` (>100%) → 400.
- Moeda divergente entre `Budget.currency` e receitas somadas (Requisito 2.5)
  → o relatório não bloqueia, mas `DreReport` retorna um campo adicional
  `currencyMismatch: boolean` e o frontend exibe aviso não bloqueante (ajuste
  em relação ao texto literal do requirement — rejeitar completamente a tela
  seria pior experiência do que avisar; decisão de design, compatível com a
  intenção do requisito de "não converter automaticamente").
- Falha ao gerar PDF (iframe/print) → toast de erro, mesmo padrão de
  `Documents.tsx`/`Proposals.tsx`.

## Testing Strategy

- `server/services/__tests__/dreService.test.ts`: casos por linha do cálculo
  (receita zero, dedução percentual vs fixa, custos diretos vindos de
  `BudgetEntry`, despesa alocada por modo, resultado negativo).
- `server/controllers/domainFlow.test.ts`: estender com bloco de DRE
  exercitando o gate real (`requireStudioPlan("projectDre")`), seguindo o
  padrão já usado para `budgetGate`/`equipmentGate`/`shotListGate`.
- Teste de cross-tenant: usuário A não pode configurar/ler DRE de projeto do
  usuário B (404), mesmo padrão do teste de `financialEntry` cross-tenant já
  existente em `domainFlow.test.ts`.
- Frontend: sem suite de componente formal no projeto hoje (confirmar durante
  implementação) — cobertura via testes de serviço/controller é suficiente
  para este spec.

## Decisões e cortes de escopo

- **Rateio automático por horas trabalhadas (`TimeEntry`)** — mencionado como
  extensão futura no Requisito 4.2 do requirements.md. Não implementado nesta
  entrega; `allocatedExpenseMode` já é uma união de string, então adicionar um
  terceiro modo (`"by-hours"`) depois é aditivo.
- **Auto-vínculo de receita a partir de Proposta aceita** (Requisito 1.4) —
  marcado como não bloqueante no requirements.md. Registrado aqui como fase
  futura: ao aceitar uma proposta que já resultou em projeto, oferecer botão
  "Lançar como receita do projeto" em vez de automatizar silenciosamente (mais
  seguro, evita duplicar receita se o usuário já lança manualmente).
- **Conversão de moeda automática** — fora de escopo (Requisito 2.5); o
  sistema apenas avisa divergência.
