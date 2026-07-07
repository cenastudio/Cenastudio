# Vercel Serverless Functions Skill

## Arquitetura

### Serverless Function = Handler HTTP
```typescript
// ✅ CORRETO para Vercel
export default app; // Express app

// ❌ ERRADO
module.exports = app; // CommonJS não funciona com ESM
```

## Limites da Vercel

- **Timeout**: 10s (Hobby), 60s (Pro)
- **Memory**: 1GB (Hobby), 3GB (Pro)
- **Payload**: 4.5MB request/response
- **Cold Start**: 0-5s primeira invocação

## Cold Start Optimization

### 1. Lazy Loading
```typescript
let prisma: PrismaClient | null = null;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
```

### 2. Evitar Inicializações Pesadas
```typescript
// ❌ LENTO - roda todo cold start
ensureDatabase();
initPrismaCoreData(); // Seed no cold start

// ✅ RÁPIDO - só quando necessário
if (req.path === '/admin/seed') {
  await initPrismaCoreData();
}
```

### 3. Configuração do vercel.json

```json
{
  "version": 2,
  "builds": [{
    "src": "server/index.ts",
    "use": "@vercel/node",
    "config": {
      "maxDuration": 10,
      "includeFiles": ["prisma/**"]
    }
  }],
  "routes": [{
    "src": "/(.*)",
    "dest": "server/index.ts"
  }]
}
```

## Erros Comuns

### "Cannot find module"
**Causa**: Path relativo incorreto ou módulo não bundleado
**Solução**: Usar paths absolutos ou adicionar em `includeFiles`

### "Task timed out"
**Causa**: Cold start > 10s
**Solução**: Remover sync operations, lazy load, remover seeds

### "FUNCTION_INVOCATION_FAILED"
**Causa**: Exception não tratada
**Solução**: Ver logs, adicionar try/catch no createApp()
