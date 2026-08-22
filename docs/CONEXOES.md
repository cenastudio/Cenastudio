# Conexões — Cena Studio

> Objetivo: permitir reconectar o sistema do zero. Cada seção diz o que o
> provedor faz, o que ele **não** faz, quais variáveis o código lê, e como
> validar. Nomes de variáveis conferem com `.env.example`; nenhum valor real
> aparece aqui.

**Última atualização:** 2026-08-14

## Mapa visual completo

> **Linha cheia:** tráfego ou dado de runtime. **Linha pontilhada:**
> configuração, deploy ou integração opcional. A fonte de verdade operacional
> continua nas seções abaixo; este diagrama é o mapa para orientar leitura,
> incidentes e onboarding de dev/agente.

![Mapa completo de conexões do Cena Studio](diagrams/cena-system-map.svg)

Fonte editável: [`docs/diagrams/cena-system-map.mmd`](diagrams/cena-system-map.mmd).
Para regenerar o SVG: `npm run docs:render-system-map`. Em Macs que não
suportam o Chromium baixado, definir `PUPPETEER_EXECUTABLE_PATH` para o Chrome
instalado antes de executar o comando.

```mermaid
flowchart TB
  classDef actor fill:#171717,stroke:#e85002,color:#ffffff,stroke-width:2px
  classDef app fill:#202020,stroke:#f08a4b,color:#ffffff,stroke-width:2px
  classDef data fill:#12302a,stroke:#4fd1a5,color:#ffffff,stroke-width:2px
  classDef external fill:#1f2937,stroke:#8aa4c8,color:#ffffff,stroke-width:2px
  classDef ops fill:#30231a,stroke:#f0b24b,color:#ffffff,stroke-width:2px

  subgraph people["Pessoas e superfícies"]
    Producer["Produtora, admin e equipe"]:::actor
    Client["Cliente da produtora\nPortal do Cliente"]:::actor
    Visitor["Visitante\nLanding, proposta, review e reunião pública"]:::actor
  end

  subgraph vercel["Cena Studio na Vercel"]
    Web["React + Vite\nLanding, app, portal e páginas públicas"]:::app
    API["Express serverless API\nAuth, CRM, projetos, produção, financeiro,\nportal, arquivos, IA, LGPD e webhooks"]:::app
    Guard["Guards de runtime\nCORS, launch guards, JWT e autorização"]:::app
    Web --> API
    API --> Guard
  end

  subgraph data["Dados de produção - Supabase"]
    DB["Postgres via Prisma\nUsuários, workspaces, clientes, projetos,\npropostas, reviews, financeiro, sessões e auditoria"]:::data
    Store["Supabase Storage\nArquivos de projeto e LGPD"]:::data
    DB <--> Store
  end

  subgraph product["Serviços de produto conectados"]
    AI["IA\nOpenRouter, Anthropic ou NVIDIA\ncom fallback por ferramenta"]:::external
    Media["Cloudinary\nMídia e thumbnails"]:::external
    Billing["Stripe\nCheckout, assinatura e webhooks"]:::external
    Mail["Resend\nE-mails transacionais"]:::external
    GitHubOAuth["GitHub OAuth\nLogin social opcional"]:::external
    Outbound["Webhooks da produtora\nIntegrações externas"]:::external
  end

  subgraph delivery["Entrega, código e configuração"]
    Dev["Dev/agente local\n.env ignorado + testes"]:::ops
    Repo["GitHub\ncenastudio/Cenastudio - main"]:::ops
    Vercel["Vercel\ncena-studio-prod\nvariáveis de produção"]:::ops
    SupabaseConsole["Console Supabase\nMigrations, RLS e chaves"]:::ops
    ResendConsole["Console Resend\nDomínio e remetente verificados"]:::ops
  end

  Producer --> Web
  Client --> Web
  Visitor --> Web
  Web --> Guard
  Guard <--> DB
  API <--> DB
  API <--> Store
  API <--> AI
  API <--> Media
  API <--> Billing
  Billing -->|"webhook assinado"| API
  API --> Mail
  API <--> GitHubOAuth
  API --> Outbound

  Dev -. "commit e push" .-> Repo
  Repo -. "deploy automático" .-> Vercel
  Vercel -. "serve Web e API" .-> Web
  Vercel -. "SUPABASE_DATABASE_URL e chaves" .-> DB
  SupabaseConsole -. "schema, RLS e storage" .-> DB
  ResendConsole -. "RESEND_API_KEY e EMAIL_FROM" .-> Mail
```

