# Implementation Plan

## Overview

Cada task cita os requirements que valida e as tasks das quais depende.
As dependências são mostradas explicitamente em `Depends on:` para
permitir execução em paralelo quando possível (ex.: tasks 1-5 podem
rodar em paralelo entre si).

## Tasks

### Fase A — Helpers de suporte (sem dependência entre si, paralelizável)

- [ ] 1. Criar `tests/e2e/support/console.ts`
  - Exporta `attachConsoleErrors(page: Page, testInfo: TestInfo): void`
  - Extrai o `beforeEach` de `tests/e2e/launch.spec.ts` linhas 33-42
    para uma função reutilizável.
  - Registra listeners `console` e `pageerror` em `page`.
  - Anexa o array `consoleErrors` como `test.info().attach("console-errors", ...)`
    ao final de cada teste (mesmo comportamento atual).
  - Comportamento: attachment apenas, não faz teste falhar (Req 5.3
    e "Fora de escopo" explícito nos requirements).
  - _Requirements: 5.3_
  - _Depends on: nenhuma_

- [ ] 2. Criar `tests/e2e/support/auth.ts`
  - Exporta `loginAsAdmin(page: Page): Promise<void>` e
    `expectLoggedIn(page: Page): Promise<void>`.
  - Encapsula a lógica das linhas 23-31 do `launch.spec.ts`.
  - Credenciais: `admin@cenastudio.com.br / admin123` (fixas, mesmo
    valor do teste atual).
  - Aguarda `expect(page).toHaveURL(/\/admin/)` — sem `waitForTimeout`.
  - Suporta chamada em qualquer estado (com ou sem sessão prévia):
    se já logado, deve terminar em `/admin` sem erro.
  - _Requirements: 1.1, 5.4_
  - _Property: 7 (Idempotência do login)_
  - _Depends on: nenhuma_

- [ ] 3. Criar `tests/e2e/support/mobile.ts`
  - Exporta:
    - `isMobileProject(): boolean` — lê `test.info().project.name` e
      retorna `.includes("mobile")`.
    - `openMobileNavIfPresent(page: Page): Promise<boolean>` — tenta
      abrir menu mobile via padrões conhecidos:
      1. `[data-testid="mobile-nav-trigger"]` (preferido, se existir).
      2. `[aria-label*="menu" i]:not([disabled])`.
      3. `button[aria-controls*="nav"]`.
      Retorna `true` se conseguiu abrir, `false` caso contrário.
    - `scrollTabIntoView(page: Page, tabName: string | RegExp)` — usa
      `page.locator('[role="tab"]', { hasText: tabName })
       .scrollIntoViewIfNeeded()`.
  - Sobre `data-testid="mobile-nav-trigger"`: se na Task 8 (ou 9)
    detectarmos que os padrões 2 e 3 não pegam o menu real do app,
    a task correspondente vai adicionar `data-testid="mobile-nav-trigger"`
    no componente de menu mobile do `AppNavBar.tsx` (ou equivalente).
    Autorizado nesta fase — é a única mudança de código de produção
    permitida na Fase 1, e apenas se necessária.
  - _Requirements: 2.3_
  - _Depends on: nenhuma_

### Fase B — Helpers de camada superior (dependem da Fase A)

- [ ] 4. Criar `tests/e2e/support/factories.ts`
  - Exporta as interfaces `TestClient`, `TestProject` (conforme
    definidas na seção "Data Models" do design).
  - Exporta:
    - `createClientViaApi(page, overrides?): Promise<TestClient>`
      - Chama `POST /api/clients` com defaults (`name`, `company`,
        `status: "active"`) + sufixo `Date.now()`, mescla `overrides`.
      - Retorna `{ id, name, company }` extraídos da resposta.
      - Falha explícito se HTTP != 2xx (lança Error com corpo da
        resposta).
    - `createProjectViaApi(page, clientId, overrides?): Promise<TestProject>`
      - Chama `POST /api/projects` com `clientId`, `name` gerado com
        sufixo `Date.now()`, mescla `overrides`.
      - Falha explícito se HTTP != 2xx.
    - `cleanupTestData(page, { projects?, clients? }): Promise<void>`
      - Ordem: primeiro deleta projetos, depois clientes (FK).
      - Cada `page.request.delete` num `try/catch` interno.
      - Falhas individuais → `console.warn` com formato
        `[cleanup] falhou ao deletar project ${id}: ${msg}`.
      - Nunca re-lança — cleanup não pode mascarar falha do teste.
  - _Requirements: 1.3, 1.5_
  - _Properties: 3 (Cleanup não mascara), 4 (Ordem de deleção)_
  - _Depends on: nenhuma_

