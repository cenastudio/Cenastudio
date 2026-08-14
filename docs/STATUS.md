# Status — Cena Studio

> Documento único e vivo. Não crie `*_SUMMARY.md`, `*_REPORT.md`,
> `*_COMPLETION.md` — atualize este arquivo. Toda vez que algo mudar
> de estado, edite a seção correspondente, não acrescente uma nova
> no fim sem contexto. Data da última atualização no topo.

**Última atualização:** 2026-08-14

## 0. Produção atual

- **Deploy:** Vercel, projeto `cena-studio-prod`, domínio
  `https://cena-studio-prod.vercel.app/`.
- **Banco:** Supabase Postgres, via `SUPABASE_DATABASE_URL` com pooler.
- **GitHub:** repositório `cenastudio/Cenastudio`, branch `main`.
- **Verificado em 2026-08-14:** health/readiness, login admin, cadastro de conta,
  listagem de ferramentas, geração IA, criação de projeto e Shot List.
- **Correção pós-migração:** sequences do Postgres foram realinhadas em produção
  depois de erros `Unique constraint failed on id` em notifications, sessions e
  workspaces. Script permanente: `npm run db:reset-sequences`.
- **RLS Supabase:** aplicado em 2026-08-14 para 48/48 tabelas públicas, sem
  `FORCE ROW LEVEL SECURITY`. A Data API pública mantém leitura apenas de
  `tools` e `plans`; `anon` não lê nem insere em `users`; `service_role` continua
  acessando dados administrativos. Advisor de segurança do Supabase: sem issues.
  Migração versionada:
  `supabase/migrations/20260814142142_harden_public_rls.sql`; rollback de
  emergência: `scripts/sql/rollback-supabase-public-rls.sql`.

## 1. Estado atual por módulo/feature

Cada linha foi verificada contra o código (rotas em `server/router.ts`, models em
`prisma/schema.prisma`), não contra documentação anterior. Onde não deu para
verificar, está dito explicitamente.

- **Video Review:** implementado e conectado. Rotas em `server/router.ts:160-176`
  (`/video-reviews`, `/public/video-reviews`, `/video-upload` e endpoints
  singulares), controllers `videoReviewsController.ts` / `videoUploadController.ts`,
  models `VideoReview` e `VideoComment`. Esteve quebrado em 07/2026 por
  desregistro de rotas; corrigido desde então.
- **Session Management:** funcional com lacunas. `/sessions` (`router.ts:179`),
  model `UserSession`, revogação remota funcionando (`revokedAt` → 401 via
  `isTokenRevoked` em `authenticate`). Estratégia de invalidação é deny-list, não
  a allow-list da spec original — ver ADR-011. Faltam: geolocalização (descartada,
  sem campo `location`), `ua-parser-js` (substituído por `parseDeviceLabel()`
  próprio), poda da tabela (ver Seção 4) e teste unitário do service. UI vive em
  `client/src/pages/Profile.tsx`, não em página dedicada.
- **Webhooks:** funcional sem retry. `/webhooks` (`router.ts:180`), models
  `Webhook` e `WebhookDelivery`, `server/services/webhookService.ts` (377 linhas)
  com CRUD, HMAC, `listDeliveries`, `sendTestPing` e `dispatchWebhookEvent`. Tela
  em `client/src/pages/Webhooks.tsx`. Eventos realmente disparados:
  `client.created`, `project.created`, `proposal.accepted`,
  `video_review.approved`, `video_review.changes_requested` — **não** os
  `project.completed` / `file.uploaded` / `client.approved` / `meeting.scheduled`
  que os relatórios afirmavam. **Não existe motor de retry:** sem
  `retryFailedDeliveries`, sem campo `nextRetryAt` no schema, sem `node-cron`
  instalado, sem `server/jobs/`. Ver Seção 4.
