# Codex Prompt - Cena Studio Context

Este prompt contém todo o contexto necessário para entender e trabalhar no projeto Cena Studio.

---

## 🎯 Visão Geral do Projeto

**Nome:** Cena Studio  
**Descrição:** Plataforma SaaS para produtoras audiovisuais com 12 ferramentas IA, CRM completo, gestão de projetos e reviews de vídeo.  
**Stack:** React 19 + TypeScript + Vite (frontend) | Express + TypeScript + SQLite/Supabase (backend)  
**Hosting:** Vercel  
**Nível Atual:** Mid-Senior (7.4/10)  
**Meta:** Senior (9/10)  

---

## 📚 Documentação Disponível

O projeto tem **17 documentações completas**:

### Principais
1. **README.md** - Visão geral, setup, rotas principais
2. **SYSTEM_DOCUMENTATION.md** - Documentação completa do sistema (arquitetura, componentes, API, banco de dados)
3. **SENIOR_LEVEL_ROADMAP.md** - Roadmap para nível Senior (12 melhorias priorizadas)

### Contribuição
4. **CONTRIBUTING.md** - Guia para contribuidores (setup, padrões de código, processo de PR)
5. **ONBOARDING.md** - Guia para novos desenvolvedores
6. **ARCHITECTURE.md** - Decisões de arquitetura (10 ADRs documentados)
7. **DECISION_LOG.md** - Log de decisões técnicas e de produto (15 decisões documentadas)

### Operacional
8. **DEPLOYMENT.md** - Guia de deployment (local, Vercel, self-hosted, Docker)
9. **TROUBLESHOOTING.md** - Guia de troubleshooting (problemas comuns e soluções)
10. **SECURITY.md** - Política de segurança

### API
11. **API_GUIDE.md** - Guia da API externa (endpoints, autenticação, exemplos)
12. **API_INTERNAL.md** - Documentação interna da API (serviços, patterns, testing)

### Performance
13. **PERFORMANCE.md** - Guia de performance (métricas, otimizações, escalabilidade)

### Banco de Dados
14. **DATABASE_SCHEMA.md** - Diagrama ERD e documentação das 18 tabelas

### Versionamento
15. **CHANGELOG.md** - Histórico de versões e mudanças

### Produto e contexto
16. **UX_FLOW_ARCHITECTURE.md** - Storytelling operacional e ciclo completo do job
17. **CODEX_PROMPT.md** - Contexto vivo para continuidade do desenvolvimento

---

## 🏗️ Arquitetura

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7.1
- **Estilização:** Tailwind CSS v4
- **Roteamento:** Wouter
- **Componentes:** Radix UI (headless)
- **State:** React Context (Auth, Theme, Language, Project)
- **Hooks:** Custom hooks em `client/src/hooks/`

### Backend
- **Framework:** Express + TypeScript
- **Banco:** SQLite (dev/test) / Supabase Postgres via Prisma 7 (produção)
- **Autenticação:** JWT httpOnly cookies + GitHub OAuth
- **Validação:** Zod schemas
- **IA:** NVIDIA (minimax-m3) + Anthropic (fallback)
- **Pagamento:** Stripe (legado) + PIX/WhatsApp

### Estrutura de Diretórios

```
client/src/
├── components/     # Componentes reutilizáveis (ui, landing, studio)
├── pages/          # Páginas (routes)
├── contexts/       # React contexts
├── hooks/          # Custom hooks
└── lib/            # Utilitários

server/
├── controllers/    # Request handlers
├── services/       # Business logic
├── routes/         # Route definitions
├── middleware/     # Express middleware
├── models/         # Database models
└── utils/          # Utilitários

shared/
├── tools.ts        # 12 ferramentas IA
└── site.ts         # Configurações do site
```

---

## 🗄️ Banco de Dados

### Tabelas (18 total)

**Core:**
- users, projects, clients, tools, generations

**CRM:**
- opportunities, interactions, financial_entries

**Colaboração:**
- collaborators, project_members, video_reviews, video_comments

**Sistema:**
- notifications, studio_settings, subscriptions, usage, plans, reset_tokens, project_states, files

### Estado Atual
- **Desenvolvimento:** SQLite (better-sqlite3)
- **Produção:** Supabase Postgres via Prisma 7 + Supabase Storage
- **Deploy validado:** health, ready, auth, usuários, CRM, projetos, equipe, arquivos, reviews, financeiro e analytics
- **Fluxo Studio:** ferramentas IA usam projeto ativo para autosave, geração com `projectId`, histórico filtrável por projeto e preenchimento de campos vazios com contexto de projeto/cliente
- **Documentos por job:** `/project/:projectId/documents` abre documentos com contexto persistente de projeto/cliente; `/documents` continua como modo solto
- **Migrations:** `supabase/migrations/20260630010000_initial_frame_schema.sql` e `20260630011500_enable_rls_policies.sql`

