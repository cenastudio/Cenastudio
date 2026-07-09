# Design Document

## Overview

Este design implementa os 6 requirements do
[`requirements.md`](./requirements.md) através de:

1. Uma nova pasta `tests/e2e/support/` com helpers reutilizáveis (login,
   factories de cliente/projeto, assertions de touch target, utilidades
   mobile).
2. Dois novos arquivos de spec em `tests/e2e/` cobrindo,
   respectivamente, fluxo completo (Req 1) e páginas críticas + touch
   target (Req 2 + 3). O `launch.spec.ts` existente é editado apenas
   para remover o `test.skip(mobile)` e reaproveitar helpers (Req 4).
3. Convenção de tag `@fase1` nos títulos dos testes novos para permitir
   `--grep "@fase1"` (Req 6.2).
4. Zero mudança no `playwright.config.ts` — os projetos
   `chromium-desktop` e `chromium-mobile` já existem, `retain-on-failure`
   já está ligado, e o webServer local já sobe com `DATABASE_URL=`
   (SQLite) para testes.

Nenhuma alteração de produção (código do app, tokens, componentes) é
feita na Fase 1. Se os testes revelarem quebras reais em mobile
(touch target < 44px, aba escondida atrás de scroll, botão que não
persiste), isso vira input para a Fase 2 — o teste **fica vermelho
propositalmente** apontando o defeito.

## Architecture

### Onde os testes vivem

```
tests/e2e/
├── support/                          ← novo, helpers compartilhados
│   ├── auth.ts                       ← loginAsAdmin, expectLoggedIn
│   ├── factories.ts                  ← createClientViaApi, createProjectViaApi, cleanup
│   ├── touchTarget.ts                ← assertMinTouchTargets helper
│   ├── mobile.ts                     ← openMobileNav, isMobileProject, scrollTabIntoView
│   └── console.ts                    ← attachConsoleErrors (extraído do beforeEach atual)
├── launch.spec.ts                    ← EDITADO: remove skip mobile, reusa support/
├── mobile-user-flow.spec.ts          ← novo, Req 1
└── critical-pages-mobile.spec.ts     ← novo, Req 2 + Req 3
```

### Por que separar em três arquivos

- `launch.spec.ts` mantém o papel original: smoke test amplo, rápido,
  cobre desktop e mobile no mesmo teste. É editado só o suficiente para
  atender Req 4.
- `mobile-user-flow.spec.ts` isola o fluxo end-to-end de tarefa
  completa (Req 1). Um único teste comprido, com muito setup/teardown,
  fica visualmente separado dos testes mais rápidos.
- `critical-pages-mobile.spec.ts` roda uma matriz de 5 páginas × 2
  validações (comportamento + touch target). Manter tudo em um só
  arquivo permite compartilhar o `beforeEach` de login.

### Convenção de tag

Todos os testes novos incluem `@fase1` no título:

```ts
test("@fase1 usuário mobile cria projeto, edita e persiste após reload", ...);
```

- Rodar só a Fase 1: `npx playwright test --grep "@fase1"`.
- Rodar tudo (Fase 1 + smoke): sem flag adicional.

### Estratégia de projeto (desktop vs mobile)

Cada arquivo declara explicitamente onde roda:

- `mobile-user-flow.spec.ts`:
  `test.skip(!isMobileProject(), "Fase 1 é sobre uso mobile real")`
  no `describe`. Roda **só em mobile**.
- `critical-pages-mobile.spec.ts`: mesmo padrão, só mobile.
- `launch.spec.ts`: continua rodando em ambos os projetos, como hoje.

Rodar apenas o mobile localmente:
`npx playwright test --project=chromium-mobile`.

### Fluxo de execução de um teste típico

```
┌─ test.beforeEach ─────────────────────────────────┐
│  attachConsoleErrors(page, testInfo)              │
│  loginAsAdmin(page)                               │
└───────────────────────────────────────────────────┘
                 │
                 ▼
┌─ test body ───────────────────────────────────────┐
│  const client = await createClientViaApi(page);   │
│  const created: TestProject[] = [];               │
│  try {                                             │
│    // 1. UI actions (goto, click, fill, save)     │
│    // 2. assertions (visible, toBeInViewport)     │
│    // 3. assertMinTouchTargets(page)              │
│  } finally {                                       │
│    await cleanupTestData(page, {                  │
│      projects: created, clients: [client]         │
│    });                                             │
│  }                                                 │
└───────────────────────────────────────────────────┘
```