- **Portal do Cliente (auth):** autenticação própria, separada da do app. Login
  por e-mail + senha (bcrypt cost 12) em `client_portal_access`; JWT de 7 dias em
  cookie httpOnly `client_portal_token`, assinado com o **mesmo** segredo do app,
  com claim `type: "client-portal"`. Revogação por comparação
  `access.updatedAt > token.iat` — troca de senha ou desativação invalida tokens
  anteriores sem tabela de revogação. Decisão de segurança real e **ainda não
  registrada como ADR** — ver nota de PARE ao final desta seção.
- **Shot List:** implementado. `/shotlists` e `/shot-types`, models `ShotList`,
  `Shot`, `ShotType`.
- **Timesheet:** implementado. `/timesheets`, model `TimeEntry`.
- **Google Calendar:** rota `/calendar` registrada. A integração real com a API do
  Google **não foi verificada** — só a existência da rota.
- **Portal do Cliente:** em construção (spec `portal-do-cliente/`). Rotas `/portal`
  e `/client-portal-auth`, model `ClientPortalAccess` — presentes no working tree,
  ainda não commitados.
- **Project Templates:** presets no frontend (`PROJECT_TEMPLATES` em
  `Dashboard.tsx`, `lib/studioContext.ts`, `components/studio/ToolWorkspace.tsx`).
  Sem entidade persistida nem rota.
- **Asset Library:** tela `client/src/pages/Assets.tsx` servida pelo módulo de
  arquivos (`api.assets` → `/files/all`, `/files/:id/download`). Não é módulo
  próprio; não existe model `Asset`.
- **Script Breakdown:** sem rota, model ou tela dedicada. Aparece como ferramenta
  de IA/copy. Escopo real a confirmar quando a área de Studio for revisada.

> Nota de confiabilidade: `MISSING_FEATURES_ANALYSIS.md` (07/2026) declarava
> Templates, Asset Library e Script Breakdown como "COMPLETO e production-ready"
> com contagens de teste (12, 23, 10+) que não correspondem a código existente.
> O histórico do git confirma que nada foi removido — não houve perda, houve
> inflação de status. Os demais documentos daquela safra seguem a mesma linguagem
> e são tratados como não confiáveis até verificação contra o código.

## 2. Decisões de arquitetura em aberto

- **Asset Library: view sobre `files` ou entidade própria?** Hoje é uma view — a
  tela `Assets.tsx` consome os endpoints de arquivos e não existe model `Asset`.
  O nome sugere entidade própria, e essa ambiguidade já produziu um documento de
  auditoria afirmando que existia um módulo de assets com testes. Se a decisão
  for "permanece view", vale um ADR curto em `ARCHITECTURE.md` para encerrar a
  confusão; se for "vira entidade", precisa de model, rotas e migration.
- **Caminho duplo de acesso a dados em `server/services/sessionService.ts`.** Cada
  função (`trackSession`, `listSessions`, `revokeSession`, `isTokenRevoked`) está
  escrita duas vezes: via Prisma sob `shouldUsePrisma`, e via SQL cru
  (`db.prepare(...)`). Parece resíduo da remoção do better-sqlite3 (commit
  `4f6b5d7`). Decidir se o fallback ainda tem propósito ou se sai. Alcance real
  fora de `sessionService.ts` ainda não medido.

## 3. Gatilhos pendentes

- **Gatilho: upgrade de modelo de IA.** Ao fechar o primeiro cliente pagante →
  revisar o grupo de **alta criticidade** do ADR-014 (03 Callsheet, 04 Orçamento,
  06 Contrato, 09 Checklist) para modelo pago, antes das faixas `medium` e
  `creative`. Hoje as três faixas rodam em modelo `:free` do OpenRouter, que é
  pool compartilhado — o teto de qualidade é o do free tier. Em 2026-08-14, o eval
  da Fase D aplicou `nvidia/nemotron-3-super-120b-a12b:free` em
  `TIER_MODEL.high`: o modelo provisório anterior (`poolside/laguna-m.1:free`)
  retornou 404 em 16/16 casos; Nemotron Super marcou 63/76 critérios (82,9%) com
  1 resposta vazia.
