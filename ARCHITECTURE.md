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
├── React 19 + TypeScript
├── Vite (Build tool)
├── Tailwind CSS v4 (Estilização)
├── Wouter (Roteamento SPA)
└── Radix UI (Componentes)

Backend (Server)
├── Express + TypeScript
├── PostgreSQL via Prisma (banco principal, produção e dev)
├── SQLite (better-sqlite3) - fallback local quando DATABASE_URL não está definida
├── JWT httpOnly cookie (Autenticação)
└── Passport.js (GitHub OAuth opcional)

Infraestrutura
├── Railway (Hosting + Postgres gerenciado)
├── Cloudinary (thumbnails/imagens)
├── Supabase Storage (upload de arquivos de projeto, opcional — ver nota abaixo)
└── GitHub Actions (CI: typecheck + build)
```

> **Nota sobre Supabase:** o projeto migrou de Supabase Postgres para
> Railway Postgres (ver ADR-002 abaixo). Supabase ainda é usado
> opcionalmente como *storage* de arquivos (`server/services/supabaseStorage.ts`)
> e como provedor alternativo de login social — nenhum dos dois é o
> banco de dados principal hoje. Em produção, se as env vars
> `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` não estiverem configuradas,
> essas features ficam desativadas com erro claro (503), sem afetar o
> resto do sistema.

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
│  (Prisma → PostgreSQL, fallback SQLite) │
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

**Status:** Aceito, revisado em 14/07/2026 (migração de provedor Postgres: Supabase → Railway)
**Data:** 2024, migrações subsequentes em 30/06/2026 e julho/2026
**Contexto:** Escolher banco de dados para runtime.

**Decisão:** PostgreSQL como banco principal (via Prisma + `@prisma/adapter-pg`),
hospedado no Railway. SQLite (`better-sqlite3`) permanece como *fallback*
automático quando nenhuma `DATABASE_URL`/`POSTGRES_URL` está configurada
(`server/models/prisma.ts`, flag `shouldUsePrisma`) — útil para rodar o
projeto localmente sem depender de um Postgres externo.

**Rationale:**
- SQLite (fallback local):
  - Zero configuração
  - Não requer credenciais externas para rodar `npm run dev`

- PostgreSQL / Railway (produção):
  - Escalável, backup gerenciado pela plataforma
  - Mesmo provedor do hosting da aplicação (menor superfície operacional
    do que manter contas em dois provedores diferentes)
  - Pool de conexões dimensionado para concorrência real
    (`DATABASE_POOL_MAX`, default 10 — ver incidente de 14/07/2026 abaixo)

**Consequências:**
- Positivas:
  - Setup local sem dependências externas
  - Produção com Postgres real e gerenciado

- Negativas:
  - Duas implementações de query para manter em alguns services (Prisma
    para Postgres, `better-sqlite3` para o fallback) — mitigado mantendo
    a lógica de negócio nos services e replicando apenas o acesso a dados

**Incidente relevante (14/07/2026):** o pool de conexões Postgres estava
configurado com `max: 1` (uma única conexão para todo o processo), o que
fazia a aplicação parecer "cair" com apenas 2 usuários simultâneos —
qualquer segunda requisição concorrente esperava a única conexão liberar
e podia expirar por timeout. Corrigido para `max: 10` (o Postgres do
Railway suporta até 100 conexões). Ver `CHANGELOG.md`.

**Revisão:** Nenhuma migração de banco planejada. Reavaliar o tamanho do
pool se o número de usuários simultâneos crescer significativamente.

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

**Status:** Superseded by ADR-011

> A escolha de autenticação (JWT em cookie httpOnly) segue valendo. O que foi
> superado é a seção **Mitigação** abaixo — Redis blacklist, access token de
> 15min e refresh token nunca foram implementados. Ver ADR-011 para a estratégia
> de revogação em vigor.

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

**Status:** Aceito
**Data:** 2024
**Contexto:** Escolher processador de pagamentos.

**Decisão:** Stripe Checkout para planos self-service (Free/Pro/Studio);
contato consultivo via WhatsApp para os tiers White-Label/Enterprise
(venda negociada caso a caso, sem checkout automático).

**Rationale:**
- Stripe:
  - Ecossistema maduro, webhooks confiáveis, suporte global
  - Fluxo real: `startCheckout()` (`client/src/lib/api.ts`) →
    `POST /api/checkout/session` → Stripe Checkout hospedado →
    webhook confirma assinatura
- WhatsApp (só para White-Label/Enterprise):
  - Esses planos exigem negociação (preço, contrato, integração
    dedicada) — não fazem sentido como checkout self-service

**Consequências:**
- Positivas: cobertura automática para os planos de maior volume
  (Free/Pro/Studio), sem overhead de negociação manual nesses tiers
- Negativas: dependência de um único processador de pagamento

**Pendência conhecida (14/07/2026):** as chaves Stripe configuradas em
produção são de **modo teste** (`sk_test_`/`pk_test_`), não modo live —
ninguém consegue pagar de verdade ainda. Ver `.private/PROXIMOS_PASSOS.md`.

**Revisão:** N/A.

---

### ADR-010: Vercel vs Railway vs Self-hosted

**Status:** Aceito, revisado — migrado de Vercel para Railway
**Data:** decisão original 2024, migração para Railway concluída em julho/2026
**Contexto:** Escolher plataforma de hosting.

**Decisão:** Railway (Nixpacks para build, Postgres gerenciado no mesmo
provedor, deploy automático em push para `main`)

**Rationale:**
- Vercel foi a escolha original, mas o modelo serverless (functions
  efêmeras) não combinava bem com um backend Express monolítico com
  processos de longa duração e SQLite/Postgres — a migração para
  Railway simplificou isso ao rodar a aplicação como um processo Node
  persistente.
- Railway:
  - Deploy automático (git push → build → healthcheck → restart policy)
  - Postgres gerenciado no mesmo painel/provedor da aplicação
  - `railway.json`/`nixpacks.toml` versionados no repo definem o build
    e o healthcheck (`GET /health`, timeout 100s, até 10 tentativas de
    restart)

**Consequências:**
- Positivas:
  - Um único provedor para app + banco
  - Deploy simples, sem necessidade de configurar functions serverless
- Negativas:
  - Vendor lock-in (mitigado: aplicação é um processo Node padrão,
    portável para qualquer PaaS ou container)

**Revisão:** Sem migração adicional planejada.

---

### ADR-011: Invalidação de JWT via deny-list em `user_sessions`

**Status:** Aceito
**Data:** 2026-07 (decisão tomada no código; registrada retroativamente em 2026-07-26)
**Contexto:** JWT é stateless e não pode ser revogado sem estado externo. O
ADR-008 previa como mitigação um blacklist em Redis com access tokens de 15min —
não foi o caminho seguido. Este ADR substitui aquela mitigação.

**Decisão:** Deny-list em tabela Postgres `user_sessions`.

**Rationale:**
- Postgres já existe no stack; Redis adicionaria ~$10/mês sem outro uso
- `tokenHash` (SHA256 do JWT) evita guardar o token original no banco
- Revogação por `revokedAt` (soft revoke) em vez de delete: a linha precisa
  sobreviver para que o token continue reconhecido como morto
- `authenticate` chama `isTokenRevoked()` e rejeita apenas quando existe linha
  **com** `revokedAt` preenchido

**Consequências:**
- Positivas:
  - Revogação remota funciona (encerrar sessão → 401 no próximo request)
  - Custo zero de infraestrutura adicional
  - Índices em `userId` e `tokenHash` mantêm a consulta por request barata
- Negativas:
  - Token sem linha correspondente é **aceito**. Isso é deliberado: o
    `trackSession()` é fire-and-forget, e tratar "sem linha" como revogado
    quebraria o primeiro request logo após o login
  - Difere da proposta original (allow-list), que rejeitaria token desconhecido
  - Uma consulta ao banco por request autenticado

**Risco aceito:** se a tabela `user_sessions` for perdida/truncada, todos os
tokens ativos voltam a valer até expirar (até 7 dias) sem nenhuma forma de
revogação nesse intervalo. Revisar esta decisão se o produto passar a lidar com
dado sensível de cliente em maior volume, ou após o primeiro incidente de
segurança real.

**Revisão:** condicionada aos dois gatilhos acima.

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

### Fase Atual

- Monolito modular
- PostgreSQL (Railway) via Prisma em produção; SQLite como fallback local
- React + Vite
- Express backend
- JWT httpOnly cookie auth
- CI (GitHub Actions: typecheck + build)
- Painel admin com audit log de ações administrativas

### Próxima Fase

- Stripe em modo live (bloqueador para vendas reais)
- Rotação de credenciais expostas no histórico do git (ver `SECURITY.md`)
- Redis cache (se necessário)
- Monitoring externo (Sentry ou similar)

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

**Última atualização:** 14 de julho de 2026
