# Design — Implementação das Features Anunciadas na Landing

## Overview

A landing (`WhatsNewSection`) anuncia 9 features como "NOVO". Auditoria de
código (`.private/ESTADO_REAL_2026-07-11.md`) confirmou o estado real. Este
spec cobre a implementação **ponta a ponta** das que ainda não existem,
seguindo 100% os padrões já estabelecidos no projeto.

**Já entregue (fora do escopo deste spec):**
- ✅ **Webhooks & Automação** — `webhookService.ts`, `/api/webhooks`, página `/webhooks`, migration `20260711030000_add_webhooks`.
- ✅ **Gestão de Sessões** — `sessionService.ts`, `/api/sessions`, Profile real, migration `20260711020000_add_user_sessions`.
- ✅ **Biblioteca de Assets** — `/assets` + `/api/files/all`.
- ✅ **Portal do Cliente** — Video Reviews (já existia).

**Escopo deste spec:**
1. **Budget Tracking & Control** (plano Studio+) — P0
2. **Equipment Inventory** (plano Studio+) — P1
3. **Shot List Profissional** (drag-and-drop) — P1
4. **Timesheet Inteligente** (timer + relatórios) — P2
5. **Google Calendar Sync** (export/sync de cronograma) — P3
6. **Deploy: garantir migrations aplicadas em produção** — P0 transversal

> "Decupagem com IA" **não entra** — já existe como ferramenta de IA (tool `02`).
> O texto da landing será ajustado (tarefa de conteúdo, não feature).

**Princípios inegociáveis (herdados do código existente):**
- Backend dual Prisma(Postgres)/SQLite via `shouldUsePrisma`.
- Migration SQL + `CREATE TABLE IF NOT EXISTS` em `db.ts` + índices em `createIndexes()`.
- Serialização via `withSnakeCase()`/`jsonSafe()`.
- Design system: accent **`#E85002`** (`--ds-orange`), classes `frame-*`, empty-state com quadrado laranja + fluxo `01/02/03` (padrão `Proposals`/`Documents`/`Webhooks`).
- Navegação: tab em `ProductionNav` (globais) ou `ProjectNav` (por projeto) + rota em `App.tsx` + bloco em `api.ts`.
- **Dívida técnica sinalizada:** existem `#FF6B00` (dashboard/ProgressBar) e `#ff4d1d` (Documents/charts/studioSettings) fora do token. Código novo usa **exclusivamente `#E85002`**; correção do resto é oportunista, não bloqueante.

## Architecture

### Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Wouter + Tailwind design-system frame-*)       │
│  ProductionNav (tabs globais): + Equipamento · Timesheet          │
│  ProjectNav (por projeto):     + Orçamento · Shot List            │
│  Páginas (empty-state 01/02/03 + CRUD + modais Dialog):           │
│   /project/:id/budget    /equipment                               │
│   /project/:id/shotlist  /timesheet                               │
│              │ fetch (api.<feature>)                              │
└──────────────┼────────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (router → controller → service → Prisma/SQLite)          │
│   /api/budgets     budgetController    budgetService              │
│   /api/equipment   equipmentController equipmentService           │
│   /api/shotlists   shotListController  shotListService            │
│   /api/timesheets  timesheetController timesheetService           │
│   /api/public-project-schedule/:token/ics  calendarController     │
│   Guards: authenticate → requireStudioPlan | requireOperationalPlan│
│   Eventos: dispatchWebhookEvent + notifyUser em mutações-chave    │
└──────────────┼────────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  DB — Prisma (Postgres) + fallback SQLite (server/models/db.ts)   │
│   budgets · budget_entries · equipment · equipment_bookings       │
│   shot_lists · shots · time_entries                               │
│   (Google Calendar: sem tabela — gera .ics on-demand)             │
└─────────────────────────────────────────────────────────────────┘
```

### Deploy — migrations auto-aplicadas (P0 transversal)

**Problema confirmado:** nixpacks roda só `prisma generate`; `npm prune --production` remove `prisma` CLI (devDependencies); boot (`app.ts`) só faz `initPrismaCoreData()` (seed), **nunca `migrate deploy`**. Tabelas novas não existiriam em produção.

**Solução:**
1. Mover `prisma` de `devDependencies` → `dependencies` (sobrevive ao prune).
2. `start:prod` = `prisma migrate deploy && npm run start`.
3. Fallback documentado: `railway run npx prisma migrate deploy`.

> Pré-requisito de qualquer feature nova (e das já criadas webhooks/sessions) funcionar em produção.

### Plan gating declarativo

`shared/planEntitlements.ts` ganha flags por feature; `entitlementService.ts` ganha `requireFeature(userId, role, feature)` (admin sempre passa); `planAccess.ts` ganha `requireStudioPlan`. Frontend `gate.ts` espelha os flags para esconder tabs/telas com upsell.

```
request → authenticate (JWT + sessão) → requireStudioPlan
   │  entitlementService.requireFeature(userId, role, "budgetTracking")
   │  plano habilita a feature (ou admin) ? segue : 402 "Ative o plano Studio"
   ▼ controller