---

## 🔐 Estado Atual das Variáveis de Ambiente

**Configuradas:**
- JWT_SECRET (precisa ser substituído em produção)
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- NVIDIA_API_KEY (provider atual: minimax-m3)
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY (modo teste)
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (vazios)

**Faltando:**
- SMTP/Email (não configurado)
- Redis (não configurado)
- Sentry (não configurado)

---

## ⚠️ Bloqueadores Críticos (Antes de Produção)

### 1. Segurança Imediata
- [ ] Substituir JWT_SECRET com valor forte (32+ caracteres)
- [ ] Alterar ADMIN_DEFAULT_PASSWORD (atual: admin123)
- [ ] Alterar DEMO_USER_PASSWORD (atual: demo123)
- [ ] Remover chaves sensíveis do backup

### 2. Banco de Dados
- [x] Aplicar migrations no Supabase
- [x] Migrar persistência server-side para Postgres via Prisma nos domínios operacionais principais
- [x] Usar Supabase Storage para arquivos enviados em produção
- [x] Remover `ALLOW_EPHEMERAL_SQLITE` da produção Vercel
- [x] Validar health, ready, auth, CRM, projetos, equipe, arquivos, reviews, financeiro e analytics em produção
- [ ] Remover dependência `better-sqlite3` depois que o fallback local deixar de ser necessário

### 3. Decisões Técnicas Pendentes
- [ ] Provider IA definitivo (NVIDIA vs Anthropic vs Híbrido)
- [ ] Estratégia de pagamento (PIX vs Stripe vs Híbrido)
- [ ] Implementar GitHub OAuth (se necessário)
- [ ] Configurar SMTP/Email

---

## 🚀 Próximos Passos (Sprint 1 - 1-2 semanas)

### Dia 1-2: Segurança Imediata
```bash
1. Gerar JWT_SECRET forte
2. Alterar senhas padrão
3. Remover chaves sensíveis do backup
```

### Dia 3-5: Preparar Persistência Postgres
```bash
1. [concluído] Aplicar migrations no Supabase
2. [concluído] Testar conexão real com Postgres e service role
3. [concluído] Introduzir Prisma 7 com `@prisma/adapter-pg`
4. [concluído] Migrar queries por domínio com testes de paridade
5. [concluído] Validar produção com `npm run smoke:prisma`
6. Remover better-sqlite3 apenas quando o modo local também abandonar SQLite
```

### Dia 6-7: Logging + Monitoring
```bash
1. [concluído] Implementar logging estruturado básico
2. Configurar Sentry
3. [concluído] Adicionar health checks
```

### Dia 8-10: Testes + CI/CD
```bash
1. [em andamento] Aumentar testes para 60%
2. [concluído] Configurar GitHub Actions CI
3. [concluído] Adicionar coverage baseline com `npm run test:coverage`
4. [concluído] Ampliar cobertura inicial de authService, adminController, CRM, files/storage e financeiro
5. [concluído] Ampliar cobertura crítica de IA, limites de plano, projetos/autosave e reviews de vídeo
6. [concluído] Cobrir colaboradores, membros de projetos, notificações e configurações do estúdio
7. [concluído] Revisar UI/UX operacional de equipe, empresa e notificações com validação desktop/mobile
8. [concluído] Revisar UI/UX operacional de ProjectHub, clientes e pipeline comercial com foco em próxima ação, erro/sem resultado e resumo de foco
9. [concluído] Conectar Studio/Tools e Documents ao contexto de projeto/cliente sem sobrescrever campos manuais
10. [concluído] Revisar landing, login, loading, Tools, Studio e Documents com foco em fluxo operacional, continuidade e responsividade
11. [baseline atual] 64 testes; cobertura global segue em evolução
12. Testar pipeline de deploy em PR real
```

---

## 📋 Roadmap Completo (12 Melhorias)

### Alta Prioridade
1. [concluído] Migrar banco de dados para Supabase Postgres
2. [concluído] Implementar ORM Prisma
3. Aumentar cobertura de testes (80%+)
4. Adicionar monitoramento e logging estruturado

