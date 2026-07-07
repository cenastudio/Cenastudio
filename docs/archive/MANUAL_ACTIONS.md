# Ações Manuais Pendentes

**Data:** 05 de Julho de 2026
**Importante:** Estas ações **não podem ser automatizadas** e devem ser feitas manualmente

---

## ⚠️ Por que fazer isso?

Mesmo com todo código limpo e generalizado, a **conta antiga** ainda possui:
- Chaves API ativas
- Webhooks configurados
- Tokens de acesso
- Conexões ativas

**Rotacionar credenciais antigas** é essencial para:
- ✅ Prevenir acesso não autorizado
- ✅ Garantir que dados novos não vazem para conta antiga
- ✅ Cumprir boas práticas de segurança

---

## 🔐 Rotação de Credenciais — Conta Antiga

### 1. Supabase

**Dashboard:** https://supabase.com/dashboard/project/<seu-project-ref>/settings/api

#### Ações:

- [ ] **Regenerar `anon` key**
  - Settings > API > Project API keys
  - Clique em "Reveal" ao lado de `anon public`
  - Clique em "Generate new key"
  - ⚠️ Isso invalidará integrações antigas imediatamente

- [ ] **Regenerar `service_role` key**
  - Settings > API > Project API keys
  - Clique em "Reveal" ao lado de `service_role`
  - Clique em "Generate new key"
  - ⚠️ Servidores usando chave antiga deixarão de funcionar

- [ ] **Verificar logs de acesso**
  - Settings > Logs
  - Verifique conexões suspeitas nas últimas 48h
  - Anote IPs desconhecidos

- [ ] **Revisar RLS policies**
  - Database > Policies
  - Confirme que todas tabelas têm RLS habilitado
  - Verifique se policies estão corretas

**Impacto:** Deploy antigo deixará de funcionar. Nova conta não será afetada.

---

### 2. Vercel

**Dashboard:** https://vercel.com/<seu-usuario>/<seu-projeto>/settings

#### Ações:

- [ ] **Rotacionar tokens de acesso pessoal**
  - Settings > Tokens
  - Delete tokens antigos não usados
  - Crie novo token se necessário para CI/CD

- [ ] **Remover environment variables antigas**
  - Settings > Environment Variables
  - Delete variáveis do projeto antigo (se não for mais usado)
  - ⚠️ Não delete se projeto ainda está ativo

- [ ] **Verificar webhooks**
  - Settings > Git
  - Verifique se webhooks apontam para repositório correto
  - Remova webhooks órfãos

- [ ] **Considerar deletar projeto antigo**
  - ⚠️ Apenas após confirmar que nova conta está 100% funcional
  - Settings > Advanced > Delete Project
  - Digite nome do projeto para confirmar

**Impacto:** Builds antigos param. Novos deploys não afetados.

---

### 3. GitHub

**Dashboard:** https://github.com/settings/tokens

#### Ações:

- [ ] **Revogar Personal Access Tokens antigos**
  - Settings > Developer settings > Personal access tokens
  - Delete tokens não usados ou antigos
  - Crie novo token se necessário para automação

- [ ] **Remover OAuth Apps antigas**
  - Settings > Developer settings > OAuth Apps
  - Delete apps não usadas
  - Confirme callback URLs estão corretos

- [ ] **Verificar webhooks do repositório**
  - Repositório > Settings > Webhooks
  - Remova webhooks órfãos ou duplicados
  - Confirme webhooks ativos apontam para Vercel correto

- [ ] **Considerar arquivar repositório antigo**
  - ⚠️ Apenas após migração completa
  - Repositório > Settings > Archive this repository
  - Isso deixa código visível mas impede mudanças

**Impacto:** Integrações antigas param. Repositório novo não afetado.

---

### 4. Stripe (Se Usado)

**Dashboard:** https://dashboard.stripe.com/apikeys

#### Ações:

- [ ] **Rotacionar Secret Key**
  - Developers > API keys
  - Clique em "Roll key" ao lado de Secret key
  - ⚠️ Servidores usando chave antiga param imediatamente
  - Atualize `STRIPE_SECRET_KEY` na nova conta

- [ ] **Regenerar Webhook Secret**
  - Developers > Webhooks
  - Selecione webhook antigo
  - Clique em "Delete" ou "Roll secret"
  - Crie novo webhook apontando para nova URL
  - Copie novo Signing secret → `STRIPE_WEBHOOK_SECRET`

- [ ] **Verificar Products e Prices**
  - Products
  - Confirme IDs dos planos (`price_...`)
  - Atualize `STRIPE_PRICE_PRO` e `STRIPE_PRICE_STUDIO` se necessário

- [ ] **Testar webhook**
  - Webhooks > Select endpoint > Send test webhook
  - Confirme recebimento em logs

**Impacto:** Pagamentos antigos param. Nova conta precisa de webhook configurado.

---

### 5. OpenRouter / Anthropic / NVIDIA (Provedores IA)

**Dashboard de cada provedor**

#### Ações:

