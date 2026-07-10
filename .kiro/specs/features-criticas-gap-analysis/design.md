# Design — Features Críticas: Gap Analysis Competitivo

## Overview

Esta fase implementa **8 features em 4 ondas** (2 features por semana), totalizando ~28 dias de desenvolvimento. Cada feature é **independente** (pode ser implementada em paralelo dentro da onda) e usa **apenas stack existente** (zero custo adicional).

**Princípio arquitetural:** seguir padrões já estabelecidos no projeto (Controller → Service → Prisma, React hooks, Radix UI components). Não inventar abstrações novas — reusar o que funciona.

```
Fase 1 (Semana 1)
├── Project Templates (2-3 dias)
└── Client Portal (3-4 dias)

Fase 2 (Semana 2)
├── Webhooks Genéricos (2 dias)
└── Asset Library (2-3 dias)

Fase 3 (Semana 3)
├── Shot List Visual (3-4 dias)
└── Script Breakdown (1 dia)

Fase 4 (Semana 4)
├── Timesheet (4-5 dias)
└── Google Calendar Sync (2-3 dias)
```

## Architecture

### Fluxo de dados geral (8 features)

```
┌────────────────────────────────────────────────┐
│  Client (React)                                │
│  ├─ /projects → ProjectTemplateSelector       │
│  ├─ /client/{shareId} → ClientPortalView      │
│  ├─ /settings/webhooks → WebhookManager       │
│  ├─ /assets → AssetLibrary                    │
│  ├─ /project/{id}/shots → ShotListBuilder     │
│  ├─ /project/{id}/breakdown → ScriptBreakdown │
│  ├─ /timesheet → TimesheetView                │
│  └─ AI Tools + Calendar Export buttons        │
└────────────────┬───────────────────────────────┘
                 │ REST API
┌────────────────▼───────────────────────────────┐
│  Server (Express)                              │
│  ├─ /api/templates                             │
│  ├─ /api/client-portal                         │
│  ├─ /api/webhooks                              │
│  ├─ /api/assets                                │
│  ├─ /api/shots                                 │
│  ├─ /api/breakdown                             │
│  ├─ /api/timesheet                             │
│  └─ /api/calendar/export                       │
└────────────────┬───────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────┐
│  Data Layer (Prisma + Postgres)                │
│  ├─ project_templates                          │
│  ├─ client_portal_shares                       │
│  ├─ webhooks                                   │
│  ├─ webhook_deliveries                         │
│  ├─ assets                                     │
│  ├─ shots                                      │
│  ├─ script_breakdowns                          │
│  ├─ time_entries                               │
│  └─ calendar_events                            │
└────────────────────────────────────────────────┘
```

### Tech Stack (nenhuma lib nova com custo)

**Backend:**
- Express 4.21 (já existe) — routing e middleware
- Prisma 7.8 (já existe) — 9 novos models + migrations
- Postgres via Supabase (já configurado) — production database
- `icsService.ts` (CRIAR NOVO) — biblioteca RFC 5545 para .ics export
- `aiService.ts` (já existe) — reutilizar para script breakdown
- Cloudinary 2.10 (já existe) — storage e transformações de assets
- `node-cron` (NEW, 0 custo) — scheduled webhook retries
- `googleapis` (NEW, 0 custo) — Google Calendar API OAuth2
- `bcryptjs` (já existe) — password hashing para client portal
- `papaparse` (já existe) — CSV export para timesheet

**Frontend:**
- React 19.2 + TypeScript
- Vite 7.1 (já existe) — build tool
- `@dnd-kit/core` + `@dnd-kit/sortable` (já existe) — drag-and-drop shot list
- Radix UI (já existe, todos componentes instalados) — modals, dropdowns, tabs, collapsible
- Wouter 3.7 (já existe) — routing SPA
- `date-fns` 3.6 (já existe) — date formatting
- `jspdf` 4.2 (já existe) — PDF export para breakdown e shot list
- `react-hook-form` 7.64 (já existe) — formulários
- `sonner` (já existe) — toast notifications

**Libs novas a adicionar (todas grátis):**
- `node-cron` + `@types/node-cron` — cron jobs para webhook retry
- `googleapis` + `@types/googleapis` — Google Calendar API client

## Data Models

### Prisma Schema — Overview

Os 9 novos models Prisma abaixo compõem a camada de dados desta fase. Todos seguem convenções do schema existente (snake_case map, timestamps com `@db.Timestamptz`, IDs `BigInt` para modelos legados e `String @uuid` para novos).

### Model: ProjectTemplate

```prisma
model ProjectTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  isSystem    Boolean  @default(false) // true = template padrão não-deletável
  isPublic    Boolean  @default(false) // true = visível para todos (Studio plan)
  createdBy   BigInt   @map("created_by")

  // Template structure (JSON)
  defaultTasks Json     @default("[]") // [{ title, description, dueInDays }]
  defaultTools String[] @default([])   // ["01", "02", "03"] Tool IDs
  estimatedDays Int?    @map("estimated_days")

  // Metadata
  useCount    Int      @default(0) @map("use_count")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  creator User @relation(fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([createdBy])
  @@index([isSystem, isPublic])
  @@map("project_templates")
}
```

### Model: ClientPortalShare

```prisma
model ClientPortalShare {
  id          String   @id @default(uuid())
  projectId   BigInt   @map("project_id")
  shareToken  String   @unique @default(uuid()) // UUID para URL pública
  password    String?  // bcrypt hash (somente Studio plan)
  isActive    Boolean  @default(true) @map("is_active")

  // Config
  showProgress Boolean @default(true) @map("show_progress")
  showTimeline Boolean @default(true) @map("show_timeline")
  showFiles    Boolean @default(true) @map("show_files")

  // Expiration (null = ilimitado para Studio)
  expiresAt   DateTime? @map("expires_at") @db.Timestamptz

  // Audit
  viewCount   Int      @default(0) @map("view_count")
  lastViewedAt DateTime? @map("last_viewed_at") @db.Timestamptz
  approvals   Json     @default("[]") // [{ fileId, approvedAt, ip }]

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([shareToken])
  @@index([projectId])
  @@map("client_portal_shares")
}
```

