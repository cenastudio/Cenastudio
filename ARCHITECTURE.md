# Architecture Decisions - Cena Studio

Este documento documenta as decisões de arquitetura significativas do Cena Studio, seguindo o padrão [Architecture Decision Records (ADR)](https://adr.github.io/).

## 📋 Índice

- [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
- [Decisões de Arquitetura](#decisões-de-arquitetura)
- [Padrões de Design](#padrões-de-design)
- [Trade-offs Considerados](#trade-offs-considerados)

---

## 🏗️ Visão Geral da Arquitetura

### Stack Tecnológico

```
Frontend (Client)
├── React 19.2 + TypeScript
├── Vite 7.1 (Build tool)
├── Tailwind CSS v4 (Estilização)
├── Wouter (Roteamento SPA)
└── Radix UI (Componentes)

Backend (Server)
├── Express + TypeScript
├── SQLite (better-sqlite3) - Runtime atual
├── Supabase Postgres - Preparado para migração
├── JWT (Autenticação)
└── Passport.js (OAuth)

Infraestrutura
├── Vercel (Hosting)
├── Supabase (Banco de dados futuro)
└── GitHub Actions (CI/CD planejado)
```

### Arquitetura de Camadas

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│  (React Components + Pages)         │
└──────────────┬──────────────────────┘
               │ HTTP/REST
┌──────────────▼──────────────────────┐
│          API Layer                  │
│  (Express Routes + Controllers)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Business Logic Layer        │
│  (Services - Auth, AI, CRM, etc.)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│          Data Access Layer          │
│  (SQLite/Supabase + ORM futuro)    │
└─────────────────────────────────────┘
```

---

## 📐 Decisões de Arquitetura

### ADR-001: Monolito vs Microservices

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Precisamos decidir entre arquitetura monolítica ou microservices.

**Decisão:** Monolito modular

**Rationale:**
- Time pequeno (1-3 desenvolvedores)
- Complexidade de microservices não justificada ainda
- Deploy mais simples
- Menor overhead operacional
- Escala horizontal ainda não necessária

**Consequências:**
- Positivas:
  - Desenvolvimento mais rápido
  - Debugging mais simples
  - Menor latência entre componentes
  
- Negativas:
  - Escala vertical limitada
  - Acoplamento potencial entre módulos
  - Deploy monolítico (todo ou nada)

**Revisão:** Reavaliar quando atingir 10k usuários ou 50+ req/s

---

### ADR-002: SQLite vs Postgres (Runtime)

**Status:** Aceito (com migração planejada)  
**Data:** 2024  
**Contexto:** Escolher banco de dados para runtime inicial.

**Decisão:** SQLite para desenvolvimento inicial, migrar para Supabase Postgres em produção

**Rationale:**
- SQLite:
  - Zero configuração
  - Perfeito para desenvolvimento
  - Fácil backup (arquivo único)
  - Performance excelente para < 100 concurrent users
  
- Supabase Postgres:
  - Escalável para produção
  - Backup automático
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Migrations já preparadas

**Consequências:**
- Positivas:
  - Setup rápido para desenvolvimento
  - Caminho claro para produção
  
- Negativas:
  - Duas implementações de banco para manter
  - Queries diferentes entre SQLite e Postgres
  - Migração requerida antes de produção

**Revisão:** Migrar completamente para Supabase após Sprint 1

---

### ADR-003: React vs Next.js

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher framework frontend.

**Decisão:** React + Vite (sem Next.js)

**Rationale:**
- Vite:
  - Dev server extremamente rápido
  - Build otimizado por padrão
  - Menor configuração
  
- Next.js não escolhido porque:
  - SSR não necessário (app é SPA)
  - API routes não necessárias (tem Express backend)
  - Overhead de configuração
  - Vite mais simples para nosso caso

**Consequências:**
- Positivas:
  - DX (developer experience) excelente
  - HMR instantâneo
  - Build rápido
  
- Negativas:
  - Sem SEO otimizado (landing precisa ser SSR)
  - Sem image optimization automática
  - Sem ISR (incremental static regeneration)

**Mitigação:**
- Landing page pode ser migrada para Next.js se SEO crítico
- Usar CDN para assets estáticos

**Revisão:** Considerar Next.js se SEO se tornar crítico

---

### ADR-004: Express vs Fastify vs Koa

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher framework backend.

**Decisão:** Express

**Rationale:**
- Express:
  - Ecossistema maduro
  - Middleware abundante
  - Documentação extensa
  - Time já familiarizado
  
- Fastify/Koa não escolhidos porque:
  - Ecossistema menor
  - Curva de aprendizado
  - Express suficiente para nossas necessidades

**Consequências:**
- Positivas:
  - Middleware readily available
  - Comunidade grande
  - Facilidade de hiring
  
- Negativas:
  - Performance inferior a Fastify
  - TypeScript support não nativo (requer @types)
  - Callbacks (embora com async/await mitigado)

**Revisão:** Considerar Fastify se performance se tornar bottleneck

---

### ADR-005: Wouter vs React Router

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher biblioteca de roteamento.

**Decisão:** Wouter

**Rationale:**
- Wouter:
  - API mais simples
  - Menor bundle size (3KB vs 15KB)
  - Hooks-first design
  - Suporte a hash routing nativo
  
- React Router não escolhido porque:
  - Overkill para SPA simples
  - Bundle size maior
  - API mais complexa

**Consequências:**
- Positivas:
  - Bundle menor
  - API mais simples
  - Performance melhor
  
- Negativas:
  - Ecossistema menor
  - Menos recursos de data fetching
  - Comunidade menor

**Revisão:** Considerar React Router se features avançadas de roteamento necessárias

---

### ADR-006: Radix UI vs Headless UI vs Chakra UI

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher biblioteca de componentes UI.

**Decisão:** Radix UI + Tailwind CSS

**Rationale:**
- Radix UI:
  - Componentes headless (estilo customizável)
  - Acessibilidade nativa (WAI-ARIA)
  - Não styled (liberdade total)
  - Performance excelente
  
- Headless UI não escolhido:
  - Focado em Tailwind (mas Radix também funciona bem)
  - Ecossistema menor
  
- Chakra UI não escolhido:
  - Styled components (menos flexível)
  - Bundle size maior
  - Opiniated design system

**Consequências:**
- Positivas:
  - Acessibilidade garantida
  - Estilo 100% customizável
  - Performance excelente
  - Bundle size pequeno
  
- Negativas:
  - Mais código para estilizar
  - Sem design system pré-definido
  - Curva de aprendizado para composição

**Mitigação:**
- Criar design system interno
- Usar shadcn/ui (baseado em Radix) para componentes comuns

**Revisão:** N/A (decisão sólida)

---

### ADR-007: Anthropic vs NVIDIA vs OpenAI

**Status:** Aceito (com fallback)  
**Data:** 2024  
**Contexto:** Escolher provider de IA.

**Decisão:** NVIDIA como primary, Anthropic como fallback

**Rationale:**
- NVIDIA:
  - Custo menor (NVIDIA API mais barato)
  - Modelo minimax-m3 multimodal
  - Timeout configurável
  - Thinking mode disponível
  
- Anthropic:
  - Claude Sonnet 4 (modelo superior)
  - Context window maior
  - Melhor para reasoning complexo
  - Mais caro
  
- OpenAI não escolhido:
  - GPT-4 mais caro
  - Rate limits mais restritivos

**Consequências:**
- Positivas:
  - Custo menor com NVIDIA
  - Fallback para Anthropic se necessário
  - Flexibilidade de escolha
  
- Negativas:
  - Dois providers para manter
  - Qualidade de output pode variar
  - Complexidade de switching

**Mitigação:**
- Abstração em `aiService.ts` para switching fácil
- Feature flag para trocar provider sem deploy

**Revisão:** Reavaliar custos e qualidade mensalmente

---

### ADR-008: JWT vs Sessions vs Supabase Auth

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher método de autenticação.

**Decisão:** JWT httpOnly cookies + Supabase Auth (híbrido)

**Rationale:**
- JWT:
  - Stateless (escala horizontal)
  - Compatível com SPA
  - httpOnly cookies seguros contra XSS
  
- Sessions não escolhidas:
  - Stateful (requer store)
  - Escala mais complexa
  
- Supabase Auth:
  - Já configurado
  - OAuth integrado
  - Row Level Security
  - Usado para auth futuro

**Consequências:**
- Positivas:
  - Escalabilidade
  - Segurança (httpOnly)
  - Integração com Supabase
  
- Negativas:
  - Revogação complexa (blacklist necessário)
  - Token size limit
  - Refresh token logic

**Mitigação:**
- Implementar token blacklist em Redis
- Short-lived access tokens (15min)
- Long-lived refresh tokens (7 dias)

**Revisão:** N/A (padrão da indústria)

---

### ADR-009: Stripe vs Paddle vs LemonSqueezy

**Status:** Aceito (legado)  
**Data:** 2024  
**Contexto:** Escolher processador de pagamentos.

**Decisão:** Stripe (legado), migrando para PIX/WhatsApp

**Rationale:**
- Stripe:
  - Ecossistema maduro
  - Webhooks confiáveis
  - Suporte global
  - Documentação excelente
  
- Paddle/LemonSqueezy não escolhidos:
  - Ecossistema menor
  - Menos features
  
- PIX/WhatsApp:
  - Melhor para mercado brasileiro
  - Sem taxas de processamento
  - Contato direto com cliente

**Consequências:**
- Positivas:
  - Stripe como fallback/API
  - PIX/WhatsApp para fluxo principal
  
- Negativas:
  - Dois sistemas de pagamento
  - Stripe ainda mantido (legado)

**Mitigação:**
- Manter Stripe como API-only
- PIX/WhatsApp como UX principal

**Revisão:** Remover Stripe se PIX/WhatsApp funcionar bem

---

### ADR-010: Vercel vs Railway vs Self-hosted

**Status:** Aceito  
**Data:** 2024  
**Contexto:** Escolher plataforma de hosting.

**Decisão:** Vercel

**Rationale:**
- Vercel:
  - Deploy automático (git push)
  - CDN global
  - Edge functions
  - Preview deployments
  - Integração com Next.js/React
  
- Railway não escolhido:
  - Menos otimizado para frontend
  - Preview deployments não tão bons
  
- Self-hosted não escolhido:
  - Overhead operacional
  - Manutenção de infraestrutura
  - Sem CDN automático

**Consequências:**
- Positivas:
  - Deploy zero-friction
  - Performance global (CDN)
  - Preview environments
  
- Negativas:
  - Vendor lock-in
  - Limites de uso (free tier)
  - SQLite efêmero (requer banco externo)

**Mitigação:**
- Usar Supabase para banco persistente
- Docker container para portabilidade

**Revisão:** Considerar self-hosted se custos ficarem altos

---

## 🎨 Padrões de Design

### Controller Pattern

Controllers handle HTTP requests/responses only:

```typescript
// ✅ Bom
export async function createUser(req: Request, res: Response) {
  const data = await userService.create(req.body)
  res.json({ success: true, data })
}

// ❌ Ruim
export async function createUser(req: Request, res: Response) {
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const user = db.prepare('INSERT INTO users...').run(...)
  res.json(user)
}
```

### Service Pattern

Services contain business logic:

```typescript
// ✅ Bom
export async function create(data: CreateUserDto): Promise<User> {
  const existing = await findByEmail(data.email)
  if (existing) throw new ConflictError('Email already exists')
  
  const hashedPassword = await hashPassword(data.password)
  return prisma.user.create({ data: { ...data, passwordHash: hashedPassword } })
}

// ❌ Ruim
export async function create(data: any) {
  return db.prepare('INSERT INTO users...').run(data)
}
```

### Repository Pattern (Futuro)

After Prisma migration:

```typescript
export class UserRepository {
  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }
  
  async create(data: CreateUserDto): Promise<User> {
    return prisma.user.create({ data })
  }
}
```

### Context Pattern (React)

Global state with React Context:

```typescript
// ✅ Bom
const AuthContext = createContext<AuthContextType>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // ...
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Custom Hook Pattern

Reusable logic:

```typescript
// ✅ Bom
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}
```

---

## ⚖️ Trade-offs Considerados

### Performance vs Developer Experience

**Decisão:** Priorizar DX com performance aceitável

**Rationale:**
- Time pequeno
- Velocidade de desenvolvimento crítica
- Performance pode ser otimizada depois

**Trade-offs:**
- SQLite em dev (rápido setup) vs Postgres em prod (melhor performance)
- React vs Svelte (React mais popular, Svelte mais rápido)
- Express vs Fastify (Express mais familiar, Fastify mais rápido)

### Simplicidade vs Flexibilidade

**Decisão:** Priorizar simplicidade com extensibilidade

**Rationale:**
- Evitar over-engineering
- YAGNI (You Aren't Gonna Need It)
- KISS (Keep It Simple, Stupid)

**Trade-offs:**
- Monolito vs Microservices (monolito mais simples)
- Wouter vs React Router (Wouter mais simples)
- Radix UI vs Chakra UI (Radix mais flexível)

### Cost vs Features

**Decisão:** Balancear custo com features necessárias

**Rationale:**
- Bootstrapped company
- Otimizar para custo-benefício

**Trade-offs:**
- NVIDIA vs Anthropic (NVIDIA mais barato)
- Vercel free tier vs paid (free tier suficiente inicialmente)
- Supabase free vs paid (free tier suficiente inicialmente)

---

## 🔄 Evolução da Arquitetura

### Fase Atual (Mid-Senior)

- Monolito modular
- SQLite (dev) + Supabase (prod planejado)
- React + Vite
- Express backend
- JWT auth

### Próxima Fase (Senior)

- Supabase Postgres (migrado)
- Prisma ORM
- Redis cache
- CI/CD automatizado
- Monitoring (Sentry)
- Health checks

### Futura (Scale-up)

- Microservices (se necessário)
- Message queue (RabbitMQ/Redis)
- CDN para assets
- Load balancing
- Database sharding

---

## 📚 Referências

- [The Twelve-Factor App](https://12factor.net/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
- [Architecture Decision Records](https://adr.github.io/)

---

**Última atualização:** 30 de Junho de 2026
