# Design — Delegação de Tarefas por Equipe (Team Task Delegation)

## Overview

Substitui o conceito de "Colaborador externo sem login" por um único
conceito: **Team** (conta de login real, `User` + `WorkspaceMember`). Sobre
esse conceito, introduz **Tarefas**: demandas atribuídas a um team member
dentro de um projeto, com vínculo opcional a uma etapa/ferramenta do
workflow já existente (`WORKFLOW_STAGES` em `client/src/lib/workflow.ts`).

Execução em **6 fases estritamente sequenciais e aditivas**. Cada fase
termina com `npm run check` + `npm run test` + `npm run build` verdes,
commit, push e deploy Railway confirmado antes de iniciar a próxima — nenhuma
fase deixa produção quebrada mesmo se o trabalho parar ali.

```
Fase 1: Model Task (schema + dual-path db.ts)        [aditivo, invisível]
Fase 2: API de Tarefas (rotas + services)             [aditivo, invisível]
Fase 3: UI "Minhas Tarefas" + notificação              [aditivo, visível/novo]
Fase 4: UI de criação/gestão de tarefas no projeto     [aditivo, visível/novo]
Fase 5: Migração de dados Collaborator → Team          [aditivo + dump, dados]
Fase 6: Remoção de /collaborators + nav cleanup        [única fase destrutiva,
                                                          feita só após ok manual]
```

## Decisões de produto já confirmadas pelo usuário
- Só team members recebem tarefas (sem freelancer sem login).
- Tarefa é livre por padrão, com vínculo **opcional** a etapa/ferramenta do
  workflow (Opção C).
- Quem recebe a tarefa vê num dashboard próprio + notificação no projeto.
- Collaborator e Team se fundem num conceito só.

## Decisão de produto pendente (registrar aqui quando o usuário confirmar)
- Onde "Equipe" mora na navegação final: manter `/team` como rota própria
  (mínima mudança de nav) **ou** mover para dentro de `/company` como aba.
  **Default proposto se não houver objeção:** manter `/team` como rota
  própria por agora (menor risco, menos arquivos tocados), e só mover para
  dentro de `/company` numa fase 7 opcional depois que Tarefas estiver
  estável. Isso evita acoplar uma mudança de IA de navegação a uma mudança de
  modelo de dados na mesma fase.

## Fase 1 — Model `Task`

### Schema Prisma (`prisma/schema.prisma`)

```prisma
model Task {
  id             BigInt    @id @default(autoincrement())
  projectId      BigInt    @map("project_id")
  assigneeUserId BigInt    @map("assignee_user_id")
  createdByUserId BigInt   @map("created_by_user_id")
  title          String
  description    String?
  dueDate        DateTime? @map("due_date") @db.Timestamptz
  status         String    @default("pending") // pending | in_progress | done
  stageId        String?   @map("stage_id")     // WorkflowStageId, ex.: "production"
  toolSlug       String?   @map("tool_slug")    // ex.: "callsheet"
  completedAt    DateTime? @map("completed_at") @db.Timestamptz
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @default(now()) @map("updated_at") @db.Timestamptz

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User    @relation("TaskAssignee", fields: [assigneeUserId], references: [id], onDelete: Cascade)
  creator  User    @relation("TaskCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)

  @@index([projectId], map: "idx_tasks_project_id")
  @@index([assigneeUserId], map: "idx_tasks_assignee_user_id")
  @@index([status], map: "idx_tasks_status")
  @@map("tasks")
}
```

Adicionar em `User`: `tasksAssigned Task[] @relation("TaskAssignee")` e
`tasksCreated Task[] @relation("TaskCreator")`. Adicionar em `Project`:
`tasks Task[]`.

### Migration (`prisma/migrations/<timestamp>_add_tasks/migration.sql`)
Segue exatamente o padrão de `20260711070000_add_time_entries`: `CREATE
TABLE`, índices em `project_id`/`assignee_user_id`/`status`, FKs com `ON
DELETE CASCADE` para `project_id`, `assignee_user_id`, `created_by_user_id`
(todas cascade, conforme Requisito 1.5).