- **Catálogo `:free` do OpenRouter envelhece sem aviso.** Na conferência de
  2026-07-27, 2 dos 5 modelos da cadeia de fallback já não existiam
  (`meta-llama/llama-3.3-70b-instruct:free`, `qwen/qwen3-next-80b-a3b-instruct:free`)
  — custavam uma volta de latência cada antes de cair no degrau seguinte.
  Corrigidos. Gatilho: ao mexer em roteamento de modelo, reconferir contra
  `GET https://openrouter.ai/api/v1/models`.
- **Rotação de credenciais — ADIADA por decisão do operador (2026-07-26).**
  Inventário completo em `docs/CREDENCIAIS_PARA_ROTACIONAR.md` (não versionado) e
  em `.private/CREDENCIAIS_ROTACIONAR.md` (procedência + valores). Nada foi
  revogado. Bloqueia o push: **não empurrar com o PAT atual**, que está em texto
  puro na URL do remote em `.git/config`. Ordem quando retomar: revogar o PAT →
  remote sem credencial embutida → rotar Cloudinary, `DATABASE_URL` e
  `JWT_SECRET` (vazamento já documentado) → decidir sobre `git filter-repo` →
  push. Rotar `JWT_SECRET` derruba todas as sessões do app e do portal de uma vez.
  Pendente também: descobrir se o histórico já foi reescrito (os commits citados
  no doc de `.private/` não existem no histórico atual, mas
  `CREDENCIAIS_TEMPLATE.md` em `1d0dc81` sobreviveu).
- ~~`.gitignore`: ancorar `RELATORIO_*` e `SESSAO_*`~~ — **resolvido.**
  `/RELATORIO_*.md` no commit `065bc36`; `/SESSAO_*.md` no lote de arquivamento
  de features-criticas. Ambos verificados nos dois sentidos (arquivo arquivado
  deixou de ser ignorado; raiz continua barrada). O
  `SESSAO_2026_07_10.md` passou a ser rastreado pelo git.
- Os ~30 padrões restantes do bloco "Docs de trabalho / scratch de sessão" do
  `.gitignore` seguem **sem âncora** `/`, então casam em qualquer profundidade.
  Nenhum arquivo afetado hoje. Gatilho: ao criar qualquer `.md` cujo nome case
  com `CHECKLIST_*`, `ANALISE_*`, `DIAGNOSTICO_*`, `STATUS_*`, `RESUMO_*` e afins
  fora da raiz → conferir se não está sendo engolido antes de assumir que foi
  versionado.

## 4. Próximas tarefas

Ordem de execução combinada. O conteúdo de cada frente vive na spec, não aqui.

1. `.kiro/specs/landing-features-implementation/` — **58 de 58 tasks feitas**.
   Tasks 7.1 a 7.4 concluídas em 2026-08-14 com validação local.
2. `.kiro/specs/00-fundacao-limpeza-e-documentacao/` — **24 de 24 tasks feitas**.
   Concluída em 2026-08-14. Documentos de entrada revisados contra o runtime
   real: `README.md`, `COMO-O-SISTEMA-FUNCIONA.md`, `API_GUIDE.md`,
   `docs/CONEXOES.md`, `docs/DESIGN_PATTERNS.md` e `AGENTS.md`. Produção
   canônica: GitHub `cenastudio/Cenastudio` → Vercel `cena-studio-prod` →
   Supabase Postgres. Railway fica apenas como histórico/legado.
3. `.kiro/specs/auditoria-ux-2026-07/` — **6 de 47 tasks feitas**. Retomar só
   depois das frentes acima, com foco em mobile/UX e validação visual real.

Pausado por dependência externa, **não bloqueante**:

- **Fase E do spec `qualidade-raciocinio-ia` (tasks 16 a 18) — aguardando acesso
  ao banco de produção.** É o loop de uso real: extrair volume, taxa de reuso e
  rating médio por `tool_id` da tabela `generations`, cruzar para achar as
  ferramentas de alto volume com reuso ou rating baixos, e repriorizar os próximos
  upgrades por dado em vez de distribuir esforço igualmente entre as 12. Sem esse
  acesso, a priorização de IA continua sendo por julgamento. Retomar quando houver
  credencial de leitura em produção ou um staging com volume real.

