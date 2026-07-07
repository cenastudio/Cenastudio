# 📝 Setup de Contas - Checklist Rápido

## ✅ Contas para Criar AGORA

### 1. Railway (Hospedagem) - ✅ CONCLUÍDO
🔗 https://railway.app

**Credenciais coletadas:**
   - Projeto: `cena-studio-prod`
   - Project ID: `2dade05a-97e9-473c-936e-c9667b6732535528b051-9fc1-4aa5-a12e-4c46612dc718`
   - Token: `5528b051-9fc1-4aa5-a12e-4c46612dc718`

**Custo:** $5/mês (primeiro mês grátis com $5 de crédito)

---

### 2. Cloudinary (Storage) - ✅ CONCLUÍDO
🔗 https://cloudinary.com/users/register_free

**Credenciais coletadas:**
   - Cloud Name: `tlfxvneq`
   - API Key: `616546241273315`
   - API Secret: `1LR3bMh83L6kLtMxkkdII4HqFfc`

**Custo:** GRÁTIS (free tier: 25GB)

---

### 3. OpenRouter (IA) - 2 minutos
🔗 https://openrouter.ai

**Passos:**
1. Login com Google
2. Ir em: https://openrouter.ai/keys
3. Criar API Key
4. **ANOTAR:**
   - API Key: `_______________`
5. Adicionar créditos: https://openrouter.ai/credits
   - Recomendado inicial: $10 (dura ~500 gerações)

**Custo:**
- Free tier com modelos gratuitos
- Pagos: ~$0,02 por geração (Claude Sonnet)

---

### 4. Stripe (Pagamentos) - 10 minutos
🔗 https://dashboard.stripe.com/register

**Passos:**
1. Criar conta
2. Completar verificação (CPF/CNPJ)
3. Ir em: Developers > API Keys
4. **ANOTAR:**
   - Publishable key (pk_test_...): `_______________`
   - Secret key (sk_test_...): `_______________`

5. Criar produtos:
   - Dashboard > Products > Add Product
   - **Produto 1: Cena Studio Pro**
     - Nome: "Cena Studio Pro"
     - Preço: R$ 199,00/mês
     - Tipo: Recorrente
     - **ANOTAR Price ID:** `_______________`

   - **Produto 2: Cena Studio Studio**
     - Nome: "Cena Studio Studio"
     - Preço: R$ 399,00/mês
     - Tipo: Recorrente
     - **ANOTAR Price ID:** `_______________`

6. **Webhook** (configurar DEPOIS do deploy)
   - Voltar aqui quando tiver a URL: `https://cenastudio.dev/api/stripe/webhook`

**Custo:** GRÁTIS (só cobra % em vendas: 3,99% + R$0,39)

---

## 📋 Resumo das Credenciais

Copie e cole isso no seu gerenciador de senhas:

```
=== RAILWAY === ✅
Email: (conta GitHub vinculada)
Projeto: cena-studio-prod
Project ID: 2dade05a-97e9-473c-936e-c9667b6732535528b051-9fc1-4aa5-a12e-4c46612dc718
Token: 5528b051-9fc1-4aa5-a12e-4c46612dc718

=== CLOUDINARY === ✅
Email: (conta criada)
Cloud Name: tlfxvneq
API Key: 616546241273315
API Secret: 1LR3bMh83L6kLtMxkkdII4HqFfc

=== OPENROUTER === ✅
Email: (conta criada)
API Key: (configurada localmente)
Créditos adicionados: $0 (usando free tier)

=== STRIPE === ✅
Email: cenastudio@atomicmail.io
Publishable Key: (configurada - começa com pk_test_)
Secret Key: (configurada - começa com sk_test_)
Price ID Pro: price_1TqNLy1faUmxkSc94gWhv6Lr
Price ID Studio: price_1TqNLz1faUmxkSc9urdacAEt
Webhook Secret (depois do deploy): <CONFIGURAR_DEPOIS>
```

---

## 🚀 Depois de criar todas as contas:

1. ✅ Gerar JWT Secret:
   ```bash
   openssl rand -base64 32
   ```

2. ✅ Criar senhas fortes para admin/demo:
   - Admin: mínimo 12 caracteres
   - Demo: mínimo 12 caracteres

3. ✅ Preencher `.env.production` com todas as credenciais

4. ✅ Rodar deploy: `railway up`

---

## ⏱️ Tempo Total Estimado: 25 minutos

**Me avisa quando terminar de criar as contas que eu te ajudo com o próximo passo!** 🚀