### Espelho SQLite (`server/models/db.ts`)
`CREATE TABLE IF NOT EXISTS tasks (...)` com os mesmos campos em snake_case,
adicionado dentro da mesma função onde `time_entries`/`shot_lists` são
criadas, e índices equivalentes em `createIndexes()`. Nenhuma tabela existente
é alterada — puramente aditivo.

### Validação de `toolSlug`
`server/lib/workflowStages.ts` (novo arquivo pequeno, servidor) replica a
lista de slugs válidos vinda de `client/src/lib/workflow.ts` (não há import
cross client/server hoje no projeto — os dois já têm cópias paralelas de
conceitos de workflow, ex. `toolId`/`toolSlug` em `populatedStates`). Mantém o
padrão existente em vez de introduzir um import compartilhado novo.

## Fase 2 — API

### Arquivos novos
- `server/services/taskService.ts` — dual-path (Prisma/SQLite), funções:
  `createTask`, `listTasksByProject`, `listMyTasks`, `updateTaskStatus`,
  `reassignTask`, `deleteTask`.
- `server/controllers/taskController.ts` — wrappers HTTP + serialização
  `withSnakeCase`.
- `server/routes/tasks.ts` — monta:
  - `GET /api/projects/:projectId/tasks`
  - `POST /api/projects/:projectId/tasks`
  - `GET /api/tasks/mine`
  - `PATCH /api/tasks/:id` (status, reassign, edição de campos)
  - `DELETE /api/tasks/:id`
- Registrar router em `server/index.ts` junto dos demais (`app.use("/api",
  authenticate, tasksRouter)`), seguindo o padrão de `budgets`/`shotlists`.

### Regras de autorização (Requisito 2.2, 2.7)
- Criar tarefa: exige que o usuário autenticado seja owner do workspace do
  projeto OU team member com role `producer` (reaproveita
  `getTeamMemberContext`/`teamAccess.ts` já existentes).
- `assigneeUserId` deve pertencer ao mesmo workspace (owner ou
  `WorkspaceMember` ativo) — validado via `getOwnerWorkspaceId` +
  `listTeamMembers` já existentes em `teamService.ts`.
- Atualizar/excluir: permitido para o responsável (`assigneeUserId` ==
  usuário logado, só pode mudar `status`), o criador, ou o owner.

### Notificação (Requisito 3, 4)
Reaproveita o model `Notification` existente (`prisma/schema.prisma:556`) e o
serviço que já popula `NotificationsPopover`. `createTask` chama
`notificationService.create({ userId: assigneeUserId, type: "task_assigned",
... })` — sem criar sistema de notificação novo, só um novo `type`.

## Fase 3 — "Minhas Tarefas"

### Frontend
- Novo componente `client/src/components/MyTasksPanel.tsx`: lista tarefas de
  `GET /api/tasks/mine`, ordenadas por `dueDate` (nulos por último), com
  botão de concluir inline (`PATCH` status `done`) e link para a
  ferramenta/etapa quando `toolSlug`/`stageId` existir (reaproveita
  `WORKFLOW_STAGES`/`getWorkflowStage` do frontend para resolver a rota).
- Inserido no `Dashboard.tsx` como nova seção, visível para todo usuário
  autenticado (owner vê tarefas que ele mesmo se atribuiu; team member vê as
  suas).
- Estado vazio: reaproveita padrão `EmptyState` já usado em `Collaborators`,
  sem números fabricados.

### Notificação inline (Requisito 4.2)
`NotificationsPopover.tsx` ganha um `case` para `type === "task_assigned"`
que renderiza título do projeto + título da tarefa e navega para
`/project/:id` ao clicar — sem novo componente de notificação.

## Fase 4 — Criação/gestão de tarefas dentro do projeto

