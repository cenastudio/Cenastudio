# Database Connectivity Skill

## Neon Postgres na Vercel

### Environment Variables Necessárias
- `DATABASE_URL` - Connection pooler
- `POSTGRES_PRISMA_URL` - Para Prisma (pooled)
- `DATABASE_URL_UNPOOLED` - Migrations apenas

### Testar Conexão
```typescript
// server/utils/testDb.ts
import { prisma } from '../models/prisma.js';

export async function testConnection() {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
```

## Debugging Connection Issues

### Erro: "Connection refused"
- Verificar DATABASE_URL está configurada
- Verificar IP whitelist no Neon (deve permitir 0.0.0.0/0 para Vercel)

### Erro: "Too many connections"
- Usar connection pooler
- Reduzir `connection_limit` no Prisma schema

### Erro: "SSL required"
- Adicionar `?sslmode=require` na connection string