## Components and Interfaces

### `support/auth.ts`

Encapsula o login inline que hoje mora em `launch.spec.ts` (linhas
23-31). Uma única fonte de verdade para credenciais e para o texto
do botão de entrada, e deixa o corpo dos testes focado em asserção.

```ts
export async function loginAsAdmin(page: Page): Promise<void>
export async function expectLoggedIn(page: Page): Promise<void>
```

O `loginAsAdmin` usa `admin@cenastudio.com.br / admin123` (mesmas
credenciais do launch atual) e aguarda `await expect(page).toHaveURL(/\/admin/)`
sem `waitForTimeout`.

### `support/factories.ts`

Encapsula os patterns de criação/deleção que hoje estão espalhados em
`launch.spec.ts` (linhas 74-90 e 125-160). Sufixo `Date.now()`
centralizado — cada chamada gera nome único automaticamente.

```ts
export interface TestClient  { id: string; name: string; company: string }
export interface TestProject { id: string; clientId: string; name: string }

export async function createClientViaApi(
  page: Page,
  overrides?: Partial<Omit<TestClient, "id">>
): Promise<TestClient>

export async function createProjectViaApi(
  page: Page,
  clientId: string,
  overrides?: Partial<Omit<TestProject, "id" | "clientId">>
): Promise<TestProject>

export async function cleanupTestData(
  page: Page,
  data: { projects?: TestProject[]; clients?: TestClient[] }
): Promise<void>
```

**Trade-off deliberado:** as factories criam **via API**
(`page.request.post`), não via UI. Isso viola parcialmente o espírito
do Req 1.2 ("interações via UI"). Justificativa:

- Testar "criar cliente via UI" é responsabilidade de um teste
  dedicado. Se um dia existir, roda separado do teste de fluxo end-to-end.
- Usar factory API para *pré-condições* do teste principal é padrão
  aceito em Playwright — evita que teste do fluxo A quebre porque a UI
  do fluxo B (criar cliente) teve regressão. Testes independentes,
  falhas isoladas.
- No teste específico do Req 1, o `criar projeto` é feito **via UI**;
  o `criar cliente` (pré-condição) é feito via factory. Isso equilibra
  cobertura de UI com determinismo.

### `support/touchTarget.ts`

Helper central para o Req 3. Usa `page.evaluate` com
`getBoundingClientRect()` em vez de `locator.boundingBox()` iterativo
(mais rápido: uma round-trip em vez de N; menos flaky).

```ts
export interface TouchTargetViolation {
  selector: string
  text: string
  width: number
  height: number
  pageUrl: string
}

export async function assertMinTouchTargets(
  page: Page,
  options?: {
    min?: number                       // default 44
    additionalExcludeSelectors?: string[]
    onlyWithinSelector?: string        // limita escopo, ex.: "main"
  }
): Promise<void>
```

**Comportamento:**

1. Dentro de `page.evaluate`, encontra elementos que casam com o
   conjunto **incluído** (Req 3.2):
   - `button:not([disabled])`
   - `[role="tab"]`
   - `nav a`
   - `aside a`
   - `[role="menuitem"]`
2. Filtra **excluídos** (Req 3.3):
   - `[data-touch-target-exempt]`
   - Descendentes de `footer`
   - Dentro de `[role="dialog"]` com aria-label contendo
     `close`/`fechar`/`x` (case-insensitive).
3. Só considera elementos visíveis:
   `width > 0 && height > 0 && getComputedStyle(el).visibility !== "hidden"
   && display !== "none"`.
4. Coleta violações e retorna do `evaluate`.
5. Fora do `evaluate`, agrega em mensagem legível e chama
   `expect(violations, formatMessage(violations)).toHaveLength(0)`.

**Formato da mensagem de erro** (Req 3.4 e 5.2):

