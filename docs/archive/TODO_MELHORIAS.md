# Cena Studio — Tarefas Pendentes

## Sessão atual (06/07/2026)

### ✅ Concluído
- [x] Menu 4 áreas (Painel / Comercial / Produção / Financeiro)
- [x] JourneyBreadcrumb contextual em toda página
- [x] CommercialHub como shell container (CommercialNav com tabs)
- [x] ProductionShell com ProductionNav (Jobs / Studio IA / Aprovações)
- [x] ProjectHub redesenhado (timeline + próximo passo + ferramentas)
- [x] Analytics refeito (storytelling: "O que aconteceu com o dinheiro" + steps)
- [x] CommercialOverview diferenciado ("De onde vem o trabalho" + steps)
- [x] Proposals com gate de cliente obrigatório + 3 steps visuais
- [x] Pipeline com storytelling + empty state rico com conexões
- [x] Interactions com narrativa real ("Registro de conversas" + steps)
- [x] Clients com steps + cards redesenhados + drag no card inteiro
- [x] VideoReviews com 5 melhorias (steps, projeto, fila, sidebar, pós-aprovação)
- [x] Documents header melhorado (steps: Preencher → Revisar → Exportar → Aprovar)
- [x] Empty states em laranja glass (frame-empty-state padrão)
- [x] Traduções corrigidas (CommercialNav EN, Proposals labels, Histórico)
- [x] Cards métricas comercial padronizados (sem cores aleatórias)
- [x] `.env` corrigido para dev local (PORT=5001, SQLite)
- [x] Dashboard REDESIGN COMPLETO (saudação + job em foco + pendências + atalhos + feed)
- [x] Evolução visual global: glow effects, liquid glass modals, micro-animações, translucidez
- [x] frame-card com border-radius 16px + glow hover
- [x] Dialog/Modal com liquid-glass-modal (blur 40px, gradient, rounded-xl)
- [x] Overlay com backdrop-blur-md
- [x] frame-btn-primary com shine sweep animation no hover
- [x] frame-btn-ghost com glow sutil no hover
- [x] frame-input com border-radius 6px + glass blur + glow focus
- [x] Classes utilitárias: .liquid-glass, .glow-card, .animate-stagger-*, .animate-glow-pulse, .animate-icon-float

---

### 🔨 Pendente — Próxima sessão

#### 1. Documentos: Split-view sem modal ✅ FEITO
- Layout 2 colunas: Formulário (esquerda sticky) | Preview PDF (direita)
- Campos sempre visíveis, editáveis inline
- Doc type selector como tabs horizontais
- Sem modal — tudo na mesma tela
- Histórico compacto abaixo do preview

#### 2. ProjectHub sidebar: melhorar visibilidade ✅ FEITO
- Info do cliente, formato e tom agora aparecem no hero (inline, visíveis em mobile)
- Ferramentas com descrição do que cada uma faz
- Texto introdutório explicando o grid

#### 3. Modal de lançamento financeiro (Analytics)
- Toggle Receita/Despesa com mais contraste visual (borda verde/vermelha no modal)
- Descrição em destaque (campo maior)
- Valor com "R$" fixo à esquerda
- Seção "Quando" agrupada (Vencimento + Status + Recorrência)
- Preview do lançamento antes de registrar

#### 3. Dashboard: REDESIGN COMPLETO (PRIORIDADE MÁXIMA) ✅ FEITO

**Problema atual:**
- Título "CENTRAL DA OPERAÇÃO" genérico, ocupa muito espaço
- Focus project repete info do ProjectHub (timeline, stages)
- "Projetos ativos: 1 / Briefings: 0 / Plano: Pro" — info estática sem ação
- Módulos (Comercial/Produção/Financeiro) repetem o menu principal
- Director Queue escondido abaixo do fold
- Não responde: "O que precisa da minha atenção agora?"

