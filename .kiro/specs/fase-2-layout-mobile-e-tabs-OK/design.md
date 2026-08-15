# Design Document

## Overview

Este design implementa os 10 requirements do
[`requirements.md`](./requirements.md), operando sobre o passivo
identificado em [`FASE_1_ACHADOS.md`](../../../FASE_1_ACHADOS.md).

O trabalho se divide em três frentes:

1. **Correções focais (P0)** — três mudanças pontuais para desbloquear
   uso mobile:
   - Renomear/expor "Novo projeto" no dashboard (Req 1).
   - Corrigir o `WelcomeModal` para não bloquear cliques (Req 2).
   - Atualizar o teste do `launch.spec.ts` que ainda espera o marcador
     antigo `Gerenciar acessos` (Req 3) — o app já usa `Administração`.
2. **Layout compartilhado (P1)** — criar o componente `ResponsiveTabs`
   (Req 4), corrigir touch targets do `AppNavBar` mobile (Req 5) e
   dos botões primários do dashboard (Req 6).
3. **Design system fino (P2)** — ajustar botões pequenos (Req 7) e
   tomar decisão sobre breadcrumbs (Req 8).

Os requirements 9 e 10 são **critérios não-funcionais** que valem para
todo o trabalho: exit 0 em `--grep "@fase1"` e zero regressão em
desktop.

## Architecture

### Estratégia geral

Cada requirement produz uma ou mais tasks. As tasks são organizadas
em waves paralelas onde possível. A maior parte das mudanças é
**localizada** — um arquivo por vez — o que reduz o risco de
regressão e facilita rollback caso um item específico dê problema.

O único componente **novo** desta fase é `ResponsiveTabs`. Todo o
resto é ajuste em código existente.

### Escopo do que muda por arquivo

| Arquivo | Mudança | Requirement |
|---|---|---|
| `client/src/pages/Dashboard.tsx` (linha 474) | Renomear label "Novo Job" → "Novo projeto" | Req 1 |
| `client/src/pages/Dashboard.tsx` (linha 129-135) | Substituir `setTimeout(500)` por gatilho de intent | Req 2 |
| `tests/e2e/launch.spec.ts` (linha 45) | Marcador `/admin` → `/Administração\|Administration/i` | Req 3 |
| `client/src/components/ui/responsive-tabs.tsx` (NOVO) | Componente compartilhado | Req 4 |
| `client/src/pages/AdminDashboard.tsx` (linhas 222-241) | Migrar para `ResponsiveTabs` | Req 4 |
| `client/src/pages/ClientDetail.tsx` (linhas 367-389) | Migrar para `ResponsiveTabs` | Req 4 |
| `client/src/pages/CommercialOverview.tsx` (linhas 501-506) | Migrar para `ResponsiveTabs` | Req 4 |
| `client/src/components/AppNavBar.tsx` (avatar, dropdown items) | Ajustar `w-8 h-8` → `w-11 h-11` mobile | Req 5 |
| `client/src/components/NotificationsPopover.tsx` | Ajustar padding do botão | Req 5 |
| `client/src/components/CommandPalette.tsx` (`command-palette-trigger`) | Ajustar padding do botão | Req 5 |
| `client/src/pages/Dashboard.tsx` (botões primários) | Ajustar `py` para atingir 44 px | Req 6 |
| `client/src/pages/CommercialOverview.tsx` ("+ Novo cliente") | Padding | Req 7 |
| `client/src/pages/ClientDetail.tsx` ("Voltar para Clientes") | Padding | Req 7 |
| Breadcrumbs / links `Comercial`, `Clientes` | `data-touch-target-exempt` | Req 8 |

Nenhum arquivo de teste da Fase 1 (`mobile-user-flow.spec.ts`,
`critical-pages-mobile.spec.ts`) é modificado — Req 9.2.

### Fluxo de validação

Para cada task:

```
1. Aplicar mudança pontual
2. npm run test (Vitest — deve continuar 1085/1085)
3. npx playwright test --grep "@fase1" --project=chromium-mobile
   → observar se o teste correspondente saiu de vermelho para verde
4. npx playwright test --project=chromium-desktop
   → observar que nenhum teste desktop regrediu
5. Commit isolado da task
```

