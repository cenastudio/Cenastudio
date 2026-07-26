# Design — Qualidade de raciocínio das ferramentas de IA

## Princípios

1. **Não reescrever do zero** — os frameworks são bons, editar pontualmente
2. **Só modelos free até primeiro cliente pagante** — decisão de negócio consciente
3. **Medir antes de mudar** — eval confirma que upgrade melhora output
4. **Documentar decisões** — ADR em `ARCHITECTURE.md`, não comentário no código

## Fase A — Upgrade de conteúdo dos prompts

### A1. Orçamento — metodologia vs. dado perecível

**Antes (hardcoded):**
```
Diária de diretor: R$ 2.500 - R$ 5.000 (2024/2025)
Diária de fotógrafo: R$ 1.800 - R$ 3.500 (2024/2025)
```

**Depois (metodologia + disclaimer):**
```
Use como ponto de partida as faixas de mercado que você conhece para
produção audiovisual brasileira em [ano atual], mas informe explicitamente
ao usuário que os valores são uma estimativa de referência e podem estar
defasados — recomende validar com 2-3 orçamentos reais de mercado antes
de fechar com o cliente.
```

**Alternativa robusta (futuro):**
Puxar valores de tabela própria do sistema (configurável no admin) via contexto no momento da geração.

### A2. Adicionar exemplos input→output

**Prioridade:** 04 Orçamento, 06 Contrato, 03 Callsheet, 09 Checklist

**Estrutura do exemplo:**
```
# Exemplo de uso ideal

## Input (briefing curto):
[texto representativo real de 3-5 linhas]

## Output esperado:
[documento completo gerado, formatado, com todos os campos preenchidos]
```

**Benefício:** Compensa limitação de modelos free em seguir instrução longa e abstrata.

### A3. Moodboard — referências da indústria

**Adicionar seção:**
```
Sempre que fizer sentido, cite pelo menos 1 referência real e específica
(diretor de fotografia, colorista, filme, campanha, fotógrafo) como ponto
de calibração do look — não apenas descrição paramétrica de cor e luz.

Exemplo: "contraste alto e sombras densas, no espírito do trabalho de
Roger Deakins em Blade Runner 2049" em vez de só "contraste alto, sombras densas".
```

**Aplicar também em:**
- Roteiro (referências de estrutura narrativa)
- Decupagem (referências de movimento de câmera)

### A4. Ponte Orçamento IA → BudgetEntry estruturado

**Mudança de produto, não só de prompt.**

**Opção 1: Parsing de texto**
```tsx
<Button onClick={extractToStructured}>
  Usar este orçamento no módulo de Orçamento
</Button>
```
- Extrai totais por categoria do markdown gerado
- Popula `BudgetEntry` via `budgetService.ts`
- Risco: parsing de texto livre é frágil

**Opção 2: JSON estruturado (recomendada)**
- Pedir ao modelo retornar bloco JSON junto do markdown
- Usar só o JSON para popular banco
- Mais confiável que parsing de texto

**Estrutura JSON:**
```json
{
  "categories": [
    {"name": "Equipe", "total": 15000},
    {"name": "Equipamento", "total": 8000},
    {"name": "Pós-produção", "total": 12000}
  ],
  "total": 35000
}
```

## Fase B — Reclassificar modelo por criticidade

### Implementação em `aiService.ts`

**Substituir:** `CALCULATION_TOOLS` / `MARKETING_TOOLS` (agrupamento por tema)

**Por:** agrupamento por criticidade de erro

```typescript
const HIGH_CRITICALITY_TOOLS = [
  'orcamento',      // 04
  'contrato',       // 06
  'callsheet',      // 03
  'checklist'       // 09
];

const MEDIUM_CRITICALITY_TOOLS = [
  'roteiro',        // 01
  'decupagem',      // 02
  'proposta',       // 05
  'cronograma',     // 10
  'entrega'         // 11
];

const CREATIVE_TOOLS = [
  'briefing',       // 07
  'moodboard',      // 08
  'assistente-livre'// 12
];
```

### Seleção de modelo

**Alta criticidade:** Testar via eval antes de decidir (não assumir)
- Candidatos: `nvidia/nemotron-3-ultra-550b-a55b:free`, `qwen/qwen3-next-80b-a3b-instruct:free`
- Critério: estabilidade + precisão, não velocidade

**Documentar como ADR:**
```markdown
## ADR: Roteamento de modelo por criticidade

**Status:** Aceito
**Data:** 2026-07-26
**Contexto:** Free tier até primeiro cliente pagante
**Decisão:** Usar modelo X para alta criticidade por [resultado do eval]
**Consequências:** Revisitar ao fechar primeiro cliente (gatilho em docs/STATUS.md)
```

## Fase C — Temperatura por perfil

### Implementação

```typescript
const TEMPERATURE_PROFILES = {
  precision: { temperature: 0.2, top_p: 0.95 },
  standard: { temperature: 0.6, top_p: 0.95 },
  creative: { temperature: 0.8, top_p: 0.95 }
};

const TOOL_TEMPERATURE_MAP = {
  'orcamento': 'precision',
  'contrato': 'precision',
  'callsheet': 'precision',
  'checklist': 'precision',
  'roteiro': 'creative',
  'briefing': 'creative',
  'moodboard': 'creative',
  'assistente-livre': 'creative',
  // restante: 'standard'
};
```

## Fase D — Eval mínimo viável

### Estrutura de pasta

```
server/services/ai/__evals__/
├── 01-roteiro.eval.json
├── 02-decupagem.eval.json
├── 03-callsheet.eval.json
├── ...
└── 12-assistente-livre.eval.json
```

### Estrutura de caso de teste

```json
{
  "tool": "orcamento",
  "cases": [
    {
      "id": "orcamento-videoclipe-baixo",
      "input": {
        "projectType": "videoclipe",
        "budget": "baixo",
        "duration": "3min",
        "crew": "mínima"
      },
      "acceptanceCriteria": [
        "Total entre R$ 8k-15k",
        "Inclui equipe, equipamento, pós",
        "Disclaimer sobre validar valores",
        "Formato de tabela markdown legível"
      ]
    }
  ]
}
```

### Execução

```bash
npm run eval:ai -- --tool=orcamento --model=nvidia/nemotron-3-ultra-550b-a55b:free
npm run eval:ai -- --tool=orcamento --model=qwen/qwen3-next-80b-a3b-instruct:free
npm run eval:ai:compare -- --before=prompts-old --after=prompts-new
```

### Documentação de resultado

Em `docs/STATUS.md`, seção "AI Model Evaluation":
```markdown
## Evaluation — 2026-07-26

### Ferramenta: Orçamento
- Modelo testado: nvidia/nemotron vs qwen3-next vs poolside/laguna
- Resultado: nvidia/nemotron 4/5 casos aprovados, qwen3-next 3/5, poolside 2/5
- Decisão: Migrar para nvidia/nemotron
- Prompt antes vs depois: 2/5 aprovados → 4/5 aprovados
```

## Fase E — Loop de uso real

### Análise de dados existentes

```sql
-- Quais ferramentas têm mais reuso vs descarte
SELECT
  tool_id,
  COUNT(*) as total_generations,
  SUM(CASE WHEN reused = true THEN 1 ELSE 0 END) as reused_count,
  AVG(rating) as avg_rating
FROM generations
GROUP BY tool_id
ORDER BY reused_count DESC;
```

### Priorização de próximos upgrades

Focar em ferramentas com:
- Alto volume de uso
- Baixa taxa de reuso
- Rating médio baixo

Documentar em `docs/STATUS.md` → seção "Próximas tarefas de IA"