**Redesign proposto:**
```
┌─────────────────────────────────────────────────┐
│ Bom dia, Dante.                                 │
│ 1 job ativo · próximo: Briefing · prazo: 17 jul │
├─────────────────────────────────────────────────┤
│ ⚡ JOB EM FOCO                                  │
│ ┌──────────────────────────────────────────┐    │
│ │ filme · Links · Comercial                │    │
│ │ Etapa: Entrada → Próximo: Briefing       │    │
│ │                      [CONTINUAR JOB →]   │    │
│ └──────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│ 📋 PENDÊNCIAS (director queue no topo!)         │
│ · Completar briefing — filme                    │
│ · Definir prazo — filme                         │
├─────────────────────────────────────────────────┤
│ ATALHOS                                         │
│ [+ Novo Job] [+ Novo Cliente] [+ Nova Proposta] │
├─────────────────────────────────────────────────┤
│ ATIVIDADES RECENTES (feed compacto)             │
└─────────────────────────────────────────────────┘
```

**O que REMOVER:**
- Título gigante "CENTRAL DA OPERAÇÃO"
- 3 módulos (Comercial/Produção/Financeiro) que repetem menu
- Timeline de stages no focus project (já está no ProjectHub)
- Seção "Todos os projetos" (já existe em /projects)

**O que MANTER:**
- Focus project compacto (nome + cliente + etapa + botão continuar)
- Director Queue (mover pro TOPO — é a info mais importante)
- Atividades recentes (manter compacto)
- Create project modal (mantém funcional)

**O que ADICIONAR:**
- Saudação com resumo em 1 linha ("1 job ativo · próximo:1 job ativo · próximo: Planejamento · prazo: 14 de ago. X · prazo: Y")
- Atalhos rápidos (3 botões de ação)
- Pendências como primeira seção visível

**Estimativa:** ~200 linhas de JSX novo substituindo ~400 linhas atuais.
**Executar:** Próxima sessão com contexto limpo para máxima atenção.

#### 4. Tradução completa EN
- Extrair textos hardcoded PT das páginas pra `t()`
- Completar en.json com traduções reais
- Páginas prioritárias: Dashboard, Projects, Tools, ProjectHub, Analytics

#### 5. Consolidar Home vs Dashboard
- `/home` e `/dashboard` fazem a mesma coisa
- Decidir qual mantém, redirecionar a outra
- `/home` usa inline styles (fora do padrão Frame)

#### 6. Cadastro de cliente (NewClient) — revisar
- Verificar se o formulário está completo e funcional
- Adicionar storytelling (pra que serve cada campo)
- Conectar com o fluxo (após cadastrar → sugere criar proposta ou job)

---

### � Fase 2 — Sistema de Equipe (Colaboradores com Login)

**Status:** Backend + integração frontend implementados ✅

#### Arquitetura implementada:
- [x] `server/services/teamService.ts` — CRUD de membros, contexto, validações
- [x] `server/routes/team.ts` — Endpoints REST (GET/POST/PUT/DELETE /team)
- [x] `server/middleware/teamAccess.ts` — `ownerOnly` + `requireTeamRole`
- [x] Rotas comerciais bloqueadas pra membros (`ownerOnly` em commercial.ts)
- [x] Rotas financeiras bloqueadas pra membros (`ownerOnly` em analytics finance)
- [x] `client/src/lib/api.ts` — namespace `api.team.*` completo
- [x] `AuthContext` — `isTeamMember` + `teamRole` + `teamContext`
- [x] `AppNavBar` — esconde Comercial/Financeiro se `isTeamMember`
- [x] `shared/planEntitlements.ts` — `teamMemberLimit: 5` no Studio

#### Pendente (próxima sessão):
- [ ] Página frontend "Equipe" (CRUD visual: criar membro com nome/email/senha/role)
- [ ] Dashboard do colaborador — filtrar projetos por atribuição
- [ ] ProjectHub — aba "Equipe" pra atribuir membros ao projeto
- [ ] Force password reset no primeiro login do membro
- [ ] Notificação pro admin quando membro faz ação no projeto

#### ✅ Concluído:
- [x] Backend `PUT /auth/change-password` (valida senha atual, hash nova)
- [x] Profile: seção "Alterar senha" (3 campos, show/hide, feedback visual)
- [x] Profile redesenhado com liquid-glass, glow-card, layout mais limpo
- [x] CheckoutModal redesenhado: tabs Free/Pro/Studio, preços editáveis centralizados, features visuais, Stripe + WhatsApp
- [x] Página `/team` — CRUD visual com create modal (nome/email/senha gerada/role), lista de membros, ativar/desativar, remover
- [x] ForcePasswordReset — overlay fullscreen intercepta toda navegação quando `mustResetPassword=true`
- [x] `must_reset_password` no DB (SQLite + Prisma), setado `true` na criação de membro, zerado no `changePassword`
- [x] Dashboard: exibe role do membro na saudação quando `isTeamMember`
- [x] ProjectHub: aba Equipe mostra membros com avatar colorido por role, link direto pra `/team` e botão "+ Adicionar membro"
- [x] AppNavBar: `/team` incluído nas production routes (ativo quando na página)

