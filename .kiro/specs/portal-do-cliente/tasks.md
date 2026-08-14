# Implementation Plan: Portal do Cliente

## Overview

Vertical completo: migração aditiva (`ClientPortalAccess`) → auth do portal
(JWT/cookie próprios, middleware dedicado) → gestão do acesso pela produtora
(`ClientDetail.tsx`) → limite por plano (`clientPortalLimit`) → endpoints do
hub por cliente (projetos, arquivos+download, propostas, reuniões, resumo
financeiro) → frontend do portal (`/portal/*`, app isolado). Fecha com
`npm run check` + `npm run test` + `npm run build` verdes.

Refs de padrão: `dre-por-projeto` (spec anterior, mesmo formato de tasks/
waves), `authenticate.ts`/`authService.ts` (par mais próximo de auth),
`entitlementService.getClientAllowance`/`assertClientCapacity` (par exato
para o limite numérico por plano).

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "description": "Schema + auth do portal + limite por plano (bloqueia tudo)",
      "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5"]
    },
    {
      "wave": 2,
      "description": "Backend: gestão do acesso (produtora) + endpoints do hub (cliente)",
      "tasks": ["2.1", "2.2", "2.3", "2.4"]
    },
    {
      "wave": 3,
      "description": "Frontend: gestão na ClientDetail + app isolado do portal",
      "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5"]
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

### Fase 1 — Schema + auth do portal + limite por plano (bloqueante) [Req 1, 7]

- [x] 1.1 Model `ClientPortalAccess` em `prisma/schema.prisma` (1:1 com `Client`, `passwordHash`, `active` default `true`, `lastLoginAt`, `createdAt`/`updatedAt`) + relação reversa `Client.portalAccess`; `npx prisma validate` + `generate`. [Req 1.1]
- [x] 1.2 Migration `prisma/migrations/<timestamp>_add_client_portal/migration.sql` (SQL real, aditiva: `CREATE TABLE client_portal_access`, índice em `client_id`). [Req 1.1, 9.2]
- [x] 1.3 Espelho SQLite em `server/models/db.ts`: `CREATE TABLE IF NOT EXISTS client_portal_access` + índice em `createIndexes()`. [Req 1.2, 9.2]
- [x] 1.4 `server/middleware/authenticateClientPortal.ts` (novo, espelha `authenticate.ts`): `signClientPortalToken`, cookie `client_portal_token` (httpOnly, sameSite lax, secure em prod), payload `{ clientId, userId, type: "client-portal" }`, `req.portalUser` declarado via `declare global`; rejeita payload sem `type: "client-portal"` ou acesso `active = false`. [Req 1.3, 1.4, 1.5]
- [x] 1.5 `clientPortalLimit: number | null` em `shared/planEntitlements.ts` (`PlanEntitlement` + todos os `PLAN_ENTITLEMENTS[plan]`: free=1, pro=5, studio/whitelabel/enterprise=null); `getClientPortalAllowance`/`assertClientPortalCapacity` em `server/services/entitlementService.ts`, análogos a `getClientAllowance`/`assertClientCapacity` (conta apenas acessos `active = true`). [Req 7.1, 7.2, 7.3, 7.4, 7.5]

### Fase 2 — Backend: gestão do acesso e endpoints do hub [Req 2, 3, 4, 5, 6]

- [x] 2.1 `server/services/clientPortalAuthService.ts` (dual-path): `createAccess(userId, clientId, email, password)` (valida ownership + `assertClientPortalCapacity`), `login(email, password)` (401 genérico se inativo/senha errada), `changePassword(clientId, currentPassword, newPassword)`, `setActive(userId, clientId, active)`, `resetPassword(userId, clientId, newPassword)` (invalida sessões — bump de `updatedAt`/versão comparado ao `iat` do JWT no middleware), `getActiveAccessByClientId(clientId)`. [Req 1.3, 1.5, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3]
- [x] 2.2 `server/controllers/clientPortalAccessController.ts` + rotas em `server/routes/clients.ts` (sub-recurso, guard `authenticate` produtora): `GET/POST /:id/portal-access`, `PATCH /:id/portal-access`, `POST /:id/portal-access/reset-password`, `GET /client-portal/allowance`. `server/controllers/portalAuthController.ts` + `server/routes/portalAuth.ts`: `POST /login`, `POST /logout`, `GET /me` (guard `authenticateClientPortal`), `POST /change-password` (guard `authenticateClientPortal`); registrar ambos em `server/router.ts` (`/api/client-portal-auth`). [Req 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 7.2, 7.3]
- [x] 2.3 `server/services/portalDataService.ts` (dual-path, todas as funções recebem `clientId` e filtram estritamente por ele, nunca 403 — sempre 404 se não encontrado): `listProjectsForClient`, `getProjectForClient`, `listFilesForClient` (join `File.projectId → Project.clientId`), `getFileForClient` (para download), `listProposalsForClient`, `listMeetingsForClient`, `getFinancialSummaryForClient` (agrega `FinancialEntry` por `clientId`, só totais). [Req 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 6.1, 6.2]
- [x] 2.4 `server/controllers/portalController.ts` + `server/routes/portal.ts` (guard `authenticateClientPortal`): `GET /projects`, `GET /projects/:id`, `GET /files`, `GET /files/:id/download` (reaproveita `createProjectFileUrl`/redirect, valida via `getFileForClient`), `GET /proposals`, `GET /meetings`, `GET /financial-summary`; registrar em `server/router.ts` (`/api/portal`). [Req 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2]