Tarefas soltas identificadas na verificação, sem spec própria ainda:

- Implementar poda da tabela `user_sessions`. Não existe cron nem `setInterval` no
  projeto; sessões revogadas e inativas acumulam indefinidamente. A spec original
  previa limpeza diária de registros com `lastActiveAt` acima de 7 dias (o expiry
  do JWT).
- Implementar retry de webhook delivery. Hoje uma entrega que falha morre ali: não
  há reprocessamento, campo de agendamento (`nextRetryAt`) nem scheduler. Exige
  migration (campo no `WebhookDelivery`), função no service e um scheduler — o
  mesmo scheduler serviria para a poda de `user_sessions` acima.
- ~~Fechar a checagem de claim `type` na autenticação (ADR-012, risco aceito)~~ —
  **feito.** `signToken` emite `type: "app"`; `authenticate` rejeita qualquer
  `type` presente e diferente de `"app"`. Token sem a claim continua aceito, para
  não invalidar sessões emitidas antes da mudança. Verificado: token de portal
  rejeitado, token do app aceito, token legado aceito.
- Completar `scripts/validate-env.ts`. O script checa **24** variáveis, mas o
  código referencia **79** (`.env.example` declara 89 contando aliases e as
  comentadas). Passar no `npm run validate:env` hoje não significa que o ambiente
  está completo. Em 2026-08-14 foi adicionada a checagem de
  `SUPABASE_DATABASE_URL`, mas ainda faltam variáveis como `MAX_UPLOAD_SIZE_MB`,
  `LGPD_DELETE_GRACE_DAYS` e os `STRIPE_PRICE_*_ANNUAL`.
- ~~Conferir a documentação de entrada contra o código (Etapas 4.1–4.3 da spec
  `00-fundacao-limpeza-e-documentacao/`)~~ — **feito em 2026-08-14.**
  `README.md` e `COMO-O-SISTEMA-FUNCIONA.md` foram corrigidos para Vercel +
  Supabase; `API_GUIDE.md` recebeu base URL atual e mapa de rotas conferido
  contra `server/router.ts`, `server/routes/*` e webhook Stripe em
  `server/app.ts`.

## 5. Achados extraídos de documentos arquivados

Checklist de progresso do processamento. Para cada arquivo: decisão de
arquitetura válida → ADR em `ARCHITECTURE.md`; estado atual real → Seção 1
deste arquivo. Esta seção não repete o conteúdo extraído, só marca o que
já foi revisado.

### Mudança de método (2026-07-26)

Os 3 primeiros arquivos e o lote `TASK_9` a `TASK_13` foram verificados um a um.
A partir de **`TASK_14_COMPLETION.md`** a checagem passou a ser **em bloco**:
extração automática de todo caminho `.ts`/`.tsx` afirmado pelos relatórios e teste
de existência real no working tree, em vez de leitura integral de cada um.

Motivo: o padrão se confirmou de forma consistente. `TASK_12` e `TASK_13` declaram
model `Asset`, migration `add_assets`, `assetsService.ts` (389 linhas),
`assetsController.ts` (238), `routes/assets.ts` (35) e `assetsService.test.ts`
(664 linhas, "23 testes passando") — **nada disso existe**. `TASK_10` declara
`server/jobs/webhookRetryJob.ts`, 8 testes passando e uma variável
`ENABLE_CRON_JOBS` adicionada ao `.env.example`; nenhum dos três existe, e
`node-cron` não está no `package.json`. Ler 12 relatórios integralmente para
extrair conteúdo válido deixou de se justificar; o registro por item continua.

Resultado da verificação em bloco (12 arquivos, 81 caminhos afirmados):
**33 existem, 48 não existem.**