- [ ] 5. Criar `tests/e2e/support/touchTarget.ts`
  - Exporta a interface `TouchTargetViolation` (design, Data Models).
  - Exporta `assertMinTouchTargets(page, options?): Promise<void>`.
  - Implementação via `page.evaluate`:
    1. Coleta elementos de `button:not([disabled])`, `[role="tab"]`,
       `nav a`, `aside a`, `[role="menuitem"]`.
    2. Filtra fora: `[data-touch-target-exempt]`, descendentes de
       `<footer>`, ícones close em `[role="dialog"]` (aria-label
       casando `/close|fechar|x/i`).
    3. Filtra elementos não visíveis: `width > 0 && height > 0 &&
       visibility !== "hidden" && display !== "none"`.
    4. Para cada elemento restante, mede `getBoundingClientRect()`.
       Coleta violação se `width < min || height < min`.
    5. Retorna array `TouchTargetViolation[]`.
  - Fora do `evaluate`, formata mensagem no padrão da seção "Formato
    da mensagem de erro" do design.
  - Assertion final: `expect(violations, message).toHaveLength(0)`.
  - Aceita `options.min` (default 44), `additionalExcludeSelectors`,
    `onlyWithinSelector`.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  - _Depends on: nenhuma_

### Fase C — Reformar e adicionar specs (depende da Fase A e B)

- [ ] 6. Editar `tests/e2e/launch.spec.ts` para remover `test.skip(mobile)` e usar helpers
  - Remover a linha 105 (`test.skip(test.info().project.name.includes("mobile"), ...)`).
  - Substituir login inline (linhas 23-31 e chamadas de
    `loginAsAdmin(page)` locais) por `import { loginAsAdmin } from "./support/auth"`.
  - Substituir o `beforeEach` de console (linhas 33-42) por
    `attachConsoleErrors(page, testInfo)`.
  - No teste `light theme project dialog`: substituir criação/deleção
    inline de cliente pelo helper `createClientViaApi` +
    `cleanupTestData`.
  - No teste `client, project and studio workflow`:
    a. Substituir criação inline por `createClientViaApi` +
       `createProjectViaApi` com `overrides` para os campos extras
       (segment, tax_id, address, city, state, metadataJson).
    b. Remover as duas assertions de category label
       (`"Comercial primeiro"` e `"// Pré-produção"`) — são
       `hidden lg:block`, invisíveis em mobile por design.
    c. Manter a assertion dos 9 workflow labels
       (`"1 Briefing Inteligente"`, ..., `"5 Checklist de Set"`) —
       continuam visíveis em mobile.
    d. Manter `expectNoHorizontalOverflow` no fim (Req 4.4).
    e. Substituir cleanup inline pelo helper `cleanupTestData`.
  - Critério de sucesso: `npx playwright test tests/e2e/launch.spec.ts`
    passa em ambos os projects (`chromium-desktop` e `chromium-mobile`).
    Se falhar em mobile no fluxo do studio, é sinal legítimo pra Fase 2
    — o teste deve falhar explícito apontando o que está
    inalcançável, não pular.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1_
  - _Depends on: 1, 2, 4_

- [ ] 7. Criar `tests/e2e/mobile-user-flow.spec.ts` — fluxo completo em mobile
  - Estrutura: `test.describe("@fase1 mobile user flow", () => { ... })`.
  - `test.skip(!isMobileProject(), "Fase 1 é sobre uso mobile real")`
    no describe.
  - `test.beforeEach`: `attachConsoleErrors(page, testInfo)`.
  - Um único teste com o título `@fase1 usuário mobile cria
    projeto, edita e persiste após reload`:
    1. `loginAsAdmin(page)`.
    2. Setup: `createClientViaApi(page)` — cliente é pré-condição,
       não é foco do teste.
    3. `try { ... } finally { cleanupTestData(...) }` em volta do
       corpo principal.
    4. Passo 1 (UI): navegar para `/dashboard`, abrir menu se
       necessário, clicar `"Novo projeto"` ou equivalente.
    5. Passo 2 (UI): preencher formulário do modal (nome do projeto,
       selecionar cliente criado pelo factory), submit, aguardar toast
       de sucesso `sonner` ou fechamento do modal.
    6. Passo 3 (UI): capturar `projectId` da URL após redirect (ou de
       resposta interceptada) — guardar em `createdProjects` para
       cleanup.
    7. Passo 4 (UI): já em `/project/:id`, localizar um campo
       persistível (nome do projeto ou descrição — decidido durante a
       task ao inspecionar a página). Editar valor. Se página não
       tiver campo editável simples, falhar explícito com mensagem:
       `"nenhum campo persistível encontrado em /project/:id — Fase 2 precisa expor um"`.
    8. Passo 5 (UI): clicar botão salvar, aguardar toast de sucesso.
    9. Passo 6: `page.reload()`.
    10. Passo 7 (assertion): confirmar que o campo mostra o valor
       novo, via `expect(input).toHaveValue(...)` ou
       `expect(text).toBeVisible()`.
  - Timeout: primeiro tentar timeout global (45s). Se estourar, adicionar
    `test.setTimeout(90_000)` com comentário `// TODO(fase-2): reduzir
    latência de criação de projeto` (Req 6.3).
  - Critério de sucesso: teste roda em `chromium-mobile` e passa
    (ou falha com mensagem clara indicando trabalho de Fase 2).
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _Properties: 1, 2, 3_
  - _Depends on: 1, 2, 3, 4_

