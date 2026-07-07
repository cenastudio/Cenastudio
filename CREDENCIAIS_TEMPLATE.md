# 🔐 TEMPLATE DE CREDENCIAIS - CenaSTUDIO

**⚠️ IMPORTANTE:**
- Este arquivo é apenas um TEMPLATE
- Preencha com suas credenciais reais
- **NUNCA** faça commit deste arquivo no Git
- Salve em local seguro (1Password, Bitwarden, LastPass, etc.)
- Delete este arquivo após salvar em gerenciador de senhas

---

## 📧 CONTAS PRINCIPAIS

### Email da Empresa
```
Email: ____________________________
Senha: ____________________________
```

### GitHub
```
URL: https://github.com/____________________________
Username: ____________________________
Email: ____________________________
Senha: ____________________________
2FA: [ ] Habilitado
```

### Supabase
```
URL: https://supabase.com/dashboard/project/____________________________
Email: ____________________________
Senha: ____________________________
Project Name: cenastudio
Project ID: ____________________________
Database Password: ____________________________
```

### Vercel
```
URL: https://vercel.com/____________________________
Email: ____________________________
Senha: ____________________________
```

### OpenRouter (AI)
```
URL: https://openrouter.ai
Email: ____________________________
Senha: ____________________________
```

---

## 🔑 API KEYS

### Supabase
```
SUPABASE_URL=https://__________________________.supabase.co
SUPABASE_ANON_KEY=____________________________
SUPABASE_SERVICE_ROLE_KEY=____________________________
VITE_SUPABASE_URL=https://__________________________.supabase.co
VITE_SUPABASE_ANON_KEY=____________________________
```

### Database
```
DATABASE_URL=postgresql://postgres.____________:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1
SUPABASE_DB_PASSWORD=____________________________
```

### GitHub OAuth
```
GITHUB_CLIENT_ID=____________________________
GITHUB_CLIENT_SECRET=____________________________
GITHUB_CALLBACK_URL=https://cenastudio.vercel.app/api/auth/github/callback
```

### AI Providers
```
OPENROUTER_API_KEY=____________________________
ANTHROPIC_API_KEY=____________________________ (opcional)
NVIDIA_API_KEY=____________________________ (opcional)
```

### Aplicação
```
JWT_SECRET=____________________________ (gerar: openssl rand -base64 32)
ADMIN_DEFAULT_PASSWORD=____________________________ (min 12 caracteres)
DEMO_USER_PASSWORD=____________________________ (min 12 caracteres)
```

---

## 🌐 URLs IMPORTANTES

### Dashboards
```
Vercel: https://vercel.com/____________________________/cenastudio
Supabase: https://supabase.com/dashboard/project/____________________________
GitHub: https://github.com/____________________________/cenastudio
OpenRouter: https://openrouter.ai/account
```

### Aplicação
```
Local: http://localhost:5173
Produção: https://cenastudio.vercel.app
Domínio próprio: https://____________________________
```

### API
```
Local: http://localhost:5001
Produção: https://cenastudio.vercel.app/api
```

---

## 📋 COMANDOS ÚTEIS

### Gerar JWT Secret
```bash
openssl rand -base64 32
```

### Gerar Senha Forte
```bash
openssl rand -base64 16
```

### Ver Logs Vercel
```bash
vercel logs
```

### Aplicar Migrations Supabase
```bash
npx supabase db push
```

### Deploy Vercel
```bash
vercel --prod
```

---

## 🔒 SEGURANÇA

### Senhas Recomendadas
- [x] Mínimo 12 caracteres
- [x] Maiúsculas e minúsculas
- [x] Números
- [x] Símbolos especiais
- [x] Única por serviço (não repetir)

### 2FA (Two-Factor Authentication)
- [ ] GitHub: Settings > Password and authentication
- [ ] Supabase: Account settings > Security
- [ ] Vercel: Account settings > Security

### Backup de Credenciais
- [ ] Salvo em gerenciador de senhas
- [ ] Backup em local seguro (encrypted USB, cofre, etc.)
- [ ] Compartilhado com time (se aplicável)

---

## 📞 SUPORTE

Em caso de perda de credenciais:

### GitHub
- Reset: https://github.com/password_reset
- Suporte: https://support.github.com

### Supabase
- Reset: https://supabase.com/reset-password
- Suporte: https://supabase.com/support

### Vercel
- Reset: https://vercel.com/forgot-password
- Suporte: https://vercel.com/support

---

## ✅ CHECKLIST DE SEGURANÇA

- [ ] Todas as senhas são únicas
- [ ] Todas as senhas têm 12+ caracteres
- [ ] JWT_SECRET tem 32+ caracteres
- [ ] 2FA habilitado em todas as contas
- [ ] Credenciais salvas em gerenciador de senhas
- [ ] Este arquivo NÃO está no Git (.gitignore)
- [ ] Backup das credenciais feito
- [ ] `.env` NÃO está no Git (.gitignore)
- [ ] Chaves antigas revogadas
- [ ] Logs não contêm credenciais

---

**Data de Criação:** ____/____/2026
**Última Atualização:** ____/____/2026
**Responsável:** ____________________________

---

**⚠️ LEMBRETE FINAL:**
- DELETE este arquivo após salvar em local seguro
- NUNCA compartilhe credenciais por email/chat
- REVOGUE credenciais se suspeitar de vazamento
- ATUALIZE senhas periodicamente (a cada 90 dias)

