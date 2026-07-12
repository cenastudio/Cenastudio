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

## Fase 6 — Remoção de `/collaborators` (destrutiva — requer autorização explícita do usuário antes de iniciar)

- [ ] 6.1 Remover tab "Equipe Externa" de `ProductionNav.tsx`
      (`SECONDARY_TABS`). _Requisito 6.1_
- [ ] 6.2 Remover rota `/collaborators` de `App.tsx`,
      `Collaborators.tsx`, `collaboratorsController.ts`,
      `server/routes/collaborators.ts`, `server/routes/projectMembers.ts`
      (endpoint `getCollaboratorProjects`, se não usado por mais nada).
      _Requisito 6.1_
- [ ] 6.3 Atualizar `WORKFLOW_STAGES` (`production.actions.team.route`) para
      apontar para a nova seção de equipe/tarefas em vez de
      `/project/:id/collaborators`. _Requisito 6.4_
- [ ] 6.4 Migration final `DROP TABLE collaborators` (só depois de 5.3
      confirmada e dump salvo). _Requisito 5.5, 5.6, 0.2_
- [ ] Checkpoint fase 6: `npm run check && npm run test && npm run build`.
      Confirmar em produção que `/collaborators` retorna 404 esperado e que
      nenhuma outra tela quebrou. Commit + push + deploy `SUCCESS`.

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