- [ ] 8. Criar `tests/e2e/critical-pages-mobile.spec.ts` — Req 2 + Req 3
  - Estrutura: `test.describe("@fase1 critical pages on mobile", () => { ... })`.
  - `test.skip(!isMobileProject(), "Fase 1 mobile-only")`.
  - `test.beforeEach`: `attachConsoleErrors` + `loginAsAdmin`.
  - 5 testes, um por página crítica:
    1. `"@fase1 dashboard: carrega e navegação principal responde"`
       - Navega para `/dashboard`, aguarda marcador visível.
       - Se `openMobileNavIfPresent` retornar `true`, clica em link
         principal (ex.: comercial), valida navegação, volta.
       - Se retornar `false`, valida um comportamento alternativo
         (ex.: clicar num card do dashboard).
       - `assertMinTouchTargets(page)`.
    2. `"@fase1 commercial: troca entre subrotas"`
       - Navega para `/commercial`.
       - Via `CommercialNav`, muda para `/clients`, valida marcador.
       - Muda para `/pipeline`, valida marcador.
       - Muda para `/proposals`, valida marcador.
       - `assertMinTouchTargets(page)` no `/proposals`.
    3. `"@fase1 client detail: troca de abas mostra conteúdo no viewport"`
       - Setup: `createClientViaApi(page)`.
       - `try { ... } finally { cleanupTestData(...) }`.
       - Navega para `/clients/:id`.
       - Localiza o `TabsList` de `ClientDetail.tsx`.
       - Troca da aba atual (`Projetos`) para uma segunda aba
         (`Contatos` ou próxima disponível), usando
         `scrollTabIntoView` se necessário.
       - Valida que o painel da aba nova está
         `expect(panel).toBeInViewport()` (Req 2.2).
       - `assertMinTouchTargets(page)`.
    4. `"@fase1 admin dashboard: troca de abas mostra conteúdo no viewport"`
       - Navega para `/admin`.
       - Troca entre duas abas do `AdminDashboard.tsx`.
       - Valida `toBeInViewport`.
       - `assertMinTouchTargets(page)`.
    5. `"@fase1 project hub: carrega e ações primárias respondem"`
       - Setup: `createClientViaApi` + `createProjectViaApi`.
       - Navega para `/project/:id`.
       - Valida marcador de conteúdo do projeto.
       - Executa uma ação primária (ex.: abrir briefing via botão ou
         link visível), valida navegação.
       - `assertMinTouchTargets(page)`.
       - Cleanup no `finally`.
  - Critério de sucesso: cada teste roda de forma isolada. É
    aceitável (e esperado) que alguns falhem em touch target — as
    falhas alimentam a Task 10 (`FASE_1_ACHADOS.md`). Cada teste tem
    sua própria falha, isolada, apontando exatamente onde a Fase 2
    precisa atuar.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.4, 3.5_
  - _Properties: 1, 2, 3, 6_
  - _Depends on: 1, 2, 3, 4, 5_

### Fase D — Validação e documentação