```

### Integração com o existente
- **Budget** importa baseline opcional da ferramenta IA "Orçamento" (tool `04`) lendo o último `project_state`. Sem acoplamento rígido.
- **Timesheet → Budget**: manual no MVP (botão "Enviar para Orçamento" cria `budget_entry` categoria "Equipe"). Sync automático fica para fase futura planejada — ver §Decisões e cortes de escopo.
- **Google Calendar**: MVP reusa `icsService.ts` (export `.ics` por token, one-way). OAuth bidirecional **não é descartado**: é fase futura planejada (fase 2 do Google Calendar) — ver §Decisões e cortes de escopo.
- **Shot List × Equipment** (sugestão automática): fora do MVP; gancho documentado como fase futura planejada (não descartado) — ver §Decisões e cortes de escopo.

## Components and Interfaces

### Backend — rotas por feature

**Budget (`routes/budgets.ts`, guard `requireStudioPlan`):**
```
GET    /api/budgets/:projectId            getOverview
PUT    /api/budgets/:projectId            updateBudgetBaseline
POST   /api/budgets/:projectId/entries    addEntry
DELETE /api/budgets/entries/:id           deleteEntry
```
`budgetService`: `getOrCreateBudget`, `updateBudgetBaseline`, `addEntry`, `deleteEntry`, `getOverview` → `{ totalBudgeted, totalSpent, byCategory:[{name,budgeted,spent,pct}], alerts:[{category,level:"warn"|"over"}] }` (warn ≥80%, over ≥100%).

**Equipment (`routes/equipment.ts`, guard `requireStudioPlan`):**
```
GET/POST         /api/equipment
PATCH/DELETE     /api/equipment/:id
GET              /api/equipment/:id/availability?start&end
POST             /api/equipment/:id/bookings
DELETE           /api/equipment/bookings/:id
```
`equipmentService`: CRUD + `checkAvailability` (overlap de bookings) + `createBooking`/`cancelBooking`.

**Shot List (`routes/shotlists.ts`, guard `requireOperationalPlan`):**
```
GET    /api/shotlists/:projectId
POST   /api/shotlists/:projectId/shots
PATCH  /api/shotlists/shots/:id
DELETE /api/shotlists/shots/:id
PUT    /api/shotlists/:projectId/reorder   { orderedIds: number[] }
```
`shotListService`: `getOrCreateForProject`, `addShot`, `updateShot`, `deleteShot`, `reorderShots` (transação atualizando `orderIndex`).

**Timesheet (`routes/timesheets.ts`, guard `requireOperationalPlan`):**
```
GET    /api/timesheets              listEntries (?projectId&period)
GET    /api/timesheets/running      getRunningTimer
POST   /api/timesheets/start        startTimer
POST   /api/timesheets/:id/stop     stopTimer
POST   /api/timesheets              addManualEntry
DELETE /api/timesheets/:id          deleteEntry
GET    /api/timesheets/report       getReport
```

**Calendar (`calendarController.ts`):**
```
GET /api/public-project-schedule/:token/ics   gera .ics via icsService
```

### Frontend — páginas e navegação

| Página | Rota | Nav | Ícone | Empty-state fluxo 01/02/03 |
|---|---|---|---|---|
| `Budget.tsx` | `/project/:projectId/budget` | ProjectNav | `Wallet` | Defina orçamento → Lance gastos → Previsto vs realizado |
| `Equipment.tsx` | `/equipment` | ProductionNav | `Camera` | Cadastre → Reserve por projeto → Controle disponibilidade |
| `ShotList.tsx` | `/project/:projectId/shotlist` | ProjectNav | `Clapperboard` | Adicione planos → Ordene arrastando → Marque filmado/exporte |
| `Timesheet.tsx` | `/timesheet` | ProductionNav | `Clock` | Inicie timer → Vincule projeto → Veja horas e custo |

- Shot List usa **dnd-kit** (já instalado: `@dnd-kit/core`, `@dnd-kit/sortable`).
- Export PDF (Shot List) reusa `printHtmlDocument` de `Documents`/`Proposals`.
- Upload de comprovante (Budget) reusa fluxo Supabase de `filesController`.
- Modais via `@/components/ui/dialog`; delete via `AlertDialog`.
- `client/src/lib/api.ts`: blocos `api.budgets`, `api.equipment`, `api.shotlists`, `api.timesheets`.

## Data Models

Todas as tabelas: IDs `BigInt @default(autoincrement())`, timestamps `@db.Timestamptz`, snake_case via `@map`, `onDelete: Cascade` a partir de `users`/`projects`. `amount`/valores em **`Int` (centavos)** por consistência com `FinancialEntry.amount` e `Plan.priceBrl`. Listas como `Json` (padrão `Plan.features`).

```prisma
model Budget {
  id BigInt @id @default(autoincrement())
  userId BigInt @map("user_id")
  projectId BigInt @unique @map("project_id")
  totalAmount Int @default(0) @map("total_amount")
  currency String @default("BRL")
  categories Json @default("[]")            // [{ name, budgeted }]
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  entries BudgetEntry[]
  @@index([userId], map: "idx_budgets_user_id")
  @@map("budgets")
}

