# 🏠 Cena Studio

> **Sistema operacional audiovisual com IA para produtoras**
> Versão 1.1.0 · Última atualização: 03/07/2026

---

## � Status Atual

**Fase:** FASE 2 - Integração de Features (40% completo)
**Testes:** ✅ 150/150 passando (100%)
**Progresso Geral:** ~74% rumo aos 100%

### Últimas Conquistas ✨
- ✅ Feature gating implementado (13 features)
- ✅ Sistema de planos Free/Pro/Studio funcional
- ✅ Design tokens adaptativos
- ✅ Navigation filtering por plano
- ✅ Testes 82% → 100%

---

## 🗺️ Mapa de Conteúdo (MOC)

### 🎯 Status & Progresso (Raiz)
- **[STATUS_ATUAL.md](../STATUS_ATUAL.md)** — Estado completo e próximos passos
- **[FASE2_PLANO.md](../FASE2_PLANO.md)** — Plano detalhado da fase atual
- **[VITORIA_FASE2.md](../VITORIA_FASE2.md)** — Conquistas recentes
- **[CONTEXTO_RAPIDO.md](../CONTEXTO_RAPIDO.md)** — Guia rápido para desenvolvimento
- **[RESUMO_EXECUTIVO.md](../RESUMO_EXECUTIVO.md)** — Resumo da sessão
- **[VISAO_COMPLETA_PROJETO.md](../VISAO_COMPLETA_PROJETO.md)** — Objetivo final 100%

### 📐 Arquitetura & Sistema (Raiz)
- **[README.md](../README.md)** — Visão geral do projeto
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** — Decisões de arquitetura e stack
- **[WORKSPACE_ARCHITECTURE.md](../WORKSPACE_ARCHITECTURE.md)** — Arquitetura de workspaces
- **[UX_FLOW_ARCHITECTURE.md](../UX_FLOW_ARCHITECTURE.md)** — Fluxo de experiência
- **[DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md)** — Schema completo do banco
- **[Performance](./Performance.md)** — Métricas e otimizações

### 🔌 API & Backend (Raiz)
- **[API_GUIDE.md](../API_GUIDE.md)** — Guia completo de APIs
- **[API_INTERNAL.md](../API_INTERNAL.md)** — APIs internas do sistema
- **[SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md)** — Documentação técnica

### 🎨 Frontend & UX
- **[UX Flow](./UX%20Flow.md)** — Storytelling operacional
- **[Ferramentas IA](./Ferramentas%20IA.md)** — 12 ferramentas de produção
- **[Visão Geral](./Visão%20Geral.md)** — Overview do produto

### 🚀 Operações (Raiz)
- **[Setup & Configuração](./Setup%20&%20Configuração.md)** — Como rodar localmente
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** — Deploy na Vercel
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** — Solução de problemas
- **[SECURITY.md](../SECURITY.md)** — Políticas de segurança

### 📋 Gestão do Projeto
- **[Onboarding](./Onboarding.md)** — Guia para novos desenvolvedores
- **[Changelog](./Changelog.md)** — Histórico de versões
- **[MELHORIAS](./MELHORIAS.md)** — Roadmap de melhorias
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — Padrões e processo de PR
- **[DECISION_LOG.md](../DECISION_LOG.md)** — Log de decisões técnicas

### 🔍 Auditorias & QA (Raiz)
- **[QA_STATUS.md](../QA_STATUS.md)** — Status de qualidade
- **[AUDIT_SKILLS.md](../AUDIT_SKILLS.md)** — Auditoria de skills
- **[AUDIT_DASHBOARD_PRODUCT_STORY.md](../AUDIT_DASHBOARD_PRODUCT_STORY.md)** — Product story

---

## 🔗 Links Rápidos

| Recurso | Caminho |
|---------|---------|
| Frontend | `client/src/` |
| Backend | `server/` |
| Shared | `shared/` |
| Prisma | `prisma/schema.prisma` |
| Supabase | `supabase/` |
| Testes | `client/src/test/` |
| Scripts | `scripts/` |

---

## 📊 Métricas Atuais

| Métrica | Valor |
|---------|-------|
| **Testes** | ✅ 150/150 (100%) |
| **Features Gated** | 13 (4 Pro + 9 Studio) |
| **Ferramentas IA** | 12 |
| **Planos** | Free, Pro, Studio |
| **Tabelas no banco** | 18+ |
| **Temas** | Dark + Light |
| **Idiomas** | PT + EN |
| **Progresso Total** | ~74% |

---

## 🎯 Sistema de Planos

### Free (Gratuito)
- Ferramentas básicas
- 5 clientes máximo
- Design básico (scale 1.0)

### Pro (Profissional)
- **4 features exclusivas:**
  - Pipeline view
  - Video reviews
  - Collaboration
  - Advanced export
- Design melhorado (scale 1.06)
- Glow effects ✨

### Studio (Premium)
- **9 features exclusivas:**
  - Commercial hub
  - Proposals & Contracts
  - Financial module
  - Team management
  - Analytics avançado
  - API access
  - Custom branding
  - Priority support
- Design premium (scale 1.08)
- Dual accent (🟠 laranja + 🟡 dourado)
- Glow effects premium ✨

---

## 🚀 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Dev server (5001 backend, 5173 frontend)
npm run test             # Rodar testes (150 passando)
npm run test:coverage    # Cobertura de testes
npm run check            # Type check

# Build & Deploy
npm run build            # Build produção (~35s)
npm run preview          # Preview build

# E2E & Qualidade
npm run e2e              # Testes E2E (Playwright)
npm run e2e:headed       # E2E com browser visível
npm run ci               # Check + test + build

# Banco de Dados
npm run prisma:generate  # Gerar Prisma Client
```

---

## 📁 Estrutura Simplificada

```
cenastudio/
├── client/src/          # Frontend React
│   ├── lib/
│   │   ├── feature-gating/     # Sistema de controle de acesso ✅
│   │   └── design-system/      # Tokens e navigation ✅
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── components/      # Componentes React
│   └── test/            # Testes (150 passando ✅)
├── server/              # Backend Express
│   ├── controllers/     # Lógica de negócio
│   ├── routes/          # Definição de rotas
│   └── services/        # Serviços (auth, storage, etc)
├── shared/              # Código compartilhado
│   └── planEntitlements.ts  # Feature mapping ✅
├── prisma/              # Database schema
└── docs/                # Esta documentação
```

---

## 🎯 Próximos Passos

### Imediato (Esta Semana)
1. **PlanContext Provider** - Gerenciar plano ativo
2. **useFeatureAccess Hook** - Hook de acesso a features
3. **FeatureUpgradeRequired** - Componente de bloqueio
4. **PlanUpgradeModal** - Modal de upgrade Stripe

### Curto Prazo (Próximas 2 Semanas)
5. **Validação Visual** - Testar Free/Pro/Studio
6. **Testes E2E** - Fluxos completos
7. **Deploy Incremental** - Feature flags + rollout

---

> [!tip] Como usar esta documentação
> - Para **desenvolver agora**: Veja [CONTEXTO_RAPIDO.md](../CONTEXTO_RAPIDO.md)
> - Para **entender o projeto**: Veja [README.md](../README.md) e [Visão Geral](./Visão%20Geral.md)
> - Para **status atual**: Veja [STATUS_ATUAL.md](../STATUS_ATUAL.md)
> - Para **arquitetura**: Veja [ARCHITECTURE.md](../ARCHITECTURE.md)

---

**Última Atualização:** 03/07/2026 23:25
**Próxima Atualização:** Após completar FASE 2
