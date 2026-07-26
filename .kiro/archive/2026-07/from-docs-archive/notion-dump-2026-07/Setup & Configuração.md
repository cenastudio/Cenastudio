# Setup & Configuração

> Como rodar o Cena Studio localmente e configurar todas as variáveis de ambiente

**Última atualização:** 2026-07-01 16:03:51 -03:00

---

## Pré-requisitos

| Requisito | Versão |
|-----------|--------|
| Node.js | 18+ |
| npm | 11+ |
| Git | 2.x |

---

## Setup Rápido

```bash
cd frameai-director-correto
npm install
cp .env.example .env
# Edite o .env com suas chaves
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:5001 (proxied via Vite como `/api`)

---

## Contas Padrão (primeiro boot)

| Email | Senha | Role |
|-------|-------|------|
| `admin@cenastudio.com.br` | `admin123` (ou `ADMIN_DEFAULT_PASSWORD`) | admin |
| `demo@cenastudio.com.br` | `demo123` (ou `DEMO_USER_PASSWORD`) | user |

> [!warning] Segurança
> Altere estas senhas **imediatamente** em produção.

---

## Variáveis de Ambiente

### 🔴 Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `JWT_SECRET` | Segredo para assinar JWT tokens (mín 32 chars) | `random_32_char_string_here` |
| `DATABASE_PATH` | Caminho do SQLite local | `./data/frame.db` |

### 🟢 Server

| Variável | Descrição | Default |
|----------|-----------|---------|
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta do servidor Express | `5000` |
| `CLIENT_ORIGIN` | URL do frontend (para CORS) | `http://localhost:5173` |

### 🔐 Autenticação

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `JWT_SECRET` | Segredo JWT (32+ chars) | ✅ Sim |
| `ADMIN_EMAILS` | Emails dos admins (comma-separated) | Não |
| `ADMIN_DEFAULT_PASSWORD` | Senha padrão do admin | Não (default: `admin123`) |
| `DEMO_USER_PASSWORD` | Senha do usuário demo | Não (default: `demo123`) |

### 🗄️ Banco de Dados

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DATABASE_PATH` | Caminho do SQLite local | Dev only |
| `DATABASE_URL` | Connection string PostgreSQL (Supabase) | Prod ✅ |
| `SUPABASE_DB_PASSWORD` | Senha do banco Supabase | Prod ✅ |
| `ALLOW_EPHEMERAL_SQLITE` | Permite SQLite efêmero no Vercel | `false` |

### ☁️ Supabase

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | Prod ✅ |
| `SUPABASE_ANON_KEY` | Chave anônima (público) | Prod ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (privada, backend only) | Prod ✅ |
| `VITE_SUPABASE_URL` | URL do Supabase para o frontend | Prod ✅ |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima para o frontend | Prod ✅ |

> [!important] Prefixo `VITE_`
> Variáveis com `VITE_` são expostas no bundle do frontend. **Nunca** coloque secrets com este prefixo.

### 🤖 IA — Provider

| Variável | Descrição | Default |
|----------|-----------|---------|
| `AI_PROVIDER` | Provider ativo (`openrouter`, `anthropic` ou `nvidia`) | `openrouter` |

### 🤖 IA — OpenRouter (Gratuito)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `OPENROUTER_API_KEY` | Chave da API OpenRouter | — |
| `OPENROUTER_MODEL` | Modelo (default: `openrouter/free`) | `openrouter/free` |
| `OPENROUTER_MAX_TOKENS` | Máximo de tokens na resposta | `4096` |
| `OPENROUTER_TEMPERATURE` | Temperatura de geração (0-2) | `0.7` |
| `OPENROUTER_TOP_P` | Top P sampling | `0.95` |
| `OPENROUTER_TIMEOUT_MS` | Timeout da request em ms | `90000` |

> **OpenRouter Free:** 25+ modelos gratuitos, 50 requisições/dia no plano free. Use `openrouter/free` para router automático.

### 🤖 IA — Anthropic (Pago - Fallback)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `ANTHROPIC_API_KEY` | Chave da API Anthropic | — |
| `ANTHROPIC_MODEL` | Modelo Anthropic | `claude-sonnet-4-20250514` |

### 🤖 IA — NVIDIA (Pago - Fallback)

| Variável | Descrição | Default |
|----------|-----------|---------|
| `NVIDIA_API_KEY` | Chave da API NVIDIA | — |
| `NVIDIA_MODEL` | Modelo NVIDIA | `nvidia/nemotron-3-ultra-550b-a55b` |
| `NVIDIA_INVOKE_URL` | URL da API | `https://integrate.api.nvidia.com/v1/chat/completions` |
| `NVIDIA_MAX_TOKENS` | Máximo de tokens na resposta | `4096` |
| `NVIDIA_TEMPERATURE` | Temperatura de geração (0-2) | `0.7` |
| `NVIDIA_TOP_P` | Top P sampling | `0.95` |
| `NVIDIA_ENABLE_THINKING` | Modo thinking/reasoning | `false` |
| `NVIDIA_REASONING_BUDGET` | Budget de reasoning tokens | `0` |
| `NVIDIA_TIMEOUT_MS` | Timeout da request em ms | `90000` |

### 💳 Stripe (Legado/API)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Chave secreta Stripe | Não (legado) |
| `STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe | Não (legado) |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook | Não |
| `STRIPE_PRICE_PRO` | Price ID do plano Pro | Não |
| `STRIPE_PRICE_STUDIO` | Price ID do plano Studio | Não |

### 🐙 GitHub OAuth

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `GITHUB_CLIENT_ID` | Client ID do GitHub App | Para login GitHub |
| `GITHUB_CLIENT_SECRET` | Client Secret do GitHub App | Para login GitHub |
| `GITHUB_CALLBACK_URL` | URL de callback OAuth | `http://localhost:5000/api/auth/github/callback` |

### 📧 Email (SMTP)

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SMTP_HOST` | Host do servidor SMTP | Não |
| `SMTP_PORT` | Porta SMTP | Não |
| `SMTP_USER` | Usuário SMTP | Não |
| `SMTP_PASS` | Senha SMTP | Não |
| `SMTP_FROM` | Email remetente | Não |

---

## Comportamento do Servidor

- O servidor **falha ao iniciar** se `JWT_SECRET` estiver faltando
- Rotas IA retornam **503** se o provider configurado não tiver chave
- Em `NODE_ENV=production` no Vercel, SQLite efêmero é **bloqueado** (a menos que `ALLOW_EPHEMERAL_SQLITE=true`)
- Login GitHub requer `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor API + Vite dev (hot reload) |
| `npm run build` | Build client + bundle server |
| `npm start` | Servidor produção |
| `npm run preview` | Preview do build de produção |
| `npm run check` | TypeScript check (`tsc --noEmit`) |
| `npm run test` | Test suite (Vitest) |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run ci` | TypeScript + coverage + build (como GitHub Actions) |
| `npm run e2e` | Testes E2E com Playwright |
| `npm run verify` | TypeScript + testes + build |
| `npm run launch:check` | Valida env essencial e RLS do Supabase |
| `npm run smoke:prisma` | Smoke test contra URL pública |
| `npm run format` | Prettier format |

---

#setup #configuracao #env #variaveis