```
[touch target < 44px] em /clients/abc123
  - "Salvar" (BUTTON): 88 x 32
  - "[role=tab]: Projetos" : 128 x 36
  - "Fechar cliente" (nav > a): 40 x 40

Elementos que falharam podem ser localizados via:
  grep -r "Salvar" client/src
  grep -r "Projetos" client/src
```

**Sobre "path do arquivo do componente"** (Req 5.2): não é factível
derivar automaticamente a partir do DOM em runtime — o React não expõe
o path de origem em produção. A mitigação é incluir o texto exato e
sugerir `grep`. Cada texto visível é rastreável por busca em ≤ 5s.

### `support/mobile.ts`

Utilidades específicas para o comportamento mobile.

```ts
export function isMobileProject(): boolean
export async function openMobileNavIfPresent(page: Page): Promise<boolean>
export async function scrollTabIntoView(
  page: Page,
  tabName: string | RegExp
): Promise<void>
```

- `isMobileProject()`: lê `test.info().project.name` e retorna se
  contém `"mobile"`. Mesmo padrão do skip atual, extraído para helper.
- `openMobileNavIfPresent()`: procura por menu hamburguer via padrões
  conhecidos (`[aria-label*="menu"]`, `button[aria-controls*="nav"]`,
  ou `[data-testid="mobile-nav-trigger"]`). Se encontrar, clica.
  Retorna `true` se abriu, `false` se não achou.
- `scrollTabIntoView()`: usa
  `page.locator('[role="tab"]', { hasText: tabName })
   .scrollIntoViewIfNeeded()`. Atende Req 2.3.

### `support/console.ts`

Extrai o `page.on("console", …)` do `beforeEach` atual do
`launch.spec.ts` para função reutilizável, mantendo comportamento
(Req 5.3).

```ts
export function attachConsoleErrors(page: Page, testInfo: TestInfo): void
```

Todos os specs (incluindo o `launch.spec.ts` editado) chamam essa
função no `beforeEach`.

### Spec files

#### `mobile-user-flow.spec.ts` (Req 1)

Único teste, fluxo profundo. Estrutura:

```ts
test.describe("@fase1 mobile user flow", () => {
  test.skip(!isMobileProject(), "Fase 1 é sobre uso mobile real");

  test.beforeEach(async ({ page }, testInfo) => {
    attachConsoleErrors(page, testInfo);
  });

  test("cria cliente, cria projeto via UI, edita, salva, reload, persiste", async ({ page }) => {
    await loginAsAdmin(page);
    const client = await createClientViaApi(page);
    const createdProjects: TestProject[] = [];

    try {
      // Passo 1: navegar ao dashboard e criar projeto via UI (modal)
      // Passo 2: capturar projectId, abrir /project/:id
      // Passo 3: editar campo persistível (nome ou descrição do projeto)
      // Passo 4: salvar via UI, aguardar toast de sucesso (sonner)
      // Passo 5: page.reload(), confirmar que o valor persiste
    } finally {
      await cleanupTestData(page, {
        projects: createdProjects, clients: [client]
      });
    }
  });
});
```

**Detalhes de decisão:**

- **Campo persistível editado**: nome do projeto ou descrição/briefing
  na página `/project/:id`. Decidido durante a task com base no que
  estiver acessível sem depender de subsistemas (IA, upload). Se
  nenhum campo simples existir, o teste falha explícito (Fase 2 corrige).
- **Criação de projeto via UI**: única etapa do fluxo que passa pelo
  formulário/modal real. O overhead (~5-10s em mobile) é justificado —
  é o coração do que "uso real" significa.
- **Sinal de "salvou"**: o app usa `sonner`. O teste aguarda o toast
  antes do reload. Se o toast for flaky, aguarda diretamente o campo
  assumir o valor esperado após reload (mais determinístico).

#### `critical-pages-mobile.spec.ts` (Req 2 + Req 3)

**Um teste por página crítica**, cada um executa asserção de
comportamento (Req 2) + touch target (Req 3). Falhas ficam localizadas.

