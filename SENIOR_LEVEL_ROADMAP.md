# Roadmap para Nível Senior - Cena Studio

**Status Atual:** Mid-Senior (7.4/10)  
**Objetivo:** Senior (9/10)  
**Data:** 30 de Junho de 2026

---

## 📊 Avaliação Atual

| Critério | Nota Atual | Meta | Gap |
|----------|-------------|------|-----|
| Arquitetura | 8/10 | 9/10 | +1 |
| TypeScript | 9/10 | 9/10 | ✓ |
| React/Frontend | 8/10 | 9/10 | +1 |
| Backend/Express | 7/10 | 9/10 | +2 |
| Segurança | 8/10 | 9/10 | +1 |
| Testes | 6/10 | 9/10 | +3 |
| Escalabilidade | 6/10 | 9/10 | +3 |
| Código Limpo | 7/10 | 9/10 | +2 |
| **Média** | **7.4/10** | **9/10** | **+1.6** |

---

## 🔥 Alta Prioridade (Sprint 1-2)

### 1. Migrar Banco de Dados para Supabase Postgres com Prisma

**Status:** ✅ Completed em 30/06/2026  
**Prioridade:** Alta  
**Esforço:** 4-6 dias  
**Impacto:** Crítico

**Por que:**
- SQLite não escala em produção
- Supabase já tem migrations preparadas
- Melhor performance em concorrência
- Backup automático incluído

**Passos:**
```bash
# 1. Aplicar migrations no Supabase
cd supabase
supabase db push

# 2. Instalar Prisma no backend
npm install prisma @prisma/client

# 3. Criar schema Prisma a partir do Postgres
npx prisma init
npx prisma db pull
npx prisma generate

# 4. Substituir queries better-sqlite3 por Prisma
# Exemplo:
# Antes: db.prepare('SELECT * FROM users').all()
# Depois: prisma.user.findMany()

# 5. Remover better-sqlite3 após paridade e testes
npm uninstall better-sqlite3 @types/better-sqlite3
```

**Variáveis de Ambiente:**
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key
DATABASE_URL=postgresql://...
```

**Testes:**
- [x] Migrations aplicadas com sucesso
- [x] Domínios operacionais principais funcionando com Supabase/Postgres
- [x] Smoke de produção com `npm run smoke:prisma`
- [ ] Backup/rotação operacional revisados fora do código

---

### 2. Implementar Logging Estruturado

**Status:** ✅ Baseline completed  
**Prioridade:** Alta  
**Esforço:** 1-2 dias  
**Impacto:** Alto

**Por que:**
- Debug em produção é impossível sem logs
- Logs estruturados permitem análise fácil
- Facilita troubleshooting

**Passos:**
```bash
npm install pino pino-pretty
```

```typescript
// server/utils/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
})

// Uso nos controllers
logger.info({ userId, action: 'login' }, 'User logged in')
logger.error({ error: err.stack, userId }, 'Failed to process payment')
logger.warn({ rateLimit: { remaining, reset } }, 'Rate limit approaching')
```

```typescript
// server/middleware/logger.ts
import { logger } from '../utils/logger.js'
import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    }, 'HTTP request')
  })
  
  next()
}

