# Status — Cena Studio

> Documento único e vivo. Não crie `*_SUMMARY.md`, `*_REPORT.md`,
> `*_COMPLETION.md` — atualize este arquivo. Toda vez que algo mudar
> de estado, edite a seção correspondente, não acrescente uma nova
> no fim sem contexto. Data da última atualização no topo.

**Última atualização:** 2026-08-22

> **Handoff desta sessão:** os commits `2aab029`, `fada13e`, `b396ce4` e
> `ef68cb5` consolidam proteção contra segredos, ciclo de e-mail da conta,
> fechamento de specs verificadas e o lote de UX/mobile, onboarding, landing
> e SEO. Validação realizada no estado final: `npm run check`, `npm run build`
> e os 8 testes focados de e-mail/LGPD passaram. `tmp/` e capturas locais da
> auditoria são deliberadamente ignorados; não são produto nem devem entrar em
> commits. Após o push, o deploy GitHub/Vercel é automático; não houve
> acompanhamento manual do deployment por decisão do operador.
> O mapa visual completo de conexões foi consolidado em `docs/CONEXOES.md`.

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
- **E-mail transacional:** cadastro agora dispara boas-vindas, recuperação de
  senha envia link de uso único e a troca efetiva de senha dispara alerta de
  segurança, respeitando a preferência `emailOnPasswordChange`. Solicitações
  LGPD agora recebem confirmação com protocolo e seu processamento envia
  atualização; a exclusão confirma o término usando o endereço capturado só
  em memória antes da anonimização. Todos usam o renderer dark comum em PT/EN,
  com HTML seguro e fallback texto puro. A matriz de ciclo de conta (criação
  até exclusão) está em
  `.kiro/specs/email-transacional-cliente/`; ela separa eventos já reais de
  automações que ainda exigem consentimento, scheduler ou idempotência de
  cobrança. Em 2026-08-22, o convite de reunião também passou a usar o renderer
  transacional comum, preservando `.ics`, `replyTo`, idioma da produtora e dados
  da reunião; o envio agora repassa `contentType: "text/calendar"` ao anexo.
  Também em 2026-08-22, a ativação do Portal do Cliente deixou de depender de
  senha criada pela produtora: a produtora informa apenas o e-mail, o banco
  guarda hash SHA-256 de um token temporal, e o cliente cria a própria senha em
  `/portal/activate?token=...`. Reenvio de acesso gera novo token, e o e-mail de
  ativação usa o renderer transacional comum quando Resend está configurado.
  A proposta ao cliente também ganhou ação explícita autenticada:
  `POST /api/clients/proposals/:id/send` valida propriedade da produtora, bloqueia
  proposta revogada/aceita, transforma rascunho em `sent`, pode liberar no Portal
  do Cliente e envia e-mail transacional com `replyTo` da produtora; falha ou
  ausência de Resend devolve `proposal_url` para fallback manual.
  O review de vídeo também passou a ter envio explícito:
  `POST /api/video-reviews/:id/send`/`POST /api/video-review-send` valida
  propriedade, bloqueia estados finalizados, usa e-mail do cliente do projeto
  ou destinatário explícito validado, renova o token temporal, marca
  `pending_review` e envia e-mail transacional com fallback por `shareUrl`.
  Testes do provedor e dos três fluxos passaram em 2026-08-14; um
  envio sandbox foi aceito pela Resend. A migração de reunião foi validada com
  testes focados, `npm run check` e `npm run build`; a ativação do portal foi
  validada com `npx prisma generate`, `server/clientPortalFlow.test.ts`,
  `npm run check`, testes de import/traduções e `npm run build`; envio explícito
  de proposta foi validado com `server/controllers/proposalLifecycle.test.ts` e
  `npm run check`; envio de review foi validado com
  `server/controllers/videoReviewsSend.test.ts` e `npm run check`. **Ainda não está habilitado para
  clientes em produção:** a Vercel não contém `RESEND_API_KEY` nem
  `EMAIL_FROM`, e o remetente sandbox só aceita o e-mail da conta Resend.
  Gatilho: verificar domínio próprio na Resend, configurar as duas variáveis
  na Vercel e repetir o teste de entrega externo.

## 1. Estado atual por módulo/feature

