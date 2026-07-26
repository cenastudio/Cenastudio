# Design — Portal do Cliente

## Overview

Este spec cria uma área autenticada separada para o cliente final da
produtora, com login e sessão próprios, exibindo automaticamente (hub por
cliente) tudo que já está vinculado ao `clientId`: projetos, arquivos,
propostas, reuniões e um resumo financeiro do próprio cliente.

**Pré-requisito estrutural (Requisito 1):** hoje não existe nenhum
mecanismo de "conta de cliente" — `User` é 1:1 com produtora. Este spec
introduz um novo model (`ClientPortalAccess`) e um esquema de auth JWT
paralelo, sem tocar no fluxo de auth da produtora.

**Escopo:**
1. Migração aditiva: model `ClientPortalAccess` (Prisma + SQLite dual-path) — P0
2. Auth do portal: `clientPortalAuthService` + `authenticateClientPortal` middleware (JWT/cookie próprios) — P0
3. Gestão do acesso pelo dono da produtora (`ClientDetail.tsx`): criar/ativar/desativar/redefinir senha — P0
4. Limite por plano (`clientPortalLimit`, espelhando `clientLimit`) — P0
5. Endpoints do portal (hub por cliente): projetos, arquivos (+download), propostas, reuniões, resumo financeiro — P0/P1
6. Frontend do portal: `/portal/login`, `/portal/dashboard`, páginas de detalhe, troca de senha — P0/P1
7. Documentos do Studio IA: gap registrado, não implementado neste spec (Requisito 8) — fora de escopo

**Princípios herdados (inegociáveis):**
- Backend dual Prisma(Postgres)/SQLite via `shouldUsePrisma`.
- Migration SQL aditiva + `CREATE TABLE IF NOT EXISTS` em `db.ts`.
- Serialização via `withSnakeCase()`.
- Design system `frame-*`, accent `#E85002`.
- Isolamento cross-tenant: todo endpoint do portal filtra por `clientId` do
  token, nunca aceita `clientId` vindo do client-side sem validação.
- Valores monetários em inteiro de centavos (padrão existente).
- Convenção de limite por plano: `number | null` (`null` = ilimitado), igual
  a `clientLimit`.

## Architecture

### Diagrama de componentes

```
┌───────────────────────────────────────────────────────────────────┐
│  FRONTEND — Painel da produtora (existente)                        │
│  ClientDetail.tsx: + seção "Portal do Cliente"                     │
│              criar acesso / ativar / desativar / redefinir senha   │
│              exibe allowance (X de Y portais ativos)                │
└──────────────┼────────────────────────────────────────────────────┘
               ▼ api.clientPortal.* (gestão, autenticado como produtora)
┌───────────────────────────────────────────────────────────────────┐
│  FRONTEND — Portal do cliente (NOVO, App separado sob /portal)     │
│  /portal/login            PortalAuthProvider próprio                │
│  /portal/dashboard         lista de projetos do cliente             │
│  /portal/projects/:id      detalhe: status, progresso, arquivos     │
│  /portal/files              drive consolidado (todos os projetos)   │
│  /portal/proposals          propostas do cliente                    │
│  /portal/meetings           reuniões do cliente                     │
│  /portal/account            troca de senha                          │
└──────────────┼────────────────────────────────────────────────────┘
               ▼ api.portal.* (autenticado via cookie client_portal_token)
┌───────────────────────────────────────────────────────────────────┐
│  BACKEND                                                            │
│   /api/client-portal-auth/login, /logout, /me, /change-password    │
│        authenticateClientPortal (NOVO middleware, JWT próprio)      │
│   /api/portal/projects, /portal/files, /portal/files/:id/download,  │
│   /portal/proposals, /portal/meetings, /portal/financial-summary     │
│        Guard: authenticateClientPortal (client-scoped, não userId)  │
│   /api/clients/:id/portal-access  (gestão pela produtora)            │
│        Guard: authenticate (produtora) + assertClientPortalCapacity │
└──────────────┼────────────────────────────────────────────────────┘
               ▼
┌───────────────────────────────────────────────────────────────────┐
│  DB — Prisma (Postgres) + fallback SQLite                          │
│   client_portal_access (NOVA tabela, 1:1 com clients)               │
│     — passwordHash, active, lastLoginAt                             │
└───────────────────────────────────────────────────────────────────┘
```

### Por que um middleware/JWT separado em vez de reaproveitar `authenticate`

