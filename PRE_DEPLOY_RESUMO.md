# 🚀 RESUMO PRÉ-DEPLOY - Ações Obrigatórias

**Data**: 07/07/2026 11:35 AM
**Objetivo**: Checklist rápido antes de fazer deploy

---

## ✅ O QUE ESTÁ OK (Não precisa mexer)

1. ✅ **`.gitignore` protegendo secrets** - Todos `.env*` ignorados
2. ✅ **Nenhum secret hardcoded** - Tudo via `process.env`
3. ✅ **Console.log aceitáveis** - Apenas logs de sistema
4. ✅ **Build funcionando** - Testado e OK
5. ✅ **`.env.example` documentado** - Template limpo

---

## 🔥 O QUE PRECISA FAZER AGORA

### 1. LIMPAR BANCO DE PRODUÇÃO (CRÍTICO!)

**Problema**: Banco Supabase tem dados DEMO que aplicamos hoje
- 5 clientes fictícios (Atlântica, TechXYZ, etc.)
- 4 projetos demo
- 20 lançamentos financeiros fake
- 5 oportunidades de teste

**Solução**:
```bash
npx tsx scripts/clean-production-data.ts
```

Este script vai:
- ❌ Deletar TODOS dados demo
- ✅ Manter estrutura (tabelas)
- ✅ Manter planos (free, pro, studio)
- ✅ Manter tools (12 ferramentas IA)
- ✅ Manter admins reais

**Tempo**: 1 minuto

---

### 2. DELETAR BACKUPS LOCAIS (Recomendado)

```bash
# Deletar pasta de backup com credenciais
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/

# Deletar .env temporários
rm -f .env.*.backup
rm -f .env.*.tmp
rm -f .env.*.check
rm -f .env.*.temp
```

**Motivo**: Evitar confusão e exposição acidental

**Tempo**: 10 segundos

---

### 3. DELETAR SCRIPTS TEMPORÁRIOS (Opcional)

```bash
rm -f add-progress-column.mjs
rm -f check-user-data.mjs
rm -f check-users.mjs
rm -f apply-seed.mjs
rm -f apply-seed-simple.ts
rm -f apply-seed-simple.mjs
sync-supabase-db.mjs
test-all-features.mjs
```

**Motivo**: Limpeza, não são necessários em produção

**Tempo**: 10 segundos

---

## 📋 CHECKLIST RÁPIDO

Antes de fazer `git push` e deploy:

```bash
# 1. Banco limpo?
npx tsx scripts/clean-production-data.ts

# 2. .env não está no git?
git status | grep ".env"
# ✅ Não deve aparecer nada

# 3. Build funciona?
npm run build
# ✅ Deve completar sem erros

# 4. Verificar usuários no banco
node check-users.mjs
# ✅ Deve mostrar apenas admins reais, sem dados demo
```

---

## 🎯 DEPOIS DA LIMPEZA

### Verificação Final

Execute este comando para confirmar:
```bash
node check-users.mjs
```

**Deve mostrar**:
```
👤 Usuários no banco:
════════════════════════════════════════
ID: 5 | Email: elytraprod@gmail.com | Name: elytraprod | Role: admin
ID: 6 | Email: admin@cenastudio.com.br | Name: Admin | Role: admin
ID: 175 | Email: doesnotzero@cenastudio.com.br | Name: Does not zero | Role: admin

📊 Clientes: 0  ✅
📁 Projetos: 0  ✅
💼 Oportunidades: 0  ✅
```

---

## 🚀 PRONTO PARA DEPLOY

### Após limpeza, seguir:

1. **Commit e Push**
   ```bash
   git add .
   git commit -m "chore: cleanup for production deploy"
   git push origin main
   ```

2. **Deploy Railway** (40 min)
   - Seguir `RAILWAY_CORRECAO.md`
   - Adicionar variáveis de ambiente
   - Adicionar `NODE_VERSION=20.19.0`

3. **Ou Deploy Vercel** (30 min)
   - Tentar quick fix
   - Se falhar → Railway

---

## ⚠️ IMPORTANTE

### O Que NÃO Fazer

- ❌ **NÃO** rodar `apply-seed-final.ts` no banco de produção
- ❌ **NÃO** commitar arquivos `.env*` (exceto `.env.example`)
- ❌ **NÃO** deixar dados demo no banco
- ❌ **NÃO** usar senhas fracas em produção (trocar admin123)

### O Que Fazer em Produção

- ✅ Gerar novo `JWT_SECRET` forte
- ✅ Trocar senha padrão dos admins
- ✅ Monitorar logs no primeiro dia
- ✅ Testar todas funcionalidades principais

---

## 📊 RESUMO EXECUTIVO

| Item | Status | Ação |
|------|--------|------|
| Secrets protegidos | ✅ OK | Nenhuma |
| Build funcionando | ✅ OK | Nenhuma |
| Banco limpo | ❌ FAZER | Rodar `clean-production-data.ts` |
| Backups removidos | ⚠️ Recomendado | Deletar pasta backup |
| Scripts temporários | ⚠️ Opcional | Deletar se quiser |

---

## 🎬 ORDEM DE EXECUÇÃO

```bash
# 1. Limpar banco (OBRIGATÓRIO)
npx tsx scripts/clean-production-data.ts

# 2. Verificar limpeza
node check-users.mjs

# 3. Deletar backups (recomendado)
rm -rf CenaStudio-Credenciais-Backup-2026-06-30/
rm -f .env.*.backup .env.*.tmp

# 4. Verificar git
git status | grep ".env"

# 5. Commit
git add .
git commit -m "chore: production ready"
git push

# 6. Deploy!
# Seguir RAILWAY_CORRECAO.md ou tentar Vercel
```

---

## ✅ PRONTO!

Após seguir esses passos:
- ✅ Banco limpo (sem dados demo)
- ✅ Secrets protegidos
- ✅ Build funcional
- ✅ Código no GitHub atualizado

**Tempo total**: ~5 minutos

**Próximo passo**: DEPLOY! 🚀

---

**Documento criado**: 07/07/2026 11:35 AM
**Responsável**: Kiro AI Assistant
**Status**: Ready to execute
