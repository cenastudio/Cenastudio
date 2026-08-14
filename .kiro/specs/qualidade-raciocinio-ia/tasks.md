# Implementation Plan

## Overview

18 tasks em 5 fases. **15 de 18 feitas.** Estado verificado contra o código em
2026-08-14, não contra documentação anterior.

- **Fase A (prompts) — concluída** (tasks 1 a 4, incluindo a medição da 4).
- **Fase B (modelo por criticidade) — concluída** (tasks 5 a 8).
- **Fase C (temperatura por perfil) — concluída** (task 9).
- **Fase D (eval) — concluída para a faixa alta.** Estrutura e runner (10), casos
  (11, 12, 13), eval comparativo (14) e aplicação do modelo (15) feitos. A faixa
  `high` agora usa `nvidia/nemotron-3-super-120b-a12b:free`, escolhido por eval.
- **Fase E (uso real) — pausada** (tasks 16 a 18). Aguardando acesso ao banco de
  produção. Não bloqueia nada acima.

### Retomada (próxima sessão)

1. Retomar pela Fase E (tasks 16 a 18), usando o banco de produção/Supabase agora
   disponível para extrair volume, reuso e rating por ferramenta.
2. Se mexer em roteamento de modelo novamente, reconferir o catálogo `:free` do
   OpenRouter antes de editar `TIER_MODEL`.

Decisão pendente do operador, herdada da task 4: a taxa de bloco inválido de 40%
acionou o gatilho de revisão do ADR-013. A saída prevista é gerar o JSON numa
segunda chamada dedicada. Não foi implementada porque muda o desenho da ponte.

O formato anterior deste arquivo usava IDs hierárquicos (`A1.1`, `B2.3`) dentro
de `###`, que o executor de tasks não consegue parsear — era por isso que "run
all tasks" não encontrava nada para rodar. Agora as tasks são numeradas no nível
de topo e cada uma cita os requirements que valida.

Regra herdada do spec: **não commitar troca de modelo em produção sem o eval da
Fase D**. As tasks 5-9 mudam roteamento e amostragem, o que já é uma mudança de
comportamento — está registrada como provisória no ADR-014 justamente por isso.

## Tasks

### Fase A — Upgrade de conteúdo dos prompts

- [x] 1. Trocar tabela de preços fixa por metodologia no prompt de Orçamento
  - Remover os 2 blocos de valores hardcoded em R$ de `shared/tools.ts`
    (12 diárias de equipe, 7 de equipamento) e o título "VALORES DE REFERÊNCIA
    DE MERCADO BRASILEIRO (2024)".
  - Substituir por "COMO CHEGAR AOS VALORES": ancoragem por senioridade,
    equipamento por classe, 5 fatores de ajuste, faixa em vez de número único.
  - Preservar as categorias (equipe, equipamento, pós); pós passa a exigir
    declaração do critério (por entrega ou por diária).
  - Exigir disclaimer de validação com 2-3 orçamentos reais na abertura da
    resposta, e usar os valores do próprio usuário como âncora quando ele os
    informar.
  - **Feito.** Derivação por âncora em `tools.ts:482-519`; menções a R$ caíram de
    30 para 11; o título antigo não existe mais no arquivo. Removida também a
    alegação de "conhece os valores praticados em 2024/2025" da IDENTIDADE
    OPERACIONAL.
  - _Requirements: A1_

- [x] 2. Adicionar exemplos input→output nas 4 ferramentas de maior custo de erro
  - 1-2 exemplos completos no `promptRole` de 04 (Orçamento), 06 (Contrato),
    03 (Callsheet) e 09 (Checklist).
  - O 2º exemplo de cada uma demonstra só o raciocínio, não repete a estrutura.
  - **Feito.** 04: `tools.ts:631` e `734`. 06: `933` e `1050`. 03: `278` e `414`.
    09: `1407` e `1538`.
  - _Requirements: A2_

