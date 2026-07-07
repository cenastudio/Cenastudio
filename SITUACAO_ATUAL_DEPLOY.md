# 📍 SITUAÇÃO ATUAL - Deploy CenaStudio

**Data**: 07/07/2026 12:15 PM
**Status**: ⚠️ **AÇÃO NECESSÁRIA ANTES DO DEPLOY**

---

## 🎯 RESPOSTA ÀS SUAS PERGUNTAS

### 1. "Como vai ser o primeiro deploy, não faz sentido ainda ter todos env, correto?"

**✅ CORRETO!** Você está 100% certo.

Para o **primeiro deploy** você só precisa de **9 variáveis**:

#### OBRIGATÓRIAS (6):
1. `NODE_ENV=production`
2. `PORT=3000`
3. `DATABASE_URL=postgresql://...` (seu Supabase atual)
4. `JWT_SECRET=<NOVO-FORTE>` ⚠️ **Gerar novo!**
5. `CLIENT_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}}`
6. `ADMIN_DEFAULT_PASSWORD=<SENHA-FORTE>` ⚠️ **Trocar admin123!**

#### RECOMENDADAS (3):
7. `NODE_VERSION=20.19.0` (Railway precisa)
8. `OPENROUTER_API_KEY=sk-or-v1-3d781817...` (sua atual)
9. `AI_PROVIDER=openrouter`

**O RESTO É OPCIONAL e pode adicionar depois:**
- ❌ Stripe (pagamentos) → Adicionar quando configurar
- ❌ GitHub OAuth → Adicionar se quiser
- ❌ SMTP (emails) → Adicionar quando precisar
- ❌ Cloudinary (uploads) → Adicionar quando precisar

---

### 2. "Aquele seed-demo-data.ts também tem data, ele tem que estar virgem, correto?"

**✅ EXATAMENTE!** Você entendeu perfeitamente.

O banco de produção **DEVE ESTAR VIRGEM** (limpo).

#### 📊 Situação Atual do Banco Supabase:

**Conta `admin@cenastudio.com.br`** → ❌ **TEM DADOS DEMO**
- 5 clientes fictícios (Atlântica, TechXYZ, Harmonia, Gustavo Reis, Instituto Raízes)
- 4 projetos demo
- 20 lançamentos financeiros fake
- 5 oportunidades de teste
- 12 arquivos demo
- 2 video reviews
- 4 comentários
- 2 colaboradores
- 5 estados de projeto IA

**Conta `elytraprod@gmail.com`** → ✅ **LIMPO** (removemos os dados reais antes)

#### 🎯 O Que Fazer:

**ANTES DO DEPLOY**, executar:
```bash
npx tsx scripts/clean-production-data.ts
```

Este script vai:
- ❌ **DELETAR** todos dados demo (clientes, projetos, interações, etc.)
- ✅ **MANTER** estrutura do banco (tabelas, colunas)
- ✅ **MANTER** planos (free, pro, studio)
- ✅ **MANTER** tools (12 ferramentas IA)
- ✅ **MANTER** admins reais (`elytraprod@gmail.com`, `admin@cenastudio.com.br`)

---

## 📋 CHECKLIST PRÉ-DEPLOY

### 🔥 CRÍTICO (Fazer AGORA)

- [ ] **1. Limpar banco de produção**
  ```bash
  npx tsx scripts/clean-production-data.ts
  ```
  **Tempo**: 1 minuto
  **Por quê**: Remover dados demo do banco

- [ ] **2. Gerar novo JWT_SECRET**
  ```bash
  openssl rand -base64 32
  ```
  **Output exemplo**: `K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=`

  **Por quê**: `JWT_SECRET` atual é fraco e de dev

- [ ] **3. Gerar senha admin forte**
  ```bash
  openssl rand -base64 16
  ```
  **Output exemplo**: `P9wX2vM8nL5kR4sT`

  **⚠️ GUARDAR ESSA SENHA!** Você vai precisar para login:
  - Email: `admin@cenastudio.com.br`
  - Senha: `P9wX2vM8nL5kR4sT`

### ⚠️ RECOMENDADO (Antes do deploy)

- [ ] **4. Deletar backups locais**
  ```bash
  rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
  rm -f .env.*.backup .env.*.tmp .env.*.check .env.*.temp
  ```
  **Por quê**: Evitar confusão e exposição acidental

- [ ] **5. Deletar scripts temporários**
  ```bash
  rm -f check-user-data.mjs check-users.mjs add-progress-column.mjs
  rm -f apply-seed.mjs apply-seed-simple.ts apply-seed-simple.mjs
  ```
  **Por quê**: Limpeza, não são necessários

- [ ] **6. Verificar que .env não está no git**
  ```bash
  git status | grep ".env"
  ```
  **Esperado**: Não deve aparecer nada