### Como ler o mapa

- **Autenticação principal:** o Cena usa JWT próprio emitido pela API; GitHub
  OAuth é uma porta opcional de entrada. O Portal do Cliente tem cookie e
  token próprios, mas a autorização continua no mesmo backend e banco.
- **Dados:** Supabase Postgres é a fonte de verdade. Storage guarda arquivos;
  Cloudinary complementa mídia e thumbnails, não substitui o banco.
- **Experiência pública:** landing, links de proposta, review e reunião passam
  pela mesma entrega Vercel, mas cada rota aplica o token/escopo apropriado.
- **Integrações:** IA, Stripe, Resend, Cloudinary e webhooks são isolados por
  serviço. Uma indisponibilidade não deve derrubar autenticação ou os dados
  essenciais do studio.
- **Configuração:** valores reais ficam somente nos consoles dos provedores e
  nas variáveis da Vercel ou `.env` local ignorado. Nenhum segredo vive neste
  documento ou no Git.

## Validação rápida

```bash
npm run validate:env      # scripts/validate-env.ts — confere o que falta
npm run smoke:prisma      # scripts/smoke-prisma.mjs — testa conexão real ao banco
npm run check             # tsc --noEmit
```

Se `validate:env` passar e `smoke:prisma` conectar, o essencial está de pé.

---

## 1. Deploy e hospedagem — Vercel

**Faz:** hospeda a aplicação de produção atual. O GitHub conectado é
`cenastudio/Cenastudio`, branch `main`. Push em `main` dispara deploy de
produção.

**Projeto Vercel canônico:** `cena-studio-prod`.

**Identificadores sem segredo:**

| Campo | Valor |
|---|---|
| Project ID | `prj_XSyby5utPKeYoKKMgfGi2f1z3TB0` |
| Org/Team ID local | `team_0ta6rNgoPiCfEXiG4SdEyqIN` |
| Team visível no CLI | `cenastudio-3104s-projects` |
| Domínio principal | `https://cena-studio-prod.vercel.app` |
| Alias do projeto | `https://cena-studio-prod-cenastudio-3104s-projects.vercel.app` |
| Alias branch main | `https://cena-studio-prod-git-main-cenastudio-3104s-projects.vercel.app` |

**Arquivo local de vínculo:** `.vercel/project.json`. Ele precisa apontar para
o `projectId` acima. Se o CLI disser `Not authorized` em `vercel deploy`, não
assuma que o deploy falhou: verifique o deploy automático disparado pelo GitHub.

**Como validar produção depois de push:**

```bash
npx vercel ls cena-studio-prod
npx vercel inspect https://cena-studio-prod.vercel.app
curl -I -L https://cena-studio-prod.vercel.app/
curl -sS -L https://cena-studio-prod.vercel.app/health
curl -sS -L https://cena-studio-prod.vercel.app/ready
```

Critério mínimo: deployment novo `Ready`, `/` com `HTTP 200`, `/health` com
`status: ok`, `/ready` com `ready: true` e banco `ok`.

**Cron interno de manutenção:** `vercel.json` agenda
`/api/internal/cron/maintenance` diariamente. A rota executa retry de webhooks e
poda de sessões expiradas/revogadas. Ela exige `CRON_SECRET` como variável
sensível na Vercel; a plataforma envia `Authorization: Bearer <CRON_SECRET>` nas
chamadas do Cron Job. Em 2026-08-22, `CRON_SECRET` foi criado em Production no
projeto `cena-studio-prod`. Não registrar o valor em docs, `.env.example`,
prints ou commits.

**Como validar o cron sem expor segredo:**

```bash
npx vercel env ls | rg CRON_SECRET
```

Critério mínimo: `CRON_SECRET` aparece como `Hidden`, `Sensitive`,
`Production`. Validação manual do endpoint deve ser feita apenas com valor
seguro local/console, nunca colado em chat ou commit.

---

## 2. Banco de dados — Supabase Postgres

**Faz:** é o banco de produção. Todo dado da aplicação vive aqui, via Prisma
(47 models em `prisma/schema.prisma`).

**Hospedagem:** Vercel roda o app; Supabase hospeda o Postgres. Em Vercel
serverless, preferir a URL do transaction pooler do Supabase.

**Variáveis:**