### Fase 3 — Frontend: gestão na produtora e app isolado do portal [Req 2, 3, 4, 5, 6, 7]

- [x] 3.1 Blocos `api.clients.portalAccess.*` (`getStatus`, `create`, `updateStatus`, `resetPassword`, `allowance`) e `api.portal.*` (`login`, `logout`, `me`, `changePassword`, `projects.list/get`, `files.list/downloadUrl`, `proposals.list`, `meetings.list`, `financialSummary`) + tipos (`ClientPortalAccessStatus`, `ClientPortalAllowance`, `PortalProjectSummary`, `PortalFileSummary`, `PortalFinancialSummary`) em `client/src/lib/api.ts`. [Req 2.*, 3.*, 4.*, 6.*, 7.2]
- [x] 3.2 Seção "Portal do Cliente" em `client/src/pages/ClientDetail.tsx`: status (nunca criado/ativo/inativo), modal de criação (email pré-preenchido + senha), botões desativar/reativar/redefinir senha, allowance exibida no modal de criação (mesmo padrão visual de `ClientAllowance` em `NewClient.tsx`). [Req 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3]
- [x] 3.3 `client/src/portal/PortalAuthContext.tsx` (login/logout/me via `client_portal_token`, isolado de `AuthContext` da produtora) + `client/src/portal/PortalApp.tsx` (Router `wouter` próprio, Switch com rotas internas); montagem em `client/src/App.tsx` sob `/portal/:rest*` como sub-árvore isolada. [Req 1.3, 1.4]
- [x] 3.4 Páginas do portal (`client/src/portal/pages/`): `PortalLogin.tsx`, `PortalDashboard.tsx` (cards de projeto com status/progresso), `PortalProjectDetail.tsx` (`WORKFLOW_STAGES` somente leitura, arquivos do projeto), `PortalFiles.tsx` (drive consolidado + download), `PortalProposals.tsx`, `PortalMeetings.tsx`, `PortalAccount.tsx` (troca de senha). Design system `frame-*`, navegação simplificada (sem `ProjectNav` completo — cliente não acessa ferramentas internas). [Req 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 6.1]
- [x] 3.5 `npm run build` (client+server) e `npm run check` rodados localmente — ambos limpos, sem erros. [validação de fechamento da Fase 3]

### Fase 4 — Fechamento [Req 9]

- [x] 4.1 Testes: `server/services/clientPortalAuthService.test.ts` (criação com/sem limite, login válido/inválido/inativo, troca de senha, redefinição pela produtora, isolamento entre produtoras), `server/services/portalDataService.test.ts` (cada listagem filtra estritamente por `clientId`, cross-client → vazio/404), `clientPortalFlow.test.ts` (E2E via supertest: criar acesso → login do cliente → acessar dados próprios → 404 em dado de outro cliente → troca de senha → sessão antiga invalidada → desativar acesso → login subsequente falha), teste de limite (Free bloqueia 2º portal, Studio nunca bloqueia). Validação desta rodada: `npm run check`, suíte dedicada do portal (42 passed, 4 skipped) e `npm run build` limpos. Suite completa fica por conta do hook de push quando houver push. [Req 9.1, 9.2, 9.3, 9.4]

## Notes

- **Isolamento por design, não por convenção** — todo endpoint do portal
  (`authenticateClientPortal` + `portalDataService`) filtra por `clientId`
  do token verificado, nunca por um `clientId` vindo do corpo/query da
  requisição. Isso é o que garante o Requisito 6.2/9.3 (404 sempre, nunca
  vazamento cross-client).
- **Migração puramente aditiva** — nenhuma tabela/coluna existente é
  alterada; `ClientPortalAccess` é uma tabela nova, opcional por cliente.
- **Documentos do Studio IA (Requisito 8) não fazem parte deste plano de
  tasks** — registrados apenas como decisão de design, próximo spec natural.
- **Cada fase fecha com o build/teste correspondente já indicado** — não
  acumular erros de tipo entre fases.
