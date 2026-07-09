# Requirements Document

## Introduction

Este spec cobre a **Fase 1** do
[`PLANO-IDEAL-PROXIMOS-PASSOS.md`](../../../PLANO-IDEAL-PROXIMOS-PASSOS.md).
A Fase 0 (destravar ambiente de teste) já foi concluída — Vitest hoje roda
1085/1085 verde.

### Problema que a Fase 1 resolve

O único arquivo E2E existente (`tests/e2e/launch.spec.ts`) valida
comportamento **técnico da renderização** (a página carregou, não vaza
horizontalmente, o dialog claro tem inputs legíveis), mas não valida
**tarefas completas de usuário**:

- Nenhum teste hoje verifica que "usuário abre projeto → edita campo →
  salva → recarrega → o valor persistiu".
- Nenhum teste valida **áreas mínimas de toque (44×44 px)** — padrão
  reconhecido de acessibilidade para mobile.
- O único teste que se aproximaria de um fluxo de ponta a ponta
  (`client, project and studio workflow stay connected`) tem
  `test.skip(mobile)` na primeira linha, ou seja, **não valida mobile**.
- Páginas críticas com abas implementadas manualmente
  (`AdminDashboard`, `ClientDetail`, `CommercialOverview`,
  `AnalyticsPremium`) não têm nenhum teste que confirme que a troca de aba
  em mobile mostra o conteúdo dentro do viewport visível.

O projeto Playwright `chromium-mobile` (Pixel 7) já está configurado no
`playwright.config.ts`, mas hoje é redundante — como a maior parte dos
testes só olha overflow, ele apenas repete assertions técnicas em outra
viewport.

### Objetivo da Fase 1

Sair de "os pixels não vazaram" para "uma pessoa real conseguiria
completar o trabalho no celular". Ao fim da fase, a suíte E2E deve
falhar quando o produto for **usável tecnicamente mas quebrado em
prática** (ex.: um botão de salvar existir, mas ter área de toque
inalcançável, ou não persistir após reload).

### Não é escopo da Fase 1

- Consertar os problemas de layout que os testes revelarem — isso é
  Fase 2. A Fase 1 pode legitimamente terminar com **testes falhando
  vermelho** apontando exatamente onde a Fase 2 precisa atuar.
- White label (Fase 3).
- Cobrir 100% das páginas — cobrimos as **mais usadas** definidas em
  Requirement 2. Páginas de auth, sucesso, 404 e views compartilhadas
  por link público ficam fora.

## Glossary

- **Fluxo completo**: sequência de ações mínima para o usuário perceber
  valor entregue, sempre incluindo persistência verificada. Ex.: "criar
  cliente" só termina quando, depois de sair e voltar, o cliente ainda
  está lá.
- **Área de toque**: bounding box renderizada do elemento interativo
  medida via `boundingBox()` do Playwright, em CSS pixels.
- **Página crítica**: página listada em Requirement 2. As demais são
  fora de escopo da Fase 1 (podem ser incluídas em fase futura sem
  reabrir este spec).
- **Elemento interativo primário**: botão visível, trigger de aba,
  link de navegação principal ou item de menu mobile — conforme
  definição em Requirement 3.
- **`chromium-mobile`**: projeto Playwright configurado com viewport
  Pixel 7, já definido em `playwright.config.ts`.

## Requirements

### Requirement 1: Fluxo completo de usuário em mobile

**User Story:** Como responsável pelo produto, quero que a suíte E2E
valide pelo menos um fluxo de tarefa completa de ponta a ponta em
viewport mobile, para que problemas que só aparecem em uso real
(botão salvar sem área de toque, aba escondida atrás do menu, formulário
que não persiste) sejam pegos antes do usuário reclamar.

#### Acceptance Criteria

1. QUANDO a suíte E2E rodar no projeto `chromium-mobile`, ELA DEVE
   executar pelo menos um teste que cobre o fluxo completo:
   `login → criar cliente → criar projeto → abrir projeto → editar um
   campo persistível → salvar → recarregar a página → confirmar que o
   valor editado ainda está lá`.
2. O teste DEVE realizar interações via UI (clicks, fills, taps), e não
   via `page.request.*` — exceto para setup mínimo e para cleanup em
   `finally`.
3. QUANDO o teste terminar, ELE DEVE ter removido todo dado criado
   (clientes, projetos) via `page.request.delete`, mesmo em caso de
   falha. Falha em cleanup NÃO DEVE mascarar falha do teste principal.
4. QUANDO qualquer passo do fluxo falhar, o Playwright DEVE anexar
   trace, screenshot e vídeo automaticamente (já ativado pelo
   `retain-on-failure` global).
