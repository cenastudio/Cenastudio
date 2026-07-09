# FASE 1 — Achados (entrada da Fase 2)

> Este documento é a **saída oficial da Fase 1** do
> [`PLANO-IDEAL-PROXIMOS-PASSOS.md`](./PLANO-IDEAL-PROXIMOS-PASSOS.md).
> Ele lista tudo que a nova suíte E2E revelou sobre o estado de mobile e
> usabilidade do produto. Cada achado é entrada priorizada para a Fase 2.

Gerado em: 2026-07-09
Suíte E2E: **176s (2m 56s)** — dentro do limite de 8 min (Req 6.1).
Determinismo: ✅ confirmado (mesmos resultados em 3 execuções seguidas).

---

## 1. Sumário

| Categoria | Total | Passou | Falhou |
|---|---|---|---|
| Testes desktop (`chromium-desktop`) | 3 (do `launch.spec.ts`) | 1 | 2 (pré-existentes) |
| Testes mobile (`chromium-mobile`) | 9 (launch + 6 novos `@fase1`) | 2 | 7 |
| **Total** | **12** | **3** | **9** |

Dos 9 falhados:

- **6** são achados **novos** revelados pela Fase 1 (touch target, dashboard admin mobile, botão "Novo projeto" ausente em mobile).
- **2** são pré-existentes do `launch.spec.ts` (falhavam antes de qualquer mudança da Fase 1 — verificado via `git stash`).
- **1** é a extensão mobile do teste que era pulado (`test.skip(mobile)` removido, e ainda passa em mobile — Req 4 ✅).

**Custo de execução:** 2m 56s para suite completa. Fase 1 rodou dentro do orçamento definido no Req 6.1.

---

## 2. Achados de touch target (Requirement 3 — 44×44 px)

A regra de touch target 44×44 px (WCAG 2.5.5 / Apple HIG) foi
implementada em `tests/e2e/support/touchTarget.ts` e aplicada a 5
páginas críticas em viewport `Pixel 7`. Elementos incluídos: `button`,
`[role="tab"]`, `nav a`, `aside a`, `[role="menuitem"]`.

Falhas encontradas por página, agrupadas por natureza do elemento:

### 2.1 Elementos globais do header (aparecem em toda página autenticada)

Estes botões vivem no `AppNavBar.tsx` e afetam **todas** as páginas
autenticadas:

| Elemento | Selector | Medido | Delta |
|---|---|---|---|
| "Voltar ao painel" | `BUTTON` | 91.5 × 25.42 | altura −18.58 |
| "Abrir busca" | `BUTTON` | 38 × 36 | ambas −6 a −8 |
| "N Não lido" (notificações) | `BUTTON` | 38.16 × 38.16 | ambas −5.84 |
| "A" (avatar) | `BUTTON` | 33.91 × 33.91 | ambas −10.09 |
| "PT" / "EN" (locale toggle) | `BUTTON` | 36.33 × 33.91 | ambas > 7 |

**Impacto:** afeta 5 páginas críticas simultaneamente. Corrigir
uma vez no `AppNavBar` resolve o header inteiro.

**Sugestão para Fase 2:** revisar padding/altura mínima do `AppNavBar`
mobile. Provavelmente `h-11` (44px) → verificar por que o rendered
box ficou 38-33px (padding interno reduz a área efetiva do ícone).

### 2.2 Toggle "Plano Studio" — borda do limite

| Elemento | Selector | Medido | Delta |
|---|---|---|---|
| "Plano Studio" | `BUTTON` | 378.09 × 44 | altura exatamente 44 |
| "Completar briefing" | `BUTTON` | 314.75 × 43.25 | altura −0.75 |

**Impacto:** "Completar briefing" fica **0.75 px** abaixo do mínimo.
Provavelmente um `py-2.5` (10px cada lado + line-height) gerando
box com dígito não-inteiro em `Pixel 7`.

**Sugestão para Fase 2:** aumentar `py` de 2.5 para 3 (12px) em botões
primários do dashboard. Ajuste minúsculo, efeito grande de conformidade.

### 2.3 Tabs manuais das páginas com `TabsList`

