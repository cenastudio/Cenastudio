# 🧹 LIMPEZA DE CONFIGURAÇÕES DE DEPLOY

**Data**: 07/07/2026
**Objetivo**: Remover configurações antigas que podem causar conflito no deploy

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. Pasta `.vercel/` com Configurações Antigas

**Encontrado:**
```json
// .vercel/project.json (Projeto 1)
"projectId": "prj_1wZ0uXNrJCPmjoueJsXqkY9OFPuG"
"orgId": "team_nRniUJogaZV2jF2LkYh4yaAe"
"projectName": "cenastudio"

// .vercel/repo.json (Projeto 2 - DIFERENTE!)
"id": "prj_XSyby5utPKeYoKKMgfGi2f1z3TB0"
"name": "cena-studio-prod"
"orgId": "team_0ta6rNgoPiCfEXiG4SdEyqIN"  ← ORG DIFERENTE!
```

**Problema**: 2 projetos Vercel diferentes em 2 orgs diferentes!

---

### 2. Git Remotes Duplicados

**Encontrado:**
```bash
origin      https://github.com/cenastudio/cena-studio-prod.git
production  https://github.com/doesnotzero/cenastudio.git
```

**Problema**: 2 repos GitHub diferentes! Qual é o correto?

---

### 3. Arquivos .env Temporários

**Encontrado:**
```
.env.migration.tmp
.env.production.backup
.env.vercel.check
.env.vercel.production
.env.vercel.temp
```

**Problema**: Backups antigos que podem confundir

---

### 4. Backup de Credenciais Antigo

**Encontrado:**
```
CenaStudio-Credenciais-Backup-2026-06-30/
```

**Problema**: Pasta com credenciais antigas

---

### 5. Scripts Temporários

**Encontrado:**
```
add-progress-column.mjs
check-user-data.mjs
check-users.mjs
apply-seed.mjs
sync-supabase-db.mjs
test-all-features.mjs
etc.
```

---

## 🔧 SOLUÇÃO - Limpeza Completa

### PASSO 1: Deletar Configurações do Vercel

```bash
# Deletar pasta .vercel (configurações antigas)
rm -rf .vercel/
```

**Por quê?**
- Você vai usar Railway, não Vercel
- As configurações estão conflitantes (2 projetos diferentes)
- Se quiser usar Vercel depois, ele vai criar novo

---

### PASSO 2: Limpar Git Remotes (SE NECESSÁRIO)

Primeiro, **confirmar qual repo é o correto**:

**Opção A: `doesnotzero/cenastudio` (production)**
```bash
# Remover origin antigo
git remote remove origin

# Renomear production para origin
git remote rename production origin
```

**Opção B: `cenastudio/cena-studio-prod` (origin)**
```bash
# Remover production
git remote remove production
```

⚠️ **IMPORTANTE**: Você precisa decidir qual repo usar:
- `cenastudio/cena-studio-prod` (org)
- `doesnotzero/cenastudio` (pessoal)

---

### PASSO 3: Deletar .env Temporários

```bash
# Deletar backups e temporários
rm -f .env.migration.tmp
rm -f .env.production.backup
rm -f .env.vercel.check
rm -f .env.vercel.production
rm -f .env.vercel.temp
```

---

### PASSO 4: Deletar Backup de Credenciais

```bash
# Deletar pasta de backup antiga
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
```

---

### PASSO 5: Deletar Scripts Temporários

```bash
# Scripts que já foram executados
rm -f add-progress-column.mjs
rm -f check-user-data.mjs
rm -f check-users.mjs
rm -f apply-seed.mjs
rm -f sync-supabase-db.mjs
rm -f test-all-features.mjs
rm -f apply-full-migration.mjs
rm -f run-migration.mjs
```

---

## ⚡ SCRIPT DE LIMPEZA COMPLETA

Copie e execute tudo de uma vez:

