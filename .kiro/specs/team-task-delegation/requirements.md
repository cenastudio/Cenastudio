# Requirements Document

## Introduction

Hoje existem dois conceitos paralelos e confusos: `Collaborator` (agenda de
freelancers sem login, CRUD isolado, campos de diária/skills nunca usados em
nenhum fluxo real) e `Team` (contas de login reais, restrito a plano Studio,
sem nenhuma forma de atribuir trabalho a um membro depois de criado). Nenhum
dos dois resolve o problema real do estúdio: **delegar demandas específicas
dentro de um projeto para quem vai executá-las** — o câmera sabe o que gravar,
o editor sabe o que editar, financeiro sabe o que fazer, comercial sabe o que
fazer.

Este spec:
1. Extingue o conceito de "freelancer sem login" (`Collaborator`) e funde tudo
   em `Team` (login interno).
2. Introduz **Tarefas** (delegação de demanda): título, descrição, responsável
   (sempre um membro de Team), prazo, status, com vínculo opcional a uma etapa
   do workflow (`WORKFLOW_STAGES`) ou a uma ferramenta (`toolSlug`).
3. Dá ao membro designado uma visão própria ("Minhas Tarefas") e notificação
   dentro do projeto quando uma tarefa é atribuída a ele.

Objetivo de negócio: o estúdio abre um projeto, distribui responsabilidades
por função, e cada pessoa da equipe sabe exatamente o que fazer sem depender
de mensagem por WhatsApp fora do sistema.

**Restrição inegociável do usuário:** a migração deve ocorrer em fases
aditivas. Nenhuma fase pode quebrar funcionalidade existente em produção —
`/collaborators`, `Team`, `ProjectMember` continuam operando normalmente até a
fase em que forem explicitamente substituídos, e mesmo aí sem perda de dado
(dados de `Collaborator` migram para `Team`/`WorkspaceMember`, nunca são
apagados sem backup).

## Glossary

- **Team member:** usuário com conta de login vinculada a um `Workspace` via
  `WorkspaceMember` (ver `teamService.ts`). Substitui totalmente o conceito de
  "colaborador externo sem login".
- **Tarefa (Task):** unidade de trabalho atribuída a exatamente um team member
  dentro de um projeto. Pode ou não estar vinculada a uma etapa/ferramenta do
  workflow.
- **Vínculo de workflow:** referência opcional de uma Tarefa a um
  `WorkflowStageId` e/ou `toolSlug` já definidos em `client/src/lib/workflow.ts`.
- **Dual-path:** padrão `if (shouldUsePrisma) {Prisma} else {SQLite}` usado em
  todos os controllers do projeto — mantido neste spec.

## Requirements

### Requisito 0 — Fases aditivas, zero downtime, zero perda de dado (transversal, bloqueante)

**User Story:** Como operador do sistema, quero que cada fase desta feature
seja aditiva e reversível, para que a produção nunca fique com funcionalidade
quebrada entre uma fase e outra.

#### Acceptance Criteria
1. WHILE qualquer fase estiver em andamento THEN as rotas e páginas existentes
   (`/collaborators`, `/team`, `ProjectNav`, `ProductionNav`) SHALL continuar
   respondendo 200 e funcionando como hoje, até serem explicitamente
   substituídas em uma fase posterior.
2. WHEN uma migration de banco for aplicada THEN ela SHALL ser puramente
   aditiva (novas tabelas/colunas), nunca `DROP TABLE`/`DROP COLUMN` de dados
   com registros existentes, em nenhuma fase anterior à fase final de limpeza.
3. WHEN a fase de migração de dados de `Collaborator` → `Team` executar THEN o
   sistema SHALL preservar uma cópia dos registros originais (dump JSON antes
   da migração) antes de qualquer alteração destrutiva.
4. WHERE uma fase depende de outra (ex.: UI de tarefas depende do model
   `Task` existir) THE tasks.md SHALL ordenar a execução para que a
   dependência seja sempre implementada primeiro.
5. AFTER cada fase THEN `npm run check`, `npm run test` (suite completa) e
   `npm run build` SHALL passar antes de prosseguir para a próxima fase.
