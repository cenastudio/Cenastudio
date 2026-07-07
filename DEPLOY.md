# Deploy — Cena Studio

Guia único para levar o Cena Studio ao ar. Consolida Vercel (recomendado) e Railway como alternativa self-hosted.

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy na Vercel (recomendado)](#deploy-na-vercel-recomendado)
- [Deploy no Railway](#deploy-no-railway)
- [Self-hosted (VPS + PM2 + Nginx)](#self-hosted-vps--pm2--nginx)
- [Banco de dados (Supabase Postgres)](#banco-de-dados-supabase-postgres)
- [Stripe (webhook)](#stripe-webhook)
- [Smoke tests pós-deploy](#smoke-tests-pós-deploy)
- [Rollback](#rollback)
- [Backup](#backup)

---

## Pré-requisitos

- Node.js **20.19+** (ver `.nvmrc`)
- npm **10+**
- Conta Supabase com projeto Postgres provisionado
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

# Database (Supabase Postgres)
DATABASE_URL=postgresql://postgres.<project-ref>:<db-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>

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

### 2. Banco (integração Supabase)

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

## Banco de dados (Supabase Postgres)

### Aplicar migrations

```bash
export SUPABASE_DB_PASSWORD="<senha do banco>"
npx supabase db push
npx prisma validate
npx prisma generate
```

Migrations existentes: `20260630010000_initial_frame_schema.sql`, `20260630011500_enable_rls_policies.sql`.

### RLS

As políticas em `supabase-rls-policies.sql` já foram aplicadas. Não desabilite RLS em produção.

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

**Supabase:** backups diários automáticos no plano. Manual:

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
- [ ] `DATABASE_URL` aponta pro Supabase pooler
- [ ] `ALLOW_EPHEMERAL_SQLITE` removido em produção
- [ ] Stripe webhook configurado e `STRIPE_WEBHOOK_SECRET` setado
- [ ] `/health` e `/ready` respondem 200
- [ ] Smoke `npm run smoke:prisma` passa
- [ ] Domínio com HTTPS
- [ ] RLS ativo no Supabase