Este loop é o principal contrato de qualidade da Fase 2. Cada
commit deve deixar o sistema em um estado válido.

## Components and Interfaces

### Novo componente: `ResponsiveTabs`

Arquivo: `client/src/components/ui/responsive-tabs.tsx`.

Envolve a primitiva `Tabs` de `@radix-ui/react-tabs` (já usada em
`client/src/components/ui/tabs.tsx`) e adiciona:

- **Altura mínima 44 px** em cada `TabsTrigger` — via `min-h-11`
  (Tailwind: 44 px).
- **Scroll horizontal automático** quando os labels somados
  ultrapassam a largura em mobile — mesmo comportamento hoje das
  implementações manuais (`overflow-x-auto`), mas centralizado.
- **Suporte a badge/contador** ao lado do label (padrão hoje em
  `ClientDetail`, ex.: `Projetos · 3`).

```ts
// client/src/components/ui/responsive-tabs.tsx

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

export interface ResponsiveTab {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface ResponsiveTabsProps {
  /** Lista das abas. */
  tabs: ResponsiveTab[];
  /** Valor da aba ativa (controlado). */
  value?: string;
  /** Valor default (uncontrolled). */
  defaultValue?: string;
  /** Callback ao trocar aba. */
  onValueChange?: (value: string) => void;
  /** Classes extras aplicadas no `TabsList`. */
  listClassName?: string;
  /** Classes extras aplicadas em cada `TabsTrigger`. */
  triggerClassName?: string;
  /** Conteúdo — pode incluir `<TabsContent value="...">` filhos. */
  children?: React.ReactNode;
}

/**
 * Tabs responsivos padronizados. Substitui as implementações manuais
 * espalhadas por AdminDashboard, ClientDetail, CommercialOverview.
 *
 * Garante:
 * - Altura mínima ≥ 44 px por trigger (WCAG 2.5.5 / Apple HIG)
 * - Scroll horizontal quando labels não cabem
 * - Suporte a contador via prop `count`
 *
 * Ver FASE_1_ACHADOS.md seção 8 (P1 item 4) para contexto.
 */
export function ResponsiveTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  listClassName,
  triggerClassName,
  children,
}: ResponsiveTabsProps) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={onValueChange}
      className="gap-0"
    >
      <TabsList
        className={[
          // altura: min-h-11 = 44 px (WCAG)
          "min-h-11 w-full justify-start overflow-x-auto scrollbar-none",
          "bg-transparent border-b border-frame-gray-3 rounded-none p-0 gap-0",
          listClassName ?? "",
        ].join(" ")}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={[
              // altura mínima: cada trigger também precisa ser >=44
              "min-h-11 px-4 py-2 rounded-none border-0 border-b-2 border-transparent",
              "data-[state=active]:border-frame-orange data-[state=active]:bg-transparent",
              "data-[state=active]:text-frame-orange text-frame-gray-light",
              "font-frame-mono text-[0.68rem] tracking-[0.12em] uppercase",
              "data-[state=active]:shadow-none whitespace-nowrap",
              triggerClassName ?? "",
            ].join(" ")}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="ml-2 text-frame-gray-muted normal-case tracking-normal">
                · {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
```

**Decisões de design do componente:**

- **Estilo herdado do `AdminDashboard`** (border-bottom, orange accent,
  font-frame-mono). Essa é a variante visual mais usada. Se
  `ClientDetail` e `CommercialOverview` tiverem variantes visuais
  distintas, sobrescrever via `triggerClassName` — mantém
  responsabilidade única do componente (altura + scroll) sem virar
  design system.
- **`min-h-11` na TabsList + `min-h-11` no TabsTrigger** — dupla
  garantia porque o Radix aplica `flex-1` no trigger, e a altura
  final vem do maior dos dois. Cinto e suspensório.
- **Não substitui `TabsContent`** — o consumidor continua usando
  `<TabsContent value="...">` como filho do `ResponsiveTabs`. Isso
  preserva a API do Radix e evita ter que envolver tudo.
