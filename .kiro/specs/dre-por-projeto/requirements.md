# Requirements Document

## Introduction

Hoje o Cena Studio já mostra "orçado vs. realizado" por projeto (`Budget.tsx`,
model `Budget`/`BudgetEntry`) e um resumo de lucro/margem consolidado por mês
em `Analytics.tsx`. O que falta é um **relatório de resultado por projeto**
individual — receita bruta do projeto, deduções, custos diretos, despesas
indiretas e resultado final — no formato de leitura que um cliente, sócio ou
contador reconhece (DRE: Demonstrativo de Resultado do Exercício), servindo
como referência competitiva ao que o concorrente MakersHub oferece.

**Gap estrutural identificado:** hoje `FinancialEntry` (receitas/despesas
reais lançadas no financeiro) só se vincula a `Client` e `Opportunity`, nunca
a `Project`. Isso significa que a receita e as despesas "financeiras" de um
projeto não são somáveis a nível de projeto hoje — apenas os gastos lançados
dentro de `BudgetEntry` (que já são por projeto) existem nesse nível. Este
spec cobre o fechamento dessa lacuna como pré-requisito do DRE.

Objetivo de negócio: o dono da produtora abre um projeto encerrado (ou em
andamento) e vê, num relatório único, se aquele projeto específico deu lucro
ou prejuízo real — não uma estimativa de orçamento, mas o resultado
financeiro fechado, pronto para mostrar a um sócio ou anexar a uma prestação
de contas.

## Glossary

- **DRE (Demonstrativo de Resultado do Exercício):** relatório contábil que
  parte da receita bruta, aplica deduções, subtrai custos diretos (custo do
  serviço) e despesas operacionais, chegando ao resultado líquido.
- **Receita do projeto:** soma de `FinancialEntry` com `kind = income`
  vinculadas ao projeto (via novo campo `projectId`), no status `settled`.
- **Custo direto do projeto:** soma de `BudgetEntry` (gastos reais lançados
  no orçamento do projeto) — equipe, equipamento, locação etc. — e,
  opcionalmente, custo de mão de obra calculado a partir de `TimeEntry`
  (`hourlyRate * duration`) quando o projeto usa timesheet.
- **Despesa operacional/indireta:** despesas gerais do estúdio (`FinancialEntry`
  com `kind = expense` sem vínculo direto a um projeto, ex. aluguel do
  escritório) — fora do escopo de rateio automático neste spec (ver Requisito 4).
- **Resultado líquido do projeto:** Receita − Deduções − Custos diretos −
  Despesas operacionais alocadas.

## Requirements

### Requisito 1 — Vínculo de FinancialEntry a Project (pré-requisito, P0)

**User Story:** Como sistema, preciso que lançamentos financeiros (receitas e
despesas) possam ser vinculados a um projeto específico, para que o DRE tenha
de onde somar a receita real do projeto.

#### Acceptance Criteria
1. WHEN o schema é migrado THEN o model `FinancialEntry` SHALL ganhar um
   campo opcional `projectId` (nullable, `onDelete: SetNull`), seguindo o
   mesmo padrão de `clientId`/`opportunityId` já existentes.
2. WHERE o backend roda em modo SQLite (dual-path) THE tabela
   `financial_entries` SHALL ganhar a coluna equivalente `project_id INTEGER
   REFERENCES projects(id) ON DELETE SET NULL`, via migração aditiva idempotente
   em `ensureProjectColumns`-like helper (nunca `DROP`/`ALTER` destrutivo).
3. WHEN o usuário cria ou edita um lançamento financeiro (receita ou despesa)
   pela tela de Financeiro (`Analytics.tsx`) ou pelo detalhe do cliente
   (`ClientDetail.tsx`) THEN o formulário SHALL oferecer um seletor opcional
   de projeto, listando apenas projetos do mesmo cliente vinculado (se houver
   `clientId`) ou todos os projetos do usuário (se não houver).
