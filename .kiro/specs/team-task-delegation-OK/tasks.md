# Implementation Plan: Team Task Delegation

## Overview

Fusão de "Collaborator" (freelancer sem login) em "Team" (login interno) +
introdução de Tarefas (delegação de demanda dentro de um projeto). Execução
em 6 fases **estritamente sequenciais** — cada fase fecha com
`npm run check` + `npm run test` + `npm run build` verdes, commit, push e
deploy Railway `SUCCESS` confirmado antes de abrir a próxima. Nenhuma fase
(exceto a 6, explicitamente autorizada) remove ou altera dado existente.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "description": "Model Task (schema + SQLite mirror)", "tasks": ["1.1","1.2","1.3","1.4"] },
    { "wave": 2, "description": "API de Tarefas", "tasks": ["2.1","2.2","2.3","2.4","2.5"] },
    { "wave": 3, "description": "Minhas Tarefas + notificação", "tasks": ["3.1","3.2","3.3"] },
    { "wave": 4, "description": "Gestão de tarefas dentro do projeto", "tasks": ["4.1","4.2","4.3"] },
    { "wave": 5, "description": "Migração de dados Collaborator -> Team (não destrutiva)", "tasks": ["5.1","5.2","5.3"] },
    { "wave": 6, "description": "Remoção de /collaborators (destrutiva, requer autorização explícita)", "tasks": ["6.1","6.2","6.3","6.4"] }
  ]
}
```

---

## Fase 1 — Model `Task` ✅ CONCLUÍDA (commit 3cf78d3)

- [x] 1.1 Adicionar `model Task` em `prisma/schema.prisma` + relações
      `tasksAssigned`/`tasksCreated` em `User` e `tasks` em `Project`.
      _Requisito 1.1, 1.5_
- [x] 1.2 Gerar migration `prisma/migrations/20260711080000_add_tasks/migration.sql`
      seguindo o padrão de `20260711070000_add_time_entries` (CREATE TABLE +
      índices + FKs cascade). _Requisito 1.1, 1.5_
- [x] 1.3 Adicionar espelho `CREATE TABLE IF NOT EXISTS tasks` em
      `server/models/db.ts` + índices em `createIndexes()`. _Requisito 1.6_
- [x] 1.4 Criar `server/lib/workflowStages.ts` com a lista de `stageId`/
      `toolSlug` válidos (réplica server-side de `client/src/lib/workflow.ts`,
      seguindo o padrão já existente de duplicação client/server no projeto).
      _Requisito 1.2_
- [x] Checkpoint fase 1: check + test + build verdes, migration aplicada em
      produção via `prisma migrate deploy`, commit + push + deploy `SUCCESS`.

---

## Fase 2 — API de Tarefas ✅ CONCLUÍDA (commit 52100e6)

- [x] 2.1 `server/services/taskService.ts` (dual-path): createTask,
      listTasksByProject, listMyTasks, updateTask, deleteTask +
      listAssignableMembers (add. na Fase 4). _Requisito 2.1, 2.2, 2.6_
- [x] 2.2 `server/controllers/taskController.ts` com `withSnakeCase` +
      autorização (403). _Requisito 2.7_
- [x] 2.3 `server/routes/tasks.ts` sob `/api/tasks/*` (namespace próprio para
      não colidir com `/api/projects/:id`), registrado em `router.ts`.
      _Requisito 2.4, 2.5_
- [x] 2.4 Notificação `task_assigned` via `notifyUser` ao criar/reatribuir.
      _Requisito 2.3, 4.1, 4.3_
- [x] 2.5 `server/services/taskService.test.ts` (14 testes). _Requisito 2.2, 2.7_
- [x] Checkpoint fase 2: check + test + build verdes, rotas testadas via curl
      em produção, commit + push + deploy `SUCCESS`.

---

## Fase 3 — "Minhas Tarefas" + notificação ✅ CONCLUÍDA (commit d82d449)

- [x] 3.1 `client/src/components/MyTasksPanel.tsx` + helper
      `getRouteForTaskLink` em `workflow.ts`. _Requisito 3.1, 3.2, 3.3, 3.4_
- [x] 3.2 `MyTasksPanel` inserido no `Dashboard.tsx`. _Requisito 3.1_
- [x] 3.3 `case "task_assigned"` (ícone/cor) em `NotificationsPopover.tsx`.
      _Requisito 4.2_
- [x] Checkpoint fase 3: check + test (1154) + build verdes; notificação
      confirmada em produção; commit + push + deploy `SUCCESS`. (Achado e
      corrigido: mock de `api.tasks` faltava em `setup.ts`.)

---

## Fase 4 — Gestão de tarefas dentro do projeto ✅ CONCLUÍDA (commit 95b7ef8)

- [x] 4.1 `client/src/components/ProjectTasksPanel.tsx` (lista + botão "Nova
      Tarefa" só para owner/producer). _Requisito 3.5, 2.1_
- [x] 4.2 Dialog de criação (título, descrição, responsável via
      `assignable-members`, prazo, vínculo opcional a etapa/ferramenta).
      _Requisito 1.2, 1.3, 1.4_
- [x] 4.3 `ProjectTasksPanel` em `ProjectHub.tsx`; `canManage` via `useAuth`.
      _Requisito 3.5_
- [x] Checkpoint fase 4: check + test (1159) + build verdes; endpoint
      `assignable-members` testado em produção; commit + push + deploy
      `SUCCESS`.

---

## Fase 5 — Migração de dados `Collaborator` → `Team` (não destrutiva) ✅ CONCLUÍDA

- [x] 5.1 `scripts/migrate-collaborators-to-team.ts`: dump JSON em
      `.private/migrations/` antes de tudo, criação/vínculo de
      `User`+`WorkspaceMember` por `Collaborator` elegível, mapeamento de role
      (`server/lib/collaboratorRoleMap.ts`, com teste), relatório de
      migrados/vinculados/pulados/revisão. Dry-run por padrão, `--apply` para
      execução real (com confirmação interativa). _Requisito 5.2, 5.3, 5.4_
- [x] 5.2 `mapCollaboratorRole` coberto por teste automático
      (`collaboratorRoleMap.test.ts`, 4 casos). Dry-run real executado contra
      o Postgres de produção — conexão, leitura, dump e relatório OK.
      _Requisito 5.2, 5.3_
- [x] 5.3 **Descoberta:** produção tem **0 colaboradores** (foram limpos em
      sessão anterior de limpeza de dados). A migração real é um **no-op** —
      não há dado a migrar. O script fica pronto e validado caso apareçam
      dados no futuro. _Requisito 5.4_
- [x] Checkpoint fase 5: `/collaborators` intacto; check + test (1163) +
      build verdes; script é ferramenta operacional (não altera runtime do
      servidor — `dist/index.js` inalterado). Commit do script.

> **Nota para a Fase 6:** como produção tem 0 colaboradores, o `DROP TABLE
> collaborators` da Fase 6 é seguro (sem perda de dado real). Ainda assim,
> exige autorização explícita do usuário antes de rodar, conforme Requisito
> 5.5/0.2.

---

## Fase 6 — Fusão completa Collaborator → Team (Opção B + Opção 2, 3 checkpoints)

> Revisada após investigação: `Collaborator` sustenta o sistema de membros de
> projeto (`ProjectMember.collaboratorId`, `projectMembersController`,
> analytics). Produção tem 0 collaborators e 0 project_members → sem risco de
> perda. Ver design.md seção "Fase 6" para o racional completo.

### Checkpoint 6-A — Membros de projeto por `userId` (aditivo) ✅ CONCLUÍDO (commit ce62d53)
- [x] 6A.1 `projectMembersController`: `addProjectMember` aceita `userId`
      (team member do workspace, validado); `listProjectMembers` inclui
      dados do `user`; `serializeMember` lida com user e collaborator.
      `collaboratorId` continua funcionando em paralelo.
- [x] 6A.2 `api.ts`: bloco `projectMembers` + mock em `setup.ts`.
- [x] 6A.3 `ProjectHub`: seção "Equipe" (listar/alocar/remover team member;
      select via `assignable-members`).
- [x] 6A.4 `analyticsController`: stat de equipe conta `workspace_members`
      ativos (role≠owner) em vez de `collaborators`.
- [x] Checkpoint 6-A: check + test (1163) + build ok; testado em produção
      (add/list/remove por userId funcionando). Commit + push + deploy
      `SUCCESS`.

### Checkpoint 6-B — Remover UI/rota de `/collaborators` ✅ CONCLUÍDO (reversível via git)
- [x] 6B.1 Removida aba "Equipe Externa" de `ProductionNav.tsx`.
- [x] 6B.2 Removidas rotas `/collaborators` e `/project/:id/collaborators`
      de `App.tsx`; deletados `Collaborators.tsx`, `collaboratorsController.ts`,
      `server/routes/collaborators.ts`; removido `getCollaboratorProjects` +
      rota. Também corrigidas 4 referências residuais não previstas no plano
      original: `Breadcrumbs.tsx`, `CommandPalette.tsx` (repontado p/ `/team`),
      `JourneyBreadcrumb.tsx` (2 ocorrências), `AppNavBar.tsx` (productionRoutes).
- [x] 6B.3 Repontado `WORKFLOW_STAGES` (`production.actions.team.route` →
      `/project/:id`; removida referência a `/collaborators` em
      `getStageForLocation`).
- [x] 6B.4 Reescrito `collaborationSettings.test.ts` (project members via
      `teamService.createTeamMember` + `userId`, sem `collaboratorsController`;
      +1 teste novo de rejeição de userId fora do workspace). Removidos 2
      testes de `operationsUx.test.tsx` que só testavam a página deletada.
- [x] Checkpoint 6-B: check + test (1161) + build ok (`dist/index.js`
      619.7kb → 609.6kb, confirma remoção real de código). Commit + push +
      deploy `SUCCESS`. Tabela `collaborators` órfã no banco mas nada no
      código a usa.

### Checkpoint 6-C — DROP destrutivo ✅ CONCLUÍDO (commit f856ed0, autorizado pelo usuário)
- [x] 6C.1 Schema: removido `model Collaborator`, `collaboratorId`/relação de
      `ProjectMember` (fica só `userId`), relação `collaborators` de `User`.
- [x] 6C.2 Migration `20260712190000_drop_collaborators`: drop FK + drop
      index + `DROP COLUMN collaborator_id` + `DROP TABLE collaborators`;
      espelho SQLite atualizado (tabela, coluna, função
      `ensureCollaboratorColumns`, índices removidos).
- [x] Reescrito `projectMembersController.ts` sem o legacy path de
      `collaboratorId`. Removidos tipos órfãos `DbCollaborator` e
      `collaborator_id`/`collaborator_role` de `DbProjectMember`/
      `ProjectMemberItem`.
- [x] Checkpoint 6-C: check + test (1182) + build ok (`dist/index.js`
      609.6kb → 604.7kb). Migration aplicada e confirmada em produção
      (`collaborators` não existe mais; `project_members` sem
      `collaborator_id`). Membros de projeto criados na Fase 6-A (por
      `userId`) confirmados intactos após o DROP. Commit + push + deploy
      `SUCCESS`. _Requisito 5.5, 5.6, 0.2_

## Spec concluído — 6 de 6 fases entregues.

---

## Notas de execução
- Cada checkpoint é um gate: não avançar de fase sem os três comandos verdes
  e o deploy confirmado.
- Fases 1-4 não requerem nenhuma decisão adicional do usuário — podem ser
  executadas em sequência direta.
- Fase 5 requer aprovação do relatório antes do passo 5.3 (dado real de
  produção sendo alterado).
- Fase 6 requer autorização explícita e separada antes de 6.4 especificamente
  (`DROP TABLE`), mesmo que 6.1-6.3 já tenham sido aprovadas.
