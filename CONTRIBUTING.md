# Contributing to Cena Studio

Este documento guia o processo de desenvolvimento interno do Cena Studio.

## 📋 Índice

- [Como Começar](#como-começar)
- [Processo de Desenvolvimento](#processo-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Testes](#testes)
- [Documentação](#documentação)

---

## 🚀 Como Começar

### 1. Fork o Repositório

```bash
# Fork no GitHub e clone
git clone https://github.com/seu-usuario/frameai-director-correto.git
cd frameai-director-correto
```

### 2. Configure o Ambiente

```bash
# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie o servidor de desenvolvimento
npm run dev
```

### 3. Crie uma Branch

```bash
git checkout -b feature/sua-feature
# ou
git checkout -b fix/seu-bugfix
```

---

## 🔄 Processo de Desenvolvimento

### Workflow de Branches

- **main:** Branch de produção (apenas deploy)
- **develop:** Branch de desenvolvimento (merge de features)
- **feature/nome:** Nova funcionalidade
- **fix/nome:** Correção de bug
- **hotfix/nome:** Correção urgente em produção

### Convenções de Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar nova funcionalidade de X
fix: corrigir bug no login Y
docs: atualizar README
style: formatar código com Prettier
refactor: refatorar controller de analytics
test: adicionar testes para auth
chore: atualizar dependências
```

**Exemplo:**
```bash
git commit -m "feat: adicionar suporte a Redis cache"
git commit -m "fix: corrigir validação de email no registro"
```

---

## 📐 Padrões de Código

### TypeScript

- Use tipagem forte sempre
- Evite `any` - use tipos específicos ou `unknown`
- Interfaces para shapes de dados
- Types para unions/primitives

```typescript
// ✅ Bom
interface User {
  id: number
  email: string
  name: string
}

function getUser(id: number): Promise<User> {
  return prisma.user.findUnique({ where: { id } })
}

// ❌ Ruim
function getUser(id: any): any {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}
```

### React

- Functional components com hooks
- Props com TypeScript interfaces
- Context para state global
- Custom hooks para lógica reutilizável

```typescript
// ✅ Bom
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick} className={`btn btn-${variant}`}>{children}</button>
}

// ❌ Ruim
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.children}</button>
}
```

### Backend (Express)

- Controllers para lógica de requisição
- Services para lógica de negócio
- Middleware para cross-cutting concerns
- Types para request/response

```typescript
// ✅ Bom
// controller
export async function createUser(req: Request, res: Response) {
  const user = await userService.create(req.body)
  res.json({ success: true, data: user })
}

// service
export async function create(data: CreateUserDto): Promise<User> {
  const hashedPassword = await bcrypt.hash(data.password, 10)
  return prisma.user.create({ data: { ...data, passwordHash: hashedPassword } })
}

// ❌ Ruim
export async function createUser(req, res) {
  const user = db.prepare('INSERT INTO users...').run(req.body)
  res.json(user)
}
```

### Nomenclatura

- **Arquivos:** `kebab-case` (ex: `user-controller.ts`)
- **Components:** `PascalCase` (ex: `UserProfile.tsx`)
- **Funções:** `camelCase` (ex: `getUserById`)
- **Constantes:** `UPPER_SNAKE_CASE` (ex: `MAX_RETRIES`)
- **Interfaces/Types:** `PascalCase` (ex: `User`, `CreateUserDto`)

### Estrutura de Arquivos

```
client/src/
├── components/
│   ├── ui/              # Componentes genéricos
│   ├── landing/         # Componentes da landing
│   └── studio/          # Componentes do studio
├── pages/               # Páginas (routes)
├── contexts/            # React contexts
├── hooks/               # Custom hooks
├── lib/                 # Utilitários
└── types/               # TypeScript types