5. O teste NÃO DEVE depender de estado de banco pré-existente —
   qualquer dado usado é criado no próprio teste.

### Requirement 2: Cobertura de páginas críticas em mobile

**User Story:** Como responsável pelo produto, quero que as páginas
mais usadas do sistema (dashboard, listagem de clientes, detalhe de
cliente, dashboard admin, hub comercial) tenham teste E2E em mobile que
troca abas e navega, para que uma regressão de layout em mobile seja
pega automaticamente.

#### Páginas críticas cobertas

| Rota | Motivo |
|---|---|
| `/dashboard` | Landing autenticada, primeiro contato pós-login |
| `/commercial` | Hub que agrega clients, pipeline, proposals, interactions |
| `/clients/:id` | Detalhe do cliente com **abas manuais**, alto uso comercial |
| `/admin` | Painel admin com **abas manuais**, uso frequente do owner |
| `/project/:id` | Hub de projeto, ponto de entrada para o trabalho de produção |

#### Acceptance Criteria

1. QUANDO a suíte rodar em `chromium-mobile`, PARA CADA página crítica
   listada acima, ELA DEVE:
   a. Navegar até a rota autenticado.
   b. Aguardar carregamento (marcador de conteúdo esperado visível).
   c. Fazer uma asserção de comportamento (não só "página existe") —
      exemplos aceitáveis: trocar de aba e confirmar conteúdo da aba
      nova; clicar em item da listagem e confirmar navegação;
      abrir/fechar um modal ou menu.
2. QUANDO uma página crítica tiver abas (`AdminDashboard`,
   `ClientDetail`, `CommercialOverview`), o teste DEVE trocar entre
   pelo menos duas abas e confirmar que o conteúdo da aba nova está
   visível no viewport (via `expect(locator).toBeInViewport()` do
   Playwright).
3. SE a barra de abas em mobile precisar de scroll horizontal para
   alcançar uma aba, o teste DEVE executar esse scroll via interação
   real (`.scrollIntoViewIfNeeded()` no elemento da aba) antes de
   clicar, para simular o gesto do usuário.
4. AS assertions técnicas existentes (`expectNoHorizontalOverflow`)
   PODEM ser mantidas como complemento, mas NÃO DEVEM ser a única
   validação da página.

### Requirement 3: Área mínima de toque 44×44 px

**User Story:** Como responsável pela usabilidade, quero garantir que
os elementos interativos primários das páginas críticas atendem ao
mínimo de 44×44 px de área de toque em mobile, para conformidade com
o padrão de acessibilidade reconhecido (Apple HIG, WCAG 2.5.5 AAA
target size) e para reduzir erros de toque.

#### Acceptance Criteria

1. QUANDO um teste E2E em `chromium-mobile` visitar uma página crítica,
   ELE DEVE medir a `boundingBox()` de cada **elemento interativo
   primário** (definido abaixo) e falhar se largura OU altura for
   menor que 44 CSS pixels.
2. **Elementos interativos primários** para a Fase 1:
   a. Botões `<button>` visíveis (não `hidden`, não `display:none`,
      não `disabled`).
   b. Triggers de aba (`[role="tab"]`).
   c. Links de navegação principais (`nav a`, `aside a`).
   d. Itens de menu mobile (`[role="menuitem"]`).
3. **Exclusões permitidas** — o teste DEVE ignorar:
   a. Elementos com atributo explícito `data-touch-target-exempt`
      (para casos aceitos, ex.: link inline dentro de texto corrido).
   b. Elementos dentro de `<footer>` cujo conteúdo é predominantemente
      textual (links de rodapé típicos).
   c. Ícones de fechar dentro de `[role="dialog"]` (avaliados
      separadamente, pois costumam ser 24×24 por padrão de design
      systems e podem exigir decisão explícita).
4. QUANDO o teste falhar, a mensagem de erro DEVE incluir:
   a. O `selector` ou `text` do elemento em questão.
   b. A bounding box medida (`width x height`).
   c. A página onde ocorreu a falha.
5. É aceitável que este requirement termine a Fase 1 com testes
   **falhando vermelho** — o objetivo aqui é mapear o passivo de
   acessibilidade, não silenciar. Cada falha aponta trabalho para a
   Fase 2.
6. O teste DEVE ser determinístico: rodar duas vezes seguidas produz
   o mesmo resultado (nenhum sleep arbitrário, esperas explícitas via
   `expect(...).toBeVisible()`).

### Requirement 4: Remover o `test.skip(mobile)` existente