| Arquivo | Afirmados | Existem | Faltam |
|---|---|---|---|
| `TASK_14_COMPLETION.md` | 5 | 1 | 4 |
| `TASK_15_COMPLETION.md` | 5 | 1 | 4 |
| `TASK_20_COMPLETION.md` | 5 | 1 | 4 |
| `TASK_21_COMPLETION.md` | 6 | 3 | 3 |
| `TASK_24_COMPLETION.md` | 10 | 5 | 5 |
| `TASK_25_COMPLETION.md` | 7 | 4 | 3 |
| `TASK_26_29_COMPLETION.md` | 9 | 6 | 3 |
| `TASK_33_COMPLETION_REPORT.md` | 15 | 7 | 8 |
| `SESSAO_2026_07_10.md` | 19 | 5 | 14 |
| `EXECUTIVE_SUMMARY.md` | 0 | — | — |
| `FINAL_COMPLETION_REPORT.md` | 0 | — | — |
| `PROGRESS.md` | 0 | — | — |

Os três últimos não citam caminhos de arquivo; foram checados por busca de
decisão de arquitetura (`decis|trade-?off|escolh|descartad|rejeit`) em vez de
existência de artefato.

### `features-criticas-gap-analysis/` (20)

- [x] `EXECUTIVE_SUMMARY.md` — 288 linhas, nenhuma decisão de arquitetura
      (única menção é "documentar decisões em tempo real (feito parcialmente)").
      Nada extraído.
- [x] `FINAL_COMPLETION_REPORT.md` — 450 linhas, nenhuma decisão de arquitetura.
      Nada extraído.
- [x] `MISSING_FEATURES_ANALYSIS.md` — nada para `ARCHITECTURE.md` (não continha
      decisão com trade-off); Seção 1 populada com verificação própria; 1 item
      aberto na Seção 2. Diagnóstico do doc estava obsoleto (Video Review e
      Session Management) ou incorreto (Templates/Assets/Breakdown).
- [x] `PROGRESS.md` — 584 linhas. Único conteúdo de valor: 3 "Decisões de Design"
      (linha 333). Verificadas: (1) "Templates como JSON vs tabelas normalizadas"
      — não há persistência de template, decisão sem objeto; (2) "Client Portal
      com senha vs token único → token único + senha opcional Studio" —
      **divergente do código**, que usa e-mail + senha obrigatórios, sem token
      mágico; (3) "Webhooks retry com cron vs Bull Queue → cron" — retry nunca
      foi implementado. Nenhuma virou ADR: (1) e (3) não têm implementação, (2) o
      código faz outra coisa (desenho real na nota de PARE).
- [x] `README.md` — **não arquivado**: é a descrição legítima da spec (capa com
      visão geral, links para requirements/design/tasks, custo). Corrigido no
      lugar: nota de precisão apontando para este arquivo, "8 Features
      Implementadas" → "Planejadas", link morto para
      `PLANO-IDEAL-PROXIMOS-PASSOS.md` sinalizado. Nada para `ARCHITECTURE.md`.
- [x] `SESSAO_2026_07_10.md` — bloco: 5/19, o pior índice do lote. Invisível ao
      git (`.gitignore:73` `SESSAO_*.md`); backup em `/tmp/backup-sessao.md`.
- [x] `SESSION_MANAGEMENT_SPEC.md` — gerou ADR-011 em `ARCHITECTURE.md` (decisão
      real, implementada de forma diferente da proposta e nunca registrada);
      Seção 1 corrigida; 1 item na Seção 2 (caminho duplo Prisma/SQL cru); 1
      tarefa na Seção 4 (poda de `user_sessions`).
- [x] `TASK_9_SUMMARY.md` — parcialmente real. `webhookService.ts` (nome singular,
      não `webhooksService.ts`), controller e routes existem; HMAC existe.
      `eventDispatcher.ts` não existe (a função vive dentro do service como
      `dispatchWebhookEvent`). Lista de eventos divergente. Estado → Seção 1.