### Frontend
- Novo painel `client/src/components/ProjectTasksPanel.tsx`, renderizado
  dentro de `ProjectHub.tsx` (mesma página onde já vive "Ferramentas do Job").
  Mostra todas as tarefas do projeto (não só as próprias), com avatar/nome do
  responsável, status, prazo.
- Botão "Nova Tarefa" abre `Dialog` (reaproveita `@/components/ui/dialog`, já
  usado em `Team.tsx`/`Collaborators.tsx`) com campos: título, descrição,
  responsável (select populado por `listTeamMembers` do workspace),
  prazo, e opcional "vincular a uma etapa/ferramenta" (select alimentado por
  `WORKFLOW_STAGES`).
- Somente owner/`producer` veem o botão "Nova Tarefa" (Requisito 2.1); demais
  team members veem a lista em modo leitura + podem concluir as suas.

## Fase 5 — Migração de dados `Collaborator` → `Team`

### Script de migração (`scripts/migrate-collaborators-to-team.ts`, rodado
manualmente via `npx tsx`, nunca automático em boot — evita qualquer
surpresa em deploy)
1. Dump: `SELECT * FROM collaborators` → grava JSON em
   `.private/migrations/collaborators-dump-<data>.json` (fora do git, pasta
   já usada para material sensível/histórico neste projeto).
2. Para cada `Collaborator`:
   - Sem `email` válido → pula, adiciona a `report.skipped`.
   - Workspace do owner já tem 5 membros ativos (`MAX_TEAM_MEMBERS_STUDIO`) →
     pula, adiciona a `report.skipped` com motivo `capacity`.
   - Email já existe como `User` → só cria `WorkspaceMember` vinculando esse
     usuário ao workspace do owner original (se ainda não vinculado).
   - Email novo → cria `User` (senha aleatória + `mustResetPassword: true`,
     mesmo padrão de `createTeamMember`) + `WorkspaceMember`.
   - Mapeamento de role livre → `TeamRole`:
     `admin|director|producer` → `producer`; `editor|camera` → `editor`;
     `member` (default) → `viewer`. Papéis fora dessa lista → `viewer` +
     entrada em `report.reviewNeeded`.
3. Ao final, imprime relatório (console + grava
   `.private/migrations/collaborators-migration-report-<data>.json`) com
   contagens de migrados/pulados/revisão manual — decisão de rodar em
   produção é do usuário, script não é destrutivo (não deleta
   `collaborators` nesta fase).
4. `ProjectMember.collaboratorId` existentes continuam intactos nesta fase —
   ficam "órfãos" do ponto de vista de UI nova, mas nada quebra porque
   `Collaborators.tsx`/rotas antigas continuam no ar (Requisito 0.1).

## Fase 6 — Fusão completa Collaborator → Team (REVISADA, Opção B)

### Contexto que mudou o plano original (descoberto ao investigar antes de executar)
O design original assumiu que `Collaborator` era uma agenda isolada de
freelancers. **Não é.** `Collaborator` também é a espinha dorsal de "membros
de projeto":
- `ProjectMember.collaboratorId` é FK direta para `collaborators`.
- `projectMembersController` (add/list/update/remove membro de projeto)
  depende de `collaboratorId`.
- `ProjectHub` lê `/api/project-members/projects/:id` para a stat "EQUIPE".
- `analyticsController` conta `collaborators` para stats de equipe.

**Estado real dos dados (verificado 12-jul):** produção tem **0
collaborators e 0 project_members** — a migração de dados é no-op e não há
risco de perda. Isso viabiliza a fusão completa com segurança.

**Decisões de produto confirmadas pelo usuário:**
- Opção B: fundir de vez, eliminar o conceito de freelancer-sem-login.
- Opção 2 para membros de projeto: manter `project_members`, mas vinculado
  por `userId` (team member) em vez de `collaboratorId`. Alocar team members
  ao projeto explicitamente; tarefas são atribuídas dentro disso.

### Execução em 3 checkpoints (cada um aditivo/reversível até o 6-C)

