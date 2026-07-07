# 🚀 Deploy no Railway - Passo a Passo SIMPLES

## ✅ O que já está pronto:

- ✅ Código preparado para produção
- ✅ GitHub conectado ao Railway
- ✅ Cloudinary configurado e testado
- ✅ Scripts de build corrigidos

---

## 📋 Checklist Rápido (5 passos):

### 1️⃣ Adicionar PostgreSQL no Railway (2 min)

1. Acesse: https://railway.app/project/2dade05a-97e9-473c-936e-c9667b6732535528b051-9fc1-4aa5-a12e-4c46612dc718
2. Clique em **"+ New"**
3. Selecione **"Database"**
4. Escolha **"Add PostgreSQL"**
5. Aguarde ~30 segundos (vai criar automaticamente)

✅ **Pronto!** A variável `DATABASE_URL` será criada automaticamente.

---

### 2️⃣ Gerar JWT Secret (1 min)

No seu terminal, execute:

```bash
openssl rand -base64 32
```

**Copie o resultado** (exemplo: `Xk7s9Pq2m...`), vamos usar no próximo passo.

---

### 3️⃣ Adicionar Variáveis de Ambiente (3 min)

1. No Railway Dashboard do seu projeto
2. Clique no serviço **"cena-studio-prod"**
3. Vá na aba **"Variables"**
4. Clique em **"Raw Editor"**
5. Abra o arquivo: `RAILWAY_ENV_VARS.txt` (está na raiz do projeto)
6. **Copie TUDO** do arquivo
7. **Cole** no Raw Editor do Railway
8. **Substitua** os placeholders:
   - `<COLAR_RESULTADO_DO_COMANDO_ACIMA>` → Cole o JWT que você gerou
   - `seu-email@dominio.com` → Seu email real
   - `<CRIAR_SENHA_FORTE_12_CHARS>` → Uma senha forte (ex: `Admin@2024Cena`)
   - Deixe os campos de OpenRouter e Stripe vazios por enquanto (vamos adicionar depois)

9. Clique em **"Save"** (canto superior direito)

---

### 4️⃣ Fazer Commit e Push (2 min)

No terminal:

```bash
# Ver o que mudou
git status

# Adicionar tudo
git add .

# Commit
git commit -m "feat: preparar código para deploy Railway"

# Push
git push origin main
```

✅ **Railway vai detectar automaticamente e iniciar o deploy!**

---

### 5️⃣ Acompanhar Deploy (3-5 min)

1. No Railway Dashboard, você verá o build acontecendo
2. Clique em **"View Logs"** para acompanhar
3. Aguarde até ver: **"✓ Build successful"**
4. Depois: **"✓ Deploy successful"**

---

## 🎯 O que vai funcionar AGORA:

✅ **Frontend** (React + Vite)
✅ **Backend** (Express + API)
✅ **Database** (PostgreSQL)
✅ **Upload de arquivos** (Cloudinary)

## ❌ O que NÃO vai funcionar ainda:

- ❌ Geração de IA (precisa OpenRouter)
- ❌ Pagamentos (precisa Stripe)

**Mas tá tudo bem!** Podemos adicionar depois.

---

## 🌐 Obter URL do App

Depois do deploy bem-sucedido:

1. No Railway Dashboard
2. Clique no serviço **"cena-studio-prod"**
3. Vá na aba **"Settings"**
4. Role até **"Domains"**
5. Clique em **"Generate Domain"**
6. Railway vai gerar algo como: `cena-studio-prod.up.railway.app`

✅ **Essa é sua URL pública!** Pode testar no navegador.

---

## 🧪 Testar o App

Acesse a URL gerada e teste:

1. **Landing page**: Deve carregar normalmente
2. **Criar conta**: Funciona (PostgreSQL)
3. **Login**: Funciona
4. **Upload de imagem**: Funciona (Cloudinary)
5. **IA**: Vai dar erro (esperado - falta OpenRouter)
6. **Pagamento**: Vai dar erro (esperado - falta Stripe)

---

## 🔄 Próximos Passos (DEPOIS do deploy):

1. ✅ Criar conta OpenRouter
2. ✅ Adicionar API Key nas variáveis
3. ✅ Fazer redeploy (Railway detecta automaticamente)
4. ✅ Criar conta Stripe
5. ✅ Adicionar Keys do Stripe
6. ✅ Configurar webhook do Stripe
7. ✅ Testar pagamentos

---

## ❓ Troubleshooting

### Build falhou?

**Ver os logs:**
```bash
Railway Dashboard > Deployments > Último deploy > View Logs
```

**Erros comuns:**

1. **"Cannot find module"**: Falta dependência
   - Solução: Adicionar no `package.json` e push

2. **"DATABASE_URL is not defined"**: PostgreSQL não foi adicionado
   - Solução: Adicionar PostgreSQL no step 1

3. **"Port already in use"**: Conflito de porta
   - Solução: Railway usa `PORT` automaticamente, não precisa fazer nada

---

## 📞 Precisa de Ajuda?

**Me avisa quando:**
- ✅ PostgreSQL for adicionado
- ✅ Variáveis forem configuradas
- ✅ Push for feito

**E eu te ajudo a:**
- Debugar erros de build
- Configurar domínio customizado
- Adicionar OpenRouter e Stripe

---

## 🎉 Resumo do que você vai fazer AGORA:

```
1. Adicionar PostgreSQL no Railway      ← 2 min
2. Gerar JWT Secret                     ← 1 min
3. Colar variáveis no Railway           ← 3 min
4. git add . && git commit && git push  ← 2 min
5. Aguardar deploy (tomar café)         ← 3-5 min
```

**Total: ~15 minutos e seu app está no ar!** 🚀

Bora? Me avisa quando começar! 💪
