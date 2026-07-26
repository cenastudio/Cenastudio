# Spec — Qualidade de raciocínio das 12 ferramentas de IA (Studio IA)

> Cole no Claude Code depois da Fase 0 (fundação/limpeza). Esta spec
> mexe em três coisas: o **conteúdo** dos prompts (`shared/tools.ts`),
> **o que executa** esses prompts (modelo/temperatura) e **como medir**
> se está funcionando (eval).

## Contexto
O framework de cada uma das 12 ferramentas (`shared/tools.ts`, campo
`promptRole`) tem profundidade real de domínio audiovisual (formato
ABNT/Hollywood de roteiro, terminologia de decupagem, Lei 9.610/98 nos
contratos, normas brasileiras como ANAC/DRT no assistente). É uma base
sólida — mas sólida não é o mesmo que atualizada ou completa. Achados
concretos, prompt por prompt:

- **Orçamento (04)** tem faixas de diária em R$ por função **hardcoded
  no prompt, rotuladas "2024/2025"**. Hoje é julho de 2026 — os valores
  já estão defasados e vão continuar ficando, porque estão escritos
  como fato fixo, não como metodologia.
- **Só o Assistente Livre (12) tem exemplos concretos de input->output
  ideal.** Os outros 11 descrevem estrutura e critério de qualidade em
  abstrato, sem mostrar um exemplo. Com modelo free (mais fraco em
  seguir instrução abstrata — ver seção de modelo abaixo), exemplo
  concreto reduz variância mais do que regra escrita.
- **Moodboard (08) nunca ancora em referência real da indústria.**
  Especifica paleta HEX, temperatura de cor em Kelvin, aspect ratio —
  sólido tecnicamente — mas nenhuma instrução pede para citar um
  diretor de fotografia, colorista ou filme real como ponto de
  calibração, que é como profissional de verdade comunica visual
  ("look tipo Roger Deakins em Blade Runner 2049").
- **O Orçamento gerado pela IA não se conecta ao módulo estruturado de
  Orçamento que o produto já tem** (`Budget`/`BudgetEntry` no Prisma,
  `budgetService.ts`, tela `Budget.tsx`). São duas fontes de "orçamento"
  que não se falam — o usuário provavelmente digita tudo de novo na
  tela estruturada depois de gerar o texto.
- Modelo padrão é uma cadeia de modelos **gratuitos** do OpenRouter, e
  as ferramentas 04/05/06 (dinheiro e jurídico) vão para
  `poolside/laguna-m.1:free`, escolhido por tema, não por ser o mais
  forte disponível.
- `temperature` é fixa em `0.7` para as 12 ferramentas.
- Não existe eval que meça qualidade de output — validação hoje é uso
  manual.

---

## Fase A — Upgrade de conteúdo dos prompts (`shared/tools.ts`)

Não reescrever do zero — os frameworks são bons. Editar pontualmente:

### A1. Orçamento — separar metodologia de dado perecível
Trocar a lista de valores fixos em R$ por uma instrução que:
- Mantém a estrutura de categorias (equipe, equipamento, pós) como
  está — isso é metodologia, não expira.
- Substitui os números fixos por: "Use como ponto de partida as
  faixas de mercado que você conhece para produção audiovisual
  brasileira em [ano atual], mas informe explicitamente ao usuário que
  os valores são uma estimativa de referência e podem estar defasados
  — recomende validar com 2-3 orçamentos reais de mercado antes de
  fechar com o cliente."
- Isso é mais honesto com o resultado real de um modelo de linguagem
  (que não tem preço de mercado ao vivo) do que apresentar números
  como se fossem atuais.
- Alternativa mais robusta (fica pra depois, não é bloqueante): puxar
  os valores de referência de uma tabela própria do sistema
  (configurável no admin) em vez do prompt, e injetar via contexto no
  momento da geração — aí sim fica atualizável sem tocar no prompt.

### A2. Adicionar 1-2 exemplos completos de input->output nas ferramentas de alta criticidade
Prioridade: 04 Orçamento, 06 Contrato, 03 Callsheet, 09 Checklist (as
mesmas de maior risco de erro). Um exemplo de briefing curto + o
documento ideal gerado a partir dele, direto no `promptRole`. Isso é
o upgrade de maior retorno em modelo free, porque compensa a limitação
do modelo em seguir instrução longa e abstrata.

### A3. Moodboard — ancorar em referência real da indústria
Adicionar uma seção explícita: "Sempre que fizer sentido, cite pelo
menos 1 referência real e específica (diretor de fotografia, colorista,
filme, campanha, fotógrafo) como ponto de calibração do look — não
apenas descrição paramétrica de cor e luz. Ex.: 'contraste alto e
sombras densas, no espírito do trabalho de Roger Deakins em Blade
Runner 2049' em vez de só 'contraste alto, sombras densas'." Mesma
lógica pode enriquecer Roteiro (referências de estrutura narrativa) e
Decupagem (referências de movimento de câmera de diretores conhecidos
pelo estilo descrito).

