# 🚀 Guia de Deploy - Cena Studio

## Passo 1: Criar Contas Necessárias

### 1.1 Railway (Hospedagem + Banco)
1. Acesse: https://railway.app
2. Clique em "Start a New Project" (login com GitHub)
3. **Plano**: Hobby ($5/mês) - Free tier: $5 de crédito grátis
4. **O que vai rodar**: Backend + Frontend + PostgreSQL

### 1.2 Cloudinary (Storage de Arquivos)
1. Acesse: https://cloudinary.com/users/register_free
2. Crie conta gratuita
3. **Free tier**: 25GB storage + 25GB bandwidth/mês
4. Anote:
   - Cloud Name
   - API Key
   - API Secret

### 1.3 OpenRouter (IA) - SE NÃO TEM
1. Acesse: https://openrouter.ai
2. Crie conta (login com Google)
3. Vá em: https://openrouter.ai/keys
4. Crie API Key
5. **Free tier**: Modelos gratuitos disponíveis
6. Adicione créditos se quiser modelos pagos ($5-10 inicial)

### 1.4 Stripe (Pagamentos) - SE NÃO TEM
1. Acesse: https://dashboard.stripe.com/register
2. Crie conta
3. Complete verificação
4. No Dashboard > Developers > API Keys:
   - Anote: Publishable key
   - Anote: Secret key
5. No Dashboard > Developers > Webhooks:
   - Crie webhook: `https://seu-app.railway.app/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Anote: Webhook secret

---

## Passo 2: Configurar Variáveis de Ambiente

Crie arquivo `.env.production` (NÃO commitar):

```bash
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://cenastudio.dev

# =============================================================================
# AUTHENTICATION
# =============================================================================
JWT_SECRET=<GERAR_COM_COMANDO_ABAIXO>
ADMIN_EMAILS=seu-email@dominio.com
ADMIN_DEFAULT_PASSWORD=<SENHA_FORTE_12+_CHARS>
DEMO_USER_PASSWORD=<SENHA_DEMO>

# =============================================================================
# DATABASE (Railway PostgreSQL)
# =============================================================================
DATABASE_URL=${{Postgres.DATABASE_URL}}
# Railway auto-injeta essa variável quando você conecta o Postgres

# =============================================================================
# AI PROVIDER (OpenRouter)
# =============================================================================
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<SUA_KEY_OPENROUTER>
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TEMPERATURE=0.7

# =============================================================================
# STRIPE
# =============================================================================
STRIPE_SECRET_KEY=<SUA_SECRET_KEY>
STRIPE_PUBLISHABLE_KEY=<SUA_PUBLISHABLE_KEY>
STRIPE_WEBHOOK_SECRET=<WEBHOOK_SECRET>
STRIPE_PRICE_PRO=<PRICE_ID_PRO>
STRIPE_PRICE_STUDIO=<PRICE_ID_STUDIO>

# =============================================================================
# CLOUDINARY (Storage)
# =============================================================================
CLOUDINARY_CLOUD_NAME=<SEU_CLOUD_NAME>
CLOUDINARY_API_KEY=<SUA_API_KEY>
CLOUDINARY_API_SECRET=<SUA_API_SECRET>

# =============================================================================
# SUPABASE (Opcional - se quiser autenticação social)
# =============================================================================
SUPABASE_URL=
SUPABASE_ANON_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Gerar JWT Secret:
```bash
openssl rand -base64 32
```

---

## Passo 3: Preparar o Projeto para Deploy

### 3.1 Criar arquivo `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3.2 Adicionar script no `package.json`:
```json
{
  "scripts": {
    "start:prod": "NODE_ENV=production tsx server/index.ts"
  }
}
```

### 3.3 Criar `.gitignore` production:
```
.env.production
.env.local
data/
*.db
*.db-journal
node_modules/
dist/
```

---

## Passo 4: Deploy no Railway

### 4.1 Instalar Railway CLI:
```bash
npm install -g @railway/cli
```

### 4.2 Login:
```bash
railway login
```

### 4.3 Inicializar projeto:
```bash
railway init
```

### 4.4 Adicionar PostgreSQL:
No Railway Dashboard:
1. Clique em "New" > "Database" > "Add PostgreSQL"
2. Aguarde provisionamento
3. A variável `DATABASE_URL` será auto-injetada

