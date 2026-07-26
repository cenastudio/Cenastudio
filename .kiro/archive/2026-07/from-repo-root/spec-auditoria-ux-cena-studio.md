# Spec — Correção de Achados da Auditoria UX/Técnica (Cena Studio)

> Cole este documento inteiro como prompt para o Claude Code no repo do
> Cena Studio. Segue o mesmo padrão dos specs existentes em `.kiro/specs/`
> (ver `fase-2-layout-mobile-e-tabs` como referência de tom e formato).

## Contexto

Esta spec consolida uma auditoria feita fora do repo: análise de código
(`server/`, `client/src/`, migrations, `.kiro/specs/`) cruzada com prints
reais de 9 telas em produção (desktop e mobile). O objetivo não é
adicionar funcionalidade — é fechar o gap entre "o sistema tem muita
coisa" e "o sistema é fácil de usar", incluindo o próprio dono do
produto.

Antes de qualquer código: **leia os specs já existentes em
`.kiro/specs/fase-2-layout-mobile-e-tabs/` e
`.kiro/specs/features-criticas-gap-analysis/`** — parte do trabalho de
mobile já foi feito (componente `ResponsiveTabs` existe e está migrado
em 4 páginas). Esta spec é a continuação desse trabalho, não uma
reinicialização.

Trabalhe em fases, na ordem abaixo. Cada fase é independente e pode virar
um PR próprio. Não pule para a fase seguinte sem confirmar que a
anterior não quebrou os testes E2E existentes (`npx playwright test`).

---

## Fase A — P0: risco de dado / paridade quebrada de funcionalidade

### A1. Confirmação obrigatória em ações destrutivas (admin)
No painel de admin (`AdminDashboard.tsx` / componente de listagem de
usuários), o botão **"Promover"** e o ícone de **deletar usuário** estão
lado a lado, mesmo tamanho, sem diferenciação visual — em mobile isso é
risco real de exclusão acidental por proximidade de toque.

- Adicionar `AlertDialog` (já existe `@radix-ui/react-alert-dialog` no
  projeto) de confirmação antes de qualquer delete de usuário.
- Separar visualmente a ação destrutiva: cor diferente (já existe classe
  de destructive no design system — usar), espaçamento maior em relação
  às ações não-destrutivas, ou mover para um menu secundário
  (`DropdownMenu` já disponível via Radix).
- Aplicar o mesmo padrão de auditoria a **qualquer outro botão de delete
  no admin** (não só usuários) — buscar por `onClick.*delete\|handleDelete`
  em `client/src/pages/AdminDashboard.tsx` e componentes relacionados.

### A2. Paridade de navegação mobile x desktop (módulo Comercial)
Confirmado por print: a barra de abas mobile do módulo Comercial mostra
3 itens (Overview / Clients / Pipeline); o desktop mostra 5 (+ Propostas
+ Interações). Investigar `AppNavBar.tsx` / componente de abas do
Comercial:

- Se for corte intencional por espaço, criar um menu "mais" (overflow)
  no mobile em vez de esconder sem indicação — o usuário precisa saber
  que Propostas e Interações existem.
- Se for sobra da migração parcial do `ResponsiveTabs`, migrar a
  página/componente que renderiza essas abas para o padrão já
  estabelecido em `AdminDashboard.tsx`/`ClientDetail.tsx`.
- Critério de aceite: todas as 5 seções do Comercial acessíveis em no
  máximo 2 toques a partir do mobile, com indicação visual clara de que
  existem mesmo se não estiverem na barra principal.

---

## Fase B — P1: terminar a migração de mobile já iniciada

Ver `.kiro/specs/fase-2-layout-mobile-e-tabs/tasks.md` — todas as tasks
lá estão marcadas `[x]`, mas o componente `ResponsiveTabs` só foi
adotado em 4 arquivos (`AdminDashboard.tsx`, `ClientDetail.tsx`,
`CommercialOverview.tsx`, `Profile.tsx`).

### B1. Levantamento
Rodar:
```bash
grep -rl "className=\"flex.*border-b\|role=\"tab\"" client/src/pages client/src/components
```
Isso retorna ~24 arquivos com padrão de abas manual não migrado. Gerar
uma lista real (arquivo + linha) e transformar em checklist de migração,
igual ao formato usado em `tasks.md` da fase 2.

### B2. Migração
Para cada arquivo da lista: substituir a implementação manual de abas
pelo `ResponsiveTabs` (`client/src/components/ui/responsive-tabs.tsx`),
seguindo exatamente o padrão já aplicado em `AdminDashboard.tsx`. Não
inventar variação nova do componente — se o `ResponsiveTabs` não cobrir
algum caso de uso, isso é sinal para evoluir o componente compartilhado,
não criar mais uma implementação paralela.