### Model: Webhook

```prisma
model Webhook {
  id          String   @id @default(uuid())
  userId      BigInt   @map("user_id")
  name        String
  url         String   // https://hooks.zapier.com/... ou Discord/Slack webhook
  secret      String   @default(uuid()) // para HMAC signature

  // Trigger config
  events      String[] // ["project.completed", "task.completed", ...]
  isActive    Boolean  @default(true) @map("is_active")

  // Error tracking
  failureCount Int     @default(0) @map("failure_count")
  lastError    String? @map("last_error")
  lastErrorAt  DateTime? @map("last_error_at") @db.Timestamptz

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries WebhookDelivery[]

  @@index([userId])
  @@index([isActive])
  @@map("webhooks")
}
```

### Model: WebhookDelivery

```prisma
model WebhookDelivery {
  id          String   @id @default(uuid())
  webhookId   String   @map("webhook_id")
  event       String   // "project.completed"
  payload     Json

  // HTTP response
  statusCode  Int?     @map("status_code")
  responseTime Int?    @map("response_time") // milliseconds
  responseBody String?  @map("response_body") @db.Text
  error       String?  @db.Text

  // Retry logic
  attemptCount Int     @default(1) @map("attempt_count")
  nextRetryAt DateTime? @map("next_retry_at") @db.Timestamptz

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@index([createdAt])
  @@map("webhook_deliveries")
}
```

### Model: Asset

```prisma
model Asset {
  id          String   @id @default(uuid())
  userId      BigInt   @map("user_id")
  name        String
  type        String   // "logo" | "music" | "footage" | "other"
  tags        String[] @default([])
  description String?  @db.Text

  // Cloudinary
  cloudinaryId String   @map("cloudinary_id")
  url         String
  thumbnailUrl String?  @map("thumbnail_url")
  format      String   // "jpg", "mp4", "mp3"
  sizeBytes   BigInt   @map("size_bytes")

  // Usage tracking
  useCount    Int      @default(0) @map("use_count")
  lastUsedAt  DateTime? @map("last_used_at") @db.Timestamptz

  // Soft delete
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([type])
  @@index([deletedAt])
  @@map("assets")
}
```

### Model: Shot

```prisma
model Shot {
  id          String   @id @default(uuid())
  projectId   BigInt   @map("project_id")

  // Shot details
  shotNumber  String   @map("shot_number") // "1A", "2B"
  sceneNumber String?  @map("scene_number") // "3" for grouping
  description String   @db.Text
  shotType    String?  @map("shot_type") // "PG", "PM", "CL", etc
  lens        String?  // "35mm", "85mm"
  movement    String?  // "Dolly in", "Handheld"
  duration    Int?     // seconds

  // Visual
  thumbnailUrl String? @map("thumbnail_url") // Cloudinary

  // Production notes
  notes       String?  @db.Text

  // Order
  sortOrder   Int      @default(0) @map("sort_order")

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, sortOrder])
  @@map("shots")
}
```

### Model: ScriptBreakdown

```prisma
model ScriptBreakdown {
  id          String   @id @default(uuid())
  projectId   BigInt   @unique @map("project_id") // 1:1 com projeto

  // Extracted data (JSON arrays)
  characters  Json     @default("[]") // [{ name, description, scenes: [1,2,3] }]
  locations   Json     @default("[]") // [{ name, type: "INT/EXT", time: "DIA/NOITE", address }]
  props       Json     @default("[]") // [{ name, scene, description }]
  wardrobe    Json     @default("[]") // [{ character, item, scene }]

  // Source
  scriptText  String   @map("script_text") @db.Text // original script para re-extract

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@map("script_breakdowns")
}
```

### Model: TimeEntry

```prisma
model TimeEntry {
  id          String   @id @default(uuid())
  userId      BigInt   @map("user_id")
  projectId   BigInt   @map("project_id")
  taskId      BigInt?  @map("task_id") // nullable (pode ser tempo geral de projeto)

  // Time tracking
  startTime   DateTime @map("start_time") @db.Timestamptz
  endTime     DateTime @map("end_time") @db.Timestamptz
  durationMinutes Int  @map("duration_minutes")

  // Context
  description String?  @db.Text
  category    String   // "pre_production" | "production" | "post_production" | "meeting" | "other"

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task    Task?   @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([userId, projectId])
  @@index([startTime])
  @@map("time_entries")
}
```

### Model: CalendarEvent

```prisma
model CalendarEvent {
  id          String   @id @default(uuid())
  projectId   BigInt   @map("project_id")
  userId      BigInt   @map("user_id")

  // Google Calendar API
  googleEventId String? @unique @map("google_event_id")

  // Event details
  title       String
  description String?  @db.Text
  location    String?
  startTime   DateTime @map("start_time") @db.Timestamptz
  endTime     DateTime @map("end_time") @db.Timestamptz

  // Source reference (callsheet ID, meeting ID, etc)
  sourceType  String   @map("source_type") // "callsheet" | "meeting"
  sourceId    String   @map("source_id")

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([userId])
  @@index([googleEventId])
  @@map("calendar_events")
}
```

### Model: UserSession

```prisma
model UserSession {
  id          String   @id @default(uuid())
  userId      BigInt   @map("user_id")
  token       String   @unique // SHA256 hash do JWT token

  // Device & location info
  deviceInfo  Json     @default("{}") @map("device_info") // { browser, os, device }
  ipAddress   String   @map("ip_address")
  location    Json?    @default("{}") // { city, country, countryCode }

  // Timestamps
  lastAccessAt DateTime @default(now()) @map("last_access_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, lastAccessAt])
  @@index([token])
  @@map("user_sessions")
}
```

### Alterações em Models Existentes