- [ ] 9. Rodar suíte completa `chromium-mobile` e coletar resultados
  - Executar `npx playwright test --project=chromium-mobile --grep "@fase1"`
    duas vezes seguidas (validação de determinismo — Property 1).
  - Executar também `npx playwright test` (suíte completa em ambos os
    projects) uma vez, para verificar Req 6.1 (≤ 8 min).
  - Capturar:
    - Duração total.
    - Testes que passaram.
    - Testes que falharam, com:
      - nome do teste,
      - trecho da mensagem de erro,
      - lista de touch target violations (se aplicável).
  - Se algum teste for flaky (passa numa execução, falha na outra),
    é bug do teste — corrigir na própria task e re-rodar até
    determinismo estar OK.
  - Se algum teste da Task 8 falhar por touch target, isso não é
    bug — é sinal esperado e vai alimentar a Task 10.
  - Resultado esperado: relatório em texto simples anexado à conclusão
    da task, para virar input da Task 10.
  - _Requirements: 3.5, 5.1, 5.4, 6.1, 6.2_
  - _Depends on: 6, 7, 8_

- [ ] 10. Criar `FASE_1_ACHADOS.md` na raiz do repo
  - Documento em Português, formato Markdown, com:
    - Sumário: quantos testes rodaram, quantos passaram, quantos
      falharam por categoria.
    - Achados de touch target: lista de elementos < 44px
      encontrados, agrupados por página. Para cada:
      - Página onde ocorreu.
      - Texto/aria-label do elemento (rastreável via grep).
      - Dimensões medidas.
      - Sugestão de qual componente investigar
        (ex.: `client/src/pages/ClientDetail.tsx` linha 369 se o
        elemento for um TabsTrigger dessa página).
    - Achados de fluxo mobile: se algum passo do fluxo do Req 1
      não foi possível (ex.: campo editável não encontrado, botão
      salvar inalcançável), documentar aqui.
    - Achados de sidebar mobile (Req 4): se a assertion de mobile
      falhou, o quê exatamente não estava alcançável.
    - Recomendações para Fase 2: lista priorizada do que a Fase 2
      precisa consertar — baseada exclusivamente nos achados.
  - Este documento é entrada explícita da Fase 2 e é referenciado
    pelo `PLANO-IDEAL-PROXIMOS-PASSOS.md` como saída da Fase 1.
  - Se nenhum teste falhar (cenário improvável dado o design
    atual), o documento existe assim mesmo e diz explicitamente:
    "Fase 1 não encontrou passivo — Fase 2 pode focar em consolidação
    de layout (ResponsiveTabs, PageShell) em vez de correção reativa".
  - _Requirements: 3.5, 5.2_
  - _Depends on: 9_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "4", "5"],
      "description": "Helpers de suporte independentes — podem rodar em paralelo"
    },
    {
      "wave": 2,
      "tasks": ["6", "7", "8"],
      "description": "Specs consomem os helpers da wave 1 — paralelos entre si"
    },
    {
      "wave": 3,
      "tasks": ["9"],
      "description": "Rodada completa da suíte para coletar resultados"
    },
    {
      "wave": 4,
      "tasks": ["10"],
      "description": "Documentação dos achados (entrada da Fase 2)"
    }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": ["1", "2", "4"],
    "7": ["1", "2", "3", "4"],
    "8": ["1", "2", "3", "4", "5"],
    "9": ["6", "7", "8"],
    "10": ["9"]
  }
}
```

Legenda em texto:

- **Wave 1 (tasks 1-5)**: helpers de suporte, sem dependência entre si.
  Podem rodar em paralelo (até 5 sub-agents simultaneamente).
- **Wave 2 (tasks 6-8)**: specs que consomem os helpers. Paralelos
  entre si.
- **Wave 3 (task 9)**: rodada completa da suíte para coletar resultados.
- **Wave 4 (task 10)**: documento `FASE_1_ACHADOS.md` a partir dos
  resultados.

## Notes

### Paralelismo natural

Tasks 1, 2, 3, 4 e 5 podem ser executadas simultaneamente (não têm
dependência entre si). Tasks 6, 7 e 8 podem ser executadas
simultaneamente após as 5 primeiras.

### Bloqueadores possíveis

Se a Task 3 detectar que o menu mobile do app não é alcançável por
nenhum dos 3 seletores propostos, avaliar dentro da task adicionar
`data-testid="mobile-nav-trigger"` ao componente correspondente
(permitido — ver design).

### Suíte verde ou vermelha?

A suíte pode legitimamente terminar vermelha na Task 9. Isso não
bloqueia a Task 10. A Task 10 documenta o que ficou vermelho — essa
é a entrega da fase.

### Referências

- Design: [`design.md`](./design.md)
- Requirements: [`requirements.md`](./requirements.md)
- Plano macro: [`../../../PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md)
