# Bundling Skill

## esbuild Bundling

### O que é bundleado
- Código TypeScript → JavaScript
- Imports relativos resolvidos
- Tree-shaking aplicado

### O que NÃO é bundleado (`packages: external`)
- node_modules
- Binários nativos (Prisma, better-sqlite3)
- Assets estáticos

## Troubleshooting

### Bundle muito grande
- Usar dynamic imports: `const mod = await import('./heavy.js')`
- Code splitting por rota

### Runtime errors "Cannot find module"
- Verificar se package está em `dependencies`
- Não usar imports condicionais no top-level
