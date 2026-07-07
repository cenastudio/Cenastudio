# Build System Skill

## Arquitetura do Build

### Client (Vite)
```bash
npm run build:client
# Output: dist/public/
# Vite → HTML + CSS + JS chunks
```

### Server (esbuild)
```bash
npm run build:server
# Output: dist/index.js
# esbuild → Bundle único ESM
```

## Configuração esbuild

```json
{
  "platform": "node",
  "packages": "external", // Não bundlea node_modules
  "bundle": true,
  "format": "esm",
  "outdir": "dist"
}
```

### Por que `packages: external`?
- Prisma Client precisa dos binaries nativos
- node_modules já instalado no ambiente Vercel
- Bundle menor e build mais rápido

## Vercel Build Process

1. `npm install` → Roda `postinstall: prisma generate`
2. Vercel detecta `vercel.json` com `builds`
3. `@vercel/node` compila `server/index.ts`
4. Gera função serverless na AWS Lambda

## Problemas Comuns

### "Cannot find module"
**Diagnóstico**: Módulo external não instalado
**Solução**: Adicionar em dependencies (não devDependencies)

### TypeScript errors no build
**Diagnóstico**: `tsc --noEmit` localmente
**Solução**: Corrigir tipos antes do deploy

### Prisma não gerado
**Diagnóstico**: `postinstall` não rodou
**Solução**: Verificar `package.json` tem `"postinstall": "prisma generate"`