// Adicionar em server/app.ts
app.use(requestLogger)
```

**Variáveis de Ambiente:**
```bash
LOG_LEVEL=info  # debug, info, warn, error
```

**Testes:**
- [x] Logs aparecem no console em dev
- [x] Logs estruturados em JSON em prod
- [x] Request logger ativo
- [x] Health/readiness expostos
- [ ] Sentry ou provedor externo de observabilidade configurado

---

### 3. Aumentar Cobertura de Testes (80%+)

**Status:** 🟡 In progress  
**Prioridade:** Alta  
**Esforço:** 1-2 semanas  
**Impacto:** Alto

**Por que:**
- Código sem testes é legado
- Refatoração sem testes é perigosa
- Confiança no deploy

**Passos:**
```bash
npm run test:coverage
npm run ci
```

Baseline atual:
- `server/controllers/coreFlow.test.ts` cobre registro, cookie `frame_token`, autenticação, cliente e projeto.
- `server/routes/health.test.ts` cobre liveness/readiness.
- `server/services/authService.test.ts` cobre cadastro, login, plano trial, duplicidade e reset de senha.
- `server/controllers/adminController.test.ts` cobre wiring de usuários/admin.
- `server/controllers/domainFlow.test.ts` cobre CRM, oportunidades, interações, arquivos locais e financeiro.
- `server/controllers/aiProjectsReviews.test.ts` cobre geração IA com limite mensal de plano, autosave de estado de projeto, bloqueio de acesso entre usuários e fluxo público de review de vídeo.
- `server/controllers/collaborationSettings.test.ts` cobre colaboradores, vínculos de equipe, autorização por dono, notificações e configurações isoladas por usuário.
- `client/src/test/operationsUx.test.tsx` cobre busca e recuperação da equipe, alterações pendentes da empresa, timestamps completos nas notificações, próximo movimento do ProjectHub, recuperação de clientes e resumo operacional do pipeline.
- `client/src/test/studioContext.test.ts` cobre prefill seguro do Studio, preservação de campos manuais e contexto de documentos.
- `server/controllers/aiProjectsReviews.test.ts` cobre histórico de gerações filtrado por projeto ativo.
- `server/services/supabaseStorage.test.ts` cobre bucket privado, upload, remoção, URL assinada e sanitização de path.
- GitHub Actions executa typecheck, coverage e build.
- Baseline em 30/06/2026: 58 testes passando; cobertura global segue em evolução rumo a 80%+.
- Validação visual responsiva executada em desktop e mobile (390 x 844), sem overflow horizontal; já passaram por navegador local landing, login, loading, Tools, Studio, Documents, clientes, pipeline e ProjectHub coberto por teste automatizado.

Frente UX senior executada:
- Landing, login, carregamento, listagem de ferramentas, Studio e Documents foram revisados por hierarquia visual, velocidade percebida, clareza de ação e continuidade entre módulos.
- Briefing, proposta, orçamento, contrato e entrega passaram a ter guia de sessão crítica com progresso, lacunas e saída esperada.
- Tools passou a destacar sessões críticas e resultado esperado antes de abrir o Studio.
- Output do Studio e Documents reforçam a continuidade geração -> documento -> exportação do projeto.

Próxima frente UX senior:
- Aprofundar documento editável/versionado para as sessões críticas, com exportação final e histórico aprovado por projeto.
- Avaliar se Briefing, Proposta, Orçamento, Contratos e Entrega devem ganhar telas dedicadas completas quando o fluxo exigir mais do que um formulário lateral.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    }
  }
})
```

**Meta de Cobertura:**
- Controllers: 85%+
- Services: 90%+
- Utils: 95%+
- Total: 80%+

**Testes:**
- [ ] Coverage report mostra 80%+
- [ ] Todos os testes passam
- [ ] CI roda testes automaticamente

---

### 4. Adicionar Monitoramento (Sentry)

**Status:** ⏳ Pending  
**Prioridade:** Alta  
**Esforço:** 1 dia  
**Impacto:** Alto

**Por que:**
- Error tracking automático
- Alertas em tempo real
- Contexto completo de erros

**Passos:**
```bash
npm install @sentry/node
```

```typescript
// server/utils/sentry.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

export { Sentry }

// Adicionar em server/app.ts
import * as Sentry from '@sentry/node'

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

**Variáveis de Ambiente:**
```bash
SENTRY_DSN=https://seu-dsn@sentry.io/project
```

---

## 🚀 Média Prioridade (Sprint 3-4)

### 5. Consolidar ORM (Prisma)

**Status:** ⏳ Pending  
**Prioridade:** Alta  
**Esforço:** 3-4 dias  
**Impacto:** Alto

**Por que:**
- Esta é a continuação natural da migração Postgres, não uma segunda migração separada.
- Queries type-safe
- Migrations automáticas
- Melhor performance
- Developer experience

**Passos:**
```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int         @id @default(autoincrement())
  email         String      @unique
  passwordHash  String
  role          String      @default("user")
  name          String?
  avatarUrl     String?
  emailVerified Boolean     @default(false)
  githubId      String?     @unique
  supabaseId    String?     @unique
  studioName    String?
  studioRole    String?
  phone         String?
  createdAt     DateTime    @default(now())
  
  projects      Project[]
  clients       Client[]
  collaborators Collaborator[]
  subscription  Subscription?
  notifications  Notification[]
  generations   Generation[]
  
  @@map("users")
}