**User** — adicionar relações:
```prisma
model User {
  // ... campos existentes

  // NEW: hourly rate para timesheet
  hourlyRate  Decimal?  @map("hourly_rate") @db.Decimal(10, 2)

  // NEW: Google Calendar token
  googleAccessToken  String? @map("google_access_token") @db.Text
  googleRefreshToken String? @map("google_refresh_token") @db.Text
  googleTokenExpiry  DateTime? @map("google_token_expiry") @db.Timestamptz

  // NEW: relações
  templates      ProjectTemplate[]
  webhooks       Webhook[]
  assets         Asset[]
  timeEntries    TimeEntry[]
  calendarEvents CalendarEvent[]
  sessions       UserSession[]
}
```

**Project** — adicionar relações:
```prisma
model Project {
  // ... campos existentes

  // NEW: relações
  portalShare     ClientPortalShare?
  shots           Shot[]
  scriptBreakdown ScriptBreakdown?
  timeEntries     TimeEntry[]
  calendarEvents  CalendarEvent[]
}
```

**Task** — adicionar relação:
```prisma
model Task {
  // ... campos existentes

  // NEW: relação
  timeEntries TimeEntry[]
}
```

## API Endpoints

### Feature 1: Project Templates

```
GET    /api/templates              # Lista templates (system + user)
POST   /api/templates              # Cria template
GET    /api/templates/:id          # Detalhes de template
PUT    /api/templates/:id          # Atualiza template
DELETE /api/templates/:id          # Deleta template (apenas user-created)
POST   /api/projects/from-template/:templateId  # Cria projeto de template
```

### Feature 2: Client Portal

```
POST   /api/client-portal          # Cria/atualiza portal share
GET    /api/client-portal/:shareToken  # Public: view portal (no auth)
POST   /api/client-portal/:shareToken/approve  # Public: aprovar entrega
DELETE /api/client-portal/:projectId  # Desativa portal
```

### Feature 3: Webhooks

```
GET    /api/webhooks               # Lista webhooks do user
POST   /api/webhooks               # Cria webhook
GET    /api/webhooks/:id           # Detalhes + últimos deliveries
PUT    /api/webhooks/:id           # Atualiza webhook
DELETE /api/webhooks/:id           # Deleta webhook
POST   /api/webhooks/:id/test      # Envia test payload
```

### Feature 4: Asset Library

```
GET    /api/assets                 # Lista assets do user (com filtros: type, tags)
POST   /api/assets                 # Upload novo asset (multipart/form-data)
GET    /api/assets/:id             # Detalhes de asset
PUT    /api/assets/:id             # Atualiza metadata (nome, tags, description)
DELETE /api/assets/:id             # Soft delete
POST   /api/assets/:id/restore     # Restore soft-deleted
```

### Feature 5: Script Breakdown

```
POST   /api/breakdown/:projectId   # Extrai breakdown de roteiro (IA)
GET    /api/breakdown/:projectId   # Retorna breakdown existente
PUT    /api/breakdown/:projectId   # Atualiza breakdown manualmente
GET    /api/breakdown/:projectId/export  # Exporta PDF checklist
```

### Feature 6: Shot List

```
GET    /api/shots/:projectId       # Lista shots do projeto
POST   /api/shots/:projectId       # Cria shot
GET    /api/shots/:id              # Detalhes de shot
PUT    /api/shots/:id              # Atualiza shot
DELETE /api/shots/:id              # Deleta shot
PUT    /api/shots/:projectId/reorder  # Atualiza sortOrder (bulk)
GET    /api/shots/:projectId/export   # Exporta PDF shot list
```

### Feature 7: Timesheet

```
POST   /api/timesheet/start        # Inicia timer (retorna timerId)
POST   /api/timesheet/:timerId/pause  # Pausa timer
POST   /api/timesheet/:timerId/stop   # Para e salva entry
GET    /api/timesheet              # Lista entries (filtros: date range, project)
PUT    /api/timesheet/:id          # Edita entry
DELETE /api/timesheet/:id          # Deleta entry
GET    /api/timesheet/export       # Exporta CSV
```

### Feature 8: Calendar Sync

```
POST   /api/calendar/export/:projectId  # Gera .ics (download)
POST   /api/calendar/google/auth        # Inicia OAuth2 Google
GET    /api/calendar/google/callback    # Callback OAuth2
POST   /api/calendar/google/sync/:projectId  # Sync evento para Google
PUT    /api/calendar/google/update/:eventId  # Atualiza evento Google
DELETE /api/calendar/google/revoke      # Revoga permissão Google
```

### Feature 9: Session Management

```
GET    /api/sessions                # Lista sessões ativas do user
DELETE /api/sessions/:sessionId     # Encerra sessão específica
DELETE /api/sessions/all            # Encerra todas exceto atual
```

## Services Layer

**Pattern:** Seguir padrão Controller → Service já estabelecido (ver ARCHITECTURE.md ADR). Services contêm business logic, controllers apenas handle HTTP.

### templatesService.ts (NEW)

```typescript
/**
 * Lista templates disponíveis para o usuário (system + próprios)
 */
export async function listTemplates(
  userId: bigint,
  includeSystem: boolean = true
): Promise<ProjectTemplate[]>

/**
 * Cria novo template a partir de configuração do usuário
 * Valida limites por plano: Free só system templates, Pro/Studio podem criar
 */
export async function createTemplate(
  userId: bigint,
  data: CreateTemplateDto
): Promise<ProjectTemplate>

/**
 * Cria projeto completo a partir de template (copia tasks, tools, config)
 * Transaction-safe: rollback se qualquer etapa falhar
 */
export async function createProjectFromTemplate(
  userId: bigint,
  templateId: string,
  projectName: string,
  projectData?: Partial<CreateProjectDto>
): Promise<Project>

/**
 * Deleta template (somente user-created, não system templates)
 */
export async function deleteTemplate(
  userId: bigint,
  templateId: string
): Promise<void>

/**
 * Incrementa contador de uso do template
 */
export async function incrementTemplateUsage(templateId: string): Promise<void>
```

### clientPortalService.ts (NEW)

