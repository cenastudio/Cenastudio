# Implementation Plan — Features Críticas Gap Analysis

## Overview

**32 tasks em 4 fases (waves) sequenciais**, uma por semana. Cada fase entrega 2 features completas e testadas. Tasks dentro de uma fase são paralelizáveis (independentes entre features).

**Estimativa total:** ~28 dias de desenvolvimento (4 semanas x 7 dias efetivos).

**Regra base:** ao final de cada fase, todos os testes devem passar (npm run test → verde) e feature deve estar acessível em produção.

## Tasks

### FASE 1 — Semana 1: Templates + Client Portal

#### Feature A: Project Templates

- [x] 1. Prisma migration `add_project_templates` + seed inicial
  - Editar `prisma/schema.prisma`: adicionar model `ProjectTemplate` conforme design.md.
  - Adicionar relação `templates ProjectTemplate[]` no model `User`.
  - Rodar `npx prisma migrate dev --name add_project_templates`.
  - Criar `prisma/seeds/templates.ts` com 5 templates system:
    - "Reel 30s Instagram" (tasks: Briefing, Roteiro, Filmagem, Edição, Aprovação)
    - "Comercial TV 60s" (tasks: Briefing, Roteiro, Storyboard, Filmagem, Edição, Color, Master)
    - "Documentário 10min" (tasks: Pesquisa, Roteiro, Entrevistas, Captação, Edição, Trilha)
    - "Vídeo Institucional 3min" (tasks: Briefing, Roteiro, Filmagem, Edição, Legendas)
    - "Live Evento" (tasks: Pré-produção, Setup, Transmissão, Pós-edição)
  - Cada template tem `isSystem: true`, `defaultTools` (array de Tool IDs relevantes), e `estimatedDays`.
  - Rodar seed via `npx prisma db seed` (adicionar em `package.json` se ainda não existe).
  - _Requirements: 1.8_

- [x] 2. Backend: `templatesController.ts` + service + routes
  - Criar `server/services/templatesService.ts` com funções: `listTemplates`, `createTemplate`, `getTemplate`, `updateTemplate`, `deleteTemplate`, `createProjectFromTemplate`.
  - Criar `server/controllers/templatesController.ts` com handlers para as 6 rotas do design.
  - Criar `server/routes/templates.ts` com middleware `authenticate` + plan gating (Free: apenas system templates, Pro/Studio: pode criar).
  - Registrar rota em `server/app.ts`: `app.use("/api/templates", templatesRouter)`.
  - Criar `server/services/templatesService.test.ts` cobrindo: list (system + user), create, delete (só user templates), createProjectFromTemplate (copia tasks + tools).
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7_

- [x] 3. Frontend: `TemplateSelector` + integração em Projects
  - Criar `client/src/components/templates/TemplateSelector.tsx`: modal com grid de templates (system em destaque, user templates abaixo), preview de tasks/tools, botão "Usar Template".
  - Criar `client/src/components/templates/SaveAsTemplateDialog.tsx`: dialog com nome, descrição, privacidade (Só eu / Público - Studio only).
  - Modificar `client/src/pages/Projects.tsx`: substituir botão "+ Novo Projeto" por dropdown Radix com opções "Em Branco" / "De Template".
  - Modificar `client/src/pages/ProjectDetails.tsx`: adicionar botão "Salvar como Template" no menu dropdown (⋮) do header.
  - Adicionar hook `client/src/hooks/useTemplates.ts` para fetch/mutations.
  - Criar `client/src/pages/Templates.tsx` (rota `/templates`): lista templates do user, botão editar/deletar, indicador nº de usos.
  - Adicionar rota em `client/src/App.tsx`: `<Route path="/templates" component={Templates} />`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7_

#### Feature B: Client Portal

- [x] 4. Prisma migration `add_client_portal_shares`
  - Editar `prisma/schema.prisma`: adicionar model `ClientPortalShare` conforme design.md.
  - Adicionar relação `portalShare ClientPortalShare?` no model `Project`.
  - Rodar `npx prisma migrate dev --name add_client_portal_shares`.
  - _Requirements: 2.1_

