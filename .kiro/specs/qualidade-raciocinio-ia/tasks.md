# Tasks — Qualidade de raciocínio das ferramentas de IA

> Trabalhe em fases, na ordem abaixo. Rodar eval (Fase D) antes de commitar mudanças de modelo/prompt em produção.

## Fase A — Upgrade de conteúdo dos prompts

### A1. Orçamento — separar metodologia de dado perecível

- [x] A1.1. Localizar valores hardcoded em R$ em `shared/tools.ts` (ferramenta 04)
  - 2 blocos: 12 diárias de equipe (linhas 283-294) e 7 de equipamento (297-303),
    sob o título "VALORES DE REFERÊNCIA DE MERCADO BRASILEIRO (2024)"
- [x] A1.2. Trocar por instrução de metodologia + disclaimer
  - Substituído por "COMO CHEGAR AOS VALORES": ancoragem por senioridade,
    equipamento por classe, 5 fatores de ajuste, faixa em vez de número único.
    Removida também a alegação "conhece os valores praticados em 2024/2025" da
    IDENTIDADE OPERACIONAL. Menções a R$ caíram de 30 para 11
- [x] A1.3. Manter estrutura de categorias (equipe, equipamento, pós)
  - Preservada; pós agora exige declarar o critério (por entrega ou por diária)
- [x] A1.4. Adicionar nota sobre validar com 2-3 orçamentos reais
  - Disclaimer obrigatório na abertura da resposta. Acrescentado: se o usuário
    informar valores próprios, usar os dele como âncora e descartar a derivação

### A2. Adicionar exemplos input→output

- [ ] A2.1. Ferramenta 04 (Orçamento): adicionar 1-2 exemplos completos ao `promptRole`
- [ ] A2.2. Ferramenta 06 (Contrato): adicionar 1-2 exemplos completos
- [ ] A2.3. Ferramenta 03 (Callsheet): adicionar 1-2 exemplos completos
- [ ] A2.4. Ferramenta 09 (Checklist): adicionar 1-2 exemplos completos

### A3. Moodboard — ancorar em referência real

- [ ] A3.1. Adicionar seção em `promptRole` da ferramenta 08 (Moodboard)
- [ ] A3.2. Instrução para citar ≥1 referência específica (diretor de fotografia, colorista, filme)
- [ ] A3.3. Incluir exemplo: "no espírito de Roger Deakins em Blade Runner 2049"
- [ ] A3.4. Considerar aplicar em 01 (Roteiro) e 02 (Decupagem)

### A4. Ponte Orçamento IA → BudgetEntry estruturado

- [ ] A4.1. Decidir entre Opção 1 (parsing de texto) ou Opção 2 (JSON estruturado)
- [ ] A4.2. Se Opção 2: modificar prompt para retornar JSON + markdown
- [ ] A4.3. Criar botão "Usar este orçamento no módulo" na UI de geração
- [ ] A4.4. Implementar extração de totais por categoria
- [ ] A4.5. Integrar com `budgetService.ts` para popular `BudgetEntry`
- [ ] A4.6. Testar fluxo completo: gerar orçamento → extrair → popular banco → visualizar em Budget.tsx

## Fase B — Reclassificar modelo por criticidade

### B1. Refatorar agrupamento em aiService.ts

- [ ] B1.1. Substituir `CALCULATION_TOOLS` / `MARKETING_TOOLS` por criticidade
- [ ] B1.2. Criar constantes: `HIGH_CRITICALITY_TOOLS`, `MEDIUM_CRITICALITY_TOOLS`, `CREATIVE_TOOLS`
- [ ] B1.3. Mapear as 12 ferramentas para os 3 grupos

### B2. Preparar modelos candidatos para teste

- [ ] B2.1. Confirmar disponibilidade de `nvidia/nemotron-3-ultra-550b-a55b:free`
- [ ] B2.2. Confirmar disponibilidade de `qwen/qwen3-next-80b-a3b-instruct:free`
- [ ] B2.3. Listar modelo atual usado para cada ferramenta

### B3. Documentar decisão como ADR

- [ ] B3.1. Adicionar ADR em `ARCHITECTURE.md`: "Roteamento de modelo por criticidade"
- [ ] B3.2. Incluir contexto: free tier até primeiro cliente pagante
- [ ] B3.3. Documentar que é decisão temporária

