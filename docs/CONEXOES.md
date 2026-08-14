# Conexões — Cena Studio

> Objetivo: permitir reconectar o sistema do zero. Cada seção diz o que o
> provedor faz, o que ele **não** faz, quais variáveis o código lê, e como
> validar. Nomes de variáveis conferem com `.env.example`; nenhum valor real
> aparece aqui.

**Última atualização:** 2026-08-14

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

**Faz:** todo envio transacional (`server/services/emailService.ts`).

**Não faz:** nada se `RESEND_API_KEY` estiver ausente. O código expõe
`isEmailConfigured` e lança erro explícito em vez de falhar silenciosamente —
ou seja, ausência de e-mail não derruba o app, mas derruba o fluxo que depende
dele.

**Variáveis:** `RESEND_API_KEY`, `EMAIL_FROM` (default cai em
`onboarding@resend.dev`, que só serve para teste).

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

---

## 8. GitHub OAuth

**Faz:** login social opcional.

**Variáveis:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`GITHUB_CALLBACK_URL` (precisa bater exatamente com o registrado no app OAuth).

---

## 9. Autenticação e sessão

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

## 10. O que NÃO existe

Para evitar caça a configuração inexistente:

- **Redis** — descartado por custo. Revogação de JWT usa Postgres (ADR-011).
- **Scheduler / cron** — não há `node-cron` nem `setInterval`. Logo, não há
  retry de webhook nem poda de `user_sessions` (ambos na Seção 4 do
  `docs/STATUS.md`). `ENABLE_CRON_JOBS` aparece em relatórios antigos, mas não
  existe no código.
- **Railway como produção atual** — foi substituído por Vercel + Supabase. Pode
  existir conexão antiga para auditoria/migração, mas não deve ser fonte de
  runtime.
- **Bull Queue, S3, SendGrid** — citados em documentos antigos, nunca usados.

---

## 11. Variáveis de verificação

Consumidas por scripts de smoke test e captura de screenshots. Devem ficar
**vazias em produção**: `SMOKE_BASE_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`,
`LANDING_CAPTURE_BASE_URL`, `LANDING_CAPTURE_EMAIL`, `LANDING_CAPTURE_PASSWORD`.

---

## 12. Ordem de bring-up do zero

1. `SUPABASE_DATABASE_URL` → `npx prisma migrate deploy` → `npm run smoke:prisma`
2. `JWT_SECRET` e `CLIENT_ORIGIN` → app sobe e autentica
3. `SUPABASE_*` → upload de arquivo e LGPD funcionam
4. `CLOUDINARY_*` → mídia e thumbnails
5. `RESEND_API_KEY` → e-mails transacionais
6. `AI_PROVIDER` + chave correspondente → ferramentas de IA
7. `STRIPE_*` → cobrança
8. `GITHUB_*` → login social (opcional, deixar por último)

Do passo 1 ao 2 o sistema já sobe. Os demais habilitam áreas específicas e
falham de forma isolada, sem derrubar a aplicação.