```ts
test.describe("@fase1 critical pages on mobile", () => {
  test.skip(!isMobileProject(), "Fase 1 mobile-only");

  test.beforeEach(async ({ page }, testInfo) => {
    attachConsoleErrors(page, testInfo);
    await loginAsAdmin(page);
  });

  test("dashboard: carrega e navegação principal responde", async ({ page }) => { ... });
  test("commercial: troca entre subrotas", async ({ page }) => { ... });
  test("client detail: troca de abas mostra conteúdo no viewport", async ({ page }) => { ... });
  test("admin dashboard: troca de abas mostra conteúdo no viewport", async ({ page }) => { ... });
  test("project hub: carrega e ações primárias respondem", async ({ page }) => { ... });
});
```

**Sobre falhas propositais (Req 3.5):**

É provável que `assertMinTouchTargets` falhe em uma ou mais páginas —
o `TabsTrigger` em `ClientDetail.tsx` usa `text-[0.65rem] px-5 py-2.5`
(linhas 369-388), o que provavelmente dá altura < 44px. Isso é
**esperado**.

Duas opções de gerenciamento:

- **Opção A (recomendada):** teste falha vermelho, e no final da
  entrega geramos `FASE_1_ACHADOS.md` documentando o passivo.
- **Opção B:** marcar violações conhecidas com `test.fail()` +
  comentário "Fase 2 corrige". Suite fica verde e a lista fica dentro
  do próprio teste.

Design assume **Opção A**. Se preferir Opção B, inversão simples nas
tasks.

#### `launch.spec.ts` (edição, Req 4)

Mudanças mínimas:

1. Remove `test.skip(test.info().project.name.includes("mobile"), ...)`
   da linha 105.
2. Substitui login inline por `await loginAsAdmin(page)`.
3. Substitui setup/cleanup inline por factory + `cleanupTestData`.
4. Substitui o `beforeEach` de console por `attachConsoleErrors`.
5. Adapta as asserções que dependem de layout desktop no teste
   `client, project and studio workflow`:

   ```ts
   // ANTES (falhava em mobile):
   await expect(page.locator(".studio-sidebar").getByText("Comercial primeiro")).toBeVisible();
   await expect(page.locator(".studio-sidebar").getByText("// Pré-produção")).toBeVisible();

   // DEPOIS (achado do design):
   // Os category labels são `hidden lg:block` em ToolSidebar.tsx —
   // invisíveis em mobile por design.
   // Assertion adaptada: valida os TOOL labels (que continuam visíveis).
   const workflowLabels = await page.locator(".studio-sidebar .studio-tool-nav")
     .evaluateAll((nodes) => ...);
   expect(workflowLabels).toEqual([
     "1 Briefing Inteligente", "2 Orçamento Automático", "3 Proposta Comercial",
     "4 Contratos", "1 Gerador de Roteiro", "2 Decupagem Técnica",
     "3 Callsheet Inteligente", "4 Cronograma", "5 Checklist de Set",
   ]);
   ```

   Mantém a lista de 9 workflow labels (Req 4.2c), remove as
   asserções de category labels que são desktop-only.

6. `expectNoHorizontalOverflow` permanece no final (Req 4.4).

## Data Models

Não há persistência de dados novos. Os únicos "modelos" são estruturas
in-memory usadas pelos helpers de teste:

### `TestClient`

Representa um cliente criado no banco de teste durante a execução.

| Campo | Tipo | Fonte | Uso |
|---|---|---|---|
| `id` | string | resposta do `POST /api/clients` | referência para `DELETE` no cleanup |
| `name` | string | passado no `overrides` ou gerado (`Cliente Fase1 ${Date.now()}`) | busca via UI, asserções |
| `company` | string | passado no `overrides` ou derivado do `name` | asserções em `/clients/:id` |

### `TestProject`

Representa um projeto criado no banco de teste.

| Campo | Tipo | Fonte | Uso |
|---|---|---|---|
| `id` | string | resposta do `POST /api/projects` OU da UI (extraído da URL após criação) | navegação para `/project/:id`, cleanup |
| `clientId` | string | passado explicitamente ou lido da resposta | vínculo para asserções |
| `name` | string | gerado com sufixo `Date.now()` | asserções, cleanup manual se necessário |

### `TouchTargetViolation`

Estrutura in-memory retornada de `page.evaluate` no `assertMinTouchTargets`.

