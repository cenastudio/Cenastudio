# Implementation Plan: Landing Features Implementation

## Overview

Execução ponta a ponta das features que a landing anuncia mas não existiam:
Budget Tracking, Equipment Inventory, Shot List, Timesheet e Google Calendar
(.ics). Ordem por prioridade: **P0 (deploy + gating base) → Budget → Equipment
→ Shot List → Timesheet → Calendar → fechamento/landing → P3 polish**.

Cada feature entrega vertical completo: model Prisma + migration SQL + espelho
SQLite em `db.ts` + índices + service (dual-path) + controller + rota + bloco
em `api.ts` + página + tab de navegação + gating + teste. Fecha só com
`npm run build` + testes afetados verdes. Zero placeholder no código.

Refs de padrão: controllers em `server/controllers/*` (dual-path
`shouldUsePrisma`), migration `20260711030000_add_webhooks`, empty-state com
quadrado laranja + passos `01/02/03` (`Proposals.tsx`/`Documents.tsx`), accent
só `--ds-orange`.

## Task Dependency Graph

- P0 é pré-requisito de TODAS (sem migrate deploy, nada funciona em prod).
- F1–F5 são independentes entre si (podem ser feitas em qualquer ordem após P0).
- Fechamento depende de F1–F5. P3 depende do Fechamento (não bloqueante).

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Deploy migrations self-applying + plan entitlements base (bloqueia tudo)",
      "tasks": ["0.1", "0.2", "0.3"]
    },
    {
      "wave": 2,
      "description": "Features verticais independentes (podem ser paralelas após P0)",
      "tasks": [
        "1.1","1.2","1.3","1.4","1.5","1.6","1.7","1.8","1.9","1.10",
        "2.1","2.2","2.3","2.4","2.5","2.6","2.7","2.8","2.9","2.10",
        "3.1","3.2","3.3","3.4","3.5","3.6","3.7","3.8","3.9","3.10","3.11",
        "4.1","4.2","4.3","4.4","4.5","4.6","4.7","4.8","4.9","4.10",
        "5.1","5.2","5.3","5.4","5.5","5.6"
      ]
    },
    {
      "wave": 3,
      "description": "Fechamento: sincronizar landing com o que passou a existir + suite completa",
      "tasks": ["6.1","6.2","6.3","6.4"]
    },
    {
      "wave": 4,
      "description": "Polish e dívida técnica (não bloqueante)",
      "tasks": ["7.1","7.2","7.3","7.4"]
    }
  ]
}
```

## Tasks

### P0 — Deploy migrations + gating base (bloqueante) [Req 0, 6]

- [x] 0.1 Mover `"prisma"` de `devDependencies` para `dependencies` em `package.json`; alterar `start:prod` para `prisma migrate deploy && npm run start`; `npm run build` local para validar. [Req 0.1, 0.2, 0.3]
- [x] 0.2 Adicionar flags de feature em `shared/planEntitlements.ts` (`budgetTracking`, `equipmentInventory`, `shotList`, `timesheet`) nos 3 planos; adicionar `requireFeature(userId, role, feature)` em `server/services/entitlementService.ts` (admin bypassa) e `requireStudioPlan` em `server/middleware/planAccess.ts`; espelhar flags em `client/src/lib/feature-gating/gate.ts` + `types/plan.ts` (`FeatureName`) + `FeatureUpgradeRequired.tsx`/`UpgradePrompt.tsx` (metadata + traduções PT/EN). [Req 1.5, 2.5, 4.4, 6]
- [x] 0.3 Commit `fix(deploy): apply prisma migrations on start + feature entitlements`.

**Nota de produção (11-jul):** durante a retomada desta spec foi descoberto que o
banco de produção (Railway Postgres) tinha 10 tabelas "fantasma"
(`shots`, `time_entries`, `active_timers`, `script_breakdowns`,
`client_portal_shares`, `project_templates`, `assets`, `widgets`,
`dashboards`, `reports`) e uma `webhooks` com schema incompatível —
aplicadas via migration direto em produção por uma sessão anterior, nunca
commitadas em nenhum branch do git. Isso quebrava login em produção
(`user_sessions` ausente → `isTokenRevoked` falhava em toda rota
autenticada → 401 → frontend deslogava). Ação tomada: backup das tabelas
(todas vazias exceto `project_templates` com 7 seeds decorativos, sem dado
de usuário real), `DROP TABLE` das 10 fantasmas + `webhooks` incompatível,
limpeza de `_prisma_migrations`, e `prisma migrate deploy` real aplicado
(`add_user_sessions` + `add_webhooks` corretos). Produção agora = schema do
git, sem fantasmas. Script usado removido do repo após uso (não é reusável
com segurança).

### F1 — Budget Tracking (Studio+) [Req 1]

Backend
- [ ] 1.1 Models `Budget` + `BudgetEntry` em `prisma/schema.prisma` (+ relações reversas em `User`/`Project`); `npx prisma validate` + `generate`. [Req 1.2]
- [ ] 1.2 Migration `prisma/migrations/<ts>_add_budget/migration.sql` (SQL real, padrão `add_webhooks`). [Req 6.2]
- [ ] 1.3 Espelho SQLite em `server/models/db.ts`: `budgets` + `budget_entries` + índices em `createIndexes()`. [Req 6.2]
- [ ] 1.4 `server/services/budgetService.ts` (dual-path): `getOverview` (spent/pct/alert warn≥80% over≥100%), `updateBudgetBaseline`, `addEntry`, `deleteEntry`; valores em centavos. [Req 1.3, 1.4]
- [ ] 1.5 `server/controllers/budgetController.ts` + `server/routes/budgets.ts` (guard `requireStudioPlan`) + registrar em `server/router.ts` (`/api/budgets`). [Req 1.1, 1.5]
- [ ] 1.6 Teste ponta-a-ponta em `server/controllers/domainFlow.test.ts`: upsert baseline → addEntry → overview reflete alert → deleteEntry. [Req 1.3, 1.4]

Frontend
- [ ] 1.7 Bloco `api.budgets.*` em `client/src/lib/api.ts`. [Req 6.4]
- [ ] 1.8 `client/src/pages/Budget.tsx`: barras previsto×realizado (Recharts), tabela de lançamentos, Dialog add com upload de comprovante (reusar fluxo Supabase de files), alertas amarelo/vermelho, empty-state 01/02/03. [Req 1.1, 1.3, 1.4, 1.7]
- [ ] 1.9 Rota `/project/:projectId/budget` em `client/src/App.tsx` + tab "Orçamento" em `ProjectNav` (só Studio+) + gate de upgrade. [Req 1.1, 1.5]
- [ ] 1.10 `npm run build` + commit `feat(budget): budget tracking end-to-end`.

### F2 — Equipment Inventory (Studio+) [Req 2]

Backend
- [ ] 2.1 Models `Equipment` + `EquipmentBooking` em schema (+ relações reversas); validate + generate. [Req 2.2]
- [ ] 2.2 Migration `<ts>_add_equipment` (SQL real). [Req 6.2]
- [ ] 2.3 Espelho SQLite `equipment` + `equipment_bookings` + índices. [Req 6.2]
- [ ] 2.4 `server/services/equipmentService.ts` (dual-path): CRUD, `checkAvailability` (overlap), `createBooking` (rejeita conflito → 409), `cancelBooking`. [Req 2.3, 2.4]
- [ ] 2.5 `server/controllers/equipmentController.ts` + `server/routes/equipment.ts` (`requireStudioPlan`) + registrar (`/api/equipment`). [Req 2.1, 2.5]
- [ ] 2.6 Teste: create → booking ok → booking sobreposto rejeitado (409) → cancel. [Req 2.4]

Frontend
- [ ] 2.7 Bloco `api.equipment.*` em `api.ts`. [Req 6.4]
- [ ] 2.8 `client/src/pages/Equipment.tsx`: grid + filtros (categoria/status), Dialog cadastro/edição, seção bookings, empty-state 01/02/03, gate Studio. [Req 2.1, 2.6]
- [ ] 2.9 Rota `/equipment` em `App.tsx` + tab "Equipamento" (ícone `Camera`) em `ProductionNav`. [Req 2.1]
- [ ] 2.10 `npm run build` + commit `feat(equipment): inventory + bookings end-to-end`.

### F3 — Shot List (Pro+) [Req 3]

Backend
- [ ] 3.1 Models `ShotList` + `Shot` em schema (+ relações reversas); validate + generate. [Req 3.2]
- [ ] 3.2 Migration `<ts>_add_shotlist` (SQL real). [Req 6.2]
- [ ] 3.3 Espelho SQLite `shot_lists` + `shots` + índices. [Req 6.2]
- [ ] 3.4 `server/services/shotListService.ts` (dual-path): `getOrCreateForProject`, `addShot` (append orderIndex), `updateShot`, `deleteShot`, `reorderShots` (transação, orderIndex contíguo). [Req 3.2, 3.3, 3.4]
- [ ] 3.5 `server/controllers/shotListController.ts` + `server/routes/shotlists.ts` (`requireOperationalPlan`) + registrar (`/api/shotlists`). [Req 3.1]
- [ ] 3.6 Teste: create×3 → reorder → ordem persiste → update status → delete. [Req 3.3, 3.4]

Frontend
- [ ] 3.7 Bloco `api.shotlists.*` em `api.ts`. [Req 6.4]
- [ ] 3.8 `client/src/pages/ShotList.tsx`: lista drag-and-drop com `@dnd-kit` (já instalado), form add, edição inline/Dialog, marcar filmado, empty-state 01/02/03. [Req 3.1, 3.2, 3.3, 3.4, 3.6]
- [ ] 3.9 Export imprimível/PDF reusando `printHtmlDocument` (`Documents`/`Proposals`). [Req 3.7]
- [ ] 3.10 Rota `/project/:projectId/shotlist` + tab "Shot List" (ícone `Clapperboard`) em `ProjectNav`. [Req 3.1]
- [ ] 3.11 `npm run build` + commit `feat(shotlist): drag-and-drop shot list end-to-end`.

### F4 — Timesheet (Pro+ timer / Studio+ custo) [Req 4]

Backend
- [~] 4.1 Model `TimeEntry` em schema (+ relações reversas); validate + generate. [Req 4.3]
- [~] 4.2 Migration `<ts>_add_time_entries` (SQL real). [Req 6.2]
- [ ] 4.3 Espelho SQLite `time_entries` + índices. [Req 6.2]
- [ ] 4.4 `server/services/timesheetService.ts` (dual-path): `listEntries`(+totais), `getRunningTimer`, `startTimer` (409 se já aberto), `stopTimer` (calcula durationSec/custo), `addManualEntry`, `deleteEntry`, `getReport`. [Req 4.1, 4.2, 4.3, 4.5]
- [ ] 4.5 `server/controllers/timesheetController.ts` + `server/routes/timesheets.ts` + registrar (`/api/timesheets`). [Req 4.4]
- [ ] 4.6 Teste: start → stop calcula duração/custo → start duplicado rejeitado (409) → manual entry → totais → delete. [Req 4.2, 4.3, 4.5]

Frontend
- [ ] 4.7 Bloco `api.timesheets.*` em `api.ts`. [Req 6.4]
- [ ] 4.8 `client/src/pages/Timesheet.tsx`: timer start/stop, lista de registros, total horas + custo, form manual (projeto, início, fim, taxa), empty-state 01/02/03, gate. [Req 4.1, 4.2, 4.3, 4.6]
- [ ] 4.9 Rota `/timesheet` em `App.tsx` + tab "Timesheet" (ícone `Clock`) em `ProductionNav`. [Req 4.1]
- [ ] 4.10 `npm run build` + commit `feat(timesheet): timer + cost report end-to-end`.

### F5 — Google Calendar / Agenda (.ics) (Pro+) [Req 5]

Backend
- [ ] 5.1 Estender `server/services/icsService.ts` com `buildIcsCalendar(events[])` (multi-evento, reusa `buildIcsEvent`). [Req 5.1, 5.2]
- [ ] 5.2 `server/controllers/calendarController.ts`: agrega deadline do projeto + reuniões vinculadas; mensagem/404 se sem eventos; `server/routes/calendar.ts` + registrar (`GET /api/calendar/project/:projectId.ics`). [Req 5.1, 5.3]
- [ ] 5.3 Teste: projeto com deadline + 1 reunião → `.ics` contém 2 VEVENT. [Req 5.2]

Frontend
- [ ] 5.4 `api.calendar.projectIcs(projectId)` em `api.ts` (URL de download). [Req 6.4]
- [ ] 5.5 Botão "Exportar para agenda (.ics)" em `ProjectHub` — rótulo honesto (não "sync"). [Req 5.4]
- [ ] 5.6 `npm run build` + commit `feat(calendar): project schedule .ics export`.

### Fechamento — sincronia landing + validação [Req 7]

- [ ] 6.1 Atualizar `client/src/components/landing/WhatsNewSection.tsx`: refletir estado real; remover "NOVO" de item ainda inexistente. [Req 7.1, 7.2]
- [ ] 6.2 Ajustar tabela de pricing em `shared/site.ts` se algum item Studio não foi entregue. [Req 7.2]
- [ ] 6.3 Atualizar `.private/ESTADO_REAL_2026-07-11.md` seção 4 (mover entregues → "✅ Existe"). [Req 7.3]
- [ ] 6.4 Rodar suite completa `npm run test`; `npm run build` final; push; confirmar deploy Railway (migrations via P0). [Req 6.6]

### P3 — Polish / dívida técnica (não bloqueia)

- [ ] 7.1 Unificar oranges rogue (`#FF6B00`, `#ff4d1d`) → `--ds-orange` em `components/dashboard/*`, `ProgressBar`, `Documents`, charts, `studioSettings` default; ajustar testes que asseram valores antigos.
- [ ] 7.2 Integração F4→F1: botão "Enviar horas para Orçamento" cria `budget_entry` categoria "Equipe".
- [ ] 7.3 Integração F2→F3: sugerir equipamento por tipo de plano na shot list.
- [ ] 7.4 Storage quota real em Assets (hoje número decorativo).

## Notes

- **Ordem racional:** P0 primeiro (senão nada funciona em prod). Budget é a
  feature-killer do Studio (maior valor), por isso lidera F1–F5.
- **Gating Studio (F1, F2):** `requireStudioPlan`; `role === "admin"` bypassa.
  Shot List e Timesheet-timer são Pro+ (`requireOperationalPlan`).
- **Cada commit** só entra com `npm run build` verde.
- **Não recriar** helpers de moeda/print/empty-state — reusar os existentes.
- **Webhooks e Session Management** já entregues (commits `d6876c8`, `256f6d3`),
  fora do escopo de código desta spec.
