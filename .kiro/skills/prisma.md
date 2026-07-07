# Prisma Skill

## Prisma Client Generation

### Local
```bash
npx prisma generate
```

### Vercel (Automático)
`package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## Prisma em Serverless

### Connection Pooling
Usar `POSTGRES_PRISMA_URL` (pooled) não `DATABASE_URL_UNPOOLED`

### Client Singleton
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Problemas Comuns

### "Prisma Client not generated"
**Solução**: Verificar `postinstall` no package.json

### "Connection pool timeout"
**Solução**: Usar connection pooler (Neon/Supabase já tem)

### Cold start lento
**Solução**: Lazy load Prisma Client
