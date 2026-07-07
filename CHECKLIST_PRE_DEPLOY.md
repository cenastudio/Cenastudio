# ✅ CHECKLIST PRÉ-DEPLOY - CenaStudio

**Data**: 07/07/2026
**Objetivo**: Garantir que NADA sensível ou desnecessário vai para produção

---

## 🚨 CRÍTICO - SEGURANÇA

### 1. ✅ Variáveis de Ambiente

**Status**: ✅ CORRETO - `.gitignore` protege todos `.env*`

```gitignore
# .gitignore (VERIFICADO)
.env
.env.*
!.env.example
```

**Arquivos presentes localmente** (NÃO vão pro git):
- ✅ `.env` - Local dev (ignorado)
- ✅ `.env.local` - Local (ignorado)
- ✅ `.env.production` - Backup local (ignorado)
- ✅ `.env.vercel.*` - Backups Vercel (ignorado)
- ✅ `.env.migration.tmp` - Temporário (ignorado)

**Único arquivo versionado**:
- ✅ `.env.example` - Template SEM secrets ✅

---

### 2. 🔑 Secrets Encontrados no Código

#### ✅ Passwords de Teste (Aceitável)
```typescript
// server/services/authService.ts
process.env.ADMIN_DEFAULT_PASSWORD  // Configurável via .env ✅
process.env.DEMO_USER_PASSWORD      // Configurável via .env ✅

// scripts/smoke-prisma.mjs
const password = process.env.ADMIN_DEFAULT_PASSWORD || "admin123"; // Fallback local ✅
```

**Status**: ✅ SEGURO - Apenas fallbacks para dev/test

#### ✅ API Keys (Protegidas)
```typescript
// Todas via process.env ✅
OPENROUTER_API_KEY     // Via .env
JWT_SECRET             // Via .env
SUPABASE_URL           // Via .env
STRIPE_SECRET_KEY      // Via .env
GITHUB_CLIENT_SECRET   // Via .env
```

**Status**: ✅ SEGURO - Nenhuma hardcoded

---

### 3. 🗄️ DADOS DE TESTE NO BANCO

#### ❌ PROBLEMA IDENTIFICADO: Dados Demo no Supabase

**Situação Atual**:
```sql
-- Banco Supabase PRODUÇÃO tem dados DEMO:
✅ elytraprod@gmail.com   → LIMPO (removido pelo seed)
✅ admin@cenastudio.com.br → PREENCHIDO COM DADOS DEMO

Dados demo aplicados:
- 5 clientes (Atlântica, TechXYZ, etc.)
- 4 projetos
- 20 lançamentos financeiros
- 5 oportunidades
- etc.
```

#### 🎯 SOLUÇÃO OBRIGATÓRIA:

**Opção A: Limpar Banco Antes do Deploy** ⭐ RECOMENDADO
```bash
# Script para limpar TUDO exceto estrutura
npx tsx scripts/clean-production-data.ts
```

**Opção B: Usar Banco Vazio em Produção**
- Criar novo projeto Supabase só para produção
- Deixar banco atual para dev/staging

---

### 4. 📁 Arquivos que NÃO Devem ir para Deploy

#### ❌ Backups e Credenciais

**Encontrados**:
```
CenaStudio-Credenciais-Backup-2026-06-30/  ❌ REMOVER
├── .env.local
├── local.env.backup
└── vercel-production.env.backup

.env.production.backup              ❌ REMOVER
.env.migration.tmp                  ❌ REMOVER
.env.vercel.check                   ❌ REMOVER
.env.vercel.temp                    ❌ REMOVER
```

**Ação**: ✅ `.gitignore` já protege, mas deletar localmente

#### ❌ Documentação com Dados Sensíveis

**Encontrados neste .gitignore**:
```gitignore
SETUP_ACCOUNTS.md         ❌ Ignorado
STRIPE_SETUP.md           ❌ Ignorado
CREDENCIAIS_TEMPLATE.md   ❌ Ignorado
```

