# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentação completa do sistema (SYSTEM_DOCUMENTATION.md)
- Roadmap para nível Senior (SENIOR_LEVEL_ROADMAP.md)
- Guia de contribuição (CONTRIBUTING.md)
- Decisões de arquitetura (ARCHITECTURE.md)
- Guia de deployment (DEPLOYMENT.md)
- Guia de troubleshooting (TROUBLESHOOTING.md)
- Política de segurança (SECURITY.md)
- Guia para novos desenvolvedores (ONBOARDING.md)
- Guia da API (API_GUIDE.md)
- Guia de performance (PERFORMANCE.md)
- Changelog (CHANGELOG.md)
- Diagrama do banco de dados (DATABASE_SCHEMA.md)
- Log de decisões técnicas (DECISION_LOG.md)
- Documentação de API interna (API_INTERNAL.md)
- Health checks `/health` e `/ready`
- Prisma 7 com `@prisma/adapter-pg` para Supabase Postgres
- Supabase Storage para arquivos de projeto em produção
- Smoke test operacional `npm run smoke:prisma`
- GitHub Actions CI para typecheck, coverage e build
- Coverage baseline com `npm run test:coverage`
- Teste de fluxo crítico para registro, cookie `frame_token`, cliente e projeto
- Testes focados para `authService`, `adminController`, CRM, arquivos/local storage, Supabase Storage e analytics financeiro
- Testes críticos para geração IA com limite de plano, estado de projeto, autorização por dono e reviews de vídeo compartilhados
- Testes integrados para colaboradores, membros de projetos, notificações e configurações do estúdio
- Testes frontend para busca e recuperação da equipe, estado de salvamento da empresa e data/hora das notificações
- Testes frontend para ProjectHub, clientes e pipeline comercial com foco em próxima ação, falha de API e resumo operacional
- Contexto conectado no Studio para preencher campos vazios com dados do projeto/cliente sem sobrescrever edição manual
- Histórico de gerações do Studio filtrável por projeto ativo ou por todas as versões da ferramenta
- Documents agora pode reaproveitar contexto do projeto/cliente para preparar documentos operacionais e exportações
- Rota contextual `/project/:projectId/documents` e aba Docs no menu do projeto
- Sessões críticas guiadas no Studio para Briefing, Proposta, Orçamento, Contratos e Entrega
- Faixa de fluxo central na landing para explicar Cliente -> Projeto -> Studio -> Arquivos -> Fechamento
- Painel operacional no login e loading de aplicação com skeleton visual da área de trabalho
- Arquitetura `UX_FLOW_ARCHITECTURE.md` implementada em cinco fases, usando storytelling e o projeto/job como eixo operacional
- Páginas `/projects`, `/commercial` e `/project/:projectId/journey/:stage`
- Ciclo persistente de artefatos com status e versão no Studio e Documents
- Conversão de oportunidade ganha em projeto com cliente, valor e contexto comercial
- Testes de jornada, ciclo de artefato e conversão comercial

### Changed
- Atualização do README com referências às novas documentações
- Produção Vercel usa Postgres persistente via integração Supabase/Vercel em vez de SQLite efêmero
- Cookie documentado/validado como `frame_token`
- Roadmap atualizado com Prisma/logging/health como concluídos
- Baseline de testes ampliado para 53 testes com 31,04% de cobertura global
- Fluxo de colaboradores ganhou busca por nome, contato ou habilidade, filtros responsivos, ações acessíveis por toque/teclado e estado de erro com nova tentativa
- Configurações da empresa agora indicam alterações pendentes, evitam saída acidental e mostram sincronização concluída
- Notificações exibem tempo relativo e data/hora exata com semântica acessível
- ProjectHub agora destaca o próximo movimento operacional com contexto de cada etapa do fluxo de produção
- Clientes agora têm estado de carregamento, erro com retry, limpar filtros e vazio/sem resultado mais orientados ao fluxo comercial
- Pipeline agora mostra resumo de foco comercial, oportunidades abertas, prazos em atenção e recuperação explícita quando APIs falham
- Studio/Tools passam a tratar IA, estado salvo, histórico e documento como partes do mesmo job conectado
- Tools agora destaca sessões críticas e resultado esperado por ferramenta antes de abrir o Studio
- Output do Studio orienta o próximo passo para documento/exportação quando há geração pronta
- Documents mostra faixa de contexto de projeto, cliente e documento quando aberto por rota contextual
- Cobertura adicional em Studio context, histórico por projeto e guia de sessão crítica
- Navegação global simplificada para Hoje, Projetos, Comercial, Financeiro e Mais
- ProjectNav e Studio organizados nos capítulos Entrada, Planejamento, Produção, Revisão, Entrega e Fechamento
- Tools reorganizado por momento do job em vez de uma grade única de ferramentas
- Command Palette inclui áreas principais e projetos recentes
- Baseline de testes ampliado para 64 testes; typecheck, traduções e build validados