Cada linha foi verificada contra o código (rotas em `server/router.ts`, models em
`prisma/schema.prisma`), não contra documentação anterior. Onde não deu para
verificar, está dito explicitamente.

- **Video Review:** implementado e conectado. Rotas em `server/router.ts:160-176`
  (`/video-reviews`, `/public/video-reviews`, `/video-upload` e endpoints
  singulares), controllers `videoReviewsController.ts` / `videoUploadController.ts`,
  models `VideoReview` e `VideoComment`. Esteve quebrado em 07/2026 por
  desregistro de rotas; corrigido desde então.
- **Session Management:** funcional. `/sessions` (`router.ts:179`),
  model `UserSession`, revogação remota funcionando (`revokedAt` → 401 via
  `isTokenRevoked` em `authenticate`). Estratégia de invalidação é deny-list, não
  a allow-list da spec original — ver ADR-011. Geolocalização foi descartada
  (sem campo `location`) e `ua-parser-js` foi substituído por
  `parseDeviceLabel()` próprio. Em 2026-08-22, `cleanupExpiredSessions()` passou
  a remover sessões inativas há mais de 7 dias e sessões revogadas somente após
  a janela de expiração do JWT, preservando segurança contra reativação de token
  revogado. O job periódico roda apenas no servidor tradicional, com opt-out por
  `ENABLE_SESSION_CLEANUP_JOB=false`; em Vercel/serverless a limpeza deve ser
  chamada por job externo se necessário. Teste focal:
  `server/services/sessionService.test.ts`. UI vive em `client/src/pages/Profile.tsx`,
  não em página dedicada.
- **Webhooks:** funcional com retry persistente de falhas transitórias. `/webhooks`
  (`router.ts:180`), models `Webhook` e `WebhookDelivery`,
  `server/services/webhookService.ts` com CRUD, HMAC, `listDeliveries`,
  `sendTestPing`, `dispatchWebhookEvent` e `retryFailedDeliveries`. Tela em
  `client/src/pages/Webhooks.tsx`. Eventos realmente disparados:
  `client.created`, `project.created`, `proposal.accepted`,
  `video_review.approved`, `video_review.changes_requested` — **não** os
  `project.completed` / `file.uploaded` / `client.approved` / `meeting.scheduled`
  que os relatórios afirmavam. Em 2026-08-22, falhas de rede/5xx passaram a
  gravar `next_retry_at`; o runner tenta novamente até 3 tentativas, finaliza 4xx
  sem novo agendamento e guarda `final_failed_at`. O job `startWebhookRetryJob()`
  roda a cada 6h em servidor tradicional, com opt-out por
  `ENABLE_WEBHOOK_RETRY_JOB=false`. Em Vercel/serverless, `vercel.json` agenda
  `GET /api/internal/cron/maintenance` diariamente; a rota exige
  `Authorization: Bearer $CRON_SECRET` e chama o mesmo service. Teste focal:
  `server/services/webhookService.test.ts` e `server/routes/internalCron.test.ts`.
- **Portal do Cliente (auth):** autenticação própria, separada da do app. Login
  por e-mail + senha (bcrypt cost 12) em `client_portal_access`; JWT de 7 dias em
  cookie httpOnly `client_portal_token`, assinado com o **mesmo** segredo do app,
  com claim `type: "client-portal"`. Revogação por comparação
  `access.updatedAt > token.iat` — troca de senha ou desativação invalida tokens
  anteriores sem tabela de revogação. Decisão de segurança real e **ainda não
  registrada como ADR** — ver nota de PARE ao final desta seção.
- **Shot List:** implementado. `/shotlists` e `/shot-types`, models `ShotList`,
  `Shot`, `ShotType`.
- **Timesheet:** MVP em evolução. `/timesheets`, model `TimeEntry`, timer,
  registros manuais, totais, envio de horas para orçamento, filtros por
  projeto/período, export CSV autenticado, `TimerContext` com polling/recovery,
  widget global, início de timer a partir das tarefas, taxa horária padrão em
  Company Settings (`studio_settings.default_hourly_rate`) e resumo de horas/custo
  no hub do projeto estão implementados. Em 2026-08-22, a retenção por plano foi
  aplicada como soft filter nas queries, CSV e report: Pro enxerga 1 ano;
  Studio/White Label/Enterprise/admin enxergam histórico completo; Free segue
  bloqueado pelo gate de Timesheet e mantém fallback de 30 dias no service.
  Categoria de tempo saiu do escopo ativo porque não existe no schema/UI atual;
  Timesheet passa a operar por projeto, descrição, período, duração e custo.