### UX/Product Design - Próximas fases
- [concluído] Revisar landing page, login, animação de carregamento, listagem de ferramentas, Studio e Documents com olhar senior de fluxo, hierarquia, responsividade e redução de fricção.
- Manter identidade visual do Cena Studio quando ela ajuda o produto; mudar visual estrutural quando o fluxo pedir mais clareza operacional.
- [concluído] Avaliar e iniciar sessão única dedicada para Proposta Comercial, Orçamento, Contratos, Briefing e Entrega, porque têm maior impacto no fluxo cliente/projeto/exportação.
- [concluído] Executar as cinco fases de `UX_FLOW_ARCHITECTURE.md`: projeto/job como eixo, navegacao global reduzida e jornada Entrada -> Planejamento -> Producao -> Revisao -> Entrega -> Fechamento.
- [concluído] Criar Hoje, Projetos, Comercial, capitulos do job, biblioteca por etapa e contexto de projeto persistente sem remover rotas atuais.
- [concluído] Implementar ciclo de artefato: geração -> documento editável -> revisão -> aprovado -> arquivado, com versao persistida em `project_states`.
- [concluído] Conectar oportunidade ganha -> projeto contextual -> financeiro -> conclusao do job.
- Cada alteração visual deve ser documentada e validada em desktop/mobile antes de seguir para a próxima fase.

### Média Prioridade
5. Refatorar controllers densos (analyticsController ~545 linhas)
6. Implementar cache (Redis)
7. Implementar CI/CD com GitHub Actions
8. Adicionar rate limiting distribuído
9. Implementar retry pattern para APIs externas
10. Adicionar health checks e readiness probes

### Baixa Prioridade
11. Adicionar documentação de API (OpenAPI/Swagger)
12. Implementar feature flags

---

## 🎯 Padrões de Código

### TypeScript
- Tipagem forte sempre
- Evitar `any` - usar tipos específicos
- Interfaces para shapes de dados
- Types para unions/primitives

### React
- Functional components com hooks
- Props com TypeScript interfaces
- Context para state global
- Custom hooks para lógica reutilizável

### Backend (Express)
- Controllers para lógica de requisição
- Services para lógica de negócio
- Middleware para cross-cutting concerns
- Types para request/response

### Nomenclatura
- Arquivos: `kebab-case`
- Components: `PascalCase`
- Funções: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Interfaces/Types: `PascalCase`

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor dev
npm run build            # Build para produção
npm run check            # TypeScript check
npm run test             # Unit tests
npm run e2e              # E2E tests
npm run verify           # Todos os testes

# Supabase
supabase db push         # Aplicar migrations
supabase db diff         # Ver diferenças
supabase db reset        # Reset banco

# Vercel
vercel                  # Deploy preview
vercel --prod           # Deploy produção
vercel logs             # Ver logs
```

---

## 📊 Métricas Atuais

### Código
- **Nível:** Mid-Senior (7.4/10)
- **Arquitetura:** 8/10
- **TypeScript:** 9/10
- **React/Frontend:** 8/10
- **Backend/Express:** 7/10
- **Segurança:** 8/10
- **Testes:** 6/10
- **Escalabilidade:** 6/10
- **Código Limpo:** 7/10

### Documentação
- **Cobertura:** 10/10 (Excelente)
- **Total de docs:** 15
- **Todas criadas e atualizadas**

---

## 🚨 Problemas Conhecidos

### 1. analyticsController.ts
- **Problema:** Controller ainda concentra regras de analytics/financeiro (~545 linhas)
- **Solução:** Refatorar em services menores quando a camada de dados estiver estabilizada
- **Status:** Planejado (Sprint 2)

### 2. SQLite em Produção
- **Problema:** Não escala em produção
- **Solução:** Migrar para Supabase
- **Status:** Em progresso (Sprint 1)

### 3. Geração IA Lenta
- **Problema:** 2-5s por geração
- **Solução:** Implementar cache (Redis)
- **Status:** Planejado (Sprint 3)

### 4. Testes Insuficientes
- **Problema:** Cobertura < 50%
- **Solução:** Aumentar para 80%+
- **Status:** Planejado (Sprint 2)

---

## 📞 Contato e Suporte

- **Email:** contato@cenastudio.com.br
- **Security:** security@cenastudio.com.br
- **GitHub Issues:** [abrir issue](https://github.com/seu-usuario/frameai-director-correto/issues)

---

## 🎓 Como Contribuir

1. Leia `CONTRIBUTING.md`
2. Leia `ARCHITECTURE.md` para entender decisões
3. Siga padrões de código documentados
4. Faça PR com template preenchido
5. Aguarde code review

---

## 📝 Notas Importantes

- **Nunca** commitar `.env` ou secrets
- **Sempre** usar TypeScript strict mode
- **Sempre** adicionar testes para novas features
- **Sempre** documentar decisões técnicas em `DECISION_LOG.md`
- **Sempre** atualizar `CHANGELOG.md` em releases

---

## 🚀 Meta 90 Dias

- Alcançar nível Senior (9/10)
- 80%+ cobertura de testes
- Produção ready
- Escalável para 10x tráfego
- Supabase migrado
- Prisma ORM implementado
- Redis cache implementado
- CI/CD automatizado
- Monitoring configurado

---

**Última atualização:** 30 de Junho de 2026  
**Status:** Documentação completa, pronto para Sprint 1
