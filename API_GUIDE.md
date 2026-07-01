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
https://cenastudio.com.br/api
```

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
- `GET /api/tools`
- `GET /api/tools/:id`
- `POST /api/contact`
- `POST /api/contact/demo`
- `GET /api/public/video-reviews/shared/:token`
- `GET /health`
- `GET /ready`

### Rotas Autenticadas

Todas as outras rotas requerem autenticação válida.

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
    "shareUrl": "https://cenastudio.com.br/review/abc123xyz"
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
Webhook URL: https://cenastudio.com.br/api/checkout/webhook
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