- [x] 3. Ancorar Moodboard, Roteiro e Decupagem em referência real
  - Seção "ANCORAGEM EM REFERÊNCIA REAL" no `promptRole` da 08, exigindo ≥1
    referência específica (diretor de fotografia, colorista, filme) e listando o
    que **não** conta como referência (gênero, adjetivo, plataforma).
  - Incluir a regra de precisão acima de volume: não inventar obra nem atribuir
    trabalho a quem não fez.
  - Avaliar e aplicar o mesmo padrão em 01 (Roteiro) e 02 (Decupagem).
  - **Feito.** 08: `tools.ts:1196-1210`, exemplo com Roger Deakins em Blade
    Runner 2049 no formato ✗ fraco / ✓ ancorado. 01: `tools.ts:70-82` (cold open
    de Breaking Bad). 02: `tools.ts:164-176` (push-in de Jonathan Demme). Nas
    três, a âncora é ponto de calibração, com o que se aproveita e o que se
    descarta.
  - _Requirements: A3_

- [x] 4. Ponte Orçamento IA → baseline do módulo de Orçamento
  - Decidir entre parsing de texto e bloco JSON estruturado, e registrar como
    ADR.
  - Emitir o bloco `<<<CENA_BUDGET_JSON ... CENA_BUDGET_JSON>>>` junto do texto.
  - Extrair, validar e remover o bloco na exibição, cópia, export e contexto de
    projeto.
  - Botão "Usar este orçamento no módulo" + diálogo com escolha piso/teto.
  - Integrar com `budgetService.updateBudgetBaseline`.
  - Medir a taxa de bloco inválido em geração real.
  - **Feito:** decisão registrada como ADR-013 (contrato `cena.budget.v1`
    completo); `shared/budgetBlock.ts` + `client/src/lib/budgetBlock.ts`;
    integração com o baseline; `scripts/measure-budget-block.ts` como harness da
    medição. Cobertura: 37 testes em `budgetBlock.test.ts` (22),
    `BudgetBridgeAction.test.tsx` (9), `documentFormatter.test.ts` (4),
    `aiServiceContext.test.ts` (2), mais os e2e `budget-bridge-flow.spec.ts` e
    `budget-bridge-mobile.spec.ts` (resposta da IA mockada).
  - **Medição feita (2026-07-27, `nvidia/nemotron-3-ultra-550b-a55b:free`, 5
    briefings, 5 medidos): taxa de bloco inválido de 40% (2/5).** Relatório em
    `tmp/medicao-a46.json`.
  - **A medição encontrou um bug nosso, não do modelo.** As primeiras rodadas
    deram 100% de bloco inválido com `finish_reason: "length"`: o teto de
    `max_tokens` cortava a resposta **antes** do bloco, que o ADR-013 posiciona no
    fim. O teto vinha de `OPENROUTER_MAX_TOKENS=4096`, presente no `.env` **e no
    `.env.example`** — então qualquer ambiente que copiou o exemplo tinha a ponte
    quebrada sem erro visível. Corrigido: `TOOL_MAX_TOKENS` por ferramenta (04
    com 12000, default 8192), com o valor da ferramenta vencendo a env var, mesma
    precedência já adotada para temperatura. Nota no `.env.example` explicando que
    aquelas três variáveis não valem mais para as 12 ferramentas.
  - **As 2 falhas restantes são de instrução, não de truncamento** — as duas com
    `finish_reason: "stop"` e sem a sentinela: (a) briefing de uma linha, em que o
    modelo devolve um questionário pedindo dados em vez de estimar; (b) briefing
    longo, em que ele escreve o documento inteiro até o campo de assinatura e
    esquece o bloco. Instrução no fim de geração longa é o padrão de falha.
  - **Gatilho de revisão do ADR-013 acionado.** O ADR previa: se a taxa for alta,
    a saída é gerar o JSON numa segunda chamada dedicada (prompt curto, só JSON),
    mantendo o mesmo `schema`. 40% é alto. Decisão pendente do operador — não foi
    implementada aqui porque muda o desenho da ponte, não é medição.
  - Instrumentação que a medição exigiu e ficou no script: `finish_reason`,
    tamanho da saída, presença da sentinela e presença de JSON. Sem esses quatro
    campos, "modelo ignorou a instrução" e "nós cortamos a resposta" apareciam
    como o mesmo `absent`.
  - Dois ajustes que o código impôs sobre o design: delimitador por linhas
    sentinela (markdown é proibido pelas regras de formatação de
    `generateForTool`) e destino é o baseline do `Budget`, não `BudgetEntry`.
  - _Requirements: A4_