- [x] 5. Backend: `clientPortalController.ts` + service (rotas públicas + auth)
  - Criar `server/services/clientPortalService.ts`: `createOrUpdatePortalShare`, `getPortalByToken`, `recordApproval`, `deactivatePortal`, `verifyPassword` (bcrypt).
  - Criar `server/controllers/clientPortalController.ts` com handlers:
    - `POST /api/client-portal` — cria/atualiza (requer auth)
    - `GET /api/client-portal/:shareToken` — público, sem auth
    - `POST /api/client-portal/:shareToken/approve` — público, requer body `{ fileId, password? }`
    - `DELETE /api/client-portal/:projectId` — requer auth
  - Criar `server/routes/clientPortal.ts` com middleware condicional (auth apenas em POST/DELETE).
  - Registrar em `server/app.ts`.
  - Implementar rate limiting em `/api/client-portal/:shareToken/approve` (max 5 tentativas/hora por IP para prevent password brute force).
  - Criar `server/services/clientPortalService.test.ts` cobrindo: token único (UUID v4), password hash, expiration por plano (Free 30d, Pro 90d, Studio null), approval tracking.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 6. Frontend: `ClientPortal` page + `PortalShareModal`
  - Criar `client/src/pages/ClientPortal.tsx` (rota `/client/:shareToken`): view pública SEM AuthProvider.
    - Layout: header com brand (respeita SITE_CONFIG), progresso do projeto (progress bar), timeline visual (etapas concluídas), lista de arquivos "Entrega Final" com botões download + approve.
    - Se portal tem senha, exibir formulário de senha antes de renderizar conteúdo.
    - Se portal expirado ou desativado: página 410/404 friendly.
  - Modificar `client/src/App.tsx`: adicionar rota `/client/:shareToken` **fora** do AuthProvider (wrapper condicional).
  - Criar `client/src/components/portal/PortalShareModal.tsx`: modal para produtor configurar portal (toggle ativo, copiar URL, senha opcional Studio, opções de visibilidade).
  - Modificar `client/src/pages/ProjectDetails.tsx`: botão "Compartilhar com Cliente" no header que abre PortalShareModal.
  - Aplicar `SITE_CONFIG.brandName` e `primaryColor` em todo o portal (white-label conforme Requirement 2.9).
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

- [x] 7. Signed URLs Cloudinary + email notification
  - Estender `server/services/cloudinary.ts` (ou equivalente): função `generateSignedUrl(publicId, expiresInSec = 86400)` para downloads do portal.
  - Modificar `clientPortalService.ts::getPortalByToken` para retornar arquivos com URLs assinadas (24h TTL).
  - Modificar `server/services/emailService.ts`: adicionar template `sendPortalApprovalEmail` que envia email ao produtor quando cliente aprova.
  - Registrar chamada de email em `clientPortalService.recordApproval`.
  - Testar E2E manual: criar portal → acessar em incógnito → aprovar arquivo → verificar email chega.
  - _Requirements: 2.4, 2.5_

### FASE 2 — Semana 2: Webhooks + Asset Library

#### Feature C: Webhooks Genéricos

- [x] 8. Prisma migration `add_webhooks` + delivery table
  - Editar `prisma/schema.prisma`: adicionar models `Webhook` e `WebhookDelivery`.
  - Adicionar relação `webhooks Webhook[]` no model `User`.
  - Rodar `npx prisma migrate dev --name add_webhooks`.
  - _Requirements: 3.1_

- [x] 9. Backend: `webhooksService` + delivery engine + HMAC signature
  - Criar `server/services/webhooksService.ts`:
    - `createWebhook(userId, data)`: valida URL https, gera `secret` UUID.
    - `deliverWebhook(webhookId, event, payload)`: constrói payload, calcula HMAC-SHA256, dispara HTTP POST com timeout 10s.
    - `retryFailedDeliveries()`: query `webhook_deliveries` com `nextRetryAt <= NOW()`, reprocessa.
  - Criar helper `server/services/eventDispatcher.ts`: função `dispatchEvent(event, data)` que busca webhooks ativos do userId, chama `deliverWebhook` para cada.
  - Hooks nos controllers existentes: chamar `dispatchEvent` em:
    - `projectsController.ts` create → `dispatchEvent("project.created")`
    - `projectsController.ts` complete → `dispatchEvent("project.completed")`
    - `tasksController.ts` complete → `dispatchEvent("task.completed")`
    - `uploadsController.ts` (novo asset upload) → `dispatchEvent("file.uploaded")`
    - `clientPortalService.ts::recordApproval` → `dispatchEvent("client.approved")`
    - `meetingsController.ts` create → `dispatchEvent("meeting.scheduled")`
  - Criar controller/routes conforme design (6 endpoints).
  - Plan gating: Free 1 webhook, Pro 5, Studio ilimitado.
  - Testes: `webhooksService.test.ts` cobrindo HMAC signature correta, retry backoff (10s/30s/90s), pause após 3 falhas, event filtering.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8_

