# Vercel Deploy Fixer Skill

## Objetivo
Resolver TODOS os erros de build e runtime do Vercel até o deploy funcionar completamente.

## Contexto do Projeto
- Stack: Vite frontend + Express backend + Prisma + PostgreSQL (Neon)
- Vercel: Serverless Functions com @vercel/node
- Conta correta: `cenastudio-3104`

## Protocolo de Resolução

### 1. SEMPRE verificar o último deployment
```bash
vercel ls | head -5
```

### 2. Se status = Error ou Ready com crash:
- Abrir logs: `vercel logs URL --since 10m`
- Identificar erro completo
- Corrigir APENAS o erro identificado
- Commit + push
- Aguardar 60s para novo deploy
- Verificar com: `curl -i https://cena-studio-prod.vercel.app/api/health`

### 3. Tipos de Erro e Soluções

#### Erro: "Cannot find module 'better-sqlite3'"
**Solução**: O import dinâmico deve usar string variável para evitar análise TS:
```typescript
const moduleName = "better-sqlite3";
const mod = await import(moduleName);
```

#### Erro: TypeScript compilation errors
**Solução**:
- Ler o arquivo com erro
- Corrigir tipo exato
- Usar `String()` para forçar conversão quando necessário
- Usar `as any` apenas quando tipo é realmente dinâmico

#### Erro: FUNCTION_INVOCATION_FAILED
**Solução**:
- Verificar logs completos no dashboard
- Geralmente é erro de runtime (Prisma, env vars, imports)
- Verificar se todas env vars estão configuradas: `vercel env ls`

#### Erro: NOT_FOUND
**Solução**: Routing incorreto no vercel.json
```json
{
  "version": 2,
  "builds": [{ "src": "server/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server/index.ts" }]
}
```

### 4. Ciclo de Trabalho
1. Identificar erro específico (não adivinhar)
2. Uma correção por vez
3. Commit + push
4. Aguardar deploy
5. Testar endpoint
6. Se falhar: voltar ao passo 1
7. Se funcionar: PARAR

### 5. Teste de Sucesso
```bash
curl -i https://cena-studio-prod.vercel.app/api/health
```
**Esperado**: `HTTP/2 200` com JSON `{"success":true,"data":{...}}`

## Regras Críticas
- ❌ NUNCA fazer múltiplas mudanças sem testar
- ❌ NUNCA remover/recriar estrutura sem confirmar erro
- ❌ NUNCA assumir - sempre ler logs
- ✅ SEMPRE esperar deploy completo antes de próxima correção
- ✅ SEMPRE testar após cada deploy
- ✅ SEMPRE mostrar erro completo antes de corrigir

## Objetivo Final
Deploy funcionando com:
- Build sem erros TypeScript
- Function rodando sem crash
- `/api/health` retornando 200 OK