**Status**: ✅ Protegidos se existirem

---

### 5. 🗑️ Arquivos Temporários de Dev

**Encontrados** (não versionados, mas existem localmente):
```
ANALISE_DEPLOY_COMPLETA.md        → Docs de trabalho (OK manter)
CHECKLIST_AMANHA.txt              → Docs de trabalho (OK manter)
DECISAO_DEPLOY.txt                → Docs de trabalho (OK manter)
DIAGNOSTICO_DEPLOY.md             → Docs de trabalho (OK manter)
PERFORMANCE_EXPLICACAO.md         → Docs úteis (OK manter)
RAILWAY_CORRECAO.md               → Docs úteis (OK manter)
SESSAO_07_07_2026.md              → Histórico (OK manter)

add-progress-column.mjs           → Script executado (pode remover)
check-user-data.mjs               → Script temp (pode remover)
check-users.mjs                   → Script temp (pode remover)
apply-seed-final.ts               → Script de seed (OK manter)
apply-seed-simple.ts              → Script temp (remover)
apply-seed.mjs                    → Script temp (remover)
```

**Status**: ⚠️ Limpar scripts temporários

---

### 6. 🧹 Scripts de Seed/Demo

#### ❌ ATENÇÃO: Scripts que Populam Dados Demo

**Encontrados**:
```typescript
scripts/seed-demo-data.ts         → Popula SQLite (antigo, não usado)
scripts/seed-charts-data.ts       → Popula dados para gráficos
apply-seed-final.ts               → Script usado HOJE para popular
```

**Status**: ⚠️ **MANTER** mas **NÃO EXECUTAR** em produção

**Motivo**: São úteis para dev/staging, mas produção deve começar VAZIA

---

### 7. 📝 Console.log e Debug

**Encontrados**:
```typescript
// server/services/authService.ts
if (process.env.NODE_ENV !== "production") {
  console.log(`[DEV] Reset token for ${normalized}: ${token}`); ✅ Protegido
}

// server/services/stripeService.ts
console.log(`[Stripe] User ${userId} upgraded to ${planId}`); ⚠️ OK para logs
console.log(`[Stripe] User ${userId} downgraded to free`);    ⚠️ OK para logs

// server/utils/logger.ts
console.log(line); ✅ Sistema de log oficial
```

**Status**: ✅ ACEITÁVEL - Console.log para logs de produção é normal

---

## 📋 AÇÕES OBRIGATÓRIAS ANTES DO DEPLOY

### 🔥 CRÍTICAS (Fazer AGORA)

- [ ] **1. Limpar dados demo do Supabase**
  ```bash
  npx tsx scripts/clean-production-data.ts
  ```

- [ ] **2. Deletar backups locais de credenciais**
  ```bash
  rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
  rm -f .env.*.backup .env.*.tmp .env.*.check .env.*.temp
  ```

- [ ] **3. Deletar scripts temporários**
  ```bash
  rm -f add-progress-column.mjs
  rm -f check-user-data.mjs
  rm -f check-users.mjs
  rm -f apply-seed.mjs
  rm -f apply-seed-simple.ts
  rm -f apply-seed-simple.mjs
  ```

- [ ] **4. Verificar que .env não está no git**
  ```bash
  git status | grep ".env"  # Não deve aparecer nada
  ```

### ⚠️ IMPORTANTES (Antes de deploy)

- [ ] **5. Criar script de limpeza de dados**
  ```typescript
  // scripts/clean-production-data.ts
  // Limpa TUDO do banco exceto planos e tools
  ```

- [ ] **6. Testar build de produção**
  ```bash
  npm run build
  # Verificar que não há erros
  ```

- [ ] **7. Verificar variáveis de ambiente para produção**
  - Railway/Vercel: Adicionar TODAS as vars do `.env.example`
  - Trocar DATABASE_URL se usar banco diferente
  - Gerar novo JWT_SECRET para produção

### 👍 BOAS PRÁTICAS (Recomendado)

