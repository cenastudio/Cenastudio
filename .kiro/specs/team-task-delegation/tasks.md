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

## Fase 1 — Model `Task`

- [ ] 1.1 Adicionar `model Task` em `prisma/schema.prisma` + relações
      `tasksAssigned`/`tasksCreated` em `User` e `tasks` em `Project`.
      _Requisito 1.1, 1.5_
- [ ] 1.2 Gerar migration `prisma/migrations/<ts>_add_tasks/migration.sql`
      seguindo o padrão de `20260711070000_add_time_entries` (CREATE TABLE +
      índices + FKs cascade). _Requisito 1.1, 1.5_
- [ ] 1.3 Adicionar espelho `CREATE TABLE IF NOT EXISTS tasks` em
      `server/models/db.ts` + índices em `createIndexes()`. _Requisito 1.6_
- [ ] 1.4 Criar `server/lib/workflowStages.ts` com a lista de `stageId`/
      `toolSlug` válidos (réplica server-side de `client/src/lib/workflow.ts`,
      seguindo o padrão já existente de duplicação client/server no projeto).
      _Requisito 1.2_
- [ ] Checkpoint fase 1: `npm run check && npm run test && npm run build`,
      aplicar migration localmente (SQLite) e validar `prisma migrate deploy`
      dry-run. Commit + push + confirmar deploy Railway `SUCCESS`. Nenhuma
      rota nova exposta ainda — puramente aditivo e invisível.

---

## Fase 2 — API de Tarefas

- [ ] 2.1 Criar `server/services/taskService.ts` (dual-path): `createTask`,
      `listTasksByProject`, `listMyTasks`, `updateTaskStatus`, `reassignTask`,
      `deleteTask`, com validação de `assigneeUserId` pertencer ao workspace
      (reaproveitar `getOwnerWorkspaceId`/`listTeamMembers` de
      `teamService.ts`). _Requisito 2.1, 2.2, 2.6_
- [ ] 2.2 Criar `server/controllers/taskController.ts` com serialização
      `withSnakeCase`, autorização (403 para quem não é
      owner/criador/responsável). _Requisito 2.7_
- [ ] 2.3 Criar `server/routes/tasks.ts` (`GET/POST
      /api/projects/:projectId/tasks`, `GET /api/tasks/mine`, `PATCH/DELETE
      /api/tasks/:id`) e registrar em `server/index.ts`. _Requisito 2.4, 2.5_
- [ ] 2.4 Disparar `Notification` (`type: "task_assigned"`) ao criar/
      reatribuir tarefa, reaproveitando o serviço de notificação existente.
      _Requisito 2.3, 4.1, 4.3_
- [ ] 2.5 Escrever `server/services/taskService.test.ts` cobrindo CRUD,
      autorização, validação de assignee fora do workspace, cascade delete.
      _Requisito 2.2, 2.7_
- [ ] Checkpoint fase 2: `npm run check && npm run test && npm run build`.
      Testar rotas via curl em produção após deploy (sem UI ainda consumindo
      — API fica disponível mas não referenciada por nenhuma tela existente,
      portanto zero risco de regressão). Commit + push + deploy `SUCCESS`.

---

## Fase 3 — "Minhas Tarefas" + notificação

- [ ] 3.1 Criar `client/src/components/MyTasksPanel.tsx` (lista `GET
      /api/tasks/mine`, concluir inline, link para ferramenta/etapa via
      `WORKFLOW_STAGES`, estado vazio no padrão `frame-*`). _Requisito 3.1,
      3.2, 3.3, 3.4_
- [ ] 3.2 Inserir `MyTasksPanel` no `Dashboard.tsx`. _Requisito 3.1_
- [ ] 3.3 Adicionar `case "task_assigned"` em `NotificationsPopover.tsx`
      (título do projeto + título da tarefa + navegação ao clicar).
      _Requisito 4.2_
- [ ] Checkpoint fase 3: `npm run check && npm run test && npm run build`.
      Validar manualmente com um team member de teste em produção (criar
      tarefa via API, confirmar que aparece no Dashboard e na notificação).
      Commit + push + deploy `SUCCESS`.

---

## Fase 4 — Gestão de tarefas dentro do projeto

- [ ] 4.1 Criar `client/src/components/ProjectTasksPanel.tsx` (lista todas as
      tarefas do projeto com responsável/status/prazo; botão "Nova Tarefa"
      visível só para owner/`producer`). _Requisito 3.5, 2.1_
- [ ] 4.2 Dialog de criação/edição de tarefa (título, descrição, responsável
      via `listTeamMembers`, prazo, vínculo opcional a etapa/ferramenta via
      `WORKFLOW_STAGES`). _Requisito 1.2, 1.3, 1.4_
- [ ] 4.3 Inserir `ProjectTasksPanel` em `ProjectHub.tsx`. _Requisito 3.5_
- [ ] Checkpoint fase 4: `npm run check && npm run test && npm run build`.
      Fluxo completo testado em produção (owner cria tarefa → assignee recebe
      notificação → assignee conclui no Dashboard). Commit + push + deploy
      `SUCCESS`.

---

## Fase 5 — Migração de dados `Collaborator` → `Team` (não destrutiva)

- [ ] 5.1 Escrever `scripts/migrate-collaborators-to-team.ts`: dump JSON em
      `.private/migrations/`, criação de `User`+`WorkspaceMember` por
      `Collaborator` elegível, mapeamento de role, relatório de
      pulados/revisão manual. _Requisito 5.2, 5.3, 5.4_
- [ ] 5.2 Rodar o script localmente contra cópia de dados de produção (dump),
      revisar relatório manualmente com o usuário antes de qualquer execução
      real. _Requisito 5.2, 5.3_
- [ ] 5.3 Rodar o script em produção (após aprovação explícita do usuário),
      validar contagem migrados/pulados, guardar dump + relatório.
      _Requisito 5.4_
- [ ] Checkpoint fase 5: `/collaborators` continua funcionando normalmente
      (nada removido ainda). Nenhum build/deploy de código necessário nesta
      fase além do script — mas se o script for adicionado ao repo, rodar
      `npm run check` mesmo assim. Commit + push do script.

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
