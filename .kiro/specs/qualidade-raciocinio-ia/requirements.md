# Spec — Qualidade de raciocínio das 12 ferramentas de IA (Studio IA)

## Contexto

O framework de cada uma das 12 ferramentas (`shared/tools.ts`, campo `promptRole`) tem profundidade real de domínio audiovisual (formato ABNT/Hollywood de roteiro, terminologia de decupagem, Lei 9.610/98 nos contratos, normas brasileiras como ANAC/DRT no assistente).

É uma base sólida — mas sólida não é o mesmo que atualizada ou completa.

## Relação com código existente

Esta spec mexe em três coisas:
1. O **conteúdo** dos prompts (`shared/tools.ts`)
2. **O que executa** esses prompts (modelo/temperatura em `aiService.ts`)
3. **Como medir** se está funcionando (eval)

## Achados concretos por ferramenta

### Orçamento (04)
- Faixas de diária em R$ hardcoded no prompt, rotuladas "2024/2025"
- Hoje é julho de 2026 — valores defasados e vão continuar ficando
- Valores escritos como fato fixo, não como metodologia

### Assistente Livre (12)
- **Único** com exemplos concretos de input→output ideal
- Os outros 11 descrevem estrutura e critério em abstrato

### Moodboard (08)
- Especifica paleta HEX, temperatura Kelvin, aspect ratio (sólido tecnicamente)
- Nunca ancora em referência real da indústria (diretor de fotografia, colorista, filme)

### Orçamento gerado pela IA
- Não se conecta ao módulo estruturado de Orçamento (`Budget`/`BudgetEntry` no Prisma, `budgetService.ts`, tela `Budget.tsx`)
- Usuário provavelmente digita tudo de novo na tela estruturada

### Modelo padrão
- Cadeia de modelos **gratuitos** do OpenRouter
- Ferramentas 04/05/06 (dinheiro e jurídico) vão para `poolside/laguna-m.1:free`, escolhido por tema, não por força

### Temperatura
- Fixa em `0.7` para as 12 ferramentas

### Validação
- Não existe eval que meça qualidade de output — validação é uso manual

## Requisitos

### Fase A — Upgrade de conteúdo dos prompts

**A1. Orçamento — separar metodologia de dado perecível**
- Trocar valores fixos em R$ por instrução com metodologia
- Informar explicitamente que valores são estimativa de referência
- Recomendar validar com 2-3 orçamentos reais antes de fechar com cliente

**A2. Adicionar exemplos completos input→output**
- Prioridade: 04 Orçamento, 06 Contrato, 03 Callsheet, 09 Checklist
- 1-2 exemplos de briefing curto + documento ideal gerado

**A3. Moodboard — ancorar em referência real**
- Citar pelo menos 1 referência específica (diretor de fotografia, colorista, filme)
- Exemplo: "contraste alto e sombras densas, no espírito de Roger Deakins em Blade Runner 2049"

**A4. Ponte entre Orçamento (texto) e Orçamento (estruturado)**
- Botão "usar este orçamento no módulo de Orçamento do projeto"
- Extrai totais por categoria e popula `BudgetEntry` via `budgetService.ts`
- Alternativa: pedir JSON estruturado junto do texto markdown

### Fase B — Reclassificar modelo por criticidade

Restrição: só modelos free (OpenRouter) até primeiro cliente pagante.

**Reclassificação:**
- **Alta criticidade:** 04 Orçamento, 06 Contrato, 03 Callsheet, 09 Checklist → modelo free mais forte disponível
- **Média criticidade:** 01 Roteiro, 02 Decupagem, 05 Proposta, 10 Cronograma, 11 Entrega → manter ou ajustar conforme eval
- **Criativo/exploratório:** 07 Briefing, 08 Moodboard, 12 Assistente Livre

**Candidatos a testar:** `nvidia/nemotron-3-ultra-550b-a55b:free`, `qwen/qwen3-next-80b-a3b-instruct:free`

**Documentar:** ADR em `ARCHITECTURE.md` com gatilho de revisão

**Gatilho de migração para modelo pago:**
Registrar em `docs/STATUS.md`: ao fechar primeiro cliente pagante, revisar grupos de Alta Criticidade primeiro.

### Fase C — Temperatura por tipo de tarefa

Definir 2-3 perfis e associar cada ferramenta:
- **Precisão** (Orçamento, Contrato, Checklist, Callsheet): 0.2-0.3
- **Padrão** (Decupagem, Cronograma, Entrega, Proposta): 0.5-0.7
- **Criativo** (Roteiro, Briefing, Moodboard, Assistente): 0.7-0.8

### Fase D — Eval mínimo viável

1. Criar `server/services/ai/__evals__/` com 3-5 casos de teste por ferramenta (36-60 total)
2. Input representativo real + critério de aceite explícito
3. Rodar inputs contra modelos candidatos
4. Comparar prompt antigo vs. prompt com upgrades da Fase A
5. Documentar resultado em `docs/STATUS.md` com data

### Fase E — Fechar o loop com uso real

- `toolService.ts` e tabelas `Generation`/`Usage` já registram toda geração
- Extrair quais ferramentas têm mais reuso vs. descarte
- Priorizar próximos upgrades pelo uso real

## Critérios de aceite

- [ ] Prompts de 04/06/03/09/08 revisados com upgrades da Fase A
- [ ] Comparação via eval antes/depois realizada
- [ ] Modelo usado por ferramenta documentado em `ARCHITECTURE.md` como ADR
- [ ] Temperatura por perfil implementada e testada nas 3 categorias
- [ ] Pasta de eval existe com ≥3 casos por ferramenta
- [ ] Resultado comparativo registrado em `docs/STATUS.md`
- [ ] Decisão tomada sobre ponte Orçamento IA → BudgetEntry estruturado