| Variável | Obrigatória | Observação |
|---|---|---|
| `SUPABASE_DATABASE_URL` | sim | URL do pooler Supabase; prioridade no código |
| `DATABASE_URL` | fallback | URL Postgres direta ou compatibilidade |
| `DATABASE_POOL_MAX` | não | default no código |
| `DATABASE_CONNECT_TIMEOUT_MS` | não | idem |
| `DATABASE_IDLE_TIMEOUT_MS` | não | idem |
| `DATABASE_TRANSIENT_RETRIES` | não | retry de erro transitório |
| `DATABASE_PATH` | não | SQLite de desenvolvimento local |

`POSTGRES_URL` e `POSTGRES_PRISMA_URL` são aliases antigos. O código ainda os
aceita, mas a configuração canônica atual é `SUPABASE_DATABASE_URL`.

**Como reconectar:**
1. Supabase → Project Settings → Database → Connection string → copiar a string
   do pooler
2. Colar em `SUPABASE_DATABASE_URL` na Vercel e no ambiente local seguro
3. `npx prisma migrate deploy` quando houver migrations novas
4. `npm run smoke:prisma` para confirmar
5. Se dados forem importados manualmente, rodar `npm run db:reset-sequences`
   para alinhar sequences/autoincrement e evitar `Unique constraint failed on id`

**Onde olhar quando falhar:** `server/models/prisma.ts` define a prioridade das
URLs de Postgres; `server/config/launchGuards.ts` bloqueia produção sem banco
persistente. Skill de apoio: `.kiro/skills/database-connectivity.md`.

---

## 3. Supabase — banco, storage e chaves públicas

**Faz:** hospeda o Postgres de produção, fornece chaves públicas para integrações
Supabase e pode servir storage/fluxos administrativos quando configurado.

**Atenção:** o login principal do app continua sendo JWT próprio do backend,
com OAuth GitHub opcional. Não confundir com Supabase Auth como fonte principal
de sessão do app.

**Variáveis:**

| Variável | Obrigatória | Observação |
|---|---|---|
| `SUPABASE_URL` | sim | projeto Supabase |
| `SUPABASE_ANON_KEY` | sim | chave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | sim, para LGPD | **nunca** expor no client |
| `SUPABASE_DATABASE_URL` | sim, banco | string Postgres do pooler |
| `SUPABASE_STORAGE_BUCKET` | não | default no código |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | sim | duplicatas exigidas pelo Vite |

O código aceita `SUPABASE_SECRET_KEY` como alias de
`SUPABASE_SERVICE_ROLE_KEY`, e `NEXT_PUBLIC_SUPABASE_URL` como alias de
`SUPABASE_URL` (resíduo de Next.js). Preferir sempre os nomes canônicos.

---

## 4. Cloudinary — mídia

**Faz:** upload e transformação de imagem/vídeo, incluindo thumbnails de shot
list (`server/services/shotListService.ts`).

**Atenção:** o SDK do Cloudinary lê `CLOUDINARY_URL`
(`cloudinary://key:secret@cloud_name`) automaticamente, mas **não** lê as três
variáveis separadas — o código as passa explicitamente na configuração. Se você
definir só `CLOUDINARY_URL`, confira o comportamento antes de assumir que
funciona.

**Variáveis:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`.

---

## 5. Stripe — cobrança

**Faz:** checkout e webhooks de assinatura.

**Variáveis:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO`,
`STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_PRICE_STUDIO_ANNUAL`.

**Como reconectar:** Dashboard → Developers → API keys (chaves) e Webhooks
(signing secret). Os price IDs saem de Products → cada preço.

---

## 6. Resend — e-mail

**Faz:** todo envio transacional (`server/services/emailService.ts`), incluindo
boas-vindas após cadastro, link de redefinição de senha, alerta após troca de
senha, contato e convites de reunião.

**Não faz:** nada se `RESEND_API_KEY` estiver ausente. O código expõe
`isEmailConfigured` e lança erro explícito em vez de falhar silenciosamente —
ou seja, ausência de e-mail não derruba o app, mas derruba o fluxo que depende
dele.

**Variáveis:** `RESEND_API_KEY`, `EMAIL_FROM`.

**Remetente:** `onboarding@resend.dev` é apenas sandbox: a Resend aceita envio
só para o e-mail da própria conta. Para entregar a clientes, verificar um
domínio próprio em Resend e configurar `EMAIL_FROM` como, por exemplo,
`Cena Studio <contato@seudominio.com>`. O domínio temporário da Vercel serve
para os links do app, mas não pode ser remetente de e-mail.