- **Prop `count` opcional** — porque `ClientDetail` usa contadores
  (`Projetos · 3`), mas `AdminDashboard` não.

### Correção do WelcomeModal (Req 2)

Arquivo: `client/src/pages/Dashboard.tsx` linhas 129-135.

Estado atual:

```ts
useEffect(() => {
  loadProjects();
  const hasSeenWelcome = localStorage.getItem("cena-studio-welcome-completed");
  const hasSkippedWelcome = localStorage.getItem("cena-studio-welcome-dismissed");
  if (!hasSeenWelcome && !hasSkippedWelcome) {
    setTimeout(() => setIsWelcomeOpen(true), 500);
  }
  // ...
}, []);
```

O problema: o modal monta 500 ms depois com `position: fixed;
inset: 0; z-index: 9999` e intercepta cliques mesmo antes do usuário
interagir.

**Solução escolhida — Opção 2c dos requirements** (menos invasiva):
manter o modal, mas eliminar o `setTimeout` e garantir que o overlay
externo tenha `pointer-events: none` fora do card interno.

Implementação:

```ts
// Dashboard.tsx (linhas 129-135)
useEffect(() => {
  loadProjects();
  const hasSeenWelcome = localStorage.getItem("cena-studio-welcome-completed");
  const hasSkippedWelcome = localStorage.getItem("cena-studio-welcome-dismissed");
  // Não usa mais setTimeout — abre imediatamente ou não abre.
  // Se o dashboard vai renderizar o modal, o usuário verá antes de
  // qualquer interação estar disponível de forma que possa ser bloqueada.
  if (!hasSeenWelcome && !hasSkippedWelcome) {
    setIsWelcomeOpen(true);
  }
  // ...
}, []);
```

E em `WelcomeModal.tsx`, ajustar o container mais externo:

```tsx
// Antes (versão que intercepta cliques):
<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
  <div className="...card...">
    {/* conteúdo */}
  </div>
</div>

// Depois:
<div
  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
  aria-hidden={!isOpen}
>
  <div className="pointer-events-auto ...card...">
    {/* conteúdo */}
  </div>
</div>
```

Efeito: o overlay full-screen fica **transparente a pointer events**;
apenas o card com o conteúdo do modal recebe cliques. Fora do card,
os cliques passam direto para a página.

Observação: o `aria-hidden` continua sinalizando semanticamente que
tudo por trás está oculto (comportamento correto de modal), mas o
mecanismo de "bloqueio real" fica só no card. Isso permite fechar
"clicando fora" (comportamento comum) sem que TODO o dashboard fique
bloqueado até o modal fechar.

Se `WelcomeModal.tsx` implementa fechamento por click-fora via um
listener no overlay, esse listener precisa ser movido para um handler
diferente (ex.: adicionar backdrop **atrás** do card, com
`pointer-events: auto`, mas apenas parcialmente cobrindo). Ver seção
"Riscos" para decisão final.

**Alternativa mais segura ainda:** deixar como está e simplesmente
remover o `setTimeout` (abrir imediatamente). Com o modal aberto
imediatamente, o teste `mobile-user-flow` **já vai encontrar o botão
de fechar/pular** e conseguir prosseguir. O usuário real também
não perde 500 ms de "app já renderizado mas bloqueado" — vê o modal
desde o início e decide. Vou considerar isso na task e decidir com
base no snapshot atual do modal.

### Correção do marcador `/admin` (Req 3)

Arquivo: `tests/e2e/launch.spec.ts` linha 45.

Estado atual:

```ts
["/admin", /Gerenciar acessos|Manage access/i, "admin"],
```

Página real (`AdminDashboard.tsx` linha 208):

```tsx
<h1 className="frame-title text-2xl sm:text-3xl text-frame-white">
  {t("app.admin.administration")}
</h1>
```

O texto `Gerenciar acessos` não existe na página. O H1 renderiza
`Administração` (PT) ou `Administration` (EN) via i18n.