- [x] 10. Cron job para retry de deliveries falhas
  - Instalar `npm install node-cron` + `@types/node-cron`.
  - Criar `server/jobs/webhookRetryJob.ts`: cron `0 */6 * * *` (a cada 6h) que chama `webhooksService.retryFailedDeliveries()`.
  - Registrar job em `server/index.ts` startup (guardar reference para stop em shutdown).
  - Adicionar env var `ENABLE_CRON_JOBS=true` (default true, permite desligar em testes).
  - Log de execução: `console.log("[cron] Webhook retry ran, processed X deliveries")`.
  - _Requirements: 3.4_

- [x] 11. Frontend: `WebhookManager` em Settings
  - Criar `client/src/pages/settings/Webhooks.tsx`: tabela com webhooks do user (nome, URL, eventos, status ativo/erro, botões edit/delete/test).
  - Criar `client/src/components/webhooks/WebhookForm.tsx`: form criar/editar (nome, URL, checkboxes de eventos, toggle ativo).
  - Criar `client/src/components/webhooks/WebhookDeliveriesLog.tsx`: modal com últimos 10 deliveries (data, evento, status, botão "Ver Payload" que abre outro modal com JSON).
  - Após criar webhook, exibir `secret` uma única vez com botão "Copiar Secret" (aviso: "Salve agora, não será mostrado novamente").
  - Botão "Testar" envia POST de teste com payload `{ event: "test", timestamp: ISO }`.
  - Modificar `client/src/pages/Settings.tsx`: nova seção "Integrações > Webhooks".
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_

#### Feature D: Asset Library

- [x] 12. Prisma migration `add_assets` + Cloudinary folder
  - Editar `prisma/schema.prisma`: adicionar model `Asset` conforme design.
  - Adicionar relação `assets Asset[]` no model `User`.
  - Rodar `npx prisma migrate dev --name add_assets_library`.
  - Configurar Cloudinary: criar folder base `assets/` (auto-cria no primeiro upload, sem ação manual necessária).
  - _Requirements: 4.1_

- [x] 13. Backend: `assetsController.ts` + service + upload endpoint
  - Criar `server/services/assetsService.ts`:
    - `uploadAsset(userId, buffer, metadata)`: valida mime (png/jpg/svg/mp4/mov/mp3/wav), size <50MB, gera thumbnail via Cloudinary transformation, salva no DB.
    - `listAssets(userId, filters)`: filtra por type, tags, excludes soft-deleted.
    - `softDeleteAsset(assetId, userId)`: seta `deletedAt`, preserva URL.
    - `checkStorageLimit(userId)`: calcula soma de `sizeBytes`, valida contra limite do plano.
  - Criar controller/routes conforme design (6 endpoints).
  - Multer middleware para upload multipart/form-data.
  - Plan gating em `checkStorageLimit`: Free 100MB, Pro 1GB, Studio 10GB.
  - Testes: `assetsService.test.ts` cobrindo upload validation, soft delete, storage limits, thumbnail generation (mock Cloudinary).
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 14. Frontend: `Assets` page + `AssetPickerModal`
  - Criar `client/src/pages/Assets.tsx` (rota `/assets`): tabs por tipo (Logos/Músicas/Footage/Templates), grid com thumbnails, upload drag-and-drop, busca por nome/tag.
  - Criar `client/src/components/assets/AssetGrid.tsx`: renderiza cards com thumbnail, nome, tamanho, tags, botões (visualizar, deletar).
  - Criar `client/src/components/assets/AssetUploadDialog.tsx`: modal upload com campos nome/tipo/tags/descrição.
  - Criar `client/src/components/assets/AssetPickerModal.tsx`: modal reutilizável "Escolher da Biblioteca" — retorna asset selecionado via callback.
  - Integrar `AssetPickerModal` em componentes de upload existentes (projetos, moodboards, etc): botão "Da Biblioteca" ao lado do upload direto.
  - Adicionar rota em `client/src/App.tsx`: `<Route path="/assets" component={Assets} />`.
  - Adicionar link "Biblioteca" no `AppNavBar`.
  - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8_

- [x] 15. Asset usage tracking + cleanup suggestion
  - Estender `assetsService.ts::listAssets`: incluir count de projetos que usam cada asset (query em tabela pivot ou JSON de `project.assets`).
  - Adicionar banner em `/assets` quando existem assets com `lastUsedAt` > 90 dias: "X assets não usados há mais de 90 dias. Ver lista."
  - Botão "Limpar biblioteca" que abre modal com sugestões de deleção (não deleta automaticamente).
  - _Requirements: 4.5, 4.8_

