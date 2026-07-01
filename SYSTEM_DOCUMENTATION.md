# Cena Studio - Documentação Completa do Sistema

**Versão:** 1.0.0  
**Data:** 30 de Junho de 2026  
**Descrição:** Sistema operacional audiovisual com IA para produtoras

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura de Diretórios](#estrutura-de-diretórios)
5. [Banco de Dados](#banco-de-dados)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Ferramentas IA](#ferramentas-ia)
9. [Autenticação e Autorização](#autenticação-e-autorização)
10. [Configuração e Setup](#configuração-e-setup)
11. [Deploy](#deploy)
12. [Scripts Disponíveis](#scripts-disponíveis)

---

## 🎯 Visão Geral

Cena Studio é uma plataforma SaaS completa para produtoras audiovisuais, oferecendo:

- **12 Ferramentas IA** para produção audiovisual (roteiro, decupagem, callsheet, orçamento, etc.)
- **CRM completo** com pipeline de vendas
- **Gestão de Projetos** com contexto por job
- **Studio conectado ao projeto** com autosave por ferramenta, histórico por projeto e preenchimento seguro com dados do cliente
- **Review de Vídeos** com anotações frame-a-frame
- **Gestão de Arquivos** organizada por projeto
- **Gestão de Equipe** e colaboradores
- **Analytics** e relatórios operacionais
- **Sistema de Assinaturas** com múltiplos planos
- **Internacionalização** (PT/EN)

### Público-Alvo

- Produtoras audiovisuais
- Freelancers de vídeo
- Agências de publicidade
- Departamentos de marketing

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  React 19.2 + Vite 7.1 + TypeScript + Tailwind CSS v4      │
│  Wouter (Routing) + Radix UI (Components)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS /api/*
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Server (Backend)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware                                           │   │
│  │ - Helmet (Security)                                  │   │
│  │ - CORS                                               │   │
│  │ - Rate Limiting                                      │   │
│  │ - Cookie Parser                                      │   │
│  │ - Passport (GitHub OAuth)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes                                               │   │
│  │ - Auth, Tools, AI, Admin, Contact                    │   │
│  │ - Clients, Projects, Files, Collaborators           │   │
│  │ - Analytics, Video Reviews, Notifications            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Controllers                                          │   │
│  │ - Business logic layer                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Services                                             │   │
│  │ - AI Service (Anthropic/NVIDIA)                       │   │
│  │ - Auth Service                                       │   │
│  │ - Stripe Service                                     │   │
│  │ - Tool Service                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Layer (SQLite / Supabase)                  │
│  - better-sqlite3 (runtime atual)                           │
│  - Supabase Postgres (preparado para migração)              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Frontend** faz requisições para `/api/*` com cookies de autenticação
2. **Express** valida autenticação via JWT httpOnly cookies
3. **Controllers** processam a lógica de negócio
4. **Services** interagem com APIs externas (IA, Stripe) e banco de dados
5. **SQLite/Supabase** persiste os dados

### Fluxo Studio -> Documento -> Projeto

O Studio trabalha com `ProjectContext` como referência operacional:

1. Ao abrir `/project/:projectId/studio/:tool`, o projeto ativo é carregado pelo contexto.
2. A ferramenta busca o estado salvo em `project_states` para preservar campos e saída gerada.
3. Se não houver estado salvo, campos vazios podem ser preenchidos com dados de projeto, cliente e `metadataJson.creativeGoals`.
4. Gerações de IA são gravadas em `generations` com `project_id`.
5. O painel de histórico pode mostrar somente versões do projeto ativo ou todas as versões da ferramenta.
6. A página Documents reaproveita o mesmo contexto para preparar documentos operacionais antes de copiar/exportar PDF/Word.
7. Para continuidade robusta após reload, documentos de um job devem ser abertos por `/project/:projectId/documents`; a rota global `/documents` continua disponível para documentos sem projeto ativo.

Regra de produto: prefill nunca deve sobrescrever edição manual por padrão. Quando houver informação salva pelo usuário, o contexto atua como complemento para campos vazios.

### UI/UX Operacional

A interface evolui por continuidade de fluxo, preservando a identidade escura/cinematografica do Cena Studio:

1. A landing apresenta o fluxo central Cliente -> Projeto -> Studio -> Arquivos -> Fechamento para explicar o produto como sistema operacional, nao como paginas soltas.
2. O login inclui um painel de acesso operacional para reforcar o que entra no ambiente autenticado.
3. O fallback de carregamento usa skeleton da area de trabalho para melhorar velocidade percebida.
4. Tools destaca sessoes criticas e resultado esperado, reduzindo escolha abstrata de ferramenta.
5. Briefing, Proposta, Orcamento, Contratos e Entrega usam `SessionGuide` para mostrar progresso minimo, lacunas e saida esperada.
6. O Output do Studio aponta o proximo passo para documento/exportacao quando ha conteudo gerado.
7. Documents mostra contexto de projeto, cliente e documento quando aberto por `/project/:projectId/documents`.

Regra de design: mudar visual apenas quando melhora leitura, decisao ou continuidade entre cliente, projeto, IA, documento, arquivo e aprovacao.

---

## 💻 Stack Tecnológico

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 19.2.1 | Framework UI |
| Vite | 7.1.7 | Build tool & dev server |
| TypeScript | 5.6.3 | Tipagem estática |
| Tailwind CSS | 4.1.14 | Estilização |
| Wouter | 3.7.1 | Roteamento SPA |
| Radix UI | - | Componentes acessíveis |
| Framer Motion | 12.23.22 | Animações |
| React Hook Form | 7.64.0 | Formulários |
| Zod | 4.1.12 | Validação |
| @dnd-kit | - | Drag & drop |
| Lucide React | 0.453.0 | Ícones |
| Sonner | 2.0.7 | Toast notifications |
| React Player | 3.4.0 | Player de vídeo |
| @supabase/supabase-js | 2.108.2 | Cliente Supabase |

### Backend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Express | 4.21.2 | Server framework |
| TypeScript | 5.6.3 | Tipagem |
| tsx | 4.19.1 | TypeScript executor |
| better-sqlite3 | 11.8.1 | Banco de dados |
| bcryptjs | 3.0.2 | Hash de senhas |
| jsonwebtoken | 9.0.2 | JWT tokens |
| passport | 0.7.0 | Autenticação |
| passport-github2 | 0.1.12 | GitHub OAuth |
| @anthropic-ai/sdk | 0.39.0 | Anthropic AI |
| stripe | 17.7.0 | Pagamentos |
| helmet | 8.0.0 | Security headers |
| cors | 2.8.5 | CORS |
| express-rate-limit | 7.5.0 | Rate limiting |
| docx | 9.7.1 | Geração Word |
| jspdf | 4.2.1 | Geração PDF |

### DevOps

| Tecnologia | Uso |
|------------|-----|
| Vercel | Hosting & deployment |
| concurrently | Run multiple processes |
| esbuild | Server bundling |
| Playwright | E2E testing |
| Vitest | Unit testing |
| Prettier | Code formatting |

---

## 📁 Estrutura de Diretórios

```
frameai-director-correto/
├── api/                          # API adicional
│   ├── admin/                    # Admin routes
│   └── index.ts                  # API entry point
├── client/                       # Frontend React
│   ├── index.html                # HTML entry
│   ├── public/                   # Static assets
│   └── src/
│       ├── main.tsx              # React entry
│       ├── App.tsx               # Main app component
│       ├── index.css             # Global styles
│       ├── components/           # Reusable components
│       │   ├── landing/          # Landing page components
│       │   ├── studio/           # Studio/IA tools components
│       │   ├── ui/               # UI components (buttons, inputs, etc.)
│       │   ├── AppNavBar.tsx     # Main navigation
│       │   ├── ProjectNav.tsx    # Project contextual nav
│       │   ├── VideoPlayer.tsx   # Video player with annotations
│       │   ├── AnnotationCanvas.tsx  # Canvas for video annotations
│       │   ├── CommandPalette.tsx    # Cmd+K command palette
│       │   ├── NotificationsPopover.tsx  # Notifications UI
│       │   └── ...
│       ├── contexts/             # React contexts
│       │   ├── AuthContext.tsx   # Authentication state
│       │   ├── ThemeContext.tsx  # Dark/light mode
│       │   ├── LanguageContext.tsx  # i18n (PT/EN)
│       │   ├── ProjectContext.tsx   # Project state
│       │   └── AppContext.tsx    # Global app state
│       ├── hooks/                # Custom React hooks
│       │   ├── useDebounce.ts
│       │   ├── useMobile.tsx
│       │   ├── useComposition.ts
│       │   └── usePersistFn.ts
│       ├── lib/                  # Utilities
│       │   ├── types.ts          # TypeScript types
│       │   └── ...
│       ├── pages/                # Page components
│       │   ├── Landing.tsx       # Landing page
│       │   ├── Login.tsx         # Login page
│       │   ├── Register.tsx      # Registration
│       │   ├── Dashboard.tsx     # Main dashboard
│       │   ├── ProjectHub.tsx    # Project overview
│       │   ├── Studio.tsx        # AI tools workspace
│       │   ├── Tools.tsx         # Tools listing
│       │   ├── Clients.tsx       # CRM
│       │   ├── Pipeline.tsx      # Sales pipeline
│       │   ├── VideoReviews.tsx  # Video reviews
│       │   ├── Files.tsx         # File management
│       │   ├── Collaborators.tsx # Team management
│       │   ├── Analytics.tsx     # Analytics dashboard
│       │   ├── AdminDashboard.tsx # Admin panel
│       │   ├── AdminUsers.tsx    # User management (admin)
│       │   └── ...
│       ├── design-system/        # Design system
│       └── test/                 # Test utilities
├── server/                       # Backend Express
│   ├── index.ts                 # Server entry point
│   ├── app.ts                   # Express app setup
│   ├── router.ts                # API router
│   ├── config/                  # Configuration
│   │   └── passport.js          # Passport OAuth config
│   ├── controllers/             # Request handlers
│   │   ├── authController.ts
│   │   ├── aiController.ts
│   │   ├── clientsController.ts
│   │   ├── projectsController.ts
│   │   ├── videoReviewsController.ts
│   │   ├── analyticsController.ts
│   │   ├── adminController.ts
│   │   ├── checkoutController.ts
│   │   ├── filesController.ts
│   │   ├── collaboratorsController.ts
│   │   ├── exportController.ts
│   │   ├── notificationsController.ts
│   │   ├── studioSettingsController.ts
│   │   ├── interactionsController.ts
│   │   ├── opportunitiesController.ts
│   │   ├── projectMembersController.ts
│   │   ├── toolsController.ts
│   │   └── contactController.ts
│   ├── routes/                  # Route definitions
│   │   ├── auth.ts
│   │   ├── ai.ts
│   │   ├── tools.ts
│   │   ├── admin.ts
│   │   ├── clients.ts
│   │   ├── projects.ts
│   │   ├── videoReviews.ts
│   │   ├── analytics.ts
│   │   ├── checkout.ts
│   │   ├── files.ts
│   │   ├── collaborators.ts
│   │   ├── export.ts
│   │   ├── notifications.ts
│   │   ├── projectMembers.ts
│   │   ├── studioSettings.ts
│   │   └── contact.ts
│   ├── services/                # Business logic
│   │   ├── authService.ts
│   │   ├── aiService.ts
│   │   ├── stripeService.ts
│   │   ├── toolService.ts
│   │   ├── notificationService.ts
│   │   └── cnpjService.ts
│   ├── models/                  # Database models
│   │   ├── db.ts               # SQLite setup & migrations
│   │   └── types.ts            # Database types
│   ├── middleware/              # Express middleware
│   │   ├── authenticate.ts     # Auth middleware
│   │   ├── errorHandler.ts     # Error handling
│   │   └── validate.ts         # Request validation
│   ├── schemas/                # Validation schemas
│   └── utils/                   # Utilities
├── shared/                      # Shared code
│   ├── tools.ts                 # AI tools definitions (12 tools)
│   └── site.ts                  # Site configuration (pricing, nav, etc.)
├── supabase/                     # Supabase configuration
│   ├── migrations/              # Database migrations
│   │   ├── 20260630010000_initial_frame_schema.sql
│   │   └── 20260630011500_enable_rls_policies.sql
│   ├── config.toml              # Supabase CLI config
│   └── .temp/                   # Temporary files
├── scripts/                      # Utility scripts
│   ├── capture-landing-screens.mjs
│   ├── launch-check.mjs
│   └── production-auth-smoke.mjs
├── tests/                        # Test files
├── uploads/                      # User uploaded files
├── data/                         # SQLite database (./data/frame.db)
├── .env                          # Environment variables
├── .env.example                 # Environment template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite config
├── vercel.json                  # Vercel deployment config
└── README.md                    # Project documentation
```

---

## 🗄️ Banco de Dados

### Schema SQLite (Runtime Atual)

O sistema usa **SQLite** via `better-sqlite3` como banco de dados principal. O arquivo fica em `./data/frame.db`.

### Tabelas Principais

#### users
Usuários do sistema e autenticação
```sql
- id: INTEGER PRIMARY KEY
- email: TEXT UNIQUE NOT NULL
- password_hash: TEXT NOT NULL
- role: TEXT (admin/user)
- name: TEXT
- avatar_url: TEXT
- email_verified: INTEGER
- github_id: TEXT
- supabase_id: TEXT
- studio_name: TEXT
- studio_role: TEXT
- phone: TEXT
- created_at: TEXT
```

#### tools
Metadados das 12 ferramentas IA
```sql
- id: TEXT PRIMARY KEY (01-12)
- name: TEXT NOT NULL
- description: TEXT
- category: TEXT
- is_active: INTEGER
- updated_at: TEXT
```

#### generations
Histórico de gerações IA
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- tool_id: TEXT (FK tools)
- project_id: INTEGER (FK projects)
- input: TEXT
- output: TEXT
- created_at: TEXT
```

#### projects
Projetos dos usuários
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- client_id: INTEGER (FK clients)
- name: TEXT NOT NULL
- description: TEXT
- status: TEXT (active/archived)
- metadata_json: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### project_states
Estados de ferramentas por projeto
```sql
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK projects)
- tool_id: TEXT NOT NULL
- form_data: TEXT (JSON)
- output_data: TEXT
- updated_at: TEXT
- UNIQUE(project_id, tool_id)
```

#### clients
CRM - Clientes
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- name: TEXT NOT NULL
- company: TEXT
- email: TEXT
- phone: TEXT
- segment: TEXT
- status: TEXT (lead/client/archived)
- workflow_stage: TEXT
- notes: TEXT
- total_spent: INTEGER
- first_contact_at: TEXT
- last_contact_at: TEXT
- address: TEXT
- city: TEXT
- state: TEXT
- country: TEXT
- website: TEXT
- linkedin: TEXT
- instagram: TEXT
- industry: TEXT
- company_size: TEXT
- annual_revenue: INTEGER
- contact_person: TEXT
- contact_role: TEXT
- billing_cycle: TEXT
- payment_method: TEXT
- tax_id: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### opportunities
Pipeline de vendas
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- client_id: INTEGER (FK clients)
- title: TEXT NOT NULL
- stage: TEXT (prospect/qualified/proposal/negotiation/closed/lost)
- estimated_value: INTEGER
- probability: INTEGER
- expected_close_date: TEXT
- lost_reason: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### interactions
Histórico de interações com clientes
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- client_id: INTEGER (FK clients)
- opportunity_id: INTEGER (FK opportunities)
- type: TEXT (call/email/meeting/note)
- subject: TEXT
- notes: TEXT
- next_follow_up: TEXT
- created_at: TEXT
```

#### collaborators
Equipe/Colaboradores
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- name: TEXT NOT NULL
- email: TEXT NOT NULL
- role: TEXT
- phone: TEXT
- skills: TEXT
- daily_rate: INTEGER
- status: TEXT (active/inactive)
- availability: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### project_members
Membros por projeto
```sql
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK projects)
- user_id: INTEGER (FK users)
- collaborator_id: INTEGER (FK collaborators)
- role: TEXT
- permissions: TEXT (JSON array)
- created_at: TEXT
- updated_at: TEXT
```

#### files
Arquivos organizados por projeto
```sql
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK projects)
- user_id: INTEGER (FK users)
- filename: TEXT NOT NULL
- original_name: TEXT NOT NULL
- mime_type: TEXT
- size: INTEGER
- path: TEXT NOT NULL
- category: TEXT
- created_at: TEXT
```

#### video_reviews
Reviews de vídeos
```sql
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (FK projects)
- file_id: INTEGER (FK files)
- user_id: INTEGER (FK users)
- title: TEXT NOT NULL
- description: TEXT
- status: TEXT (draft/published)
- share_token: TEXT UNIQUE
- expires_at: TEXT
- video_url: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### video_comments
Comentários em vídeos (com anotações)
```sql
- id: INTEGER PRIMARY KEY
- review_id: INTEGER (FK video_reviews)
- user_id: INTEGER (FK users)
- author_name: TEXT NOT NULL
- timestamp_seconds: REAL NOT NULL
- comment: TEXT NOT NULL
- annotations: TEXT (JSON array)
- resolved: INTEGER
- created_at: TEXT
- updated_at: TEXT
```

#### notifications
Notificações do usuário
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- title: TEXT NOT NULL
- message: TEXT NOT NULL
- type: TEXT (info/success/warning/error)
- read: INTEGER
- link: TEXT
- created_at: TEXT
```

#### studio_settings
Configurações do studio por usuário
```sql
- user_id: INTEGER PRIMARY KEY (FK users)
- studio_name: TEXT
- legal_name: TEXT
- document: TEXT
- email: TEXT
- phone: TEXT
- city: TEXT
- website: TEXT
- signature: TEXT
- primary_color: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### subscriptions
Assinaturas e planos
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- plan_id: TEXT (FK plans)
- status: TEXT (active/canceled/trial)
- trial_ends_at: TEXT
- current_period_start: TEXT
- current_period_end: TEXT
- stripe_customer_id: TEXT
- stripe_subscription_id: TEXT
- created_at: TEXT
```

#### plans
Planos de preços
```sql
- id: TEXT PRIMARY KEY (free/pro/studio)
- name: TEXT NOT NULL
- price_brl: INTEGER NOT NULL
- generation_limit: INTEGER NOT NULL (-1 = unlimited)
- features: TEXT (JSON array)
```

#### usage
Controle de uso por usuário e ferramenta
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- tool_id: TEXT NOT NULL
- period: TEXT NOT NULL (YYYY-MM)
- count: INTEGER NOT NULL
- UNIQUE(user_id, tool_id, period)
```

#### reset_tokens
Tokens de reset de senha
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- token: TEXT UNIQUE NOT NULL
- expires_at: TEXT NOT NULL
- used: INTEGER
```

#### financial_entries
Entradas financeiras (planejado para futuro)
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER (FK users)
- client_id: INTEGER (FK clients)
- opportunity_id: INTEGER (FK opportunities)
- kind: TEXT (income/expense)
- description: TEXT NOT NULL
- category: TEXT
- amount: INTEGER
- status: TEXT (pending/settled/canceled)
- due_date: TEXT
- paid_at: TEXT
- recurrence: TEXT (once/monthly)
- is_fixed: INTEGER
- notes: TEXT
- created_at: TEXT
- updated_at: TEXT
```

#### contacts
Formulário de contato da landing
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT NOT NULL
- email: TEXT NOT NULL
- phone: TEXT
- message: TEXT NOT NULL
- type: TEXT (contact/demo)
- created_at: TEXT
```

### Índices

O sistema cria índices automaticamente para performance:
- `idx_users_email`, `idx_users_github_id`, `idx_users_supabase_id`
- `idx_projects_user_id`, `idx_projects_client_id`, `idx_projects_status`
- `idx_clients_user_id`, `idx_clients_status`
- `idx_generations_user_id`, `idx_generations_tool_id`, `idx_generations_project_id`, `idx_generations_created_at`
- `idx_project_states_project_id`
- `idx_interactions_client_id`, `idx_interactions_user_id`
- `idx_opportunities_user_id`, `idx_opportunities_client_id`, `idx_opportunities_stage`
- `idx_files_project_id`, `idx_files_user_id`
- `idx_video_reviews_project_id`, `idx_video_reviews_share_token`
- `idx_video_comments_review_id`
- `idx_notifications_user_id`, `idx_notifications_read`
- `idx_collaborators_user_id`
- `idx_project_members_project_id`, `idx_project_members_collaborator_id`
- `idx_financial_entries_user_id`, `idx_financial_entries_due_date`, `idx_financial_entries_status`
- `idx_reset_tokens_token`
- `idx_subscriptions_user_id`
- `idx_studio_settings_user_id`

### Migração para Supabase

O sistema possui migrations Supabase Postgres em `supabase/migrations/`:
- `20260630010000_initial_frame_schema.sql` - Schema inicial
- `20260630011500_enable_rls_policies.sql` - Row Level Security

As duas migrations foram aplicadas no projeto de produção em 30/06/2026. Autenticação, usuários, planos, assinaturas, uso, seed-base e os domínios operacionais principais usam Prisma/Postgres quando uma URL persistente está disponível. O fallback SQLite fica restrito ao desenvolvimento local/controlado.

O deploy `dpl_J8f2jBNL7ZwfEEHWGffqoV6eUY6g` de 30/06/2026 validou health, readiness, login, sessão, clientes, projetos, oportunidades, interações, colaboradores, membros de projeto, arquivos em Supabase Storage, video reviews, financeiro e analytics com `npm run smoke:prisma` contra a URL pública.

---

## 🔌 API Endpoints

### Autenticação

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/auth/login` | No | Login com email/senha |
| POST | `/api/auth/register` | No | Registro (14 dias trial Pro) |
| POST | `/api/auth/forgot-password` | No | Solicitar reset de senha |
| POST | `/api/auth/reset-password` | No | Resetar senha com token |
| POST | `/api/auth/logout` | No | Logout (limpa cookie) |
| GET | `/api/auth/me` | Yes | Obter usuário atual |
| GET | `/api/auth/github` | No | Iniciar OAuth GitHub |
| GET | `/api/auth/github/callback` | No | Callback OAuth GitHub |

### Ferramentas IA

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/tools` | No | Listar ferramentas ativas |
| GET | `/api/tools/:id` | No | Detalhes da ferramenta |
| POST | `/api/ai/generate` | Yes | Gerar conteúdo IA |

### Projetos

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/projects` | Yes | Listar projetos do usuário |
| POST | `/api/projects` | Yes | Criar projeto |
| GET | `/api/projects/:id` | Yes | Obter projeto |
| PUT | `/api/projects/:id` | Yes | Atualizar projeto |
| DELETE | `/api/projects/:id` | Yes | Excluir projeto |
| POST | `/api/projects/:id/state` | Yes | Salvar estado de ferramenta |
| GET | `/api/projects/:id/state/:toolId` | Yes | Obter estado de ferramenta |

### CRM - Clientes

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/clients` | Yes | Listar clientes |
| POST | `/api/clients` | Yes | Criar cliente |
| GET | `/api/clients/:id` | Yes | Obter cliente |
| PUT | `/api/clients/:id` | Yes | Atualizar cliente |
| DELETE | `/api/clients/:id` | Yes | Excluir cliente |
| GET | `/api/clients/stats` | Yes | Estatísticas de clientes |

### Pipeline de Vendas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/clients/opportunities` | Yes | Listar oportunidades |
| POST | `/api/clients/opportunities` | Yes | Criar oportunidade |
| GET | `/api/clients/opportunities/:id` | Yes | Obter oportunidade |
| PUT | `/api/clients/opportunities/:id` | Yes | Atualizar oportunidade |
| DELETE | `/api/clients/opportunities/:id` | Yes | Excluir oportunidade |
| GET | `/api/clients/opportunities/stats` | Yes | Estatísticas de pipeline |

### Interações

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/clients/interactions` | Yes | Listar interações |
| POST | `/api/clients/interactions` | Yes | Criar interação |
| PUT | `/api/clients/interactions/:id` | Yes | Atualizar interação |
| DELETE | `/api/clients/interactions/:id` | Yes | Excluir interação |

### Arquivos

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/files/projects/:projectId` | Yes | Listar arquivos do projeto |
| POST | `/api/files/upload` | Yes | Upload de arquivo |
| GET | `/api/files/:id/download` | Yes | Download de arquivo |
| DELETE | `/api/files/:id` | Yes | Excluir arquivo |

### Video Reviews

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/video-reviews/projects/:projectId` | Yes | Listar reviews do projeto |
| POST | `/api/video-reviews` | Yes | Criar review |
| GET | `/api/video-reviews/:id` | Yes | Obter review com comentários |
| PUT | `/api/video-reviews/:id` | Yes | Atualizar review |
| DELETE | `/api/video-reviews/:id` | Yes | Excluir review |
| POST | `/api/video-reviews/:id/share` | Yes | Gerar link compartilhável |
| POST | `/api/video-reviews/:id/comments` | Yes | Adicionar comentário |
| PUT | `/api/video-reviews/comments/:id/resolve` | Yes | Resolver/reabrir comentário |
| DELETE | `/api/video-reviews/comments/:id` | Yes | Excluir comentário |

### Video Reviews - Público

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/public/video-reviews/shared/:token` | No | Acesso público ao review |
| GET | `/api/public/video-reviews/shared/:token/video` | No | Stream do vídeo público |
| POST | `/api/public/video-reviews/shared/:token/comments` | No | Comentário público |
| PATCH | `/api/public/video-reviews/shared/:token/status` | No | Atualizar status público |

### Colaboradores

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/collaborators` | Yes | Listar colaboradores |
| POST | `/api/collaborators` | Yes | Criar colaborador |
| PUT | `/api/collaborators/:id` | Yes | Atualizar colaborador |
| DELETE | `/api/collaborators/:id` | Yes | Excluir colaborador |
| GET | `/api/collaborators/stats` | Yes | Estatísticas de equipe |

### Membros do Projeto

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/project-members/:projectId` | Yes | Listar membros do projeto |
| POST | `/api/project-members` | Yes | Adicionar membro ao projeto |
| PUT | `/api/project-members/:id` | Yes | Atualizar membro do projeto |
| DELETE | `/api/project-members/:id` | Yes | Remover membro do projeto |

### Analytics

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/analytics/overall` | Yes | Métricas gerais |
| GET | `/api/analytics/projects/:id` | Yes | Métricas por projeto |
| GET | `/api/analytics/revenue` | Yes | Métricas de receita |
| GET | `/api/analytics/activity` | Yes | Métricas de atividade |

### Notificações

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/notifications` | Yes | Listar notificações |
| PUT | `/api/notifications/:id/read` | Yes | Marcar como lida |
| PUT | `/api/notifications/read-all` | Yes | Marcar todas como lidas |
| GET | `/api/notifications/unread-count` | Yes | Contador de não lidas |

### Studio Settings

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/studio-settings` | Yes | Obter configurações |
| PUT | `/api/studio-settings` | Yes | Atualizar configurações |

### Export

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/export/projects/:id` | Yes | Exportar projeto (JSON/CSV) |
| GET | `/api/export/clients/:id` | Yes | Exportar cliente (JSON/CSV) |
| GET | `/api/export/clients` | Yes | Exportar todos clientes (JSON/CSV) |
| GET | `/api/export/pipeline` | Yes | Exportar pipeline (JSON/CSV) |

### Admin

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/tools` | Admin | Listar todas ferramentas |
| POST | `/api/admin/tools` | Admin | Criar ferramenta |
| PUT | `/api/admin/tools/:id` | Admin | Atualizar ferramenta |
| DELETE | `/api/admin/tools/:id` | Admin | Soft-delete ferramenta |
| GET | `/api/admin/users` | Admin | Listar usuários |
| PUT | `/api/admin-user-role` | Admin | Atualizar role de usuário |
| PUT | `/api/admin-user-plan` | Admin | Atualizar plano de usuário |

### Checkout (Stripe - Legado)

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/checkout/session` | Yes | Criar sessão Stripe Checkout |
| POST | `/api/checkout/portal` | Yes | URL do Stripe Customer Portal |
| POST | `/api/checkout/webhook` | No | Webhook Stripe |

### Contato

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/contact` | No | Formulário de contato |
| POST | `/api/contact/demo` | No | Solicitação de demo |

### Formato de Resposta

Todas as respostas seguem o padrão:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

---

## 🎨 Frontend Components

### Componentes Principais

#### AppNavBar.tsx
Barra de navegação principal com:
- Logo e branding
- Links de navegação
- Toggle de tema (dark/light)
- Switcher de idioma (PT/EN)
- Menu de usuário
- Badge de notificações
- Command palette trigger (Cmd+K)

#### ProjectNav.tsx
Navegação contextual do projeto com abas:
- Visão Geral
- Studio
- Arquivos
- Aprovação
- Equipe

#### VideoPlayer.tsx
Player de vídeo customizado com:
- Controles de reprodução
- Timeline com marcadores de comentários
- Suporte a múltiplos formatos
- Integração com AnnotationCanvas

#### AnnotationCanvas.tsx
Canvas para anotações frame-a-frame:
- Desenho de formas (retângulo, seta, texto)
- Cores personalizáveis
- Posicionamento relativo ao vídeo
- Export de anotações como JSON

#### CommandPalette.tsx
Command palette global (Cmd+K) com:
- Busca de comandos
- Navegação rápida
- Atalhos de teclado

#### NotificationsPopover.tsx
Popover de notificações com:
- Lista de notificações
- Marcar como lida
- Link para ação
- Contador de não lidas

#### EmptyState.tsx
Componente de estado vazio reutilizável com:
- Ícone ilustrativo
- Mensagem descritiva
- CTA (Call to Action)

#### LanguageSwitcher.tsx
Switcher de idioma com:
- Toggle PT/EN
- Persistência no localStorage
- Context centralizado

### Componentes de UI (ui/)

Baseados em Radix UI com estilização Tailwind:
- Button, Input, Textarea
- Dialog, AlertDialog
- Dropdown Menu, Context Menu
- Select, Checkbox, Radio Group
- Tabs, Accordion
- Tooltip, Popover
- Scroll Area
- Avatar
- Progress
- Slider
- Switch
- Separator
- E mais...

### Páginas (pages/)

#### Landing.tsx
Página de marketing com:
- Hero section
- Showcase de ferramentas
- Pricing
- Testimonials
- CTA sections
- Footer

#### Dashboard.tsx
Painel principal com:
- Lista de projetos
- Quick actions
- Stats overview
- Recent activity

#### ProjectHub.tsx
Hub do projeto com:
- Visão geral do projeto
- Acesso rápido às ferramentas
- Arquivos recentes
- Status de aprovações
- Membros da equipe

#### Studio.tsx
Workspace das ferramentas IA com:
- Interface unificada para as 12 ferramentas
- Input de texto
- Preview de output
- Export (PDF, DOCX, TXT)
- Histórico de gerações

#### Clients.tsx
CRM completo com:
- Lista de clientes
- Filtros e busca
- Pipeline Kanban
- Stats de clientes
- Ações rápidas

#### Pipeline.tsx
Kanban de oportunidades com:
- Colunas por stage
- Drag & drop
- Cards com info da oportunidade
- Filtros

#### VideoReviews.tsx
Gestão de reviews com:
- Lista de reviews
- Criação de review
- Player com anotações
- Comentários
- Compartilhamento

#### Files.tsx
Gestão de arquivos com:
- Upload drag & drop
- Organização por projeto
- Preview de arquivos
- Download

#### Collaborators.tsx
Gestão de equipe com:
- Lista de colaboradores
- Skills e diárias
- Disponibilidade
- Stats da equipe

#### Analytics.tsx
Dashboard de analytics com:
- Gráficos de métricas
- Filtros por período
- Export de relatórios
- KPIs principais

#### AdminDashboard.tsx
Painel admin com:
- Métricas do sistema
- Contagem de usuários
- Atividade recente

#### AdminUsers.tsx
Gestão de usuários (admin only) com:
- Lista de usuários
- Edição de roles
- Edição de planos
- Stats de usuários

### Contexts

#### AuthContext.tsx
Gerencia autenticação:
- Estado do usuário
- Funções de login/logout
- Verificação de permissões

#### ThemeContext.tsx
Gerencia tema:
- Dark/light mode
- Persistência no localStorage
- CSS variables

#### LanguageContext.tsx
Gerencia internacionalização:
- i18n PT/EN
- Traduções em memória
- Persistência no localStorage

#### ProjectContext.tsx
Gerencia estado do projeto:
- Dados do projeto atual
- Estados das ferramentas
- Membros do projeto

#### AppContext.tsx
Estado global da aplicação:
- Configurações do app
- Dados compartilhados

---

## 🤖 Ferramentas IA

O sistema possui **12 ferramentas IA** definidas em `shared/tools.ts`:

### 01 - Gerador de Roteiro (roteiro)
- **Categoria:** Pré-produção
- **Descrição:** Roteiros formatados em padrão ABNT/Hollywood
- **Tags:** Ficção, Publicidade, Institucional, Publicitário
- **Tempo:** Menos de 2 minutos
- **Output:** Roteiro completo com diálogos, indicações técnicas, timecode

### 02 - Decupagem Técnica (decupagem)
- **Categoria:** Direção
- **Descrição:** Planos, movimentos de câmera, lentes recomendadas
- **Tags:** Direção, DOP, Planejamento, Plano
- **Tempo:** Menos de 3 minutos
- **Output:** Decupagem detalhada com equipamentos necessários

### 03 - Callsheet Inteligente (callsheet)
- **Categoria:** Produção
- **Descrição:** Contatos, horários, locações e necessidades do set
- **Tags:** Produção, Logística, Equipe, Set
- **Tempo:** Menos de 1 minuto
- **Output:** Callsheet profissional completo

### 04 - Orçamento Automático (orcamento)
- **Categoria:** Comercial
- **Descrição:** Orçamentos realistas com diárias de mercado
- **Tags:** Comercial, Produtora, Freelance
- **Tempo:** Menos de 2 minutos
- **Output:** Orçamento detalhado em BRL por categoria

### 05 - Proposta Comercial (proposta)
- **Categoria:** Vendas
- **Descrição:** Escopo, cronograma, valor e termos de pagamento
- **Tags:** Vendas, Cliente, Contrato
- **Tempo:** Menos de 1 minuto
- **Output:** Proposta comercial profissional

### 06 - Contratos (contrato)
- **Categoria:** Jurídico
- **Descrição:** Contratos de serviço, cessão de imagem, NDA
- **Tags:** Jurídico, Proteção
- **Tempo:** Menos de 2 minutos
- **Output:** Rascunho de contrato (requer revisão jurídica)

### 07 - Briefing Inteligente (briefing)
- **Categoria:** Atendimento
- **Descrição:** Extração e organização de informações do cliente
- **Tags:** Discovery, Atendimento
- **Tempo:** Menos de 1 minuto
- **Output:** Briefing estruturado completo

### 08 - Moodboard & Look (moodboard)
- **Categoria:** Arte
- **Descrição:** Paleta de cores, referências visuais, iluminação
- **Tags:** Arte, Look, Cor
- **Tempo:** Menos de 2 minutos
- **Output:** Moodboard textual com prompts para IA de imagem

### 09 - Checklist de Set (checklist)
- **Categoria:** Produção
- **Descrição:** Lista completa de câmera, áudio, iluminação
- **Tags:** Set, Câmera, Áudio
- **Tempo:** Menos de 1 minuto
- **Output:** Checklist operacional completo

### 10 - Cronograma (cronograma)
- **Categoria:** Gestão
- **Descrição:** Fases de pré-produção, filmagem, pós-produção
- **Tags:** Gestão, Prazo
- **Tempo:** Menos de 2 minutos
- **Output:** Cronograma com marcos e dependências

### 11 - Relatório de Entrega (entrega)
- **Categoria:** Pós-produção
- **Descrição:** Especificações técnicas, arquivos entregues
- **Tags:** Pós-prod, Arquivo, Entrega
- **Tempo:** Menos de 2 minutos
- **Output:** Relatório de entrega profissional

### 12 - Assistente Livre (assistente)
- **Categoria:** IA
- **Descrição:** Chat livre sobre produção, câmera, carreira
- **Tags:** IA, Chat, Dúvidas
- **Tempo:** Resposta em segundos
- **Output:** Respostas conversacionais

### Providers de IA

O sistema suporta dois providers de IA:

#### Anthropic (Padrão)
- **Modelo:** Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Env:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **SDK:** @anthropic-ai/sdk

#### NVIDIA (Alternativo)
- **Modelo:** Nemotron 3 Ultra 550B (nvidia/nemotron-3-ultra-550b-a55b)
- **Env:** `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_INVOKE_URL`
- **Config:** `NVIDIA_MAX_TOKENS`, `NVIDIA_TEMPERATURE`, `NVIDIA_TOP_P`, `NVIDIA_ENABLE_THINKING`, `NVIDIA_REASONING_BUDGET`, `NVIDIA_TIMEOUT_MS`

---

## 🔐 Autenticação e Autorização

### Métodos de Autenticação

1. **Email/Password**
   - Registro com email e senha
   - Login com credenciais
   - Reset de senha via email

2. **GitHub OAuth**
   - Login via conta GitHub
   - Passport.js
   - Criação automática de usuário

### JWT Tokens

- **Storage:** httpOnly cookie (seguro contra XSS)
- **Secret:** `JWT_SECRET` (obrigatório)
- **Expiry:** Configurável

### Roles

- **admin:** Acesso total ao sistema
- **user:** Acesso padrão ao produto

### Middleware de Autenticação

```typescript
// server/middleware/authenticate.ts
- authenticate: Verifica JWT válido
- requireAdmin: Verifica role = admin
```

### Contas Padrão (Seed)

| Email | Senha | Role | Plano |
|-------|--------|------|-------|
| admin@cenastudio.com.br | admin123 | admin | Studio |
| demo@cenastudio.com.br | demo123 | user | Free |

**Importante:** Alterar senhas em produção via `ADMIN_DEFAULT_PASSWORD` e `DEMO_USER_PASSWORD`.

---

## ⚙️ Configuração e Setup

### Variáveis de Ambiente Obrigatórias

```bash
# JWT
JWT_SECRET=sua_chave_secreta_minimo_32_caracteres

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=chave_anonima
SUPABASE_SERVICE_ROLE_KEY=chave_service_role
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=chave_anonima

# Cliente
CLIENT_ORIGIN=https://seu-dominio.com
```

### Variáveis de Ambiente Opcionais

```bash
# IA Provider (anthropic ou nvidia)
AI_PROVIDER=anthropic

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# NVIDIA
NVIDIA_API_KEY=nvapi-...
NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b
NVIDIA_INVOKE_URL=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MAX_TOKENS=2048
NVIDIA_TEMPERATURE=0.7
NVIDIA_TOP_P=0.95
NVIDIA_ENABLE_THINKING=true
NVIDIA_REASONING_BUDGET=512
NVIDIA_TIMEOUT_MS=60000

# GitHub OAuth
GITHUB_CLIENT_ID=seu_client_id
GITHUB_CLIENT_SECRET=seu_client_secret
GITHUB_CALLBACK_URL=https://seu-dominio.com/api/auth/github/callback

# Stripe (Legado)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Contas Padrão
ADMIN_DEFAULT_PASSWORD=admin123
DEMO_USER_PASSWORD=demo123

# Database local opcional
DATABASE_PATH=./data/frame.db

# Produção
POSTGRES_PRISMA_URL=<fornecido pela integração Supabase/Vercel>
```

### Setup Local

```bash
# 1. Clonar repositório
git clone <repo-url>
cd frameai-director-correto

# 2. Instalar dependências
npm install

# 3. Configurar environment
cp .env.example .env
# Editar .env com suas variáveis

# 4. Iniciar desenvolvimento
npm run dev
```

**Serviços:**
- Frontend: http://localhost:5173
- API: http://localhost:5001 (proxied via Vite como `/api`)

### Checklist de Lançamento

Para produção pública:

- [ ] `JWT_SECRET` forte (32+ caracteres)
- [ ] `CLIENT_ORIGIN` apontando para domínio final
- [ ] Supabase configurado (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.)
- [ ] Migrations Supabase aplicadas
- [ ] Banco persistente Postgres via `POSTGRES_PRISMA_URL`, `POSTGRES_URL` ou `DATABASE_URL`
- [ ] `ALLOW_EPHEMERAL_SQLITE` ausente em produção
- [ ] IA provider configurado com API key
- [ ] GitHub OAuth configurado (opcional)
- [ ] Senhas padrão alteradas
- [ ] SSL/HTTPS configurado
- [ ] Rate limiting configurado
- [ ] Backup de banco configurado

---

## 🚀 Deployment

### Vercel

O sistema está configurado para deploy no Vercel.

#### Configuração

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "rewrites": [
    { "source": "/health", "destination": "/api?_rootPath=health" },
    { "source": "/ready", "destination": "/api?_rootPath=ready" },
    { "source": "/api/:path*", "destination": "/api?_apiPath=:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

#### Variáveis de Ambiente no Vercel

Configure no painel do Vercel:
- Todas as variáveis obrigatórias
- `NODE_ENV=production`
- `POSTGRES_PRISMA_URL` pela integração Supabase/Vercel, ou `DATABASE_URL` manual
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`

#### Requisitos de Runtime Vercel

- O Express deve manter `app.set("trust proxy", 1)` para aceitar os headers `X-Forwarded-*` da Vercel.
- O `express-rate-limit` depende dessa configuração para não falhar em rotas como `/api/auth/login`.
- O cookie de autenticação usado pelo backend é `frame_token`.
- Os endpoints `/health` e `/ready` são expostos na raiz do domínio para monitoramento.
- `DATABASE_URL`, `POSTGRES_PRISMA_URL` ou `POSTGRES_URL` deve apontar para Postgres em produção persistente.
- A integração Supabase/Vercel fornece `POSTGRES_PRISMA_URL`; não é necessário duplicá-la como `DATABASE_URL`.
- `ALLOW_EPHEMERAL_SQLITE=true` é permitido apenas para beta/teste controlado; a produção atual não usa essa variável.
- O Prisma Client é gerado no `postinstall` e usa `prisma.config.ts`.
- O runtime Prisma 7 usa o adaptador oficial `@prisma/adapter-pg`, pool pequeno por instância serverless, timeout de conexão padrão de 30s e retry curto para erros transitórios do pooler.

#### Build Command

```bash
npm run build
```

#### Start Command

```bash
npm start
```

### Considerações de Banco de Dados

**Importante:** O Vercel usa filesystem efêmero. SQLite em `/tmp` não persiste entre deploys.

**Soluções:**
1. Usar Supabase Postgres via Prisma (recomendado)
2. Usar Vercel Postgres
3. Usar serviço de banco externo (Railway, Neon, etc.)

O sistema possui schema SQL em `supabase/migrations/` e schema Prisma em `prisma/schema.prisma`.

Arquivos enviados pelo usuário usam Supabase Storage no bucket privado `project-files` por padrão. Downloads são entregues por URL assinada.

### Backup

Configure backup automático do banco de dados:
- Supabase: Backup automático incluído
- SQLite: Script de backup para S3/R2

---

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor API + Vite dev (hot reload) |
| `npm run build` | Build client + bundle server |
| `npm start` | Servidor produção (serve SPA + API) |
| `npm run preview` | Preview do build de produção |
| `npm run check` | TypeScript check (`tsc --noEmit`) |
| `npm run test` | Test suite (`vitest run`) |
| `npm run e2e` | QA visual e fluxos críticos com Playwright |
| `npm run e2e:headed` | Playwright com UI visível |
| `npm run landing:capture` | Regera prints da landing em tema claro |
| `npm run verify` | TypeScript + testes + build |
| `npm run launch:check` | Valida env essencial e RLS do Supabase |
| `npm run production:smoke` | Teste de smoke em produção |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run format` | Prettier format |

---

## 📊 Rotas do Frontend

| Rota | Componente | Auth | Descrição |
|------|------------|------|-----------|
| `/` | Landing.tsx | No | Landing page |
| `/login` | Login.tsx | No | Login |
| `/register` | Register.tsx | No | Registro |
| `/forgot-password` | ForgotPassword.tsx | No | Esqueci senha |
| `/reset-password` | ResetPassword.tsx | No | Resetar senha |
| `/dashboard` | Dashboard.tsx | Yes | Painel principal |
| `/project/:id` | ProjectHub.tsx | Yes | Hub do projeto |
| `/project/:id/studio/:toolId` | Studio.tsx | Yes | Studio com contexto |
| `/project/:id/files` | Files.tsx | Yes | Arquivos do projeto |
| `/project/:id/video-reviews` | VideoReviews.tsx | Yes | Reviews do projeto |
| `/project/:id/collaborators` | Collaborators.tsx | Yes | Equipe do projeto |
| `/studio/:id` | Studio.tsx | Yes | Studio standalone |
| `/tools` | Tools.tsx | Yes | Listagem de ferramentas |
| `/tools/:id` | ToolDetail.tsx | Yes | Detalhe da ferramenta |
| `/clients` | Clients.tsx | Yes | CRM |
| `/clients/new` | NewClient.tsx | Yes | Novo cliente |
| `/clients/:id/editar` | EditClient.tsx | Yes | Editar cliente |
| `/pipeline` | Pipeline.tsx | Yes | Pipeline de vendas |
| `/proposals` | Proposals.tsx | Yes | Propostas |
| `/interactions` | Interactions.tsx | Yes | Interações |
| `/documents` | Documents.tsx | Yes | Documentos |
| `/company` | CompanySettings.tsx | Yes | Configurações da empresa |
| `/files/:projectId` | Files.tsx | Yes | Arquivos por projeto |
| `/video-reviews/:projectId` | VideoReviews.tsx | Yes | Reviews por projeto |
| `/review/:token` | SharedReview.tsx | No | Review público |
| `/collaborators` | Collaborators.tsx | Yes | Gestão de equipe |
| `/analytics` | Analytics.tsx | Yes | Analytics |
| `/profile` | Profile.tsx | Yes | Perfil do usuário |
| `/success` | Success.tsx | Yes | Página de sucesso |
| `/admin` | AdminDashboard.tsx | Admin | Admin dashboard |
| `/admin/gerenciar` | AdminUsers.tsx | Admin | Gestão de usuários |

---

## 🎯 Planos de Preços

### Free (Iniciante)
- **Preço:** R$0/mês
- **Gerações:** 5/mês
- **Features:**
  - Acesso inicial às ferramentas
  - Export .txt
  - Projetos para teste
  - CRM básico
  - Suporte por email

### Pro (Profissional)
- **Preço:** R$49/mês
- **Gerações:** 50/mês
- **Features:**
  - Fluxos principais de produção
  - Histórico completo
  - Export PDF e DOCX
  - Review de vídeos com anotações
  - CRM completo + pipeline
  - Suporte prioritário

### Studio (Produtora)
- **Preço:** R$99/mês
- **Gerações:** Ilimitadas
- **Features:**
  - Tudo do Profissional
  - Projetos e pastas
  - Equipe e colaboradores
  - Arquivos e aprovações por projeto
  - Suporte prioritário
  - Relatórios operacionais

### Trial
- Novos usuários recebem 14 dias de plano Pro automaticamente

---

## 🌍 Internacionalização (i18n)

### Idiomas Suportados
- Português (PT) - Padrão
- Inglês (EN)

### Implementação
- **Context:** `LanguageContext.tsx`
- **Storage:** localStorage
- **Switcher:** `LanguageSwitcher.tsx`
- **Traduções:** Em memória no context

### Uso
```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { t, language, setLanguage } = useLanguage();
```

---

## 🔒 Segurança

### Headers de Segurança
- Helmet via Express
- CSP configurado
- Frameguard habilitado
- HSTS (recomendado em produção)

### Rate Limiting
- Auth: 60 req/15min
- AI: 20 req/min
- Forms: 60 req/15min

### CORS
- Origin configurado via `CLIENT_ORIGIN`
- Credentials: include

### Autenticação
- JWT httpOnly cookies
- Bcrypt para hash de senhas
- Passport.js para OAuth

### Validação
- Zod schemas para validação de input
- TypeScript para type safety

---

## 📈 Analytics e Monitoramento

### Métricas Coletadas
- Gerações por ferramenta
- Uso por usuário
- Projetos criados
- Clientes cadastrados
- Oportunidades no pipeline
- Receita (quando integrado)

### Dashboards
- Dashboard geral (admin)
- Analytics por usuário
- Analytics por projeto

---

## 🧪 Testes

### Unit Tests (Vitest)
```bash
npm run test
```

### E2E Tests (Playwright)
```bash
npm run e2e
npm run e2e:headed  # Com UI
```

### Test Coverage
- Componentes críticos
- Controllers principais
- Services de negócio

---

## 🐛 Troubleshooting

### Banco de dados não inicia
- Verifique `DATABASE_PATH`
- Verifique permissões de escrita
- Em Vercel, configure banco persistente

### IA retorna 503
- Verifique `AI_PROVIDER`
- Verifique API key do provider configurado
- Verifique quota da API

### Autenticação falha
- Verifique `JWT_SECRET`
- Verifique cookie settings
- Verifique `CLIENT_ORIGIN`

### Upload de arquivos falha
- Verifique permissões da pasta `uploads/`
- Verifique tamanho máximo configurado
- Verifique espaço em disco

---

## 📞 Suporte

### Documentção Adicional
- `README.md` - Documentação principal
- `CHANGELOG.md` - Histórico de mudanças
- `.env.example` - Template de environment
- `shared/tools.ts` - Definição das ferramentas
- `shared/site.ts` - Configurações do site

### Contato
- Email: contato@cenastudio.com.br
- Site: cenastudio.com.br

---

## 📄 Licença

MIT License - Ver arquivo LICENSE para detalhes.

---

**Última atualização:** 30 de Junho de 2026  
**Versão do documento:** 1.0.0
