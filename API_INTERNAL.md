# Internal API Documentation - Cena Studio

Documentação interna da API para desenvolvedores do projeto Cena Studio.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura da API](#arquitetura-da-api)
- [Serviços Internos](#serviços-internos)
- [Patterns de Uso](#patterns-de-uso)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Testing](#testing)

---

## 🌐 Visão Geral

### Arquitetura
- **Framework:** Express + TypeScript
- **Padrão:** MVC com Services
- **Autenticação:** JWT httpOnly cookies
- **Validação:** Zod schemas
- **Banco:** SQLite (dev) / Supabase (prod)

### Estrutura de Diretórios

```
server/
├── controllers/     # Request handlers
├── services/        # Business logic
├── routes/          # Route definitions
├── middleware/      # Express middleware
├── models/          # Database models
├── utils/           # Utilitários
└── types/           # TypeScript types
```

---

## 🏗️ Arquitetura da API

### Camada de Controllers

Controllers são responsáveis apenas por:
- Receber requisições HTTP
- Validar input
- Chamar services
- Retornar respostas HTTP

**Exemplo:**

```typescript
// server/controllers/authController.ts
import { Request, Response } from 'express'
import { authService } from '../services/authService.js'

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body
    
    // Validar input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email e senha são obrigatórios' 
      })
    }
    
    // Chamar service
    const user = authService.loginUser(email, password)
    
    // Retornar resposta
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    })
    
    res.json({ 
      success: true, 
      data: { user } 
    })
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: error.message 
    })
  }
}
```

### Camada de Services

Services contêm lógica de negócio:
- Validação de regras
- Interação com banco de dados
- Chamadas a APIs externas
- Transformação de dados

**Exemplo:**

```typescript
// server/services/authService.ts
import { db } from '../models/db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const authService = {
  async login(email: string, password: string) {
    // Buscar usuário
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (!user) {
      throw new Error('Credenciais inválidas')
    }
    
    // Verificar senha
    const isValid = await bcrypt.compare(password, user.password_hash)
    
    if (!isValid) {
      throw new Error('Credenciais inválidas')
    }
    
    // Gerar token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    return { user, token }
  }
}
```

### Camada de Routes

Routes definem endpoints e conectam controllers.

**Exemplo:**

```typescript
// server/routes/auth.ts
import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.post('/login', authController.login)
router.post('/register', authController.register)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.getCurrentUser)

export default router
```

---

## 🔧 Serviços Internos

### AuthService

**Localização:** `server/services/authService.ts`

**Funções atuais principais:**
- `loginUser(email, password)` - Autentica usuário local
- `registerUser(name, email, password)` - Registra novo usuário com trial Pro
- `getUserById(id)` - Carrega usuário autenticado
- `upsertOAuthUser(email, name, access)` - Sincroniza usuário OAuth/Supabase
- `createResetToken(email)` e `resetPassword(token, password)` - Fluxo de redefinição de senha

**Uso:**

```typescript
import { loginUser } from '../services/authService.js'

const user = loginUser('test@test.com', 'password123')
```

### AIService

**Localização:** `server/services/aiService.ts`

**Funções atuais principais:**
- `generateForTool(userId, toolId, input, projectId)` - Gera conteúdo com IA e salva em `generations`
- Provider NVIDIA e Anthropic ficam encapsulados internamente no service

**Uso:**

```typescript
import { generateForTool } from '../services/aiService.js'

const result = await generateForTool(
  userId,
  '01', // toolId
  { prompt: 'Ideia de roteiro' },
  projectId
)
```

### StripeService

**Localização:** `server/services/stripeService.ts`

**Funções:**
- `createCheckoutSession(priceId, userId)` - Cria sessão de checkout
- `handleWebhook(event)` - Processa webhook do Stripe
- `cancelSubscription(subscriptionId)` - Cancela assinatura

**Uso:**

```typescript
import { stripeService } from '../services/stripeService.js'

const session = await stripeService.createCheckoutSession(
  'price_1Tmn0BPoBcrO00cuNe2Ev3h3',
  userId
)
```

### EmailService

**Localização:** planejado, ainda não implementado

**Funções:**
- `sendResetPassword(email, token)` - Envia email de reset
- `sendWelcome(email)` - Envia email de boas-vindas
- `sendNotification(email, message)` - Envia notificação

**Uso:**

```typescript
import { emailService } from '../services/emailService.js'

await emailService.sendResetPassword('test@test.com', 'token123')
```

---

## 🎨 Patterns de Uso

### Pattern 1: Controller + Service

**Quando usar:** Para operações CRUD e lógica de negócio

```typescript
// Controller
export async function createProject(req: Request, res: Response) {
  const data = await projectService.create(req.body, req.userId)
  res.json({ success: true, data })
}

// Service
export async function create(data: CreateProjectDto, userId: number) {
  const project = db.prepare(`
    INSERT INTO projects (user_id, name, description)
    VALUES (?, ?, ?)
  `).run(userId, data.name, data.description)
  
  return { id: project.lastInsertRowid, ...data }
}
```

### Pattern 2: Middleware de Autenticação

**Quando usar:** Para proteger rotas

```typescript
// server/middleware/authenticate.ts
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Não autenticado' })
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Token inválido' })
  }
}

// Uso
router.get('/protected', authenticate, controller)
```

### Pattern 3: Validação com Zod

**Quando usar:** Para validar input

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
})

// No controller
const data = createUserSchema.parse(req.body)
```

### Pattern 4: Error Handler Global

**Quando usar:** Para tratamento centralizado de erros

```typescript
// server/middleware/errorHandler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error({ error: err.stack }, 'Error occurred')
  
  if (err instanceof ValidationError) {
    return res.status(400).json({ success: false, error: err.message })
  }
  
  if (err instanceof AuthError) {
    return res.status(401).json({ success: false, error: err.message })
  }
  
  res.status(500).json({ success: false, error: 'Erro interno do servidor' })
}