### B4. Registrar gatilho de revisão

- [ ] B4.1. Adicionar seção em `docs/STATUS.md`: "Gatilho: upgrade de modelo de IA"
- [ ] B4.2. Especificar: "Ao fechar primeiro cliente pagante, revisar grupos de Alta Criticidade"

## Fase C — Temperatura por tipo de tarefa

- [ ] C1. Criar constante `TEMPERATURE_PROFILES` em `aiService.ts`
- [ ] C2. Definir perfis: precision (0.2-0.3), standard (0.5-0.7), creative (0.7-0.8)
- [ ] C3. Criar `TOOL_TEMPERATURE_MAP` associando cada ferramenta a um perfil
- [ ] C4. Modificar função de geração para usar temperatura dinâmica
- [ ] C5. Testar uma ferramenta de cada perfil

## Fase D — Eval mínimo viável

### D1. Criar estrutura de eval

- [ ] D1.1. Criar pasta `server/services/ai/__evals__/`
- [ ] D1.2. Criar arquivo base `eval.schema.json` (estrutura padrão)
- [ ] D1.3. Criar script `npm run eval:ai` em `package.json`

### D2. Escrever casos de teste (3-5 por ferramenta)

- [ ] D2.1. Ferramenta 01 (Roteiro): 3-5 casos
- [ ] D2.2. Ferramenta 02 (Decupagem): 3-5 casos
- [ ] D2.3. Ferramenta 03 (Callsheet): 3-5 casos
- [ ] D2.4. Ferramenta 04 (Orçamento): 3-5 casos
- [ ] D2.5. Ferramenta 05 (Proposta): 3-5 casos
- [ ] D2.6. Ferramenta 06 (Contrato): 3-5 casos
- [ ] D2.7. Ferramenta 07 (Briefing): 3-5 casos
- [ ] D2.8. Ferramenta 08 (Moodboard): 3-5 casos
- [ ] D2.9. Ferramenta 09 (Checklist): 3-5 casos
- [ ] D2.10. Ferramenta 10 (Cronograma): 3-5 casos
- [ ] D2.11. Ferramenta 11 (Entrega): 3-5 casos
- [ ] D2.12. Ferramenta 12 (Assistente Livre): 3-5 casos

### D3. Executar eval comparativo

- [ ] D3.1. Rodar eval com modelos candidatos para Alta Criticidade
- [ ] D3.2. Comparar prompt antigo vs. prompt com upgrades da Fase A
- [ ] D3.3. Documentar resultados em `docs/STATUS.md` com data
- [ ] D3.4. Decidir qual modelo usar para Alta Criticidade baseado em resultados

### D4. Atualizar modelo em produção

- [ ] D4.1. Aplicar decisão de modelo em `aiService.ts` para Alta Criticidade
- [ ] D4.2. Atualizar ADR em `ARCHITECTURE.md` com resultado do eval
- [ ] D4.3. Commitar mudanças

## Fase E — Fechar o loop com uso real

- [ ] E1. Escrever query SQL para extrair métricas de uso por ferramenta
- [ ] E2. Executar query em banco de produção (ou staging se não houver acesso)
- [ ] E3. Identificar ferramentas com:
  - [ ] Alto volume de uso
  - [ ] Baixa taxa de reuso
  - [ ] Rating médio baixo
- [ ] E4. Documentar em `docs/STATUS.md` → seção "Próximas tarefas de IA"
- [ ] E5. Priorizar próximos upgrades baseado em dados reais, não igualmente

## Verificação final

- [ ] Rodar checklist de "pronto":
  - [ ] Prompts de 04/06/03/09/08 revisados com upgrades da Fase A
  - [ ] Comparação via eval antes/depois realizada e documentada
  - [ ] Modelo usado por ferramenta documentado em `ARCHITECTURE.md` como ADR
  - [ ] Temperatura por perfil implementada e testada nas 3 categorias
  - [ ] Pasta de eval existe com ≥3 casos por ferramenta
  - [ ] Resultado comparativo registrado em `docs/STATUS.md`
  - [ ] Decisão tomada sobre ponte Orçamento IA → BudgetEntry estruturado