```typescript
/**
 * Cria ou atualiza configuração do portal de cliente
 * Gera shareToken único (UUID v4) se não existir
 */
export async function createOrUpdatePortalShare(
  projectId: bigint,
  userId: bigint,
  config: PortalConfigDto
): Promise<ClientPortalShare>

/**
 * Busca portal por token (público, sem auth)
 * Valida expiração e senha (se configurada)
 * Retorna view sanitizada com apenas dados públicos
 */
export async function getPortalByToken(
  shareToken: string,
  password?: string
): Promise<PortalPublicView>

/**
 * Registra aprovação de entrega pelo cliente
 * Incrementa viewCount, atualiza lastViewedAt
 */
export async function recordApproval(
  shareToken: string,
  fileId: bigint,
  ip: string
): Promise<void>

/**
 * Desativa portal (soft disable, não deleta)
 */
export async function deactivatePortal(
  projectId: bigint,
  userId: bigint
): Promise<void>

/**
 * Verifica senha do portal (bcrypt compare)
 */
export async function verifyPortalPassword(
  shareToken: string,
  password: string
): Promise<boolean>

/**
 * Gera signed URLs do Cloudinary para arquivos do portal (24h TTL)
 */
export async function generatePortalFileUrls(
  projectId: bigint
): Promise<Array<{ fileId: bigint; signedUrl: string }>>
```

### webhooksService.ts (NEW)

```typescript
/**
 * Cria novo webhook com validação de URL https
 * Gera secret UUID para HMAC signature
 */
export async function createWebhook(
  userId: bigint,
  data: CreateWebhookDto
): Promise<Webhook>

/**
 * Dispara webhook HTTP POST com retry logic
 * Calcula HMAC-SHA256 signature com secret
 * Timeout: 10s hard limit
 */
export async function deliverWebhook(
  webhookId: string,
  event: string,
  payload: any
): Promise<WebhookDelivery>

/**
 * Reprocessa deliveries falhadas (chamado por cron job)
 * Backoff exponencial: 10s, 30s, 90s
 * Desativa webhook após 3 falhas consecutivas
 */
export async function retryFailedDeliveries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}>

/**
 * Envia webhook de teste (payload dummy)
 */
export async function testWebhook(webhookId: string): Promise<WebhookDelivery>

/**
 * Lista últimos deliveries de um webhook (paginado)
 */
export async function listWebhookDeliveries(
  webhookId: string,
  limit: number = 10
): Promise<WebhookDelivery[]>

/**
 * Calcula HMAC-SHA256 signature
 */
export function calculateSignature(secret: string, payload: string): string
```

### assetsService.ts (NEW)

```typescript
/**
 * Upload asset para Cloudinary com validação
 * Mime types: png/jpg/svg/mp4/mov/mp3/wav
 * Max size: 50MB por arquivo
 * Gera thumbnail automático para vídeos
 */
export async function uploadAsset(
  userId: bigint,
  file: Express.Multer.File,
  metadata: AssetMetadataDto
): Promise<Asset>

/**
 * Lista assets do usuário com filtros
 * Excludes soft-deleted por padrão
 */
export async function listAssets(
  userId: bigint,
  filters: AssetFiltersDto
): Promise<Asset[]>

/**
 * Soft delete asset (marca deletedAt, preserva URL)
 * Assets linkados em projetos continuam acessíveis
 */
export async function softDeleteAsset(
  assetId: string,
  userId: bigint
): Promise<void>

/**
 * Restaura asset soft-deleted
 */
export async function restoreAsset(
  assetId: string,
  userId: bigint
): Promise<Asset>

/**
 * Calcula uso total de storage do usuário
 * Verifica limites por plano: Free 100MB, Pro 1GB, Studio 10GB
 */
export async function checkStorageLimit(
  userId: bigint
): Promise<{ used: number; limit: number; available: number }>

/**
 * Atualiza metadata de asset (nome, tags, descrição)
 */
export async function updateAsset(
  assetId: string,
  userId: bigint,
  updates: UpdateAssetDto
): Promise<Asset>

/**
 * Incrementa useCount ao usar asset em projeto
 */
export async function trackAssetUsage(
  assetId: string
): Promise<void>

/**
 * Lista assets não usados há mais de N dias
 */
export async function findUnusedAssets(
  userId: bigint,
  daysUnused: number = 90
): Promise<Asset[]>
```

### breakdownService.ts (NEW)

```typescript
/**
 * Extrai breakdown de roteiro via IA (NVIDIA primary, Anthropic fallback)
 * Prompt estruturado para retornar JSON: characters, locations, props, wardrobe
 * Retry automático se JSON parsing falhar
 */
export async function extractBreakdown(
  projectId: bigint,
  scriptText: string
): Promise<ScriptBreakdown>

/**
 * Atualiza breakdown manualmente (edições inline do usuário)
 */
export async function updateBreakdown(
  projectId: bigint,
  updates: UpdateBreakdownDto
): Promise<ScriptBreakdown>

/**
 * Exporta breakdown como PDF checklist
 * Agrupado por departamento: Produção, Arte, Figurino, Elenco
 * Formato: checkboxes para "Providenciado"
 */
export async function exportBreakdownPDF(
  projectId: bigint
): Promise<Buffer>

/**
 * Busca breakdown existente de um projeto
 */
export async function getBreakdown(
  projectId: bigint
): Promise<ScriptBreakdown | null>

/**
 * Valida estrutura JSON do breakdown (schema validation)
 */
export function validateBreakdownJSON(data: any): boolean
```

### shotsService.ts (NEW)