- [ ] **OpenRouter** (https://openrouter.ai/keys)
  - Rotate API key se suspeita de exposição
  - Verifique uso/billing

- [ ] **Anthropic** (https://console.anthropic.com/account/keys)
  - Rotate API key se necessário
  - Confirme limites de rate

- [ ] **NVIDIA** (https://build.nvidia.com/)
  - Rotate API key se necessário
  - Verifique créditos

**Impacto:** IA para de funcionar com chaves antigas. Nova conta precisa de novas chaves.

---

## 🗑️ Limpeza Opcional (Após Migração Validada)

### Deletar Projeto Supabase Antigo

⚠️ **CUIDADO:** Isso apaga **permanentemente** todos os dados!

#### Antes de deletar:

- [ ] Confirme que nova conta está 100% funcional
- [ ] Faça backup de dados importantes (se houver)
- [ ] Exporte logs se necessário para auditoria
- [ ] Aguarde pelo menos 7 dias após migração

#### Como deletar:

1. Supabase Dashboard > Settings > General
2. Role até "Danger Zone"
3. Clique em "Delete Project"
4. Digite nome do projeto para confirmar
5. Confirme deletion

**Não há como desfazer!**

---

### Deletar Projeto Vercel Antigo

#### Antes de deletar:

- [ ] Confirme que novo deploy está funcional
- [ ] Exporte logs se necessário
- [ ] Remova domínio customizado (se aplicável)
- [ ] Aguarde 3-7 dias após migração

#### Como deletar:

1. Vercel Dashboard > Settings > Advanced
2. Role até "Delete Project"
3. Digite nome do projeto
4. Confirme deletion

---

### Arquivar Repositório GitHub Antigo

**Recomendado:** Arquivar em vez de deletar (mantém histórico)

#### Como arquivar:

1. Repositório > Settings > Danger Zone
2. Clique em "Archive this repository"
3. Confirme

**Resultado:** Repositório fica read-only (código visível, sem commits/PRs)

---

## 📋 Checklist Completo

### Imediato (Logo Após Migração)

- [ ] **Supabase:** Regenerar `anon` key
- [ ] **Supabase:** Regenerar `service_role` key
- [ ] **Vercel:** Rotacionar tokens de acesso
- [ ] **GitHub:** Revogar tokens antigos
- [ ] **Stripe:** Rotacionar Secret Key
- [ ] **Stripe:** Regenerar Webhook Secret

### Curto Prazo (1-3 dias)

- [ ] **Supabase:** Verificar logs de acesso
- [ ] **Vercel:** Remover env vars antigas
- [ ] **GitHub:** Remover webhooks órfãos
- [ ] **Stripe:** Testar webhooks novos
- [ ] **Provedores IA:** Verificar billing

### Médio Prazo (1 semana)

- [ ] **Validar:** Nova conta 100% funcional
- [ ] **Validar:** Nenhum usuário reportou problemas
- [ ] **Validar:** Smoke tests passando
- [ ] **Considerar:** Deletar projeto Supabase antigo
- [ ] **Considerar:** Deletar projeto Vercel antigo
- [ ] **Considerar:** Arquivar repositório GitHub antigo

---

## 📝 Template de Email para Time

Se você tem um time, avise sobre a mudança:

```
Assunto: [ACTION REQUIRED] Migração de infraestrutura — Novas credenciais

Olá time,

Migramos nossa infraestrutura para nova conta. Ações necessárias:

1. Atualize seu .env local:
   - SUPABASE_URL=https://<novo-project-ref>.supabase.co
   - SUPABASE_ANON_KEY=<nova-chave>
   - (veja .env.example atualizado)

2. Credenciais antigas REVOGADAS em [DATA]
   - Deploy antigo deixará de funcionar
   - Local dev com .env antigo falhará

3. Nova URL de produção: https://<novo-dominio>

Dúvidas? Veja SETUP.md ou me pergunte.

[Seu nome]
```

---

## 🚨 Em Caso de Emergência

### Se algo quebrou após rotação:

1. **Verifique logs** do serviço afetado (Vercel, Supabase)
2. **Confirme** que novas credenciais estão corretas
3. **Redeploy** se necessário
4. **Rollback temporário** se crítico:
   - Regenere chaves antigas (se possível)
   - Ou use backup de credenciais

### Se dados foram perdidos:

- Supabase mantém backups de 7 dias (plano free) ou 30 dias (plano Pro)
- Vercel mantém logs de deploy por 30 dias
- GitHub mantém histórico completo

---

## ✅ Após Conclusão

Quando todas ações manuais forem concluídas:

- [ ] Marque este arquivo como `[DONE]`
- [ ] Atualize `MIGRATION_READY.md` com data de conclusão
- [ ] Archive este arquivo em pasta `/docs/archives/` (opcional)

---

**📞 Dúvidas?**

Consulte:
- [SETUP.md](./SETUP.md) — Guia de provisionamento
- [SECURITY.md](./SECURITY.md) — Práticas de segurança
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — Problemas comuns

---

**Data estimada de conclusão:** ___ / ___ / ___

**Responsável:** _______________

**Status:** ⏳ Pendente / 🔄 Em Progresso / ✅ Concluído