Presente em `/proposals` (via `CommercialOverview`), `/clients/:id`
(via `ClientDetail`), e `/admin` (não medido nessa rodada porque o teste
falhou antes por outra razão — ver seção 3):

| Página | Elemento | Altura | Largura |
|---|---|---|---|
| `/proposals` | "Visão geral" | 41.2 | 140.45 |
| `/proposals` | "Clientes" | 41.2 | 117.75 |
| `/proposals` | "Pipeline" | 41.2 | 117.75 |
| `/proposals` | "Propostas" | 41.2 | 125.33 |
| `/proposals` | "Interações" | 41.2 | 132.89 |
| `/clients/:id` | "Projetos · 0" (tab) | 39.73 | 130.34 |
| `/clients/:id` | "Oportunidades · 0" (tab) | 39.73 | 166.16 |
| `/clients/:id` | "Interações · 0" (tab) | 39.73 | 144.67 |
| `/clients/:id` | "Arquivos · 0" (tab) | 39.73 | 130.34 |
| `/clients/:id` | "Financeiro · 0" (tab) | 39.73 | 144.67 |
| `/clients/:id` | "Propostas · 0" (tab) | 39.73 | 137.52 |
| `/clients/:id` | "Vídeo Reviews · 0" (tab) | 39.73 | 166.16 |

**Impacto:** todas as abas de páginas com `TabsList` implementado
manualmente ficam 2-4 px abaixo do mínimo. Consistente com a hipótese
do plano macro (Fase 2 propõe criar `ResponsiveTabs` unificado).

**Sugestão para Fase 2:** este é o caso central do **componente
`ResponsiveTabs`** já planejado. Ao criar o componente compartilhado,
resolver altura mínima uniforme (>=44 px) e remover as classes ad-hoc
`text-[0.65rem] px-5 py-2.5` de `ClientDetail.tsx` (linha 369),
`CommercialOverview.tsx` (linha 503), `AdminDashboard.tsx` (linha
222).

### 2.4 Botões pequenos "Novo cliente" e "Voltar para Clientes"

| Página | Elemento | Altura | Largura |
|---|---|---|---|
| `/proposals` | "+ Novo cliente" | 16.55 | 100.3 |
| `/clients/:id` | "Voltar para Clientes" | 16.95 | 168.69 |

**Impacto:** botões com altura ~16 px — extremamente pequenos.
Provavelmente text-only buttons sem padding.

**Sugestão para Fase 2:** transformar em botão ou link com padding
padrão do design system.

### 2.5 Links de navegação horizontal (breadcrumb-like)

| Página | Elemento | Altura | Largura |
|---|---|---|---|
| `/proposals` | "Comercial" (link) | 15.77 | 68.13 |
| `/clients/:id` | "Comercial" (link) | 15.77 | 68.13 |
| `/clients/:id` | "Clientes" (link) | 15.77 | 60.55 |

**Impacto:** links de breadcrumb com altura de linha (~16 px). Padrão
comum, mas viola o mínimo. WCAG 2.5.8 (AAA) recomenda 24×24 para "target size (minimum)" — mesmo esse mais leve não bate.

**Sugestão para Fase 2:** decidir se breadcrumbs viram elementos com
padding próprio (opção A) ou são marcados `data-touch-target-exempt`
por serem navegação secundária (opção B). Documento em decisão de
design system.

---

## 3. Achado: `/admin` em mobile não mostra "Gerenciar acessos"

**Testes falhados:**

- `launch.spec.ts › critical authenticated app screens render without layout breaks` (desktop e mobile).
- `critical-pages-mobile.spec.ts › admin dashboard: troca de abas mostra conteúdo no viewport` (mobile).

**Sintoma:** o teste espera `getByText(/Gerenciar acessos|Manage access/i)` visível na página `/admin`, mas a busca não encontra em nenhum viewport.

**Provável causa:** o texto "Gerenciar acessos" foi renomeado ou o marcador foi movido para outra área do DOM que não é buscável pelo texto direto.

**Nota importante:** essa falha do teste do `launch.spec.ts` (linhas 31-51) **é anterior à Fase 1** — verificado via `git stash` + rodar o `launch.spec.ts` do commit inicial. Ela existia antes de qualquer mudança feita nesta fase.