// ... outros modelos
```

```bash
# Pull schema do Supabase
npx prisma db pull

# Gerar client
npx prisma generate

# Criar migration
npx prisma migrate dev --name init
```

```typescript
// server/services/database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
})

export { prisma }

// Uso
const user = await prisma.user.findUnique({
  where: { email: 'test@test.com' },
  include: { projects: true }
})
```

**Testes:**
- [ ] Schema sincronizado com Supabase
- [ ] Queries funcionam corretamente
- [ ] Performance mantida
- [ ] Migrations funcionam

---

### 6. Refatorar Controllers Densos

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 2-3 dias  
**Impacto:** Médio

**Por que:**
- `analyticsController.ts` concentra analytics e financeiro em ~545 linhas
- Difícil de manter e testar
- Viola princípio SRP

**Passos:**

**Antes:**
```typescript
// server/controllers/analyticsController.ts (antes: controller denso)
export async function getOverallAnalytics(req, res) {
  // 500 linhas de lógica...
  const projects = db.prepare('SELECT COUNT(*) FROM projects WHERE user_id = ?').get(req.userId)
  const clients = db.prepare('SELECT COUNT(*) FROM clients WHERE user_id = ?').get(req.userId)
  // ... mais 400 linhas
}
```

**Depois:**
```typescript
// server/controllers/analyticsController.ts
import { getOverallMetrics, getProjectMetrics, getRevenueMetrics } from '../services/analytics/index.js'