### Fase B — Reclassificar modelo por criticidade

- [x] 5. Substituir agrupamento por tema por agrupamento por criticidade
  - Remover `CALCULATION_TOOLS` / `MARKETING_TOOLS` de `resolveToolModel` em
    `server/services/aiService.ts`.
  - Criar `HIGH_CRITICALITY_TOOLS`, `MEDIUM_CRITICALITY_TOOLS` e
    `CREATIVE_TOOLS`, mapeando as 12 ferramentas sem sobreposição.
  - Ferramenta não classificada cai em `medium`, nunca em `creative`.
  - **Feito.** Chaves são `toolId` (o que `generateForTool` recebe), não os slugs
    do design.md — slugs ficam no comentário de cada linha. `TIER_MODEL` isola a
    escolha de modelo por faixa num único ponto.
  - _Requirements: B1_

- [x] 6. Conferir disponibilidade real dos modelos candidatos
  - Consultar `GET https://openrouter.ai/api/v1/models` e conferir os candidatos
    do design contra o catálogo `:free`.
  - Listar o modelo atualmente usado por ferramenta.
  - **Feito, com dois achados:** `nvidia/nemotron-3-ultra-550b-a55b:free` existe;
    `qwen/qwen3-next-80b-a3b-instruct:free` **não é mais oferecido** (restam 15
    modelos `:free`). A mesma checagem revelou que a cadeia de fallback de
    produção tinha 2 de 5 degraus mortos (o qwen e
    `meta-llama/llama-3.3-70b-instruct:free`) — cada um custava uma volta de
    latência antes de cair no degrau seguinte. Corrigidos para
    `openai/gpt-oss-20b:free` e `inclusionai/ling-3.0-flash:free`.
  - _Requirements: B2_

- [x] 7. Registrar o roteamento como ADR-014
  - ADR em `ARCHITECTURE.md` com contexto (free tier até o primeiro cliente
    pagante), a tabela das 3 faixas e a natureza temporária da decisão.
  - Deixar explícito o que **não** está decidido: qual modelo serve a faixa
    `high`.
  - **Feito.** O ADR começou com status provisório para a escolha de modelo da
    faixa alta, sem trocar produção por palpite. Em 2026-08-14, a task 15 fechou
    essa lacuna e aplicou `nvidia/nemotron-3-super-120b-a12b:free` em
    `TIER_MODEL.high`.
  - _Requirements: B3_

- [x] 8. Registrar o gatilho de revisão em `docs/STATUS.md`
  - Ajustar o gatilho informal que já existia na Seção 3 em vez de criar um
    segundo item concorrente.
  - Especificar: ao fechar o primeiro cliente pagante, revisar a faixa de alta
    criticidade antes das outras duas.
  - **Feito.** Somado um gatilho anterior a esse (aplicar o resultado do eval em
    `TIER_MODEL.high`) e um gatilho novo: reconferir o catálogo `:free` do
    OpenRouter a cada mexida em roteamento, porque ele envelhece sem aviso.
  - _Requirements: B4_

### Fase C — Temperatura por tipo de tarefa