```typescript
/**
 * Cria novo shot no projeto
 * Auto-calcula sortOrder (MAX + 1)
 */
export async function createShot(
  projectId: bigint,
  data: CreateShotDto
): Promise<Shot>

/**
 * Atualiza shot existente (metadata, thumbnail, notes)
 */
export async function updateShot(
  shotId: string,
  updates: UpdateShotDto
): Promise<Shot>

/**
 * Deleta shot
 */
export async function deleteShot(shotId: string): Promise<void>

/**
 * Reordena shots (bulk update sortOrder)
 * Transaction-safe para evitar colisões
 */
export async function reorderShots(
  projectId: bigint,
  orderedShotIds: string[]
): Promise<void>

/**
 * Lista shots de um projeto (ordenado por sortOrder)
 * Opcionalmente agrupa por sceneNumber
 */
export async function listShots(
  projectId: bigint,
  groupByScene?: boolean
): Promise<Shot[] | Record<string, Shot[]>>

/**
 * Exporta shot list como PDF
 * Formato: uma página por shot com thumbnail, specs, notas
 */
export async function exportShotListPDF(
  projectId: bigint
): Promise<Buffer>

/**
 * Upload thumbnail do shot para Cloudinary
 * Aplica transformação: resize 400x300, quality 80
 */
export async function uploadShotThumbnail(
  shotId: string,
  file: Express.Multer.File
): Promise<string> // retorna URL
```

### timesheetService.ts (NEW)

```typescript
/**
 * Inicia timer para task/projeto
 * Valida que não existe outro timer ativo para o usuário
 * Opção: auto-parar timer anterior se existir
 */
export async function startTimer(
  userId: bigint,
  projectId: bigint,
  taskId?: bigint
): Promise<ActiveTimer>

/**
 * Pausa timer ativo (mantém em memória/DB)
 */
export async function pauseTimer(
  timerId: string,
  userId: bigint
): Promise<ActiveTimer>

/**
 * Para timer e salva como TimeEntry
 * Calcula duração automática (endTime - startTime)
 */
export async function stopTimer(
  timerId: string,
  userId: bigint,
  description?: string,
  category?: string
): Promise<TimeEntry>

/**
 * Busca timer ativo do usuário (se existir)
 */
export async function getActiveTimer(
  userId: bigint
): Promise<ActiveTimer | null>

/**
 * Lista time entries com filtros
 * Respeita retention por plano: Free 30d, Pro 1 ano, Studio ilimitado
 */
export async function listEntries(
  userId: bigint,
  filters: TimesheetFiltersDto
): Promise<TimeEntry[]>

/**
 * Atualiza time entry manualmente
 */
export async function updateEntry(
  entryId: string,
  userId: bigint,
  updates: UpdateTimeEntryDto
): Promise<TimeEntry>

/**
 * Deleta time entry
 */
export async function deleteEntry(
  entryId: string,
  userId: bigint
): Promise<void>

/**
 * Exporta timesheet como CSV
 * Colunas: Data, Projeto, Task, Duração, Categoria, Valor (se hourlyRate setado)
 */
export async function exportTimesheetCSV(
  userId: bigint,
  filters: TimesheetFiltersDto
): Promise<string>

/**
 * Calcula resumo de horas por projeto
 * Agrupado por categoria: pré/produção/pós/reunião/outro
 */
export async function calculateProjectSummary(
  projectId: bigint
): Promise<ProjectTimeSummary>

/**
 * Calcula valor total baseado em hourlyRate do usuário
 */
export async function calculateTotalValue(
  userId: bigint,
  entries: TimeEntry[]
): Promise<number>
```

### calendarService.ts (NEW)

```typescript
/**
 * Gera arquivo .ics (RFC 5545) de callsheet
 * Extrai horários do callsheet e cria VEVENTs
 * PRODID: com SITE_CONFIG.brandName (white-label)
 */
export async function generateICS(
  projectId: bigint,
  callsheetData: CallsheetDto
): Promise<string> // retorna string .ics

/**
 * Obtém OAuth2 client do Google com tokens do usuário
 * Refresh automático se access token expirado
 */
export async function getGoogleOAuthClient(
  userId: bigint
): Promise<OAuth2Client>

/**
 * Sincroniza evento para Google Calendar
 * Retorna eventId do Google (para updates futuros)
 */
export async function syncToGoogleCalendar(
  userId: bigint,
  eventData: CalendarEventDto
): Promise<string> // retorna googleEventId

/**
 * Atualiza evento existente no Google Calendar
 */
export async function updateGoogleEvent(
  eventId: string,
  userId: bigint,
  updates: Partial<CalendarEventDto>
): Promise<void>

/**
 * Deleta evento do Google Calendar
 */
export async function deleteGoogleEvent(
  eventId: string,
  userId: bigint
): Promise<void>

/**
 * Revoga permissões do Google Calendar (limpa tokens)
 */
export async function revokeGoogleAccess(userId: bigint): Promise<void>

/**
 * Gera URL de autorização OAuth2 do Google
 */
export function generateGoogleAuthUrl(): string

/**
 * Processa callback OAuth2 e salva tokens
 */
export async function handleGoogleCallback(
  code: string,
  userId: bigint
): Promise<void>

/**
 * Valida se usuário atingiu limite de syncs/mês
 * Free: 5/mês, Pro: 50/mês, Studio: ilimitado
 */
export async function checkCalendarSyncLimit(userId: bigint): Promise<boolean>
```

### sessionService.ts (NEW)