model BudgetEntry {
  id BigInt @id @default(autoincrement())
  budgetId BigInt @map("budget_id")
  userId BigInt @map("user_id")
  category String
  description String
  amount Int @default(0)
  entryDate DateTime @map("entry_date") @db.Date
  receiptUrl String? @map("receipt_url")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([budgetId], map: "idx_budget_entries_budget_id")
  @@map("budget_entries")
}

model Equipment {
  id BigInt @id @default(autoincrement())
  userId BigInt @map("user_id")
  name String
  category String                            // camera|lens|light|audio|accessory
  specs Json @default("{}")
  status String @default("available")        // available|in_use|maintenance|rented
  costPerDay Int? @map("cost_per_day")
  isOwned Boolean @default(true) @map("is_owned")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookings EquipmentBooking[]
  @@index([userId], map: "idx_equipment_user_id")
  @@map("equipment")
}

model EquipmentBooking {
  id BigInt @id @default(autoincrement())
  equipmentId BigInt @map("equipment_id")
  projectId BigInt @map("project_id")
  startDate DateTime @map("start_date") @db.Date
  endDate DateTime @map("end_date") @db.Date
  status String @default("booked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  equipment Equipment @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([equipmentId], map: "idx_equipment_bookings_equipment_id")
  @@index([projectId], map: "idx_equipment_bookings_project_id")
  @@map("equipment_bookings")
}

model ShotList {
  id BigInt @id @default(autoincrement())
  userId BigInt @map("user_id")
  projectId BigInt @map("project_id")
  title String @default("Shot List")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  shots Shot[]
  @@index([userId], map: "idx_shot_lists_user_id")
  @@index([projectId], map: "idx_shot_lists_project_id")
  @@map("shot_lists")
}

model Shot {
  id BigInt @id @default(autoincrement())
  shotListId BigInt @map("shot_list_id")
  orderIndex Int @default(0) @map("order_index")
  scene String @default("")
  shotType String @default("") @map("shot_type")
  description String @default("")
  camera String @default("")
  lens String @default("")
  movement String @default("")
  durationSec Int? @map("duration_sec")
  status String @default("pending")          // pending|shot
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  shotList ShotList @relation(fields: [shotListId], references: [id], onDelete: Cascade)
  @@index([shotListId], map: "idx_shots_shot_list_id")
  @@map("shots")
}

model TimeEntry {
  id BigInt @id @default(autoincrement())
  userId BigInt @map("user_id")
  projectId BigInt? @map("project_id")
  description String @default("")
  startedAt DateTime @map("started_at") @db.Timestamptz
  endedAt DateTime? @map("ended_at") @db.Timestamptz
  durationSec Int @default(0) @map("duration_sec")
  hourlyRate Int? @map("hourly_rate")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  @@index([userId], map: "idx_time_entries_user_id")
  @@index([projectId], map: "idx_time_entries_project_id")
  @@map("time_entries")
}
```

**Plan entitlements (`shared/planEntitlements.ts`):**
```ts
interface PlanEntitlement {
  clientLimit: number | null;
  teamMemberLimit: number;
  requiresPaidActivation: boolean;
  budgetTracking: boolean;      // free:false pro:false studio:true
  equipmentInventory: boolean;  // free:false pro:false studio:true
  shotList: boolean;            // free:false pro:true  studio:true
  timesheet: boolean;           // free:false pro:true  studio:true
}
```

Cada tabela recebe: (a) model Prisma acima, (b) relação inversa em `User`/`Project`, (c) `CREATE TABLE IF NOT EXISTS` em `db.ts` com tipos SQLite (`INTEGER`/`TEXT`, `Json`→`TEXT`, `Boolean`→`INTEGER`, `Timestamptz`→`TEXT`), (d) índices em `createIndexes()`, (e) migration SQL em `prisma/migrations/`.

## Error Handling
- Ownership sempre por `userId` (404 `AppError` se não pertence ao usuário) — padrão dos controllers atuais.
- Plan gating retorna **402** com mensagem "Ative o plano Studio para liberar..." (padrão `requireOperationalAccess`).
- Validações de input com `AppError(msg, 400)` (URL, datas, valores negativos, overlap de booking).
- Eventos (`notifyUser`, `dispatchWebhookEvent`) são **fire-and-forget**: falha logada, nunca quebra a request.
- Timer: `startTimer` rejeita se já houver timer rodando (409); `stopTimer` rejeita se entry já fechada.
- Migrations: `prisma migrate deploy` no start falha o boot em erro de migration (comportamento desejado — não sobe com schema quebrado).

## Testing Strategy
- Estender `server/controllers/domainFlow.test.ts` (padrão `invoke()`, roda em SQLite) com um caso ponta-a-ponta por feature: criar → listar → mutar → deletar, validando ownership e plan gating.
- `npx prisma validate` + aplicar migration em banco local antes de push.
- Ao final de cada feature: `npm run build` (tsc client+server) + `npx vitest run` nos arquivos afetados.
- Verificar visualmente (ou Playwright) empty-states e navegação após integração.

## Correctness Properties

### Property 1: Isolamento por usuário
Nenhuma query retorna ou muta dado de um `userId` diferente do autenticado (exceto role admin). Toda leitura/escrita filtra por `userId` (ou por `projectId` já validado como pertencente ao usuário).

**Validates: Requirements 1.5, 2.5, 4.4, 6.1**

### Property 2: Plan gating consistente
Se uma feature é bloqueada, o frontend esconde a tab/tela **e** o backend responde 402 — nunca apenas um dos dois. A fonte da verdade é `planEntitlements.ts`, consumida por `entitlementService` (backend) e `gate.ts` (frontend).

**Validates: Requirements 1.5, 2.5, 4.4**

### Property 3: Budget invariante
`getOverview.totalSpent` é sempre igual à soma de `budget_entries.amount` do budget; `pct` por categoria = `spent / budgeted`; alerta `warn` quando `pct ≥ 0.8` e `over` quando `pct ≥ 1.0`.

**Validates: Requirements 1.3, 1.4, 1.6**

### Property 4: Booking sem overlap
`checkAvailability(equipmentId, start, end)` retorna falso se, e somente se, existe algum `equipment_booking` ativo do mesmo equipamento cujo intervalo `[startDate, endDate]` intersecta `[start, end]`.

**Validates: Requirements 2.3, 2.4**

### Property 5: Ordem de shots estável
Após `reorderShots(orderedIds)`, os `orderIndex` dos shots são contíguos (`0..n-1`) e refletem exatamente a ordem recebida em `orderedIds`.

**Validates: Requirements 3.3**

### Property 6: Timer único por usuário
Existe no máximo 1 `TimeEntry` com `endedAt = null` por usuário a cada instante; `startTimer` falha (409) se já houver um aberto.

**Validates: Requirements 4.2**

### Property 7: Paridade dual-DB
Para a mesma operação, os branches Prisma (Postgres) e SQLite produzem respostas com a mesma forma serializada (mesmas chaves snake_case, mesmos tipos).

**Validates: Requirements 6.1, 6.2**

## Ordem de execução (P0→P3)
1. Deploy migrations (§Architecture) + plan gating base.
2. Budget Tracking (feature killer Studio).
3. Equipment Inventory.
4. Shot List.
5. Timesheet + integração manual com Budget.
6. Google Calendar `.ics`.
7. Ajustar `WhatsNewSection`/landing ao que passou a existir.

## Decisões e cortes de escopo
- **Int centavos** (não Decimal) — consistência com schema atual.
- **SQLite fallback obrigatório** — testes rodam nele.
- **Fora do MVP, mantidos como fase futura planejada (não descartados):**
  1. **Sugestão de IA de equipamento por shot** — não implementada nesta spec; o MVP entrega Shot List e Equipment Inventory como verticais independentes, sem sugestão automática. Fase futura: gancho já documentado nos hooks da Shot List (`shotListService`/`ShotList.tsx`), consumindo o inventário de `Equipment` por categoria/tipo de plano quando essa fase for priorizada. Mantido em backlog como task 7.3 (polish, não bloqueante).
  2. **OAuth Google bidirecional** — o MVP entrega apenas export `.ics` one-way (§Requisito 5), rotulado honestamente como "exportar para agenda" e não como sync. Fase futura: fase 2 do Google Calendar, com fluxo OAuth para leitura/escrita direta na agenda do usuário (dependência nova: credenciais OAuth Google, consentimento, refresh token).
  3. **Sync automático Timesheet→Budget** — o MVP entrega apenas o botão manual "Enviar para Orçamento" (task 7.2, já MVP). Fase futura: sync automático depende de (a) a fase OAuth bidirecional acima *ou* (b) uma regra de negócio adicional definida pelo produto (ex.: gatilho ao fechar timer, janela de aprovação antes de lançar no orçamento).

  Estes três itens permanecem documentados nesta spec como roadmap/backlog pós-MVP — não devem ser removidos da landing/pricing como "não vai ter", apenas como "ainda não disponível nesta fase".