**Solução:** atualizar o teste para o marcador correto:

```ts
["/admin", /Administração|Administration/i, "admin"],
```

Esta é a **única alteração permitida** de teste na Fase 2, conforme
Req 3.2. Motivo: o teste está desatualizado — não há razão de
produto para reintroduzir "Gerenciar acessos".

O teste `critical-pages-mobile.spec.ts` linhas 175-177 também usa o
mesmo marcador antigo — atualizar junto.

### Correção do botão "Novo projeto" (Req 1)

Arquivo: `client/src/pages/Dashboard.tsx` linha 474.

Estado atual:

```ts
{
  icon: Plus,
  label: locale === "en" ? "New Job" : "Novo Job",
  sub: locale === "en" ? "Create project" : "Criar projeto",
  action: startProjectFromClient,
},
```

O accessible name renderizado do `<button>` acaba sendo
`"Novo Job Criar projeto"` (label + sub concatenados). Isso não bate
com o regex `/novo projeto|new project/i` do teste.

**Solução mínima:** renomear o label para `"Novo projeto"` (PT) e
`"New project"` (EN):

```ts
{
  icon: Plus,
  label: locale === "en" ? "New project" : "Novo projeto",
  sub: locale === "en" ? "Create project" : "Criar projeto",
  action: startProjectFromClient,
},
```

Efeito lateral positivo: `New project / Create project` (EN) e
`Novo projeto / Criar projeto` (PT) fazem mais sentido de UX que
`New Job / Create project` (a nomenclatura interna do time é "Job",
mas o usuário chama de "projeto" — o botão fica mais claro).

**Visibilidade em mobile:** o botão está dentro do card `Atalhos`,
que em mobile fica abaixo da fold do dashboard. O teste
`getByRole("button")` busca no DOM inteiro, não só no viewport
visível — portanto encontra assim que a página termina de renderizar.
Se a `assertMinTouchTargets` reportar que o botão tem menos de 44 px
de altura (é possível — cards de atalho usam `py` compacto), Req 6
resolve isso via padding maior no card.

### Correção dos touch targets do `AppNavBar` (Req 5)

Arquivo: `client/src/components/AppNavBar.tsx`.

Elementos afetados e a mudança necessária:

1. **Avatar (linha ~228, `w-8 h-8 rounded-full`)**: aumentar para
   `w-11 h-11`. O `<button>` container envolvendo o avatar
   herda o tamanho do círculo, então basta trocar as classes.

2. **Command palette trigger** (`client/src/components/CommandPalette.tsx`,
   classe `command-palette-trigger`): a classe é declarada no CSS
   global (`client/src/index.css` ou `styles/`). Adicionar `min-h-11
   min-w-11` na regra. Se a classe estiver definida inline em Tailwind,
   ajustar o padding.

3. **Notifications popover** (`client/src/components/NotificationsPopover.tsx`):
   ajustar o botão trigger para `min-h-11 min-w-11`.

4. **Logo/Brand button** ("Voltar ao painel", `AppNavBar.tsx` linha
   161-167): hoje envolve `<BrandLogo>` sem altura mínima. Adicionar
   `min-h-11` no botão.

5. **Locale switcher** (`LanguageSwitcher.tsx` compact): ajustar padding
   ou substituir por versão mais alta em mobile.

O menu button (hamburguer) já tem `h-11 w-11` explícito e não requer
mudança.

Mudança é **pontual** em cada arquivo, sem refatoração maior. Total
esperado: ~5 alterações de classe.

### Correção dos botões primários do dashboard (Req 6)

Arquivo: `client/src/pages/Dashboard.tsx`, botões dentro dos cards
"Job em foco" (`Completar briefing`) e itens do card "Pendências".

Os botões usam classes como `px-4 py-2.5` ou similar. Aumentar `py`
para `py-3` (12 px cada lado) — resulta em altura mínima de ~48 px
com line-height padrão. Alternativa: adicionar `min-h-11` explícito.

Escolha entre:

- **Opção A (recomendada):** adicionar `min-h-11` em cada botão
  específico. Preserva paddings visuais atuais em desktop.