### Fixed
- Login em produção na Vercel com `trust proxy`
- Ordenação de rotas de clientes para não capturar `/opportunities` e `/interactions` como `/:id`
- Formatação de data das notificações para aceitar ISO/Postgres e formato legado SQLite
- Ordenação determinística das notificações por data e ID, mantendo a mais recente no topo mesmo quando criadas no mesmo segundo
- Barra de salvamento das configurações ajustada para não sobrepor campos em telas móveis
- Validação mobile de clientes e pipeline em 390 x 844 sem overflow horizontal
- Proposta Comercial não preenche mais campos da produtora/proponente com dados do cliente

### Security
- Documentação de políticas de segurança
- Guia de report de vulnerabilidades

---

## [1.0.0] - 2026-06-29

### Added
- Project Hub: Página `/project/:id` com visão geral do projeto
- Nav Contextual: Barra `ProjectNav` com abas em páginas do projeto
- Admin Users: Página `/admin/gerenciar` para gerenciar usuários
- Pagamento via PIX/WhatsApp: Integração com WhatsApp para contato comercial
- In-App Notifications: Sistema de notificações com popover
- Command Palette: Cmd+K global com 12 comandos de navegação
- EmptyState Component: Componente compartilhado de estado vazio
- Internacionalização PT/EN: Botão para alternar idiomas
- 12 ferramentas IA de produção audiovisual
- CRM completo com pipeline de vendas
- Gestão de projetos e arquivos
- Review de vídeos com anotações
- Gestão de equipe e colaboradores
- Analytics dashboard
- Stripe integration (legado)
- GitHub OAuth (configuração preparada)
- Supabase integration (migrations preparadas)

### Changed
- Tool lookup por slug
- Zod schema projectId
- Collaborators schema (daily_rate + status)
- Client address preserve
- Stripe webhook duplicate sub fix

### Fixed
- Dead code removido
- Tool lookup bug
- Collaborator validation

### Security
- JWT authentication com httpOnly cookies
- Password hashing com bcrypt
- Rate limiting em endpoints sensíveis
- CORS configurado
- Helmet para headers de segurança

---

## [0.9.0] - 2026-05-15

### Added
- Sistema de autenticação completo
- Registro e login de usuários
- Reset de senha
- Dashboard principal
- Gestão de clientes (CRM)
- Pipeline de vendas
- Gestão de propostas
- Histórico de interações
- Gestão de documentos
- Configurações da empresa
- Upload de arquivos
- Review de vídeos
- Gestão de colaboradores
- Analytics básico
- 12 ferramentas IA iniciais

### Changed
- Migrado de JavaScript para TypeScript
- Implementado React 19
- Implementado Vite como build tool
- Implementado Tailwind CSS v4

---

## [0.5.0] - 2026-03-01

### Added
- Landing page inicial
- Sistema de planos (Free, Pro, Studio)
- Integração com Stripe
- Supabase setup
- SQLite para desenvolvimento

### Changed
- Estrutura inicial do projeto
- Configuração do ambiente

---

## [0.1.0] - 2026-01-15

### Added
- Projeto inicial
- Estrutura básica de diretórios
- Configuração do package.json
- README inicial

---

## Versão Futura Planejada

### [2.0.0] - Planejado (Q3 2026)
- Implementar Redis cache
- Aumentar cobertura de testes para 80%+
- Implementar monitoring com Sentry
- Refatorar controllers grandes

### [2.1.0] - Planejado (Q4 2026)
- Implementar rate limiting distribuído
- Implementar retry patterns
- Documentação OpenAPI/Swagger
- Feature flags
- Performance tuning
- Security audit

### [3.0.0] - Planejado (2027)
- Microservices (se necessário)
- Message queue (RabbitMQ/Redis)
- CDN para assets
- Load balancing
- Database sharding

---

## Convenções de Versionamento

- **Major (X.0.0):** Mudanças breaking incompatíveis
- **Minor (0.X.0):** Novas funcionalidades backwards-compatible
- **Patch (0.0.X):** Bug fixes backwards-compatible

## Tipos de Mudanças

- **Added:** Nova funcionalidade
- **Changed:** Mudança em funcionalidade existente
- **Deprecated:** Funcionalidade marcada para remoção
- **Removed:** Funcionalidade removida
- **Fixed:** Bug fix
- **Security:** Correção de segurança

---

**Última atualização:** 30 de Junho de 2026
