# Debug Production Skill

## Objetivo
Diagnosticar e resolver erros em ambiente de produção (Vercel).

## Ferramentas de Diagnóstico

### 1. Verificar Status do Deploy
```bash
vercel ls | head -5
```
**Interpretar**:
- `● Ready` = Deploy bem-sucedido
- `● Error` = Falha no build
- `● Ready` + crash ao testar = Erro de runtime

### 2. Logs da Função Serverless
```bash
vercel logs https://cena-studio-prod.vercel.app --since 10m
```

### 3. Testar Endpoint Diretamente
```bash
# Teste básico
curl -i https://cena-studio-prod.vercel.app/api/health

# Teste com verbose
curl -v https://cena-studio-prod.vercel.app/api/health

# Teste deployment específico
curl -i https://DEPLOYMENT-URL.vercel.app/api/health
```

### 4. Verificar Build Logs no Dashboard
Abrir: `https://vercel.com/cenastudio-3104s-projects/cena-studio-prod/[deployment-id]`

## Tipos de Erro

### FUNCTION_INVOCATION_FAILED
**Causa**: Crash durante execução da função
**Diagnóstico**:
1. Ver logs completos no dashboard da Vercel
2. Comum: Prisma não conectando, env vars faltando, import error
3. Verificar: `vercel env ls`

### NOT_FOUND
**Causa**: Routing não configurado corretamente
**Solução**: Verificar `vercel.json`

### Build Error (TypeScript)
**Causa**: Erros de compilação
**Diagnóstico**: Ver build logs no dashboard

### Timeout
**Causa**: Função demora mais de 10s (limite free tier)
**Solução**: Otimizar cold start ou upgrade plan

## Checklist de Diagnóstico

1. ✅ Deploy está Ready?
2. ✅ Endpoint retorna 200?
3. ✅ Todas env vars configuradas?
4. ✅ Prisma Client gerado?
5. ✅ DATABASE_URL acessível?
6. ✅ Logs mostram erro específico?

## Comandos Rápidos

```bash
# Status + teste em um comando
vercel ls | head -3 && curl -i https://cena-studio-prod.vercel.app/api/health

# Ver último erro
vercel logs https://cena-studio-prod.vercel.app --since 5m | grep -i error

# Ver env vars
vercel env ls | grep DATABASE
```