- **Google Calendar:** rota `/calendar` registrada. A integração real com a API do
  Google **não foi verificada** — só a existência da rota.
- **Portal do Cliente:** MVP funcional em evolução (spec `portal-do-cliente-OK/`).
  Rotas `/portal` e `/client-portal-auth`, model `ClientPortalAccess`, auth
  isolada, endpoints de projetos/arquivos/propostas/reuniões/resumo financeiro,
  app `/portal/*` e central de acesso em `ClientDetail.tsx`. Em 2026-08-14 o
  portal ganhou hierarquia de cliente mais clara: dashboard com próximas reuniões,
  arquivos recentes e propostas; páginas dedicadas para agenda, arquivos,
  propostas, projetos e conta; e central da produtora indicando quais superfícies
  alimentam o portal. Também em 2026-08-14, arquivos deixaram de aparecer no
  portal apenas por vínculo de projeto: agora exigem liberação explícita via
  `visible_in_client_portal`, controlada pela produtora na tela de Arquivos.
  Propostas e reuniões seguem o mesmo princípio: criar/enviar internamente não
  publica no portal; a produtora precisa liberar o item explicitamente, e revogar
  proposta/cancelar reunião remove o item do portal.
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
- **Gatilho: domínio próprio e descoberta no Google.** Quando o domínio for
  comprado, apontado à Vercel e definido em `VITE_PUBLIC_URL`, verificar o
  domínio no Google Search Console, publicar/enviar sitemap e robots, conferir
  canonicals no domínio final e inspecionar as URLs públicas. Não fazer antes:
  o domínio canônico ainda é o da Vercel.
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

## 4. Varredura de specs e próximas tarefas

O conteúdo de cada frente vive na spec. A varredura abaixo foi cruzada contra o
código, testes e build atuais em 2026-08-14; um sufixo `-OK` só é aplicado quando
nenhum item real permanece aberto.

**Frente P0 concluída localmente, aguardando commit:**
`.kiro/specs/fluxos-conectados-e-confiabilidade/`. A arquitetura aprovada mantém
`Budget` interno ao `Project` e `Proposal` comercial para o `Client`; P1 cria o
vínculo aditivo por origem e snapshot imutável. P0 corrigiu o extrato de gasto
efêmero, validação de lançamentos, contrato de retorno e rastreabilidade segura
de erros com `X-Request-Id`; a ponte IA foi confirmada com feedback e estados de
sucesso/falha; Propostas passaram a validar IDs e totais antes de `BigInt`; e a
calculadora de precificação deixou de esconder falhas ao carregar destinos.
Evidência: 25 testes focados, E2E desktop/mobile dos fluxos de orçamento,
`npm run check` e `npm run build` passaram em 2026-08-22. A única pendência de
P0 é 0.3: reprodução controlada contra Postgres/Supabase, que exige janela e
backup aprovados. Não houve push ou deploy desta frente.

**P1A em andamento:** ADR-015 registra o vínculo aditivo entre `Proposal`,
`Project`, `Budget` e `Generation`, com snapshot comercial imutável. A migration
`20260822013000_link_proposals_to_budget` foi criada e validada no schema, mas
**não foi aplicada** a Supabase/produção. O serviço transacional já cria ou
atualiza somente o rascunho associado ao orçamento de um projeto que pertence à
produtora; propostas enviadas/aceitas não entram na consulta mutável. A ficha do
cliente mostra a origem do rascunho, e links públicos/portal recusam rascunhos.
Quando a ferramenta Studio `05` gera uma proposta dentro de um projeto, ela usa
o `generationId` persistido para criar/atualizar esse mesmo rascunho; o servidor
revalida o vínculo projeto/estúdio e lê a narrativa da geração no banco, sem
aceitar texto comercial reenviado pelo navegador. Se ainda faltar cliente ou
baseline, a geração segue salva e a interface informa a pré-condição, sem
publicar nada. Cada atualização do rascunho incrementa uma revisão comercial,
visível no Hub do Projeto, na ficha do cliente e em Comercial; o histórico local
do construtor não é apresentado como fonte de verdade. Evidência local: 38
testes da ponte IA, 22 testes da origem/revisão, `npm run check` e `npm run
build` passaram em 2026-08-22. Ainda falta aplicar/testar a migration em
Postgres com janela controlada.