- **Opção B:** aumentar `py` de todos os botões primários uniformly.
  Efeito colateral em desktop (~2 px a mais de altura), aceitável.

Design escolhe **Opção A** por preservar aparência desktop.

### Correção de botões pequenos (Req 7)

Arquivo: `client/src/pages/CommercialOverview.tsx` — "+ Novo cliente"
(hoje 16.55 × 100.3 px).
Arquivo: `client/src/pages/ClientDetail.tsx` — "Voltar para Clientes"
(hoje 16.95 × 168.69 px).

Ambos são hoje `<button>` com texto puro, sem padding. Adicionar
`min-h-11 px-3 py-2` mantém aparência (largura similar) e ganha
altura de toque.

### Decisão de breadcrumbs (Req 8)

Componentes afetados: os links `Comercial` e `Clientes` que aparecem
como breadcrumbs em `/proposals` e `/clients/:id`. Localizados via
grep dos nomes.

**Decisão:** **Opção B** — marcar com `data-touch-target-exempt`.

Justificativa:

- Breadcrumbs são navegação secundária/contextual, não ação primária.
- Adicionar padding suficiente para 44×44 quebra a hierarquia visual
  (breadcrumb fica do mesmo tamanho de um botão principal).
- WCAG 2.5.5 permite exceção para elementos de "inline text" que
  breadcrumbs são semanticamente próximos.
- O helper `assertMinTouchTargets` da Fase 1 já implementa suporte a
  `[data-touch-target-exempt]`.

Documentar a decisão em um arquivo de guidelines simples
(`docs/design-system/touch-targets.md` — a criar) para uso futuro.

## Data Models

Nenhum modelo novo de persistência. A Fase 2 é puramente frontend.

Os únicos "modelos" novos são as interfaces do `ResponsiveTabs`:

| Interface | Uso |
|---|---|
| `ResponsiveTab` | Definição de uma aba (value, label, count opcional, disabled opcional) |
| `ResponsiveTabsProps` | Props do componente ResponsiveTabs |

Ambas ficam em `client/src/components/ui/responsive-tabs.tsx`.

## Correctness Properties

### Property 1: Touch targets ≥ 44 px nas páginas críticas em mobile

**Validates: Requirements 4.3, 5.4, 6.1, 6.2, 7.1**

Todos os elementos interativos incluídos pelo `assertMinTouchTargets`
(button, [role="tab"], nav a, aside a, [role="menuitem"]) nas 5
páginas críticas em `chromium-mobile` DEVEM ter largura E altura
≥ 44 px, exceto os explicitamente marcados com
`data-touch-target-exempt` (breadcrumbs).

### Property 2: Zero regressão em desktop

**Validates: Requirements 10.1, 10.2, 9.5**

Todos os testes que passavam em `chromium-desktop` antes da Fase 2
DEVEM continuar passando após cada task. `expectNoHorizontalOverflow`
DEVE continuar verde em todas as páginas.

### Property 3: Onboarding modal não bloqueia interações fora do card

**Validates: Requirements 2.1, 2.2, 2.5**

O elemento overlay do `WelcomeModal` (o `<div>` full-screen com
`fixed inset-0 z-[9999]`) NÃO DEVE ter `pointer-events: auto` fora
da região do card do modal. Cliques em qualquer área da página fora
do card devem alcançar seu alvo original.

### Property 4: `--grep "@fase1"` retorna exit 0 ao fim da fase

**Validates: Requirements 9.1, 9.2**

`npx playwright test --grep "@fase1"` DEVE retornar exit 0 (todos os
testes @fase1 passando) quando a Fase 2 for declarada completa. Este
é o sinal binário de conclusão.

### Property 5: Vitest continua 1085/1085

**Validates: Requirements 9.4, 10.1**

`npm run test` DEVE retornar exit 0 (1085/1085 testes passando)
antes de cada commit da Fase 2. Nenhuma mudança de código pode
regredir testes unitários existentes.

### Property 6: Compatibilidade de API do `ResponsiveTabs`

**Validates: Requirements 4.2, 4.3**

