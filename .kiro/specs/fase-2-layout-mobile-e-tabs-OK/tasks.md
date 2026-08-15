# Implementation Plan

## Overview

12 tasks em 4 fases sequenciais. Tasks dentro de cada fase (exceto D)
são paralelizáveis. Cada task cita os requirements que valida, quais
testes `@fase1` devem sair de vermelho para verde, e as dependências.

## Tasks

### Fase A — Correções focais P0 (paralelizáveis)

- [x] 1. Atualizar marcador de `/admin` nos testes
  - Editar `tests/e2e/launch.spec.ts` linha 45:
    de `/Gerenciar acessos|Manage access/i` para `/Administração|Administration/i`.
  - Editar `tests/e2e/critical-pages-mobile.spec.ts` linhas 175-177 com
    o mesmo marcador atualizado.
  - Rodar `npx playwright test --grep "critical authenticated" --project=chromium-desktop`
    → esperado: teste passa.
  - Rodar `npx playwright test --grep "admin dashboard" --project=chromium-mobile`
    → esperado: teste chega à parte de abas (pode ainda falhar por
    touch target, mas o marcador não é mais o bloqueio).
  - _Requirements: 3.1, 3.2, 3.3_
  - _Depends on: nenhuma_
  - _Justificativa: única exceção permitida de alteração de teste na Fase 2 (Req 3.2)._

- [x] 2. Renomear "Novo Job" → "Novo projeto" no dashboard
  - Editar `client/src/pages/Dashboard.tsx` linha 474: label
    `"Novo Job"` → `"Novo projeto"`, EN: `"New Job"` → `"New project"`.
  - Fazer grep por outras ocorrências de `"Novo Job"` / `"New Job"` no
    codebase inteiro. Se encontrar em i18n (`translations*.ts`),
    verificar caso a caso — só renomear se for a mesma ação (criar
    projeto). Se for algo diferente (ex.: título de página de listing),
    NÃO mudar.
  - Se a mudança introduzir string em translations, atualizar ambos os
    locales (PT e EN).
  - Rodar `npm run test` → esperado: 1085/1085 continua passando.
  - Rodar `npx playwright test tests/e2e/launch.spec.ts --grep "light theme"`
    → observar se passa agora (efeito colateral positivo esperado).
  - _Requirements: 1.1, 1.2, 1.5_
  - _Depends on: nenhuma_

- [x] 3. Corrigir `WelcomeModal` — remover setTimeout e ajustar pointer-events
  - Editar `client/src/pages/Dashboard.tsx` linhas 129-135: remover
    `setTimeout(() => setIsWelcomeOpen(true), 500)`. Chamar
    `setIsWelcomeOpen(true)` direto.
  - Editar `client/src/components/onboarding/WelcomeModal.tsx`:
    - No `<div>` externo (aquele com `fixed inset-0 z-[9999]`),
      adicionar `pointer-events-none`.
    - No card interno do modal, adicionar `pointer-events-auto`.
    - Se o modal tem listener de "click no backdrop fecha" no elemento
      externo, mover o listener para um elemento intermediário com
      `pointer-events: auto` que cubra o backdrop mas não intercepte
      cliques da página abaixo. Se essa mudança quebrar o
      comportamento, ROLLBACK apenas do pointer-events e manter só a
      remoção do setTimeout.
  - Rodar `npm run test` → esperado: 1085/1085 continua passando.
  - Rodar `npx playwright test --grep "@fase1 dashboard"` **removendo
    temporariamente** `await disableOnboarding(page)` do
    `tests/e2e/support/auth.ts` (não commitar). Se passar, a correção
    de pointer-events funcionou. **Restaurar** o helper antes do commit.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Depends on: nenhuma_

### Fase B — ResponsiveTabs + migrações