- [x] `TASK_10_SUMMARY.md` — **inflação integral.** `server/jobs/webhookRetryJob.ts`,
      seu teste ("8 passando"), `node-cron` e a variável `ENABLE_CRON_JOBS` no
      `.env.example` não existem. Lacuna → Seção 4.
- [x] `TASK_11_COMPLETION.md` — parcialmente real. `api.webhooks` (api.ts:597) e
      `client/src/pages/Webhooks.tsx` existem; `hooks/useWebhooks.ts` e
      `components/webhooks/` não.
- [x] `TASK_12_COMPLETION.md` — **inflação integral.** Sem model `Asset`, sem
      migration `add_assets`. Reforça o achado de `MISSING_FEATURES_ANALYSIS.md`.
- [x] `TASK_13_COMPLETION.md` — **inflação integral.** Nenhum dos 4 arquivos
      declarados existe, incluindo o teste de 664 linhas com "23 testes".
- [x] `TASK_14_COMPLETION.md` — bloco: 1/5. Frontend de assets não existe.
- [x] `TASK_15_COMPLETION.md` — bloco: 1/5. Backend de assets não existe.
- [x] `TASK_20_COMPLETION.md` — bloco: 1/5. Backend de breakdown não existe.
- [x] `TASK_21_COMPLETION.md` — bloco: 3/6. Frontend de breakdown não existe.
- [x] `TASK_24_COMPLETION.md` — bloco: 5/10. `components/timesheet/` e
      `contexts/TimerContext.tsx` não existem.
- [x] `TASK_25_COMPLETION.md` — bloco: 4/7. `pages/Settings.tsx` e
      `pages/settings/` não existem (o repo não tem pasta `pages/settings/`).
- [x] `TASK_26_29_COMPLETION.md` — bloco: 6/9. `components/calendar/` e
      `pages/settings/Integrations.tsx` não existem.
- [x] `TASK_33_COMPLETION_REPORT.md` — bloco: 7/15. Confirma (não contradiz) o
      ADR-011: `middleware/sessionTracking.ts`, `jobs/sessionCleanupJob.ts`,
      `services/sessionService.test.ts`, `hooks/useSessions.ts`,
      `components/sessions/SessionCard.tsx` e `pages/settings/Sessions.tsx` não
      existem — o que já estava registrado na Seção 1.

### PARE acionado (2026-07-26) — decisão de segurança não documentada

Execução autônoma da Fase 0 interrompida em `PROGRESS.md`, antes do
`.env.example` e do `docs/CONEXOES.md`, por acionar a condição de PARE
"encontrar outra decisão de segurança não documentada do porte do ADR-011".

**Achado:** a autenticação do Portal do Cliente é um segundo domínio de auth,
paralelo ao do app, sem nenhum registro em `ARCHITECTURE.md`:

- Credencial própria em `client_portal_access` (e-mail + `passwordHash`, bcrypt
  cost 12), desacoplada da tabela `users`
- JWT de 7 dias em cookie httpOnly `client_portal_token`, assinado com o
  **mesmo segredo** do token do app (`getJwtSecret()`), separado apenas pela
  claim `type: "client-portal"`
- Revogação sem tabela própria: `authenticateClientPortal` rejeita o token
  quando `access.updatedAt > payload.iat * 1000`, então troca de senha ou
  desativação derruba as sessões anteriores. O flag `active` é revalidado a
  cada request

É uma decisão deliberada e melhor desenhada que a do ADR-011 (revalida a cada
request, em vez de aceitar token sem linha).

**Resolvido:** registrado como **ADR-012** em `ARCHITECTURE.md` com status
`Proposed` — não `Aceito`, porque a spec `portal-do-cliente/` segue ativa e o
código ainda não foi commitado. Promover a `Aceito` ao concluir a spec.

Pendência de segurança derivada, ainda não aplicada (ver Seção 4): o
`authenticate` do app não checa a claim `type`. Um token de portal só é rejeitado
por efeito colateral (payload sem `email`), não por asserção explícita.