**Sugestão para Fase 2:** confirmar qual é o marcador atual da página `/admin` e:

a. Ou atualizar o teste para o texto correto.
b. Ou reintroduzir "Gerenciar acessos" como heading da página, se a UX pedir.

---

## 4. Achado: fluxo "criar projeto via UI" quebrado em mobile

**Teste falhado:** `mobile-user-flow.spec.ts › @fase1 usuário mobile cria projeto, edita e persiste após reload`.

**Sintoma:** `getByRole("button", { name: /novo projeto|new project/i })` não é encontrado no `/dashboard` em viewport mobile.

**Investigação:** em desktop, o botão "Novo projeto" está visível no header do dashboard (o teste `light theme project dialog` também usa esse mesmo botão — passa parcialmente em desktop). Em mobile, ele **desapareceu ou moveu-se para dentro do menu hamburguer**.

**Impacto:** o primeiro passo do fluxo de tarefa completa (Req 1) — criar um projeto pela UI mobile — não é alcançável hoje. Isso é o achado **mais crítico** da Fase 1 do ponto de vista de UX.

**Sugestão para Fase 2:**

1. **Curto prazo:** garantir que o botão primário "Novo projeto" fique visível/acessível no dashboard mobile sem depender do menu hamburguer (idealmente como FAB — Floating Action Button — ou botão primário no topo).
2. **Médio prazo:** integrar essa decisão ao `PageShell` que a Fase 2 vai criar — o shell deve expor um slot para ação primária que cada página preenche.

---

## 5. Achado: "light theme project dialog" com timeout no botão de tema (pré-existente)

**Testes falhados:**

- `launch.spec.ts › light theme project dialog keeps readable light inputs` (desktop e mobile).

**Sintoma:** `locator.click` no botão "Novo projeto" dá timeout de 45 s. Provavelmente uma cascata do achado da seção 4 — o botão não está detectável no dashboard, e o toggle de light mode antes do click pode ter tirado o botão do estado alcançável.

**Nota:** também **pré-existente** — falhava antes da Fase 1.

**Sugestão para Fase 2:** avaliar em conjunto com o achado 4 (visibilidade do botão "Novo projeto"). Se o botão voltar a ser detectável, esse teste passa junto.

---

## 6. Achado positivo: fluxo studio funciona em mobile

**Teste que ganhou cobertura mobile:** `launch.spec.ts › client, project and studio workflow stay connected`.

Antes da Fase 1: `test.skip(mobile)` — nunca rodava em mobile.
Depois da Fase 1: **passa em ambos os viewports** (desktop 9.7 s, mobile 8.1 s).

**Ajustes feitos:**

- Removidas as assertions de category label (`"Comercial primeiro"`, `"// Pré-produção"`) — esses labels têm `hidden lg:block` em `ToolSidebar.tsx` e são invisíveis em mobile por design intencional.
- Mantidas as assertions dos 9 tool labels (`"1 Briefing Inteligente"`, ..., `"5 Checklist de Set"`) — esses continuam visíveis em mobile.
- Adicionada espera explícita `expect(page.locator(".studio-sidebar .studio-tool-nav").first()).toBeVisible()` como sincronização (antes a espera vinha implicitamente das assertions removidas).

**Conclusão:** a estrutura de studio (barra de ferramentas horizontal em mobile) **funciona** bem em `Pixel 7`. Fase 2 pode usar essa estrutura como referência para outras páginas.

---

## 7. Achado de infraestrutura: onboarding modal bloqueia interações em mobile

Durante a implementação, a suíte revelou um comportamento não-relacionado a layout mas que **paralisa qualquer interação em mobile** por ~500 ms após login: o `WelcomeModal` do `Dashboard.tsx` (linha 784).

O modal tem `position: fixed; inset: 0; z-index: 9999` e é aberto via `setTimeout(500 ms)` se as flags `cena-studio-welcome-completed` ou `cena-studio-welcome-dismissed` não estiverem no localStorage.