```typescript
/**
 * Lista todas sessões ativas do usuário
 * Ordenado por lastAccessAt DESC (mais recentes primeiro)
 */
export async function listActiveSessions(
  userId: bigint
): Promise<UserSession[]>

/**
 * Encerra sessão específica
 * Deleta do DB e adiciona token à blacklist (se implementado)
 */
export async function terminateSession(
  userId: bigint,
  sessionId: string
): Promise<void>

/**
 * Encerra todas sessões exceto a atual
 * @param exceptCurrentToken - hash do token da sessão atual (não deletar esta)
 */
export async function terminateAllSessions(
  userId: bigint,
  exceptCurrentToken?: string
): Promise<{ terminated: number }>

/**
 * Registra ou atualiza sessão ativa
 * Calcula hash SHA256 do token para usar como identificador
 * Rate limited: só atualiza se lastAccessAt > 5 minutos atrás
 */
export async function upsertSession(
  userId: bigint,
  token: string,
  deviceInfo: DeviceInfo,
  ipAddress: string,
  location?: LocationInfo
): Promise<UserSession>

/**
 * Verifica se token/sessão é válido
 * Usado no middleware authenticate para validar sessão existe
 */
export async function isSessionValid(tokenHash: string): Promise<boolean>

/**
 * Cleanup automático de sessões expiradas (cron job diário)
 * Remove sessões com lastAccessAt > 7 dias (match JWT expiration)
 */
export async function cleanupExpiredSessions(): Promise<{ deleted: number }>

/**
 * Calcula SHA256 hash de token JWT para usar como sessionId
 */
export function hashToken(token: string): string

/**
 * Parse user-agent string para extrair device info
 * Usa ua-parser-js library
 */
export function parseUserAgent(userAgent: string): DeviceInfo

/**
 * Busca localização por IP
 * Tenta headers Cloudflare primeiro, fallback ipapi.co
 */
export async function getLocationFromIP(
  ip: string,
  headers: Record<string, string | undefined>
): Promise<LocationInfo | null>

// Types
export interface DeviceInfo {
  browser: string // "Chrome", "Safari", "Firefox", etc
  browserVersion?: string
  os: string // "macOS", "Windows", "iOS", "Android", etc
  osVersion?: string
  device?: string // "desktop", "mobile", "tablet"
}

export interface LocationInfo {
  city?: string
  country?: string
  countryCode?: string // "BR", "US", etc
}
```

### eventDispatcher.ts (NEW) — Webhook Event Orchestration

**Purpose:** Orquestrar disparo de webhooks em eventos do sistema. Desacopla controllers de lógica de webhooks.

```typescript
/**
 * Dispara evento para todos webhooks ativos do usuário
 * Não-bloqueante: chama deliverWebhook de forma assíncrona
 * Usado em controllers para trigger events
 */
export async function dispatchEvent(
  event: WebhookEventType,
  userId: bigint,
  payload: any
): Promise<void>

/**
 * Tipos de eventos suportados
 */
export type WebhookEventType =
  | 'project.created'
  | 'project.completed'
  | 'task.completed'
  | 'file.uploaded'
  | 'client.approved'
  | 'meeting.scheduled'

/**
 * Estrutura padrão de payload enviado nos webhooks
 */
export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string // ISO 8601
  projectId?: bigint
  userId: bigint
  data: Record<string, any>
}
```

**Integration points:** Adicionar chamadas de `dispatchEvent` nos controllers:
- `projectsController.ts` create → `dispatchEvent("project.created", ...)`
- `projectsController.ts` complete → `dispatchEvent("project.completed", ...)`
- `tasksController.ts` complete → `dispatchEvent("task.completed", ...)`
- `uploadsController.ts` upload → `dispatchEvent("file.uploaded", ...)`
- `clientPortalService.ts` recordApproval → `dispatchEvent("client.approved", ...)`
- `meetingsController.ts` create → `dispatchEvent("meeting.scheduled", ...)`



## Components and Interfaces

### Frontend Components (React)

#### Feature 1: Project Templates

**New Components:**
- `ProjectTemplateSelector.tsx` — Modal com grid de templates
- `TemplateCard.tsx` — Card visual de cada template
- `SaveAsTemplateDialog.tsx` — Dialog para salvar projeto como template

**Integration Points:**
- `client/src/pages/Projects.tsx` — adicionar dropdown no botão "+ Novo Projeto"

### Feature 2: Client Portal

**New Components:**
- `ClientPortalSettings.tsx` — Modal de configuração do portal
- `ClientPortalView.tsx` — Página pública `/client/:shareToken` (nova rota)
- `ApprovalButton.tsx` — Botão de aprovação de entrega

**Integration Points:**
- `client/src/pages/Project.tsx` — botão "Compartilhar com Cliente" no header

### Feature 3: Webhooks

**New Components:**
- `WebhookManager.tsx` — Página `/settings/webhooks`
- `WebhookForm.tsx` — Form criar/editar webhook
- `WebhookDeliveriesList.tsx` — Lista últimos disparos com status

**Integration Points:**
- `client/src/pages/Settings.tsx` — nova tab "Integrações" com seção Webhooks

### Feature 4: Asset Library

**New Components:**
- `AssetLibrary.tsx` — Página `/assets` com grid de assets
- `AssetUploadZone.tsx` — Drag-and-drop upload area
- `AssetPicker.tsx` — Modal para selecionar asset de biblioteca (reutilizável)
- `AssetCard.tsx` — Card visual com preview + metadata

**Integration Points:**
- Menu global — novo item "Biblioteca" no sidebar
- Qualquer upload de arquivo — botão "Escolher da Biblioteca"

### Feature 5: Script Breakdown

**New Components:**
- `ScriptBreakdownView.tsx` — Tabs: Personagens | Locações | Props | Figurino
- `BreakdownItemCard.tsx` — Card editável com checkbox "Providenciado"
- `BreakdownExportButton.tsx` — Botão exportar PDF checklist

**Integration Points:**
- `client/src/pages/Studio.tsx` (ferramenta Roteiro) — botão "Extrair Breakdown" após gerar roteiro

### Feature 6: Shot List Visual

**New Components:**
- `ShotListBuilder.tsx` — Grid drag-and-drop com `@dnd-kit`
- `ShotCard.tsx` — Card visual de shot com thumbnail + specs
- `ShotEditDialog.tsx` — Modal criar/editar shot
- `ShotExportButton.tsx` — Exportar PDF shot list

**Integration Points:**
- `client/src/pages/Project.tsx` — nova tab "Shot List" ao lado de "Tasks"

### Feature 7: Timesheet

**New Components:**
- `TimerWidget.tsx` — Widget floating com timer ativo (HH:MM:SS)
- `TimesheetView.tsx` — Página `/timesheet` com tabela + filtros
- `TimeEntryEditDialog.tsx` — Modal editar entrada
- `TimesheetExportButton.tsx` — Exportar CSV

**Integration Points:**
- Cada task card — botão "▶️ Iniciar Timer"
- Global header — indicador de timer ativo (quando rodando)

