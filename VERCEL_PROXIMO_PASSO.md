# ✅ Vercel CLI Instalada! Próximos passos

## 🎯 Status atual:
- ✅ Vercel CLI instalada globalmente
- ✅ vercel.json corrigido
- ✅ Código enviado para GitHub
- ⏳ Vercel fazendo deploy automático...

---

## 📋 Próximos passos (na ordem):

### 1. Verificar se o deploy funcionou
Aguarde 2-3 minutos e acesse o dashboard do Vercel:
- https://vercel.com/dashboard

Você verá:
- ✅ Status do build
- 🌐 URL do projeto (ex: `cena-studio-prod.vercel.app`)

---

### 2. Adicionar PostgreSQL
No dashboard do Vercel:

1. Abra seu projeto `cena-studio-prod`
2. Vá em **Storage** → **Create Database**
3. Selecione **Postgres** (powered by Neon)
4. Região: `us-east-1` (mais próxima)
5. Clique em **Create**

✅ Vercel cria automaticamente a variável `POSTGRES_URL`

---

### 3. Configurar variáveis de ambiente

No projeto Vercel, vá em **Settings** → **Environment Variables**

Copie e cole TODAS estas variáveis (pegue os valores de `COPIAR_PARA_RAILWAY.txt`):

```bash
# Database (Vercel cria automaticamente)
DATABASE_URL=$POSTGRES_URL

# App Config
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://SEU-PROJETO.vercel.app
JWT_SECRET=Ho22Ve4g9p8XBdj8Fgqxb9IbUWiu2irZpviG7g0pMVM=

# Admin
ADMIN_EMAILS=cenastudio@atomicmail.io
ADMIN_DEFAULT_PASSWORD=CenaStudio2025!Admin
DEMO_USER_PASSWORD=demo123456789

# Cloudinary
CLOUDINARY_CLOUD_NAME=tlfxvneq
CLOUDINARY_API_KEY=616546241273315
CLOUDINARY_API_SECRET=1LR3bMh83L6kLtMxkkdII4HqFfc

# OpenRouter AI
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=(copie de COPIAR_PARA_RAILWAY.txt)
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TEMPERATURE=0.7
OPENROUTER_TOP_P=0.95
OPENROUTER_TIMEOUT_MS=180000
OPENROUTER_FREE_LIMIT=200
FALLBACK_AI_PROVIDER=anthropic

# Stripe
STRIPE_SECRET_KEY=(copie de COPIAR_PARA_RAILWAY.txt)
STRIPE_PUBLISHABLE_KEY=(copie de COPIAR_PARA_RAILWAY.txt)
STRIPE_PRICE_PRO=(copie de COPIAR_PARA_RAILWAY.txt)
STRIPE_PRICE_STUDIO=(copie de COPIAR_PARA_RAILWAY.txt)
STRIPE_WEBHOOK_SECRET=(deixe vazio por enquanto)
```

**ATENÇÃO**: Depois de adicionar as variáveis, clique em **Redeploy** para aplicar.

---

### 4. Rodar migrations do Prisma

Depois do redeploy com as variáveis, abra o terminal:

```bash
# Login no Vercel
vercel login

# Conectar ao projeto
cd /Users/danteelytra/Projetos\ -\ NAO\ APAGAR/cenastudio
vercel link

# Baixar variáveis de produção
vercel env pull .env.production

# Rodar migrations
npx prisma migrate deploy
```

---

### 5. Testar aplicação

Acesse a URL do projeto (ex: `https://cena-studio-prod.vercel.app`)

Teste:
- ✅ Landing page carrega?
- ✅ Login funciona?
- ✅ Dashboard aparece?
- ✅ Upload de vídeo funciona?

---

### 6. Configurar Stripe Webhook

Depois que tudo estiver funcionando:

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em **Add endpoint**
3. URL: `https://SEU-PROJETO.vercel.app/api/webhooks/stripe`
4. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copie o **Webhook Secret** (começa com `whsec_...`)
6. Adicione no Vercel:
   - Variável: `STRIPE_WEBHOOK_SECRET`
   - Valor: `whsec_...`
7. **Redeploy** o projeto

---

### 7. Domínio personalizado (opcional)

Depois de tudo funcionando:

1. Compre o domínio `cenastudio.dev` em:
   - Google Domains: https://domains.google
   - Namecheap: https://www.namecheap.com
   - Cloudflare: https://www.cloudflare.com

2. Configure no Vercel:
   - **Settings** → **Domains**
   - Add domain: `cenastudio.dev`
   - Vercel vai pedir para configurar DNS

3. Configure DNS no registrador:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

---

## 🆘 Se der erro

### Erro no build:
- Verifique os logs no Vercel Dashboard
- Procure por `Error:` nas últimas linhas

### Erro 500 ao acessar:
- Verifique se todas as variáveis estão configuradas
- Vá em **Deployments** → **Functions** → **Logs**

### Erro de database:
- Verifique se criou o PostgreSQL no Vercel
- Rode `vercel env pull` para ter certeza que `DATABASE_URL` existe

---

## ✅ Checklist final

- [ ] Vercel deploy funcionou (build success)
- [ ] PostgreSQL criado no Vercel
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Migrations do Prisma rodadas
- [ ] App funcionando na URL do Vercel
- [ ] Stripe webhook configurado
- [ ] Domínio customizado (opcional)

---

**Agora**: Aguarde o deploy terminar e siga os passos acima! 🚀