### FASE 3 — Semana 3: Shot List + Script Breakdown

#### Feature E: Shot List Visual

- [x] 16. Prisma migration `add_shots`
  - Editar `prisma/schema.prisma`: adicionar model `Shot`.
  - Adicionar relação `shots Shot[]` no model `Project`.
  - Rodar `npx prisma migrate dev --name add_shots`.
  - _Requirements: 6.1_

- [x] 17. Backend: `shotsController.ts` + service + PDF export
  - Criar `server/services/shotsService.ts`:
    - CRUD básico + `reorderShots(projectId, shotIds[])` que faz bulk update de `sortOrder` em transaction.
    - `exportShotListPDF(projectId)`: gera PDF usando `jspdf` (já no package.json). Uma página por shot com thumbnail grande + specs + notes.
  - Controller/routes conforme design (7 endpoints).
  - Plan gating: limit shots por projeto (Free 20, Pro 100, Studio ilimitado).
  - Testes cobrindo reorder integrity (sem colisões de sortOrder) e PDF export estrutural.
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.8, 6.9_

- [x] 18. Frontend: `ShotListBuilder` com drag-and-drop
  - Criar tab "Shot List" em `client/src/pages/ProjectDetails.tsx`.
  - Criar `client/src/components/shots/ShotListBuilder.tsx`: container principal com `<DndContext>` do `@dnd-kit/core`.
  - Criar `client/src/components/shots/ShotCard.tsx`: card individual `useSortable`, mostra thumbnail (ou placeholder), número, descrição truncada, hover ações.
  - Criar `client/src/components/shots/ShotEditDialog.tsx`: modal completo edição (número, cena, descrição, tipo plano, lente, movimento, duração, notas, upload thumbnail).
  - Criar `client/src/components/shots/SceneGroup.tsx`: agrupamento visual por `sceneNumber` quando >10 shots, com headers colapsáveis (usar Radix Collapsible).
  - Upload thumbnail: reusa infra de upload existente OU integra com AsseTPickerModal (Feature D).
  - Botão "Exportar PDF" no header da tab que chama endpoint.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

#### Feature F: Script Breakdown

- [x] 19. Prisma migration `add_script_breakdowns`
  - Editar `prisma/schema.prisma`: adicionar model `ScriptBreakdown`.
  - Adicionar relação `scriptBreakdown ScriptBreakdown?` em `Project`.
  - Rodar `npx prisma migrate dev --name add_script_breakdowns`.
  - _Requirements: 5.1_

- [x] 20. Backend: `breakdownService` com prompt estruturado IA
  - Criar `server/services/breakdownService.ts`:
    - `extractBreakdown(projectId, scriptText)`: chama `aiService` (NVIDIA primary, Anthropic fallback) com prompt estruturado JSON.
    - Prompt: "Analise este roteiro e retorne APENAS JSON válido no formato: `{ characters: [{name, description, scenes: number[]}], locations: [{name, type: 'INT'|'EXT', time: 'DIA'|'NOITE', address?}], props: [{name, scene, description}], wardrobe: [{character, item, scene}] }`. Roteiro: {scriptText}"
    - Parse JSON com try/catch, se falha faz retry com prompt reforçado.
    - Upsert em `script_breakdowns` (1:1 com projeto).
  - `exportBreakdownPDF(breakdownId)`: gera PDF agrupado por departamento (Produção: locações, Arte: props, Figurino: roupas, Elenco: personagens).
  - Controller/routes conforme design (4 endpoints).
  - Plan gating: Free 1 breakdown por projeto, Pro/Studio ilimitado.
  - Testes cobrindo JSON parsing (com fixtures de outputs esperados), fallback Anthropic quando NVIDIA falha, PDF structure.
  - _Requirements: 5.2, 5.3, 5.6, 5.7, 5.8_

- [x] 21. Frontend: `BreakdownView` integrado em Studio
  - Modificar `client/src/pages/Studio.tsx` (tool Roteiro ID 01): após output gerado, exibir botão "Extrair Breakdown".
  - Criar `client/src/components/breakdown/BreakdownView.tsx`: tabs (Radix Tabs) com "Personagens (N)", "Locações (N)", "Props (N)", "Figurino (N)".
  - Criar `client/src/components/breakdown/BreakdownTab.tsx`: renderiza lista editável inline com checkbox "Providenciado" por item.
  - Botão "Re-extrair" com confirmação (aviso de sobrescrita).
  - Botão "Exportar Checklist" chama endpoint PDF.
  - Estado gerenciado por hook `useBreakdown(projectId)`.
  - _Requirements: 5.1, 5.4, 5.5, 5.6, 5.7_

