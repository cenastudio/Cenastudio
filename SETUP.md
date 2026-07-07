# Setup - Nova Conta

Guia completo para provisionar Cena Studio em conta nova (Vercel, GitHub, Supabase).

**Última atualização:** 05 de Julho de 2026

---

## 📋 Pré-requisitos

Você precisará criar contas em:

- ✅ [GitHub](https://github.com) — Repositório e código-fonte
- ✅ [Vercel](https://vercel.com) — Hosting e deploy
- ✅ [Supabase](https://supabase.com) — Banco de dados PostgreSQL

**Opcionais:**
- [Stripe](https://stripe.com) — Processamento de pagamentos (legado/API)
- [Anthropic](https://anthropic.com) ou [NVIDIA](https://nvidia.com) — Provedores de IA pagos (fallback)

---

## 🚀 Etapa 1: Criar Projeto Supabase

### 1.1 Criar Novo Projeto

1. Acesse https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `cena-studio` (ou nome de sua preferência)
   - **Database Password:** Senha forte (anote)
   - **Region:** Escolha região mais próxima
4. Clique em **"Create new project"**
5. Aguarde provisionamento (~2 minutos)

### 1.2 Obter Credenciais

Vá em **Settings > API** e anote:

| Variável | Onde Encontrar |
|----------|----------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Project API keys > `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys > `service_role` (clique "Reveal") |

⚠️ **Importante:** Nunca commite `SUPABASE_SERVICE_ROLE_KEY` no Git!

### 1.3 Configurar Connection String

Vá em **Settings > Database** e copie:

**Connection pooling:**
```
postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1
```

Anote como `DATABASE_URL`.

### 1.4 Aplicar Migrations

Com o projeto Supabase criado, aplique as migrations:

```bash
# 1. Configure a connection string
export DATABASE_URL="<sua-connection-string-aqui>"

# 2. Aplique migrations SQL
npx supabase db push

# 3. Gere Prisma Client
npx prisma generate

# 4. Verifique se funcionou
npx prisma db pull
```

**Migrations aplicadas:**
- `20260630010000_initial_frame_schema.sql` — Schema inicial
- `20260630011500_enable_rls_policies.sql` — Row Level Security
- `20260701023000_workspace_foundation.sql` — Workspaces
- `20260704220000_calendar_events.sql` — Calendário
- `20260704230000_notifications_table.sql` — Notificações

### 1.5 Configurar Storage Bucket (Arquivos)

```bash
# Via Supabase CLI (recomendado)
npx supabase storage create project-files --public=false

# Ou manualmente no Dashboard:
# Storage > Create bucket > Name: "project-files", Public: false
```

---

## 📦 Etapa 2: Configurar Repositório GitHub

### 2.1 Fork ou Clone

**Opção A: Fork (recomendado)**
1. Acesse o repositório original
2. Clique em **"Fork"**
3. Clone seu fork:
```bash
git clone https://github.com/<seu-usuario>/cena-studio.git
cd cena-studio
```

**Opção B: Repositório novo**
```bash
# Clone original
git clone https://github.com/<repo-original>/frameai-director-correto.git cena-studio
cd cena-studio

# Remova remote original
git remote remove origin

# Crie novo repositório no GitHub e adicione remote
git remote add origin https://github.com/<seu-usuario>/cena-studio.git
git branch -M main
git push -u origin main
```

### 2.2 Configurar GitHub OAuth (Opcional)

Para login com GitHub:

1. Vá em **Settings > Developer settings > OAuth Apps**
2. Clique em **"New OAuth App"**
3. Preencha:
   - **Application name:** `Cena Studio`
   - **Homepage URL:** `https://<seu-dominio>`
   - **Authorization callback URL:** `https://<seu-dominio>/api/auth/github/callback`
4. Anote:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`

---

## ☁️ Etapa 3: Deploy no Vercel

### 3.1 Import Repository

1. Acesse https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione seu repositório GitHub
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/public`
   - **Install Command:** `npm install --legacy-peer-deps`

### 3.2 Configurar Environment Variables

**Obrigatórias:**

```env
# Server
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://<seu-projeto>.vercel.app

# Auth (OBRIGATÓRIO)
JWT_SECRET=<GERAR_STRING_ALEATORIA_32_CHARS>

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase>

# Database
DATABASE_URL=<connection-pooling-string-from-supabase>

# Admin
ADMIN_EMAILS=admin@<seu-dominio>
ADMIN_DEFAULT_PASSWORD=<SENHA_FORTE_MIN_12_CHARS>
DEMO_USER_PASSWORD=<SENHA_FORTE_MIN_12_CHARS>

# IA Provider (escolha um)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=<sua-chave-openrouter>
```

**Opcionais:**

```env
# GitHub OAuth
GITHUB_CLIENT_ID=<seu-client-id>
GITHUB_CLIENT_SECRET=<seu-client-secret>
GITHUB_CALLBACK_URL=https://<seu-dominio>/api/auth/github/callback

# Stripe (legado)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
```

### 3.3 Deploy

1. Clique em **"Deploy"**
2. Aguarde build (~2-3 minutos)
3. Após deploy, acesse URL: `https://<seu-projeto>.vercel.app`

### 3.4 Configurar Domínio (Opcional)

1. Vá em **Settings > Domains**
2. Adicione seu domínio
3. Configure DNS:
   - **CNAME:** `cname.vercel-dns.com`
   - Ou **A record** para IP do Vercel
4. Aguarde propagação DNS (~10 minutos)
5. **Atualize** `CLIENT_ORIGIN` nas env variables para seu domínio

---

## 🧪 Etapa 4: Validar Deploy

### 4.1 Health Checks

```bash
# Health check básico
curl https://<seu-dominio>/health

# Readiness (valida banco)
curl https://<seu-dominio>/ready
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-07-05T...",
  "uptime": 123.45
}
```

### 4.2 Testar Autenticação

```bash
# Verificar provedores disponíveis
curl https://<seu-dominio>/api/auth/providers

# Testar login (substitua credenciais)
curl -i -X POST https://<seu-dominio>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@<seu-dominio>","password":"<sua-senha>"}'
```

**Resposta esperada:**
- Status: `200 OK`
- Cookie: `frame_token` (httpOnly)
- JSON: `{"success":true,"data":{...}}`

### 4.3 Smoke Test Completo

```bash
# Configure URL base
export SMOKE_BASE_URL=https://<seu-dominio>

# Execute smoke test
npm run smoke:prisma
```

**Validações:**
- ✅ Health endpoint
- ✅ Readiness (banco conectado)
- ✅ Login admin
- ✅ Login demo
- ✅ Registro público
- ✅ CRUD de clientes
- ✅ CRUD de projetos
- ✅ Storage (arquivos)

---

## 🔧 Etapa 5: Configurações Adicionais

### 5.1 Integração Vercel + Supabase (Recomendado)

Para simplificar conexão com banco:

1. No Vercel, vá em **Integrations**
2. Busque **"Supabase"**
3. Clique em **"Add Integration"**
4. Conecte seu projeto Supabase
5. Vercel criará automaticamente `POSTGRES_PRISMA_URL`

### 5.2 Configurar Webhooks Stripe (Se Usado)

1. Vá em **Stripe Dashboard > Developers > Webhooks**
2. Clique em **"Add endpoint"**
3. URL: `https://<seu-dominio>/api/checkout/webhook`
4. Eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copie **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 5.3 Configurar SMTP (Email)

Se quiser enviar emails:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sua-chave-sendgrid>
SMTP_FROM=noreply@<seu-dominio>
```

---

## 🎯 Etapa 6: Primeiros Passos

### 6.1 Primeiro Login

1. Acesse `https://<seu-dominio>/login`
2. Use credenciais admin:
   - Email: `admin@<seu-dominio>` (definido em `ADMIN_EMAILS`)
   - Senha: senha que você definiu em `ADMIN_DEFAULT_PASSWORD`

### 6.2 Criar Primeiro Projeto

1. Vá em **Projetos**
2. Clique em **"Novo Projeto"**
3. Preencha dados e salve

### 6.3 Testar Ferramentas IA

1. Vá em **Ferramentas**
2. Escolha qualquer ferramenta (ex: "Roteiro")
3. Insira prompt de teste
4. Clique em **"Gerar"**
5. Verifique resposta da IA

---

## 🔒 Segurança Pós-Deploy

### Checklist de Segurança

- [ ] `JWT_SECRET` tem 32+ caracteres aleatórios
- [ ] Senhas admin/demo mudadas dos defaults
- [ ] `SUPABASE_SERVICE_ROLE_KEY` não está commitada no Git
- [ ] Row Level Security (RLS) habilitado no Supabase
- [ ] HTTPS configurado (Vercel faz automaticamente)
- [ ] CORS configurado corretamente (`CLIENT_ORIGIN`)
- [ ] Rate limiting ativo (já configurado no código)
- [ ] Helmet headers de segurança (já configurado)
- [ ] `.env` no `.gitignore` (já configurado)

### Rotacionar Credenciais

Se precisar rotacionar credenciais:

**Supabase:**
1. Settings > API > Regenerate keys
2. Atualize env variables no Vercel
3. Redeploy

**JWT_SECRET:**
1. Gere nova string aleatória
2. Atualize no Vercel
3. Redeploy
4. ⚠️ Usuários precisarão fazer login novamente

---

## 🐛 Troubleshooting

### Deploy falha com "Cannot find module"

```bash
# Limpe cache e reinstale
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### "JWT_SECRET is required"

Configure `JWT_SECRET` nas environment variables do Vercel e redeploy.

### Erro de conexão com banco

Verifique:
1. `DATABASE_URL` está correto
2. Senha do banco está correta
3. IP do Vercel está permitido (Supabase permite todos por padrão)
4. Connection pooling está habilitado (`?pgbouncer=true`)

### Migrations não aplicadas

```bash
# Aplique manualmente
export DATABASE_URL="<sua-connection-string>"
npx supabase db push
npx prisma generate
```

### IA não funciona (503)

Verifique:
1. `AI_PROVIDER` está configurado (`openrouter`, `anthropic` ou `nvidia`)
2. Chave API correspondente está configurada
3. Chave API é válida e tem créditos

---

## 📚 Próximos Passos

Após setup completo:

1. ✅ Leia [CONTRIBUTING.md](./CONTRIBUTING.md) — Padrões de código
2. ✅ Veja [API_GUIDE.md](./API_GUIDE.md) — Documentação da API
3. ✅ Confira [ARCHITECTURE.md](./ARCHITECTURE.md) — Arquitetura do sistema
4. ✅ Leia [SECURITY.md](./SECURITY.md) — Práticas de segurança

---

## 📞 Suporte

**Documentação:**
- [README.md](./README.md) — Visão geral
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deploy detalhado
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Problemas comuns

**Problemas?**
- Abra issue no GitHub
- Veja logs no Vercel Dashboard
- Verifique logs no Supabase Dashboard

---

**Pronto!** 🎉

Seu Cena Studio está rodando em nova infraestrutura, completamente independente da conta original.