O `authenticate` atual resolve `req.user` a partir de `User.id` (produtora).
Um cliente não é um `User` — é um `Client`, que pertence a uma produtora.
Reaproveitar o mesmo cookie/JWT criaria ambiguidade grave: um payload
`{ id, email, role }` do cliente poderia colidir semanticamente com o de um
`User`, e um bug futuro poderia permitir um cliente "logar como produtora"
ou vice-versa. Um middleware e cookie totalmente separados
(`client_portal_token` / `authenticateClientPortal`, payload
`{ clientId, userId, type: "client-portal" }`) eliminam essa classe de erro
por construção — qualquer rota do portal só aceita esse payload, qualquer
rota da produtora só aceita o payload antigo.

O campo `type: "client-portal"` no JWT é uma camada extra de defesa: mesmo
que os dois JWTs fossem assinados com o mesmo `JWT_SECRET` (são, por
simplicidade — não há necessidade de segredo separado, já que o payload e o
middleware que verifica são estruturalmente diferentes e cada middleware
rejeita payloads do outro tipo), o campo discrimina a intenção do token e
facilita auditoria/logs.

### Por que uma tabela nova (`ClientPortalAccess`) em vez de campos direto em `Client`

Senha, status ativo/inativo e último login são dados de **credencial**, não
de **cadastro comercial** do cliente. Manter separado de `Client`:
- Evita expor `passwordHash` em qualquer serialização de `Client` usada hoje
  no CRM (risco de vazamento acidental por esquecimento de excluir o campo).
- Permite estender depois (ex.: 2FA do cliente, múltiplos contatos com login
  por cliente) sem tocar no model `Client` já em produção.
- Relação 1:1 (`@unique` em `clientId`), mesmo padrão de `Budget`/
  `DreSettings`/`StudioSetting` (1:1 com sua entidade dona).

## Components and Interfaces

### Backend — schema (Prisma)

```prisma
model ClientPortalAccess {
  id           BigInt    @id @default(autoincrement())
  clientId     BigInt    @unique @map("client_id")
  passwordHash String    @map("password_hash")
  active       Boolean   @default(true)
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @default(now()) @map("updated_at") @db.Timestamptz

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId], map: "idx_client_portal_access_client_id")
  @@map("client_portal_access")
}

model Client {
  // ...relations existentes...
  portalAccess ClientPortalAccess?
}
```

Migration Prisma: `npx prisma migrate dev --name add_client_portal` —
puramente aditiva (nova tabela, nova relação opcional). Não altera nada
existente.

### Backend — SQLite dual-path (`server/models/db.ts`)

```sql
CREATE TABLE IF NOT EXISTS client_portal_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_client_id ON client_portal_access(client_id);
```

### Backend — auth do portal

`server/middleware/authenticateClientPortal.ts` (novo, espelha `authenticate.ts`):

```ts
export interface ClientPortalUser {
  clientId: number;
  userId: number; // produtora dona do cliente — usado em todo filtro de query
  type: "client-portal";
}

const PORTAL_COOKIE_NAME = "client_portal_token";

export function signClientPortalToken(payload: ClientPortalUser): string { ... }

export const authenticateClientPortal: RequestHandler = async (req, res, next) => {
  const token = req.cookies?.[PORTAL_COOKIE_NAME];
  if (!token) return next(new AppError("Unauthorized", 401));
  try {
    const payload = jwt.verify(token, getJwtSecret()) as ClientPortalUser;
    if (payload.type !== "client-portal") return next(new AppError("Invalid or expired session", 401));
    const access = await clientPortalAuthService.getActiveAccessByClientId(payload.clientId);
    if (!access || access.userId !== payload.userId) return next(new AppError("Invalid or expired session", 401));
    req.portalUser = { clientId: payload.clientId, userId: payload.userId };
    next();
  } catch {
    next(new AppError("Invalid or expired session", 401));
  }
};
```

`req.portalUser` é um novo campo em `Express.Request` (declarado via
`declare global` no mesmo arquivo, análogo a `req.user`), nunca confundido
com `req.user` (produtora).

`server/services/clientPortalAuthService.ts` (novo):
- `createAccess(userId, clientId, email, password)` — valida ownership do
  `Client` (pertence a `userId`), valida limite (`assertClientPortalCapacity`),
  cria `ClientPortalAccess` com `bcrypt.hashSync`.