**Backlog aprovado — Storyboard IA conectado ao Shot List:** será uma visão do
Shot List do projeto, não uma ferramenta escondida. Cada shot poderá gerar e
aprovar quadros de referência (por exemplo, sketch de lápis), mantendo prompt,
revisão e responsável vinculados ao mesmo plano. A frente começa somente após a
P1B atual e ganha spec própria para definir modelo de imagem, Supabase Storage,
custos, permissões e exportação de set.

**Bloco G0 concluído — spec Storyboard IA:** a spec
`.kiro/specs/storyboard-ia-shotlist/` define requirements, design e tasks. A
decisão de produto está fixada: Storyboard IA nasce dentro do Shot List, com
frames vinculados a cada shot, não como ferramenta solta. Próximo corte real:
G1, criar `ShotStoryboardFrame`, migration/fallback SQLite e service com
isolamento entre produtoras, sem escolher provider de imagem antes da credencial
e da política de storage.

**Bloco G1 concluído — base Storyboard IA:** `ShotStoryboardFrame` foi criado no
Prisma, com migration Postgres e fallback SQLite. O service
`shotStoryboardService` cobre listagem por shot, criação de revisões, aprovação
com atualização de `shots.thumbnail_url` e delete, sempre filtrando por
produtora. Teste focal: `server/services/shotStoryboardService.test.ts`. Ainda
não há rotas/UI/provider de imagem; próximo corte é G2/G3, adapter de imagem
explícito e endpoints autenticados sob `/api/shotlists`.

**Bloco G2/G3 concluído — adapter e endpoints Storyboard IA:** foi criado
`imageGenerationService` com interface provider-agnostic. Sem
`STORYBOARD_IMAGE_PROVIDER`, a geração falha com 503 explícito e salva uma
revisão `failed` sem vazar segredo; provider `mock` existe apenas para teste/local
e é bloqueado em produção. Endpoints autenticados/gateados em `/api/shotlists`:
listar frames do shot, gerar, aprovar e excluir. Provider real e storage de
imagem continuam abertos para G2.3/G6; UI começa no G4.

**Bloco G4 concluído — UI Storyboard no Shot List:** a tela de Shot List
ganhou botão de storyboard em cada shot, dialog responsivo com prompt, histórico
de revisões, estados `generated/approved/failed`, aprovação atualizando a
thumbnail local e strings PT/EN. API client e mocks de teste foram atualizados.
Testes focais: `client/src/test/ShotList.test.tsx` e
`tests/e2e/shotlist-storyboard-mobile.spec.ts`. Em 2026-08-22, G4.5 passou no
Chromium mobile: gerar/aprovar abriu sem overflow horizontal obrigatório no
conteúdo do Shot List/dialog, touch targets do dialog ficaram >=44px e a
evidência visual local foi salva em `tmp/g4-shotlist-storyboard-mobile.png`.

**Bloco G5 concluído — Storyboard no PDF do Shot List:** a exportação PDF agora
identifica e tenta embutir a `thumbnail_url` atualizada pelo frame aprovado do
storyboard. Se a imagem aprovada não carregar, o PDF não quebra: mantém um
placeholder textual para a referência visual. Teste focal:
`server/services/shotListPdfExport.test.ts`.

**Bloco G6.1/G6.2 concluído — quota mensal de Storyboard IA:** os limites ficaram
em `shared/planEntitlements.ts`: Free 0, Pro 25/mês, Studio 100/mês,
White Label 300/mês e Enterprise/admin ilimitado. A contagem usa
`shot_storyboard_frames` do mês atual com status `generated`/`approved`, separada
das gerações textuais de IA. Quando a quota acaba, o service bloqueia antes de
chamar provider e antes de criar frame, evitando frame fantasma. Teste focal:
`server/services/shotStoryboardService.test.ts`. Ainda aberto: escolher provider
real, validar Supabase Storage em staging/produção e então completar G6.3/G6.4.