server/
├── controllers/         # Request handlers
├── services/            # Business logic
├── routes/              # Route definitions
├── middleware/          # Express middleware
├── models/              # Database models
├── utils/               # Utilitários
└── types/               # TypeScript types
```

---

## 🔀 Processo de Pull Request

### 1. Atualize sua Branch

```bash
git fetch origin
git rebase origin/develop
```

### 2. Rode os Testes

```bash
npm run check      # TypeScript check
npm run test       # Unit tests
npm run e2e        # E2E tests
npm run lint       # Lint
```

### 3. Faça o Push

```bash
git push origin feature/sua-feature
```

### 4. Abra o PR

No GitHub:
- Vá em "Pull Requests"
- Clique em "New Pull Request"
- Preencha o template de PR
- Adicione reviewers apropriados

### Template de PR

```markdown
## Descrição
Breve descrição do que esta PR faz.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Testes
- [ ] Unit tests adicionados/atualizados
- [ ] E2E tests adicionados/atualizados
- [ ] Todos os testes passam

## Checklist
- [ ] Código segue padrões do projeto
- [ ] Self-review realizado
- [ ] Comentários adicionados se necessário
- [ ] Documentação atualizada
- [ ] Sem merge conflicts
- [ ] PR aprovada por reviewer
```

### 5. Review e Merge

- Aguarde aprovação dos reviewers
- Responda aos comentários
- Faça ajustes se necessário
- Após aprovação, o maintainer fará o merge

---

## 🧪 Testes

### Unit Tests (Vitest)

```typescript
// tests/unit/authService.test.ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../../server/services/authService.js'

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const hash = await hashPassword('test123')
      expect(hash).not.toBe('test123')
      expect(hash.length).toBeGreaterThan(20)
    })
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@test.com')
  await page.fill('input[name="password"]', 'test123')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/dashboard')
})
```

### Rodar Testes

```bash
# Unit tests
npm run test

# Unit tests com coverage
npm run test:coverage

# E2E tests
npm run e2e

# E2E tests com UI
npm run e2e:headed

# Todos os testes
npm run verify

# Pipeline local equivalente ao CI
npm run ci
```

---

## 📖 Documentação

### Quando Documentar

- Novas features
- Mudanças na API
- Mudanças breaking
- Complexidade não óbvia

### Onde Documentar

- **README.md:** Visão geral e setup
- **CODE_OF_CONDUCT.md:** Código de conduta
- **CONTRIBUTING.md:** Este arquivo
- **ARCHITECTURE.md:** Decisões de arquitetura
- **API_GUIDE.md:** Guia da API
- **Inline:** JSDoc para funções complexas

### JSDoc

```typescript
/**
 * Autentica um usuário com email e senha
 * @param email - Email do usuário
 * @param password - Senha do usuário
 * @returns Token JWT e dados do usuário
 * @throws {UnauthorizedError} Se credenciais inválidas
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  // ...
}
```

---

## 🐛 Reportando Bugs

### Antes de Reportar

- [ ] Verifique se o bug já foi reportado
- [ ] Confirme que não é um problema do seu ambiente
- [ ] Tente reproduzir na última versão

### Template de Bug Report

```markdown
## Descrição
Descrição clara e concisa do bug.

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '....'
3. Role para '....'
4. Veja o erro

## Comportamento Esperado
O que você esperava que acontecesse.

## Comportamento Atual
O que realmente aconteceu.

## Screenshots
Se aplicável, adicione screenshots.

## Ambiente
- OS: [e.g. macOS, Windows]
- Browser: [e.g. Chrome, Firefox]
- Versão: [e.g. 1.0.0]

## Contexto Adicional
Outras informações relevantes.
```

---

## 💡 Sugerindo Features

### Antes de Sugerir

- [ ] Verifique se a feature já foi sugerida
- [ ] Descreva o caso de uso claramente
- [ ] Explique por que é importante

### Template de Feature Request

```markdown
## Descrição do Problema
Qual problema esta feature resolveria?

## Solução Proposta
Descreva a solução desejada.

## Alternativas Consideradas
Quais outras soluções você considerou?

## Contexto Adicional
Outras informações relevantes.
```

---

## 📞 Perguntas e Suporte

- Abra uma issue no GitHub
- Entre em contato: contato@cenastudio.com.br
- Discord (em breve)

---

## 🎓 Recursos de Aprendizado

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express Documentation](https://expressjs.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

**Obrigado por contribuir! 🎉**