### 4.5 Adicionar variáveis de ambiente:
No Railway Dashboard > Variables:
- Cole todas as variáveis do `.env.production`
- Salve

### 4.6 Deploy:
```bash
git add .
git commit -m "feat: production ready"
railway up
```

### 4.7 Executar migrations:
```bash
railway run npm run db:migrate
```

---

## Passo 5: Configurar Domínio (Opcional)

### 5.1 No Railway:
1. Settings > Domains
2. Clique em "Generate Domain" (subdomínio railway.app grátis)
3. OU conecte seu domínio customizado (cenastudio.com.br)

### 5.2 Se usar domínio próprio:
1. Registro.br ou Cloudflare ou Namecheap
2. Compre o domínio **cenastudio.dev**
3. Adicione CNAME:
   ```
   CNAME @ seu-projeto.up.railway.app
   CNAME www seu-projeto.up.railway.app
   ```
4. No Railway > Settings > Domains:
   - Add Custom Domain: `cenastudio.dev`
   - Add Custom Domain: `www.cenastudio.dev`
5. Aguarde propagação DNS (5-30min)

---

## Passo 6: Testar Produção

### 6.1 Smoke Tests:
```bash
# Health check
curl https://cenastudio.dev/health

# API
curl https://cenastudio.dev/api/plans

# Frontend
Abrir: https://cenastudio.dev
```

### 6.2 Testar fluxos críticos:
- [ ] Criar conta
- [ ] Login
- [ ] Criar projeto
- [ ] Gerar documento com IA
- [ ] Upload de arquivo
- [ ] Criar sala de review
- [ ] Testar pagamento Stripe (modo test)

---

## Passo 7: Monitoramento Básico

### 7.1 Railway Logs:
```bash
railway logs
```

### 7.2 Adicionar UptimeRobot (Grátis):
1. https://uptimerobot.com
2. Adicione monitor HTTP: `https://cenastudio.dev/health`
3. Intervalo: 5 minutos
4. Notificações: email/Telegram

### 7.3 Sentry (Opcional):
```bash
npm install @sentry/node @sentry/react
```

---

## Custos Estimados

### Mês 1 (Setup):
- Railway Hobby: $5 (crédito grátis cobre)
- Cloudinary: Grátis (free tier)
- OpenRouter: $0-10 (depende do uso)
- Stripe: $0 (só cobra % em vendas)
- **Total: $0-10**

### Mês 2+ (Operação):
- Railway: $5-15 (depende do uso)
- Cloudinary: Grátis até 25GB
- OpenRouter: $20-50 (aumenta com clientes)
- Stripe: 3,99% + R$0,39 por transação
- **Total: ~$30-70/mês**

---

## Troubleshooting

### Build falha:
```bash
railway logs --tail
# Verificar erro específico
```

### Database connection error:
- Verificar `DATABASE_URL` nas variáveis
- Executar migrations: `railway run npm run db:migrate`

### IA não responde:
- Verificar `OPENROUTER_API_KEY`
- Verificar créditos em https://openrouter.ai/credits

### Pagamento não funciona:
- Verificar webhook Stripe configurado
- Testar em modo test primeiro
- Verificar logs: `railway logs | grep stripe`

---

## Backup e Segurança

### Backup manual do DB:
```bash
railway run pg_dump > backup_$(date +%Y%m%d).sql
```

### Backup automático:
Railway faz snapshots automáticos do PostgreSQL (Hobby plan)

### Secrets Management:
- ✅ NUNCA commitar `.env.production`
- ✅ Usar Railway Variables (encrypted at rest)
- ✅ Rotacionar JWT_SECRET a cada 90 dias
- ✅ Usar Stripe em modo test até confirmar tudo funciona

---

## Próximos Passos

1. ✅ Deploy em produção
2. ✅ Convidar 5-10 beta testers
3. ✅ Coletar feedback
4. ✅ Iterar por 2-4 semanas
5. ✅ Launch oficial
6. ✅ Marketing (ProductHunt, Reddit, grupos FB)

---

**🚀 Está pronto! Qualquer dúvida, pode perguntar.**