O componente `ResponsiveTabs` DEVE aceitar todos os casos de uso
atuais das implementações manuais:
- Aba controlada (`value` + `onValueChange`) — usado em
  `AdminDashboard` e `CommercialOverview`.
- Aba uncontrolled (`defaultValue`) — usado em `ClientDetail`.
- Contador de itens ao lado do label — usado em `ClientDetail`.
- Cores/estados visuais compatíveis com o design system atual.

### Property 7: Idempotência da migração para `ResponsiveTabs`

**Validates: Requirements 4.3, 10.1**

Cada migração de página para `ResponsiveTabs` DEVE:
- Preservar o valor da aba ativa após reload.
- Preservar o comportamento de mudança de aba (mesmos handlers).
- Não introduzir divergência visual perceptível em desktop.

## Error Handling

### Erros de props inválidas em `ResponsiveTabs`

- Se `tabs` for array vazio: renderiza nada (comportamento silente,
  compatível com Radix).
- Se `value` não bate com nenhum `tabs[i].value`: Radix mostra
  nenhuma aba ativa (mesmo do que hoje). Aceitável.
- Se `count` for negativo ou `NaN`: renderizado como texto (`· NaN`).
  Não trata — responsabilidade do consumidor passar valor válido.

### Erros na migração de páginas

Se após substituir por `ResponsiveTabs`, algum estado de aba parar
de funcionar (ex.: `activeTab` ficar `undefined`):

- **Rollback local** — reverter a migração daquela página específica,
  manter as outras migradas. As tasks são independentes por página.
- Investigar e corrigir a incompatibilidade em `ResponsiveTabs`.

### Erros na correção do `WelcomeModal`

Se a mudança de `pointer-events` quebrar o comportamento de
"fechar clicando fora":

- **Rollback** — reverter para `pointer-events: auto` no overlay.
- Alternativa: mover o listener de click-fora para um backdrop
  separado do container principal.

### Falhas de teste durante a fase

Durante o desenvolvimento, é normal que alguns testes ainda estejam
vermelhos (a fase inteira é sobre corrigi-los). O critério de
"aprovado" para cada task é:

- **A task correspondente** ao teste passou de vermelho para verde.
- **Nenhum outro teste** que estava verde regrediu para vermelho.

## Testing Strategy

### Como validamos cada mudança

Após cada task:

```bash
# Vitest — deve continuar 1085/1085
npm run test

# Playwright — mede se o teste correspondente à task saiu de vermelho
npx playwright test --grep "@fase1" --project=chromium-mobile

# Suíte completa desktop — deve continuar como estava (2 falhas
# pré-existentes + resto verde)
npx playwright test --project=chromium-desktop
```

### Rota de validação da Property 3 (onboarding modal)

Não é possível validar via Playwright que "o overlay externo não
intercepta pointer events" diretamente — o Playwright já mostra isso
quando um click falha. A validação é:

1. Antes da correção: `mobile-user-flow` falha em algum ponto por
   causa do overlay (rodada Fase 1 confirmou).
2. Após a correção: **temporariamente remover `disableOnboarding`**
   do teste local (não commitar) e rodar. Se passa sem o helper, a
   Property 3 está atendida. Restaurar o helper e comitar.

### Testes unitários para `ResponsiveTabs`

Criar `client/src/test/responsive-tabs.test.tsx` com 3 casos
mínimos:

1. Renderiza N abas com labels e contadores.
2. Muda de aba ao clicar (uncontrolled).
3. Aceita `value` externo e chama `onValueChange` (controlled).

Total: ~30 linhas, cobertura suficiente. Não é responsabilidade da
Fase 2 testar o Radix por baixo.

### Métricas de sucesso da fase