---

## 🚀 DEPLOY NO RAILWAY

### Variáveis a Configurar (9 apenas):

```bash
# === OBRIGATÓRIAS (6) ===
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:Opim2995cenastudio@db.vylxwhuuqluloxkhlsmd.supabase.co:5432/postgres
JWT_SECRET=<NOVO-GERADO>
CLIENT_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}}
ADMIN_DEFAULT_PASSWORD=<SENHA-FORTE-GERADA>

# === RECOMENDADAS (3) ===
NODE_VERSION=20.19.0
OPENROUTER_API_KEY=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
AI_PROVIDER=openrouter
```

### Passos Railway:

1. **Criar novo projeto no Railway**
2. **Conectar GitHub repo**
3. **Adicionar as 9 variáveis acima**
4. **Deploy automático** 🚀

Railway vai gerar URL tipo: `cenastudio-production-abc123.up.railway.app`

---

## 📊 VERIFICAÇÃO PÓS-LIMPEZA

Após executar `npx tsx scripts/clean-production-data.ts`, o banco deve ter:

### ✅ O Que Deve TER:
- 3 usuários admins (elytraprod, admin, doesnotzero)
- 3 planos (free, pro, studio)
- 12 ferramentas IA (tools)
- Estrutura completa (27 tabelas)

### ❌ O Que NÃO Deve TER:
- 0 clientes
- 0 projetos
- 0 oportunidades
- 0 interações
- 0 lançamentos financeiros
- 0 arquivos
- 0 video reviews
- 0 comentários
- 0 colaboradores

---

## 🎯 ORDEM DE EXECUÇÃO

```bash
# 1. Limpar banco (OBRIGATÓRIO)
npx tsx scripts/clean-production-data.ts

# 2. Gerar JWT_SECRET novo
openssl rand -base64 32
# Copiar output: K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=

# 3. Gerar senha admin forte
openssl rand -base64 16
# Copiar output: P9wX2vM8nL5kR4sT

# 4. Deletar backups (recomendado)
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
rm -f .env.*.backup .env.*.tmp .env.*.check .env.*.temp

# 5. Deletar scripts temporários (opcional)
rm -f check-user-data.mjs check-users.mjs add-progress-column.mjs
rm -f apply-seed.mjs apply-seed-simple.ts apply-seed-simple.mjs

# 6. Verificar git
git status | grep ".env"
# Não deve aparecer nada

# 7. Commit limpeza
git add .
git commit -m "chore: cleanup for production deploy"
git push origin main

# 8. Deploy no Railway!
# - Criar projeto
# - Conectar GitHub
# - Adicionar 9 variáveis (copiar JWT e senha gerados acima)
# - Deploy automático
```

**Tempo total**: ~10 minutos

---

## ⚠️ IMPORTANTE GUARDAR

### Credenciais Geradas (exemplo):

```bash
# JWT_SECRET (adicionar no Railway)
K7xPq2wNm9vL4sR8T6yU1oP3nM5jH8iG=

# ADMIN_DEFAULT_PASSWORD (adicionar no Railway)
P9wX2vM8nL5kR4sT

# Primeiro login após deploy:
Email: admin@cenastudio.com.br
Senha: P9wX2vM8nL5kR4sT
URL: https://cenastudio-production-abc123.up.railway.app
```

---

## 🔐 SEGURANÇA

### ✅ O Que Está Protegido:
- `.gitignore` protege todos `.env*`
- Nenhum secret hardcoded no código
- Build testado e funcional
- Console.log apenas para logs de sistema

### ⚠️ O Que Precisa Trocar:
- ❌ `JWT_SECRET` atual é de dev → Gerar novo
- ❌ `ADMIN_DEFAULT_PASSWORD=admin123` → Trocar por forte
- ❌ Dados demo no banco → Limpar com script

---

## 📚 DOCUMENTOS RELACIONADOS

- `ENV_MINIMO_DEPLOY.md` - Detalhes das variáveis mínimas
- `PRE_DEPLOY_RESUMO.md` - Checklist completo
- `CHECKLIST_PRE_DEPLOY.md` - Análise de segurança
- `scripts/clean-production-data.ts` - Script de limpeza
- `.env.example` - Template de variáveis

---

## 🎉 RESUMO EXECUTIVO

### Você Está Certo em Ambas as Questões:

1. ✅ **Não precisa de TODOS os ENV no primeiro deploy** → Apenas 9 variáveis
2. ✅ **Banco deve estar VIRGEM** → Executar script de limpeza

### Próximo Passo:

**Execute os 8 comandos na ordem acima** e você estará pronto para deploy! 🚀

---

**Status**: Pronto para executar → Deploy
**Plataforma**: Railway (recomendado)
**Tempo estimado**: 10 minutos

