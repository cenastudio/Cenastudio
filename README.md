# Cena Studio

Inteligência artificial para produção audiovisual — roteiros, callsheets, decupagem, orçamentos, CRM, reviews de vídeos e muito mais.

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
| `/interactions` | **Interações** — histórico de contatos com clientes |
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
| `/admin` | **Admin Dashboard** — métricas do sistema |
| `/admin/gerenciar` | **Admin Users** — gerenciar usuários, papéis e planos (admin only, não listado) |

Rotas autenticadas: `/dashboard`, `/project/:id`, `/project/:id/*`, `/tools`, `/tools/:id`, `/studio/:id`, `/admin`, `/admin/gerenciar`, `/clients`, `/clients/new`, `/clients/:id/editar`, `/pipeline`, `/interactions`, `/files/:projectId`, `/video-reviews/:projectId`, `/collaborators`, `/analytics`, `/profile`.

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

### Analytics
| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/analytics/overall` | Yes | Métricas gerais |
| GET | `/api/analytics/projects/:id` | Yes | Métricas por projeto |
| GET | `/api/analytics/revenue` | Yes | Métricas de receita |
| GET | `/api/analytics/activity` | Yes | Métricas de atividade |

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
| React 19 + Vite 7 | Framework frontend |
| Express + tsx | Servidor backend |
| better-sqlite3 | Banco de dados SQLite |
| tailwindcss v4 | Estilização utilitária |
| framer-motion | Animações e transições |
| next-themes | Dark/light mode |
| @anthropic-studio/sdk | Geração IA via Anthropic quando configurado |
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

## 📚 Documentação Adicional

- `UPGRADE_LOG.md` — Detalhes completos de todas implementações e migrações
- `.env.example` — Template de variáveis de ambiente
- `shared/tools.ts` — Definição das 12 ferramentas IA
- `shared/site.ts` — Configurações de landing, pricing e navegação
- `OPENCODE>SKILL/architecture.md` — Arquitetura detalhada do sistema

## 🗄️ Banco de Dados

SQLite local em `./data/frame.db`. Tabelas principais:
- `users` — Usuários e autenticação
- `tools` — Metadados das ferramentas IA
- `generations` — Histórico de gerações IA
- `projects` — Projetos dos usuários
- `project_states` — Estados de ferramentas por projeto
- `clients` — Clientes do CRM
- `opportunities` — Oportunidades de vendas
- `interactions` — Histórico de interações
- `collaborators` — Membros da equipe
- `project_members` — Membros por projeto
- `files` — Arquivos organizados por projeto
- `video_reviews` — Reviews de vídeos
- `video_comments` — Comentários em vídeos
- `subscriptions` — Assinaturas e plano ativo
- `plans` — Planos de preços

## 🚀 Deployment

### Vercel
1. Configure as variáveis de ambiente no painel Vercel
2. Deploy automático via push para branch `main`
3. URL: https://cena-studio-frame-studio-landing.vercel.app

### Variáveis de Ambiente Necessárias
- `JWT_SECRET` — Obrigatório
- `NVIDIA_API_KEY` ou `ANTHROPIC_API_KEY` — Para funcionalidades IA
- `AI_PROVIDER` — Define o provider de IA (`nvidia` ou `anthropic`)
- `STRIPE_SECRET_KEY` — Para checkout Stripe legado/API
- `STRIPE_WEBHOOK_SECRET` — Para webhooks Stripe legado/API
- `GITHUB_CLIENT_ID` — Para login GitHub
- `GITHUB_CLIENT_SECRET` — Para login GitHub
- `GITHUB_CALLBACK_URL` — URL de callback OAuth

## 📄 Licença

MIT