- [x] 4. Criar componente `ResponsiveTabs` + teste unitário
  - Criar `client/src/components/ui/responsive-tabs.tsx` conforme
    especificação exata da seção "Components and Interfaces" do
    design.md.
  - API exportada:
    - `interface ResponsiveTab { value, label, count?, disabled? }`
    - `interface ResponsiveTabsProps { tabs, value?, defaultValue?, onValueChange?, listClassName?, triggerClassName?, children? }`
    - `function ResponsiveTabs(props: ResponsiveTabsProps)`
  - Envolver a primitiva `Tabs`/`TabsList`/`TabsTrigger` do
    `./tabs.tsx` (não da Radix diretamente).
  - Aplicar `min-h-11` (44 px) na `TabsList` e em cada `TabsTrigger`.
  - Suportar `overflow-x-auto` no `TabsList` (para scroll horizontal
    em mobile).
  - JSDoc que referencia `FASE_1_ACHADOS.md` seção 8 P1 item 4.
  - Criar `client/src/test/responsive-tabs.test.tsx` com 3 casos:
    1. Renderiza N abas com labels e contadores.
    2. Muda de aba ao clicar (uncontrolled com defaultValue).
    3. Aceita `value` externo e chama `onValueChange` (controlled).
  - Rodar `npm run test` — esperado: 1088/1088 (as 3 novas passam).
  - _Requirements: 4.1, 4.2_
  - _Depends on: nenhuma_

- [x] 5. Migrar `AdminDashboard.tsx` para `ResponsiveTabs`
  - Editar `client/src/pages/AdminDashboard.tsx` linhas 222-241:
    substituir o bloco `<Tabs>/<TabsList>/<TabsTrigger>` manual pelo
    `<ResponsiveTabs tabs={[...]} value={activeTab} onValueChange={setActiveTab}>`.
  - Manter os `<TabsContent value="overview">`, `<TabsContent value="users">`,
    `<TabsContent value="tools">` como filhos.
  - Preservar behavior: `useState` de `activeTab`, transições de aba,
    conteúdo de cada aba.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 admin dashboard"
    --project=chromium-mobile` → esperado: passa verde.
  - Rodar `npx playwright test tests/e2e/launch.spec.ts --project=chromium-desktop`
    → esperado: sem regressão.
  - _Requirements: 4.3, 4.4_
  - _Depends on: 1, 4_

- [x] 6. Migrar `ClientDetail.tsx` para `ResponsiveTabs`
  - Editar `client/src/pages/ClientDetail.tsx` linhas 367-389:
    substituir o `<Tabs defaultValue="projects">/<TabsList>` manual
    por `<ResponsiveTabs tabs={[...]} defaultValue="projects">`.
  - Aproveitar o `count` do componente para renderizar `Projetos · N`
    em vez de concatenar manualmente. Ex.:
    `{ value: "projects", label: "Projetos", count: projects.length }`.
  - Manter os `<TabsContent>` filhos como estão.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 client detail"
    --project=chromium-mobile` → esperado: passa verde.
  - _Requirements: 4.3, 4.4_
  - _Depends on: 4_

- [x] 7. Migrar `CommercialOverview.tsx` para `ResponsiveTabs`
  - Editar `client/src/pages/CommercialOverview.tsx` linhas 501-506:
    substituir o bloco de tabs manual pelo `<ResponsiveTabs tabs={[...]} value={activeTab} onValueChange={setActiveTab}>`.
  - Manter os `<TabsContent>` filhos como estão (linhas 508+).
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 commercial"
    --project=chromium-mobile` → esperado: o teste chega até a
    `assertMinTouchTargets`. Se as tabs migradas passam mas outros
    elementos ainda violam 44×44, a task só é considerada completa
    quando a Task 8 (AppNavBar) também estiver pronta.
  - _Requirements: 4.3, 4.4_
  - _Depends on: 4_

### Fase C — Touch targets do header e botões (paralelizáveis após B)

- [x] 8. Ajustar touch targets do `AppNavBar` mobile
  - Editar `client/src/components/AppNavBar.tsx`:
    - **Avatar** (linha ~228, `w-8 h-8 rounded-full`): trocar para
      `w-11 h-11 rounded-full` — em qualquer viewport (o círculo fica
      um pouco maior em desktop também, aceito).
    - **Botão "Voltar ao painel"** (linhas 161-167, envolve
      `<BrandLogo compact>`): adicionar `min-h-11` no `<button>`.
  - Editar `client/src/components/NotificationsPopover.tsx`: localizar
    o botão trigger, adicionar `min-h-11 min-w-11` ou padding
    equivalente.
  - Editar `client/src/components/CommandPalette.tsx` (classe
    `command-palette-trigger`): localizar onde a classe é definida (CSS
    global em `client/src/index.css` ou similar). Adicionar `min-h-11
    min-w-11` na regra. Se estiver inline em Tailwind, ajustar direto.
  - Editar `client/src/components/LanguageSwitcher.tsx` variante
    `compact`: garantir altura mínima >= 44 px no botão trigger.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 dashboard"
    --project=chromium-mobile` → esperado: menos violações no output.
    Se sobrarem elementos NÃO cobertos por essa task, documentar quais
    e verificar se são Task 9 ou 10.
  - Rodar `npx playwright test --project=chromium-desktop` → sem
    regressão visual.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Depends on: 4_