- [x] 9. Amostragem dinâmica por perfil de tarefa
  - Criar `TEMPERATURE_PROFILES` (precision 0.2 / standard 0.6 / creative 0.8,
    `top_p` 0.95) e `TOOL_TEMPERATURE_MAP` em `aiService.ts`.
  - Passar a amostragem resolvida para os três provedores (OpenRouter, NVIDIA,
    Anthropic) em `generateForTool`.
  - Testar uma ferramenta de cada perfil.
  - **Feito.** `resolveToolSampling` alimenta `generateWithOpenRouter`,
    `generateWithNvidia` e `generateWithAnthropic`. Na Anthropic vai só
    `temperature`, porque a API rejeita `temperature` e `top_p` juntos.
    `scripts/measure-budget-block.ts` passou a usar a mesma amostragem, senão a
    medição da task 4 mediria uma configuração que produção não usa mais.
  - Perfil não é espelho da criticidade: Roteiro (01) é `medium` mas usa
    `creative`. É a única exceção e é deliberada.
  - Precedência: o perfil da ferramenta vence `OPENROUTER_TEMPERATURE` /
    `NVIDIA_TEMPERATURE`; as env vars seguem valendo para chamadas que não vêm de
    uma ferramenta (`server/services/ai/aiHelper.ts`, não tocado).
  - Verificado: `server/services/aiServiceRouting.test.ts`, 12 testes passando,
    cobrindo as 3 faixas, os 3 perfis, a exceção do Roteiro e o fail-safe de
    ferramenta desconhecida. `npm run check` limpo.
  - _Requirements: C1, C2, C3, C4, C5_

### Fase D — Eval mínimo viável

- [x] 10. Criar a estrutura de eval
  - Criar `server/services/ai/__evals__/` e o `eval.schema.json` que define a
    forma de um caso (`tool`, `cases[].id`, `cases[].input`,
    `cases[].acceptanceCriteria`).
  - Adicionar o script `eval:ai` ao `package.json` e o runner que carrega um
    arquivo de eval, chama o modelo com o mesmo `buildToolSystemPrompt` da
    geração real e imprime aprovado/reprovado por critério.
  - Reaproveitar o padrão de `scripts/measure-budget-block.ts`: modelo fixo por
    execução, sem cadeia de fallback (senão a comparação mistura modelos), e sem
    gravar em `generations`/`usage`.
  - **Feito.** `server/services/ai/__evals__/eval.schema.json` (forma dos
    arquivos), `server/services/ai/evalCriteria.ts` (avaliador puro) e
    `scripts/run-ai-eval.ts` (CLI), com `npm run eval:ai`.
  - Desvio deliberado do design: o `design.md` escrevia critério de aceite como
    frase livre ("Total entre R$ 8k-15k"). Frase não decide nada sozinha, e o
    eval existe para escolher modelo — precisa dar o mesmo número duas vezes
    seguidas. Cada critério passou a carregar um `check` executável
    (`includesAll`, `excludesAll`, `regex`, `noMarkdown`, `budgetBlock`,
    `currencyRange`, `minLength`), e a frase virou o `description` do relatório.
    O que só humano julga usa `type: "manual"` e fica **fora** do numerador e do
    denominador — critério de gosto disfarçado de assert daria número falso.
  - Flags: `--tool`, `--tier` (usa as faixas do ADR-014), `--case`, `--model`,
    `--save` e `--prompt-file`, este último é o que viabiliza a comparação prompt
    antigo vs. novo da task 14. `--dry-run` valida os arquivos e monta os prompts
    sem chamar o provedor.
  - Verificado: `server/services/ai/evalCriteria.test.ts`, 18 testes passando
    (inclui os casos em que `noMarkdown` não deve confundir bullet `•` nem
    asterisco de multiplicação, e a regex inválida sendo pega antes de gastar
    chamada). `npm run check` limpo. `npm run eval:ai -- --dry-run` responde com
    a mensagem correta de pasta ainda sem casos.
  - _Requirements: D1_

- [x] 11. Escrever casos de eval para as 4 ferramentas de alta criticidade
  - 3-5 casos para 03 (Callsheet), 04 (Orçamento), 06 (Contrato) e 09
    (Checklist).
  - Começar por estas porque são elas que decidem `TIER_MODEL.high`.
  - **Feito.** 16 casos, 87 critérios. Cada arquivo tem um caso "adverso" de
    propósito: callsheet com briefing de uma linha (não deve inventar telefone),
    orçamento com valores do próprio usuário (deve ancorar nos dele), contrato de
    NDA (deve definir "Informação Confidencial", não só citar) e checklist em via
    pública noturna (autorização e segurança).
  - Este trabalho revelou um buraco no avaliador: critério negativo escrito como
    `regex` passa exatamente quando deveria reprovar. Daí o tipo `regexAbsent`,
    com teste próprio travando a inversão.
  - _Requirements: D2_

