# Decision Log - Cena Studio

Log de decisões técnicas tomadas durante o desenvolvimento do Cena Studio.

## 📋 Índice

- [Formato](#formato)
- [Decisões](#decisões)
- [Decisões Pendentes](#decisões-pendentes)

---

## 📝 Formato

Cada decisão segue este formato:

```
## [ID] Título da Decisão

**Data:** DD/MM/AAAA
**Status:** Accepted / Rejected / Deferred
**Decidido por:** [Nome]

**Contexto:**
Descrição do problema ou situação.

**Decisão:**
O que foi decidido.

**Rationale:**
Por que essa decisão foi tomada.

**Consequências:**
O que isso afeta no projeto.

**Alternativas Consideradas:**
Outras opções que foram consideradas.
```

---

## 🎯 Decisões

### [D-001] Escolha de Framework Frontend

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um framework frontend para o aplicativo.

**Decisão:**
React 19 + Vite

**Rationale:**
- React é o framework mais popular e com maior ecossistema
- Vite oferece DX (developer experience) excelente
- HMR instantâneo
- Build rápido e otimizado
- Time já familiarizado com React

**Consequências:**
- Positivas: DX excelente, comunidade grande, hiring fácil
- Negativas: Sem SSR (SEO limitado), sem image optimization automática

**Alternativas Consideradas:**
- Next.js (rejeitado: SSR não necessário, overhead)
- Vue.js (rejeitado: ecossistema menor)
- Svelte (rejeitado: ecossistema menor)

---

### [D-002] Escolha de Framework Backend

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um framework backend para a API.

**Decisão:**
Express + TypeScript

**Rationale:**
- Express é o framework Node.js mais popular
- Middleware abundante
- Documentação extensa
- Time já familiarizado
- TypeScript para type safety

**Consequências:**
- Positivas: Middleware readily available, comunidade grande
- Negativas: Performance inferior a Fastify, callbacks (mitigado com async/await)

**Alternativas Consideradas:**
- Fastify (rejeitado: ecossistema menor)
- Koa (rejeitado: ecossistema menor)
- NestJS (rejeitado: overhead para projeto pequeno)

---

### [D-003] Banco de Dados Inicial

**Data:** 01/01/2026
**Status:** Accepted (com migração planejada)
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um banco de dados para desenvolvimento inicial.

**Decisão:**
SQLite para desenvolvimento, Supabase Postgres para produção

**Rationale:**
- SQLite: Zero configuração, perfeito para dev, backup fácil
- Supabase: Escalável, backup automático, RLS, real-time

**Consequências:**
- Positivas: Setup rápido, caminho claro para produção
- Negativas: Duas implementações, migração necessária

**Alternativas Consideradas:**
- Postgres apenas (rejeitado: setup complexo para dev)
- MySQL (rejeitado: Supabase usa Postgres)

---

### [D-004] Biblioteca de Roteamento

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher uma biblioteca de roteamento para o frontend.

**Decisão:**
Wouter

**Rationale:**
- API mais simples que React Router
- Bundle size menor (3KB vs 15KB)
- Hooks-first design
- Suporte a hash routing nativo

**Consequências:**
- Positivas: Bundle menor, API simples, performance melhor
- Negativas: Ecossistema menor, menos features de data fetching

**Alternativas Consideradas:**
- React Router (rejeitado: overkill, bundle maior)

---

### [D-005] Biblioteca de Componentes UI

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher uma biblioteca de componentes UI.

**Decisão:**
Radix UI + Tailwind CSS

**Rationale:**
- Radix UI: Componentes headless, acessibilidade nativa, não styled
- Tailwind CSS: Estilo customizável, utility-first, performance excelente

**Consequências:**
- Positivas: Acessibilidade garantida, estilo 100% customizável, performance
- Negativas: Mais código para estilizar, sem design system pré-definido

**Alternativas Consideradas:**
- Chakra UI (rejeitado: styled, menos flexível)
- Headless UI (rejeitado: ecossistema menor)
- Material UI (rejeitado: muito opinated, bundle grande)

---

### [D-006] Provider de IA

**Data:** 15/03/2026
**Status:** Accepted (com fallback)
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um provider de IA para as ferramentas.

**Decisão:**
NVIDIA como primary, Anthropic como fallback

**Rationale:**
- NVIDIA: Custo menor, modelo multimodal, timeout configurável
- Anthropic: Qualidade superior, context window maior, mais caro

**Consequências:**
- Positivas: Custo menor, fallback para qualidade
- Negativas: Dois providers para manter, qualidade variável

**Alternativas Consideradas:**
- Anthropic apenas (rejeitado: mais caro)
- OpenAI (rejeitado: GPT-4 mais caro, rate limits restritivos)

---

### [D-007] Autenticação

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um método de autenticação.

**Decisão:**
JWT httpOnly cookies + Supabase Auth (híbrido)

**Rationale:**
- JWT: Stateless, compatível com SPA, httpOnly seguro
- Supabase Auth: OAuth integrado, RLS, já configurado

**Consequências:**
- Positivas: Escalabilidade, segurança, integração com Supabase
- Negativas: Revogação complexa, token size limit

**Alternativas Consideradas:**
- Sessions (rejeitado: stateful, escala complexa)
- Supabase Auth apenas (rejeitado: limitações)

---

### [D-008] Processador de Pagamentos

**Data:** 15/03/2026
**Status:** Accepted (legado)
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher um processador de pagamentos.

**Decisão:**
Stripe (legado), migrando para PIX/WhatsApp

**Rationale:**
- Stripe: Ecossistema maduro, webhooks confiáveis, suporte global
- PIX/WhatsApp: Melhor para Brasil, sem taxas, contato direto

**Consequências:**
- Positivas: Stripe como fallback, PIX/WhatsApp para UX principal
- Negativas: Dois sistemas, Stripe ainda mantido

**Alternativas Consideradas:**
- Paddle (rejeitado: ecossistema menor)
- LemonSqueezy (rejeitado: ecossistema menor)

---

### [D-009] Plataforma de Hosting

**Data:** 01/01/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos escolher uma plataforma de hosting.

**Decisão:**
Vercel

**Rationale:**
- Deploy automático (git push)
- CDN global
- Edge functions
- Preview deployments
- Integração com React/Vite

**Consequências:**
- Positivas: Deploy zero-friction, performance global, preview environments
- Negativas: Vendor lock-in, limites de uso (free tier)

**Alternativas Consideradas:**
- Railway (rejeitado: menos otimizado para frontend)
- Self-hosted (rejeitado: overhead operacional)

---

### [D-009A] Proxy Confiável no Express em Produção Vercel

**Data:** 30/06/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Em produção na Vercel, as requisições chegam ao Express atrás do proxy/CDN da plataforma com headers `X-Forwarded-*`. O `express-rate-limit` valida `X-Forwarded-For` e pode registrar `ValidationError` ou falhar em rotas sensíveis como `/api/auth/login` quando o Express não confia no proxy.

**Decisão:**
Configurar `app.set("trust proxy", 1)` na criação do app Express.

**Rationale:**
- A Vercel é o proxy de entrada oficial do ambiente de produção
- Rate limiting precisa identificar IP real sem quebrar validações de proxy
- Login, auth e rotas com limite de requisições devem funcionar de forma consistente em produção

**Consequências:**
- Positivas: Login mais estável na Vercel, menos falsos erros `FUNCTION_INVOCATION_FAILED`, rate limit compatível com proxy
- Negativas: Em ambientes self-hosted, o proxy reverso deve ser confiável e corretamente configurado

**Alternativas Consideradas:**
- Remover rate limiting (rejeitado: reduz segurança)
- Ignorar validações do `express-rate-limit` (rejeitado: mascararia configuração incorreta)
- Rate limiting distribuído com Redis/Upstash (deferido para fase de escala)

---

### [D-009B] Criação Admin de Usuários com Reconciliação Supabase

**Data:** 30/06/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Em produção, a criação de contas pelo painel admin precisa gerar acesso persistente no Supabase Auth e manter o banco local sincronizado. Durante deploys e testes, pode existir usuário no Supabase sem registro correspondente em `users`, causando falha na criação admin.

**Decisão:**
O fluxo admin é Supabase-first. Se o Supabase informar conflito de e-mail, o backend busca o usuário existente no Supabase, sincroniza senha/metadados e cria o vínculo local com `users.supabase_id`.

**Rationale:**
- Evita contas órfãs entre Supabase Auth e banco local
- Permite recuperar tentativas parciais de criação em produção
- Mantém login por senha local e fallback Supabase coerentes

**Consequências:**
- Positivas: criação de acesso fica idempotente para o admin, menos suporte manual no painel Supabase
- Negativas: ação admin pode sobrescrever senha/metadados de um usuário Supabase existente com o mesmo e-mail

**Alternativas Consideradas:**
- Falhar quando o e-mail já existe no Supabase (rejeitado: mantém desalinhamento)
- Criar somente no banco local (rejeitado: não resolve acesso persistente Supabase)
- Exigir correção manual no painel Supabase (rejeitado: frágil para produção)

---

### [D-009C] Produção Não Deve Persistir Estado em SQLite Efêmero

**Data:** 30/06/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
A Vercel executa funções serverless com filesystem efêmero. Usar SQLite em `/tmp` permite smoke tests, mas não garante que requisições diferentes compartilhem o mesmo estado. Isso causa sintomas como usuário criado em uma instância e ausente na listagem de outra.

**Decisão:**
SQLite em `/tmp` fica permitido apenas para beta/teste controlado com `ALLOW_EPHEMERAL_SQLITE=true`. A produção real deve usar Supabase Postgres via Prisma como fonte de verdade para usuários, projetos, clientes, arquivos, reviews, métricas e planos.

**Rationale:**
- Produção precisa de estado persistente e compartilhado entre instâncias
- Supabase Auth sozinho não resolve os dados operacionais do app
- A fase de persistência deve ser priorizada antes de evoluir features pesadas

**Consequências:**
- Positivas: elimina inconsistência entre instâncias, melhora confiabilidade de deploy, prepara escala
- Negativas: exige migração de queries SQLite para camada Prisma/Postgres antes de novas fases grandes

**Implementação em 30/06/2026:**
- Integração Supabase/Vercel conectada e `POSTGRES_PRISMA_URL` reconhecida pelo backend
- Migrations de schema e RLS aplicadas no Supabase de produção
- Prisma 7 configurado com `@prisma/adapter-pg`
- Domínios de autenticação, contas-base, clientes, projetos, oportunidades, interações, colaboradores, membros, arquivos, video reviews, notificações, configurações, financeiro, analytics, ferramentas e IA migrados para Prisma/Postgres
- Arquivos em produção gravam no Supabase Storage e downloads usam URL assinada
- `ALLOW_EPHEMERAL_SQLITE` removido do ambiente `production`
- Deploy `dpl_J8f2jBNL7ZwfEEHWGffqoV6eUY6g` validado com `npm run smoke:prisma` contra a URL pública
- TLS do Pooler tratado no adapter sem desativar validação para hosts externos ao Supabase

**Alternativas Consideradas:**
- Continuar com SQLite em `/tmp` (rejeitado: inconsistente em produção)
- Usar path SQLite customizado na Vercel (rejeitado: filesystem continua efêmero)
- Migrar só auth para Supabase (rejeitado: projetos/clientes/arquivos continuariam instáveis)

---

### [D-010] Internacionalização

**Data:** 01/04/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos implementar suporte a múltiplos idiomas.

**Decisão:**
Context React + localStorage (PT/EN)

**Rationale:**
- Context API: State management nativo do React
- localStorage: Persistência sem backend
- PT/EN: Mercado principal Brasil, expansão global

**Consequências:**
- Positivas: Simples, rápido, sem dependência externa
- Negativas: Traduções em memória, sem suporte a pluralização complexa

**Alternativas Consideradas:**
- i18next (rejeitado: overhead para 2 idiomas)
- react-intl (rejeitado: bundle size maior)

---

### [D-011] Sistema de Notificações

**Data:** 01/05/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos implementar um sistema de notificações in-app.

**Decisão:**
Popover no navbar + banco de dados

**Rationale:**
- Popover: UX familiar, não intrusivo
- Banco de dados: Persistência, histórico

**Consequências:**
- Positivas: UX familiar, persistência, histórico
- Negativas: Polling necessário (ou websockets futuro)

**Alternativas Consideradas:**
- Toast notifications (rejeitado: menos visível)
- Email apenas (rejeitado: não real-time)

---

### [D-012] Command Palette

**Data:** 01/05/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos implementar navegação rápida via teclado.

**Decisão:**
Cmd+K global com 12 comandos

**Rationale:**
- Padrão de UX familiar (Linear, VS Code)
- Navegação rápida sem mouse
- 12 comandos cobrem principais ações

**Consequências:**
- Positivas: UX familiar, navegação rápida
- Negativas: Curva de aprendizado para novos usuários

**Alternativas Consideradas:**
- Sem command palette (rejeitado: UX inferior)
- Menu de navegação (rejeitado: menos rápido)

---

### [D-013] Video Review com Anotações

**Data:** 15/05/2026
**Status:** Accepted
**Decidido por:** Time de Desenvolvimento

**Contexto:**
Precisávamos implementar review de vídeos com anotações.

**Decisão:**
Timestamp + JSON annotations (rectangles, etc.)

**Rationale:**
- Timestamp: Precisão para feedback
- JSON: Flexibilidade para diferentes tipos de anotações
- Link compartilhável: Facilita feedback com clientes

**Consequências:**
- Positivas: Precisão, flexibilidade, fácil compartilhamento
- Negativas: Complexidade de renderização de anotações

**Alternativas Consideradas:**
- Sem anotações (rejeitado: funcionalidade limitada)
- Imagens estáticas (rejeitado: menos preciso)

---

### [D-014] Evolução Progressiva de UI/UX Operacional

**Data:** 30/06/2026
**Status:** Accepted
**Decidido por:** Produto e Engenharia

**Contexto:**
O Cena Studio já possui identidade visual própria e consistente. Uma reformulação ampla criaria risco de descaracterização sem necessariamente melhorar o trabalho diário.

**Decisão:**
Evoluir a interface por fluxos críticos, preservando tipografia, paleta, linguagem cinematográfica e densidade. Cada melhoria deve priorizar hierarquia, próxima ação, feedback de estado, acessibilidade e responsividade, com testes frontend e validação visual em desktop/mobile.

Em 30/06/2026, essa decisão foi aplicada também em ProjectHub, clientes e pipeline comercial: ProjectHub passou a destacar o próximo movimento operacional; clientes ganhou erro com retry, limpeza de filtros e vazio contextual; pipeline ganhou resumo de foco comercial, oportunidades abertas, atenção de prazo e recuperação explícita de falha.

Na frente Studio/Tools/Documents, a mesma decisão passou a orientar uma camada de sessão crítica: landing explica o fluxo central, login reforça acesso operacional, loading usa skeleton, Tools destaca ferramentas críticas, Briefing/Proposta/Orçamento/Contratos/Entrega exibem progresso e saída esperada, Output orienta ida para documentos e Documents mostra contexto de projeto/cliente/documento.

**Rationale:**
- Sistemas operacionais precisam favorecer leitura, comparação e ação recorrente
- Melhorias graduais reduzem risco visual e comportamental
- Estados de carregamento, erro, vazio, alteração pendente e sucesso fazem parte do fluxo
- Validação em navegador encontra sobreposições que testes de DOM não detectam
- A tela deve orientar a próxima decisão do usuário, não apenas listar dados
- Ferramentas críticas precisam revelar lacunas, saída esperada e próximo passo para não virarem formulários isolados

**Consequências:**
- Positivas: identidade preservada, menor esforço cognitivo e mudanças verificáveis
- Negativas: evolução por módulos é mais gradual que uma reformulação completa

**Alternativas Consideradas:**
- Redesign completo (rejeitado: alto risco e pouco alinhamento com a maturidade atual)
- Apenas ajustes cosméticos (rejeitado: não resolve atritos de fluxo)

---

## ⏳ Decisões Pendentes

### [D-P-002] Solução de Cache

**Status:** Pending
**Prioridade:** Média
**Data de decisão:** Sprint 3

**Opções:**
- Redis self-hosted (controle total, sem custo)
- Upstash (managed, edge locations, custo)

**Recomendação:** Upstash

---

### [D-P-003] Ferramenta de Monitoring

**Status:** Pending
**Prioridade:** Alta
**Data de decisão:** Sprint 1

**Opções:**
- Sentry (error tracking focado)
- Datadog (APM completo, mais caro)
- New Relic (APM completo, mais caro)

**Recomendação:** Sentry (inicial), Datadog (futuro se necessário)

---

### [D-P-004] Estratégia de Pagamento

**Status:** Pending
**Prioridade:** Alta
**Data de decisão:** Imediato

**Opções:**
- PIX/WhatsApp apenas (atual)
- Stripe global
- Híbrido (PIX + Stripe)

**Recomendação:** Híbrido

---

### [D-P-005] Provider de IA Definitivo

**Status:** Pending
**Prioridade:** Alta
**Data de decisão:** Sprint 1

**Opções:**
- NVIDIA apenas (atual)
- Anthropic apenas
- Híbrido (NVIDIA simples, Anthropic complexo)

**Recomendação:** Híbrido

---

### [D-P-006] GitHub OAuth

**Status:** Pending
**Prioridade:** Média
**Data de decisão:** Sprint 2

**Opções:**
- Implementar (melhor UX)
- Não implementar (complexidade adicional)

**Recomendação:** Implementar se tempo permitir

---

### [D-P-007] SMTP/Email Provider

**Status:** Pending
**Prioridade:** Média
**Data de decisão:** Sprint 2

**Opções:**
- SendGrid (popular, fácil)
- AWS SES (barato, complexo)
- Mailgun (popular, fácil)

**Recomendação:** SendGrid (facilidade)

---

## 🔄 Decisões Revisadas

### [D-R-001] Monolito vs Microservices

**Status:** Revisado
**Data original:** 01/01/2026
**Data revisão:** 30/06/2026
**Decisão original:** Monolito
**Decisão revisada:** Monolito (mantido)

**Rationale:**
- Time pequeno ainda
- Escala horizontal ainda não necessária
- Reavaliar quando atingir 10k usuários

---

## 📊 Estatísticas

- **Total de decisões:** 14
- **Aceitas:** 14
- **Rejeitadas:** 0
- **Pendentes:** 6
- **Revisadas:** 1

---

## 📚 Recursos

- [ARCHITECTURE.md](ARCHITECTURE.md) - Decisões de arquitetura (ADRs)
- [SENIOR_LEVEL_ROADMAP.md](SENIOR_LEVEL_ROADMAP.md) - Roadmap de melhorias

---

**Última atualização:** 30 de Junho de 2026
