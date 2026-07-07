# 🎯 PRÓXIMO PASSO - Limpar Usuários de Teste

**Status Atual**: ✅ Dados demo deletados | ⚠️ Usuários de teste no banco

---

## ⚠️ PROBLEMA DETECTADO

Você executou o script de limpeza de dados com sucesso, **MAS** o banco ainda tem **26 usuários** quando deveria ter apenas **3 admins**.

### Usuários que estão no banco (26 total):

**✅ Admins reais (manter - 3):**
- `admin@cenastudio.com.br`
- `elytraprod@gmail.com`
- `doesnotzero@cenastudio.com.br`

**❌ Usuários de teste/QA (deletar - 23):**
- `production-smoke-*` (4 usuários)
- `qa-free/pro/studio-*` (3 usuários QA)
- `test-*` (3 usuários de teste)
- `ytawan@cenastudio.com.br`
- `jotape@cenastudio.com.br`
- `paulo@cenastudio.com.br`
- `luanvuom@cenastudio.com.br`
- `luan@cenastudio.com.br`
- `vitoria@cenastudio.com.br`
- `teste@gmail.com.br`
- `teste@gmail.com`
- `studio2@cenastudio.com.br`
- `free@cenastudio.com.br`
- `pro@cenastudio.com.br`
- `free@cenastudio.com`
- E outros...

---

## 🔧 SOLUÇÃO

Execute o script de limpeza de usuários de teste:

```bash
npx tsx scripts/clean-test-users.ts
```

### O que o script faz:

1. **Lista todos usuários** no banco
2. **Identifica os 3 admins reais** a manter
3. **Identifica os 23 usuários de teste** a deletar
4. **Pede confirmação**
5. **Deleta apenas usuários de teste**
6. **Mantém os 3 admins reais**

### Resultado esperado:

```
✅ 23 usuários deletados

👤 Usuários restantes no banco:
   - admin@cenastudio.com.br (Admin) - admin
   - elytraprod@gmail.com (elytraprod) - admin
   - doesnotzero@cenastudio.com.br (Does not zero) - admin

✅ 3 usuários mantidos (apenas admins reais)
✅ Banco pronto para produção!
```

---

## 📋 CHECKLIST ATUALIZADO

```
✅ PASSO 1: Dados demo deletados
   ✅ Executado: npx tsx scripts/clean-production-data.ts
   ✅ 5 clientes deletados
   ✅ 4 projetos deletados
   ✅ 20 lançamentos deletados
   ✅ etc.

⚠️ PASSO 1.5: Limpar usuários de teste (NOVO)
   [ ] Executar: npx tsx scripts/clean-test-users.ts
   [ ] Confirmar: Apenas 3 admins restantes

🔐 PASSO 2: Gerar credenciais
   [ ] JWT_SECRET novo (openssl rand -base64 32)
   [ ] Senha admin forte (openssl rand -base64 16)
   [ ] Credenciais guardadas

🚀 PASSO 3: Deploy Railway
   [ ] Projeto criado
   [ ] 9 variáveis adicionadas
   [ ] Deploy completo
   [ ] Login testado
```

---

## ⚡ EXECUTAR AGORA

```bash
# Limpar usuários de teste
npx tsx scripts/clean-test-users.ts

# Depois, gerar credenciais
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 16  # Senha admin

# Depois, deploy Railway!
```

---

**Tempo**: 2 minutos
**Objetivo**: Banco 100% limpo com apenas 3 admins reais