- [ ] **8. Adicionar .env.example com valores de exemplo**
  - ✅ Já existe

- [ ] **9. Documentar variáveis obrigatórias**
  ```markdown
  # README.md - Seção "Environment Variables"
  ```

- [ ] **10. Commit das mudanças limpas**
  ```bash
  git add .
  git commit -m "chore: cleanup before production deploy"
  git push
  ```

---

## 🎯 BANCO DE DADOS EM PRODUÇÃO

### Situação Atual

**Supabase** (db.vylxwhuuqluloxkhlsmd.supabase.co):
- ❌ Contém dados DEMO
- ❌ Aplicamos seed com 5 clientes, 4 projetos, etc.
- ❌ Conta admin tem dados fictícios

### Decisão: O Que Fazer?

#### Opção A: Limpar Banco Atual ⭐ RECOMENDADO
```sql
-- Mantém estrutura, remove dados
DELETE FROM video_comments;
DELETE FROM video_reviews;
DELETE FROM project_states;
DELETE FROM files;
DELETE FROM notifications;
DELETE FROM financial_entries;
DELETE FROM interactions;
DELETE FROM opportunities;
DELETE FROM collaborators;
DELETE FROM projects;
DELETE FROM clients;
-- Mantém: users (admin), plans, tools
```

**Vantagens**:
- Mesmo banco para dev e prod
- Estrutura já pronta
- Rápido

**Desvantagens**:
- Precisa ter cuidado para não popular novamente

#### Opção B: Criar Novo Banco Supabase
- Criar novo projeto "cenastudio-production"
- Rodar migrations
- Seed apenas de planos e tools (sem dados demo)

**Vantagens**:
- Separação clara dev/prod
- Sem risco de dados demo

**Desvantagens**:
- Mais trabalho
- Outro banco para gerenciar

### 🎯 Recomendação Final

**OPÇÃO A** - Limpar banco atual:
1. Criar script `clean-production-data.ts`
2. Executar antes do deploy
3. Verificar que ficou limpo
4. Deploy

---

## 📊 VERIFICAÇÃO FINAL

### Checklist de Segurança

```bash
# 1. Secrets no código?
grep -r "password.*=.*['\"]" server/ --exclude-dir=node_modules
# Deve retornar apenas env vars ✅

# 2. .env commitado?
git ls-files | grep "\.env$"
# Não deve retornar nada ✅

# 3. Dados sensíveis?
git grep -i "senha\|password\|secret\|token" | grep -v ".env.example"
# Verificar resultados

# 4. Banco limpo?
node check-users.mjs
# Verificar apenas usuários reais
```

---

## 🚀 PRONTO PARA DEPLOY?

### ✅ SIM, se:
- [x] Banco está limpo (sem dados demo)
- [x] .env* não está no git
- [x] Backups deletados localmente
- [x] Scripts temporários removidos
- [x] Build de produção funciona
- [x] Variáveis prontas para Railway/Vercel

### ❌ NÃO, se:
- [ ] Banco tem dados demo
- [ ] .env está commitado
- [ ] Secrets hardcoded no código
- [ ] Build falhando

---

## 📝 SCRIPT DE LIMPEZA

Vou criar o script agora para limpar o banco:

```typescript
// scripts/clean-production-data.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter });

async function cleanProductionData() {
  console.log('🧹 Limpando dados de produção...\n');

  // Limpa dados mantendo estrutura
  await prisma.videoComment.deleteMany();
  await prisma.videoReview.deleteMany();
  await prisma.projectState.deleteMany();
  await prisma.file.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.financialEntry.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();

  // Remove usuários demo/test, mantém apenas admins reais
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['demo@cenastudio.com.br']
      }
    }
  });

  console.log('✅ Banco limpo!');
  console.log('✅ Mantidos: users (admins), plans, tools');
}

cleanProductionData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

**Documento criado**: 07/07/2026 11:30 AM
**Status**: Checklist completo - Pronto para executar ações
**Próximo**: Executar limpeza e deploy