| Campo | Tipo | Uso |
|---|---|---|
| `selector` | string | Selector CSS do elemento (ex.: `button.frame-btn`) |
| `text` | string | Texto visível ou aria-label do elemento — pista para `grep` no repo |
| `width` | number | Largura em CSS pixels |
| `height` | number | Altura em CSS pixels |
| `pageUrl` | string | URL onde a violação foi detectada |

Nenhum desses modelos é persistido além do tempo de vida do teste.

## Correctness Properties

Propriedades que os testes devem manter para serem confiáveis.

### Property 1: Determinismo

**Validates: Requirements 6.3, 3.6**

Rodar a suíte duas vezes seguidas produz o mesmo resultado (mesmos
passes, mesmas falhas). Sem `waitForTimeout` fixo. Todas as esperas
são explícitas via `expect(locator).toBeVisible()` ou equivalente.

### Property 2: Isolamento entre testes

**Validates: Requirements 6.4, 1.5**

Nenhum teste depende de estado deixado por outro. Cada teste cria
dados com sufixo `Date.now()` único e remove no `finally`. Executáveis
em paralelo sem colisão.

### Property 3: Cleanup não mascara falha

**Validates: Requirements 1.3, 1.4**

Se o teste principal falhar, o cleanup ainda roda (via `try/finally`),
mas erros individuais do cleanup são engolidos e logados via
`console.warn` — nunca re-lançados como falha do teste.

### Property 4: Ordem de deleção correta

**Validates: Requirements 1.3, 1.5**

`cleanupTestData` deleta projetos antes de clientes, para respeitar
constraints de FK do banco.

### Property 5: Ausência de estado global

**Validates: Requirements 6.4, 6.1**

Nenhum helper mantém module-level state. Cada função recebe `page`
explicitamente. Isso permite execução paralela do Playwright sem
efeitos cruzados.

### Property 6: Falhas apontam para código

**Validates: Requirements 5.2, 3.4**

Cada assertion inclui contexto suficiente para localizar o componente
responsável — texto visível, aria-label, ou selector — para que o
desenvolvedor da Fase 2 não precise reexecutar.

### Property 7: Idempotência do login

**Validates: Requirements 1.1, 5.4**

`loginAsAdmin` é seguro para chamar em qualquer estado (com ou sem
sessão prévia); redireciona sempre para `/admin` no fim.

## Error Handling

### Erros de setup (login, factory)

- Se `loginAsAdmin` falhar (form não encontrado, credenciais
  inválidas, timeout de navegação), o teste falha imediatamente com
  erro do Playwright — não há retry silencioso.
- Se `createClientViaApi` receber HTTP != 2xx, lança erro com o
  payload da resposta. Testes que rodam em CI sem servidor irão falhar
  com mensagem clara.

### Erros no fluxo principal do teste

- Assertions do Playwright já falham com trace/screenshot/vídeo
  anexados (Req 5.1).
- O `try/finally` garante que `cleanupTestData` roda mesmo em falha.

### Erros de cleanup

- `cleanupTestData` roda `page.request.delete` para cada item, cada
  um num `try/catch` interno.
- Falhas individuais são logadas via `console.warn` com formato:
  `[cleanup] falhou ao deletar project ${id}: ${errorMessage}`.
- Nunca re-lança. Cleanup falho **não pode** mascarar falha do teste
  principal (Req 1.3).

### Erros de assertion de touch target

- A mensagem de erro é construída para ser scaneável (uma violação por
  linha, dimensões visíveis).
- Se a lista for muito longa (> 30 violações numa mesma página),
  considerar restringir escopo do assert com
  `onlyWithinSelector: "main"` para focar em conteúdo principal. Isso
  é decisão da task, não do design.

### Erros de console durante testes

- `attachConsoleErrors` continua sendo attachment (Req 5.3), não
  causa falha automática. Fail-on-console-error está explicitamente
  fora de escopo (requirements, seção "Fora de escopo").

## Testing Strategy

### Como testamos os testes

O código de teste não tem testes unitários próprios. A validação da
qualidade dos testes se dá por:

1. **Execução dupla** (Correctness Property 1): rodar `npm run test:e2e
   -- --project=chromium-mobile --grep "@fase1"` duas vezes seguidas e
   confirmar que os resultados são idênticos. Se algum teste flakear,
   é bug no teste.
