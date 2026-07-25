# Implementation Plan: DRE por Projeto

## Overview

Vertical completo: migração aditiva (`FinancialEntry.projectId` + tabela
`DreSettings`) → `dreService` (dual-path) → controller/rota gated →
`api.dre` → página `Dre.tsx` + tab em `ProjectNav` → seletor de projeto nos
formulários de lançamento financeiro existentes. Fecha com `npm run check` +
`npm run test` + `npm run build` verdes.

Refs de padrão: `budgetService.ts`/`budgetController.ts`/`routes/budgets.ts`
(par mais próximo — mesmo dono de dados, mesmo plano), migration
`20260711040000_add_budget`, gating `requireStudioPlan("budgetTracking")`.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Schema + gating base (bloqueia tudo)",
      "tasks": ["1.1", "1.2", "1.3", "1.4"]
    },
    {
      "wave": 2,
      "description": "Backend: cálculo do DRE e extensão dos endpoints de FinancialEntry",
      "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"]
    },
    {
      "wave": 3,
      "description": "Frontend: página DRE, navegação, seletor de projeto nos forms existentes",
      "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"]
    },
    {
      "wave": 4,
      "description": "Fechamento: build + testes completos",
      "tasks": ["4.1"]
    }
  ]
}
```

## Tasks

### Fase 1 — Schema + gating base (bloqueante) [Req 1, 6]

- [x] 1.1 `FinancialEntry.projectId` (opcional, `onDelete: SetNull`) + relação reversa `Project.financialEntries` em `prisma/schema.prisma`; model `DreSettings` novo (1:1 com `Project`, campos `deductions` Json, `allocatedExpenseMode`, `allocatedExpenseValue`); `npx prisma validate` + `generate`. [Req 1.1, 3.1, 4.1]
- [x] 1.2 Migration `prisma/migrations/<timestamp>_add_project_dre/migration.sql` (SQL real, aditiva: `ALTER TABLE financial_entries ADD COLUMN project_id`, `CREATE TABLE dre_settings`, índices). [Req 1.2, 7.2]
- [x] 1.3 Espelho SQLite em `server/models/db.ts`: helper `ensureFinancialEntryColumns()` (checa `PRAGMA table_info` antes de `ALTER TABLE ADD COLUMN project_id`, idempotente) + `CREATE TABLE IF NOT EXISTS dre_settings` + índices em `createIndexes()`. [Req 1.2, 7.2]
- [x] 1.4 Flag `projectDre` em `shared/planEntitlements.ts` (`FeatureFlagId` + `PlanEntitlement` + todos os `PLAN_ENTITLEMENTS[plan]`, mesmo valor de `budgetTracking` por plano); `requireStudioPlan` já existe em `planAccess.ts` (reuso, sem alteração); espelhar em `client/src/lib/feature-gating/gate.ts` (`"project-dre": "studio"`) + `client/src/types/plan.ts` (`FeatureName`) + `FeatureUpgradeRequired.tsx`/`UpgradePrompt.tsx` (metadata + copy PT/EN). Também adicionado `projectDre` em `server/services/entitlementService.ts` (`FEATURE_REQUIREMENTS`), exigido pelo typecheck. [Req 6.1, 6.2]

### Fase 2 — Backend: cálculo do DRE [Req 1, 2, 3, 4]

- [x] 2.1 `server/services/dreService.ts` (dual-path): `getOrCreateSettings`, `updateSettings` (valida `deductions[].value >= 0`, `type ∈ percent|fixed`; `allocatedExpense.mode ∈ fixed|percent`, `value` 0–10000 se percent), `getReport` — agrega receita (`FinancialEntry` `kind=income status=settled projectId=X`), reusa `budgetService.getOverview()` para `directCosts`, calcula deduções/despesas alocadas, retorna `DreReport` completo incluindo `hasRevenueData`/`hasBudgetData`/`currencyMismatch`. [Req 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3]
- [x] 2.2 `server/controllers/dreController.ts` + `server/routes/dre.ts` (guard `requireStudioPlan("projectDre")`) + registrar em `server/router.ts` (`/api/dre`). [Req 6.1]
- [x] 2.3 Estender `analyticsController.createFinancialEntry`/`updateFinancialEntry` (rotas já existentes) com `projectId?` opcional no body, validando ownership do projeto (mesmo padrão de validação de `clientId` já existente); propagar ao Prisma (`prisma.financialEntry.create/update`) e ao SQLite (`INSERT`/`UPDATE` de `financial_entries`). [Req 1.3]
- [x] 2.4 Teste `server/services/dreService.test.ts`: receita zero (aviso, não erro), filtro de receita (settled/projeto correto), dedução percentual vs fixa, custos diretos vindos de `BudgetEntry`, despesa alocada por modo (fixed/percent), resultado negativo exibido corretamente, moeda divergente sinalizada sem bloquear, validação de settings inválidos, 404 cross-tenant. [Req 2.2, 2.3, 2.4, 3.2, 3.3, 4.2]
- [x] 2.5 Estendido `server/controllers/domainFlow.test.ts`: 402 sem Studio (`requireStudioPlan("projectDre")`) → upgrade → `updateSettings` → lançar receita vinculada ao projeto via endpoint estendido (2.3) → `getReport` reflete receita/custos/resultado → cross-tenant (usuário B não acessa DRE de projeto do usuário A → 404). [Req 6.1, 1.3]

  **Nota de implementação:** `npm run check` limpo e suite completa (`npx vitest run`) com 58 arquivos / 725 testes passando, sem regressão.

### Fase 3 — Frontend: página, navegação e integração com forms existentes [Req 1, 5, 6]

- [x] 3.1 Bloco `api.dre.*` (`getReport`, `updateSettings`) + tipos `DreReport`/`DreDeduction`/`DreSettingsInput` em `client/src/lib/api.ts`. [Req 5.1]
- [x] 3.2 `client/src/pages/Dre.tsx` (`/project/:projectId/dre`): relatório em linhas (Receita bruta → Deduções → Receita líquida → Custos diretos → Resultado bruto → Despesas alocadas → Resultado líquido) estilo `frame-*`/`Budget.tsx`; Dialog de configuração de deduções (lista editável, padrão `CategoryDraft`) e despesa alocada (fixed/percent); destaque vermelho se resultado líquido negativo; aviso não bloqueante de moeda divergente; empty-state 01/02/03 ("Vincule receita" → "Defina orçamento" → "Veja o resultado") quando `!hasRevenueData && !hasBudgetData`; `FeatureUpgradeRequired feature="project-dre"`. [Req 2.1, 2.2, 2.4, 3.1, 4.2, 5.1, 5.3, 6.1]
- [x] 3.3 Export PDF: função local `printDreReport()` em `Dre.tsx` (iframe + HTML, mesmo padrão replicado em `Documents.tsx`/`Proposals.tsx`/`ShotList.tsx` — sem módulo compartilhado real), incluindo nome do projeto, cliente, período, data de geração. [Req 5.2]
- [x] 3.4 Rota `/project/:projectId/dre` em `client/src/App.tsx` + tab "DRE" (ícone `FileBarChart`) em `ProjectNav.tsx`, condicional a `canAccessFeature("project-dre")`, ao lado da tab "Orçamento". [Req 5.1, 6.3]
- [x] 3.5 Seletor opcional "Vincular a projeto" no Dialog de criar/editar lançamento financeiro em `client/src/pages/Analytics.tsx` — lista projetos do `clientId` selecionado (se houver) ou todos os projetos do usuário; envia `projectId` no POST/PATCH de `financial/entries` (2.3). `ClientDetail.tsx` não tem form próprio — navega para `/analytics?newEntry=1&clientId=X`, reusando o mesmo dialog já atualizado, então nenhuma mudança extra foi necessária lá. [Req 1.3]
- [x] 3.6 `npm run build` (client+server) e `npm run check` rodados localmente — ambos limpos, sem erros. [validação de fechamento da Fase 3]

### Fase 4 — Fechamento [Req 7]

- [x] 4.1 Suite completa: `npm run check` limpo (exit 0), `npx vitest run` — 58 arquivos / 725 testes passando (exit 0, sem regressão em `Budget`/`Analytics`/financeiro existentes), `npm run build` (client+server) limpo. Commit final pendente de decisão do usuário (não commitado automaticamente).

## Notes

- **Não duplicar** lógica de agregação de orçamento — `dreService.getReport`
  chama `budgetService.getOverview()` para `directCosts`, nunca reimplementa.
- **Migração puramente aditiva** — nenhuma coluna/tabela existente é alterada
  de forma destrutiva; dados históricos de `FinancialEntry` permanecem com
  `projectId = null` até o usuário vincular manualmente.
- **Gating igual ao Budget** — plano mínimo Studio, mesmo texto de padrão de
  upsell (`FeatureUpgradeRequired`), evitando inconsistência de UX entre
  features "irmãs".
- **Cada task fecha com o build/teste correspondente já indicado** — não
  acumular erros de tipo entre fases.