### Feature 8: Calendar Sync

**New Components:**
- `CalendarExportButtons.tsx` — Botões: "Baixar .ics" + "Adicionar ao Google"
- `GoogleCalendarAuth.tsx` — Modal OAuth2 flow
- `CalendarSyncStatus.tsx` — Badge indicando "Sincronizado ✓" ou "Pendente"

**Integration Points:**
- `client/src/pages/Studio.tsx` (ferramenta Callsheet) — botões após gerar callsheet
- `client/src/pages/Settings.tsx` — seção "Integrações > Google Calendar" com status + revogar

## Error Handling

### Webhook Delivery Failures

**Scenario:** URL do webhook retorna 500 ou timeout.

**Handling:**
1. Log delivery em `webhook_deliveries` com status failed
2. Incrementa `failureCount` do webhook
3. Se `failureCount < 3`: agendar retry com backoff (10s, 30s, 90s)
4. Se `failureCount >= 3`: marcar webhook `isActive = false` e enviar email ao usuário
5. Dashboard mostra badge "⚠️ Webhook pausado — verificar logs"

### Google Calendar API Errors

**Scenario:** Token expirou ou usuário revogou permissão.

**Handling:**
1. Catch erro 401 de `googleapis`
2. Limpar `googleAccessToken` e `googleRefreshToken` do user
3. Mostrar toast: "Permissão Google Calendar expirou. Re-autorize em Settings."
4. Desabilitar botão "Adicionar ao Google" até re-auth

### Asset Library Storage Limit

**Scenario:** Usuário Free tenta upload que excede 100MB total.

**Handling:**
1. Calcular `SUM(sizeBytes)` de assets do user antes de aceitar upload
2. Se exceder limite do plano: retornar 403 com `{ error: "storage_limit_exceeded", limitMB, usedMB }`
3. Frontend mostra modal: "Limite de 100MB atingido. Upgrade para Pro (1GB) ou remova assets antigos."

### Client Portal Expiration

**Scenario:** Link de portal expirou (Free plan, 30 dias).

**Handling:**
1. Middleware verifica `expiresAt` antes de servir portal
2. Se expirado: retornar página customizada "Portal expirado. Contate o produtor para renovar."
3. Produtor recebe email 7 dias antes da expiração (cron job diário)

## Testing Strategy

### Unit Tests (Vitest)

**Novos testes por feature:**

1. **Templates:**
   - `templatesService.test.ts`: criar template, duplicar projeto, validar tasks default

2. **Client Portal:**
   - `clientPortalService.test.ts`: gerar shareToken, verificar expiração, registrar approval

3. **Webhooks:**
   - `webhooksService.test.ts`: deliverWebhook com mock HTTP, retry logic, signature HMAC

4. **Assets:**
   - `assetsService.test.ts`: upload, soft delete, filtros por tipo/tags

5. **Breakdown:**
   - `breakdownService.test.ts`: mock AI response, parse JSON, export PDF

6. **Shots:**
   - `shotsService.test.ts`: criar shot, reordenar (sortOrder), export PDF

7. **Timesheet:**
   - `timesheetService.test.ts`: start/stop timer, calcular duration, export CSV

8. **Calendar:**
   - `calendarService.test.ts`: gerar .ics válido, mock Google API sync

**Target:** +50 testes novos (média 6-7 por feature).

### Integration Tests (opcional, se tempo permitir)

- E2E com Playwright: criar projeto de template, ativar portal, verificar link público acessível
- E2E webhook: trigger evento `task.completed`, verificar delivery log

### Performance Tests

- **Asset Library:** carregar grid com 100 assets → <2s
- **Shot List:** drag-and-drop 50 shots → sem lag perceptível
- **Timesheet:** query 1000 entries com filtro → <500ms

## Migration Strategy

### Ordem de Execução (Prisma Migrations)

1. `001_add_project_templates.sql` — criar tabela `project_templates`
2. `002_add_client_portal_shares.sql` — criar tabela `client_portal_shares`
3. `003_add_webhooks.sql` — criar tabelas `webhooks` + `webhook_deliveries`
4. `004_add_assets.sql` — criar tabela `assets`
5. `005_add_shots.sql` — criar tabela `shots`
6. `006_add_script_breakdowns.sql` — criar tabela `script_breakdowns`
7. `007_add_time_entries.sql` — criar tabela `time_entries`
8. `008_add_calendar_events.sql` — criar tabela `calendar_events`
9. `009_alter_users_for_calendar.sql` — add colunas Google tokens + hourlyRate
10. `010_seed_system_templates.sql` — insert 5 templates padrão

### Rollback Plan

Cada migration é independente. Rollback via `prisma migrate resolve --rolled-back <name>`. Zero risco de perda de dados (todas tabelas novas).

### Compatibilidade com Fase 3

Fase 3 (white-label) não toca em nenhuma tabela que vamos criar. Zero conflito. Única interação: Client Portal usa `SITE_CONFIG.brandName` para branding.

## Design Decisions

### D1: Templates como JSON vs. Tabelas Normalizadas

**Escolhido:** JSON em `defaultTasks` e array `defaultTools`.

**Rationale:** Templates são "snapshots" imutáveis de configuração. Não precisam joins complexos. JSON facilita duplicação e versionamento futuro.

**Trade-off:** Queries complexas (ex: "templates que usam ferramenta X") são menos eficientes. Aceitável — templates não são queried frequentemente.

### D2: Client Portal com Senha vs. Token Único

**Escolhido:** Token único (UUID) suficiente. Senha opcional apenas Studio plan.

**Rationale:** Maioria dos casos não precisa senha (cliente confia em produtor). UUID tem 128-bit entropy = impossível brute force. Senha adiciona fricção UX.

**Trade-off:** Quem tem link pode acessar. Mitigado por: expiração automática + audit log de acessos + produtor pode desativar a qualquer momento.

### D3: Webhooks Retry com Cron vs. Bull Queue

**Escolhido:** Retry simples com flag `nextRetryAt` + cron job diário.