**P1B auditada:** a ficha do cliente já oferece CRM 360 com projetos,
oportunidades, interações, arquivos, financeiro, propostas, vídeo reviews e
gestão de Portal. A jornada de acesso foi validada localmente em 2026-08-22:
43 testes passaram para criação, login, alteração/reset de senha, desativação,
limites de plano e isolamento entre produtoras. Propostas agora têm fallback
local e E2E; reuniões continuam Prisma-only e seguem cobertas pela validação
SQL em Supabase.

**P1B.3 concluída localmente:** `shared/proposalDocument.ts` é o contrato único
para a proposta manual, a calculadora e o rascunho comercial gerado a partir de
orçamento. Ele recebe valores em centavos, dados do estúdio e locale PT/EN,
escapa conteúdo livre e gera o HTML usado na impressão. O rascunho de orçamento
busca as configurações persistidas do estúdio dentro da transação; links públicos
continuam usando o HTML salvo da proposta. Validação focada: 15 testes passaram
em `proposalDocument`, `commercialProposalService` e calculadora; `npm run check`
passou.

**P1B.4.1 concluída localmente:** a suíte do ciclo de vida da proposta cobre
ownership na criação, envio, bloqueio de rascunho no Portal, primeira
visualização, aceite com hash íntegro e revogação que também remove a proposta
do Portal. A conexão de produção baixada via Vercel CLI mascara segredos por
design, portanto não fornece uma URL utilizável para executar a P1B.4.2 contra
Supabase. A P1B.4.2 foi então validada pelo Supabase CLI em uma transação com
`ROLLBACK`: proposta/reunião visíveis e ativas ficaram isoladas no cliente
certo, enquanto itens ocultos, revogados ou cancelados retornaram zero para o
outro cliente. O teste reproduzível sem segredos está em
`scripts/verify-portal-isolation.sql`. O E2E P1B.4.3 foi fechado depois com
fallback local de propostas, sem usar o Railway legado local.

**P1A.2/P1A.3 concluídas localmente:** a migration
`20260822013000_link_proposals_to_budget` está coberta por teste de contrato:
as novas colunas são opcionais, constraints e índices são idempotentes, e
propostas públicas antigas não são reescritas nem inferidas a partir de HTML.
O serviço comercial também reforça ownership por estúdio/projeto para geração
IA, busca rascunho apenas por `userId + sourceBudgetId + status=draft` e não
trata proposta enviada/aceita como mutável. Isso valida o desenho; aplicar a
migration em Supabase segue como ação operacional separada.

**P1B.4/P1B.4.3 concluídas:** o fluxo Cliente → Projeto → Orçamento →
Proposta → Portal agora tem E2E local em desktop e mobile. Para isso, o fallback
SQLite de desenvolvimento passou a cobrir a tabela de propostas, criação/lista,
liberação no portal, link público e aceite; o caminho Postgres/Supabase continua
via Prisma quando há URL persistente. A rodada também corrigiu o parsing de
`datetime('now')` do SQLite no auth do Portal do Cliente, que podia invalidar
uma sessão recém-emitida por interpretar UTC como horário local. Validação:
51 testes focados passaram, `npm run check` passou, e
`tests/e2e/client-budget-proposal-portal.spec.ts` passou em
`chromium-desktop` e `chromium-mobile`.

**P1C.A / P1C.3 auditadas:** Produção já tem entradas diárias claras para Jobs,
Estúdio IA e Aprovações, mas Arquivos, Documentos, Equipamento, Timesheet,
Equipe e Webhooks ainda competem no menu secundário. A Conta já cobre perfil,
segurança, plano, preferências e privacidade; identidade do estúdio fica em
Empresa e membros em Equipe. O gap real é Integrações: chaves de API estão
misturadas em Segurança e Webhooks está fora da Conta. A próxima implementação
move essas superfícies para `Conta > Integrações`, preservando `/webhooks` como
rota legada, antes de qualquer novo redesenho de Produção.