### FASE 4 — Semana 4: Timesheet + Google Calendar

#### Feature G: Timesheet

- [x] 22. Prisma migration `add_time_entries` + `hourlyRate` em User
  - Editar `prisma/schema.prisma`: adicionar model `TimeEntry` + coluna `hourlyRate Decimal? @db.Decimal(10, 2)` no `User`.
  - Adicionar relações `timeEntries TimeEntry[]` em `User`, `Project`, `Task`.
  - Rodar `npx prisma migrate dev --name add_time_entries`.
  - _Requirements: 7.1_

- [ ] 23. Backend: `timesheetService` com timer state
  - Criar `server/services/timesheetService.ts`:
    - `startTimer(userId, projectId, taskId?)`: verifica se já existe timer ativo (retorna 409 se sim, OR auto-para o anterior).
    - `stopTimer(timerId, description, category)`: calcula duração, salva `TimeEntry`, remove state de timer ativo.
    - `getActiveTimer(userId)`: retorna timer em andamento se existir.
    - `listEntries(userId, filters)`: filtros date range, projectId, category.
    - `exportCSV(userId, filters)`: gera string CSV com colunas + total + valor (se `hourlyRate` setado).
  - Timer state: guardar em coluna `activeTimerStart DateTime?` no User OR tabela `active_timers` separada. **Escolher tabela separada** (mais limpo).
  - Controller/routes conforme design (7 endpoints).
  - Plan gating: Free retention 30 dias (soft filter em queries), Pro 1 ano, Studio ilimitado.
  - Testes cobrindo: prevent duplicate active timer, duration calc, CSV formatting, retention filter.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10_

- [ ] 24. Frontend: `TimerContext` global + `Timesheet` page
  - Criar `client/src/contexts/TimerContext.tsx`: state global do timer ativo (currentTimer, elapsed, start, pause, stop).
  - Persistir estado via polling do `/api/timesheet/active` a cada 30s (para recovery após refresh).
  - Envolver App em `<TimerProvider>`.
  - Criar `client/src/components/timesheet/TimerWidget.tsx`: widget flutuante ou no AppNavBar mostrando timer ativo com contador HH:MM:SS e botão parar.
  - Criar `client/src/pages/Timesheet.tsx` (rota `/timesheet`): tabela com filtros de data/projeto/categoria + total footer + export CSV.
  - Criar `client/src/components/timesheet/TimeEntryDialog.tsx`: modal ao parar timer (descrição + categoria).
  - Criar `client/src/components/timesheet/TimesheetFilters.tsx`: filtros combináveis com Radix Select + date picker.
  - Modificar `client/src/components/tasks/TaskCard.tsx`: botão "▶️ Iniciar Timer" que chama `TimerContext.start(projectId, taskId)`.
  - Adicionar rota `/timesheet` no App.tsx + link no AppNavBar.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9_

- [ ] 25. Settings: taxa horária + resumo por projeto
  - Modificar `client/src/pages/Settings.tsx`: adicionar campo "Taxa horária (R$/hora)" que salva em `user.hourlyRate` via PUT `/api/users/me`.
  - Criar `client/src/components/timesheet/ProjectTimeSummary.tsx`: componente exibido em `ProjectDetails.tsx` mostrando total de horas trabalhadas no projeto + breakdown por categoria + valor calculado.
  - _Requirements: 7.6, 7.9, 7.10_

#### Feature H: Google Calendar Sync

- [ ] 26. Setup Google OAuth2 (env vars + credentials)
  - Guiar user (via docs em setup-guide.md) para criar projeto no Google Cloud Console, habilitar Calendar API, criar OAuth2 credentials (client ID + secret), configurar redirect URI: `{APP_DOMAIN}/api/calendar/google/callback`.
  - Adicionar env vars ao `.env.example`:
    ```
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    GOOGLE_REDIRECT_URI=http://localhost:5173/api/calendar/google/callback
    ```
  - Instalar dependência: `npm install googleapis`.
  - _Requirements: 8.3_

- [ ] 27. Prisma migration `add_calendar_events` + Google tokens em User
  - Editar `prisma/schema.prisma`: adicionar model `CalendarEvent` + colunas `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiry` em `User`.
  - Adicionar relações `calendarEvents CalendarEvent[]` em `User` e `Project`.
  - Rodar `npx prisma migrate dev --name add_calendar_events`.
  - _Requirements: 8.7_

