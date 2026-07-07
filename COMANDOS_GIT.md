# 📤 COMANDOS GIT - Subir para GitHub

**Repo**: cenastudio/Cenastudio
**Branch**: main

---

## ⚡ COMANDOS (Copiar e Colar)

```bash
# 1. Ver status atual
git status

# 2. Adicionar todos os arquivos (limpeza que fizemos)
git add .

# 3. Commit com mensagem descritiva
git commit -m "chore: cleanup and prepare for production deploy

- Remove dados demo do banco
- Remove configurações antigas do Vercel
- Remove backups e arquivos temporários
- Remove scripts já executados
- Gera credenciais de produção
- Atualiza git remote para cenastudio/Cenastudio
- Sistema 100% limpo e pronto para deploy"

# 4. Push para o repositório
git push origin main
```

---

## 🔍 SE DER ERRO DE AUTENTICAÇÃO

Se aparecer erro de senha/token:

### Opção 1: Usar token GitHub
```bash
# Gerar token: https://github.com/settings/tokens
# Copiar token e usar no lugar da senha quando pedir
git push origin main
```

### Opção 2: Configurar GitHub CLI
```bash
# Se tiver gh CLI instalado
gh auth login
git push origin main
```

---

## 🔍 SE O REPO ESTIVER VAZIO (Primeiro Push)

Se o repo `cenastudio/Cenastudio` for novo:

```bash
# Push inicial (com -u para configurar upstream)
git push -u origin main
```

---

## 🔍 SE JÁ TIVER CÓDIGO NO REPO REMOTO

Se o repo já tiver commits que você não tem local:

```bash
# Opção 1: Pull primeiro (recomendado)
git pull origin main --rebase
git push origin main

# Opção 2: Force push (CUIDADO! Só se tiver certeza)
git push origin main --force
```

---

## ✅ VERIFICAÇÃO PÓS-PUSH

Depois do push, verificar:

```bash
# Ver último commit
git log --oneline -1

# Confirmar remote
git remote -v
```

Abrir no navegador:
```
https://github.com/cenastudio/Cenastudio
```

Deve aparecer seu código atualizado!

---

## 🚀 APÓS PUSH → DEPLOY RAILWAY

Depois que subir pro GitHub:

1. Railway conecta ao repo `cenastudio/Cenastudio`
2. Detecta código automaticamente
3. Adiciona 9 variáveis
4. Deploy!

---

## 📋 ORDEM COMPLETA

```bash
# 1. Commit e push
git status
git add .
git commit -m "chore: cleanup and prepare for production deploy"
git push origin main

# 2. Verificar no GitHub
# Abrir: https://github.com/cenastudio/Cenastudio

# 3. Deploy Railway
# Ir em: https://railway.app
# New Project → GitHub → cenastudio/Cenastudio
# Variables → Copiar de DEPLOY_AGORA.md
```

---

## ⚠️ IMPORTANTE - .gitignore

Antes do push, confirmar que `.env` NÃO vai:

```bash
# Ver o que vai ser commitado
git status

# NÃO deve aparecer:
# ❌ .env
# ❌ .env.local
# ❌ .env.production

# Deve aparecer apenas:
# ✅ .env.example
```

Se aparecer `.env` na lista:
```bash
# Remover do staging
git reset .env
git reset .env.local
git reset .env.production
```

---

## ✅ CHECKLIST PRÉ-PUSH

```
[ ] git status não mostra .env
[ ] git status não mostra node_modules
[ ] Todos arquivos de limpeza commitados
[ ] Commit message descritivo
[ ] Remote aponta para cenastudio/Cenastudio
```

---

**Pronto para executar!** 🚀

