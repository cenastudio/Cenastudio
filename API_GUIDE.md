# API Guide - Cena Studio

Guia completo da API do Cena Studio para desenvolvedores externos.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
- [Exemplos de Requisição](#exemplos-de-requisição)
- [Códigos de Erro](#códigos-de-erro)
- [Webhooks](#webhooks)

---

## 🌐 Visão Geral

### Base URL

**Desenvolvimento:**
```
http://localhost:5001/api
```

**Produção:**
```
https://cenastudio-production.up.railway.app/api
```

> ⚠️ **Pendente:** Domínio personalizado `cenastudio.com.br` ainda não está configurado.

### Endpoints Operacionais

Health checks ficam fora do prefixo `/api` para uso por monitoramento e plataforma de hosting:

- `GET /health` - liveness do processo
- `GET /ready` - readiness das dependências mínimas

### Formato de Resposta

Todas as respostas seguem este padrão:

**Sucesso:**
```json
{
  "success": true,
  "data": {
    // dados da resposta
  }
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

### Versão da API

Versão atual: `v1`
URL inclui versão: `/api/v1/...` (planejado para futuro)

---

## 🔐 Autenticação

### JWT Token

A API usa JWT tokens para autenticação.

**Como obter token:**

```bash
# Login
POST /api/auth/login
{
  "email": "seu@email.com",
  "password": "sua_senha"
}

# Resposta inclui token em httpOnly cookie
# Cookie name: frame_token
```

**Usar token:**

```bash
# Token é enviado automaticamente via cookie
# Não é necessário incluir header Authorization manualmente
```

### Rotas Públicas

As seguintes rotas não requerem autenticação:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/providers`
- `GET /api/tools`
- `GET /api/tools/:id`
- `POST /api/contact`
- `POST /api/contact/demo`
- `GET /api/public/video-reviews/shared/:token`
- `GET /health`
- `GET /ready`

### Rotas Autenticadas

Todas as outras rotas requerem autenticação válida.

### Capacidade do CRM

`GET /api/clients/allowance` retorna `planId`, `status`, `used`, `limit`, `remaining` e `canCreate`. A criação é validada novamente no backend. Ao atingir o limite ou quando o plano Produtora está pendente, a API responde `402` com orientação de ativação ou upgrade.

---

## 🚦 Rate Limiting

### Limites

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/api/auth/*` | 60 req | 15 min |
| `/api/ai/*` | 20 req | 1 min |
| `/api/contact/*` | 60 req | 15 min |
| Outros | 100 req | 15 min |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1719792000
```

### Resposta ao Exceder Limite

```json
{
  "success": false,
  "error": "Muitas tentativas no servidor. Aguarde alguns segundos e tente novamente."
}
```

**Status Code:** 429 Too Many Requests

---

## 📚 Endpoints

### Autenticação

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "seu@email.com",
  "password": "sua_senha"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "seu@email.com",
      "name": "Nome do Usuário",
      "role": "user"
    }
  }
}
```

#### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "novo@email.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

#### Usuário Atual
```http
GET /api/auth/me
Cookie: frame_token=jwt_token_here
```

#### Logout
```http
POST /api/auth/logout
```

---

### 🆕 Autenticação Avançada (v2.1.0)

#### LGPD/GDPR Compliance

##### Dashboard de Transparência de Dados
```http
GET /api/auth/data-stats
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "projects": { "count": 45, "size": 12.3 },
    "files": { "count": 234, "size": 456 },
    "clients": { "count": 18, "size": 2.1 },
    "reviews": { "count": 89, "size": 34.5 },
    "totalSize": 502.9
  }
}
```

##### Obter Configurações de Privacidade
```http
GET /api/auth/privacy-settings
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "profileVisibility": "team",
    "allowSearchEngineIndexing": true,
    "shareAnalyticsWithTeam": true
  }
}
```

##### Atualizar Configurações de Privacidade
```http
PUT /api/auth/privacy-settings
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "profileVisibility": "private",
  "allowSearchEngineIndexing": false,
  "shareAnalyticsWithTeam": false
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Configurações de privacidade atualizadas"
  }
}
```

##### Criar Solicitação LGPD
```http
POST /api/auth/lgpd-request
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "type": "copy"  // ou "correct" ou "delete"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "requestId": "req_abc123",
    "status": "pending",
    "estimatedDays": 30
  }
}
```

**Tipos de solicitação:**
- `copy` - Cópia de dados (Art. 18, II LGPD) - 30 dias
- `correct` - Correção de dados (Art. 18, III LGPD) - 5 dias
- `delete` - Exclusão de dados (Art. 18, IV LGPD) - 7 dias

##### Listar Solicitações LGPD
```http
GET /api/auth/lgpd-requests
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "req_abc123",
        "type": "copy",
        "status": "pending",
        "createdAt": "2026-07-12T10:00:00Z",
        "processedAt": null,
        "notes": null
      }
    ]
  }
}
```

---

#### Segurança Enterprise

##### Setup 2FA (Two-Factor Authentication)
```http
POST /api/auth/2fa/setup
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGg...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": [
      "ABCD-1234",
      "EFGH-5678",
      "IJKL-9012",
      "MNOP-3456",
      "QRST-7890"
    ]
  }
}
```

**Uso:**
1. Escanear QR Code com Google Authenticator/Authy
2. Salvar backup codes em local seguro
3. Chamar `/api/auth/2fa/verify` com código gerado

##### Verificar e Ativar 2FA
```http
POST /api/auth/2fa/verify
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "code": "123456"  // 6 dígitos do app
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "2FA ativado com sucesso"
  }
}
```

##### Desativar 2FA
```http
POST /api/auth/2fa/disable
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "2FA desativado"
  }
}
```

##### Criar API Key
```http
POST /api/auth/api-keys
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "name": "Integração Produção"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "Integração Produção",
    "key": "cena_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "keyPrefix": "cena_1234567890abcd",
    "createdAt": "2026-07-12T10:00:00Z"
  }
}
```

**⚠️ IMPORTANTE:** A chave completa (`key`) só é exibida uma vez. Salve em local seguro!

##### Listar API Keys
```http
GET /api/auth/api-keys
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "key_abc123",
        "name": "Integração Produção",
        "keyPrefix": "cena_1234567890abcd...••••••",
        "createdAt": "2026-07-12T10:00:00Z",
        "lastUsed": "2026-07-12T15:30:00Z"
      }
    ]
  }
}
```

##### Revogar API Key
```http
DELETE /api/auth/api-keys/:id
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "API Key revogada"
  }
}
```

##### Listar Activity Log
```http
GET /api/auth/activity?limit=50&days=30
Cookie: frame_token=jwt_token_here
```

**Query Parameters:**
- `limit` - Máximo 100 itens (default: 50)
- `days` - Máximo 90 dias (default: 30)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 123,
        "action": "Login realizado",
        "ipAddress": "192.168.1.1",
        "location": "São Paulo, BR",
        "timestamp": "2026-07-12T10:00:00Z",
        "suspicious": false
      },
      {
        "id": 124,
        "action": "Senha alterada",
        "ipAddress": "203.0.113.42",
        "location": "Nova York, US",
        "timestamp": "2026-07-12T09:30:00Z",
        "suspicious": true
      }
    ]
  }
}
```

**Ações monitoradas:**
- Login realizado
- Senha alterada
- 2FA ativado/desativado
- API Key criada/revogada
- Projeto criado
- Configurações alteradas

**Flag `suspicious`:**
- Novo IP detectado
- Novo dispositivo (User-Agent diferente)
- Mudança de senha sem 2FA

##### Obter Security Alerts
```http
GET /api/auth/security-alerts
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "emailOnNewLogin": true,
    "emailOnPasswordChange": true,
    "emailOnNewDevice": true
  }
}
```

##### Atualizar Security Alerts
```http
PUT /api/auth/security-alerts
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "emailOnNewLogin": true,
  "emailOnPasswordChange": true,
  "emailOnNewDevice": false
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Alertas de segurança atualizados"
  }
}
```

---

#### Preferências Avançadas

##### Notificações Granulares

###### Obter Preferências de Notificação
```http
GET /api/auth/notification-preferences
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "newComments": true,
    "clientUploads": true,
    "projectDeadlines": true,
    "weeklyNewsletter": false,
    "mentions": true,
    "newProjects": false,
    "reviewApproved": true,
    "paymentSuccess": true
  }
}
```

###### Atualizar Preferências de Notificação
```http
PUT /api/auth/notification-preferences
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "newComments": true,
  "clientUploads": false,
  "projectDeadlines": true,
  "weeklyNewsletter": false,
  "mentions": true,
  "newProjects": false,
  "reviewApproved": true,
  "paymentSuccess": true
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Preferências de notificação atualizadas"
  }
}
```

**Tipos de notificação:**
- `newComments` - Novos comentários em reviews
- `clientUploads` - Cliente enviou arquivos
- `projectDeadlines` - Projeto próximo do prazo
- `weeklyNewsletter` - Newsletter semanal
- `mentions` - Menções (@você)
- `newProjects` - Novos projetos criados
- `reviewApproved` - Review aprovada
- `paymentSuccess` - Pagamento confirmado

##### Preferências Regionais

###### Obter Preferências Regionais
```http
GET /api/auth/regional-preferences
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "locale": "pt",
    "timezone": "America/Sao_Paulo",
    "dateFormat": "DD/MM/YYYY",
    "currency": "BRL"
  }
}
```

###### Atualizar Preferências Regionais
```http
PUT /api/auth/regional-preferences
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "locale": "en",
  "timezone": "America/New_York",
  "dateFormat": "MM/DD/YYYY",
  "currency": "USD"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Preferências regionais atualizadas"
  }
}
```

**Valores aceitos:**
- `locale`: "pt" ou "en"
- `timezone`: String válida de timezone (ex: "America/Sao_Paulo")
- `dateFormat`: "DD/MM/YYYY" ou "MM/DD/YYYY"
- `currency`: "BRL", "USD" ou "EUR"

##### Preferências Visuais

###### Obter Preferências Visuais
```http
GET /api/auth/visual-preferences
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "themeMode": "dark",
    "density": "normal",
    "fontFamily": "inter",
    "reduceAnimations": false
  }
}
```

###### Atualizar Preferências Visuais
```http
PUT /api/auth/visual-preferences
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "themeMode": "light",
  "density": "compact",
  "fontFamily": "mono",
  "reduceAnimations": true
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Preferências visuais atualizadas"
  }
}
```

**Valores aceitos:**
- `themeMode`: "dark", "light" ou "auto"
- `density`: "compact", "normal" ou "spacious"
- `fontFamily`: "inter", "system" ou "mono"
- `reduceAnimations`: boolean

##### Preferências de Comportamento

###### Obter Preferências de Comportamento
```http
GET /api/auth/behavior-preferences
Cookie: frame_token=jwt_token_here
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "defaultProjectSort": "recent",
    "defaultView": "grid",
    "autoplayVideos": true
  }
}
```

###### Atualizar Preferências de Comportamento
```http
PUT /api/auth/behavior-preferences
Content-Type: application/json
Cookie: frame_token=jwt_token_here

{
  "defaultProjectSort": "deadline",
  "defaultView": "list",
  "autoplayVideos": false
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "message": "Comportamentos padrão atualizados"
  }
}
```

**Valores aceitos:**
- `defaultProjectSort`: "recent", "alphabetical" ou "deadline"
- `defaultView`: "grid" ou "list"
- `autoplayVideos`: boolean

---

### Ferramentas IA

#### Listar Ferramentas
```http
GET /api/tools
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "01",
      "name": "Gerador de Roteiro",
      "description": "Roteiros formatados...",
      "category": "Pré-produção"
    }
  ]
}
```

#### Gerar Conteúdo
```http
POST /api/ai/generate
Content-Type: application/json

{
  "toolId": "01",
  "input": "Descreva sua ideia aqui...",
  "projectId": 123  // opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "output": "Conteúdo gerado pela IA...",
    "generationId": 456
  }
}
```

### Projetos

#### Listar Projetos
```http
GET /api/projects
```

#### Criar Projeto
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Nome do Projeto",
  "description": "Descrição opcional",
  "clientId": 456  // opcional
}
```

#### Obter Projeto
```http
GET /api/projects/:id
```

#### Atualizar Projeto
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Nome Atualizado",
  "description": "Descrição atualizada"
}
```

#### Excluir Projeto
```http
DELETE /api/projects/:id
```

### Clientes (CRM)

#### Listar Clientes
```http
GET /api/clients
```

#### Criar Cliente
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Nome do Cliente",
  "company": "Empresa Ltda",
  "email": "cliente@empresa.com",
  "phone": "+55 11 99999-9999",
  "industry": "Tecnologia",
  "companySize": "50-100"
}
```

#### Obter Cliente
```http
GET /api/clients/:id
```

#### Atualizar Cliente
```http
PUT /api/clients/:id
Content-Type: application/json

{
  "name": "Nome Atualizado",
  "status": "client"
}
```

#### Excluir Cliente
```http
DELETE /api/clients/:id
```

### Video Reviews

#### Listar Reviews do Projeto
```http
GET /api/video-reviews/projects/:projectId
```

#### Criar Review
```http
POST /api/video-reviews
Content-Type: application/json

{
  "projectId": 123,
  "title": "Review do Vídeo",
  "description": "Descrição opcional",
  "videoUrl": "https://example.com/video.mp4"
}
```

#### Obter Review com Comentários
```http
GET /api/video-reviews/:id
```

#### Adicionar Comentário
```http
POST /api/video-reviews/:id/comments
Content-Type: application/json

{
  "timestampSeconds": 45.5,
  "comment": "Texto do comentário",
  "annotations": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 200,
      "width": 50,
      "height": 30
    }
  ]
}
```

#### Gerar Link Compartilhável
```http
POST /api/video-reviews/:id/share
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "shareToken": "abc123xyz",
    "shareUrl": "https://cenastudio-production.up.railway.app/review/abc123xyz"
  }
}
```

### Analytics

#### Métricas Gerais
```http
GET /api/analytics/overall
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalProjects": 25,
    "totalClients": 15,
    "totalGenerations": 150,
    "activeCollaborators": 8
  }
}
```

#### Métricas por Projeto
```http
GET /api/analytics/projects/:id
```

#### Métricas de Receita
```http
GET /api/analytics/revenue
```

---

## 💡 Exemplos de Requisição

### cURL

```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@test.com","password":"test123"}'

# Criar projeto (usando cookie)
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Meu Projeto"}'

# Gerar conteúdo IA
curl -X POST http://localhost:5001/api/ai/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"toolId":"01","input":"Ideia de roteiro"}'
```

### JavaScript (Fetch)

```javascript
// Login
const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Importante para cookies
  body: JSON.stringify({
    email: 'test@test.com',
    password: 'test123'
  })
})

const loginData = await loginResponse.json()

// Criar projeto
const projectResponse = await fetch('http://localhost:5001/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    name: 'Meu Projeto'
  })
})

const projectData = await projectResponse.json()
```

### Python (Requests)

```python
import requests

# Login
session = requests.Session()
login_response = session.post(
    'http://localhost:5001/api/auth/login',
    json={
        'email': 'test@test.com',
        'password': 'test123'
    }
)

# Criar projeto
project_response = session.post(
    'http://localhost:5001/api/projects',
    json={'name': 'Meu Projeto'}
)

project_data = project_response.json()
```

---

## ❌ Códigos de Erro

### Status Codes

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Bad Request (input inválido) |
| 401 | Não autenticado |
| 403 | Forbidden (sem permissão) |
| 404 | Não encontrado |
| 409 | Conflito (ex: email já existe) |
| 429 | Too Many Requests (rate limit) |
| 500 | Erro interno do servidor |
| 503 | Service Unavailable (ex: IA API down) |

### Erros Comuns

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Email inválido"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Token inválido ou expirado"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Permissão negada"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Recurso não encontrado"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Muitas tentativas. Tente novamente em X segundos."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Erro interno do servidor"
}
```

**503 Service Unavailable:**
```json
{
  "success": false,
  "error": "Serviço de IA indisponível. Tente novamente mais tarde."
}
```

### 🆕 Erros Específicos v2.1.0

#### LGPD/GDPR

**400 - Tipo de solicitação inválido:**
```json
{
  "success": false,
  "error": "type deve ser 'copy', 'correct' ou 'delete'"
}
```

**400 - Privacy visibility inválida:**
```json
{
  "success": false,
  "error": "profileVisibility deve ser 'public', 'team' ou 'private'"
}
```

#### Segurança

**400 - Código 2FA inválido:**
```json
{
  "success": false,
  "error": "Código deve ter 6 dígitos"
}
```

**400 - Código 2FA incorreto:**
```json
{
  "success": false,
  "error": "Código inválido"
}
```

**400 - Nome de API Key obrigatório:**
```json
{
  "success": false,
  "error": "Nome da chave é obrigatório"
}
```

**400 - Nome de API Key muito longo:**
```json
{
  "success": false,
  "error": "Nome muito longo (máximo 100 caracteres)"
}
```

**400 - Limite de activities excedido:**
```json
{
  "success": false,
  "error": "Limite máximo: 100 itens"
}
```

**400 - Período de activities excedido:**
```json
{
  "success": false,
  "error": "Período máximo: 90 dias"
}
```

#### Preferências

**400 - Locale inválido:**
```json
{
  "success": false,
  "error": "locale deve ser 'pt' ou 'en'"
}
```

**400 - Date format inválido:**
```json
{
  "success": false,
  "error": "dateFormat deve ser 'DD/MM/YYYY' ou 'MM/DD/YYYY'"
}
```

**400 - Currency inválida:**
```json
{
  "success": false,
  "error": "currency deve ser 'BRL', 'USD' ou 'EUR'"
}
```

**400 - Theme mode inválido:**
```json
{
  "success": false,
  "error": "themeMode deve ser 'dark', 'light' ou 'auto'"
}
```

**400 - Density inválida:**
```json
{
  "success": false,
  "error": "density deve ser 'compact', 'normal' ou 'spacious'"
}
```

**400 - Font family inválida:**
```json
{
  "success": false,
  "error": "fontFamily deve ser 'inter', 'system' ou 'mono'"
}
```

**400 - Project sort inválido:**
```json
{
  "success": false,
  "error": "defaultProjectSort deve ser 'recent', 'alphabetical' ou 'deadline'"
}
```

**400 - Default view inválida:**
```json
{
  "success": false,
  "error": "defaultView deve ser 'grid' ou 'list'"
}
```

---

## 🔗 Webhooks

### Stripe Webhooks

**Endpoint:** `POST /api/checkout/webhook`

**Eventos:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Configuração:**
```bash
# No painel Stripe
Webhook URL: https://cenastudio-production.up.railway.app/api/checkout/webhook
Secret: whsec_...  # Configure em STRIPE_WEBHOOK_SECRET
```

**Payload:**
```json
{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_1234567890",
      "customer": "cus_1234567890",
      "subscription": "sub_1234567890"
    }
  }
}
```

---

## 📖 Documentação Adicional

- [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md) - Documentação completa do sistema
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Guia de troubleshooting
- [SECURITY.md](SECURITY.md) - Política de segurança

---

## 📞 Suporte

- Email: contato@cenastudio.com.br
- GitHub Issues: [abrir issue](https://github.com/seu-usuario/frameai-director-correto/issues)

---

**Última atualização:** 30 de Junho de 2026