```bash
cd /Users/danteelytra/coding-dev/cenastudio

# 1. Deletar configurações Vercel
rm -rf .vercel/

# 2. Deletar .env temporários
rm -f .env.migration.tmp
rm -f .env.production.backup
rm -f .env.vercel.check
rm -f .env.vercel.production
rm -f .env.vercel.temp

# 3. Deletar backup de credenciais
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/

# 4. Deletar scripts temporários
rm -f add-progress-column.mjs
rm -f check-user-data.mjs
rm -f check-users.mjs
rm -f apply-seed.mjs
rm -f sync-supabase-db.mjs
rm -f test-all-features.mjs
rm -f apply-full-migration.mjs
rm -f run-migration.mjs

# 5. Verificar o que foi deletado
echo "✅ Limpeza concluída!"
```

---

## 🤔 DECISÃO NECESSÁRIA: Git Remote

**Você precisa escolher qual repo usar:**

### Opção A: Repo Pessoal (doesnotzero)
```bash
# Ver qual é o atual origin
git remote -v

# Se origin for cenastudio/cena-studio-prod:
git remote remove origin
git remote rename production origin

# Verificar
git remote -v
# Deve mostrar apenas:
# origin  https://github.com/doesnotzero/cenastudio.git
```

### Opção B: Repo da Org (cenastudio)
```bash
# Manter origin atual e remover production
git remote remove production

# Verificar
git remote -v
# Deve mostrar apenas:
# origin  https://github.com/cenastudio/cena-studio-prod.git
```

**Qual usar?**
- **Pessoal (doesnotzero)**: Você tem controle total
- **Org (cenastudio)**: Se for compartilhado com equipe

---

## ✅ VERIFICAÇÃO PÓS-LIMPEZA

```bash
# 1. Verificar que .vercel foi deletado
ls -la | grep ".vercel"
# Não deve aparecer nada

# 2. Verificar git remotes
git remote -v
# Deve ter apenas 1 origin

# 3. Verificar .env temporários deletados
ls -la | grep ".env.*"
# Deve mostrar apenas: .env, .env.local, .env.production, .env.example

# 4. Verificar backup deletado
ls -la | grep "Credenciais-Backup"
# Não deve aparecer nada

# 5. Status git limpo
git status
```

---

## 📋 CHECKLIST COMPLETO

```
✅ Limpeza de Dados
   ✅ Dados demo deletados
   [ ] Usuários de teste deletados (próximo)

✅ Credenciais
   ✅ JWT_SECRET gerado
   ✅ Admin Password gerado

🧹 Limpeza de Configs (AGORA)
   [ ] .vercel/ deletado
   [ ] Git remote decidido e limpo
   [ ] .env temporários deletados
   [ ] Backup credenciais deletado
   [ ] Scripts temporários deletados

⚠️ Usuários de Teste
   [ ] npx tsx scripts/clean-test-users.ts

🚀 Deploy Railway
   [ ] Projeto criado
   [ ] Variáveis adicionadas
   [ ] Deploy completo
```

---

## 🎯 ORDEM DE EXECUÇÃO

```bash
# 1. LIMPEZA DE CONFIGS (execute o script acima)
# ... todos os comandos rm ...

# 2. DECISÃO GIT REMOTE
# Escolher: doesnotzero OU cenastudio
# git remote remove ...

# 3. COMMIT LIMPEZA
git add .
git commit -m "chore: cleanup configs and temp files for production"
git push origin main

# 4. LIMPAR USUÁRIOS DE TESTE
npx tsx scripts/clean-test-users.ts

# 5. DEPLOY RAILWAY
# Adicionar 9 variáveis de CREDENCIAIS_PRODUCAO.md
```

---

## ⚠️ IMPORTANTE

### Sobre Vercel
Se deletar `.vercel/` e quiser usar Vercel no futuro:
- ✅ Vercel CLI vai criar novo na primeira conexão
- ✅ Você escolhe o projeto correto na hora
- ✅ Sem risco de conflito com configs antigas

### Sobre Git Remote
Railway funciona com qualquer repo GitHub:
- ✅ Funciona com `doesnotzero/cenastudio`
- ✅ Funciona com `cenastudio/cena-studio-prod`
- ⚠️ Mas precisa ter apenas 1 origin configurado

---

**Documento criado**: 07/07/2026 12:40 PM
**Próxima ação**: Executar script de limpeza + decidir git remote

