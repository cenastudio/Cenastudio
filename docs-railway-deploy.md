# Notas críticas de deploy — Railway

Este documento existe porque duas falhas reais de deploy já aconteceram por
falta desse registro. Leia antes de mudar variáveis de ambiente ou o
`railway.json`.

## 1. NODE_ENV=production quebra o build se não tiver NPM_CONFIG_PRODUCTION=false

**Sintoma:** deploy falha rápido (15-20s) com `sh: vite: not found` (ou
`esbuild: not found`, `tsc: not found`).

**Causa raiz:** o serviço tem `NODE_ENV=production` como variável de
ambiente (necessário em runtime). O Nixpacks herda essa variável também na
fase de **build**, e o `npm ci` do npm 7+ pula `devDependencies` quando
`NODE_ENV=production` está setado — mesmo sendo `npm ci`, não `npm ci
--omit=dev` explícito. `vite`, `esbuild` e `typescript` estão em
`devDependencies` (corretamente — não são necessários em runtime), mas
são necessários para `npm run build`.

**Correção:** variável de ambiente no serviço Railway:
```
NPM_CONFIG_PRODUCTION=false
```
Isso faz o `npm ci` nativo do Nixpacks instalar tudo, sem precisar
sobrescrever o `buildCommand`.

**NÃO fazer:** não adicionar um `buildCommand` customizado tipo
`"npm ci --include=dev && npm run build"` no `railway.json`. O Nixpacks já
roda `npm ci` como parte do seu próprio pipeline de install; um segundo
`npm ci` no buildCommand roda em paralelo/depois e os dois brigam pelo
mesmo `node_modules/.cache`, causando `EBUSY: resource busy or locked`.
Isso já foi tentado e revertido (commits `4b0b7e6` → `a8761bd`).

## 2. ADMIN_DEFAULT_PASSWORD não resincroniza sozinho se o seed não rodou

**Sintoma:** login do admin falha com "Invalid email or password" mesmo
usando a senha exibida em `railway variables`.

**Causa raiz:** a senha do admin é definida/rotacionada pelo seed
(`server/models/prismaSeed.ts`, função `initPrismaCoreData`), que só roda
no boot do servidor (`server/app.ts`, `ensureDatabase()`). Se esse seed
ficar desabilitado (foi comentado uma vez, "Temporarily disabled to test
Vercel deployment", e esquecido) ou se um deploy com a variável nova nunca
chegar a subir (por causa do problema nº 1, por exemplo), o hash da senha
no banco fica desatualizado em relação à env var atual.

**Como verificar:** comparar o hash salvo com a env var atual (rodar local
apontando pro `DATABASE_URL` de produção):
```bash
DATABASE_URL="<prod db url>" npx tsx -e "..." # ver server/models/prismaSeed.ts
```

**Correção definitiva:** garantir que `initPrismaCoreData()` está sendo
chamado no boot (não comentado) — confirmar em `server/app.ts`. Ele já
contém a lógica de rotação automática de senha quando a env var muda.

## Checklist antes de mudar env vars de build/deploy

- [ ] Rodar `npm ci` localmente com `NODE_ENV=production` no shell e
      confirmar se `node_modules/.bin/vite` existe. Se não existir, a
      mesma falha vai acontecer no Railway.
- [ ] Depois de qualquer push, checar `railway status` e confirmar
      `uptimeSeconds` baixo (deploy realmente trocou) antes de assumir que
      a mudança está no ar.
- [ ] Testar login + uma rota nova de fato (não só `/health`) antes de
      considerar o deploy validado — `/health` não depende de banco nem
      de autenticação, então pode responder 200 mesmo com o app quebrado
      por dentro.