- [x] 9. Ajustar touch targets dos botões primários do dashboard
  - Editar `client/src/pages/Dashboard.tsx`:
    - Botão "Completar briefing" e outros CTAs primários dos cards
      "Job em foco" e "Pendências" — adicionar `min-h-11` no
      `className`.
    - Botão "Plano Studio" (se renderizado no dashboard) — mesmo
      ajuste.
    - Botões dentro do card "Atalhos" — mesmo ajuste; garantir que o
      "Novo projeto" (renomeado na Task 2) atende 44 x 44.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 dashboard"
    --project=chromium-mobile` → esperado: se a Task 8 já estiver
    pronta, o teste passa verde. Se não, o output do
    `assertMinTouchTargets` deve mostrar apenas violações do header
    (Task 8).
  - _Requirements: 6.1, 6.2, 6.3_
  - _Depends on: 2, 4_

- [x] 10. Ajustar botões pequenos "+ Novo cliente" e "Voltar para Clientes"
  - Editar `client/src/pages/CommercialOverview.tsx`: localizar botão
    `+ Novo cliente` (grep "Novo cliente" ou similar) e adicionar
    `min-h-11 px-3 py-2` no `className`.
  - Editar `client/src/pages/ClientDetail.tsx`: localizar link/botão
    "Voltar para Clientes" e aplicar o mesmo ajuste.
  - Verificar se são renderizados dentro de um componente de layout
    compartilhado — se sim, ajustar no componente. Se não, ajustar
    inline.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 commercial\|@fase1 client detail"
    --project=chromium-mobile` → esperado: violações desses elementos
    desaparecem do output.
  - _Requirements: 7.1, 7.2, 7.3_
  - _Depends on: nenhuma_

- [x] 11. Marcar breadcrumbs com `data-touch-target-exempt` + doc
  - Grep por `"Comercial"` e `"Clientes"` como links de navegação no
    `client/src/components/` (provavelmente algum componente de
    breadcrumb ou header contextual). Identificar o componente.
  - Adicionar atributo `data-touch-target-exempt` no `<a>` ou
    `<button>` renderizado.
  - Criar `docs/design-system/touch-targets.md` com:
    - Regra geral: elementos interativos ≥ 44 × 44 px (WCAG 2.5.5).
    - Exceção documentada: breadcrumbs — motivos + como aplicar
      (`data-touch-target-exempt`).
    - Referência a `FASE_1_ACHADOS.md` como origem da decisão.
    - Formato Markdown simples, ~30 linhas.
  - Rodar `npm run test` → 1088/1088.
  - Rodar `npx playwright test --grep "@fase1 client detail"
    --project=chromium-mobile` → esperado: violações dos links
    "Comercial" e "Clientes" desaparecem do output.
  - _Requirements: 8.1, 8.2, 8.3_
  - _Depends on: nenhuma_

### Fase D — Validação final