### A4. Ponte entre Orçamento (texto) e Orçamento (dado estruturado)
Isto é mudança de produto, não só de prompt: ao gerar um orçamento
pela ferramenta de IA dentro do contexto de um projeto, oferecer um
botão "usar este orçamento no módulo de Orçamento do projeto" que
extrai os totais por categoria do texto gerado e popula `BudgetEntry`
via `budgetService.ts`, em vez de deixar como documento solto. Se o
parsing de texto livre for frágil, alternativa mais simples: pedir ao
modelo para retornar também um bloco JSON estruturado (totais por
categoria) junto do documento em texto, e usar só o JSON para popular
o banco — mais confiável que fazer parsing de markdown.

---

## Fase B — Reclassificar modelo por criticidade, dentro do orçamento free

Restrição atual do projeto: só modelos free (OpenRouter) até o
primeiro cliente pagante — decisão de negócio consciente, não gap a
corrigir agora. Esta fase não propõe pagar Anthropic hoje. Propõe
usar o melhor modelo free disponível em cada grupo de criticidade,
em vez de distribuir por tema como hoje.

`CALCULATION_TOOLS` (04/05/06) e `MARKETING_TOOLS` (07/08/11) hoje são
agrupadas por tema. Reclassificar por criticidade de erro:

- **Alta criticidade (precisão não-negociável):** 04 Orçamento,
  06 Contrato, 03 Callsheet (erro de horário/local custa produção
  inteira), 09 Checklist. Hoje 04/06 vão para `poolside/laguna-m.1:free`
  — trocar para o modelo free mais forte e mais estável disponível
  no OpenRouter no momento da implementação (comparar via eval da Fase
  D antes de decidir — não assumir qual é melhor, medir). Candidatos a
  testar: `nvidia/nemotron-3-ultra-550b-a55b:free` e
  `qwen/qwen3-next-80b-a3b-instruct:free` já estão na fallback chain.
- **Média criticidade:** 01 Roteiro, 02 Decupagem, 05 Proposta,
  10 Cronograma, 11 Entrega — manter o roteamento atual ou ajustar
  conforme o eval indicar.
- **Criativo/exploratório:** 07 Briefing, 08 Moodboard,
  12 Assistente Livre.

Implementar essa reclassificação em `aiService.ts` no lugar de
`CALCULATION_TOOLS`/`MARKETING_TOOLS`, documentando a decisão como ADR
em `ARCHITECTURE.md` — incluindo explicitamente que é uma escolha
temporária, presa ao teto do free tier, com o gatilho de revisão
abaixo.

### Gatilho de migração para modelo pago
Registrar em `docs/STATUS.md`, seção própria "Gatilho: upgrade de
modelo de IA": ao fechar o primeiro cliente pagante, revisar
primeiro os grupos de Alta Criticidade (04 Orçamento, 06 Contrato —
onde erro tem custo financeiro/legal direto com um cliente real).
Não precisa upgrade dos 12 de uma vez; alta criticidade primeiro,
resto conforme orçamento permitir.

## Fase C — Temperatura por tipo de tarefa, não global
Definir 2-3 perfis de `temperature`/`top_p` e associar cada uma das 12
ferramentas a um perfil, em vez do 0.7 fixo atual:
- **Precisão** (Orçamento, Contrato, Checklist, Callsheet): temperatura
  baixa (ex.: 0.2-0.3).
- **Padrão** (Decupagem, Cronograma, Entrega, Proposta): manter perto
  do atual (0.5-0.7).
- **Criativo** (Roteiro, Briefing, Moodboard, Assistente): pode manter
  ou subir levemente (0.7-0.8).

## Fase D — Eval mínimo viável
1. Criar `server/services/ai/__evals__/` com 3-5 casos de teste por
   ferramenta (36-60 no total): um input representativo real + critério
   de aceite explícito em texto.
2. Rodar os mesmos inputs contra os modelos free candidatos, e também
   comparar prompt antigo vs. prompt com os upgrades da Fase A —
   confirmar que o upgrade de conteúdo realmente melhora o output.
3. Não precisa rodar em todo PR — é ferramenta de decisão pontual,
   documentada em `docs/STATUS.md` com data e resultado.

## Fase E — Fechar o loop com uso real
`server/services/toolService.ts` e as tabelas `Generation`/`Usage` já
registram toda geração feita no produto. Extrair quais das 12
ferramentas têm mais reuso vs. mais descarte, para priorizar os
próximos upgrades de prompt pelo uso real, não igualmente.

---

## Critério de "pronto"
- Prompts de 04/06/03/09/08 revisados com os upgrades da Fase A e
  comparados via eval antes/depois.
- Modelo usado por ferramenta documentado em `ARCHITECTURE.md` como
  ADR, com o motivo.
- Temperatura por perfil implementada e testada nas 3 categorias.
- Pasta de eval existe com pelo menos 3 casos por ferramenta e
  resultado comparativo registrado em `docs/STATUS.md`.
- Decisão tomada sobre a ponte Orçamento IA -> BudgetEntry estruturado.