### B3. Regressão
Rodar a suíte `@fase1` do Playwright (mobile, Pixel 7) depois de cada
lote de migrações — mesma régua que a Fase 2 já usou
(`npx playwright test --grep "@fase1"`).

---

## Fase C — P1: hierarquia visual da navegação (módulo Comercial)

Achado do print (`CommercialOverview.tsx` provavelmente): 3 sistemas de
navegação empilhados na mesma tela com o mesmo peso visual —
(1) abas do módulo [Visão Geral/Clientes/Pipeline/Propostas/Interações],
(2) sub-abas internas [Dashboard/Métricas/Funil/Relatórios],
(3) seletor de estágio [Prospectar/Qualificar/Fechar].

- Redesenhar a hierarquia: nível 1 (abas de módulo) deve ser visualmente
  dominante; nível 2 (sub-abas) mais discreto (ex.: sem borda de card,
  underline mais fino, ou convertido em segmented control); nível 3
  (seletor de estágio) deve parecer um filtro, não uma aba — considerar
  mover para um `Select`/pill group claramente distinto dos outros dois.
- Aplicar a mesma auditoria de "quantos níveis de navegação empilhados
  numa tela" em `Studio.tsx`/tela de IA (pipeline de 6 estágios + menu
  lateral de 12 ferramentas em 5 categorias na mesma tela) — mesmo
  problema, mesma correção de princípio: um nível de navegação por vez
  deve ser visualmente dominante.

---

## Fase D — P2: design system — parar de vazar hex direto

Achado: 44 de 235 arquivos de componentes/páginas usam cor hex direta
(`#e85002` etc.) em vez dos tokens de `client/src/design-system/tokens`.

- Rodar `grep -rl "#[0-9A-Fa-f]\{6\}" client/src/components client/src/pages`
  e para cada arquivo trocar o hex pelo token equivalente já existente.
- Adicionar uma regra de lint (ESLint custom rule ou script simples
  chamado no `npm run check`/CI) que falha o build se aparecer um hex
  literal fora da pasta `design-system/`. Isso evita que o problema
  volte.

---

## Fase E — P2: SEO real nas rotas públicas

Achado: SPA com `index.html` único — todas as 49 rotas compartilham a
mesma meta tag. Isso não importa para telas atrás de login, mas importa
muito para as rotas públicas: `/`, `/review/:token`, `/proposal/:token`,
`/meeting/:token`.

- Adicionar `react-helmet-async` (ou solução equivalente) e implementar
  título/description dinâmicos nessas 4 rotas — por exemplo,
  `/proposal/:token` deveria ter título com o nome do cliente/projeto,
  não o título genérico do app.
- Verificar que `scripts/verify-built-html.mjs` (que já valida
  presença de meta obrigatória no build) continua passando — pode
  precisar de ajuste para checar as rotas dinâmicas também, não só o
  `index.html` estático.

---

## Fase F — P3: skills descobríveis automaticamente

Achado: `.kiro/skills/` tem 12 arquivos de skill (incluindo
`seo-specialist.md`) mas não há nenhum `AGENTS.md`/`CLAUDE.md` na raiz
do repo dizendo quando cada skill deve ser consultada automaticamente.

- Criar `AGENTS.md` na raiz do repo com uma tabela: nome da skill →
  quando usar (gatilhos/tipo de tarefa) → caminho do arquivo. Usar como
  referência o padrão de descrição usado pelas skills públicas do
  Claude Code (frase que deixa claro o gatilho de uso, não só o tema).
- Não precisa reescrever as skills existentes — só torná-las
  descobríveis.

---

## Fase G — P3: polimento de microcopy/empty states

Achado: tela Financeiro (e possivelmente outras) mostra a mesma
mensagem de "está vazio, comece aqui" duas vezes na mesma tela (cards
zerados + bloco grande de onboarding). Consolidar em um único padrão de
empty state por página, reaproveitável.

---

## Ordem de execução recomendada
A → B → C → D → E → F → G. As fases A e B têm risco de regressão real
(mexem em navegação usada em todo o app autenticado) — rodar Playwright
completo (não só `@fase1`) depois de cada uma. As fases D em diante são
de baixo risco e podem ser paralelizadas entre si se houver mais de um
agente/dev trabalhando.

## Critério de "pronto"
- Nenhuma tela com dois níveis de navegação do mesmo peso visual.
- 0 arquivos com hex literal fora de `design-system/`.
- Paridade funcional mobile/desktop em 100% dos módulos (nada
  escondido sem indicação).
- `AGENTS.md` na raiz referenciando todas as skills de `.kiro/skills/`.
- Suíte Playwright completa (desktop + `@fase1` mobile) verde.