**P1C.C concluída:** Webhooks agora também está em `Conta > Integrações`,
com a mesma superfície funcional e PT/EN; a rota `/webhooks` foi preservada
para links existentes. A migração das chaves de API foi concluída no mesmo
bloco e o detalhe operacional atualizado abaixo.

**P1C.2 concluída:** as chaves de API agora vivem exclusivamente em
`Conta > Integrações`, ao lado de Webhooks. O componente próprio preserva
listagem, criação com exibição única do segredo, cópia e revogação; Segurança
não busca nem mostra mais esses dados. A rota `/webhooks` permanece como
entrada compatível para links existentes. Ela também saiu da navegação de
Produção e os atalhos da paleta agora abrem `Conta > Integrações` diretamente.

**P1C.B concluída:** a navegação de Produção foi reorganizada por intenção sem
alterar URLs: o uso diário continua direto em Jobs, Estúdio IA e Aprovações,
enquanto o menu secundário agora separa Recursos do job (Arquivos, Documentos,
Equipamento) e Operação (Timesheet, Equipe). No mobile, o dropdown deixou de
ser uma lista plana e passou a exibir os mesmos grupos, preservando navegação
em dois toques e touch targets mínimos.

**P1C.D concluída:** a descoberta e retorno da navegação de Produção foram
validados por E2E em 390px, tablet e desktop. A spec
`tests/e2e/production-nav-intent.spec.ts` cobre grupos visíveis, ausência de
overflow horizontal, touch targets dentro da navegação e ida/volta entre áreas
diárias e secundárias. Rodou verde nos projetos `chromium-desktop` e
`chromium-mobile`.

**P2.3 concluída:** a ponte Orçamento IA → Orçamento do projeto trocou
"Piso/Teto da faixa" por "Estimativa protegida" e "Estimativa enxuta", com
ajuda contextual em PT/EN para explicar risco, escopo travado e impacto nos
alertas antes da gravação. A lógica interna `min/max` foi preservada. Validação:
34 testes unitários/tradução passaram, `npm run check` e `npm run build`
passaram, e os E2E `budget-bridge-flow` e `budget-bridge-mobile` passaram nos
projetos `chromium-desktop` e `chromium-mobile`.

**P2.1/P2.2 concluídas como decisão de produto:** o spec
`fluxos-conectados-e-confiabilidade` agora propõe dashboard e evolução do
Financeiro somente com fontes reais. Dashboard: caixa do mês, a receber crítico,
pipeline ponderado, jobs com pressão e propostas em decisão. Financeiro: fase 1
caixa via `financial_entries`; fase 2 recebíveis explícitos derivados de
proposta aceita, exigindo migration aditiva para `proposalId`; fase 3 resultado
por projeto via `financial_entries.projectId`, `budgets`, `budget_entries` e
`dre_settings`. Limite importante registrado: proposta aceita não vira caixa
automaticamente, e lançamentos financeiros ainda não têm `currency`.

**P2.4 concluída:** o Painel agora mostra um Pulso financeiro compacto usando
somente `/api/analytics/finance`: caixa do mês, recebíveis pendentes/vencidos e
pipeline ponderado. O bloco não depende de migration, não interpreta proposta
aceita como caixa e leva para `/analytics` para operação detalhada. Validação:
`appImport` + traduções passaram, `npm run check` passou, `npm run build`
passou, e o E2E `critical authenticated app screens` passou em desktop e
mobile.

**Concluídas (`-OK`):** `00-fundacao-limpeza-e-documentacao`,
`client-hub-connected-workflows`, `dre-por-projeto`,
`fase-1-testes-uso-real`, `fase-2-layout-mobile-e-tabs`,
`landing-features-implementation`, `onboarding-primeiro-fluxo`,
`portal-do-cliente` e `team-task-delegation`.