| Métrica | Antes | Depois |
|---|---|---|
| `@fase1` passa | 1 / 6 | 6 / 6 |
| Suíte completa em ≤ 8 min | ✅ 2m 56s | ✅ mantido |
| Vitest 1085/1085 | ✅ | ✅ mantido |
| Achados P0/P1 em `FASE_1_ACHADOS.md` | 6 abertos | 0 abertos |

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `ResponsiveTabs` quebra design visual em uma das 3 páginas | Média | Média — regressão visual em desktop | Migrar uma página por vez, rodar suite completa após cada migração. Rollback local disponível. |
| Correção do `WelcomeModal` (pointer-events) quebra fechamento por click-fora | Baixa | Baixa — comportamento marginal | Testar manualmente com click no backdrop após correção. Rollback simples. |
| Renomear "Novo Job" → "Novo projeto" quebra outros lugares que dependem da string | Média | Baixa — é a label do botão, não uma key técnica | Grep exhaustivo por "Novo Job" e "New Job" antes de mudar. Buscar chaves de i18n. |
| Ajustar `w-8 h-8` do avatar mobile também mudar desktop | Baixa | Baixa — visual mais volumoso | Usar Tailwind responsivo (`h-8 w-8 md:h-11 md:w-11` invertido para mobile-only). Mas manter visualmente parecido. |
| Testes @fase1 continuam falhando após correções por outra razão | Média | Alta — Fase 2 não fecha | Cada task tem critério explícito (qual teste espera-se ver ficar verde). Se não ficar, investigar antes de seguir. |
| `command-palette-trigger` está definido em CSS global e outras páginas dependem | Baixa | Média — pode afetar desktop | Localizar a definição, verificar quem consome. Se for global, criar variante mobile via `@media`. |

## Ordem de implementação

Sequência recomendada de tasks (detalhes no `tasks.md`):

1. **Fase A — Correções focais (P0), paralelizável:**
   - Task 1: `/admin` marcador — atualizar 2 testes
   - Task 2: Renomear "Novo Job" → "Novo projeto"
   - Task 3: `WelcomeModal` — remover `setTimeout` + ajustar pointer-events

2. **Fase B — ResponsiveTabs + migrações (P1):**
   - Task 4: Criar `ResponsiveTabs` + teste unitário
   - Task 5: Migrar `AdminDashboard.tsx` (única sub-tarefa após criação)
   - Task 6: Migrar `ClientDetail.tsx`
   - Task 7: Migrar `CommercialOverview.tsx`

3. **Fase C — Touch targets do header e botões (P1/P2):**
   - Task 8: `AppNavBar` mobile — ajustar avatar, search, notifications, logo, locale
   - Task 9: Botões primários do dashboard — Completar briefing, Plano Studio, itens de Pendências
   - Task 10: Botões pequenos ("+ Novo cliente", "Voltar para Clientes")
   - Task 11: Breadcrumbs — `data-touch-target-exempt` + doc de guideline

4. **Fase D — Validação final:**
   - Task 12: Rodar suíte completa, confirmar `@fase1` verde + zero
     regressão. Atualizar `FASE_1_ACHADOS.md` marcando itens
     resolvidos + atualizar `PLANO-IDEAL-PROXIMOS-PASSOS.md` para
     Fase 2 concluída.

Tasks 1-3 podem rodar em paralelo (sub-agents diferentes, arquivos
diferentes). Task 4 precede 5-7. Tasks 5-7 podem rodar em paralelo
entre si. Tasks 8-11 podem rodar em paralelo. Task 12 é sequencial
no fim.

## O que fica de fora deste design (retomado do requirements)

- `PageShell` — primitivo de layout de página, mencionado no plano
  macro. Adiado para uma próxima fase (2.5 ou similar), depois de
  ver `ResponsiveTabs` estabilizar.
- Cobertura de touch target em páginas fora das 5 críticas.
- Migração do `AnalyticsPremium` para `ResponsiveTabs` (opcional
  desde requirements — sem sinal de problema hoje).
- Migração do `Documents.tsx` — não usa `TabsList`, não faz sentido
  migrar (confirmado no grep da Fase 1).
- Fail-on-console-error nos testes.
- Testes visuais/regressão de screenshot.
- Correção dos 2 testes pré-existentes do `launch.spec.ts` — se a
  Task 2 (renomear botão) resolver o `light theme` como efeito
  colateral, ótimo. Se não, fica para outra fase.