6. WHEN cada fase for concluída THEN o código SHALL ser commitado, enviado
   (push) e o deploy Railway confirmado com `SUCCESS` antes de iniciar a fase
   seguinte.

---

### Requisito 1 — Modelo de dados: Task (P0)

**User Story:** Como sistema, preciso de uma tabela `Task` que modele uma
demanda atribuída a um team member dentro de um projeto, com vínculo opcional
ao workflow.

#### Acceptance Criteria
1. WHEN uma Tarefa é criada THEN o sistema SHALL persistir: `projectId`,
   `assigneeUserId` (sempre um `User` que é team member ou owner),
   `createdByUserId`, `title`, `description` (opcional), `dueDate` (opcional),
   `status` (`pending`|`in_progress`|`done`), `stageId` (opcional,
   `WorkflowStageId`), `toolSlug` (opcional), `createdAt`, `updatedAt`.
2. WHERE `toolSlug` está preenchido THE sistema SHALL validar que o slug
   existe em algum `WorkflowStage.actions` conhecido (validação de aplicação,
   não FK de banco, já que `workflow.ts` é estático no frontend).
3. WHEN uma Tarefa referencia `stageId` sem `toolSlug` THEN o sistema SHALL
   aceitar (vínculo à etapa inteira, não a uma ferramenta específica).
4. WHEN nem `stageId` nem `toolSlug` são informados THEN o sistema SHALL
   aceitar a Tarefa como "livre" (ex.: "grave a cena 3 até sexta").
5. WHEN o projeto ou o usuário responsável for excluído THEN as Tarefas
   associadas SHALL ser excluídas em cascata (`onDelete: Cascade`).
6. WHERE o backend precisa rodar sem Postgres disponível THE sistema SHALL
   implementar o espelho SQLite equivalente em `server/models/db.ts`, seguindo
   o padrão dual-path já usado por `budgets`/`equipment`/`shot_lists`.

---

### Requisito 2 — API de Tarefas (P0)

**User Story:** Como usuário autenticado (owner ou team member), quero
criar, listar, atualizar e concluir tarefas de um projeto via API.

#### Acceptance Criteria
1. WHEN o owner (ou team member com permissão) cria uma tarefa em um projeto
   THEN o sistema SHALL exigir `title` e `assigneeUserId` obrigatórios.
2. IF `assigneeUserId` não for um team member válido do mesmo workspace (nem o
   owner) THEN o sistema SHALL rejeitar com HTTP 400.
3. WHEN uma tarefa é criada THEN o sistema SHALL disparar uma Notification
   (reutilizando o model `Notification` existente) para o `assigneeUserId`.
4. WHEN o usuário lista tarefas de um projeto (`GET /api/projects/:id/tasks`)
   THEN o sistema SHALL retornar todas as tarefas daquele projeto.
5. WHEN o usuário lista suas próprias tarefas (`GET /api/tasks/mine`) THEN o
   sistema SHALL retornar tarefas de todos os projetos onde `assigneeUserId`
   é o usuário autenticado, ordenadas por `dueDate` ascendente (nulos por
   último).
6. WHEN o responsável ou o owner atualiza o `status` de uma tarefa THEN o
   sistema SHALL persistir a mudança e retornar o registro atualizado.
7. IF um usuário que não é o responsável, o criador, nem o owner do projeto
   tentar atualizar/excluir uma tarefa THEN o sistema SHALL rejeitar com HTTP
   403.
8. WHEN uma tarefa é marcada como `done` THEN o sistema SHALL registrar
   `completedAt`.

---

### Requisito 3 — "Minhas Tarefas" (visão do team member) (P1)

**User Story:** Como team member (câmera, editor, financeiro, comercial),
quero ver uma lista das tarefas atribuídas a mim, para saber exatamente o que
tenho que fazer sem depender de mensagem externa.

#### Acceptance Criteria
1. WHEN um team member acessa o Dashboard THEN o sistema SHALL exibir uma
   seção "Minhas Tarefas" com as tarefas pendentes/em andamento atribuídas a
   ele, ordenadas por prazo.
2. WHEN uma tarefa vinculada a `toolSlug` é exibida THEN o sistema SHALL
   incluir um link direto para a ferramenta (`route(projectId)` já definido em
   `WORKFLOW_STAGES`).