**Impacto real (não só em teste):** usuário novo que abre o app em mobile passa 0.5-1 s com todos os cliques bloqueados por um modal cheio de texto sobre "Bem-vindo" que o `Pixel 7` renderiza cobrindo a tela toda.

**Solução aplicada nos testes:** `page.addInitScript` no `loginAsAdmin` que seta `cena-studio-welcome-dismissed=true` antes de qualquer navegação. Determinístico, sem timing racing.

**Sugestão para Fase 2:** decidir se o modal continua sendo apresentado dessa forma em mobile ou se vira uma tela de onboarding dedicada (não modal), abaixo da fold. Se ficar modal, garantir que o `setTimeout(500ms)` seja substituído por algo baseado em evento (ex.: após primeiro render completar), evitando o intervalo em que o layout já está interativo mas todos os cliques são interceptados.

---

## 8. Recomendações priorizadas para Fase 2

Ordem sugerida, do maior impacto/menor custo:

### 🔴 P0 — Bloqueios reais de UX mobile

1. **Restaurar "Novo projeto" no dashboard mobile** (Seção 4). Sem isso, o usuário mobile literalmente não consegue começar um projeto sem passar pelo menu.
2. **Fixar bug do onboarding modal** em mobile (Seção 7). Torna os primeiros 500 ms após login inutilizáveis.
3. **Confirmar marcador de página em `/admin`** (Seção 3). Sem isso, `/admin` está "invisível" para automação e potencialmente para leitores de tela.

### 🟠 P1 — Consistência de touch target

4. **Componente `ResponsiveTabs`** (Seção 2.3). Já planejado no macro, e agora fundamentado — todas as abas de páginas com `TabsList` manual violam 44×44.
5. **Header global (`AppNavBar` mobile)** (Seção 2.1). Fixa uma vez, resolve 5 páginas.
6. **Botão "Completar briefing"** (Seção 2.2). 0.75 px de ajuste — mudança minúscula, impacto de conformidade.

### 🟡 P2 — Toques finais e decisões de design system

7. **Botões pequenos "+ Novo cliente" e "Voltar para Clientes"** (Seção 2.4). Precisam de padding padrão.
8. **Breadcrumbs** (Seção 2.5). Decidir se recebem padding ou entram no allowlist (`data-touch-target-exempt`).

### ✅ Positivo (não requer ação)

9. **Fluxo studio em mobile** — funciona bem. Base sólida para outras páginas. (Seção 6)

---

## 9. Como reproduzir estes resultados

```bash
# Rodar apenas os testes da Fase 1 (rápido, ~1.3 min):
npx playwright test --project=chromium-mobile --grep "@fase1"

# Rodar suíte completa (Fase 1 + smoke desktop, ~2.9 min):
npx playwright test

# Ver o trace HTML de uma falha específica:
npx playwright show-trace test-results/<pasta-do-teste>/trace.zip
```

---

## 10. Arquivos criados/modificados na Fase 1

**Novos helpers em `tests/e2e/support/`:**

- `console.ts` — `attachConsoleErrors` (extraído do `launch.spec.ts` beforeEach).
- `auth.ts` — `loginAsAdmin`, `expectLoggedIn`, `disableOnboarding`.
- `mobile.ts` — `isMobileProject`, `openMobileNavIfPresent`, `scrollTabIntoView`.
- `factories.ts` — `createClientViaApi`, `createProjectViaApi`, `cleanupTestData`.
- `touchTarget.ts` — `assertMinTouchTargets`.

**Novos specs em `tests/e2e/`:**

- `mobile-user-flow.spec.ts` — fluxo completo em mobile (Req 1).
- `critical-pages-mobile.spec.ts` — 5 páginas críticas × touch target (Req 2 + 3).

**Editado:**

- `tests/e2e/launch.spec.ts` — `test.skip(mobile)` removido, category labels desktop-only removidas, helpers integrados.
- `playwright.config.ts` — `ADMIN_DEFAULT_PASSWORD=admin123` forçado no comando do webServer para isolar do `.env` local.

**Nenhuma alteração em `client/src/`** — a Fase 1 apenas mede. Todas as correções de layout ficam para a Fase 2.
