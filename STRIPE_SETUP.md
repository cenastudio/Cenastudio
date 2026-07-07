# 💳 Stripe - Configuração Completa

## 📋 Informações para Criar a Conta Stripe

### Dados da Empresa/Negócio

```
Nome do negócio: Cena Studio
Tipo: SaaS (Software as a Service)
Categoria: Software de Gestão para Produtoras de Vídeo
Website: https://cenastudio.dev

Descrição do negócio:
Software de gestão completo para produtoras de vídeo que integra briefing,
roteiro, orçamento, produção, revisão de vídeos e entrega de projetos.
Inclui ferramentas de IA para automação de documentos e salas de review
colaborativas com comentários em vídeo.
```

---

## 🎯 Produtos para Criar no Stripe

### Produto 1: Cena Studio Pro

**Nome do produto:**
```
Cena Studio Pro
```

**Descrição no extrato (5-22 caracteres - aparece no cartão/banco do cliente):**
```
CENASTUDIO PRO
```
*Aparecerá como: "R$ 199,00 CENASTUDIO PRO"*

**Descrição completa:**
```
Plano Pro do Cena Studio - Software de gestão para produtoras de vídeo

Inclui:
• 15 clientes ativos + clientes adicionais
• 100 gerações de IA por mês
• Todas as ferramentas: Briefing, Roteiro, Orçamento, Cronograma, Produção
• Salas de review ilimitadas com comentários em vídeo
• Upload de arquivos (via Cloudinary)
• Suporte prioritário

Ideal para produtoras pequenas e médias que buscam organizar projetos
e economizar tempo com automação.
```

**Configurações:**
- Tipo: **Recorrente**
- Período: **Mensal**
- Preço: **R$ 199,00**
- Moeda: **BRL (Real Brasileiro)**
- Trial: **14 dias grátis** (opcional)

---

### Produto 2: Cena Studio Studio

**Nome do produto:**
```
Cena Studio Studio
```

**Statement descriptor:**
```
CENASTUDIO STUDIO
```
*Aparecerá como: "R$ 399,00 CENASTUDIO STUDIO"*

**Descrição completa:**
```
Plano Studio do Cena Studio - Solução completa para produtoras profissionais

Inclui:
• 50 clientes ativos + clientes adicionais ilimitados
• Gerações de IA ILIMITADAS
• Todas as ferramentas Pro +
• Prioridade máxima no suporte
• Relatórios e analytics avançados
• Integrações personalizadas (sob demanda)
• Onboarding dedicado

Ideal para produtoras grandes e agências que precisam de capacidade
total e suporte premium.
```

**Configurações:**
- Tipo: **Recorrente**
- Período: **Mensal**
- Preço: **R$ 399,00**
- Moeda: **BRL (Real Brasileiro)**
- Trial: **14 dias grátis** (opcional)

---

## 🔧 Passo a Passo Detalhado

### 1. Criar Conta Stripe

1. Acesse: https://dashboard.stripe.com/register
2. Preencha:
   - Email
   - Nome completo
   - Senha forte
3. Verificar email
4. Completar informações da empresa:
   - CPF ou CNPJ
   - Endereço
   - Telefone
   - Dados bancários para recebimento

---

### 2. Criar Produtos

#### No Dashboard Stripe:

1. Ir em: **Products** > **Add Product**

2. **Produto Pro:**
   - Nome: `Cena Studio Pro`
   - Descrição: (copiar acima)
   - **Statement descriptor (extrato):** `CENASTUDIO PRO` (15 caracteres)
   - Pricing:
     - Model: **Standard pricing**
     - Price: **R$ 199,00**
     - Billing period: **Monthly**
   - **Salvar**
   - **COPIAR O PRICE ID** (começa com `price_...`)

3. **Produto Studio:**
   - Nome: `Cena Studio Studio`
   - Descrição: (copiar acima)
   - **Statement descriptor (extrato):** `CENASTUDIO STUDIO` (17 caracteres)
   - Pricing:
     - Model: **Standard pricing**
     - Price: **R$ 399,00**
     - Billing period: **Monthly**
   - **Salvar**
   - **COPIAR O PRICE ID** (começa com `price_...`)

---

### 3. Obter API Keys

1. Ir em: **Developers** > **API Keys**
2. Copiar:
   - **Publishable key** (começa com `pk_test_...`)
   - **Secret key** (começa com `sk_test_...`)
   - ⚠️ **GUARDAR EM LOCAL SEGURO!**

---

### 4. Configurar Webhook (DEPOIS DO DEPLOY)

⚠️ **ATENÇÃO:** Fazer isso SOMENTE depois do app estar no ar!

1. Ir em: **Developers** > **Webhooks**
2. Clicar em **Add endpoint**
3. URL: `https://cenastudio.dev/api/stripe/webhook`
4. Eventos para ouvir:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Salvar**
6. **COPIAR O WEBHOOK SECRET** (começa com `whsec_...`)

---

## 📝 Checklist de Credenciais

Depois de criar tudo, você terá:

```
✅ Publishable Key: pk_test_...
✅ Secret Key: sk_test_...
✅ Price ID Pro: price_...
✅ Price ID Studio: price_...
⏳ Webhook Secret: whsec_... (depois do deploy)
```

---

## 💡 Modo Test vs Live

**IMPORTANTE:** Stripe tem 2 modos:

### Test Mode (Desenvolvimento)
- Keys começam com `pk_test_` e `sk_test_`
- Usa cartões de teste: `4242 4242 4242 4242`
- Não cobra dinheiro real
- **Use este modo PRIMEIRO para testar!**

### Live Mode (Produção)
- Keys começam com `pk_live_` e `sk_live_`
- Cobra dinheiro real dos clientes
- Só ativar depois de testar TUDO

---

## 🧪 Testar Pagamentos (Test Mode)

### Cartões de teste do Stripe:

```
Cartão de sucesso:
4242 4242 4242 4242
CVC: Qualquer 3 dígitos
Data: Qualquer data futura
CEP: Qualquer

Cartão que falha:
4000 0000 0000 0002
```

---

## 🔒 Segurança

**NUNCA commitar:**
- ❌ Secret Key (`sk_test_...` ou `sk_live_...`)
- ❌ Webhook Secret (`whsec_...`)

**Pode committar:**
- ✅ Publishable Key (`pk_test_...` ou `pk_live_...`)
- ✅ Price IDs (`price_...`)

---

## 💰 Custos Stripe

### Taxas:
- **3,99% + R$ 0,39** por transação aprovada
- Sem mensalidade
- Sem taxa de setup
- Reembolsos: sem taxa adicional

### Exemplo:
- Cliente paga R$ 199 (Pro)
- Stripe desconta: R$ 8,33
- Você recebe: R$ 190,67

---

## 📞 Suporte Stripe

- Documentação: https://stripe.com/docs
- Dashboard: https://dashboard.stripe.com
- Status: https://status.stripe.com

---

## ✅ Próximos Passos

Depois de criar a conta Stripe:

1. ✅ Copiar todas as credenciais
2. ✅ Adicionar nas variáveis do Railway
3. ✅ Fazer deploy do app
4. ✅ Configurar webhook
5. ✅ Testar pagamento em test mode
6. ✅ Só ativar live mode depois de validar tudo

---

**Me avisa quando terminar de criar a conta Stripe!** 🚀
