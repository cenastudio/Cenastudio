# Deployment Guide - Cena Studio

Guia completo de deployment do Cena Studio em diferentes ambientes.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy Local](#deploy-local)
- [Deploy Vercel](#deploy-vercel)
- [Deploy Self-Hosted](#deploy-self-hosted)
- [Deploy Docker](#deploy-docker)
- [Monitoramento](#monitoramento)
- [Rollback](#rollback)
- [Backup e Restore](#backup-e-restore)

---

## 🔧 Pré-requisitos

### Obrigatórios

- Node.js 20+
- npm 11+
- Git
- Conta Vercel (para Vercel deploy)
- Conta Supabase (para banco de dados)

### Opcionais

- Docker (para Docker deploy)
- Docker Compose
- Domínio próprio (para produção)

---

## 🌍 Variáveis de Ambiente

### Desenvolvimento

```bash
# .env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=dev-secret-change-in-production
DATABASE_PATH=./data/frame.db
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Produção

```bash
# .env.production
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://cenastudio.com.br
JWT_SECRET=strong-random-32-char-string
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_DB_PASSWORD=your_supabase_database_password
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_production_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
LOG_LEVEL=info
SENTRY_DSN=https://your-dsn@sentry.io/project
REDIS_URL=redis://localhost:6379
```

---

## 💻 Deploy Local

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/frameai-director-correto.git
cd frameai-director-correto
```

### 2. Instale Dependências

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edite .env com suas configurações
```

### 4. Inicie o Servidor

```bash
npm run dev
```

**Serviços:**
- Frontend: http://localhost:5173
- API: http://localhost:5001

---

## 🚀 Deploy Vercel

### 1. Preparar Projeto

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login
```

### 2. Configurar Variáveis de Ambiente

No painel Vercel:
- Vá em Settings > Environment Variables
- Adicione todas as variáveis de produção

**Críticas:**
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `AI_PROVIDER`
- `NVIDIA_API_KEY`

### 3. Deploy

```bash
# Deploy inicial
vercel

# Deploy em produção
vercel --prod
```

### 4. Configurar Domínio

No painel Vercel:
- Vá em Settings > Domains
- Adicione seu domínio (ex: cenastudio.com.br)
- Configure DNS (CNAME ou A record)

### 5. Verificar Deploy

```bash
# Ver logs
vercel logs

# Verificar health check
curl https://cenastudio.com.br/health

# Verificar readiness check
curl https://cenastudio.com.br/ready

# Verificar login e cookie httpOnly
curl -i -X POST https://cenastudio.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cenastudio.com.br","password":"admin123"}'
```

### Observações Vercel

- O servidor Express configura `app.set("trust proxy", 1)` para aceitar os headers `X-Forwarded-*` enviados pela Vercel.
- Sem `trust proxy`, o `express-rate-limit` pode registrar `ValidationError` de `X-Forwarded-For` e causar falhas intermitentes em rotas como `/api/auth/login`.
- O cookie de sessão em produção é `frame_token`, `httpOnly`, `sameSite=lax` e `secure`.
- `CLIENT_ORIGIN` deve apontar para o domínio público final, sem `localhost`.
- SQLite em filesystem efêmero da Vercel não deve ser usado em produção; use Supabase Postgres via Prisma.
- A conexão persistente pode vir de `DATABASE_URL`, `POSTGRES_PRISMA_URL` ou `POSTGRES_URL`.
- A integração oficial Supabase/Vercel cria `POSTGRES_PRISMA_URL` automaticamente e esta é a opção preferida na Vercel.
- Para configuração manual do Supabase Pooler, use o formato:

```bash
DATABASE_URL="postgresql://postgres.<project-ref>:<db-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

No projeto atual, o `project-ref` é `vylxwhuuqluloxkhlsmd`.

### 6. Preparar Supabase Postgres

```bash
# Defina a senha do banco Supabase antes de aplicar migrations
export SUPABASE_DB_PASSWORD="sua_senha_do_banco"

# Aplicar migrations SQL existentes
npx supabase db push

# Validar schema Prisma
npx prisma validate

# Gerar Prisma Client
npx prisma generate
```

As migrations `20260630010000_initial_frame_schema.sql` e `20260630011500_enable_rls_policies.sql` foram aplicadas em produção em 30/06/2026.

Quando a integração Supabase/Vercel não estiver ativa, configure `DATABASE_URL` manualmente:

```bash
vercel env add DATABASE_URL production
vercel --prod
```

O Prisma 7 usa `@prisma/adapter-pg` com pool máximo padrão de uma conexão por instância serverless, timeout de conexão padrão de 30s e retry curto para erros transitórios do pooler. Ajuste `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_MS` e `DATABASE_TRANSIENT_RETRIES` somente após medir a capacidade do pooler.

### Validação de produção em 30/06/2026

- Deployment atual: `dpl_J8f2jBNL7ZwfEEHWGffqoV6eUY6g`
- Alias: `https://frame-ai-director-correto.vercel.app`
- `GET /health`: 200
- `GET /ready`: 200, banco pronto
- `ALLOW_EPHEMERAL_SQLITE` removido do ambiente `production`
- Smoke de produção executado com `SMOKE_BASE_URL=https://frame-ai-director-correto.vercel.app npm run smoke:prisma`
- Checks validados: health, ready, auth, clientes, projetos, oportunidades, interações, colaboradores, membros de projeto, arquivos via Supabase Storage, video reviews, financeiro e analytics

Deploys anteriores apresentaram timeout transitório do pooler sob rajadas frias. O adapter usa uma conexão por instância, timeout explícito e retry curto; esse comportamento deve continuar sendo observado nos logs.

---

## 🏠 Deploy Self-Hosted

### Requisitos

- Ubuntu 20.04+ ou similar
- 2GB RAM mínimo
- 20GB disco
- Node.js 20+
- Nginx (opcional, recomendado)
- PM2 (process manager)

### 1. Preparar Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx
```

### 2. Clonar Repositório

```bash
git clone https://github.com/seu-usuario/frameai-director-correto.git
cd frameai-director-correto
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Configurar Environment

```bash
cp .env.example .env
nano .env
# Adicione suas variáveis de produção
```

### 5. Build

```bash
npm run build
```

### 6. Iniciar com PM2

```bash
pm2 start dist/index.js --name cena-studio
pm2 save
pm2 startup
```

### 7. Configurar Nginx

```nginx
# /etc/nginx/sites-available/cenastudio
server {
    listen 80;
    server_name cenastudio.com.br;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
...
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/cenastudio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Configurar SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cenastudio.com.br
```

---

## 🐳 Deploy Docker

### 1. Criar Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

### 2. Criar docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
```

### 3. Build e Run

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## 📊 Monitoramento

### Health Checks

```bash
# Health check
curl https://cenastudio.com.br/health

# Readiness check
curl https://cenastudio.com.br/ready
```

Contrato esperado:
- `/health` retorna status básico do processo.
- `/ready` valida se dependências mínimas estão prontas para receber tráfego.
- Ambos são endpoints raiz, fora de `/api`.

### Logs

**Vercel:**
```bash
vercel logs
```

**PM2:**
```bash
pm2 logs cena-studio
```

**Docker:**
```bash
docker-compose logs -f
```

### Metrics

Configure monitoring com:
- [Sentry](https://sentry.io/) - Error tracking
- [Datadog](https://www.datadoghq.com/) - APM e logs
- [New Relic](https://newrelic.com/) - Performance monitoring

---

## 🔄 Rollback

### Vercel

```bash
# Listar deploys
vercel list

# Rollback para deploy anterior
vercel rollback [deployment-url]

# Rollback para produção
vercel rollback [deployment-url] --prod
```

### PM2

```bash
# Listar versões
pm2 list

# Rollback (redeploy versão anterior)
git checkout [previous-commit]
npm run build
pm2 reload cena-studio
```

### Docker

```bash
# Rebuild versão anterior
git checkout [previous-commit]
docker-compose build
docker-compose up -d
```

---

## 💾 Backup e Restore

### Supabase Backup

**Automático:**
- Supabase faz backup automático diário

**Manual:**
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Restore
supabase db reset -f backup.sql
```

### SQLite Backup

```bash
# Backup
cp data/frame.db data/frame.db.backup

# Via script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/frame.db "data/backups/frame_$DATE.db"
```

### Backup de Arquivos

```bash
# Backup uploads
tar -czf uploads-backup.tar.gz uploads/

# Restore
tar -xzf uploads-backup.tar.gz
```

---

## 🔒 Segurança em Produção

### Checklist

- [ ] JWT_SECRET forte (32+ caracteres)
- [ ] Supabase RLS habilitado
- [ ] HTTPS configurado
- [ ] Rate limiting ativo
- [ ] CORS configurado corretamente
- [ ] Firewall configurado
- [ ] Dependências atualizadas
- [ ] Logs não contêm dados sensíveis
- [ ] Secrets não em código
- [ ] Backup automático configurado

### Security Headers

O sistema já usa Helmet para headers de segurança:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      // ...
    }
  }
}))
```

---

## 📈 Performance

### Otimizações

1. **CDN:** Vercel CDN automático
2. **Cache:** Implementar Redis (veja SENIOR_LEVEL_ROADMAP.md)
3. **Compression:** Gzip habilitado no Vercel
4. **Minification:** Vite minifica automaticamente
5. **Tree Shaking:** Vite remove código não usado

### Monitoring

Use ferramentas para monitorar performance:
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [WebPageTest](https://www.webpagetest.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## 🆘 Troubleshooting

### Deploy Falha

**Vercel:**
```bash
# Ver logs
vercel logs

# Verificar build
vercel build
```

**PM2:**
```bash
# Ver logs
pm2 logs cena-studio --lines 100

# Ver status
pm2 status
```

### Banco Não Conecta

```bash
# Verificar variáveis
echo $DATABASE_URL
echo $SUPABASE_URL

# Testar conexão
psql $DATABASE_URL
```

### Variáveis de Ambiente Não Carregam

```bash
# Verificar se .env existe
ls -la .env

# Verificar permissões
chmod 600 .env

# Recarregar PM2
pm2 reload cena-studio
```

---

## 📞 Suporte

- Email: contato@cenastudio.com.br
- Issues: GitHub Issues
- Docs: SYSTEM_DOCUMENTATION.md

---

**Última atualização:** 30 de Junho de 2026