3. WHEN o team member marca uma tarefa como concluída na própria visão THEN o
   sistema SHALL refletir a mudança sem exigir navegação para o projeto.
4. WHERE não há tarefas pendentes THE sistema SHALL exibir estado vazio
   consistente com o design system (`frame-*`, sem gráfico fabricado).
5. WHEN o owner acessa o mesmo componente dentro de `ProjectNav`/`ProjectHub`
   THEN o sistema SHALL exibir todas as tarefas do projeto (não só as
   próprias), com indicação visual do responsável de cada uma.

---

### Requisito 4 — Notificação dentro do projeto (P1)

**User Story:** Como team member, quero ser notificado dentro do sistema
quando uma tarefa nova for atribuída a mim.

#### Acceptance Criteria
1. WHEN uma tarefa é criada com `assigneeUserId = X` THEN o sistema SHALL
   criar uma `Notification` para X reutilizando o model/serviço existente
   (`NotificationsPopover`, `server/models` `Notification`).
2. WHEN X abre o `NotificationsPopover` THEN a notificação SHALL exibir o
   título do projeto, o título da tarefa e navegar para o projeto/tarefa ao
   clicar.
3. WHEN a tarefa é reatribuída a outro usuário THEN o sistema SHALL notificar
   o novo responsável e (opcional) informar o antigo que foi removido.

---

### Requisito 5 — Fusão de Collaborator em Team (P2, migração de dados)

**User Story:** Como estúdio que já cadastrou "colaboradores" (freelancers),
quero que esses registros continuem acessíveis depois da fusão, sem perda de
dado, agora como membros de Team.

#### Acceptance Criteria
1. WHILE a fase de migração não foi executada THEN `/collaborators` SHALL
   continuar 100% funcional (requisito 0.1).
2. WHEN a migração de dados executar THEN o sistema SHALL, para cada
   `Collaborator` existente com `email` válido, criar (ou vincular, se já
   existir usuário com aquele email) um `User` + `WorkspaceMember` no
   workspace do dono original, preservando `name`, `email`, e mapeando `role`
   livre de `Collaborator` para o enum fechado de `TeamRole`
   (`producer`|`editor`|`viewer`) via tabela de equivalência definida no
   design; papéis sem equivalência clara SHALL cair em `viewer` por padrão e
   ficar listados em um relatório de migração para revisão manual.
3. WHERE um `Collaborator` não tem `email` válido ou já ultrapassa o limite de
   5 membros do plano Studio (`MAX_TEAM_MEMBERS_STUDIO`) THE sistema SHALL
   pular a migração automática daquele registro e listá-lo em um relatório
   para decisão manual do usuário (não falhar a migração inteira).
4. WHEN a migração executar THEN o sistema SHALL gerar um dump JSON de todos
   os `Collaborator` antes de qualquer alteração (requisito 0.3).
5. AFTER a migração ser validada manualmente pelo usuário THEN uma fase
   separada e explícita SHALL remover a rota `/collaborators` e o item
   "Equipe Externa" da navegação — nunca a mesma fase que migra os dados.
6. A tabela `Collaborator` e suas rotas/controllers SHALL só ser removida do
   schema/código em uma fase final, após confirmação explícita do usuário de
   que não há mais dependência (`ProjectMember.collaboratorId` também precisa
   de plano de migração, coberto no design).

---

### Requisito 6 — Navegação e nomenclatura (P2)

**User Story:** Como usuário do sistema, quero que a navegação reflita o
conceito único de "Equipe" sem duplicar termos ambíguos.

#### Acceptance Criteria
1. AFTER a fase 5 (fusão) ser concluída THEN o item "Equipe Externa" SHALL
   sumir de `ProductionNav`, restando apenas "Equipe" apontando para a
   experiência unificada.
2. WHEN o owner acessa "Equipe" THEN o sistema SHALL continuar oferecendo a
   criação/gestão de membros (herdado de `Team.tsx`), agora também com acesso
   à criação de Tarefas por membro.
3. WHERE cabia no design aprovado, a gestão de Equipe SHALL ficar acessível a
   partir de "Configurar Estúdio" (`/company`), consolidando a hierarquia já
   sugerida pelo botão existente ali (decisão final registrada no design.md).
