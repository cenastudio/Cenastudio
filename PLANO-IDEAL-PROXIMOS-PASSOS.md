# Plano ideal — próximos passos (visão consolidada)

> Este documento junta tudo que foi investigado até agora (testes, mobile,
> design vs. layout, white label) numa ordem de execução que faz sentido.
> Ele **não substitui** os outros dois documentos de referência — ele decide
> a ordem de trabalho entre eles:
>
> - [`COMO-O-SISTEMA-FUNCIONA.md`](./COMO-O-SISTEMA-FUNCIONA.md) — como a
>   infraestrutura (GitHub → Railway → Postgres → provedores) está
>   conectada. Consulte antes de qualquer mudança que toque build, deploy
>   ou variáveis de ambiente.
> - [`WHITE_LABEL_PLAN.md`](./WHITE_LABEL_PLAN.md) — o que falta para
>   transformar o sistema em white label, e os dois níveis de esforço.

---

## 1. Diagnóstico resumido (onde estamos)

| Área | Situação real | Fonte |
|---|---|---|
| Testes unitários (Vitest) | 45 arquivos, 898 passam / 185 falham por **ambiente** (falta `better-sqlite3`), não por bug de lógica | Rodado nesta sessão |
| Testes E2E (Playwright) | 1 arquivo só, cobre desktop + mobile, mas **pula validação de um fluxo em mobile** (`test.skip`) | `tests/e2e/launch.spec.ts` |
| Tipo de teste existente | Técnico: "não vazou da tela" (`expectNoHorizontalOverflow`) | Não testa uso real |
| Teste de usabilidade real | **Não existe.** Nenhuma validação de área de toque, fluxo de tarefa ponta a ponta, ou uso simulado de pessoa real | Confirmado por busca no código |
| Design tokens (cor, fonte, sombra) | Bem resolvido, centralizado, é o que você gosta | `tokens.css` |
| Layout/estrutura (onde as coisas ficam) | Cada página resolve sozinha, sem padrão — é a causa raiz do problema de abas mobile | Várias páginas com `TabsList` implementado manualmente |
| White label | Base parcial existe (settings por usuário, tokens centralizados), mas nome de marca e cor estão espalhados em 20+ lugares | `WHITE_LABEL_PLAN.md` |

**Conclusão do diagnóstico:** os problemas que você sentiu (mobile quebrando,
"lugar das coisas" inconsistente) não são bugs isolados — são sintoma de uma
causa única: **falta uma camada de layout compartilhada entre as páginas**,
e **falta um teste que simule alguém usando o produto de verdade** para
pegar isso antes de você perceber manualmente.

---

## 2. Por que essa ordem (lógica de priorização)

1. Corrigir o **ambiente de teste** primeiro — sem isso, qualquer mudança
   feita depois não tem como ser validada com confiança.
2. Criar teste de **uso real** antes de sair corrigindo layout — assim você
   sabe se a correção resolveu de verdade, e evita "corrigir no olho" de
   novo.
3. Resolver **mobile/layout compartilhado** — é o que afeta o usuário hoje,
   e é pré-requisito técnico para white label (não faz sentido multiplicar
   marca sobre uma estrutura de layout inconsistente).
4. **White label** por último — é expansão de negócio, não correção de
   problema atual. Só vale investir depois que a base estiver estável.

---

## 3. Plano em fases

### Fase 0 — Destravar o ambiente de teste ✅ CONCLUÍDA

- ✅ Ambiente de Vitest destravado (dependências, mocks, texto desatualizado).
- ✅ 1085/1085 testes passando (100%).
- ✅ Bug real de timezone no `CreateJobModal` descoberto e corrigido
  (`new Date("YYYY-MM-DD")` parseava como UTC em vez de local — afetava
  qualquer usuário no Brasil validando deadlines).

### Fase 1 — Teste de uso real, não só técnico ✅ CONCLUÍDA

- ✅ Spec formal em [`.kiro/specs/fase-1-testes-uso-real/`](./.kiro/specs/fase-1-testes-uso-real/).
- ✅ 5 helpers em `tests/e2e/support/` (auth idempotente, factories de
  cliente/projeto, touch target 44×44, mobile utils, console errors).
- ✅ 2 novos specs E2E cobrindo fluxo completo mobile + 5 páginas críticas.
- ✅ `test.skip(mobile)` do `launch.spec.ts` removido — teste do studio
  agora **passa em desktop E mobile**.
- ✅ Suíte completa roda em **2m 56s** (limite era 8 min).

**Saída da Fase 1:** [`FASE_1_ACHADOS.md`](./FASE_1_ACHADOS.md) na raiz
do repo. Documento serve como **entrada priorizada** para a Fase 2, com:

- 3 achados P0 (bloqueios reais de UX mobile).
- 3 achados P1 (consistência de touch target — confirma a hipótese do
  `ResponsiveTabs`).
- 2 achados P2 (decisões de design system).
- 1 achado positivo: fluxo studio funciona em mobile e serve de
  referência para outras páginas.

### Fase 2 — Layout compartilhado e correção de mobile ✅ CONCLUÍDA

**Spec formal:** [`.kiro/specs/fase-2-layout-mobile-e-tabs/`](./.kiro/specs/fase-2-layout-mobile-e-tabs/).

