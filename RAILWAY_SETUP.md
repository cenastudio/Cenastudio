# 🚂 Railway - Configuração Completa

## ✅ Status Atual

- ✅ Conta Railway criada
- ✅ Projeto: `cena-studio-prod`
- ✅ Railway CLI instalado

---

## 📋 Próximos Passos

### 1. Fazer login no Railway CLI

```bash
railway login
```

Isso vai abrir o browser para autenticar. Clique em "Confirm" quando aparecer.

---

### 2. Conectar ao projeto

```bash
railway link 2dade05a-97e9-473c-936e-c9667b6732535528b051-9fc1-4aa5-a12e-4c46612dc718
```

---

### 3. Adicionar PostgreSQL

No Railway Dashboard (https://railway.app/project/2dade05a-97e9-473c-936e-c9667b6732535528b051-9fc1-4aa5-a12e-4c46612dc718):

1. Clique em "+ New"
2. Selecione "Database"
3. Escolha "Add PostgreSQL"
4. Aguarde provisionamento (~30 segundos)
5. **Pronto!** A variável `DATABASE_URL` será criada automaticamente

---

### 4. Gerar JWT Secret

```bash
openssl rand -base64 32
```

**Copie o resultado e salve!** Vamos usar nas variáveis de ambiente.

---

### 5. Adicionar Variáveis de Ambiente

No Railway Dashboard > Seu serviço > Variables, adicione:

```bash
# Server
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://cenastudio.dev

# Auth (use o JWT gerado acima)
JWT_SECRET=<COLE_O_JWT_AQUI>
ADMIN_EMAILS=seu-email@dominio.com
ADMIN_DEFAULT_PASSWORD=<SENHA_FORTE_12_CHARS>
DEMO_USER_PASSWORD=demo123456

# Database (Railway injeta automaticamente)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Cloudinary ✅
CLOUDINARY_CLOUD_NAME=tlfxvneq
CLOUDINARY_API_KEY=616546241273315
CLOUDINARY_API_SECRET=1LR3bMh83L6kLtMxkkdII4HqFfc

# AI Provider (adicionar depois de criar OpenRouter)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<CRIAR_OPENROUTER_PRIMEIRO>
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TEMPERATURE=0.7

# Stripe (adicionar depois de criar conta)
STRIPE_SECRET_KEY=<CRIAR_STRIPE_PRIMEIRO>
STRIPE_PUBLISHABLE_KEY=<CRIAR_STRIPE_PRIMEIRO>
STRIPE_WEBHOOK_SECRET=<CONFIGURAR_DEPOIS>
STRIPE_PRICE_PRO=<CRIAR_PRODUTO>
STRIPE_PRICE_STUDIO=<CRIAR_PRODUTO>
```

---

## 🚀 Quando Fazer Deploy?

**AGORA NÃO!** Precisamos antes:

1. ✅ Railway configurado
2. ⏳ Criar OpenRouter (IA) - **PRÓXIMO**
3. ⏳ Criar Stripe (Pagamentos)
4. ⏳ Adicionar todas as variáveis
5. ⏳ Fazer deploy

---

## 📊 Progresso: 50% (2/4 contas)

- ✅ Cloudinary
- ✅ Railway
- ⏳ OpenRouter
- ⏳ Stripe

---

## 🎯 Próximo Passo: Criar OpenRouter

Vou te guiar agora para criar a conta OpenRouter (super rápido: 5 min).

Quer criar agora? 🚀