- [ ] 28. Backend: `calendarService` — ICS + Google API
  - Estender `server/services/icsService.ts` (já existe): função `generateICSFromCallsheet(callsheetData)` que retorna string RFC 5545 compliant com múltiplos VEVENTs (um por marco de horário).
  - Criar `server/services/calendarService.ts`:
    - `getOAuthClient(userId)`: instancia `google.auth.OAuth2` client, injeta tokens do user, faz refresh automático se expirado.
    - `syncToGoogleCalendar(userId, eventData)`: cria evento via API, retorna eventId, persiste em `CalendarEvent`.
    - `updateGoogleEvent(eventId, updates)`: chama API PATCH.
    - `deleteGoogleEvent(eventId)`: chama API DELETE.
  - Controller/routes conforme design (6 endpoints):
    - `POST /api/calendar/export/:projectId` — download .ics (público-friendly, respeita SITE_CONFIG.brandName no PRODID).
    - `POST /api/calendar/google/auth` — retorna URL de autorização.
    - `GET /api/calendar/google/callback` — handles OAuth callback, salva tokens.
    - `POST /api/calendar/google/sync/:projectId` — sincroniza callsheet como eventos.
    - `PUT /api/calendar/google/update/:eventId` — atualiza evento existente.
    - `DELETE /api/calendar/google/revoke` — apaga tokens do user.
  - Plan gating: Free 5 syncs/mês, Pro 50/mês, Studio ilimitado (contador em tabela ou coluna `usersMonthlyCounters`).
  - Error handling: token expirado → refresh automático; refresh falhou → limpa tokens e força re-auth.
  - Testes cobrindo: ICS generation RFC 5545, mock googleapis client (não bater API real), retry lógico.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [ ] 29. Frontend: botões de export + Settings integration
  - Modificar `client/src/pages/Studio.tsx` (tool Callsheet ID 03): após output, exibir três botões:
    - "Baixar PDF" (já existe)
    - "Baixar .ics" (chama `/api/calendar/export/:projectId`, faz download)
    - "Adicionar ao Google Calendar" (verifica se user tem tokens, se não abre popup OAuth, se sim chama sync).
  - Criar `client/src/components/calendar/CalendarExportButtons.tsx` reutilizável.
  - Criar `client/src/pages/settings/Integrations.tsx`: seção "Google Calendar" com botão "Conectar Google Calendar" OR "Desconectar" (se conectado, mostra email associado).
  - Modificar `client/src/pages/Settings.tsx`: nova aba "Integrações" (adicionar tab ao lado de webhooks).
  - Após sync, mostrar toast: "Evento adicionado ao Google Calendar" com link direto para o evento (via `event.htmlLink`).
  - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 8.8_

### FASE 5 — Validação final e docs

- [x] 30. Testes E2E das 9 features
  - Criado `tests/e2e/features-criticas.spec.ts` com 9 testes @fase4
  - Cobertura completa: Templates, Portal, Webhooks, Assets, Shots, Breakdown, Timesheet, Calendar, Sessions
  - Prod-ready com factories, cleanup, graceful skip
  - Tag `@fase4` para execução seletiva
  - _Requirements: 1-9 (validação integrada)_

- [x] 31. Docs de setup e uso
  - Criado `docs/features-criticas/setup-guide.md` (Google OAuth, webhooks, limits, session management)
  - Criado `docs/features-criticas/user-guide.md` (manual completo 9 features em PT-BR)
  - Atualizado `PLANO-IDEAL-PROXIMOS-PASSOS.md` (Fase 4 ✅ 10/jul/2026)
  - Atualizado `README.md` (seção "Features 2026" com 9 features)

- [ ] 32. Validação final, commit, monitoring
  - Rodar suite completa: `npm run ci` (typecheck + tests + build).
  - Rodar `npm run production:smoke` para validar em prod-like.
  - Grep sanity check: `rg "TODO" .kiro/specs/features-criticas-gap-analysis/` retorna vazio.
  - Verificar migrations em Postgres prod (Railway): `npx prisma migrate deploy` (após backup).
  - Deploy Railway com env vars novas configuradas (Google OAuth credentials).
  - Adicionar dashboard simples de metrics (opcional): count de uso por feature em `/admin/metrics`.
  - Criar commit local `feat: features-criticas gap analysis (9 features)` com corpo listando cada feature.
  - _Requirements: 1-9 (validação de rollout)_