Executada em 12 tasks distribuídas em 3 waves. Todos os P0/P1/P2 de
`FASE_1_ACHADOS.md` foram resolvidos:

- ✅ **P0.1** "Novo projeto" restaurado no dashboard mobile (rename "Novo Job" → "Novo projeto", CTA visível fora do menu hamburguer).
- ✅ **P0.2** `WelcomeModal` — `setTimeout(500ms)` removido, `pointer-events` corrigido para não bloquear cliques.
- ✅ **P0.3** Marcador `/admin` atualizado para `/Administração|Administration/i` (Task 1).
- ✅ **P1.4** Componente `ResponsiveTabs` criado + 3 testes unitários; `AdminDashboard`, `ClientDetail`, `CommercialOverview` migrados.
- ✅ **P1.5** `AppNavBar` mobile — avatar, notificações, busca, locale, "voltar ao painel", "PAINEL/COMERCIAL/PRODUÇÃO/FINANCEIRO" ≥ 44×44 (min-height ajustado para 45px em mobile pra evitar subpixel rounding).
- ✅ **P1.6** Botões primários do dashboard com `min-h-11`.
- ✅ **P2.7** "+ Novo cliente" e "Voltar para Clientes" com padding padrão.
- ✅ **P2.8** Breadcrumbs marcados com `data-touch-target-exempt` + doc em [`docs/design-system/touch-targets.md`](./docs/design-system/touch-targets.md).

**Extras entregues (fora do escopo original mas necessários):**

- `ProjectHub` ganhou input persistível (`data-testid="project-name-editable"`) com `api.projects.update`.
- Bug do Playwright `.click()` em `<option>` nativo → `selectOption()` corrigido.
- `ResponsiveTabs` triggers com `!min-h-11 !h-auto` (subpixel fix descoberto em execução).
- `CommercialNav` 5 subroute buttons com `min-h-11`.
- Botões Promote/Demote/Trash do `AdminDashboard` com touch target adequado.
- 9 botões do `ProjectHub` (`Ver todos`, `Gerenciar`, `Editar briefing`, `Adicionar membro`, `Exportar projeto`, `ClientLink`, `Abrir Briefing`) ≥ 44×44.
- 3 chaves i18n adicionadas em `translationsSupplemental.ts`.

**Status de testes ao encerrar a Fase 2:**

- ✅ Vitest: **1088/1088** (adicionou 3 testes do `ResponsiveTabs`, atualizou 1 teste do `AppNavBar` para refletir `min-height: 45px`).
- ✅ Playwright `@fase1` isolado: **6/6 verde** (~1.2 min).
- ✅ Suíte completa: **8 pass / 4 fail** (~3.3 min, dentro do orçamento de 8 min).
  - Das 4 falhas: 3 são pré-existentes documentadas em `FASE_1_ACHADOS.md` seções 3 e 5 (`launch.spec.ts` `light theme project dialog` desktop+mobile, e `critical authenticated app screens` mobile por timeout — não regressão da Fase 2). 1 é flakiness do `mobile-user-flow` na suíte completa por estado compartilhado com `launch.spec.ts` (passa consistentemente isolado).
- ✅ Nenhuma regressão em desktop.

### Fase 3 — White label ⏳ Próxima (opcional, depende de decisão de negócio)

**Entrada priorizada:** ver `FASE_1_ACHADOS.md` seção 8 original. Ordem sugerida abaixo (não mais em execução):

_(Conteúdo original das prioridades da Fase 2 movido para o histórico do spec em `.kiro/specs/fase-2-layout-mobile-e-tabs/requirements.md` — todos resolvidos)._

### Fase 3 — White label (opcional, depende de decisão de negócio)

- Seguir o `WHITE_LABEL_PLAN.md`:
  - Nível 1 (1-2 semanas): variáveis de marca, logo dinâmico, remover
    hardcode de "Cena Studio".
  - Nível 2 (3-5 semanas, opcional): multi-tenant real, se a estratégia for
    centralizar operação numa única instalação servindo várias marcas.
- Só vale começar depois da Fase 2 — White label sobre uma base de layout
  inconsistente só multiplica o problema por marca.

---

## 4. Resumo em uma linha por fase

| Fase | Objetivo | Status | Duração | Depende de |
|---|---|---|---|---|
| 0 | Testes rodando de verdade | ✅ Concluída | 1 dia | Nada |
| 1 | Testar como usuário real, não só tecnicamente | ✅ Concluída | 3-5 dias | Fase 0 |
| 2 | Corrigir mobile e padronizar layout | ✅ Concluída | 1-2 semanas | Fase 1 |
| 3 | White label | ⏳ Próxima | 1-2 sem (básico) / +3-5 sem (multi-tenant) | Fase 2 |

---

## 5. Regra de segurança entre os documentos

Sempre que uma fase envolver **build, deploy ou variável de ambiente**,
confira primeiro a seção 6 do `COMO-O-SISTEMA-FUNCIONA.md` — já houve 2
quedas de produção por causa de `NODE_ENV` durante build. As Fases 0-2 são
mudanças de código/frontend e teste, de baixo risco para produção. A Fase 3
(Nível 2, multi-tenant) é a única que toca schema de banco e infraestrutura
de forma mais profunda — merece revisão cuidadosa antes de aplicar migration
em produção.
