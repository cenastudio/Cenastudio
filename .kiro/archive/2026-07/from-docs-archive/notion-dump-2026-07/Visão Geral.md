# Visão Geral

> Cena Studio — Inteligência artificial para produção audiovisual

**Última atualização:** 2026-07-01 16:03:51 -03:00

---

## O que é

**Cena Studio** é uma plataforma SaaS completa para produtoras audiovisuais, oferecendo um sistema operacional que cobre todo o ciclo de vida de um projeto — do primeiro contato comercial até a entrega final ao cliente.

## Público-Alvo

- 🎥 **Produtoras audiovisuais** — pequenas e médias produtoras de vídeo
- 🎬 **Freelancers de vídeo** — cinegrafistas, editores, diretores independentes
- 📢 **Agências de publicidade** — equipes de criação e produção
- 📊 **Departamentos de marketing** — equipes internas de conteúdo

## Funcionalidades Principais

### 🤖 12 Ferramentas IA
Veja detalhes em [[Ferramentas IA]]

| # | Ferramenta | Categoria |
|---|-----------|-----------|
| 01 | Gerador de Roteiro | Pré-produção |
| 02 | Decupagem Técnica | Direção |
| 03 | Callsheet Inteligente | Produção |
| 04 | Orçamento Automático | Comercial |
| 05 | Proposta Comercial | Vendas |
| 06 | Contratos | Jurídico |
| 07 | Briefing Inteligente | Atendimento |
| 08 | Moodboard & Look | Arte |
| 09 | Checklist de Set | Produção |
| 10 | Cronograma | Gestão |
| 11 | Relatório de Entrega | Pós-produção |
| 12 | Assistente Livre | IA |

### 💼 CRM Completo
- Gestão de clientes com status (lead, client, archived)
- Pipeline de vendas em Kanban (prospect → closed/lost)
- Histórico de interações (calls, emails, meetings, notes)
- Propostas comerciais

### 📁 Gestão de Projetos
Ciclo completo com [[UX Flow|storytelling operacional]]:
1. **Entrada** — receber o job
2. **Planejamento** — briefing, cronograma, equipe
3. **Produção** — filmagem, callsheet, checklist
4. **Revisão** — video reviews com anotações frame-a-frame
5. **Entrega** — relatório, arquivos finais
6. **Fechamento** — financeiro, feedback

### 📹 Video Reviews
- Upload de vídeos por projeto
- Comentários sincronizados por timestamp
- Anotações visuais no frame (retângulos, setas)
- Links compartilháveis para clientes (sem auth necessário)

### 👥 Gestão de Equipe
- Cadastro de colaboradores com skills e daily rate
- Atribuição de membros por projeto
- Controle de disponibilidade

### 📊 Analytics
- Métricas gerais (projetos, clientes, receita)
- Analytics por projeto
- Métricas de atividade

### 💰 Pagamentos
- **Principal:** PIX/WhatsApp (mercado brasileiro)
- **Legado/API:** Stripe (checkout, portal, webhooks)

### 🔐 Autenticação
- Login email/senha com JWT httpOnly cookies
- GitHub OAuth via Passport.js
- Reset de senha com token
- Trial de 14 dias Pro no registro

### 🌍 Internacionalização
- Português (PT-BR) e Inglês (EN)
- Switcher na landing page
- Estado persistido no localStorage

### 🎨 Temas
- Dark mode e Light mode
- Toggle via `AppNavBar`
- CSS variables sem valores hardcoded

---

## Stack Resumida

Veja detalhes completos em [[Arquitetura]]

```
React 19 + Vite 7 + TailwindCSS v4  →  Frontend SPA
Express + TypeScript                  →  Backend API
SQLite (dev) / Supabase Postgres (prod) → Banco de dados
OpenRouter (gratuito) / Anthropic / NVIDIA  →  Providers IA
Vercel                                →  Deploy
```

---

#visao-geral #produto #cenastudio