#### Regras de negócio:
- **Free/Pro:** 0 membros (só o dono)
- **Studio:** 5 membros (producer, editor, viewer)
- Admin cria login/senha → manda por WhatsApp/email (fora do app)
- Colaborador vê só projetos atribuídos
- Colaborador pode usar Studio IA + subir arquivos dentro do projeto
- Colaborador NÃO vê: comercial, financeiro, outros projetos

---

### ✅ Minha Conta (Profile) — Evoluções IMPLEMENTADAS (06/07/2026)

**Redesign completo da página Profile com:**

#### 1. ✅ Organização em abas
- Tabs: `Perfil | Segurança | Plano | Preferências | Privacidade`
- Navegação clara e organizada por contexto
- Animações suaves de transição entre abas

#### 2. ✅ Seção "Preferências"
- **Idioma:** Seletor visual PT/EN com bandeiras
- **Tema:** Estrutura preparada para dark/light mode (marcado como "Em breve")
- **Notificações:** Toggle para emails do sistema
- **Fuso horário:** Seletor com principais fusos

#### 3. ✅ Seção "Atividade da conta" (em Segurança)
- Sessões ativas com indicador visual (dispositivo, localização)
- Histórico de ações recentes (login, criação, alterações)
- Botões para encerrar sessões individuais ou todas

#### 4. ✅ Seção "Dados e privacidade"
- Exportar meus dados (LGPD compliance)
- Excluir minha conta com confirmação robusta (digitar frase)
- Links para Termos de uso e Política de privacidade

#### 5. ✅ Plano: visualização melhorada
- **Barra de progresso** do uso de gerações
- **Comparativo de planos** inline (Free/Pro/Studio com preços e features)
- **Histórico de faturas** com download PDF
- Métricas: status, próxima cobrança, forma de pagamento

#### 6. ✅ Segurança: expandida
- Seção de alterar senha mantida e melhorada
- **2FA preparado** (UI com "Em breve")
- **Sessões ativas** com cards visuais
- **Histórico de atividade** da conta

#### 7. ✅ Avatar personalizável
- Upload de foto de perfil com preview
- Hover com ícone de câmera
- Fallback para inicial do nome com cor

#### 8. ✅ Informações do estúdio expandidas
- Nome do estúdio e função (já existia)
- **Razão social** (novo)
- **CNPJ/CPF** (novo)
- **Cidade** (novo)
- **Website** (novo)

#### 9. ✅ UX/Visual
- Layout mais limpo com liquid-glass cards
- Tabs responsivas (ícone em mobile)
- Feedback visual em todas as ações
- Validação em tempo real de senha
- Confirmação de ações perigosas (excluir conta)

---

### 💡 Ideias futuras
- Landing page: verificar traduções EN completas
- Admin panel: revisar se está acessível e funcional
- Mobile: testar todas as telas em viewport menor
- Performance: chunks grandes no build (>500kb) — code splitting
- Stripe/Supabase: configurar quando tiver contas novas pro deploy

### 🔨 Tradução EN — pendências restantes
- [ ] JourneyBreadcrumb.tsx — converter todas as labels para bilíngue (Comercial→Commercial, Produção→Production, etc.)
- [ ] CommercialOverview.tsx — título "De onde vem o trabalho" e subtítulo
- [ ] Analytics.tsx — headers de seções (EVOLUÇÃO DO CAIXA, CONTAS EM ABERTO, etc.)
- [ ] Clients.tsx — labels "Leads" (stat badge) e filtros de status (Active/Lead/Inactive)
- [ ] Interactions.tsx — subtítulo e steps
- [ ] Profile.tsx — todas as tabs e labels de seções
- [ ] CompanySettings.tsx — headers e labels