- [x] 12. Rodar suíte completa, atualizar docs de acompanhamento
  - Rodar `npm run test` → esperado: 1088/1088 (Vitest continua verde).
  - Rodar `npx playwright test --grep "@fase1" --project=chromium-mobile`
    → esperado: **6 passing** (todos os testes `@fase1`).
  - Rodar `npx playwright test` (suíte completa) → esperado:
    - Todos os testes desktop que passavam antes continuam passando.
    - `client, project and studio workflow` continua verde em
      mobile.
    - Tempo total ≤ 8 min (Req 9.3 / Req 6.1 da Fase 1).
  - Se algum teste `@fase1` falhar, investigar antes de encerrar a
    Fase 2.
  - Atualizar `FASE_1_ACHADOS.md`: marcar os 6 achados P0/P1 como
    resolvidos, indicando a task correspondente que resolveu.
  - Atualizar `PLANO-IDEAL-PROXIMOS-PASSOS.md`: marcar Fase 2 como
    concluída, adicionar linha resumindo o que ficou pronto.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2_
  - _Depends on: 1, 2, 3, 5, 6, 7, 8, 9, 10, 11_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "4", "10", "11"],
      "description": "Correções P0 (1, 2, 3), componente ResponsiveTabs (4), botões pequenos e breadcrumbs (10, 11) — todas independentes"
    },
    {
      "wave": 2,
      "tasks": ["5", "6", "7", "8", "9"],
      "description": "Migrações que dependem do ResponsiveTabs (5, 6, 7) + ajustes de header e dashboard (8, 9)"
    },
    {
      "wave": 3,
      "tasks": ["12"],
      "description": "Validação final da suite e atualização de docs"
    }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": ["1", "4"],
    "6": ["4"],
    "7": ["4"],
    "8": ["4"],
    "9": ["2", "4"],
    "10": [],
    "11": [],
    "12": ["1", "2", "3", "5", "6", "7", "8", "9", "10", "11"]
  }
}
```

Legenda em texto:

- **Wave 1 (6 tasks paralelas)**: tudo que não depende de nada — 3
  correções P0, criação do `ResponsiveTabs`, botões pequenos,
  breadcrumbs.
- **Wave 2 (5 tasks paralelas)**: tudo que depende do
  `ResponsiveTabs` (migrações 5, 6, 7) + touch targets do header (8)
  e do dashboard (9).
- **Wave 3 (1 task)**: validação final e docs.

Total: 12 tasks, ~3 waves. Com `MAX_CONCURRENT_SUBAGENTS=5`, Wave 1
roda em 2 rodadas (5+1), Wave 2 em 1 rodada, Wave 3 em 1 rodada.

## Notes

### Regra "sem regressão" de facto

Cada task tem passo explícito "rodar Vitest → 1088/1088" (ou 1085
antes da Task 4 criar 3 testes novos). Isso é o guarda-corpo contra
regressão silenciosa.

### Rollback local por task

Como cada task é localizada em um arquivo (ou pequeno grupo), é fácil
reverter uma task sem desfazer as outras. Se a Task 6 (migração
`ClientDetail`) quebrar, revertemos apenas ela — as outras migrações
continuam. Isso é intencional no design.

### Sobre `data-touch-target-exempt`

O atributo é lido pelo helper `assertMinTouchTargets` de
`tests/e2e/support/touchTarget.ts` linha ~35, na lista de
`excludeSelectors`. Aplicar em `<a data-touch-target-exempt>` é
suficiente — não requer código novo no helper.

### Sobre o teste unitário do `ResponsiveTabs`

Se o app usa `vitest` + `@testing-library/react` (buscar no
`client/src/test/*` para confirmar padrão), seguir o mesmo padrão.
Sem novos setup files ou config.

## Referências

- Design: [`design.md`](./design.md)
- Requirements: [`requirements.md`](./requirements.md)
- Achados da Fase 1: [`../../../FASE_1_ACHADOS.md`](../../../FASE_1_ACHADOS.md)
- Plano macro: [`../../../PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md)
