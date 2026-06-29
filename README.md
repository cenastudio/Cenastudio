# Cena Studio

Inteligência artificial para produção audiovisual — roteiros, callsheets, decupagem, orçamentos, CRM, reviews de vídeos e muito mais.

**Última atualização:** 29 de Junho de 2026

## 🌍 Internacionalização (i18n)

- **Idioma PT/EN**: Botão discreto na landing page para alternar entre Português e Inglês
- **Context centralizado**: `client/src/contexts/LanguageContext.tsx` gerencia estado e persisted no `localStorage`
- **Traduções em memória**: `pt` e `en` com chaves por seção (nav, hero, workflow, pricing, footer)
- **Switcher reutilizável**: `LanguageSwitcher.tsx` para uso em qualquer componente
- **Tipos compartilhados**: `Language` exportado em `shared/site.ts` + tipos em `client/src/lib/types.ts`

## 🚀 Novidades Recentes

- **Project Hub**: Página `/project/:id` com visão geral do projeto, ferramentas de acesso rápido, arquivos recentes e aprovações
- **Nav Contextual**: Barra `ProjectNav` com abas (Visão Geral, Studio, Arquivos, Aprovação, Equipe) em todas as páginas do projeto
- **Admin Users**: Página `/admin/gerenciar` para gerenciar usuários, papéis e planos
- **Pagamento via PIX/WhatsApp**: landing direciona para contato comercial via WhatsApp + PIX; Stripe permanece como integração legada/API disponível
- **opencode Skills**: 5 skills configuradas (ui-refine, ux-flow, animations, routes-structure, database-evolve)
- **In-App Notifications**: Sistema de notificações com popover no navbar
- **Command Palette**: Cmd+K global com 12 comandos de navegação
- **EmptyState Component**: Componente compartilhado de estado vazio com CTA
- **Bugfixes**: Tool lookup por slug, Zod schema projectId, collaborators schema (daily_rate + status), client address preserve, Stripe webhook duplicate sub, dead code removido

## 📍 Rotas Principais

| Rota | Propósito |
|------|----------|
| `/` | **Landing** — marketing, pricing, contato (sem auth) |
| `/login` | **Login** — email/password ou GitHub OAuth |
| `/register` | **Registro** — nova conta (trial de 14 dias Pro) |
| `/forgot-password` | Solicitação de reset de senha |
| `/reset-password` | Definir nova senha (`?token=`) |
| `/dashboard` | **Painel** — lista de projetos, fixar, criar, excluir |
| `/clients` | **CRM** — listagem de clientes |
| `/clients/new` | **CRM** — criação de cliente |
| `/clients/:id/editar` | **CRM** — edição de cliente |
| `/pipeline` | **Pipeline** — Kanban de oportunidades de vendas |
| `/proposals` | **Propostas** — gestão de propostas comerciais |
| `/interactions` | **Interações** — histórico de contatos com clientes |
| `/documents` | **Documentos** — gestão de documentos do projeto |
| `/company` | **Empresa** — configurações da empresa |
| `/files/:projectId` | **Arquivos** — upload e gestão de arquivos por projeto |
| `/video-reviews/:projectId` | **Reviews** — reviews de vídeos com anotações no frame |
| `/review/:token` | **Review Público** — link compartilhável para clientes |
| `/collaborators` | **Equipe** — gestão de colaboradores |
| `/analytics` | **Analytics** — dashboard de métricas e relatórios |
| `/tools` | **Ferramentas** — 12 ferramentas IA de produção |
| `/tools/:id` | **Detalhe** — página individual da ferramenta |
| `/project/:id` | **Project Hub** — visão geral e acesso rápido às ferramentas |
| `/project/:id/studio/:toolId` | **Studio (projeto)** — workspace com contexto do projeto |
| `/project/:id/files` | **Arquivos (projeto)** — upload e gestão por projeto |
| `/project/:id/video-reviews` | **Aprovação (projeto)** — reviews de vídeo por projeto |
| `/project/:id/collaborators` | **Equipe (projeto)** — membros do projeto |
| `/studio/:id` | **Estúdio** — workspace completo da ferramenta |
| `/profile` | **Perfil** — conta e preferências do usuário |
| `/success` | **Sucesso** — página de confirmação após checkout |
| `/admin` | **Admin Dashboard** — métricas do sistema |
| `/admin/gerenciar` | **Admin Users** — gerenciar usuários, papéis e planos (admin only, não listado) |

Rotas autenticadas: `/dashboard`, `/project/:id`, `/project/:id/*`, `/tools`, `/tools/:id`, `/studio/:id`, `/admin`, `/admin/gerenciar`, `/clients`, `/clients/new`, `/clients/:id/editar`, `/pipeline`, `/proposals`, `/interactions`, `/documents`, `/company`, `/files/:projectId`, `/video-reviews/:projectId`, `/collaborators`, `/analytics`, `/profile`, `/success`.