- `login(email, password)` — busca `Client` pelo email + join
  `ClientPortalAccess`; se `active = false` ou senha incorreta, erro genérico
  401 (não revela qual dos dois falhou).
- `changePassword(clientId, currentPassword, newPassword)`.
- `setActive(userId, clientId, active)` — apenas o dono (`userId`) pode
  alternar.
- `resetPassword(userId, clientId, newPassword)` — dono define nova senha
  manualmente (mesmo modelo de criação inicial).
- `getActiveAccessByClientId(clientId)` — usado pelo middleware.

### Backend — limite por plano (`clientPortalLimit`)

Segue exatamente o padrão de `clientLimit`:

```ts
// shared/planEntitlements.ts
export interface PlanEntitlement {
  clientLimit: number | null;
  clientPortalLimit: number | null; // NOVO — number | null, null = ilimitado
  // ...demais campos inalterados...
}

export const PLAN_ENTITLEMENTS: Record<OperationalPlanId, PlanEntitlement> = {
  free:       { ...clientLimit: 5,  clientPortalLimit: 1,    ... },
  pro:        { ...clientLimit: 15, clientPortalLimit: 5,    ... },
  studio:     { ...clientLimit: 50, clientPortalLimit: null, ... },
  whitelabel: { ...clientLimit: null, clientPortalLimit: null, ... },
  enterprise: { ...clientLimit: null, clientPortalLimit: null, ... },
};
```

`server/services/entitlementService.ts` — nova função análoga a
`getClientAllowance`/`assertClientCapacity`:

```ts
export async function getClientPortalAllowance(userId: number) {
  const entitlement = await getUserEntitlements(userId);
  const used = shouldUsePrisma
    ? await prisma.clientPortalAccess.count({ where: { active: true, client: { userId: BigInt(userId) } } })
    : (db.prepare(
        `SELECT COUNT(*) AS count FROM client_portal_access cpa
         JOIN clients c ON c.id = cpa.client_id
         WHERE c.user_id = ? AND cpa.active = 1`,
      ).get(userId) as { count: number }).count;

  return {
    planId: entitlement.planId,
    used,
    limit: entitlement.clientPortalLimit,
    remaining: entitlement.clientPortalLimit === null ? null : Math.max(0, entitlement.clientPortalLimit - used),
    canActivate: entitlement.clientPortalLimit === null || used < entitlement.clientPortalLimit,
  };
}

export async function assertClientPortalCapacity(userId: number, role?: "user" | "admin") {
  if (role === "admin") return;
  const allowance = await getClientPortalAllowance(userId);
  if (!allowance.canActivate) {
    throw new AppError(
      `Seu plano ${allowance.planId.toUpperCase()} permite até ${allowance.limit} portais de cliente ativos. Faça upgrade para continuar.`,
      402,
    );
  }
}
```

Contagem é sobre acessos **ativos** (`active = true`), não sobre total de
`ClientPortalAccess` já criados — cobre o Requisito 7.4/7.5 (desativar libera
vaga; downgrade não desativa acessos já ativos, apenas bloqueia novos).

### Backend — rotas de gestão (produtora)

`server/routes/clientPortal.ts` (gestão, montada em `/api/clients/:clientId/portal-access`
dentro de `server/routes/clients.ts`, seguindo o padrão de sub-recursos já
usado ali para `opportunities`/`interactions`/`proposals`):

```
GET    /api/clients/:id/portal-access          getPortalAccessStatus
GET    /api/client-portal/allowance            getAllowance (análogo a /clients/allowance)
POST   /api/clients/:id/portal-access          createPortalAccess { email, password }
PATCH  /api/clients/:id/portal-access           updatePortalAccessStatus { active }
POST   /api/clients/:id/portal-access/reset-password  resetPortalPassword { password }
```

Todas exigem `authenticate` (produtora) + ownership do `Client` (já garantido
pelo padrão existente de `clientsController`).

### Backend — rotas do portal (cliente autenticado)

`server/routes/portalAuth.ts` (login/logout/troca de senha, público até
login):

```
POST /api/client-portal-auth/login             { email, password } → seta cookie
POST /api/client-portal-auth/logout             limpa cookie
GET  /api/client-portal-auth/me                 authenticateClientPortal → dados básicos do cliente
POST /api/client-portal-auth/change-password    authenticateClientPortal → { currentPassword, newPassword }
```

`server/routes/portal.ts` (dados do hub, todas atrás de `authenticateClientPortal`):

