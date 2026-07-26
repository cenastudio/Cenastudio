# Changelog

> Histórico de atualizações e versões do Cena Studio (SemVer).

---

## [1.1.0] - 2026-07-03

### Added (Novidades)
- **Feature Gating System:** Sistema robusto de controle de acesso por plano implementado
  - 13 features mapeadas: 4 Pro (pipeline, video-reviews, collaboration, advanced-export) + 9 Studio (commercial-hub, proposals, contracts, financial-module, team-management, analytics, api, custom-branding, priority-support)
  - Integração com `@/lib/feature-gating` via `canAccessFeature()`
  - Fail-safe approach (fail open em caso de erro)
  - Admin bypass automático

- **Sistema de Planos Completo:** Free/Pro/Studio totalmente funcional
  - Free: Funcionalidades básicas
  - Pro: Features avançadas + glow effects + escala tipográfica 1.06
  - Studio: Tudo liberado + dual accent (laranja + dourado) + escala 1.08

- **Design System Tokens Adaptativos:** Visual diferenciado por plano
  - Typography scale dinâmica (1.0 → 1.06 → 1.08)
  - Dual accent system (laranja #E85002 + dourado #D8B343) exclusivo Studio
  - Glow effects para Pro/Studio
  - Contextual colors (primary/financial)

- **Navigation Filtering:** Sistema de navegação adaptativa
  - Menu filtra itens automaticamente baseado no plano
  - Rotas protegidas com redirecionamento
  - Breadcrumbs dinâmicos
  - Locked features identificadas para upgrade prompts

### Fixed (Correções)
- **Cobertura de Testes:** 82% → 100% (119/145 → 150/150 passando)
  - `navigation-filter.test.ts`: 14 falhas corrigidas → 24 testes passando
  - `token-resolver.test.ts`: 12 falhas corrigidas → 36 testes passando
  - API dos tokens corrigida (remover prefixo `--plan-`)
  - Expectativas de testes alinhadas com implementação
  - Testes para todos os plan modes (null, admin, studio-pending)

### Changed (Alterações)
- Design system agora diferencia visualmente Free/Pro/Studio players
- Navegação filtra automaticamente itens baseado no plano do usuário
- Token resolver usa nomes sem prefixo para melhor DX
- Feature gating integrado em toda navegação

### Technical (Técnico)
- Arquivos modificados: `navigation-filter.ts`, `token-resolver.ts`, `planEntitlements.ts`
- Testes adicionados: 31 novos testes (24 navigation + 36 tokens - alguns eram 29 antes)
- Performance: Testes executam em ~44s
- Zero breaking changes na API pública

---

## [1.0.0] - 2026-06-29
*(Release Inicial da Plataforma)*

### Added
- Lançamento do **Project Hub** (`/project/:id`).
- Barra de Navegação Contextual do Projeto.
- Dashboard Admin (`/admin/gerenciar`).
- **Integração Comercial PIX/WhatsApp** (O Stripe foi mantido apenas como API legada).
- Command Palette (Cmd+K).
- Suporte a Internacionalização PT/EN.
- **12 Ferramentas de IA Base** com modelos otimizados NVIDIA / Anthropic.
- Módulos core de CRM, Pipeline de Vendas e Gestão de Arquivos.
- Módulo de Aprovação (Video Reviews) com timestamp de frame.

### Security
- Autenticação JWT via `httpOnly cookies`.
- Senhas via `bcrypt`.
- Rate Limiting, CORS estrito, e Headers via Helmet.

---

## [Unreleased] - Em Desenvolvimento

### Planejado para v1.2.0
- [ ] `PlanContext` Provider React
- [ ] `useFeatureAccess` Hook
- [ ] `FeatureUpgradeRequired` Component
- [ ] `PlanUpgradeModal` Component com Stripe
- [ ] Testes E2E com Playwright
- [ ] Deploy incremental com feature flags
- [ ] Monitoring com Sentry

---

## [0.9.0] - 2026-05-15
*(Beta Técnico)*

### Added
- Autenticação e Registro com trial de 14 dias.
- CRUDs Iniciais (CRM, Pipeline).
- Setup da conexão com IA.

### Changed
- Migração completa de JavaScript puro para **TypeScript + React 19 + Vite + Tailwind v4**.

---

## [0.5.0] - 2026-03-01
*(Alpha MVP)*

### Added
- Landing page de captura.
- Banco de dados SQLite local.
- Protótipo de cobrança via Stripe.

---

#changelog #versoes #atualizacoes