- [x] 12. Escrever casos de eval para as 5 ferramentas de criticidade média
  - 3-5 casos para 01 (Roteiro), 02 (Decupagem), 05 (Proposta), 10 (Cronograma) e
    11 (Entrega).
  - **Feito.** 15 casos, 73 critérios. O padrão que amarra estes cinco é
    restrição: decupagem com kit sem dolly (não pode decupar movimento
    impossível), cronograma com prazo inviável (tem de dizer que não cabe),
    proposta com teto abaixo do escopo (tem de reduzir escopo, não prometer
    tudo), entrega com pendência aberta (não pode declarar projeto encerrado).
  - _Requirements: D2_

- [x] 13. Escrever casos de eval para as 3 ferramentas criativas
  - 3-5 casos para 07 (Briefing), 08 (Moodboard) e 12 (Assistente Livre).
  - Critério de aceite aqui mira presença de âncora real (task 3), não gosto.
  - **Feito.** 10 casos, 44 critérios. Nenhum critério julga estética: o que se
    verifica é âncora nomeada, respeito a restrição declarada (paleta de marca,
    kit disponível, proibição de humor) e reconhecimento de limite — o assistente
    tem um caso de pergunta tributária em que a resposta certa é mandar procurar
    contador. O julgamento de gosto que sobrou está marcado como `manual`.
  - _Requirements: D2_

- [x] 14. Executar o eval comparativo e documentar
  - Rodar os candidatos de alta criticidade: `poolside/laguna-m.1:free` (modelo
    provisório anterior)
    contra `nvidia/nemotron-3-ultra-550b-a55b:free`. O outro candidato do design
    saiu do catálogo (ver task 6) — escolher o substituto entre os 15 `:free`
    disponíveis no momento da execução.
  - Comparar prompt antigo vs. prompt com os upgrades da Fase A. Recuperar a
    versão anterior de `shared/tools.ts` no git **antes** de escrever os casos,
    senão a base de comparação se perde.
  - Registrar resultado em `docs/STATUS.md` com data, e decidir o modelo da faixa
    alta com base nos números.
  - **Feito em 2026-08-14.** `poolside/laguna-m.1:free` falhou 16/16 com 404;
    `nvidia/nemotron-3-ultra-550b-a55b:free` marcou 47/61 (77,0%) com 4 respostas
    vazias; `google/gemma-4-31b-it:free` falhou 16/16 com 429; o substituto
    operacional `nvidia/nemotron-3-super-120b-a12b:free` marcou 63/76 (82,9%) com
    1 resposta vazia. A comparação com prompt antigo confirmou ganho forte em
    Orçamento: o prompt antigo não emite o bloco `cena.budget.v1`.
  - _Requirements: D3_

- [x] 15. Aplicar a decisão de modelo em produção
  - Alterar `TIER_MODEL.high` em `aiService.ts` conforme o resultado da task 14.
  - Atualizar o ADR-014 com o resultado, promovendo a escolha de modelo de
    provisória a respaldada por eval.
  - Atenção ao commitar: o push está bloqueado pela pendência de rotação de
    credenciais (Seção 3 do `docs/STATUS.md`) — não empurrar com o PAT atual.
  - **Feito em 2026-08-14.** `TIER_MODEL.high` passou para
    `nvidia/nemotron-3-super-120b-a12b:free`; ADR-014 e `docs/STATUS.md`
    atualizados.
  - _Requirements: D4_

### Fase E — Fechar o loop com uso real

- [ ] 16. Extrair métricas de uso por ferramenta
  - Query em `generations` agrupando por `tool_id`: volume, taxa de reuso e
    rating médio.
  - Executar em produção ou, na falta de acesso, em staging — dizendo qual foi.
  - _Requirements: E1, E2_

- [ ] 17. Cruzar volume, reuso e rating para achar as ferramentas que doem
  - Identificar as de alto volume com baixo reuso ou rating baixo.
  - _Requirements: E3_