```
GET /api/portal/projects                        lista projetos do clientId do token
GET /api/portal/projects/:id                     detalhe (valida clientId)
GET /api/portal/files                            arquivos de todos os projetos do cliente
GET /api/portal/files/:id/download                valida ownership via projectId → Project.clientId
GET /api/portal/proposals                        Proposal do clientId
GET /api/portal/meetings                         Meeting do clientId
GET /api/portal/financial-summary                 resumo agregado (nunca lista bruta de outros clientes)
```

`server/services/portalDataService.ts` (novo) — cada função recebe
`clientId` (nunca `userId` do cliente-viewer, que não existe) e filtra
estritamente por ele:

```ts
export async function listProjectsForClient(clientId: number) {
  return shouldUsePrisma
    ? prisma.project.findMany({ where: { clientId: BigInt(clientId) }, orderBy: { createdAt: "desc" } })
    : db.prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC").all(clientId);
}

export async function getFileForClient(clientId: number, fileId: number) {
  // File não tem clientId direto — join via project.clientId
  const file = shouldUsePrisma
    ? await prisma.file.findFirst({ where: { id: BigInt(fileId), project: { clientId: BigInt(clientId) } } })
    : db.prepare(
        `SELECT f.* FROM files f JOIN projects p ON p.id = f.project_id
         WHERE f.id = ? AND p.client_id = ?`,
      ).get(fileId, clientId);
  if (!file) throw new AppError("Arquivo não encontrado", 404); // nunca 403 (Req 6.2)
  return file;
}
```

Download reaproveita `createProjectFileUrl`/redirect já usado em
`filesController.downloadFile`, apenas troca a validação de ownership de
`userId` para `clientId` via join.

Resumo financeiro (`financial-summary`) agrega `FinancialEntry` por
`clientId`, retornando só totais (pendente/pago), nunca a lista bruta com
notas internas — separado deliberadamente do endpoint interno de
`analyticsController` usado pela produtora.

### Frontend — App do portal

Novo ponto de entrada isolado do `App.tsx` principal, para não misturar
contexto de auth:

```
client/src/portal/
  PortalApp.tsx          — Router próprio (wouter), Switch com rotas /portal/*
  PortalAuthContext.tsx  — login/logout/me, cookie client_portal_token
  pages/
    PortalLogin.tsx
    PortalDashboard.tsx      — lista de projetos (cards com status/progresso)
    PortalProjectDetail.tsx  — projeto: WORKFLOW_STAGES read-only, arquivos do projeto
    PortalFiles.tsx          — drive consolidado, download
    PortalProposals.tsx
    PortalMeetings.tsx
    PortalAccount.tsx        — troca de senha
```

`client/src/App.tsx` monta `PortalApp` sob `/portal/*` como uma sub-árvore
isolada (ex.: `<Route path="/portal/:rest*"><PortalApp /></Route>`), evitando
que `AuthProvider`/`PlanProvider` da produtora vazem para o portal.

Visualmente reaproveita o design system `frame-*`, mas com navegação própria
mais simples (sem `ProjectNav` completo — o cliente não navega por
"ferramentas" internas, só vê status).

### Frontend — gestão na `ClientDetail.tsx`

Nova seção "Portal do Cliente", seguindo o padrão visual já usado nas outras
seções da página (ver `ClientAllowance` em `NewClient.tsx` para o componente
de allowance):

- Sem acesso criado: botão "Criar acesso ao portal" → modal com email
  (pré-preenchido) + senha inicial.
- Acesso ativo: badge "Ativo", botões "Desativar" e "Redefinir senha".
- Acesso inativo: badge "Inativo", botão "Reativar".
- Allowance exibida no modal de criação: "Plano {planId}: {used} de {limit}
  portais ativos" (`limit === null` → "portais ilimitados"), mesmo padrão de
  `NewClient.tsx`.

### `client/src/lib/api.ts` — novos blocos

```ts
export interface ClientPortalAllowance {
  planId: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canActivate: boolean;
}

api.clients.portalAccess = {
  getStatus: (clientId) => ...,
  create: (clientId, data: { email: string; password: string }) => ...,
  updateStatus: (clientId, active: boolean) => ...,
  resetPassword: (clientId, password: string) => ...,
  allowance: () => ...,
};

api.portal = {
  login: (email, password) => ...,
  logout: () => ...,
  me: () => ...,
  changePassword: (currentPassword, newPassword) => ...,
  projects: { list: () => ..., get: (id) => ... },
  files: { list: () => ..., downloadUrl: (id) => `/api/portal/files/${id}/download` },
  proposals: { list: () => ... },
  meetings: { list: () => ... },
  financialSummary: () => ...,
};
```