1. `.kiro/specs/auditoria-ux-2026-07/` — implementação e verificação local
   encerradas; resta apenas E7, validar metadata com crawlers externos em um
   preview ou deployment público. Fase A
   avançou em 2026-08-14: delete de usuário voltou a exigir digitação do e-mail,
   teste mobile de touch target agora renderiza componente real, e Comercial
   mostra 5 abas diretas em desktop/tablet com dropdown mobile acessível em até
   2 toques. B1 também foi concluída em 2026-08-14: busca bruta retornou 24
   arquivos e foi triada em 10 alvos reais de navegação/tabs para B2. B2.1
   `ProductionNav` também foi concluída: Produção ganhou touch target `min-h-11`
   no desktop/tablet, trigger mobile e itens do dropdown, com teste real cobrindo
   acesso em até 2 toques para as áreas visíveis. B2.2 `ProjectNav` também foi
   concluída: mobile saiu de duas faixas horizontais empilhadas para dropdown de
   seção + dropdown de jornada, mantendo desktop intacto. B2.3-B2.7 concluídas
   em lote: Profile, Documents e Checklist ganharam select mobile; FilesUnified
   e AnalyticsPremium migraram para `ResponsiveTabs`. B2.8-B2.11 concluídas em
   sequência: ToolSidebar ganhou seletor mobile de categoria/ferramenta;
   ProjectHub trocou timeline horizontal por select mobile de etapa; Pipeline
   ganhou filtro de etapa no bloco mobile, grid para story steps e botões de
   mover etapa com `min-h-11`. Validação já executada nesta frente: `npm run check`,
   `npm run test -- client/src/test/mobile-touch-targets.test.tsx`,
   `npm run test -- client/src/test/ProductionNav.test.tsx`,
   `npm run test -- client/src/test/ProjectNav.test.tsx`,
   `npm run test -- client/src/test/ProjectNav.test.tsx client/src/test/responsive-tabs.test.tsx client/src/test/appImport.test.ts`,
   `npx playwright test tests/e2e/commercial-nav-visibility.spec.ts` e
   `npx playwright test --grep "@fase1"` (duas execuções isoladas com
   6 passed, 6 skipped). Fase C avançou em 2026-08-14: `CommercialOverview`
   compactou os steps do fluxo para não competir com as tabs principais;
   `Studio` foi auditado nos componentes reais (`StudioShell`,
   `ProjectTimeline`, `ActionToolbar`), com select mobile para etapa e toolbar
   com controles `min-h-11`. A suíte Playwright completa passou em 2026-08-14
   (33 passed, 9 skipped). Fase D foi concluída: os 40 caminhos inicialmente
   encontrados foram migrados para tokens, e cores que são dados de canvas,
   seletor nativo ou HTML exportado foram centralizadas em
   `client/src/design-system/color-presets.ts`. `npm run check` agora bloqueia
   hex literal em `client/src/components` e `client/src/pages`; a regra foi
   testada com fixture propositalmente inválida. `npm run check` e a suíte
   Vitest completa passaram. Fase E avançou: metadata e canonical dinâmicos
   existem no cliente para landing, review, proposta e reunião; Vercel agora
   pode responder links públicos com title, description, Open Graph e Twitter
   antes de o JavaScript carregar. A imagem social deixou de usar onboarding e
   passou a mostrar o centro de projeto. Links compartilhados permanecem
   `noindex` e não vazam detalhes de links expirados ou revogados. `npm run check`,
   testes direcionados e `npm run build` passaram. Falta apenas E7, a validação
   em preview publicado com crawlers externos.
2. `.kiro/specs/landing-conversao-produto/` — implementação local encerrada;
   resta somente 3.5, validação de crawler externo após deployment. A landing
   agora conta o fluxo Comercial → Projeto → Produção → Aprovação → Entrega,
   com cada etapa ligada a uma rota real. O catálogo de IA aparece por intenção
   e os planos não usam mais carrossel horizontal: Free, Pro e Studio formam a
   decisão principal; White-label e Enterprise são uma revelação discreta para
   quem busca operação sob medida. No mobile, o hero privilegia os dois CTAs,
   sem screenshot escuro comprimido nem repetição do bloco de fluxo. A revisão
   manual confirmou 390px sem overflow, controles de 44px ou mais e paridade
   visual de tablet/desktop. A Phase 4 também foi concluída: `/register` agora
   funciona como handoff direto da landing, sem duplicar navegação no header
   mobile, e a validação de senha mostra exatamente a política do servidor
   (10 a 128 caracteres, maiúscula, minúscula, número e símbolo) em PT/EN.
   Validação desta frente: `npm run test -- client/src/pages/Register.test.tsx client/src/test/translations.test.ts`,
   `npm run check`, `npx playwright test tests/e2e/register-mobile-handoff.spec.ts --project=chromium-mobile`
   e `npm run build`.
