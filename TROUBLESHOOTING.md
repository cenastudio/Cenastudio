# Troubleshooting Guide - Cena Studio

Guia de solução de problemas comuns no Cena Studio.

## 📋 Índice

- [Problemas de Desenvolvimento](#problemas-de-desenvolvimento)
- [Problemas de Banco de Dados](#problemas-de-banco-de-dados)
- [Problemas de Autenticação](#problemas-de-autenticação)
- [Problemas de IA](#problemas-de-ia)
- [Problemas de Upload](#problemas-de-upload)
- [Problemas de Performance](#problemas-de-performance)
- [Problemas de Deploy](#problemas-de-deploy)

---

## 🛠️ Problemas de Desenvolvimento

### Servidor não inicia

**Sintoma:** `npm run dev` falha

**Possíveis causas:**
1. Porta já em uso
2. Dependências não instaladas
3. Variáveis de ambiente faltando

**Soluções:**

```bash
# 1. Verificar porta
lsof -i :5000
# Matar processo se necessário
kill -9 [PID]

# 2. Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# 3. Verificar .env
cat .env
# Deve conter JWT_SECRET no mínimo
```

### Vite HMR não funciona

**Sintoma:** Mudanças no código não refletem no browser

**Soluções:**

```bash
# Limpar cache Vite
rm -rf node_modules/.vite

# Reiniciar servidor
npm run dev
```

### TypeScript errors

**Sintoma:** Erros de TypeScript no VS Code

**Soluções:**

```bash
# Reinstalar tipos
npm install --save-dev @types/node @types/react @types/react-dom

# Limpar cache TypeScript
rm -rf .tsbuildinfo

# Verificar tsconfig
npm run check
```

---

## 🗄️ Problemas de Banco de Dados

### SQLite: "Database is locked"

**Sintoma:** Erro "database is locked" ao fazer múltiplas operações

**Causa:** SQLite não suporta alta concorrência

**Soluções:**

```typescript
// Habilitar WAL mode (já está no código)
db.pragma("journal_mode = WAL");

// Se ainda persistir, migrar para Supabase
```

### Supabase: Connection refused

**Sintoma:** Erro ao conectar com Supabase

**Soluções:**

```bash
# 1. Verificar variáveis
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 2. Testar conexão
curl -I $SUPABASE_URL

# 3. Verificar se projeto está ativo no painel Supabase
```

### Migrations não aplicam

**Sintoma:** Migrations falham ou não aplicam

**Soluções:**

```bash
# Via Supabase CLI
supabase db reset

# Verificar status
supabase db diff

# Forçar push
supabase db push --force
```

### Tabela não existe

**Sintoma:** "no such table: users"

**Soluções:**

```bash
# SQLite: Recriar banco
rm data/frame.db
npm run dev  # Banco será recriado

# Supabase: Verificar migrations
supabase db push
```

---

## 🔐 Problemas de Autenticação

### Login falha com "Invalid credentials"

**Sintoma:** Login sempre falha mesmo com credenciais corretas

**Soluções:**

```bash
# 1. Verificar se usuário existe
# Via SQLite:
sqlite3 data/frame.db "SELECT * FROM users WHERE email = 'seu@email.com'"

# 2. Resetar senha do admin
# Editar .env:
ADMIN_DEFAULT_PASSWORD=nova_senha

# 3. Recriar banco
rm data/frame.db
npm run dev
```

### JWT token expira imediatamente

**Sintoma:** Usuário é deslogado logo após login

**Soluções:**

```typescript
// Verificar configuração JWT em server/services/authService.ts
// Aumentar expiry:
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // Aumentar de 15min para 7d
)
```

### Cookie não é setado

**Sintoma:** Login parece funcionar mas cookie não é setado

**Soluções:**

```typescript
// Verificar configuração de cookie em server/app.ts
app.use(cookieParser())

// Verificar CORS
app.use(cors({ 
  origin: clientOrigin, 
  credentials: true  // Importante!
}))
```

### Login em produção falha com FUNCTION_INVOCATION_FAILED

**Sintoma:** Tela de login fica em "Entrando" ou "Autenticando" e exibe `FUNCTION_INVOCATION_FAILED`.

**Causas comuns:**
1. Variáveis de produção ausentes (`JWT_SECRET`, `CLIENT_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
2. `CLIENT_ORIGIN` apontando para `localhost`
3. Banco configurado como SQLite efêmero na Vercel
4. Proxy da Vercel sem `trust proxy` no Express, gerando validação de `X-Forwarded-For` no `express-rate-limit`

**Soluções:**

```bash
# 1. Verificar logs da Vercel
vercel logs

# 2. Testar API de login diretamente
curl -i -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cenastudio.com.br","password":"admin123"}'

# 3. Testar sessão com cookie salvo
curl -i -c /tmp/cena-cookies.txt -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cenastudio.com.br","password":"admin123"}'
curl -i -b /tmp/cena-cookies.txt https://seu-dominio.com/api/auth/me

# 4. Verificar health/readiness depois do deploy atualizado
curl https://seu-dominio.com/health
curl https://seu-dominio.com/ready
```

No código, a aplicação deve manter:

```typescript
const app = express()
app.set("trust proxy", 1)
```

Se o `curl` funcionar mas o navegador continuar falhando, limpar os dados do site no navegador para remover cookies/sessões antigas do domínio.

### Admin não consegue criar usuário no Supabase

**Sintoma:** Em `/admin/gerenciar`, criar usuário exibe `Nao foi possivel criar o acesso no Supabase.`

**Causas comuns:**
1. `SUPABASE_SERVICE_ROLE_KEY` ausente, inválida ou pertencente a outro projeto Supabase
2. E-mail já existente no Supabase Auth, mas ainda sem vínculo na tabela local `users`
3. Supabase Auth retornando erro de senha, e-mail ou configuração do provider

**Comportamento esperado:**

- O admin cria primeiro o acesso no Supabase Auth.
- Se o e-mail já existir no Supabase, o backend busca esse usuário, sincroniza senha/metadados e cria o vínculo local.
- Depois disso, `users.supabase_id` deve apontar para o ID do usuário no Supabase.

**Soluções:**

```bash
# 1. Confirmar que o service role existe em produção
vercel env ls

# 2. Testar criação via API, usando cookie admin
curl -i -b /tmp/cena-admin-cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@cenastudio.com.br","password":"teste123","role":"user","planId":"studio"}' \
  https://seu-dominio.com/api/admin/users

# 3. Conferir logs da Vercel para status/código do Supabase
vercel logs
```

Se o erro persistir, verificar no painel do Supabase se o usuário já existe em Authentication > Users e se a `SUPABASE_SERVICE_ROLE_KEY` é do mesmo projeto de `SUPABASE_URL`.

### Usuário criado some da lista ou aparece em uma sessão e não em outra

**Sintoma:** Admin cria uma conta, o login funciona, mas `/admin/gerenciar` ou outras rotas não mostram o mesmo estado em todas as requisições.

**Causa provável:**
Produção na Vercel usando SQLite em `/tmp`. Cada função/instância serverless pode ter seu próprio arquivo temporário, então os dados não são compartilhados nem persistentes.

**Como confirmar:**

```bash
# Se existir em produção, isto indica modo beta/teste apenas
vercel env ls
# Procurar ALLOW_EPHEMERAL_SQLITE=true
```

**Solução definitiva:**

- Persistência migrada para Supabase Postgres via Prisma.
- `ALLOW_EPHEMERAL_SQLITE=true` removido de produção em 30/06/2026.
- Manter SQLite apenas para desenvolvimento local ou testes controlados.
- Ativar a integração Supabase/Vercel (`POSTGRES_PRISMA_URL`) ou configurar `DATABASE_URL` com a URL do Pooler.

Se esse sintoma voltar, confirme se o deploy recebeu `POSTGRES_PRISMA_URL`/`POSTGRES_URL` da integração Supabase/Vercel e rode `SMOKE_BASE_URL=<url> npm run smoke:prisma`.

### Deploy falha com URL Postgres obrigatória

**Sintoma:** Produção falha no launch guard com mensagem sobre URL Postgres persistente.

**Causa:** O app saiu do modo SQLite efêmero e precisa de Postgres persistente.

**Solução:**

```bash
# 1. Monte a URL com a senha do banco Supabase
DATABASE_URL="postgresql://postgres.<project-ref>:<db-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"

# 2. Configure na Vercel somente se a integração não criou POSTGRES_PRISMA_URL
vercel env add DATABASE_URL production

# 3. Aplique migrations
export SUPABASE_DB_PASSWORD="sua_senha_do_banco"
npx supabase db push

# 4. Redeploy
vercel --prod
```

### Prisma falha com certificado do Supabase Pooler

**Sintoma:** logs mostram `Error opening a TLS connection: self-signed certificate in certificate chain`.

**Causa:** o driver `pg` tenta validar a cadeia do certificado entregue pelo Pooler Supabase na Vercel.

**Solução implementada:** `server/models/prisma.ts` remove o `sslmode` da URL para impedir que ele sobrescreva a configuração do driver, mantém TLS ativo e usa `rejectUnauthorized: false` exclusivamente nos hosts `*.supabase.com` e `*.supabase.co`. Outros hosts continuam usando a validação TLS padrão.

**Validação:** após o ajuste, `/health`, `/ready`, login, sessão e domínios operacionais responderam com sucesso no deployment `dpl_J8f2jBNL7ZwfEEHWGffqoV6eUY6g`.

### Primeiro login falha com connection timeout

**Sintoma:** o primeiro login de uma função fria retorna 500 e os logs mostram `Connection terminated due to connection timeout`; uma repetição imediata funciona.

**Causa:** o pooler Supabase pode demorar para aceitar conexões quando várias funções serverless frias iniciam ao mesmo tempo.

**Solução implementada:** `server/models/prisma.ts` usa timeout de conexão padrão de 30s, pool máximo padrão de uma conexão por instância e retry curto para erros transitórios (`Connection terminated`, `ECONNRESET`, `ETIMEDOUT`, `P1001`, `P1002`, `P1017`). O smoke operacional também executa leituras sequencialmente para validar o app sem criar rajada artificial contra o pooler.

**Estado observado em 30/06/2026:** ocorreu uma vez após o deploy e não se repetiu nos testes seguintes. O pool usa `max=1`, `connectionTimeoutMillis=10000` e `idleTimeoutMillis=10000` por padrão. Monitorar recorrência antes de aumentar conexões; em serverless, aumentar indiscriminadamente pode esgotar o pooler.

### GitHub OAuth não funciona

**Sintoma:** Login GitHub falha ou redireciona para erro

**Soluções:**

```bash
# 1. Verificar variáveis
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET

# 2. Verificar callback URL no GitHub OAuth app
# Deve ser: https://seu-dominio.com/api/auth/github/callback

# 3. Verificar se callback URL está correta no .env
GITHUB_CALLBACK_URL=https://seu-dominio.com/api/auth/github/callback
```

---

## 🤖 Problemas de IA

### IA retorna 503 Service Unavailable

**Sintoma:** Geração IA falha com erro 503

**Causa:** API key não configurada ou inválida

**Soluções:**

```bash
# 1. Verificar provider
echo $AI_PROVIDER  # deve ser "nvidia" ou "anthropic"

# 2. Verificar API key
echo $NVIDIA_API_KEY
echo $ANTHROPIC_API_KEY

# 3. Testar API key
curl -H "Authorization: Bearer $NVIDIA_API_KEY" \
  https://integrate.api.nvidia.com/v1/chat/completions

# 4. Verificar quota no painel do provider
```

### Resposta vazia da IA

**Sintoma:** IA retorna string vazia ou erro

**Soluções:**

```typescript
// Verificar prompt em server/services/aiService.ts
// Aumentar max_tokens se necessário
const response = await anthropic.messages.create({
  max_tokens: 4096,  // Aumentar
  // ...
})
```

### Timeout na geração

**Sintoma:** Requisição timeout após 60s

**Soluções:**

```bash
# Aumentar timeout NVIDIA
NVIDIA_TIMEOUT_MS=120000  # 2 minutos

# Ou aumentar timeout no código
const response = await fetch(url, {
  signal: AbortSignal.timeout(120000)
})
```

---

## 📤 Problemas de Upload

### Upload falha com "File too large"

**Sintoma:** Upload de arquivo grande falha

**Soluções:**

```typescript
// Aumentar limite em server/app.ts
app.use(express.json({ limit: '10mb' }))  // Aumentar de 1mb
app.use(express.urlencoded({ limit: '10mb', extended: true }))
```

### Upload falha com "Permission denied"

**Sintoma:** Erro de permissão ao salvar arquivo

**Soluções:**

```bash
# Verificar permissões da pasta uploads
ls -la uploads/

# Corrigir permissões
chmod 755 uploads/
chown -R $USER:$USER uploads/
```

### Arquivo não é encontrado após upload

**Sintoma:** Upload parece funcionar mas arquivo não aparece

**Soluções:**

```bash
# Verificar se arquivo foi salvo
ls -la uploads/

# Verificar caminho no código
# server/controllers/filesController.ts
const path = join(process.cwd(), 'uploads', filename)
```

---

## ⚡ Problemas de Performance

### Aplicação lenta

**Sintoma:** Respostas demoram > 2s

**Soluções:**

```bash
# 1. Verificar se há queries lentas
# Adicionar logging de tempo em controllers

# 2. Verificar se banco é bottleneck
# Migrar para Supabase se ainda usando SQLite

# 3. Implementar cache (Redis)
# Veja SENIOR_LEVEL_ROADMAP.md

# 4. Verificar se há memory leaks
# Usar Chrome DevTools > Memory
```

### High memory usage

**Sintoma:** Processo consome muita RAM

**Soluções:**

```bash
# Verificar uso de memória
pm2 monit

# Ou
top

# Possíveis causas:
# 1. Memory leak em React components
# 2. Queries não fechadas no banco
# 3. Cache não limitado
```

### CPU 100%

**Sintoma:** CPU constantemente em 100%

**Soluções:**

```bash
# Verificar processo
top

# Possíveis causas:
# 1. Loop infinito
# 2. Polling excessivo
# 3. Criptografia pesada (bcrypt)
```

---

## 🚀 Problemas de Deploy

### Vercel deploy falha

**Sintoma:** Deploy no Vercel falha

**Soluções:**

```bash
# 1. Verificar logs
vercel logs

# 2. Verificar build localmente
npm run build

# 3. Verificar variáveis de ambiente no painel Vercel
# Settings > Environment Variables

# 4. Verificar se há erros de TypeScript
npm run check
```

### Build falha com TypeScript errors

**Sintoma:** Build falha com erros de tipo

**Soluções:**

```bash
# 1. Verificar erros
npm run check

# 2. Corrigir erros ou usar // @ts-ignore temporariamente

# 3. Verificar tsconfig.json
# Pode estar muito estrito
```

### Deploy funciona mas app não responde

**Sintoma:** Deploy sucesso mas app retorna 502

**Soluções:**

```bash
# 1. Verificar health check
curl https://seu-dominio.com/health

# 2. Verificar logs
vercel logs

# 3. Verificar se PORT está configurado
# Vercel define PORT automaticamente
const port = process.env.PORT || 5000
```

### Variáveis de ambiente não carregam em produção

**Sintoma:** App usa valores de dev em produção

**Soluções:**

```bash
# 1. Verificar se variáveis estão no painel Vercel
# Settings > Environment Variables

# 2. Verificar se estão marcadas como Production
# Environment: Production

# 3. Redeploy após adicionar variáveis
vercel --prod
```

---

## 🔍 Debugging

### Habilitar Debug Logging

```typescript
// server/utils/logger.ts
export const logger = pino({
  level: 'debug',  // Mudar de 'info' para 'debug'
  // ...
})
```

### Ver Logs em Tempo Real

```bash
# Vercel
vercel logs --follow

# PM2
pm2 logs cena-studio

# Docker
docker-compose logs -f
```

### Usar Debugger

```typescript
// Adicionar breakpoint no VS Code
debugger;

// Ou usar console.log estruturado
console.log({ userId, action: 'login' }, 'User logged in');
```

---

## 📞 Quando Pedir Ajuda

Se você tentou todas as soluções acima e o problema persiste:

1. **Cole o erro completo** (stack trace)
2. **Descreva o ambiente:**
   - OS
   - Node.js version
   - Browser
3. **Descreva o que você tentou:**
   - Soluções que já tentou
   - Resultado de cada tentativa
4. **Forneça logs relevantes**

**Contato:**
- Email: contato@cenastudio.com.br
- GitHub Issues: [abrir issue](https://github.com/seu-usuario/frameai-director-correto/issues)

---

## 📚 Recursos Adicionais

- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) - Documentação completa
- [SENIOR_LEVEL_ROADMAP.md](SENIOR_LEVEL_ROADMAP.md) - Roadmap de melhorias
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guia de deployment

---

**Última atualização:** 30 de Junho de 2026
