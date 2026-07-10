# Deploy — Cena Studio

Guia único para levar o Cena Studio ao ar. Consolida Railway (**atual em
produção**), Vercel e VPS como alternativas.

> **Estado atual da produção (09-jul-2026):** o app está hospedado no
> **Railway** (project `cena-studio-prod`, environment `production`) com
> **Railway Postgres** como banco de dados (service `Postgres`, host
> interno `postgres.railway.internal:5432`). As seções sobre Supabase
> Postgres abaixo permanecem válidas como alternativa se você quiser
> migrar o banco, mas **hoje não são o caminho ativo**. Supabase é usado
> apenas opcionalmente para social auth / storage — não como DB primário.

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy no Railway (atual)](#deploy-no-railway)
- [Deploy na Vercel (alternativa)](#deploy-na-vercel-recomendado)
- [Self-hosted (VPS + PM2 + Nginx)](#self-hosted-vps--pm2--nginx)
- [Banco de dados — Railway Postgres (atual) e Supabase Postgres (alternativa)](#banco-de-dados-supabase-postgres)
- [Stripe (webhook)](#stripe-webhook)
- [Smoke tests pós-deploy](#smoke-tests-pós-deploy)
- [Rollback](#rollback)
- [Backup](#backup)

---

## Pré-requisitos

- Node.js **20.19+** (ver `.nvmrc`)
- npm **10+**
- **Conta Railway com Postgres service provisionado** (recomendado
  hoje). Alternativa: conta Supabase com projeto Postgres (ver seção
  final).
- Conta Stripe (produção ou teste)
- Provedor de IA configurado (OpenRouter, Anthropic ou NVIDIA)
- Cloudinary (opcional, para uploads)

---

## Variáveis de ambiente

Use `.env.example` como referência. Nunca commite `.env*`.

### Obrigatórias em produção

```bash
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://seu-dominio.com

# Auth
JWT_SECRET=<gerar com: openssl rand -base64 32>
ADMIN_EMAILS=admin@seudominio.com
ADMIN_DEFAULT_PASSWORD=<mínimo 12 chars>
DEMO_USER_PASSWORD=<mínimo 12 chars>

# Database (Railway Postgres — atual em produção)
# No Railway com Postgres service vinculado, o valor abaixo é
# interpolado automaticamente pelo próprio Railway ao fazer deploy:
DATABASE_URL=${{Postgres.DATABASE_URL}}
# (equivale a algo como: postgresql://postgres:<pass>@postgres.railway.internal:5432/railway)

# Supabase é OPCIONAL — usado apenas para social auth ou storage
# de assets (não como DB primário). Deixe vazio se não vai usar.
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Alternativa (fora de uso hoje): Supabase Postgres como DB primário.
# Se um dia migrar, o DATABASE_URL seria assim:
# DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1

# AI
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<key>
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=<price_id>
STRIPE_PRICE_STUDIO=<price_id>

# Uploads (opcional)
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# OAuth (opcional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://seu-dominio.com/api/auth/github/callback
```

### Regras

- `ADMIN_DEFAULT_PASSWORD` e `DEMO_USER_PASSWORD`: mínimo **12 caracteres** em produção.
- `CLIENT_ORIGIN`: domínio público final, sem `localhost`.
- SQLite **não** deve ser usado em produção. Remova `ALLOW_EPHEMERAL_SQLITE` do ambiente `production`.
- Prisma 7 usa `@prisma/adapter-pg` com pool padrão de 1 conexão por instância serverless. Ajuste `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_TRANSIENT_RETRIES` só depois de medir o pooler.

Valide o env antes de subir:

```bash
npm run validate:env
```

---

## Deploy na Vercel (recomendado)

### 1. Importar

- vercel.com → Add New → Project → selecione o repo.
- Framework Preset: **Other**
- Build Command: `npm run build`
- Output Directory: `dist/public`
- Install Command: `npm install`

### 2. Banco (integração Supabase — alternativa à Railway Postgres)

> Este bloco é para o cenário Vercel + Supabase. **Se estiver no Railway
> hoje, ignorar** — Railway auto-injeta `${{Postgres.DATABASE_URL}}`.

Storage → Create Database → Supabase → conecta ao projeto. A integração cria `POSTGRES_PRISMA_URL` automaticamente. Prisma aceita `DATABASE_URL`, `POSTGRES_PRISMA_URL` ou `POSTGRES_URL`.

Se configurar manualmente, use o pooler:

```bash
vercel env add DATABASE_URL production
```

### 3. Variáveis

Settings → Environment Variables → adicione todas as variáveis da seção acima em **Production**, **Preview** e **Development** conforme necessário.

### 4. Deploy

```bash
npm i -g vercel
vercel login
vercel --prod
```

Deploy automático a cada push em `main` ficará ativo após a primeira publicação.

### 5. Migrations

```bash
vercel link
vercel env pull .env.production
npx prisma migrate deploy
```

### Observações Vercel

- O Express usa `app.set("trust proxy", 1)` para aceitar headers `X-Forwarded-*`. Sem isso, o `express-rate-limit` gera `ValidationError` em `/api/auth/login`.
- Cookie de sessão em produção: `frame_token`, `httpOnly`, `sameSite=lax`, `secure`.
- Auth primária: email/senha com `frame_token`. Supabase Auth Admin, GitHub OAuth e workspace bootstrap são sincronizações tolerantes, não devem bloquear login.

---

## Deploy no Railway

### 1. Provisão

- railway.app → New Project → Deploy from GitHub → selecione o repo.
- Add → Database → PostgreSQL. `DATABASE_URL` fica disponível como `${{Postgres.DATABASE_URL}}`.

### 2. Variáveis

Service → Variables → adicione as variáveis obrigatórias. Referencie o banco assim:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### 3. Deploy

```bash
npm i -g @railway/cli
railway login
railway link <project-id>
railway up
```

O `railway.json` na raiz já define `startCommand: npm run start:prod`, healthcheck `/health` e restart on failure.

---

## Self-hosted (VPS + PM2 + Nginx)

### Requisitos

Ubuntu 22.04+, 2 GB RAM, Node.js 20+, PM2, Nginx, Certbot.

### Setup

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm i -g pm2

# App
git clone <repo>
cd cenastudio
cp .env.example .env    # editar com valores de produção
npm ci
npm run build
pm2 start dist/index.js --name cena-studio
pm2 save && pm2 startup
```

### Nginx (`/etc/nginx/sites-available/cenastudio`)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cenastudio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## Banco de dados

### Setup atual: Railway Postgres

O banco em produção é um Postgres provisionado no Railway (service
`Postgres` no mesmo project da app). Comunicação service-to-service via
`postgres.railway.internal:5432`, database `railway`. A env `DATABASE_URL`
é interpolada pelo Railway como `${{Postgres.DATABASE_URL}}` — não
precisa colar valores literais no dashboard.

**Aplicar migrations em produção:** feito automaticamente no deploy
via `npx prisma migrate deploy` (verifique se está no `postinstall` ou
`start` do `package.json`; senão adicione manualmente ao pipeline).

**Aplicar migrations manualmente (localmente contra Railway):**

```bash
# Use DATABASE_URL do proxy público do Railway (não o interno)
# Copiar da dashboard: Postgres → Data → "Public Connection String"
export DATABASE_URL="postgresql://postgres:<pass>@hayabusa.proxy.rlwy.net:<porta>/railway"
npx prisma migrate deploy
npx prisma validate
npx prisma generate
```

### Alternativa (fora de uso hoje): Supabase Postgres

Se um dia quiser migrar de Railway pra Supabase, o setup é:

```bash
export SUPABASE_DB_PASSWORD="<senha do banco>"
npx supabase db push
npx prisma validate
npx prisma generate
```

Migrations existentes: `20260630010000_initial_frame_schema.sql`, `20260630011500_enable_rls_policies.sql`.

### RLS (só se estiver em Supabase)

**Não se aplica ao Railway Postgres atual** — RLS (Row-Level Security)
é um recurso Postgres nativo mas nas políticas do repo
(`supabase-rls-policies.sql`) foram desenhadas para o modelo de auth do
Supabase (`auth.uid()`). Se um dia migrar pra Supabase, aplicar essas
políticas. Enquanto o DB for Railway Postgres, a segurança de row-level
é feita na camada da app (server/controllers), não no DB.

---

## Stripe (webhook)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.
2. URL: `https://seu-dominio.com/api/webhooks/stripe`.
3. Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copie o **signing secret** para `STRIPE_WEBHOOK_SECRET`.

---

## Smoke tests pós-deploy

```bash
# Health & readiness
curl https://seu-dominio.com/health
curl https://seu-dominio.com/ready

# Auth (login retorna cookie frame_token)
curl -i -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seudominio.com","password":"<senha>"}'

# Provedores de auth disponíveis
curl https://seu-dominio.com/api/auth/providers

# Smoke completo (Prisma / rotas críticas)
SMOKE_BASE_URL=https://seu-dominio.com npm run smoke:prisma
```

O smoke deve validar: login admin, login demo, registro público, criação admin, `/api/auth/me`, logout, providers, GitHub configurado/desconfigurado, limite Free (6º cliente retorna `402`), Studio pending, `/api/checkout/sync-session` ativa sessão paga.

---

## Rollback

**Vercel:**

```bash
vercel list
vercel rollback <deployment-url> --prod
```

**Railway:** Dashboard → Deployments → selecione revisão → Redeploy.

**PM2:**

```bash
git checkout <commit-anterior>
npm ci && npm run build
pm2 reload cena-studio
```

---

## Backup

**Railway Postgres (atual):** backups automáticos dependendo do plano
(verificar em Postgres service → Backups). Manual:

```bash
# Conectar ao Postgres do Railway via URL pública (não interna) e dumpar:
pg_dump "postgresql://postgres:<pass>@hayabusa.proxy.rlwy.net:<porta>/railway" > backup.sql
```

**Alternativa Supabase:** backups diários automáticos no plano. Manual:

```bash
supabase db dump -f backup.sql
```

**Uploads:**

```bash
tar -czf uploads-$(date +%Y%m%d).tar.gz uploads/
```

---

## Checklist final

- [ ] `npm run validate:env` passa
- [ ] `JWT_SECRET` com 32+ caracteres
- [ ] `DATABASE_URL` aponta pro Railway Postgres (interpolação
  `${{Postgres.DATABASE_URL}}`) — ou pooler Supabase se migrou
- [ ] `ALLOW_EPHEMERAL_SQLITE` removido em produção
- [ ] Stripe webhook configurado e `STRIPE_WEBHOOK_SECRET` setado
- [ ] `/health` e `/ready` respondem 200
- [ ] Smoke `npm run smoke:prisma` passa
- [ ] Domínio com HTTPS
- [ ] RLS ativo (só se estiver em Supabase; no Railway Postgres não se
  aplica — a app faz segurança row-level na camada de aplicação)
