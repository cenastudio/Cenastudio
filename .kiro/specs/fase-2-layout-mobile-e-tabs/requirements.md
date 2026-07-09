# Requirements Document

## Introduction

Este spec cobre a **Fase 2** do
[`PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md).

A Fase 1 (testes de uso real) foi concluída e produziu como saída o
documento [`FASE_1_ACHADOS.md`](../../../FASE_1_ACHADOS.md) com um
passivo priorizado. A Fase 2 é a **execução desse passivo**.

### Contexto — o que a Fase 1 revelou

Rodando a nova suíte E2E em `chromium-mobile` (Pixel 7), foram
encontrados 9 achados legítimos (não bugs de teste). Agrupados:

- **3 achados P0** que **bloqueiam** uso mobile real hoje.
- **3 achados P1** de consistência de touch target — todos apontam
  para o mesmo problema estrutural: cada página com abas
  (`AdminDashboard`, `ClientDetail`, `CommercialOverview`) implementou
  suas próprias abas manualmente, com alturas 39-41 px (abaixo dos
  44 px exigidos por WCAG 2.5.5 / Apple HIG).
- **2 achados P2** de design system (botões pequenos, breadcrumbs).

A Fase 2 não é um trabalho de "adicionar features". É:

1. Desbloquear UX mobile hoje (P0).
2. **Criar a camada de layout compartilhada** que faltava e que era a
   causa raiz de os problemas serem tratados isoladamente por página
   (P1 — `ResponsiveTabs` + revisão do `AppNavBar` mobile).
3. Fechar toques finais do design system (P2).

### Objetivo mensurável

Ao fim da Fase 2, os testes `@fase1` que hoje falham vermelho devem
passar verde — sem que se alterem os testes em si. O critério de
"a Fase 2 acabou" é literalmente `npx playwright test --grep "@fase1"`
retornando exit 0.

### Não é escopo da Fase 2

- Fase 3 (white label).
- Reescrever design system inteiro. As mudanças ficam concentradas em
  componentes citados nos achados, e em criar apenas o componente
  compartilhado (`ResponsiveTabs`) que remove a duplicação atual.
- Refatorar server ou banco.
- Testes visuais/regressão de screenshot (fora de escopo desde a
  Fase 1).
- Corrigir os 2 testes pré-existentes do `launch.spec.ts` que
  falhavam antes da Fase 1 (`critical authenticated app screens` e
  `light theme project dialog`), a não ser que a correção de outro
  requisito resolva o problema deles indiretamente.

### Riscos gerais reconhecidos

- Mudanças de `AppNavBar` e componentes de aba afetam **todas** as
  páginas autenticadas — potencial de regressão em desktop.
  Mitigação: a suíte E2E em desktop continua rodando, e o
  `expectNoHorizontalOverflow` continua ativo.
- Mover o botão "Novo projeto" no dashboard pode conflitar com fluxos
  desktop atuais. Mitigação: fazer o botão ser **visível em ambos**,
  não substituir por uma variante mobile-only.
- Consolidar em `ResponsiveTabs` pode quebrar assinaturas atuais de
  `TabsList` do shadcn. Mitigação: `ResponsiveTabs` é um novo
  componente que envolve o Tabs do Radix — não substitui a primitiva,
  só padroniza o uso.

## Glossary

- **Touch target**: bounding box renderizada de um elemento
  interativo, medida em CSS pixels via `getBoundingClientRect()`.
  Mínimo aceitável na Fase 2: **44 × 44 px** (WCAG 2.5.5 AAA, Apple
  HIG).
- **`ResponsiveTabs`**: componente novo a ser criado nesta fase, que
  envolve a primitiva `Tabs`/`TabsList` do Radix (`client/src/components/ui/tabs.tsx`)
  e garante altura mínima do trigger + comportamento de scroll
  horizontal consistente em mobile.
- **Achado Pn**: refere-se a itens numerados na
  [`FASE_1_ACHADOS.md`](../../../FASE_1_ACHADOS.md) seção 8.
- **Testes `@fase1`**: os testes marcados com tag `@fase1` nos títulos
  em `tests/e2e/mobile-user-flow.spec.ts` e
  `tests/e2e/critical-pages-mobile.spec.ts`. Servem de indicador
  binário de sucesso desta fase.

## Requirements

### Requirement 1: Restaurar acesso ao botão "Novo projeto" no dashboard mobile

**User Story:** Como usuário mobile, quero que o botão "Novo projeto"
esteja acessível no dashboard mobile sem depender de abrir o menu
hamburguer, para conseguir começar meu trabalho principal (criar
projeto) sem fricção extra.

#### Acceptance Criteria

1. QUANDO um usuário autenticado navegar para `/dashboard` em viewport
   mobile (largura < 1024 px), ELE DEVE ver o botão/ação "Novo projeto"
   visível no viewport inicial sem necessidade de abrir o menu
   hamburguer.
2. O botão pode ser realizado como:
   a. Botão dentro do header/hero do dashboard.
   b. Floating action button (FAB) fixo no canto inferior.
   c. Card destacado dentro da lista de atalhos.
   Qual das três é decidido no design, mas o teste `@fase1 mobile user
   flow` DEVE conseguir localizar o botão via
   `page.getByRole("button", { name: /novo projeto|new project/i })`.
3. QUANDO em viewport desktop (largura >= 1024 px), o botão "Novo
   projeto" DEVE continuar visível como está hoje (posicionamento
   pode ser adaptado, mas não pode desaparecer nem ser deslocado
   para dentro do menu).
4. A área de toque do botão DEVE ser >= 44 × 44 px em ambos os
   viewports.
5. QUANDO o botão é clicado, o modal de criação DEVE abrir (mesmo
   comportamento atual em desktop).

### Requirement 2: Onboarding modal não bloqueia interações em mobile

**User Story:** Como usuário mobile que acabou de fazer login, quero
que a interface fique interativa imediatamente, sem um modal cobrindo
a tela por meio segundo antes de eu poder tocar em qualquer elemento,
para não perder tempo/toques nos primeiros momentos de uso.

#### Acceptance Criteria

1. Após login bem-sucedido em viewport mobile, o `WelcomeModal`
   (definido em `client/src/components/onboarding/WelcomeModal.tsx` e
   invocado em `client/src/pages/Dashboard.tsx` linha 784) NÃO DEVE
   interceptar pointer events em qualquer momento em que o resto da
   página já esteja renderizada e interativa.
2. Opções aceitas para atender ao critério 1:
   a. Substituir o modal por uma seção inline no dashboard (não
      overlay).
   b. Manter modal, mas exibir apenas após um gatilho de intenção
      do usuário (ex.: primeiro clique no avatar/menu).
   c. Manter modal, mas garantir que ele só monte em DOM **depois** de
      o dashboard estar totalmente pronto E que a `pointer-events` do
      overlay seja `none` fora do card interno.
3. Usuários que já viram o modal antes (localStorage
   `cena-studio-welcome-completed` ou `cena-studio-welcome-dismissed`
   setado) NÃO DEVEM ver o modal novamente — comportamento atual
   preservado.
4. Em desktop, o comportamento pode permanecer como hoje (o achado
   foi apenas em mobile).
5. O teste `@fase1 mobile user flow` DEVE conseguir completar o
   fluxo `login → dashboard → click em Novo projeto` sem precisar
   do workaround `disableOnboarding` do
   `tests/e2e/support/auth.ts`. O helper pode ser mantido como rede
   de segurança, mas o teste DEVE passar mesmo sem ele para
   confirmar a correção.

### Requirement 3: Marcador de página `/admin` reconhecível

**User Story:** Como usuário e como automação de teste, quero que a
página `/admin` mostre um marcador de conteúdo claro e estável, para
saber que estou na página certa e para ferramentas de teste/leitores
de tela reconhecerem o contexto.

#### Acceptance Criteria

1. A página `/admin` DEVE renderizar em algum ponto do viewport
   inicial (top ~600 px) um texto que case com o padrão
   `/Gerenciar acessos|Manage access/i` OU um novo marcador
   equivalente escolhido no design.
2. Se o marcador for diferente de `Gerenciar acessos|Manage access`,
   o teste `launch.spec.ts` linha 45 DEVE ser atualizado como parte
   desta task para refletir o novo texto. Isso é a **única exceção**
   ao princípio "não modificar testes" da Fase 2.
3. O marcador DEVE estar visível em ambos os viewports
   (`chromium-desktop` e `chromium-mobile`).
4. O marcador DEVE ser hierarquicamente coerente — semanticamente um
   `heading` (h1/h2), não apenas um `<span>` decorativo.

### Requirement 4: Componente `ResponsiveTabs` unificado

**User Story:** Como desenvolvedor mantenendo o app, quero um único
componente `ResponsiveTabs` que padronize altura, padding, e
comportamento de scroll horizontal em mobile, para que abas em
qualquer página nova sigam o mesmo comportamento sem cada página
re-inventar.

#### Componentes afetados

Substituir as implementações manuais em:

- `client/src/pages/AdminDashboard.tsx` (linhas 222-241)
- `client/src/pages/ClientDetail.tsx` (linhas 367-389)
- `client/src/pages/CommercialOverview.tsx` (linhas 501-506)

`AnalyticsPremium.tsx` (linhas 41-50) NÃO é obrigatório — usa layout
`grid-cols-2 max-w-md`, simples e sem sinal de problema. Pode
migrar depois.

#### Acceptance Criteria

1. Um novo componente `ResponsiveTabs` DEVE ser criado em
   `client/src/components/ui/responsive-tabs.tsx` (ou path
   equivalente do design system existente).
2. O componente DEVE:
   a. Renderizar internamente a primitiva `Tabs`/`TabsList`/`TabsTrigger`
      do Radix (mesma que já está em `client/src/components/ui/tabs.tsx`).
   b. Aplicar altura mínima ≥ 44 px a cada `TabsTrigger`.
   c. Aplicar scroll horizontal automático quando o conteúdo das abas
      ultrapassar a largura do container em mobile — sem quebrar em
      múltiplas linhas.
   d. Aceitar props tipadas para: `tabs` (array de `{ value, label,
      count?, disabled? }`), `defaultValue`, `onValueChange`.
   e. Preservar suporte a badge/contador ao lado do label (padrão hoje
      em `ClientDetail.tsx`, ex.: `Projetos · 3`).
3. Depois da substituição:
   a. `AdminDashboard.tsx`, `ClientDetail.tsx`, e `CommercialOverview.tsx`
      DEVEM usar `ResponsiveTabs` em vez de implementação manual.
   b. Os testes `@fase1 client detail: troca de abas mostra conteúdo`
      e `@fase1 admin dashboard: troca de abas mostra conteúdo` DEVEM
      passar sem alterações nos testes.
   c. `assertMinTouchTargets(page)` chamado nessas páginas DEVE
      passar (todas as abas ≥ 44 px).
4. Em desktop, a aparência visual (cores, fonte, estados
   ativo/inativo, gap) DEVE ser **preservada** — nenhum design
   redesign, só padronização de altura e comportamento mobile.
5. Documentação inline (JSDoc) DEVE explicar por que o componente
   existe e o que ele resolve — referenciar `FASE_1_ACHADOS.md`
   seção 8 P1 item 4.

### Requirement 5: Botões do header (`AppNavBar` mobile) atendem 44×44

**User Story:** Como usuário mobile, quero que todos os botões do
header (busca, notificações, avatar, locale) tenham área de toque
suficiente, para não errar toque em ícones minúsculos.

#### Acceptance Criteria

1. Os seguintes botões do `AppNavBar` em viewport mobile DEVEM
   atender >= 44 × 44 px de área de toque renderizada:
   a. "Voltar ao painel" (link do logo).
   b. "Abrir busca".
   c. "N Não lido" (notificações).
   d. "A" (avatar).
   e. "PT" / "EN" (locale toggle, se visível em mobile).
2. Aparência visual do header em desktop NÃO DEVE mudar
   significativamente — mesma escala de ícones, mesmo espaçamento.
3. Se ícones específicos (ex.: notificações) usarem badge sobreposto,
   a área de toque considerada é a do botão container, não do ícone
   dentro — o ajuste é no padding do botão.
4. `assertMinTouchTargets(page)` chamado em `/dashboard` mobile
   (o primeiro teste de `critical-pages-mobile.spec.ts`) DEVE deixar
   de reportar qualquer um destes botões após a correção.

### Requirement 6: Botões primários e ações no dashboard atendem 44×44

**User Story:** Como usuário mobile, quero que os botões principais
do dashboard (ações do "Job em foco", atalhos, itens de pendências)
tenham área de toque adequada.

#### Acceptance Criteria

1. Os botões seguintes, mensurados na Fase 1 em `/dashboard` mobile,
   DEVEM atender >= 44 × 44 px:
   a. "Completar briefing" — hoje 314.75 × 43.25 (falta 0.75 px de
      altura).
   b. "Plano Studio" — hoje 378.09 × 44 (exatamente no limite;
      garantir folga >= 1 px após ajuste).
2. Botões dentro do card "Pendências" (padrão `button` com ícone +
   texto + strong) DEVEM atender >= 44 × 44 px.
3. Correção deve ser feita via ajuste no design token de altura de
   botão primário (ex.: aumentar `py` de `2.5` para `3` no CSS
   utility) OU via ajuste local no componente — decidido no design.

### Requirement 7: Botões pequenos ("+ Novo cliente", "Voltar para Clientes") ganham padding

**User Story:** Como usuário mobile, quero que ações secundárias como
"+ Novo cliente" e "Voltar para Clientes" tenham área de toque
razoável, para não errar toque nesses elementos de navegação
frequente.

#### Acceptance Criteria

1. Botões atualmente identificados com altura extremamente pequena
   (~16-17 px) DEVEM receber padding para atingir área >= 44 × 44 px.
   Elementos afetados:
   a. `+ Novo cliente` em `/proposals` mobile.
   b. `Voltar para Clientes` em `/clients/:id` mobile.
2. Aparência textual pode ser preservada (não precisa mudar cor,
   fonte ou estilo) — apenas o container ganha padding suficiente.
3. Alternativa aceita: transformar em variante `button` do design
   system em vez de texto puro clicável.

### Requirement 8: Decisão explícita sobre breadcrumbs

**User Story:** Como desenvolvedor, quero uma decisão documentada
sobre se breadcrumbs (`Comercial`, `Clientes` como links pequenos de
navegação hierárquica) devem atender 44×44 ou não, para que o design
system tenha regra clara.

#### Acceptance Criteria

1. UMA das duas opções DEVE ser adotada:
   a. **Opção A**: breadcrumbs recebem padding suficiente para
      atender 44×44. Consistência com o resto.
   b. **Opção B**: breadcrumbs recebem o atributo explícito
      `data-touch-target-exempt` (introduzido pelo helper de
      touch target da Fase 1), e a decisão é documentada no design
      system (uma linha em algum `.md` de guidelines).
2. A escolha DEVE ser feita no design (não deixar em aberto na task).
3. Após a implementação, o teste `@fase1 client detail` DEVE
   deixar de reportar violação para os links "Comercial" e
   "Clientes".

### Requirement 9: Testes `@fase1` passam verde ao fim da Fase 2

**User Story:** Como responsável pelo produto, quero um sinal binário
(verde/vermelho) que confirma quando a Fase 2 acabou, sem depender
de revisão manual, para saber com confiança quando podemos considerar
o passivo mobile encerrado.

#### Acceptance Criteria

1. Ao fim da Fase 2, `npx playwright test --grep "@fase1"` DEVE
   retornar exit code 0 (todos os testes passando).
2. NENHUM teste `@fase1` DEVE ser alterado no processo — se algum
   teste falhar por assumir estrutura errada, avaliar caso a caso;
   preferência é ajustar o código de produção, não relaxar o teste.
3. Suíte E2E completa (`npx playwright test`) DEVE continuar rodando
   em <= 8 min (Req 6.1 da Fase 1 continua válido).
4. Testes de Vitest atuais (1085/1085) DEVEM continuar passando —
   sem regressão nas 1085 asserções que já rodam verde.
5. Testes de desktop existentes que já passavam antes da Fase 2 (o
   teste `client, project and studio workflow`) DEVEM continuar
   passando em desktop e mobile.

### Requirement 10: Sem regressão de layout em desktop

**User Story:** Como usuário desktop, quero que meu app continue
funcionando exatamente como está, sem que as correções mobile
introduzam bugs em desktop.

#### Acceptance Criteria

1. Após as mudanças, em viewport desktop (1440 × 960):
   a. Os testes atuais que passavam DEVEM continuar passando.
   b. `expectNoHorizontalOverflow` DEVE continuar passando em todas
      as páginas críticas.
   c. Nenhuma página DEVE ter aparência visual radicalmente diferente
      do estado atual (mudanças de altura são aceitas se ficarem
      dentro do range visual atual).
2. Se alguma mudança de código exigir sacrificar aparência desktop
   por causa de acessibilidade mobile, PREFERIR uma variante
   responsiva (`lg:` prefix ou similar) em vez de uma solução
   uniforme.

## Fora de escopo (deferido para futuro spec)

- Cobertura de touch target em páginas fora das 5 críticas
  (`AnalyticsPremium`, `Files`, `VideoReviews`, `Studio`, `ProjectChapter`,
  `Team`, `Collaborators`, `CompanySettings`, `Documents`).
- `PageShell` primitivo de layout mencionado no plano macro — não
  entra nesta fase porque não é bloqueio real. Fica para uma Fase
  2.5 ou próxima iteração.
- Fail-on-console-error nos testes.
- Testes visuais/regressão de screenshot.
- Correção dos 2 testes pré-existentes do `launch.spec.ts` que
  falhavam antes da Fase 1 (`critical authenticated app screens` +
  `light theme project dialog`). Se a solução do Req 1 (restaurar
  botão) resolver o `light theme` como efeito colateral, ótimo.
  Se não, fica para outra fase.
- White label (Fase 3).