export async function getOverallAnalytics(req, res) {
  try {
    const metrics = await getOverallMetrics(req.userId)
    res.json({ success: true, data: metrics })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

```typescript
// server/services/analytics/metrics.ts
import { prisma } from '../database.js'

export async function getOverallMetrics(userId: number) {
  const [projects, clients, revenue, activity] = await Promise.all([
    getProjectCount(userId),
    getClientCount(userId),
    getRevenue(userId),
    getActivity(userId)
  ])
  
  return { projects, clients, revenue, activity }
}

async function getProjectCount(userId: number) {
  return prisma.project.count({ where: { userId } })
}

async function getClientCount(userId: number) {
  return prisma.client.count({ where: { userId } })
}
```

**Testes:**
- [ ] Controllers têm < 200 linhas
- [ ] Lógica extraída para services
- [ ] Testes unitários funcionam
- [ ] Funcionalidade mantida

---

### 7. Implementar Cache (Redis)

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 2-3 dias  
**Impacto:** Médio

**Por que:**
- Reduz load no banco
- Melhora performance em 50%+
- Essencial para escala

**Passos:**
```bash
npm install ioredis
```

```typescript
// server/services/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function cachedGet<T>(
  key: string, 
  fn: () => Promise<T>, 
  ttl = 300
): Promise<T> {
  try {
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    // Cache failure: fallback to direct call
  }
  
  const data = await fn()
  
  try {
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    // Cache failure: log but don't fail
  }
  
  return data
}

export async function invalidatePattern(pattern: string) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Uso
const tools = await cachedGet('tools:all', () => getTools(), 3600)
```

```typescript
// server/controllers/toolsController.ts
import { cachedGet, invalidatePattern } from '../services/cache.js'

export async function getTools(req, res) {
  const tools = await cachedGet('tools:all', async () => {
    return prisma.tool.findMany({ where: { isActive: true } })
  }, 3600)
  
  res.json({ success: true, data: tools })
}

export async function updateTool(req, res) {
  const tool = await prisma.tool.update({
    where: { id: req.params.id },
    data: req.body
  })
  
  await invalidatePattern('tools:*')
  
  res.json({ success: true, data: tool })
}
```

**Variáveis de Ambiente:**
```bash
REDIS_URL=redis://localhost:6379
# ou
REDIS_URL=rediss://user:pass@host:port
```

**Testes:**
- [ ] Cache funciona corretamente
- [ ] Invalidação funciona
- [ ] Performance melhorada
- [ ] Fallback graceful

---

### 8. Implementar CI/CD (GitHub Actions)

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 1-2 dias  
**Impacto:** Alto

**Por que:**
- Deploy manual é propenso a erros
- Testes automáticos
- Rollback fácil

**Passos:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run check
      
      - name: Unit tests
        run: npm run test
      
      - name: Coverage
        run: npm run test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload build
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
```

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [test, e2e, build]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

**Testes:**
- [ ] CI roda em cada push
- [ ] Deploy automático no main
- [ ] Rollback funciona
- [ ] Notificações de falha

---

### 9. Rate Limiting Distribuído

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 1-2 dias  
**Impacto:** Médio

**Por que:**
- Rate limiting em memória não funciona em multi-instance
- Proteção contra DDoS
- Fair use de recursos

**Passos:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// server/middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true
})

export async function rateLimitMiddleware(req, res, next) {
  const identifier = req.ip || req.headers['x-forwarded-for']
  
  const { success, remaining, reset } = await ratelimit.limit(identifier)
  
  if (!success) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: reset
    })
  }
  
  res.setHeader('X-RateLimit-Limit', '10')
  res.setHeader('X-RateLimit-Remaining', remaining.toString())
  
  next()
}
```

**Variáveis de Ambiente:**
```bash
UPSTASH_REDIS_REST_URL=https://seu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token
```

**Testes:**
- [ ] Rate limiting funciona
- [ ] Headers corretos
- [ ] Distribuído entre instâncias

---

### 10. Retry Pattern para APIs Externas

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 1 dia  
**Impacto:** Médio

**Por que:**
- APIs externas falham
- Melhor resiliência
- Experiência do usuário

**Passos:**
```bash
npm install async-retry
```

```typescript
// server/utils/retry.ts
import retry from 'async-retry'
import { logger } from './logger.js'

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number
    minTimeout?: number
    onRetry?: (error: Error, attempt: number) => void
  }
): Promise<T> {
  return retry(fn, {
    retries: options?.retries || 3,
    minTimeout: options?.minTimeout || 1000,
    factor: 2,
    onRetry: (error, attempt) => {
      logger.warn({ 
        error: error.message, 
        attempt 
      }, 'Retrying operation')
      options?.onRetry?.(error, attempt)
    }
  })
}

// Uso
const response = await withRetry(
  () => anthropic.messages.create({ prompt }),
  {
    retries: 3,
    minTimeout: 1000,
    onRetry: (error) => {
      logger.error({ error }, 'Anthropic API failed, retrying')
    }
  }
)
```

**Testes:**
- [ ] Retry funciona em falhas
- [ ] Não retry em erros permanentes
- [ ] Logs corretos

---

### 11. Health Checks

**Status:** ⏳ Pending  
**Prioridade:** Média  
**Esforço:** 1 dia  
**Impacto:** Médio

**Por que:**
- Kubernetes precisa saber se app está saudável
- Load balancers direcionam tráfego
- Monitoramento

**Passos:**
```typescript
// server/routes/health.ts
import { Router } from 'express'
import { prisma } from '../services/database.js'
import { redis } from '../services/cache.js'

const router = Router()

router.get('/health', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory()
    }
  }
  
  const healthy = Object.values(checks.checks).every(c => c.status === 'ok')
  res.status(healthy ? 200 : 503).json(checks)
})

router.get('/ready', async (req, res) => {
  // Similar mas com checks mais estritos
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis()
  }
  
  const ready = Object.values(checks).every(c => c.status === 'ok')
  res.status(ready ? 200 : 503).json({ ready })
})

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

async function checkRedis() {
  try {
    await redis.ping()
    return { status: 'ok' }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

function checkMemory() {
  const usage = process.memoryUsage()
  const heapUsed = usage.heapUsed / 1024 / 1024
  const heapTotal = usage.heapTotal / 1024 / 1024
  
  if (heapUsed / heapTotal > 0.9) {
    return { status: 'warning', usage: `${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB` }
  }
  
  return { status: 'ok', usage: `${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB` }
}

export default router
```

**Testes:**
- [ ] Health check retorna 200 quando saudável
- [ ] Health check retorna 503 quando não saudável
- [ ] Readiness check funciona
- [ ] Memory check funciona

---

## 📊 Baixa Prioridade (Sprint 5+)

### 12. Documentação de API (OpenAPI/Swagger)

**Status:** ⏳ Pending  
**Prioridade:** Baixa  
**Esforço:** 2-3 dias  
**Impacto:** Baixo

**Passos:**
```bash
npm install swagger-jsdoc swagger-ui-express
```

```typescript
// server/utils/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cena Studio API',
      version: '1.0.0',
      description: 'API para sistema operacional audiovisual'
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.cenastudio.com.br',
        description: 'Production server'
      }
    ]
  },
  apis: ['./server/routes/*.ts', './server/controllers/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)
```

```typescript
// server/app.ts
import swaggerUi from 'swagger-ui-express'
import { swaggerSpec } from './utils/swagger.js'

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

---

### 13. Feature Flags

**Status:** ⏳ Pending  
**Prioridade:** Baixa  
**Esforço:** 1-2 dias  
**Impacto:** Baixo

**Passos:**
```bash
npm install @growthbook/growthbook
```

```typescript
// server/utils/featureFlags.ts
import { GrowthBook } from '@growthbook/growthbook'

const gb = new GrowthBook({
  apiHost: process.env.FEATURE_FLAGS_API,
  clientKey: process.env.FEATURE_FLAGS_KEY,
  enableDevMode: process.env.NODE_ENV === 'development'
})

export async function isFeatureEnabled(feature: string, userId?: string): Promise<boolean> {
  await gb.loadFeatures()
  return gb.isOn(feature, { attributes: { userId } })
}

// Uso
if (await isFeatureEnabled('new-ai-model', userId)) {
  // Use novo modelo
}
```

---

## 🎯 Roadmap de Execução

### Sprint 1 (1-2 semanas)
- [ ] Migrar para Supabase Postgres
- [ ] Implementar logging estruturado (Pino)
- [ ] Adicionar monitoramento (Sentry)
- [ ] Adicionar health checks

### Sprint 2 (2-3 semanas)
- [ ] Implementar Prisma ORM
- [ ] Refatorar controllers grandes
- [ ] Aumentar testes unitários (meta: 60%)
- [ ] Implementar retry pattern

### Sprint 3 (2-3 semanas)
- [ ] Implementar Redis cache
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Aumentar testes unitários (meta: 80%)
- [ ] Rate limiting distribuído

### Sprint 4 (1-2 semanas)
- [ ] Documentação OpenAPI
- [ ] Feature flags
- [ ] Performance tuning
- [ ] Security audit

---

## � Estado Atual das Variáveis de Ambiente

**Data do Backup:** 28 de Junho de 2026  
**Fonte:** env_backup.txt

### Variáveis Configuradas Atualmente

**Servidor:**
- `NODE_ENV=development`
- `PORT=5000`
- `CLIENT_ORIGIN=http://localhost:5173`

**Autenticação:**
- `JWT_SECRET` configurado (precisa ser substituído em produção)
- `ADMIN_DEFAULT_PASSWORD=admin123` (precisa ser alterado)
- `DEMO_USER_PASSWORD=demo123` (precisa ser alterado)
- `ADMIN_EMAILS=elytraprod@gmail.com`

**Banco de Dados:**
- `DATABASE_PATH=./data/frame.db` (SQLite local)

**IA - Provider Atual:**
- `AI_PROVIDER=nvidia` (usando NVIDIA em vez de Anthropic)
- `NVIDIA_API_KEY` configurado
- `NVIDIA_MODEL=minimaxai/minimax-m3` (modelo multimodal)
- `NVIDIA_MAX_TOKENS=4096`
- `NVIDIA_TEMPERATURE=1`
- `NVIDIA_ENABLE_THINKING=false`
- `NVIDIA_TIMEOUT_MS=90000`

**Supabase:**
- `SUPABASE_URL` configurado
- `SUPABASE_ANON_KEY` configurado
- `SUPABASE_SERVICE_ROLE_KEY` configurado
- `VITE_SUPABASE_URL` configurado
- `VITE_SUPABASE_ANON_KEY` configurado

**Stripe:**
- `STRIPE_SECRET_KEY` configurado (modo teste)
- `STRIPE_PUBLISHABLE_KEY` configurado (modo teste)
- `STRIPE_WEBHOOK_SECRET` vazio
- `STRIPE_PRICE_PRO` configurado
- `STRIPE_PRICE_STUDIO` configurado

**GitHub OAuth:**
- `GITHUB_CLIENT_ID` vazio
- `GITHUB_CLIENT_SECRET` vazio
- `GITHUB_CALLBACK_URL` configurado

**SMTP:**
- Todos os campos vazios (email não configurado)

### ⚠️ Ações Imediatas Necessárias

1. **Segurança Crítica:**
   - [ ] Substituir `JWT_SECRET` com valor forte em produção
   - [ ] Alterar `ADMIN_DEFAULT_PASSWORD` e `DEMO_USER_PASSWORD`
   - [ ] Remover chaves sensíveis do backup

2. **Supabase:**
   - [ ] Aplicar migrations no Supabase
   - [ ] Migrar de SQLite para Supabase
   - [ ] Testar conexão com service role key

3. **IA:**
   - [ ] Decidir entre NVIDIA e Anthropic como provider principal
   - [ ] Configurar API key do provider escolhido
   - [ ] Testar geração com ambos providers

4. **Stripe:**
   - [ ] Configurar webhook secret
   - [ ] Migrar para chaves de produção quando necessário
   - [ ] Testar fluxo de pagamento completo

5. **GitHub OAuth:**
   - [ ] Configurar GitHub OAuth app
   - [ ] Adicionar client ID e secret
   - [ ] Testar fluxo de login

### Variáveis Adicionais para Nível Senior

Adicionar ao `.env`:

```bash
# Logging
LOG_LEVEL=info

# Redis (Cache)
REDIS_URL=redis://localhost:6379
# ou
UPSTASH_REDIS_REST_URL=https://seu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token

# Sentry (Monitoramento)
SENTRY_DSN=https://seu-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production

# Feature Flags
FEATURE_FLAGS_API=https://api.growthbook.io
FEATURE_FLAGS_KEY=seu-key

# Rate Limiting
RATE_LIMIT_REDIS_URL=redis://localhost:6379

# Database (Prisma)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## �📈 Métricas de Sucesso

### Qualidade de Código
- [ ] Coverage de testes: 80%+
- [ ] Controllers < 200 linhas
- [ ] Zero console.log em produção
- [ ] Lint sem erros

### Performance
- [ ] P95 latency < 500ms
- [ ] Cache hit rate > 70%
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%

### Escalabilidade
- [ ] Suporta 10x tráfego atual
- [ ] Horizontal scaling funcional
- [ ] Database connection pooling
- [ ] Auto-scaling configurado

### Observabilidade
- [ ] Todos os erros no Sentry
- [ ] Logs estruturados em tudo
- [ ] Metrics no Datadog/New Relic
- [ ] Alerts configurados

---

## 🎓 Recursos de Aprendizado

### Livros
- "Clean Architecture" - Robert C. Martin
- "Building Microservices" - Sam Newman
- "Site Reliability Engineering" - Google SRE Team

### Artigos
- [The Twelve-Factor App](https://12factor.net/)
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

### Cursos
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [Designing Data-Intensive Applications](https://dataintensive.net/)

---

## 📝 Checklist Final

Antes de considerar "Nível Senior":

**Infraestrutura:**
- [ ] Banco de dados escalável (Supabase/Postgres)
- [ ] Cache implementado (Redis)
- [ ] CI/CD automatizado
- [ ] Monitoramento configurado
- [ ] Logging estruturado
- [ ] Health checks

**Código:**
- [ ] ORM implementado (Prisma)
- [ ] Test coverage 80%+
- [ ] Controllers refatorados
- [ ] Retry patterns
- [ ] Rate limiting distribuído
- [ ] Error handling robusto

**Segurança:**
- [ ] Security audit realizado
- [ ] Dependências atualizadas
- [ ] Secrets management
- [ ] Rate limiting
- [ ] Input validation

**Documentação:**
- [ ] API documentada (OpenAPI)
- [ ] README atualizado
- [ ] Architecture decision records (ADRs)
- [ ] Onboarding guide

---

**Última atualização:** 30 de Junho de 2026  
**Status:** Em progresso  
**Próxima revisão:** Após Sprint 1
