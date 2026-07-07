# 🚀 Deploy no Vercel (ALTERNATIVA RECOMENDADA)

## ✅ Por que Vercel?

- ✅ **Node.js 20+ nativo** - Sem problemas de versão
- ✅ **Deploy automático** - Conecta com GitHub
- ✅ **PostgreSQL integrado** - Vercel Postgres (Neon)
- ✅ **SSL grátis** - HTTPS automático
- ✅ **Edge Functions** - Performance global
- ✅ **Logs em tempo real** - Debugging fácil

---

## 📋 Passo a Passo

### 1. Criar conta no Vercel
1. Acesse: https://vercel.com/signup
2. Conecte com sua conta GitHub
3. ✅ GRÁTIS para projetos pessoais

### 2. Importar projeto
1. No dashboard Vercel, clique em "Add New..." → "Project"
2. Selecione o repositório: `cenastudio`
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

### 3. Adicionar PostgreSQL
1. No projeto Vercel, vá em "Storage" → "Create Database"
2. Selecione "Postgres" (powered by Neon)
3. Região: `us-east-1` (ou mais próxima)
4. ✅ Vercel cria automaticamente a variável `POSTGRES_URL`

### 4. Configurar variáveis de ambiente

Vá em "Settings" → "Environment Variables" e adicione:

```bash
# Database
DATABASE_URL=$POSTGRES_URL

# App Config
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://seu-projeto.vercel.app
JWT_SECRET=Ho22Ve4g9p8XBdj8Fgqxb9IbUWiu2irZpviG7g0pMVM=

# Admin
ADMIN_EMAILS=cenastudio@atomicmail.io
ADMIN_DEFAULT_PASSWORD=CenaStudio2025!Admin
DEMO_USER_PASSWORD=demo123456789

# Cloudinary
CLOUDINARY_CLOUD_NAME=tlfxvneq
CLOUDINARY_API_KEY=616546241273315
CLOUDINARY_API_SECRET=1LR3bMh83L6kLtMxkkdII4HqFfc

# OpenRouter AI (copie do arquivo COPIAR_PARA_RAILWAY.txt)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=(sua chave OpenRouter)
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_TOP_P=0.95
OPENROUTER_TIMEOUT_MS=180000
OPENROUTER_FREE_LIMIT=200
FALLBACK_AI_PROVIDER=anthropic

# Stripe (copie do arquivo COPIAR_PARA_RAILWAY.txt)
STRIPE_SECRET_KEY=(sua chave Stripe secret)
STRIPE_PUBLISHABLE_KEY=(sua chave Stripe publishable)
STRIPE_PRICE_PRO=(price ID do plano Pro)
STRIPE_PRICE_STUDIO=(price ID do plano Studio)
STRIPE_WEBHOOK_SECRET=(configurar após deploy)

# OAuth (opcional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://seu-projeto.vercel.app/api/auth/github/callback
```

### 5. Deploy
1. Clique em "Deploy"
2. Aguarde o build (2-5 minutos)
3. ✅ Seu app estará em: `https://seu-projeto.vercel.app`

### 6. Rodar migrations
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Conectar ao projeto
vercel link

# Rodar comando no Vercel
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 7. Configurar Stripe Webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://seu-projeto.vercel.app/api/webhooks/stripe`
3. Eventos: `checkout.session.completed`, `customer.subscription.*`
4. Copie o webhook secret
5. Adicione no Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 8. Domínio personalizado (opcional)
1. Vercel → Settings → Domains
2. Adicione: `cenastudio.dev`
3. Configure DNS:
   - Type: `CNAME`
   - Name: `@` ou `www`
   - Value: `cname.vercel-dns.com`

---

## 🔄 Deploy automático

Vercel faz deploy automático a cada push no GitHub:
- Branch `main` → Produção
- Outras branches → Preview deploys

---

## 📊 Monitoramento

- **Logs**: Vercel Dashboard → Deployments → Logs
- **Analytics**: Built-in analytics
- **Errors**: Real-time error tracking

---

## 💰 Custos

- **Vercel Hobby**: GRÁTIS
  - 100GB bandwidth/mês
  - 100 horas de execução/mês
  - PostgreSQL: 256MB (0.5GB storage)

- **Vercel Pro**: $20/mês
  - 1TB bandwidth
  - 400 horas execução
  - PostgreSQL: 512MB (10GB storage)

---

## 🆚 Vercel vs Railway

| Feature | Vercel | Railway |
|---------|--------|---------|
| Node.js 20+ | ✅ Nativo | ⚠️ Requer config |
| Deploy automático | ✅ | ✅ |
| PostgreSQL | ✅ Integrado | ✅ Addon |
| Grátis | ✅ Generoso | ⚠️ $5/mês |
| Performance | ⚡ Edge | ☁️ Cloud |
| Setup | 🟢 Fácil | 🟡 Médio |

**RECOMENDAÇÃO**: Use Vercel! Mais fácil, mais rápido, mais moderno.