3. `.kiro/specs/qualidade-raciocinio-ia/` — tasks 14 e 15 (modelo high) foram
   concluídas. As tasks 16 a 18 continuam abertas: exigem dados reais de uso,
   reuso e avaliação que o schema e os dados locais ainda não comprovam.
4. `.kiro/specs/fase-3-white-label-OK/` — Bloco D finalizado em 2026-08-22:
   i18n agora usa `{{brand}}` com injeção automática de `SITE_CONFIG.brandName`,
   e `POST /api/studio-settings/logo` permite upload validado de PNG/JPEG/SVG/WebP
   até 5MB para bucket público `studio-branding`, salvando `logoUrl` em
   `studio_settings`. A tela de Configurações chama o endpoint e mantém fallback
   por URL/path relativo no `PUT /api/studio-settings`. Validação:
   `npm run test -- client/src/test/translations.test.ts server/controllers/studioSettingsLogo.test.ts server/services/supabaseStorage.test.ts`,
   `npm run check` e `npm run build`.
5. `.kiro/specs/features-criticas-gap-analysis/` — Timesheet e calendário têm
   implementação parcial, mas faltam o fluxo de timer/global rate/exportação e
   a integração Google OAuth/Calendar; a validação final ainda cita Railway e
   precisa ser replanejada para Vercel + Supabase antes de ser considerada feita.
6. `.kiro/specs/portal-do-cliente-OK/` — **MVP UX reforçado em 2026-08-14**.
   Backend/auth/dados já cobertos por testes dedicados; frontend do portal foi
   reorganizado para funcionar como central real do cliente, com dashboard,
   reuniões, arquivos, propostas, projetos, conta e gestão de acesso pela
   produtora. Arquivos agora têm publicação explícita no portal; nada aparece
   para o cliente até a produtora liberar. Validação desta rodada: `npm run check`,
   `npm run test -- server/clientPortalFlow.test.ts server/services/portalDataService.test.ts server/services/clientPortalAuthService.test.ts`
   (43 passed, 4 skipped) e `npm run build`.

Pausado por dependência externa, **não bloqueante**:

- **Fase E do spec `qualidade-raciocinio-ia` (tasks 16 a 18) — aguardando acesso
  ao banco de produção.** É o loop de uso real: extrair volume, taxa de reuso e
  rating médio por `tool_id` da tabela `generations`, cruzar para achar as
  ferramentas de alto volume com reuso ou rating baixos, e repriorizar os próximos
  upgrades por dado em vez de distribuir esforço igualmente entre as 12. Sem esse
  acesso, a priorização de IA continua sendo por julgamento. Retomar quando houver
  credencial de leitura em produção ou um staging com volume real.

Tarefas soltas identificadas na verificação, sem spec própria ainda:

- ~~Implementar poda da tabela `user_sessions`.~~ **Feito em 2026-08-22.**
  `cleanupExpiredSessions()` remove sessões inativas antigas e só remove
  sessões revogadas após a janela de expiração do JWT, para não reabilitar token
  revogado. `startSessionCleanupJob()` agenda a execução diária em servidor
  tradicional; em Vercel/serverless depende de job externo.
- ~~Implementar retry de webhook delivery.~~ **Feito em 2026-08-22.**
  `WebhookDelivery` ganhou `next_retry_at` e `final_failed_at`; falhas
  transitórias são retomadas por `retryFailedDeliveries()`, enquanto 4xx viram
  falha final sem retry. `startWebhookRetryJob()` agenda execução em servidor
  tradicional; `vercel.json` agenda `/api/internal/cron/maintenance` para
  Vercel Cron, protegido por `CRON_SECRET`.
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
  `00-fundacao-limpeza-e-documentacao-OK/`)~~ — **feito em 2026-08-14.**
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
`Aceito` — a spec `portal-do-cliente-OK/` foi encerrada após validação da
implementação. A mitigação de token confusion permanece como pendência de
segurança independente.

Pendência de segurança derivada, ainda não aplicada (ver Seção 4): o
`authenticate` do app não checa a claim `type`. Um token de portal só é rejeitado
por efeito colateral (payload sem `email`), não por asserção explícita.