4. WHEN uma Proposta é aceita e vinculada/gera um projeto THEN o sistema
   SHALL oferecer a opção (não obrigatória, para não quebrar fluxo atual) de
   já vincular automaticamente o valor total da proposta como um
   `FinancialEntry` de receita (`kind = income`) associado ao projeto criado.
   Este item é aditivo e não bloqueia os demais requisitos se não for viável
   no mesmo ciclo.
5. AFTER a migração THEN lançamentos financeiros existentes SHALL permanecer
   com `projectId = null` (não há tentativa automática de retro-vincular
   dados históricos sem confirmação explícita do usuário).

---

### Requisito 2 — Cálculo do resultado (DRE) por projeto (P0)

**User Story:** Como dono da produtora, quero ver o resultado financeiro real
de um projeto específico — receita menos custos e despesas — para saber se
aquele projeto deu lucro.

#### Acceptance Criteria
1. WHEN o usuário acessa a aba/página "DRE" de um projeto THEN o sistema
   SHALL calcular e exibir, nesta ordem:
   - Receita bruta do projeto (soma de `FinancialEntry.kind = income`,
     `status = settled`, `projectId = <projeto>`)
   - Deduções (opcional, ver Requisito 3)
   - Receita líquida (bruta − deduções)
   - Custos diretos do projeto (soma de `BudgetEntry.amount` do `Budget` do
     projeto)
   - Resultado bruto (receita líquida − custos diretos)
   - Despesas operacionais alocadas ao projeto (ver Requisito 4, se ativado
     pelo usuário; caso contrário, omitido do cálculo)
   - Resultado líquido do projeto (resultado bruto − despesas alocadas)
2. WHEN não há nenhum `FinancialEntry` de receita vinculado ao projeto THEN o
   sistema SHALL exibir receita bruta = 0 e um aviso orientando o usuário a
   vincular lançamentos de receita ao projeto (não um erro).
3. WHEN não há `Budget`/`BudgetEntry` definido para o projeto THEN o sistema
   SHALL exibir custos diretos = 0 com aviso equivalente, sem impedir a
   visualização do restante do relatório.
4. WHEN o resultado líquido é negativo THEN o sistema SHALL exibir o valor em
   destaque negativo (vermelho), consistente com o padrão visual já usado em
   `Analytics.tsx` (`profit >= 0 ? green : red`).
5. WHERE o projeto usa moedas diferentes de BRL no `Budget.currency` THE o
   sistema SHALL rejeitar a agregação direta com receitas em outra moeda e
   exibir aviso de moeda divergente, sem converter automaticamente (fora de
   escopo).

---

### Requisito 3 — Deduções (P1, opcional/configurável)

**User Story:** Como dono da produtora, quero opcionalmente registrar
deduções sobre a receita bruta (impostos sobre serviço, taxas de
intermediação/plataforma), para que o resultado líquido seja mais realista.

#### Acceptance Criteria
1. WHEN o usuário configura o DRE de um projeto THEN o sistema SHALL permitir
   informar deduções como percentual da receita bruta (ex.: "Impostos 6%") ou
   valor fixo, com uma lista editável (nome + percentual/valor), reutilizando
   o padrão de UI de categorias já usado em `Budget.tsx` (`CategoryDraft`).
2. WHERE nenhuma dedução é configurada THE o sistema SHALL considerar
   deduções = 0 e mostrar "Receita líquida = Receita bruta" sem exigir
   configuração prévia.
3. WHEN deduções são configuradas por percentual THEN o sistema SHALL
   recalcular o valor em Reais automaticamente sempre que a receita bruta
   mudar (não fixar o valor no momento da configuração).

---

### Requisito 4 — Despesas operacionais/indiretas alocadas (P2, opcional)

**User Story:** Como dono da produtora, quero opcionalmente ratear uma parte
das despesas gerais do estúdio (aluguel, ferramentas, salário fixo da equipe)
para dentro do DRE de projetos específicos, para ter uma visão mais completa
de lucratividade — sem ser obrigado a fazer isso se não quiser.

#### Acceptance Criteria
1. WHERE o usuário não configurar rateio THE o DRE do projeto SHALL considerar
   despesas operacionais alocadas = 0 (comportamento padrão, sem ação
   obrigatória).