## Data Models

```ts
export interface ClientPortalAccessStatus {
  clientId: number;
  active: boolean;
  email: string;
  lastLoginAt: string | null;
  createdAt: string | null; // null = nunca criado
}

export interface PortalProjectSummary {
  id: number;
  name: string;
  status: string;
  progress: number;
  workflowStage: string | null;
  deadline: string | null;
}

export interface PortalFileSummary {
  id: number;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  projectId: number;
  projectName: string;
  createdAt: string;
}

export interface PortalFinancialSummary {
  totalPending: number; // centavos
  totalPaid: number;    // centavos
  currency: string;
}
```

## Error Handling

- Login do portal com email/senha incorretos, ou acesso `active = false` →
  401 genérico, sem distinguir motivo (Requisito 1.5, 2.4).
- Criação de acesso além do limite do plano → 402 com mensagem de upgrade
  (Requisito 7.3), sem bloquear o restante do CRM.
- Cliente tentando acessar projeto/arquivo/proposta/reunião que não é seu →
  404 (nunca 403), mesmo padrão de isolamento cross-tenant já usado no
  restante do sistema (Requisito 6.2, 9.3).
- `changePassword` do cliente com senha atual incorreta → 400, mensagem
  clara sem revelar detalhes da conta (Requisito 3.2).
- Redefinição de senha pela produtora ou pelo próprio cliente → invalida
  sessões anteriores (Requisito 2.5) — implementado via bump de um campo
  tipo `updatedAt`/`tokenVersion` verificado no middleware (mesmo espírito de
  `isTokenRevoked` já usado em `authenticate.ts`, adaptado ao escopo do
  portal — decisão de implementação: reaproveitar tabela de revogação
  existente ou campo simples `updatedAt` comparado ao `iat` do JWT).

## Testing Strategy

- `server/services/clientPortalAuthService.test.ts`: criação de acesso
  (com/sem limite disponível), login válido/inválido, acesso inativo,
  troca de senha (senha atual correta/incorreta), redefinição pela produtora,
  isolamento: produtora A não gerencia acesso de cliente da produtora B.
- `server/services/portalDataService.test.ts`: cada listagem (`projects`,
  `files`, `proposals`, `meetings`, `financial-summary`) retorna apenas dados
  do `clientId` correto; cross-client (cliente X não vê dados do cliente Y,
  mesmo dentro da mesma produtora) → lista vazia ou 404 conforme o endpoint.
- `server/controllers/domainFlow.test.ts` (estendido) ou novo
  `clientPortalFlow.test.ts`: fluxo E2E via supertest — produtora cria
  acesso → cliente faz login → acessa projetos/arquivos próprios → tenta
  acessar dado de outro cliente (404) → troca senha → sessão antiga
  invalidada → produtora desativa acesso → login subsequente falha.
- Teste de limite: Free com 1 portal ativo bloqueia o segundo (402); Studio
  sem limite nunca bloqueia.

## Decisões e cortes de escopo

- **Documentos do Studio IA no portal (Requisito 8)** — não implementado
  neste spec. Depende de uma migração de persistência server-side de
  `Documents.tsx` (hoje 100% `localStorage`), que é um spec próprio e maior
  (não é apenas "ligar" ao portal — é criar model, service, controller,
  rotas e migrar o fluxo de criação/edição existente). Registrado como
  próximo passo natural após este spec.
- **Notificação por email ao cliente quando o acesso é criado** — fora de
  escopo nesta entrega (o dono da produtora comunica a credencial
  manualmente, ex. WhatsApp/telefone, mesmo modelo já usado hoje para
  compartilhar links de proposta/reunião). Pode ser adicionado depois sem
  mudança de schema.
- **2FA para o cliente** — fora de escopo, mesmo nível de maturidade atual
  do login da produtora sem exigir 2FA para usuários comuns.
- **Múltiplos contatos com login por `Client`** (ex.: dois interlocutores da
  mesma empresa-cliente) — fora de escopo; `ClientPortalAccess` é 1:1 com
  `Client`. Registrado como extensão futura possível (relação 1:N).
