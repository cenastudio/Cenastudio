# Security Policy - Cena Studio

Política de segurança e diretrizes para proteger o Cena Studio e seus usuários.

## 📋 Índice

- [Política de Segurança](#política-de-segurança)
- [Reportando Vulnerabilidades](#reportando-vulnerabilidades)
- [Dependências Sensíveis](#dependências-sensíveis)
- [Secrets Management](#secrets-management)
- [Auditorias de Segurança](#auditorias-de-segurança)
- [Melhores Práticas](#melhores-práticas)

---

## 🔒 Política de Segurança

### Compromisso

O Cena Studio leva a segurança a sério. Nosso compromisso é:

- Proteger dados dos usuários
- Manter o sistema seguro e atualizado
- Responder prontamente a vulnerabilidades
- Ser transparente sobre incidentes

### Escopo

Esta política cobre:
- Código fonte do Cena Studio
- Infraestrutura de deployment
- Dados dos usuários
- Integrações de terceiros

---

## 🐛 Reportando Vulnerabilidades

### Como Reportar

Se você descobrir uma vulnerabilidade de segurança:

**NÃO:**
- ❌ Abrir issue pública no GitHub
- ❌ Postar em redes sociais
- ❌ Explorar a vulnerabilidade

**SIM:**
- ✅ Enviar email para: security@cenastudio.com.br
- ✅ Incluir detalhes da vulnerabilidade
- ✅ Aguardar confirmação antes de divulgar

### Template de Report

```
Assunto: [Security] Vulnerability Report - [Título]

Descrição:
[Breve descrição da vulnerabilidade]

Passos para Reproduzir:
1. ...
2. ...
3. ...

Impacto:
[Qual o impacto potencial?]

Sugestão de Correção:
[Se aplicável]

Informações Adicionais:
[Qualquer informação relevante]
```

### Processo de Resposta

1. **Confirmação:** Responderemos em 48h confirmando recebimento
2. **Investigação:** Analisaremos a vulnerabilidade em 7 dias
3. **Correção:** Implementaremos correção em 14 dias (crítico) ou 30 dias (não crítico)
4. **Divulgação:** Coordenaremos divulgação pública após correção

### Reconhecimento

Reporters de vulnerabilidades serão reconhecidos em:
- Hall of Fame (se desejado)
- Agradecimento no changelog
- Convite para participar de beta testing

---

## 🔑 Dependências Sensíveis

### Variáveis de Ambiente

**Nunca commitar:**
- `.env` (arquivo local)
- `.env.local`
- `.env.production`
- Qualquer arquivo com secrets

**Sempre usar:**
- `.env.example` (template sem valores reais)

**Exemplo:**

```bash
# ✅ Bom (.env.example)
JWT_SECRET=
SUPABASE_URL=
NVIDIA_API_KEY=

# ❌ Ruim (.env commitado)
JWT_SECRET=real-secret-here
SUPABASE_URL=https://<seu-project-ref>.supabase.co
```

### Chaves de API

**Armazenamento:**
- Environment variables (recomendado)
- Secret managers (AWS Secrets Manager, HashiCorp Vault)
- Nunca em código

**Rotação:**
- Chaves de IA: Mensal
- Chaves de banco: Trimestral
- JWT secrets: Anual ou após incidente

### Tokens de Acesso

**JWT Tokens:**
- Access tokens: 15min (curto-lived)
- Refresh tokens: 7 dias (long-lived)
- Implementar blacklist em Redis

**API Keys:**
- Usar service accounts quando possível
- Limitar escopo (permissões mínimas)
- Rotar regularmente

---

## 🗝️ Secrets Management

### Desenvolvimento

```bash
# Usar .env local
cp .env.example .env
# Editar com valores locais

# Nunca commitar .env
echo ".env" >> .gitignore
```

### Produção

**Vercel:**
- Usar Environment Variables no painel
- Nunca expor em código
- Usar diferentes valores para preview/production

**Self-hosted:**
- Usar secret manager (Docker secrets, HashiCorp Vault)
- Nunca em código ou config files
- Criptografar secrets em repouso

### Exemplo de Secret Manager

```typescript
// server/utils/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const client = new SecretManagerServiceClient()

export async function getSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/my-project/secrets/${name}/versions/latest`
  })
  return version.payload?.data?.toString() || ''
}

// Uso
const jwtSecret = await getSecret('jwt-secret')
```

---

## 🔍 Auditorias de Segurança

### Dependências

**Automático:**
```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Corrigir apenas vulnerabilidades de produção
npm audit fix --production
```

**Manual:**
- Revisar novas dependências antes de adicionar
- Verificar histórico de security do pacote
- Preferir pacotes mantidos ativamente

### Code Review

**Checklist de segurança:**
- [ ] Sem hardcoded secrets
- [ ] Input validation em todos os inputs
- [ ] Output encoding para prevenir XSS
- [ ] SQL injection prevenido (parameterized queries)
- [ ] Autenticação em rotas sensíveis
- [ ] Rate limiting em APIs públicas
- [ ] CORS configurado corretamente
- [ ] Headers de segurança (Helmet)

### Penetration Testing

**Frequência:**
- Trimestral (automatizado)
- Anual (manual completo)

**Ferramentas:**
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)
- [Snyk](https://snyk.io/)

---

## 🛡️ Melhores Práticas

### Autenticação

**Implementar:**
- ✅ JWT httpOnly cookies
- ✅ Password hashing (bcrypt, 10+ rounds)
- ✅ Rate limiting em auth endpoints
- ✅ Password complexity requirements
- ✅ 2FA (futuro)

**Evitar:**
- ❌ JWT em localStorage (XSS vulnerability)
- ❌ Senhas em plaintext
- ❌ Passwords fracos
- ❌ Sem rate limiting

### Autorização

**Implementar:**
- ✅ Role-based access control (RBAC)
- ✅ Resource-based permissions
- ✅ Row Level Security (Supabase)
- ✅ Middleware de autorização

**Exemplo:**

```typescript
// server/middleware/authorize.ts
export function requireRole(role: string) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

// Uso
router.get('/admin', authenticate, requireRole('admin'), adminController)
```

### Input Validation

**Implementar:**
- ✅ Zod schemas para validação
- ✅ Sanitização de inputs
- ✅ Length limits
- ✅ Type checking

**Exemplo:**

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2).max(100)
})

// Uso
const data = createUserSchema.parse(req.body)
```

### Output Encoding

**Prevenir XSS:**

```typescript
// React automaticamente escapa JSX
// Mas cuidado com dangerouslySetInnerHTML

// ❌ Ruim
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Bom
// Usar DOMPurify
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userContent)
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

### SQL Injection

**Prevenir:**

```typescript
// ❌ Ruim (SQL injection vulnerável)
const query = `SELECT * FROM users WHERE email = '${email}'`
const user = db.prepare(query).get()

// ✅ Bom (parameterized query)
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

// ✅ Bom (ORM/Prisma)
const user = await prisma.user.findUnique({ where: { email } })
```

### CORS

**Configurar corretamente:**

```typescript
// server/app.ts
app.use(cors({
  origin: process.env.CLIENT_ORIGIN,  // Específico, não '*'
  credentials: true,  // Necessário para cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
```

### Rate Limiting

**Implementar:**

```typescript
// server/app.ts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 60,  // 60 requests
  message: 'Muitas tentativas. Tente novamente mais tarde.'
})

app.use('/api/auth', authLimiter)
```

### Security Headers

**Implementar com Helmet:**

```typescript
// server/app.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

### Logging

**Log eventos de segurança:**

```typescript
// server/utils/logger.ts
logger.info({ userId, action: 'login', ip: req.ip }, 'User logged in')
logger.warn({ userId, action: 'failed_login', ip: req.ip }, 'Failed login attempt')
logger.error({ userId, action: 'unauthorized_access' }, 'Unauthorized access attempt')
```

**Nunca logar:**
- Senhas (mesmo hash)
- Tokens completos
- Dados sensíveis (PII)

---

## 🚨 Incident Response

### Plano de Resposta

1. **Detecção:** Monitoramento alerta sobre anomalia
2. **Contenção:** Isolar sistema afetado
3. **Eradicação:** Remover causa raiz
4. **Recuperação:** Restaurar sistemas
5. **Lições Aprendidas:** Documentar e melhorar

### Comunicação

- **Usuários:** Notificar em 24h se dados afetados
- **Público:** Divulgar após correção
- **Internamente:** Documentar detalhadamente

---

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Security Guidelines for Node.js](https://nodejs.org/en/docs/guides/security/)
- [React Security](https://react.dev/learn/scaling-up-with-security)

---

## 📞 Contato de Segurança

- **Email:** security@cenastudio.com.br
- **PGP Key:** [disponível em breve]
- **Response Time:** 48h

---

**Última atualização:** 30 de Junho de 2026