2. WHEN o usuário opta por ratear despesas THEN o sistema SHALL oferecer pelo
   menos um método simples: valor fixo por projeto informado manualmente OU
   percentual da receita do projeto. Métodos mais sofisticados (rateio por
   horas trabalhadas via `TimeEntry`, proporcional ao número de projetos
   ativos no período) ficam registrados no design como extensão futura, não
   bloqueante para a primeira entrega.
3. WHEN uma despesa operacional é alocada a um projeto THEN o sistema SHALL
   deixar claro na interface que aquele valor é uma alocação manual/estimada,
   não um lançamento financeiro real vinculado (para não confundir com o
   Requisito 1).

---

### Requisito 5 — Exibição e exportação do relatório (P1)

**User Story:** Como dono da produtora, quero visualizar o DRE do projeto na
tela e exportá-lo em PDF, para poder compartilhar com um sócio, contador ou
anexar a uma prestação de contas.

#### Acceptance Criteria
1. WHEN o usuário acessa a aba "DRE" dentro da navegação do projeto
   (`ProjectNav`) THEN o sistema SHALL exibir o relatório estruturado em
   linhas (Receita bruta → Deduções → Receita líquida → Custos diretos →
   Resultado bruto → Despesas alocadas → Resultado líquido), seguindo o
   design system `frame-*` já usado em `Budget.tsx`/`Analytics.tsx`.
2. WHEN o usuário aciona "Exportar PDF" THEN o sistema SHALL gerar um PDF do
   relatório reutilizando o padrão de exportação já existente no projeto
   (`printHtmlDocument`/`exportPdf` conforme usado em `Documents.tsx` e
   `CommercialOverview.tsx`), incluindo nome do projeto, cliente, período e
   data de geração.
3. WHERE o projeto não tiver nenhum dado financeiro vinculado (nem receita
   nem orçamento) THE o sistema SHALL exibir um estado vazio orientando o
   usuário a vincular lançamentos financeiros ou definir um orçamento antes
   de gerar o relatório, seguindo o padrão visual de empty state já usado em
   `Budget.tsx` (bloco numerado 01/02/03).

---

### Requisito 6 — Controle de acesso por plano (P1)

**User Story:** Como produto, quero que o DRE por projeto seja um recurso
premium consistente com o resto do sistema de gating de features.

#### Acceptance Criteria
1. WHEN um usuário sem acesso à feature acessa a aba "DRE" THEN o sistema
   SHALL exibir `FeatureUpgradeRequired` com um novo identificador de feature
   (ex.: `"project-dre"`), seguindo exatamente o padrão de
   `"budget-tracking"` em `client/src/lib/feature-gating/gate.ts`,
   `client/src/types/plan.ts` e `FeatureUpgradeRequired.tsx`.
2. WHERE o DRE depende do Budget (Requisito 2) THE o nível mínimo de plano
   exigido para `"project-dre"` SHALL ser igual ou superior ao exigido por
   `"budget-tracking"` (hoje: `studio`), decisão final registrada no design.
3. WHEN o usuário tem acesso à feature THEN a aba "DRE" SHALL aparecer em
   `ProjectNav`, no mesmo padrão condicional já usado para
   `canAccessBudget`/`isBudgetActive`.

---

### Requisito 7 — Compatibilidade e não regressão (transversal, bloqueante)

**User Story:** Como operador do sistema, quero que a introdução do DRE não
quebre nenhum fluxo financeiro ou de orçamento já existente em produção.

#### Acceptance Criteria
1. WHILE este spec estiver em implementação THEN `Budget.tsx`, `Analytics.tsx`
   e o financeiro do `ClientDetail.tsx` SHALL continuar funcionando
   exatamente como hoje, mesmo antes do campo `projectId` de
   `FinancialEntry` ser adotado em todos os fluxos de criação.
2. WHEN a migração de banco (Requisito 1) for aplicada THEN ela SHALL ser
   puramente aditiva (nova coluna nullable), sem exigir backfill obrigatório
   nem apagar dados existentes.
3. AFTER a implementação THEN `npm run check`, `npm run test` (suite
   completa) e `npm run build` SHALL passar antes de considerar o spec
   concluído.
