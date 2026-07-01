# Onboarding Guide - Cena Studio

Guia para novos desenvolvedores entrando no projeto Cena Studio.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Setup do Ambiente](#setup-do-ambiente)
- [Estrutura do Código](#estrutura-do-código)
- [Fluxo de uma Requisição](#fluxo-de-uma-requisição)
- [Onde Encontrar Coisas](#onde-encontrar-coisas)
- [Primeiras Tarefas](#primeiras-tarefas)
- [Recursos de Aprendizado](#recursos-de-aprendizado)

---

## 👋 Bem-vindo!

Bem-vindo ao Cena Studio! Este guia vai te ajudar a se familiarizar com o códigobase e começar a contribuir rapidamente.

### O que é o Cena Studio?

Cena Studio é uma plataforma SaaS para produtoras audiovisuais, oferecendo:
- 12 ferramentas IA para produção (roteiro, decupagem, callsheet, etc.)
- CRM completo com pipeline de vendas
- Gestão de projetos e arquivos
- Review de vídeos com anotações
- Gestão de equipe e colaboradores

### Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Express + TypeScript + SQLite/Supabase
- **IA:** NVIDIA/Anthropic
- **Hosting:** Vercel
- **Banco:** SQLite (dev) → Supabase Postgres (prod)

---

## 💻 Setup do Ambiente

### Pré-requisitos

- Node.js 20+
- npm 11+
- Git
- VS Code (recomendado)
- Conta GitHub

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/frameai-director-correto.git
cd frameai-director-correto
```

### 2. Instale Dependências

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edite .env com suas configurações
```

**Mínimo necessário:**
```bash
JWT_SECRET=dev-secret-change-in-production
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_nvidia_key
```

### 4. Inicie o Servidor

```bash
npm run dev
```

**Serviços:**
- Frontend: http://localhost:5173
- API: http://localhost:5001

### 5. Verifique Setup

```bash
# TypeScript check
npm run check

# Rodar testes
npm run test
```

---

## 📁 Estrutura do Código

### Visão Geral

```
frameai-director-correto/
├── client/           # Frontend React
│   └── src/
│       ├── components/  # Componentes reutilizáveis
│       ├── pages/       # Páginas (routes)
│       ├── contexts/    # React contexts
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilitários
├── server/           # Backend Express
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── routes/       # Route definitions
│   ├── middleware/   # Express middleware
│   ├── models/       # Database models
│   └── utils/        # Utilitários
├── shared/           # Código compartilhado
│   ├── tools.ts      # Definição das 12 ferramentas IA
│   └── site.ts       # Configurações do site
└── supabase/         # Migrations do Supabase
```

### Frontend (client/)

**Components:**
- `ui/` - Componentes genéricos (Button, Input, etc.)
- `landing/` - Componentes da landing page
- `studio/` - Componentes do workspace IA

**Pages:**
- `Landing.tsx` - Página de marketing
- `Dashboard.tsx` - Painel principal
- `Studio.tsx` - Workspace das ferramentas
- `Clients.tsx` - CRM
- `VideoReviews.tsx` - Review de vídeos

**Contexts:**
- `AuthContext.tsx` - Estado de autenticação
- `ThemeContext.tsx` - Dark/light mode
- `LanguageContext.tsx` - i18n PT/EN
- `ProjectContext.tsx` - Estado do projeto

### Backend (server/)

**Controllers:**
- `authController.ts` - Login, registro, etc.
- `aiController.ts` - Geração IA
- `clientsController.ts` - CRUD de clientes
- `projectsController.ts` - CRUD de projetos
- `videoReviewsController.ts` - Review de vídeos

**Services:**
- `authService.ts` - Lógica de autenticação
- `aiService.ts` - Integração com APIs de IA
- `stripeService.ts` - Integração Stripe

**Routes:**
- `auth.ts` - Rotas de autenticação
- `ai.ts` - Rotas de IA
- `clients.ts` - Rotas de CRM

**Middleware:**
- `authenticate.ts` - Verificação de JWT
- `errorHandler.ts` - Tratamento de erros

---

## 🔄 Fluxo de uma Requisição

### Exemplo: Login de Usuário

```
1. Usuário clica em "Login"
   ↓
2. Frontend: Login.tsx chama API
   POST /api/auth/login
   ↓
3. Backend: router.ts → auth.ts → authController.ts
   ↓
4. Controller: authController.login()
   ↓
5. Service: authService.loginUser()
   ↓
6. Database: SQLite/Supabase query
   ↓
7. Service: Retorna user + gera JWT
   ↓
8. Controller: Responde com cookie httpOnly
   ↓
9. Frontend: AuthContext atualiza estado
   ↓
10. Usuário redirecionado para /dashboard
```

### Exemplo: Geração IA

```
1. Usuário preenche input no Studio
   ↓
2. Frontend: POST /api/ai/generate
   ↓
3. Backend: aiController.generate()
   ↓
4. Service: aiService.generateForTool()
   ↓
5. API Externa: NVIDIA/Anthropic
   ↓
6. Service: Processa resposta
   ↓
7. Database: Salva em generations
   ↓
8. Controller: Retorna resultado
   ↓
9. Frontend: Exibe output
```

---

## 🔍 Onde Encontrar Coisas

### "Onde fica a lógica de X?"

| Funcionalidade | Local |
|----------------|-------|
| Autenticação | `server/services/authService.ts` |
| Geração IA | `server/services/aiService.ts` |
| CRUD Clientes | `server/controllers/clientsController.ts` |
| CRUD Projetos | `server/controllers/projectsController.ts` |
| Video Review | `server/controllers/videoReviewsController.ts` |
| Analytics | `server/controllers/analyticsController.ts` |
| Definição Ferramentas IA | `shared/tools.ts` |
| Configurações Site | `shared/site.ts` |
| Schema Banco | `server/models/db.ts` |
| Migrations Supabase | `supabase/migrations/` |

### "Onde fica o componente X?"

| Componente | Local |
|------------|-------|
| Navbar | `client/src/components/AppNavBar.tsx` |
| Video Player | `client/src/components/VideoPlayer.tsx` |
| Command Palette | `client/src/components/CommandPalette.tsx` |
| Notifications | `client/src/components/NotificationsPopover.tsx` |
| Project Nav | `client/src/components/ProjectNav.tsx` |

### "Onde fica a página X?"

| Página | Local |
|--------|-------|
| Landing | `client/src/pages/Landing.tsx` |
| Dashboard | `client/src/pages/Dashboard.tsx` |
| Studio | `client/src/pages/Studio.tsx` |
| Clients | `client/src/pages/Clients.tsx` |
| Video Reviews | `client/src/pages/VideoReviews.tsx` |

---

## ✅ Primeiras Tarefas

Sugestão de tarefas para começar:

### Nível 1: Familiarização

1. **Explore o códigobase**
   - Leia `SYSTEM_DOCUMENTATION.md`
   - Navegue pelas pastas
   - Abra alguns arquivos principais

2. **Rode a aplicação**
   - `npm run dev`
   - Navegue pelo app
   - Teste as funcionalidades principais

3. **Leia os testes**
   - `tests/` (se existirem)
   - Entenda o que é testado

### Nível 2: Pequenas Mudanças

1. **Adicione um log**
   - Adicione `console.log` em um controller
   - Veja no terminal quando a função é chamada

2. **Modifique um componente**
   - Mude o texto de um botão
   - Adicione um novo campo em um formulário

3. **Crie um novo endpoint**
   - Adicione uma rota simples
   - Teste com curl ou Postman

### Nível 3: Feature Completa

1. **Adicione uma nova página**
   - Crie componente em `pages/`
   - Adicione rota em `App.tsx`
   - Teste navegação

2. **Adicione um novo endpoint**
   - Crie controller
   - Adicione rota
   - Teste com frontend

3. **Melhore uma feature existente**
   - Adicione validação
   - Melhore UX
   - Adicione testes

---

## 📚 Recursos de Aprendizado

### Documentação Interna

- `README.md` - Visão geral e setup
- `SYSTEM_DOCUMENTATION.md` - Documentação completa do sistema
- `SENIOR_LEVEL_ROADMAP.md` - Roadmap de melhorias
- `CONTRIBUTING.md` - Guia de contribuição
- `ARCHITECTURE.md` - Decisões de arquitetura
- `TROUBLESHOOTING.md` - Guia de troubleshooting

### Documentação Externa

**React:**
- [React Documentation](https://react.dev/)
- [React Hooks](https://react.dev/reference/react)

**TypeScript:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

**Express:**
- [Express Documentation](https://expressjs.com/)
- [Express Best Practices](https://github.com/goldbergyoni/nodebestpractices)

**Tailwind CSS:**
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://tailwindcomponents.com/cheatsheet/)

### Ferramentas

**VS Code Extensions:**
- ESLint
- Prettier
- TypeScript Importer
- GitLens
- Thunder Client (para testar APIs)

**Navegador:**
- React DevTools
- Redux DevTools (se usar Redux)

---

## 🤝 Perguntas Frequentes

### "Como eu testo o backend?"

```bash
# Usar curl
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Ou usar Thunder Client (VS Code extension)
# Ou Postman
```

### "Como eu debugo?"

```typescript
// Adicionar breakpoint no VS Code
debugger;

// Ou usar console.log
console.log({ userId, data }, 'Debug info');

// Ou usar debugger Chrome DevTools
// Abra DevTools > Sources > adicione breakpoint
```

### "Como eu adiciono uma nova ferramenta IA?"

1. Adicione em `shared/tools.ts`
2. O sistema vai seed automaticamente no banco
3. Crie página em `client/src/pages/` se necessário
4. Teste geração em `/studio/:id`

### "Como eu adiciono uma nova rota?"

1. Crie controller em `server/controllers/`
2. Crie rota em `server/routes/`
3. Importe em `server/router.ts`
4. Adicione middleware se necessário

### "Como eu adiciono uma nova página?"

1. Crie componente em `client/src/pages/`
2. Adicione rota em `client/src/App.tsx`
3. Adicione link no navbar se necessário

---

## 🎯 Próximos Passos

### Semana 1

- [ ] Setup completo do ambiente
- [ ] Leitura de toda documentação
- [ ] Exploração do códigobase
- [ ] Primeira pequena mudança

### Semana 2

- [ ] Primeira feature completa
- [ ] Adicionar testes
- [ ] Code review com time
- [ ] Merge para develop

### Semana 3+

- [ ] Features mais complexas
- [ ] Refatoração
- [ ] Melhorias de performance
- [ ] Contribuição para roadmap

---

## 📞 Suporte

**Time:**
- Email: contato@cenastudio.com.br
- Discord: [em breve]
- GitHub Issues: [abrir issue]

**Mentor:**
- Seu mentor será designado no primeiro dia
- Reuniões semanais de 1:1
- Code review em cada PR

---

**Bem-vindo ao time! Estamos animados em ter você conosco. 🎉**

**Última atualização:** 30 de Junho de 2026