**Estado conferido em 2026-08-22:** `RESEND_API_KEY` e `EMAIL_FROM` existem na
Vercel Production como variáveis sensíveis. O teste direto para
`oldbarbier@gmail.com` foi recusado pela Resend com `403` porque o domínio
`atomicmail.io` ainda não está verificado. Até verificar o domínio em Resend, o
código preserva cadastro e troca de senha, mas não entrega e-mail ao cliente
externo. Cobrança via Stripe registra envios idempotentes em `email_deliveries`
antes de chamar Resend; isso evita e-mail duplicado quando a Stripe reenviar o
mesmo webhook.
real.

---

## 7. Provedores de IA

Cadeia com fallback: `AI_PROVIDER` define o primário, `FALLBACK_AI_PROVIDER` o
reserva.

| Provedor | Variáveis principais |
|---|---|
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_MAX_TOKENS`, `OPENROUTER_TIMEOUT_MS`, `OPENROUTER_FREE_LIMIT` |
| Anthropic | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| NVIDIA | `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_INVOKE_URL`, `NVIDIA_ENABLE_THINKING`, `NVIDIA_REASONING_BUDGET` |

Validação: `node scripts/verify-provider-integration.mjs`.

Parte das ferramentas roda em modelo gratuito com fallback, e o sistema **não**
registra custo por chamada — por isso o painel admin mostra volume de uso, não
custo estimado.

### Storyboard IA

O Storyboard IA do Shot List usa OpenRouter Images como provider inicial e grava
o arquivo gerado em storage público configurável. O default seguro continua
Supabase Storage; Cloudflare R2 está implementado como opção S3-compatible, mas
só deve virar runtime quando o endpoint e a URL pública estiverem validados. O
`mock` continua restrito a teste/local e é bloqueado em produção.

| Variável | Estado | Observação |
|---|---|---|
| `STORYBOARD_IMAGE_PROVIDER` | sim para gerar | `openrouter`; vazio/`disabled` mantém 503 controlado |
| `OPENROUTER_API_KEY` | sim | usado também pelo Storyboard quando `STORYBOARD_IMAGE_API_KEY` está vazio |
| `STORYBOARD_IMAGE_API_KEY` | opcional | chave dedicada, se quiser separar orçamento do texto |
| `STORYBOARD_IMAGE_MODEL` | sim | default recomendado: `google/gemini-3.1-flash-lite-image` |
| `STORYBOARD_IMAGE_RESOLUTION` | opcional | default `1K` |
| `STORYBOARD_IMAGE_QUALITY` | opcional | default `medium` |
| `STORYBOARD_IMAGE_FORMAT` | opcional | default `png` |
| `STORYBOARD_STORAGE_PROVIDER` | opcional | `supabase` default; `cloudflare-r2` quando R2 estiver válido |
| `SUPABASE_STORYBOARD_BUCKET` | opcional | default `shot-storyboards`, público |
| `CLOUDFLARE_R2_ACCOUNT_ID` | opcional | necessário para `cloudflare-r2` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | opcional | necessário para `cloudflare-r2`; segredo |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | opcional | necessário para `cloudflare-r2`; segredo |
| `CLOUDFLARE_R2_BUCKET` | opcional | default operacional sugerido: `cena-storyboards` |
| `CLOUDFLARE_R2_PUBLIC_URL` | obrigatório para R2 | URL pública/custom domain usada no `image_url` |

Validação de produção: confirmar que Vercel tem `STORYBOARD_IMAGE_PROVIDER`,
`OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e, se
customizado, `SUPABASE_STORYBOARD_BUCKET`; depois gerar um frame real em Shot
List e conferir `image_url` pública + `storage_path` em
`shot_storyboard_frames`.

Em 2026-08-22, o suporte a Cloudflare R2 foi implementado no código, mas o
endpoint informado falhou no handshake TLS antes de autenticar; portanto R2 não
deve ser ativado em produção até `curl`/SDK conseguirem listar/criar bucket e
uma URL pública estar definida.

---

## 8. GitHub OAuth

**Faz:** login social opcional.

**Variáveis:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`GITHUB_CALLBACK_URL` (precisa bater exatamente com o registrado no app OAuth).

---