**Checkpoint 6-A — Membros de projeto por `userId` (100% ADITIVO, nada removido)**
- `projectMembersController`: `addProjectMember` passa a aceitar `userId`
  (team member do workspace, validado via `getTeamMemberContext`/roster do
  owner+membros ativos). `listProjectMembers` inclui dados do `user`
  (`select name/email`) além de `collaborator`. `serializeMember` lida com
  ambos. `collaboratorId` continua funcionando em paralelo (não quebra nada).
- `api.ts`: bloco `projectMembers` (list/add/update/remove).
- `ProjectHub`: nova seção "Equipe do Projeto" — lista membros (nome/role) e
  permite alocar um team member (select de `assignable-members`, reusado) e
  remover. Owner/producer gerenciam.
- `analyticsController`: a stat de equipe passa a contar membros ativos do
  workspace (`workspace_members` role≠owner status=active) em vez de
  `collaborators`.
- Checkpoint: check + test + build + commit + push + deploy. `collaborators`
  e `/collaborators` continuam intactos e funcionais.

**Checkpoint 6-B — Remover a UI/rota de `/collaborators` (reversível via git)**
- Remove aba "Equipe Externa" de `ProductionNav.tsx` (`SECONDARY_TABS`).
- Remove rota `/collaborators` e `/project/:id/collaborators` de `App.tsx`;
  deleta `Collaborators.tsx`, `collaboratorsController.ts`,
  `server/routes/collaborators.ts`; remove `getCollaboratorProjects` de
  `projectMembersController` + sua rota.
- Repontar `WORKFLOW_STAGES` (`production.actions.team.route`) de
  `/project/:id/collaborators` → seção de equipe/tarefas do `ProjectHub`.
- Reescrever `collaborationSettings.test.ts` para não depender de
  `collaboratorsController` (cobrir project members por `userId`).
- Remove bloco `api.collaborators` do `api.ts` e mock em `setup.ts`.
- Checkpoint: check + test + build + commit + push + deploy. A tabela
  `collaborators` ainda existe no banco (órfã), mas nada no código a usa.

**Checkpoint 6-C — DROP destrutivo (SÓ com autorização explícita do usuário)**
- Schema: remove `model Collaborator` + `collaboratorId`/relação de
  `ProjectMember` + relação `collaborators` de `User`.
- Migration: `ALTER TABLE project_members DROP CONSTRAINT ...collaborator_id_fkey`,
  `DROP COLUMN collaborator_id`, `DROP TABLE collaborators`.
- Espelho SQLite (`db.ts`): remover coluna/tabela equivalente.
- Dump de segurança já é gerado pelo script da Fase 5 antes de qualquer
  operação (produção tem 0 registros, mas a regra se mantém).
- Checkpoint: check + test + build + commit + push + deploy + confirmar
  `/collaborators` → 404 e nenhuma outra tela quebrada.

## Testes
- `server/services/taskService.test.ts` (novo): CRUD, autorização (403 para
  quem não é owner/criador/responsável), validação de `assigneeUserId` fora
  do workspace (400), cascade delete.
- `client/src/test/MyTasksPanel.test.tsx` e
  `client/src/test/ProjectTasksPanel.test.tsx` (novos): render de lista,
  estado vazio, ação de concluir.
- Atualizar `client/src/test/translations.test.ts` continua cobrindo
  automaticamente as novas chaves `app.tasks.*` (é um teste genérico por
  regex, não precisa de caso novo).
- Script de migração (Fase 5) testado localmente contra SQLite antes de
  qualquer execução em produção; não entra na suite automática (é
  ferramenta operacional, não funcionalidade do produto).

## Rollback por fase
- Fases 1-4: `git revert` do commit da fase + (se necessário) migration
  `down` correspondente — nenhuma delas altera dado existente, então rollback
  é seguro a qualquer momento.
- Fase 5: não destrutiva, portanto não precisa rollback de dado — só de
  código, se necessário.
- Fase 6: é a única com risco real; por isso exige confirmação explícita
  antes de rodar, e o dump da Fase 5 é o plano de recuperação caso algo saia
  errado.
