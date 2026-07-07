# FIX DEPLOY NOW - Skill Master

## SITUAÇÃO ATUAL
- Deploy: Ready ✅
- Teste /api/health: 500 FUNCTION_INVOCATION_FAILED ❌
- Conta: cenastudio-3104 ✅
- Build: Passa sem erros TypeScript ✅

## PROBLEMA REAL
A função serverless está **crashando no runtime** (não é erro de build).

## DIAGNÓSTICO IMEDIATO

### Passo 1: Ver erro exato da função
No Safari, abrir: https://vercel.com/cenastudio-3104s-projects/cena-studio-prod
- Clicar no último deployment (mg5d4d1cv)
- Aba "Functions"
- Clicar em "server/index"
- Ver "Error Logs"

**OU via CLI:**
```bash
vercel logs https://cena-studio-prod-mg5d4d1cv-cenastudio-3104s-projects.vercel.app --since 10m 2>&1 | grep -A 20 -i error
```

### Passo 2: Erros Comuns e Soluções

#### Erro: "Cannot find module" ou "MODULE_NOT_FOUND"
**Causa**: Import path incorreto no ambiente serverless
**Solução**:
- Verificar se `server/index.ts` exporta o app corretamente
- Vercel precisa: `export default app;` (não `module.exports`)

#### Erro: "PrismaClient is unable to connect"
**Causa**: DATABASE_URL não está acessível ou Prisma não foi gerado
**Solução**:
```bash
# Verificar env var
vercel env ls | grep DATABASE_URL

# Forçar rebuild do Prisma
# Adicionar em vercel.json:
{
  "version": 2,
  "builds": [{
    "src": "server/index.ts",
    "use": "@vercel/node",
    "config": {
      "includeFiles": ["prisma/**", "node_modules/@prisma/**"]
    }
  }],
  "routes": [{"src": "/(.*)", "dest": "server/index.ts"}]
}
```

#### Erro: "Cannot access ... before initialization"
**Causa**: ESM circular dependency ou import antes de init
**Solução**: Mover `initPrismaCoreData()` para depois do app estar criado

#### Erro: "Task timed out after 10.00 seconds"
**Causa**: Cold start demorando muito
**Solução**:
- Desabilitar initPrismaCoreData() no serverless
- Lazy load do Prisma

## SOLUÇÃO MAIS PROVÁVEL

O problema é que `createApp()` está tentando inicializar coisas antes da função estar pronta.

### Correção Rápida:

**Em `server/app.ts`**, a função `ensureDatabase()` está rodando no cold start. Vamos fazer ela ser mais rápida:

```typescript
function ensureDatabase() {
  if (!databaseInitialized) {
    // REMOVER assertLaunchReadyEnvironment() em produção
    if (process.env.NODE_ENV !== 'production') {
      assertLaunchReadyEnvironment();
      requireEnvOrThrow();
    }

    if (!shouldUsePrisma) {
      sqliteInitReady = initDatabase();
    }

    // JÁ ESTÁ DESABILITADO - OK!
    prismaCoreReady = Promise.resolve();
    databaseInitialized = true;
  }
}
```

## AÇÃO IMEDIATA

1. **PRIMEIRO**: Me mostre o erro completo dos logs da função
2. **SEGUNDO**: Baseado no erro, aplicarei UMA correção específica
3. **TERCEIRO**: Deploy e teste

## COMANDO PARA EXECUTAR AGORA

```bash
# Abrir dashboard para ver erro
open -a Safari "https://vercel.com/cenastudio-3104s-projects/cena-studio-prod/mg5d4d1cv/functions"
```

Aguarde eu ver o erro real antes de fazer qualquer mudança no código!