2. **Execução paralela** (Correctness Property 5): rodar com `--workers=4`
   e confirmar que os testes não colidem entre si.
3. **Falha proposital**: introduzir um `expect(false).toBe(true)` num
   teste, confirmar que o trace/screenshot/vídeo é anexado
   corretamente (validação do Req 5).

### Como testamos os helpers

Os helpers (`support/*.ts`) são exercitados pelos próprios specs. Não
haverá testes unitários para eles, mas cada função tem uma superfície
pequena e cobertura implícita alta (chamados por múltiplos testes).

### Cobertura pretendida ao fim da Fase 1

| Área | Cobertura |
|---|---|
| Login/auth | Testado indiretamente por todo `beforeEach` |
| Criação de cliente (via API) | Todos os testes que usam factory |
| Criação de projeto (via UI) | `mobile-user-flow.spec.ts` |
| Persistência após reload | `mobile-user-flow.spec.ts` |
| Navegação por abas em mobile | `critical-pages-mobile.spec.ts` (3 testes com Tabs) |
| Touch target 44×44 | `critical-pages-mobile.spec.ts` (5 páginas) |
| Fluxo cliente→projeto→studio em mobile | `launch.spec.ts` (após remoção do skip) |
| Ausência de horizontal overflow | `launch.spec.ts` (preservado) |

### Métricas de sucesso

- Suíte completa `chromium-mobile` roda em ≤ 8 min (Req 6.1).
- Testes rodam de forma idêntica em 2 execuções seguidas.
- Falhas descobertas de touch target são catalogadas em
  `FASE_1_ACHADOS.md` para input da Fase 2.

## Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Menu mobile hamburger não é reconhecido pelos padrões de `openMobileNavIfPresent` | Média | Testes de Req 2 quebram sem apontar problema real | Na primeira execução, se detectarmos que o padrão não pega o menu real, adicionamos `data-testid="mobile-nav-trigger"` no componente correspondente (mudança pequena, aceitável nesta fase) |
| `assertMinTouchTargets` falha em muitos elementos, gerando output ilegível | Alta (na primeira rodada) | Difícil priorizar Fase 2 | Agrupar violações por página no output, e gerar `FASE_1_ACHADOS.md`. Se lista for > 30 elementos, restringir escopo com `onlyWithinSelector: "main"` para focar em conteúdo principal antes de navegação |
| Toast de "salvo" com timing variável, flakiness no reload do Req 1 | Média | Teste inconsistente | Usar `expect(toast).toBeVisible()` **antes** do reload, com timeout explícito. Se ainda flaky, aguardar o próprio input assumir o valor persistido (mais determinístico) |
| Cleanup de cliente falha porque projeto ainda está referenciado | Baixa | Warnings no output, sem bloqueio | Ordem correta: `deletar projetos primeiro, depois cliente`. Documentado em `cleanupTestData` |
| Testes em paralelo colidem no `admin@cenastudio.com.br` (mesmo usuário) | Baixa | Login roda concorrente | Aceitável — Playwright isola browser context, JWT em cookie próprio por contexto. Se flakiness surgir, migrar para pool de usuários dedicado (fora do escopo Fase 1) |
| Suite total > 8min localmente | Média | Não passa Req 6.1 | Se estourar, marcar `mobile-user-flow.spec.ts` como `test.slow()` e/ou aumentar workers explicitamente. Medir antes de otimizar |

## O que fica de fora deste design (retomado do requirements)

- Correção do que os testes revelarem em `assertMinTouchTargets` — Fase 2.
- Fail-on-console-error como condição de sucesso dos testes.
- Testes visuais (regressão de screenshot).
- Cobertura de acessibilidade além de touch target.

## Ordem sugerida de implementação

1. `support/console.ts`, `support/auth.ts`, `support/factories.ts`,
   `support/mobile.ts` (dependências primeiro).
2. `support/touchTarget.ts`.
3. Edição do `launch.spec.ts` para usar os helpers e remover o skip.
4. `mobile-user-flow.spec.ts`.
5. `critical-pages-mobile.spec.ts`.
6. Rodada completa + `FASE_1_ACHADOS.md`.

Detalhamento e granularidade das tasks vai no `tasks.md`.
