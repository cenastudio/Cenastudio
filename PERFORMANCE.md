# Performance Guide - Cena Studio

Guia de performance e otimizações do Cena Studio.

## 📋 Índice

- [Métricas de Performance](#métricas-de-performance)
- [Como Medir Performance](#como-medir-performance)
- [Otimizações Implementadas](#otimizações-implementadas)
- [Bottlenecks Conhecidos](#bottlenecks-conhecidos)
- [Como Escalar](#como-escalar)
- [Melhores Práticas](#melhores-práticas)

---

## 📊 Métricas de Performance

### Métricas Atuais

| Métrica | Valor Atual | Meta |
|---------|-------------|------|
| P50 Latency | ~200ms | <100ms |
| P95 Latency | ~500ms | <300ms |
| P99 Latency | ~1s | <500ms |
| TTFB (Time to First Byte) | ~150ms | <100ms |
| LCP (Largest Contentful Paint) | ~2s | <1.5s |
| CLS (Cumulative Layout Shift) | ~0.1 | <0.1 |
| FID (First Input Delay) | ~50ms | <50ms |
| Uptime | ~99.5% | >99.9% |

### Métricas de Negócio

| Métrica | Valor Atual |
|---------|-------------|
| Gerações IA/dia | ~100 |
| Usuários ativos | ~50 |
| Projetos criados/semana | ~20 |
| Uploads/semana | ~15 |

---

## 📏 Como Medir Performance

### Ferramentas de Browser

**Lighthouse:**
```bash
# Instalar
npm install -g lighthouse

# Rodar
lighthouse https://cenastudio.com.br --view
```

**WebPageTest:**
- Acesse https://www.webpagetest.org
- Insira URL
- Analise resultados

**Chrome DevTools:**
1. Abra DevTools (F12)
2. Vá para tab "Performance"
3. Clique "Record"
4. Interaja com o site
5. Pare gravação
6. Analise

### Ferramentas de Backend

**Apache Bench:**
```bash
ab -n 1000 -c 10 https://cenastudio.com.br/api/tools
```

**wrk:**
```bash
wrk -t4 -c100 -d30s https://cenastudio.com.br/api/tools
```

**k6:**
```javascript
// script.js
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('https://cenastudio.com.br/api/tools');
  check(res, { 'status was 200': (r) => r.status == 200 });
}
```

```bash
k6 run script.js
```

### Monitoring em Produção

**Sentry APM:**
```typescript
// Configurar em server/app.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
})
```

**Datadog:**
```typescript
import { StatsD } from 'node-dogstatsd'

const statsd = new StatsD()

statsd.increment('api.request', 1, ['endpoint:/api/tools'])
statsd.timing('api.response_time', duration, ['endpoint:/api/tools'])
```

---

## ⚡ Otimizações Implementadas

### Frontend

**1. Code Splitting**
```typescript
// Vite faz automaticamente
// Lazy loading de rotas
const Studio = lazy(() => import('./pages/Studio'))
```

**2. Tree Shaking**
```typescript
// Vite remove código não usado
// Importar apenas o necessário
import { Button } from '@/components/ui/button'
// Não importar biblioteca inteira
```

**3. Minification**
```typescript
// Vite minifica automaticamente
// CSS, JS, HTML
```

**4. Image Optimization**
```typescript
// Usar next/image se migrar para Next.js
// Ou usar CDN para imagens
```

**5. Caching**
```typescript
// Vite usa etag automático
// Browser caching de assets estáticos
```

### Backend

**1. Database Indexing**
```sql
-- Índices já criados
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_user_id ON projects(user_id);
-- ...
```

**2. Connection Pooling**
```typescript
// better-sqlite3 tem WAL mode
db.pragma("journal_mode = WAL");
```

**3. Response Compression**
```typescript
// Vercel gzip automático
// Ou usar compression middleware
import compression from 'compression'
app.use(compression())
```

**4. Rate Limiting**
```typescript
// Prevenir abuso
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})
```

---

## 🐌 Bottlenecks Conhecidos

### 1. Geração IA

**Problema:** Chamadas à API de IA são lentas (2-5s)

**Solução:**
- Implementar cache (Redis)
- Usar streaming responses
- Queue para processamento assíncrono

**Status:** Planejado (Sprint 3)

### 2. Queries de Analytics

**Problema:** Queries complexas de analytics são lentas

**Solução:**
- Materialized views
- Pré-calcular métricas
- Cache de resultados

**Status:** Planejado (Sprint 2)

### 3. Upload de Arquivos

**Problema:** Uploads grandes são lentos

**Solução:**
- Upload direto para S3/Supabase Storage
- Multipart upload
- Progress indicators

**Status:** Planejado (Sprint 2)

### 4. SQLite Concurrency

**Problema:** SQLite não escala bem com alta concorrência

**Solução:**
- Migrar para Supabase Postgres
- Connection pooling

**Status:** Em progresso (Sprint 1)

---

## 📈 Como Escalar

### Vertical Scaling (Scale Up)

**Aumentar recursos do servidor:**
- Mais CPU
- Mais RAM
- SSD mais rápido

**Quando usar:**
- < 1000 usuários
- Queries simples
- Baixa concorrência

### Horizontal Scaling (Scale Out)

**Adicionar mais servidores:**
- Load balancer
- Múltiplas instâncias
- Shared cache (Redis)

**Quando usar:**
- > 1000 usuários
- Alta concorrência
- Necessita alta disponibilidade

### Database Scaling

**Read Replicas:**
- Um banco primário (write)
- Múltiplos replicas (read)
- Load balance reads

**Sharding:**
- Dividir dados por região/tenant
- Cada shard independente

**Quando usar:**
- > 10k usuários
- > 1M registros
- Alta write throughput

### Caching Layers

**1. Browser Cache**
```typescript
// Headers de cache
res.setHeader('Cache-Control', 'public, max-age=3600')
```

**2. CDN Cache**
```typescript
// Vercel CDN automático
// Ou Cloudflare
```

**3. Application Cache (Redis)**
```typescript
// Cache de queries
const tools = await cachedGet('tools:all', () => getTools(), 3600)
```

**4. Database Cache**
```typescript
// Query cache do Prisma
// Ou materialized views
```

---

## 🎯 Melhores Práticas

### Frontend

**1. Lazy Loading**
```typescript
// Lazy de componentes
const HeavyComponent = lazy(() => import('./HeavyComponent'))

// Lazy de imagens
<img loading="lazy" src="image.jpg" />
```

**2. Debouncing**
```typescript
// Debounce de inputs
const debouncedSearch = useDebounce(searchTerm, 300)
```

**3. Virtualization**
```typescript
// Para listas longas
import { useVirtualizer } from '@tanstack/react-virtual'
```

**4. Memoization**
```typescript
// React.memo para componentes
export const ExpensiveComponent = React.memo(({ data }) => {
  // ...
})

// useMemo para valores caros
const expensiveValue = useMemo(() => calculate(data), [data])
```

### Backend

**1. Pagination**
```typescript
// Não buscar tudo de uma vez
const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit
})
```

**2. Select Only Needed Fields**
```typescript
// Não SELECT *
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
})
```

**3. Batch Operations**
```typescript
// Não fazer N+1 queries
const users = await prisma.user.findMany({
  include: { projects: true }
})
```

**4. Async Operations**
```typescript
// Paralelizar quando possível
const [user, projects, clients] = await Promise.all([
  getUser(id),
  getProjects(id),
  getClients(id)
])
```

### Database

**1. Use Indexes**
```sql
-- Criar índices para colunas usadas em WHERE/JOIN
CREATE INDEX idx_users_email ON users(email);
```

**2. Avoid N+1 Queries**
```typescript
// Ruim
for (const project of projects) {
  const client = await getClient(project.clientId)
}

// Bom
const projects = await prisma.project.findMany({
  include: { client: true }
})
```

**3. Use Transactions**
```typescript
// Para operações atômicas
await prisma.$transaction(async (tx) => {
  await tx.project.create({ data: {...} })
  await tx.client.update({ data: {...} })
})
```

**4. Connection Pooling**
```typescript
// Prisma connection pool
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

## 🔧 Performance Tuning

### Identificar Bottlenecks

**1. Profiling**
```bash
# Node.js profiling
node --prof app.js

# Analisar
node --prof-process isolate-*.log > processed.txt
```

**2. Flame Graphs**
```bash
# 0x para flame graphs
npm install -g 0x
0x -- build app.js
```

**3. Memory Profiling**
```bash
# Chrome DevTools > Memory
# Heap snapshot
```

### Otimizações Específicas

**1. Reduce Bundle Size**
```bash
# Analisar bundle
npm run build
npx vite-bundle-visualizer
```

**2. Optimize Images**
```bash
# Usar imagens otimizadas
# WebP, AVIF
# Lazy loading
```

**3. Minimize JavaScript**
```bash
# Tree shaking
# Code splitting
# Minification
```

**4. Optimize CSS**
```bash
# PurgeCSS (Tailwind já faz)
# Critical CSS inline
# Async CSS loading
```

---

## 📊 Monitoring Contínuo

### Alerts

Configure alertas para:
- P95 latency > 500ms
- Error rate > 1%
- CPU > 80%
- Memory > 80%
- Database connections > 80%

### Dashboards

Crie dashboards para:
- Latency por endpoint
- Error rate por serviço
- Database performance
- Cache hit rate
- User satisfaction

---

## 📚 Recursos

- [Web Vitals](https://web.dev/vitals/)
- [Performance Patterns](https://patterns.dev/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Database Performance](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Última atualização:** 30 de Junho de 2026