## 9. Google Calendar

**Estado atual:** o produto exporta agenda por `.ics` via
`GET /api/calendar/project/:projectId.ics` e já tem a base de sync real com
Google Calendar: schema `CalendarEvent`, tokens OAuth no `User`, dependência
`googleapis`, endpoints OAuth/sync/revoke e botão inicial no Hub do Projeto.
Ainda falta criar as credenciais reais no Google Cloud e configurar Vercel para
validar OAuth/sync em produção.

**Variáveis:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI` e `PUBLIC_APP_URL`.

Para ativar:
1. Criar projeto no Google Cloud e habilitar Google Calendar API.
2. Criar OAuth Client Web.
3. Registrar redirect URI exatamente como
   `https://SEU_DOMINIO/api/calendar/google/callback`.
4. Configurar as envs na Vercel Production/Preview.
5. Rodar `npx prisma migrate deploy` depois do deploy do schema.
6. Testar em um projeto com deadline/reuniões: clicar em "Sincronizar Google",
   autorizar a conta, voltar ao app e confirmar eventos criados no Google
   Calendar + linhas em `calendar_events`.

---

## 10. Cloudflare Turnstile

**Faz:** protege login e cadastro contra bots quando configurado.

**Variáveis:** `VITE_TURNSTILE_SITE_KEY` (pública, client) e
`TURNSTILE_SECRET_KEY` (servidor). Sem `TURNSTILE_SECRET_KEY`, o backend não
exige desafio e as telas continuam funcionando normalmente.

Para ativar: criar um widget Turnstile no painel Cloudflare com domínios
`cena-studio-prod.vercel.app`, previews desejados e `localhost` para teste; usar
modo `managed`; configurar as duas envs na Vercel e validar login/cadastro.

---

## 11. Autenticação e sessão

Não é serviço externo, mas é conexão que quebra deploy quando mal configurada.

| Variável | Observação |
|---|---|
| `JWT_SECRET` | assina o token do app **e** o do portal do cliente (ver ADR-012) |
| `CLIENT_ORIGIN` | origem liberada no CORS |
| `ADMIN_EMAILS` | contas promovidas a admin |
| `ADMIN_REQUIRE_2FA` | `true` exige segundo fator em rotas admin |

**Consequência de rotação:** trocar `JWT_SECRET` invalida, ao mesmo tempo, todas
as sessões do app e todas as do portal do cliente. Está registrado como
consequência negativa no ADR-012.

---

## 12. O que NÃO existe

Para evitar caça a configuração inexistente:

- **Redis** — descartado por custo. Revogação de JWT usa Postgres (ADR-011).
- **Cron residente em Node** — não há `node-cron` nem `setInterval` para a Vercel.
  A manutenção serverless existe por Vercel Cron em
  `/api/internal/cron/maintenance` e exige `CRON_SECRET`.
- **Railway como produção atual** — foi substituído por Vercel + Supabase. Pode
  existir conexão antiga para auditoria/migração, mas não deve ser fonte de
  runtime.
- **Bull Queue, S3, SendGrid** — citados em documentos antigos, nunca usados.

---

## 13. Variáveis de verificação

Consumidas por scripts de smoke test e captura de screenshots. Devem ficar
**vazias em produção**: `SMOKE_BASE_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`,
`LANDING_CAPTURE_BASE_URL`, `LANDING_CAPTURE_EMAIL`, `LANDING_CAPTURE_PASSWORD`.

---

## 14. Ordem de bring-up do zero

1. `SUPABASE_DATABASE_URL` → `npx prisma migrate deploy` → `npm run smoke:prisma`
2. `JWT_SECRET` e `CLIENT_ORIGIN` → app sobe e autentica
3. `SUPABASE_*` → upload de arquivo e LGPD funcionam
4. `CLOUDINARY_*` → mídia e thumbnails
5. `RESEND_API_KEY` → e-mails transacionais
6. `AI_PROVIDER` + chave correspondente → ferramentas de IA
7. `STRIPE_*` → cobrança
8. `GITHUB_*` → login social (opcional, deixar por último)
9. `GOOGLE_*` → sync Google Calendar, quando a Feature H for implementada
10. `TURNSTILE_*` → proteção anti-bot de login/cadastro, quando widget existir

Do passo 1 ao 2 o sistema já sobe. Os demais habilitam áreas específicas e
falham de forma isolada, sem derrubar a aplicação.
