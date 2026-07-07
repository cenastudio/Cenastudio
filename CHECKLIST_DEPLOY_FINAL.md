# ✅ CHECKLIST FINAL - Deploy em 3 Passos

**Tempo total**: 5-10 minutos
**Objetivo**: Preparar sistema para primeiro deploy

---

## 🎯 PASSO 1: Limpar Banco de Produção

### Por quê?
Banco Supabase tem **dados demo** aplicados ontem:
- 5 clientes fictícios (Atlântica, TechXYZ, Harmonia, Gustavo, Instituto)
- 4 projetos demo
- 20 lançamentos financeiros fake
- Etc.

### Executar:
```bash
npx tsx scripts/clean-production-data.ts
```

### O script vai:
- ❌ **DELETAR** todos dados demo
- ✅ **MANTER** estrutura (27 tabelas)
- ✅ **MANTER** planos (free, pro, studio)
- ✅ **MANTER** tools (12 ferramentas IA)
- ✅ **MANTER** admins (3 usuários reais)

### Resultado esperado:
```
✅ Banco está limpo e pronto para produção!
✅ Apenas estrutura, planos, tools e admins mantidos
✅ Nenhum dado demo ou de teste no banco

👤 Usuários no banco:
   - elytraprod@gmail.com (elytraprod) - admin
   - admin@cenastudio.com.br (Admin) - admin
   - doesnotzero@cenastudio.com.br (Does not zero) - admin
```

**Tempo**: 1 minuto

---

## 🔐 PASSO 2: Gerar Credenciais de Produção

### 2.1 - Gerar novo JWT_SECRET

**Por quê?** JWT_SECRET atual é de dev (fraco)

```bash
openssl rand -base64 32
```

**Output exemplo:**
```
K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=
```

✅ **COPIAR E GUARDAR** - Vai usar no Railway

---

### 2.2 - Gerar senha admin forte

**Por quê?** Senha atual é `admin123` (muito fraca)

```bash
openssl rand -base64 16
```

**Output exemplo:**
```
P9wX2vM8nL5kR4sT
```

✅ **COPIAR E GUARDAR** - Vai usar no Railway e no primeiro login

---

### 📝 Template para guardar:

```bash
# === CREDENCIAIS PRODUÇÃO ===
# Geradas em: 07/07/2026

# JWT_SECRET (adicionar no Railway)
K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=

# ADMIN_DEFAULT_PASSWORD (adicionar no Railway)
P9wX2vM8nL5kR4sT

# === PRIMEIRO LOGIN ===
Email: admin@cenastudio.com.br
Senha: P9wX2vM8nL5kR4sT
URL: https://cenastudio-production-abc123.up.railway.app
```

**Tempo**: 30 segundos

---

## 🚀 PASSO 3: Deploy Railway

### 3.1 - Criar projeto Railway

1. Ir em https://railway.app
2. New Project → Deploy from GitHub repo
3. Conectar GitHub → Selecionar repositório `cenastudio`
4. Railway vai detectar Node.js automaticamente

---

### 3.2 - Adicionar variáveis de ambiente (9)

**Copiar e colar estas 9 variáveis no Railway:**

```bash
# === OBRIGATÓRIAS (6) ===
NODE_ENV=production

PORT=3000

DATABASE_URL=postgresql://postgres:Opim2995cenastudio@db.vylxwhuuqluloxkhlsmd.supabase.co:5432/postgres

JWT_SECRET=K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=

CLIENT_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}}

ADMIN_DEFAULT_PASSWORD=P9wX2vM8nL5kR4sT

# === RECOMENDADAS (3) ===
NODE_VERSION=20.19.0

OPENROUTER_API_KEY=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

AI_PROVIDER=openrouter
```

⚠️ **IMPORTANTE**: Trocar `JWT_SECRET` e `ADMIN_DEFAULT_PASSWORD` pelos valores que você gerou no Passo 2!

---

### 3.3 - Deploy automático

Railway vai:
1. ✅ Detectar Node.js
2. ✅ Instalar dependências (`npm install`)
3. ✅ Build (`npm run build`)
4. ✅ Start (`npm start`)
5. ✅ Gerar URL: `cenastudio-production-abc123.up.railway.app`

**Tempo**: 3-5 minutos

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

### 1. Acessar URL gerada

```
https://cenastudio-production-abc123.up.railway.app
```

### 2. Fazer primeiro login

```
Email: admin@cenastudio.com.br
Senha: P9wX2vM8nL5kR4sT  (a que você gerou)
```

### 3. Verificar funcionalidades

- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] CRM vazio (0 clientes)
- [ ] Projetos vazio (0 projetos)
- [ ] Pipeline vazio (0 oportunidades)
- [ ] Financeiro vazio
- [ ] Ferramentas IA funcionam (criar projeto teste)

### 4. Se tudo OK → Deploy completo! 🎉

---

## 🧹 LIMPEZA OPCIONAL (Recomendado)

### Deletar backups locais

```bash
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
rm -f .env.*.backup .env.*.tmp .env.*.check .env.*.temp
```

### Deletar scripts temporários

```bash
rm -f check-user-data.mjs check-users.mjs add-progress-column.mjs
rm -f apply-seed.mjs apply-seed-simple.ts apply-seed-simple.mjs
rm -f sync-supabase-db.mjs test-all-features.mjs
```

### Commit limpeza

```bash
git add .
git commit -m "chore: cleanup for production"
git push origin main
```

**Tempo**: 1 minuto

---

## 📊 CHECKLIST COMPLETO

```
✅ PASSO 1: Banco limpo
   [ ] Executar: npx tsx scripts/clean-production-data.ts
   [ ] Verificar: 0 clientes, 0 projetos, apenas admins

✅ PASSO 2: Credenciais geradas
   [ ] JWT_SECRET novo (openssl rand -base64 32)
   [ ] Senha admin forte (openssl rand -base64 16)
   [ ] Credenciais guardadas em local seguro

✅ PASSO 3: Deploy Railway
   [ ] Projeto criado no Railway
   [ ] GitHub conectado
   [ ] 9 variáveis adicionadas
   [ ] Deploy automático completo
   [ ] Login testado
   [ ] Funcionalidades verificadas

✅ LIMPEZA (Opcional)
   [ ] Backups deletados
   [ ] Scripts temporários removidos
   [ ] Commit e push
```

---

## 🎉 PRONTO!

Após seguir os 3 passos:
- ✅ Banco limpo (virgem)
- ✅ Credenciais fortes
- ✅ Deploy funcionando
- ✅ Sistema pronto para uso em produção

---

## 📚 Adicionar Depois (Fase 2)

Quando precisar, adicionar mais variáveis:

### Stripe (Pagamentos)
```bash
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_PRO=...
STRIPE_PRICE_STUDIO=...
```

### GitHub OAuth
```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://sua-url/api/auth/github/callback
```

### Email (SMTP)
```bash
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@cenastudio.com.br
```

### Cloudinary (Uploads)
```bash
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

**Documento criado**: 07/07/2026 12:20 PM
**Status**: Pronto para executar
**Tempo total**: 5-10 minutos