## 🛠️ Setup

```bash
cd cena-studio
pnpm install
cp .env.example .env
# Edite .env — JWT_SECRET é obrigatório, ANTHROPIC_API_KEY para IA, GITHUB_CLIENT_ID/SECRET para login GitHub
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5001 (proxied via Vite como `/api`)

### Contas Padrão (primeiro boot)

| Email | Senha | Role |
|-------|--------|------|
| `admin@cenastudio.com.br` | `admin123` (ou `ADMIN_DEFAULT_PASSWORD`) | admin |
| `demo@cenastudio.com.br` | `demo123` (ou `DEMO_USER_PASSWORD`) | user |

Altere estas senhas imediatamente em produção.

## 📦 Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Servidor API + Vite dev (hot reload) |
| `pnpm build` | Build client + bundle server |
| `pnpm start` | Servidor produção (serve SPA + API) |
| `pnpm preview` | Preview do build de produção |
| `pnpm check` | TypeScript check (`tsc --noEmit`) |
| `pnpm lint` | TypeScript check (`tsc --noEmit`) |
| `pnpm format` | Prettier format |

## 🏗️ Arquitetura

```
Browser (React + Vite)
    │  /api/* (credentials: include)
    ▼
Express (server/index.ts)
    ├── middleware: helmet, cors, rate-limit, cookie-parser, passport (GitHub OAuth)
    ├── routes: auth, tools, ai, admin, contact, checkout, clients, export, files, collaborators, analytics, video-reviews
    ├── services: auth, tools, AI (NVIDIA ou Anthropic), stripe
    └── SQLite (better-sqlite3)
```

Metadados de ferramentas definidos em `shared/tools.ts` (12 ferramentas, IDs `01`–`12`) e seeded no banco na inicialização. Configurações de site em `shared/site.ts`.

## 🎨 Temas

Dark e Light mode com `next-themes` + `ThemeProvider`. CSS variables de tema em `client/src/index.css` (sem valores hardcoded como `bg-[#111]`). Alternável via toggle no `AppNavBar`.

## 🔌 API Routes

### Autenticação
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | No | Login, define cookie JWT httpOnly |
| POST | `/api/auth/register` | No | Cria conta + trial de 14 dias Pro |
| POST | `/api/auth/forgot-password` | No | Solicita reset de senha (dev: console `[DEV]` token) |
| POST | `/api/auth/reset-password` | No | Reset de senha com token |
| POST | `/api/auth/logout` | No | Limpa cookie de sessão |
| GET | `/api/auth/me` | Yes | Usuário atual + plano de assinatura |
| GET | `/api/auth/github` | No | Inicia fluxo OAuth GitHub |
| GET | `/api/auth/github/callback` | No | Callback OAuth GitHub |

### CRM
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients` | Yes | Lista todos os clientes |
| POST | `/api/clients` | Yes | Cria novo cliente |
| GET | `/api/clients/:id` | Yes | Obtém cliente específico |
| PUT | `/api/clients/:id` | Yes | Atualiza cliente |
| DELETE | `/api/clients/:id` | Yes | Exclui cliente |
| GET | `/api/clients/stats` | Yes | Estatísticas de clientes |

### Pipeline de Vendas
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients/opportunities` | Yes | Lista oportunidades |
| POST | `/api/clients/opportunities` | Yes | Cria oportunidade |
| PUT | `/api/clients/opportunities/:id` | Yes | Atualiza oportunidade |
| DELETE | `/api/clients/opportunities/:id` | Yes | Exclui oportunidade |
| GET | `/api/clients/opportunities/stats` | Yes | Estatísticas de pipeline |

### Interações
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/clients/interactions` | Yes | Lista interações |
| POST | `/api/clients/interactions` | Yes | Cria interação |
| PUT | `/api/clients/interactions/:id` | Yes | Atualiza interação |
| DELETE | `/api/clients/interactions/:id` | Yes | Exclui interação |

### Arquivos
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/files/projects/:projectId` | Yes | Lista arquivos do projeto |
| POST | `/api/files/upload` | Yes | Upload de arquivo ou link |
| GET | `/api/files/:id/download` | Yes | Download de arquivo |
| DELETE | `/api/files/:id` | Yes | Exclui arquivo |

### Video Reviews
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/video-reviews/projects/:projectId` | Yes | Lista reviews do projeto |
| POST | `/api/video-reviews` | Yes | Cria review |
| GET | `/api/video-reviews/:id` | Yes | Obtém review com comentários |
| PUT | `/api/video-reviews/:id` | Yes | Atualiza review |
| DELETE | `/api/video-reviews/:id` | Yes | Exclui review |
| POST | `/api/video-reviews/:id/share` | Yes | Gera link compartilhável |
| POST | `/api/video-reviews/:id/comments` | Yes | Adiciona comentário |
| PUT | `/api/video-reviews/comments/:id/resolve` | Yes | Resolve/reabre comentário |
| DELETE | `/api/video-reviews/comments/:id` | Yes | Exclui comentário |
| GET | `/api/public/video-reviews/shared/:token` | No | Acesso público ao review |
| POST | `/api/public/video-reviews/shared/:token/comments` | No | Comentário público |

### Colaboradores
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/collaborators` | Yes | Lista colaboradores |
| POST | `/api/collaborators` | Yes | Cria colaborador |
| PUT | `/api/collaborators/:id` | Yes | Atualiza colaborador |
| DELETE | `/api/collaborators/:id` | Yes | Exclui colaborador |
| GET | `/api/collaborators/stats` | Yes | Estatísticas de equipe |

### Membros do Projeto
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/project-members/:projectId` | Yes | Lista membros do projeto |
| POST | `/api/project-members` | Yes | Adiciona membro ao projeto |
| PUT | `/api/project-members/:id` | Yes | Atualiza membro do projeto |
| DELETE | `/api/project-members/:id` | Yes | Remove membro do projeto |

### Analytics
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/analytics/overall` | Yes | Métricas gerais |
| GET | `/api/analytics/projects/:id` | Yes | Métricas por projeto |
| GET | `/api/analytics/revenue` | Yes | Métricas de receita |
| GET | `/api/analytics/activity` | Yes | Métricas de atividade |

### Notificações
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/notifications` | Yes | Lista notificações do usuário |
| PUT | `/api/notifications/:id/read` | Yes | Marca notificação como lida |
| PUT | `/api/notifications/read-all` | Yes | Marca todas como lidas |
| GET | `/api/notifications/unread-count` | Yes | Contador de não lidas |

### Studio Settings
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/studio-settings` | Yes | Obtém configurações do studio |
| PUT | `/api/studio-settings` | Yes | Atualiza configurações do studio |

### Export
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/export/projects/:id` | Yes | Exporta projeto (JSON/CSV) |
| GET | `/api/export/clients/:id` | Yes | Exporta cliente (JSON/CSV) |
| GET | `/api/export/clients` | Yes | Exporta todos clientes (JSON/CSV) |
| GET | `/api/export/pipeline` | Yes | Exporta pipeline (JSON/CSV) |

### Ferramentas IA
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/tools` | No | Lista ferramentas ativas |
| GET | `/api/tools/:id` | No | Detalhes da ferramenta |
| POST | `/api/ai/generate` | Yes | Geração IA (`{ toolId, input }`) |

### Admin
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/admin/tools` | Admin | Todas ferramentas |
| POST | `/api/admin/tools` | Admin | Cria ferramenta |
| PUT | `/api/admin/tools/:id` | Admin | Atualiza ferramenta |
| DELETE | `/api/admin/tools/:id` | Admin | Soft-delete (desativa) |
| GET | `/api/admin/users` | Admin | Contagem de usuários |

### Checkout e Comercial
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| UI | Landing pricing | No | Fluxo comercial atual via WhatsApp para PIX, transferência ou boleto |
| POST | `/api/checkout/session` | Yes | URL de sessão Stripe Checkout (legado/API) |
| POST | `/api/checkout/portal` | Yes | URL de Stripe Customer Portal (legado/API) |
| POST | `/api/checkout/webhook` | No (Stripe sig) | Webhooks de assinatura Stripe (legado/API) |

### Contato
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/contact` | No | Formulário de contato |
| POST | `/api/contact/demo` | No | Solicitação de demo |

Todas respostas JSON: `{ success: true, data: ... }` ou `{ success: false, error: "..." }`.

## ⚙️ Variáveis de Ambiente

Veja `.env.example`. O servidor **falha ao iniciar** se `JWT_SECRET` estiver faltando. Rotas IA retornam **503** se o provider configurado não tiver chave (`NVIDIA_API_KEY` ou `ANTHROPIC_API_KEY`). Login GitHub requer `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`.

## 🧩 Dependências Principais

| Pacote | Uso |
|--------|-----|
| React 19.2 + Vite 7.1 | Framework frontend |
| Express + tsx | Servidor backend |
| better-sqlite3 | Banco de dados SQLite |
| tailwindcss v4 | Estilização utilitária |
| framer-motion | Animações e transições |
| next-themes | Dark/light mode |
| @anthropic-ai/sdk | Geração IA via Anthropic quando configurado |
| stripe | Pagamentos e assinaturas legadas/API |
| passport + passport-github2 | OAuth GitHub |
| wouter | Roteamento SPA |
| @supabase/supabase-js | Integração Supabase |
| react-player | Player de vídeo |
| sonner | Toast notifications |
| zod + react-hook-form | Validação de formulários |
| @dnd-kit | Drag & drop (Kanban) |
| Radix UI | Componentes acessíveis |
| lucide-react | Ícones |
| cmdk | Command palette |
| docx | Geração de documentos Word |
| jspdf | Geração de documentos PDF |
| react-day-picker | Seleção de datas |
| react-resizable-panels | Painéis redimensionáveis |
| embla-carousel-react | Carrossel de imagens |
| vaul | Drawer/Sheet component |

## 📚 Documentação Adicional

- `UPGRADE_LOG.md` — Detalhes completos de todas implementações e migrações
- `.env.example` — Template de variáveis de ambiente
- `shared/tools.ts` — Definição das 12 ferramentas IA
- `shared/site.ts` — Configurações de landing, pricing e navegação
- `OPENCODE>SKILL/architecture.md` — Arquitetura detalhada do sistema

## 🗄️ Banco de Dados

SQLite local em `./data/frame.db`. Tabelas principais:
- `users` — Usuários e autenticação (inclui name, avatar_url, email_verified, github_id, supabase_id, studio_name, studio_role, phone)
- `tools` — Metadados das ferramentas IA
- `generations` — Histórico de gerações IA
- `projects` — Projetos dos usuários (inclui client_id, status)
- `project_states` — Estados de ferramentas por projeto
- `clients` — Clientes do CRM (inclui workflow_stage, address, city, state, country, website, linkedin, instagram, industry, company_size, annual_revenue, contact_person, contact_role, billing_cycle, payment_method, tax_id)
- `opportunities` — Oportunidades de vendas
- `interactions` — Histórico de interações
- `collaborators` — Membros da equipe (inclui phone, skills, daily_rate, status, availability)
- `project_members` — Membros por projeto
- `files` — Arquivos organizados por projeto
- `video_reviews` — Reviews de vídeos (inclui video_url)
- `video_comments` — Comentários em vídeos (inclui annotations)
- `notifications` — Notificações do usuário
- `studio_settings` — Configurações do studio por usuário (studio_name, legal_name, document, email, phone, city, website, signature, primary_color)
- `subscriptions` — Assinaturas e plano ativo (inclui stripe_customer_id, stripe_subscription_id)
- `plans` — Planos de preços
- `contacts` — Contatos do formulário de contato
- `usage` — Controle de uso por usuário e ferramenta
- `reset_tokens` — Tokens de reset de senha

## 🚀 Deployment

### Vercel
1. Configure as variáveis de ambiente no painel Vercel
2. Deploy automático via push para branch `main`
3. URL: https://frame-ai-director-correto.vercel.app

### Variáveis de Ambiente Necessárias
- `JWT_SECRET` — Obrigatório
- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_ANON_KEY` — Chave anônima do Supabase
- `VITE_SUPABASE_URL` — URL do Supabase para cliente
- `VITE_SUPABASE_ANON_KEY` — Chave anônima do Supabase para cliente
- `AI_PROVIDER` — Define o provider de IA (`nvidia` ou `anthropic`)
- `ANTHROPIC_API_KEY` — Para funcionalidades IA via Anthropic
- `ANTHROPIC_MODEL` — Modelo Anthropic (padrão: claude-sonnet-4-20250514)
- `NVIDIA_API_KEY` — Para funcionalidades IA via NVIDIA
- `NVIDIA_MODEL` — Modelo NVIDIA (padrão: nvidia/nemotron-3-ultra-550b-a55b)
- `NVIDIA_INVOKE_URL` — URL de invocação da API NVIDIA
- `NVIDIA_MAX_TOKENS` — Máximo de tokens (padrão: 2048)
- `NVIDIA_TEMPERATURE` — Temperatura de geração (padrão: 0.7)
- `NVIDIA_TOP_P` — Top P sampling (padrão: 0.95)
- `NVIDIA_ENABLE_THINKING` — Habilita modo thinking (padrão: true)
- `NVIDIA_REASONING_BUDGET` — Budget de reasoning (padrão: 512)
- `NVIDIA_TIMEOUT_MS` — Timeout em ms (padrão: 60000)
- `STRIPE_SECRET_KEY` — Para checkout Stripe legado/API
- `STRIPE_WEBHOOK_SECRET` — Para webhooks Stripe legado/API
- `GITHUB_CLIENT_ID` — Para login GitHub
- `GITHUB_CLIENT_SECRET` — Para login GitHub
- `GITHUB_CALLBACK_URL` — URL de callback OAuth

## 📄 Licença

MIT