// Uso em app.ts
app.use(errorHandler)
```

### Pattern 5: Async/Await com Try/Catch

**Quando usar:** Para operações assíncronas

```typescript
export async function someController(req: Request, res: Response) {
  try {
    const result = await someService.doSomething()
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

---

## ❌ Error Handling

### Tipos de Erros Customizados

```typescript
// server/utils/errors.ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
```

### Uso de Erros Customizados

```typescript
// No service
export async function createClient(data: CreateClientDto) {
  const existing = db.prepare('SELECT * FROM clients WHERE email = ?').get(data.email)
  
  if (existing) {
    throw new ConflictError('Email já cadastrado')
  }
  
  // ...
}

// No controller
try {
  const client = await clientService.create(req.body)
  res.json({ success: true, data: client })
} catch (error) {
  if (error instanceof ConflictError) {
    return res.status(409).json({ success: false, error: error.message })
  }
  // ...
}
```

---

## 📝 Logging

### Estrutura de Logs

```typescript
// server/utils/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
})
```

### Uso de Logs

```typescript
// Info
logger.info({ userId, action: 'login' }, 'User logged in')

// Warn
logger.warn({ rateLimit: { remaining, reset } }, 'Rate limit approaching')

// Error
logger.error({ error: err.stack, userId }, 'Failed to process payment')

// Debug
logger.debug({ query, params }, 'Database query')
```

### Níveis de Log

- **debug:** Informações detalhadas para debugging
- **info:** Informações gerais (login, criação, etc.)
- **warn:** Situações anormais mas não erros
- **error:** Erros que precisam de atenção

---

## 🧪 Testing

### Testes Unitários de Services

```typescript
// tests/unit/authService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { authService } from '../../server/services/authService.js'

describe('AuthService', () => {
  beforeEach(() => {
    // Setup: limpar banco, criar usuários de teste
  })
  
  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const user = authService.loginUser('test@test.com', 'test123')
      expect(user).toHaveProperty('id')
    })
    
    it('should reject invalid credentials', async () => {
      await expect(
        authService.loginUser('test@test.com', 'wrong')
      ).rejects.toThrow('Credenciais inválidas')
    })
  })
})
```

### Testes de Integração de Controllers

```typescript
// tests/integration/authController.test.ts
import request from 'supertest'
import app from '../../server/app.js'

describe('Auth Controller', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'test123' })
    
    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.headers['set-cookie']).toBeDefined()
  })
})
```

### Testes de E2E

```typescript
// tests/e2e/userFlow.spec.ts
import { test, expect } from '@playwright/test'

test('complete user flow', async ({ page }) => {
  // Register
  await page.goto('/register')
  await page.fill('input[name="email"]', 'test@test.com')
  await page.fill('input[name="password"]', 'test123')
  await page.click('button[type="submit"]')
  
  // Login
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@test.com')
  await page.fill('input[name="password"]', 'test123')
  await page.click('button[type="submit"]')
  
  // Create project
  await page.goto('/dashboard')
  await page.click('button:has-text("Novo Projeto")')
  await page.fill('input[name="name"]', 'Test Project')
  await page.click('button:has-text("Criar")')
  
  expect(page).toHaveURL('/project/')
})
```

---

## 🔐 Segurança Interna

### Secrets Management

```typescript
// server/utils/secrets.ts
export const secrets = {
  jwtSecret: process.env.JWT_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  nvidiaApiKey: process.env.NVIDIA_API_KEY
}

// Nunca logar secrets
logger.info({ userId }, 'User logged in') // ✅
logger.info({ secret: secrets.jwtSecret }, 'Secret') // ❌
```

### Input Sanitization

```typescript
// Sempre validar input
const data = createUserSchema.parse(req.body)

// Nunca confiar em input do usuário
const query = `SELECT * FROM users WHERE email = '${email}'` // ❌ SQL injection
const query = `SELECT * FROM users WHERE email = ?` // ✅ Parameterized
```

### Rate Limiting Interno

```typescript
// Para operações custosas
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10 // 10 requisições
})

router.post('/api/ai/generate', limiter, aiController.generate)
```

---

## 📊 Performance Interno

### Caching de Queries

```typescript
// Cache de resultados frequentes
const toolsCache = new Map()

export async function getTools() {
  if (toolsCache.has('all')) {
    return toolsCache.get('all')
  }
  
  const tools = db.prepare('SELECT * FROM tools WHERE is_active = 1').all()
  toolsCache.set('all', tools)
  
  return tools
}
```

### Connection Pooling

```typescript
// SQLite WAL mode
db.pragma("journal_mode = WAL")

// Supabase connection pool (futuro)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  connectionLimit: 10
})
```

---

## 📚 Recursos Adicionais

- [API_GUIDE.md](API_GUIDE.md) - Documentação externa da API
- [ARCHITECTURE.md](ARCHITECTURE.md) - Decisões de arquitetura
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Guia de troubleshooting

---

**Última atualização:** 30 de Junho de 2026