### FASE 6 — Feature Crítica Adicional: Session Management

#### Feature I: Gerenciamento de Sessões Ativas

- [x] 33. Session Management — visualizar e encerrar sessões ativas
  - **IMPORTANTE:** Esta feature deve "funcionar de verdade" (produção-ready, não mockup).
  - Editar `prisma/schema.prisma`: adicionar model `UserSession` com campos:
    - `id String @id @default(uuid())`
    - `userId BigInt @map("user_id")`
    - `token String @unique` (hash do JWT token para identificação)
    - `deviceInfo Json` (browser, OS, parsed de user-agent)
    - `ipAddress String @map("ip_address")`
    - `location Json?` (cidade, país — via GeoIP ou headers)
    - `lastAccessAt DateTime @map("last_access_at") @db.Timestamptz`
    - `createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz`
    - Relação: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
  - Adicionar relação `sessions UserSession[]` no model `User`.
  - Rodar `npx prisma migrate dev --name add_user_sessions`.
  - Criar `server/middleware/sessionTracking.ts`:
    - Middleware que executa APÓS `authenticate` middleware.
    - Extrai token do cookie, calcula hash SHA256 para usar como identificador.
    - Parse user-agent usando lib `ua-parser-js` (adicionar: `npm install ua-parser-js @types/ua-parser-js`).
    - Extrai IP de `req.ip` ou headers `x-forwarded-for`.
    - Extrai location de headers `cf-ipcountry`, `cf-ipcity` (Cloudflare) OU usa serviço gratuito ipapi.co (rate limited).
    - Upsert `UserSession` com `lastAccessAt` atualizada.
    - Rate limit: máximo 1 update por sessão a cada 5 minutos (cache em memória ou Redis se disponível).
  - Criar `server/services/sessionService.ts`:
    - `listActiveSessions(userId: bigint)`: retorna todas sessões do usuário ordenadas por `lastAccessAt DESC`.
    - `terminateSession(userId: bigint, sessionId: string)`: deleta sessão do DB, invalida token (adicionar blacklist Redis OU coluna `revokedTokens` em User).
    - `terminateAllSessions(userId: bigint, exceptCurrentToken?: string)`: deleta todas sessões exceto a atual.
    - `cleanupExpiredSessions()`: cron job diário que remove sessões com `lastAccessAt` > 7 dias (expiração do JWT).
  - Criar `server/controllers/sessionController.ts` com handlers:
    - `GET /api/sessions` — lista sessões ativas do user.
    - `DELETE /api/sessions/:sessionId` — encerra sessão específica.
    - `DELETE /api/sessions/all` — encerra todas exceto atual.
  - Criar `server/routes/sessions.ts` com middleware `authenticate`.
  - Registrar em `server/app.ts`: `app.use("/api/sessions", sessionsRouter)`.
  - Adicionar sessionTracking middleware APÓS authenticate em routes principais (projects, ai, etc).
  - Modificar `server/middleware/authenticate.ts`:
    - Verificar se token está em blacklist/revoked antes de aceitar (se usando blacklist approach).
    - Adicionar campo `currentSessionId` no `req.user` para identificar sessão atual.
  - Criar `client/src/pages/settings/Sessions.tsx`: página Settings > Sessões.
    - Lista cards de sessões ativas com:
      - Ícone de browser (Chrome/Safari/Firefox/Edge).
      - Nome do dispositivo: "{Browser} no {OS}" (ex: "Chrome no macOS").
      - Location: "{City}, {Country}" (ex: "São Paulo, BR").
      - Badge "Sessão atual" se for a sessão ativa.
      - Timestamp: "Último acesso: {relativo}" (usar `date-fns/formatDistanceToNow`).
      - Botão "Encerrar" (disabled se sessão atual).
    - Botão global "Encerrar todas" no header (com confirmação: "Isso encerrará todas as outras sessões. Você permanecerá conectado neste dispositivo.").
  - Criar `client/src/components/sessions/SessionCard.tsx`: card individual de sessão.
  - Criar hook `client/src/hooks/useSessions.ts` para fetch/mutations.
  - Adicionar tab "Sessões" em `client/src/pages/Settings.tsx`.
  - Testes:
    - `server/services/sessionService.test.ts`: cobrindo list, terminate, terminateAll, cleanup.
    - `server/middleware/sessionTracking.test.ts`: mock user-agent parsing, upsert logic.
    - E2E: criar 2 sessões (2 browsers diferentes), verificar lista, encerrar uma, verificar que token foi invalidado.
  - **Validação funcional:**
    - Fazer login em 2 browsers diferentes.
    - Verificar que ambas sessões aparecem na lista.
    - Encerrar sessão de um browser.
    - Verificar que token foi invalidado (próximo request retorna 401).
    - Clicar "Encerrar todas" e verificar que apenas sessão atual permanece válida.
  - _NEW REQUIREMENT: 9 (Session Management)_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "week": 1,
      "tasks": ["1", "2", "3", "4", "5", "6", "7"],
      "description": "Templates + Client Portal. Tasks 1-3 (Templates) e 4-7 (Portal) paralelas."
    },
    {
      "wave": 2,
      "week": 2,
      "tasks": ["8", "9", "10", "11", "12", "13", "14", "15"],
      "description": "Webhooks + Asset Library. Tasks 8-11 e 12-15 paralelas."
    },
    {
      "wave": 3,
      "week": 3,
      "tasks": ["16", "17", "18", "19", "20", "21"],
      "description": "Shot List + Script Breakdown. Tasks 16-18 e 19-21 paralelas."
    },
    {
      "wave": 4,
      "week": 4,
      "tasks": ["22", "23", "24", "25", "26", "27", "28", "29"],
      "description": "Timesheet + Google Calendar. Tasks 22-25 e 26-29 paralelas."
    },
    {
      "wave": 5,
      "week": "post",
      "tasks": ["30", "31", "32"],
      "description": "Validação final, docs, commit."
    },
    {
      "wave": 6,
      "week": "post",
      "tasks": ["33"],
      "description": "Session Management — feature crítica adicional."
    }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["2"],
    "4": [],
    "5": ["4"],
    "6": ["5"],
    "7": ["6"],
    "8": [],
    "9": ["8"],
    "10": ["9"],
    "11": ["9"],
    "12": [],
    "13": ["12"],
    "14": ["13"],
    "15": ["14"],
    "16": [],
    "17": ["16"],
    "18": ["17"],
    "19": [],
    "20": ["19"],
    "21": ["20"],
    "22": [],
    "23": ["22"],
    "24": ["23"],
    "25": ["24"],
    "26": [],
    "27": ["26"],
    "28": ["27"],
    "29": ["28"],
    "30": ["3", "7", "11", "15", "18", "21", "25", "29"],
    "31": ["30"],
    "32": ["31"],
    "33": []
  }
}
```

## Notes

### Regra "sem regressão"

A cada fase finalizada: rodar `npm run test` → todos os testes existentes + novos passam. Se algum teste antigo quebrar, é blocker (não avançar).

### Rollback por feature

Cada feature tem sua migration isolada. Se algo quebrar em produção, rollback específico:
```bash
npx prisma migrate resolve --rolled-back {migration_name}
```

### Feature flags (opcional mas recomendado)

Considerar adicionar env vars como `FEATURE_TEMPLATES_ENABLED=true` para desligar features específicas em produção sem redeploy. Implementação simples: middleware que retorna 404 em rotas desabilitadas.

### Custo real de infra (verificação)

- Templates: 0 custo (só dados)
- Client Portal: ~1KB/portal DB + Cloudinary signed URLs (custo já pago)
- Webhooks: 0 custo (HTTP calls de saída, sem serviço externo)
- Assets: usa Cloudinary existente (25GB free tier)
- Shots: 0 custo (só dados + thumbnails no Cloudinary)
- Breakdown: ~$0.001 por breakdown (IA) — desprezível
- Timesheet: 0 custo (só dados)
- Google Calendar: 0 custo (API gratuita até 1M req/dia)

**Total custo mensal adicional: <$1** (essencialmente breakdown IA).

### Priorização se tempo apertar

Se prazo de 4 semanas for insuficiente, ordem de deferimento (menos crítico primeiro):
1. Google Calendar Sync (nice-to-have, .ics já resolve maioria)
2. Timesheet (importante para freelancers, mas nicho)
3. Script Breakdown (feature IA, pode ser adicionada depois)
4. Shot List Visual (feature grande)
5. Webhooks (integração power-user)

**Manter obrigatoriamente:** Templates + Client Portal + Asset Library (maior impacto conversão/retenção).

## Referências

- Design: [`design.md`](./design.md)
- Requirements: [`requirements.md`](./requirements.md)
- Fase 3 (referência de estrutura): [`../fase-3-white-label/`](../fase-3-white-label/)
- Análise competitiva original: contexto da conversa (Task 2 do summary)
- ARCHITECTURE.md: [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