- [ ] 18. Repriorizar os próximos upgrades com base nos dados
  - Documentar em `docs/STATUS.md`, seção de próximas tarefas de IA.
  - Priorizar por dado real, não distribuir esforço igualmente entre as 12.
  - _Requirements: E4, E5_

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2", "3", "5", "6", "9"],
      "description": "Prompts (1, 2, 3), reagrupamento por criticidade (5), conferência de catálogo (6) e amostragem por perfil (9) — independentes entre si"
    },
    {
      "wave": 2,
      "tasks": ["4", "7", "8", "10"],
      "description": "Ponte de orçamento e sua medição (4, depende do prompt da 1); ADR e gatilho (7, 8) dependem do reagrupamento; estrutura de eval (10) depende de 5 e 9 para medir o que produção faz"
    },
    {
      "wave": 3,
      "tasks": ["11", "12", "13"],
      "description": "Casos de eval por faixa de criticidade — paralelizáveis, todos dependem do runner da 10"
    },
    {
      "wave": 4,
      "tasks": ["14"],
      "description": "Execução comparativa do eval"
    },
    {
      "wave": 5,
      "tasks": ["15", "16"],
      "description": "Aplicar modelo em produção (15) e extrair métricas de uso real (16, independente do eval)"
    },
    {
      "wave": 6,
      "tasks": ["17", "18"],
      "description": "Análise e repriorização"
    }
  ],
  "dependencies": {
    "1": [],
    "2": [],
    "3": [],
    "4": ["1"],
    "5": [],
    "6": [],
    "7": ["5", "6"],
    "8": ["5", "7"],
    "9": [],
    "10": ["5", "9"],
    "11": ["10"],
    "12": ["10"],
    "13": ["10"],
    "14": ["11", "12", "13"],
    "15": ["14"],
    "16": [],
    "17": ["16"],
    "18": ["17"]
  }
}
```

Em texto: as tasks 1, 2, 3, 5, 6 e 9 não dependem de nada e já estão feitas. A 4
só depende do prompt da 1 e está parada na medição. A Fase D é uma cadeia quase
linear — runner (10, feito) → casos (11, 12, 13 em paralelo) → execução (14) →
produção (15). A Fase E é independente da D e pode começar a qualquer momento que
houver acesso ao banco.

Ponto de partida agora: **task 11**. As três tasks de casos (11, 12, 13) são
paralelizáveis entre si, e a 11 é a que importa primeiro porque é ela que decide
`TIER_MODEL.high`.

## Notes

### Por que a Fase B foi feita antes do eval

O spec manda rodar eval antes de commitar mudança de modelo. As tasks 5-9 mudam o
modelo de 4 ferramentas (03, 05, 09, 12) sem eval, e isso é uma dívida
reconhecida, não um descuido: o agrupamento antigo deixava Callsheet e Checklist
sem roteamento nenhum, e manter o erro estrutural até a Fase D custava mais que
corrigi-lo com a escolha de modelo marcada como provisória. O ADR-014 registra
essa provisoriedade e a task 15 é a que a resolve.

### Estado da suíte ao fechar as Fases B e C

`npm run check` limpo. `npm run test`: 832 passando, 15 skipped, **1 falhando** —
`clientPortalFlow.test.ts` (cross-producer isolation) e `portalDataService.test.ts`
(`table files has no column named name`). Ambas verificadas como **pré-existentes
e alheias a este spec**: com as mudanças de `aiService.ts` revertidas, as duas
continuam falhando. São da spec `portal-do-cliente/`, ainda não commitada.

### O que a Fase A ainda não provou

Todos os upgrades de prompt são verificáveis por leitura, menos um número: a taxa
de bloco inválido da ponte de orçamento (task 4). Prompt melhor é hipótese até o
eval da Fase D dizer o contrário — é justamente isso que a task 14 mede ao
comparar prompt antigo e novo.

### Referências

- Design: [`design.md`](./design.md)
- Requirements: [`requirements.md`](./requirements.md)
- ADR-013 (ponte de orçamento) e ADR-014 (roteamento por criticidade):
  [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md)
- Fila de trabalho e gatilhos: [`../../../docs/STATUS.md`](../../../docs/STATUS.md)