**Rationale:** Bull/BullMQ requer Redis ($10/mo). Cron job diário é suficiente para retry não-crítico (webhook não é real-time mission-critical).

**Trade-off:** Retry não é imediato (pode demorar até 24h para terceira tentativa). Aceitável — usuário pode reenviar manualmente se urgente.

### D4: Asset Library Storage em Cloudinary vs. S3

**Escolhido:** Cloudinary (já configurado).

**Rationale:** Cloudinary Free tier tem 25GB storage + transformações automáticas (thumbnails). S3 seria $0.023/GB (mais barato long-term, mas exige setup de transformação separado).

**Trade-off:** Vendor lock-in Cloudinary. Se ultrapassar free tier, upgrade é $89/mês (abrupto). Mitigado por: limites por plano impedem crescimento descontrolado.

### D5: Shot List com @dnd-kit vs. Sortable.js

**Escolhido:** `@dnd-kit` (já no package.json).

**Rationale:** Já está instalado (usado onde?). React-first, TypeScript-friendly, ótima performance.

**Trade-off:** Nenhum — é a escolha correta para React.

### D6: Script Breakdown via IA vs. Regex Parsing

**Escolhido:** IA (OpenRouter).

**Rationale:** Roteiros têm formato livre. Regex falharia em edge cases (diálogos improvisados, indicações não-padrão). IA entende contexto.

**Trade-off:** Custo de ~$0.001 por roteiro. Aceitável. Latência de ~5-10s. Aceitável (não é real-time).

### D7: Timesheet Timer em LocalStorage vs. Server

**Escolhido:** Server (salva `startTime` em memória ou Redis se disponível, senão Postgres).

**Rationale:** LocalStorage perde dados se usuário troca device. Server persiste timer ativo e permite continuar de qualquer lugar.

**Trade-off:** Requires WebSocket OU polling para sync timer em tempo real. Solução: polling a cada 10s (leve).

### D8: Google Calendar OAuth vs. Service Account

**Escolhido:** OAuth (user auth).

**Rationale:** Cada usuário sincroniza seu próprio calendário. Service Account seria para calendário compartilhado da produtora (não é o caso).

**Trade-off:** Usuário precisa autorizar uma vez. Aceitável — fluxo padrão do Google.

## Correctness Properties

Invariantes que o sistema DEVE preservar em todos os estados:

### Property 1: Client Portal isolation

**Validates: Requirements 2.3, 2.6, 2.7**

- Portal share tokens (UUID v4) DEVEM ser únicos globalmente. Colisão = 0 (garantido pelo UUID v4).
- Portais desativados NÃO devem servir dados do projeto, mesmo com token válido.
- Portais expirados retornam 410 Gone, NÃO 500 (falha graciosa).

### Property 2: Webhook delivery consistency

**Validates: Requirements 3.3, 3.4, 3.7**

- Cada evento dispara webhook AT LEAST ONCE (mesmo com falha temporária, retry entrega eventualmente OR marca como falha permanente após 3 tentativas).
- Payload HMAC signature DEVE ser calculada com o secret exato do webhook (impossível forjar).
- Ordem de eventos NÃO é garantida (webhooks são async, receptor deve tratar out-of-order).

### Property 3: Timer state exclusivity

**Validates: Requirements 7.7**

- Cada usuário TEM NO MÁXIMO 1 timer ativo em qualquer momento. Tentar iniciar segundo timer:
  - Auto-pausa o anterior (comportamento padrão) OR
  - Retorna 409 Conflict (se `preventAutoPause=true`).
- Timer que ficou "esquecido" (>24h ativo sem para) é auto-parado por cron diário (com log warning).

### Property 4: Asset soft-delete integrity

**Validates: Requirements 4.4, 4.5**

- Asset com `deletedAt != null` NÃO aparece em listagens, MAS sua URL Cloudinary continua acessível (para projetos que já usam).
- Hard delete (permanente) só acontece após 90 dias E se não estiver linkado a nenhum projeto ativo.

### Property 5: Template immutability para sistema

**Validates: Requirements 1.8**

- Templates com `isSystem: true` NUNCA podem ser deletados via API (retorna 403).
- Templates system podem ser atualizados APENAS via migration/seed (código versionado).

### Property 6: Shot ordering integrity

**Validates: Requirements 6.4, 6.7**

- `sortOrder` DEVE ser único por projeto (nenhum shot com mesmo sortOrder no mesmo projeto).
- Reorder bulk é atômico (transaction). Falha parcial = rollback total.

### Property 7: Script Breakdown 1:1 com projeto

**Validates: Requirements 5.3, 5.7**

- Cada projeto tem NO MÁXIMO 1 breakdown ativo (constraint UNIQUE em `projectId`).
- Re-extract sobrescreve o anterior (não gera duplicata).

### Property 8: Calendar event dedupe

**Validates: Requirements 8.5, 8.7**

- Sync de callsheet MESMO callsheet 2x NÃO gera 2 eventos no Google. Segunda chamada faz UPDATE via `googleEventId` salvo.
- Deleção de projeto no Cena Studio DEVE deletar eventos no Google (via cascade + hook).

### Property 9: Storage limits enforcement

**Validates: Requirements 4.6, 4.7**

- Upload de asset NÃO pode exceder limite do plano do usuário. Verificação server-side ANTES de aceitar upload.
- Client-side validation é UX (feedback rápido), mas server-side é source of truth.

### Property 10: Webhook secret exposure

**Validates: Requirements 3.7**

- `secret` de webhook é retornado ao usuário APENAS na criação. Nunca em GET subsequente.
- Requests para `/api/webhooks/:id` retornam `secretHint` (últimos 4 chars) mas nunca o secret completo.

## References

- [Requirements](./requirements.md)
- [Tasks](./tasks.md) _(a ser criado)_
- Fase 3 White Label: `../fase-3-white-label/`
- Architecture: `../../../ARCHITECTURE.md`
- Existing services: `server/services/`
- Existing components: `client/src/components/`