**User Story:** Como responsável pelo produto, quero que o teste
existente `client, project and studio workflow stay connected` valide
o fluxo em mobile também, não apenas em desktop, para que uma quebra
mobile no núcleo cliente→projeto→studio seja pega.

#### Acceptance Criteria

1. A linha `test.skip(test.info().project.name.includes("mobile"),
   "Desktop sidebar workflow assertion")` (hoje em
   `tests/e2e/launch.spec.ts`) DEVE ser removida.
2. QUANDO o teste rodar em `chromium-mobile`, ELE DEVE:
   a. Executar o mesmo fluxo (criar cliente → criar projeto → abrir
      studio).
   b. Adaptar as assertions específicas de sidebar para a versão
      mobile equivalente: se em mobile a sidebar aparece via menu
      trigger, o teste DEVE abrir esse menu antes de checar os
      labels de workflow.
   c. Manter todas as assertions de conteúdo (a lista de 9 workflow
      labels, o input com nome da marca) — o conteúdo é o mesmo em
      qualquer viewport.
3. SE a versão mobile hoje não expõe a sidebar em lugar nenhum
   (nem via menu), o teste DEVE **falhar explicitamente** com mensagem
   clara ("studio sidebar não é alcançável em mobile") em vez de ser
   pulado. Isso vira trabalho da Fase 2.
4. A `expectNoHorizontalOverflow` no fim do teste PERMANECE em ambos
   os viewports.

### Requirement 5: Feedback e diagnóstico das falhas

**User Story:** Como desenvolvedor da Fase 2 (que vai corrigir o que a
Fase 1 encontrar), quero que cada teste falho da Fase 1 gere output
que aponta direto para o arquivo/componente a corrigir, para não
precisar reexecutar e caçar contexto.

#### Acceptance Criteria

1. QUANDO um teste da Fase 1 falhar, o Playwright DEVE reter
   automaticamente:
   a. Trace file (já configurado via `retain-on-failure`).
   b. Screenshot da falha.
   c. Vídeo do fluxo até a falha.
2. Erros de asserção de touch target DEVEM incluir, além do tamanho,
   o **path do arquivo do componente** quando derivável — se
   inviável derivar automaticamente, incluir o texto/aria-label
   visível do elemento (que é rastreável via grep no repo).
3. O `test.info().attach("console-errors", ...)` existente DEVE ser
   mantido em todos os novos testes.
4. Executar `npm run test:e2e -- --project=chromium-mobile` NÃO DEVE
   requerer configuração adicional além do que já existe no
   `playwright.config.ts`.

### Requirement 6: Custo de execução compatível com uso local e CI

**User Story:** Como time de engenharia, quero que a suíte E2E completa
rode em tempo razoável tanto localmente quanto em CI, para que o
feedback seja rápido o suficiente para ser rodado antes de cada PR.

#### Acceptance Criteria

1. A suíte E2E completa (`chromium-desktop` + `chromium-mobile`,
   incluindo os novos testes da Fase 1) DEVE completar em **≤ 8
   minutos** em máquina local padrão (o baseline atual, com 3 testes,
   é aproximadamente 1-2 minutos; a Fase 1 adiciona ~4-6 minutos).
2. Testes da Fase 1 DEVEM poder ser rodados isoladamente via
   `--grep` (ex.: `npx playwright test --grep "@fase1"`), usando tag
   consistente nos títulos ou anotação Playwright.
3. NÃO É aceitável introduzir `waitForTimeout` fixo além de casos
   documentados com comentário `// TODO(fase-2)` justificando por
   que ainda é necessário.
4. Todos os testes DEVEM ser paralelizáveis (nenhum estado
   compartilhado entre testes — cada um cria seu próprio cliente e
   projeto com sufixo `Date.now()` como já é feito hoje).

## Fora de escopo (deferido para futuro spec)

- Fail-on-console-error: hoje `console-errors` é apenas anexado como
  attachment, não faz o teste falhar. Ligar isso é útil, mas amplia
  escopo — vira spec separado quando fizermos "hardening da suíte".
- Cobertura de páginas fora da lista do Requirement 2
  (`AnalyticsPremium`, `Files`, `VideoReviews`, `Studio`,
  `ProjectChapter`, `Team`, `Collaborators`, `CompanySettings`).
- Testes de acessibilidade além de touch target (contraste, leitor
  de tela, foco de teclado) — vira Fase 1.5 se necessário.
- Testes visuais/regressão de screenshot — o `test-results/launch-qa`
  hoje serve como referência manual, mas não há assertion automática.
