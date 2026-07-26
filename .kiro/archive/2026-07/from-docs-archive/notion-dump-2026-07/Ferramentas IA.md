# Ferramentas IA

> As 12 ferramentas de produção audiovisual com inteligência artificial

---

## Visão Geral

O Cena Studio oferece **12 ferramentas IA** especializadas para produção audiovisual. Cada ferramenta é definida em `shared/tools.ts` com um system prompt otimizado para o domínio.

**Providers:** OpenRouter (gratuito - padrão), Anthropic Claude (pago - fallback), NVIDIA (pago - fallback)
**API:** `POST /api/ai/generate` com `{ toolId, input }`

---

## 🎬 01 — Gerador de Roteiro
- **Slug:** `roteiro`
- **Categoria:** Pré-produção
- **Tags:** Ficção, Publicidade, Institucional, Publicitário
- **O que faz:** Recebe uma ideia e gera roteiro formatado em padrão ABNT/Hollywood com diálogos, indicações técnicas e timecode
- **Tempo:** < 2 minutos
- **Prompt:** Roteirista profissional com experiência em cinema, TV e publicidade. Gera numeração de cenas, slug line, ação descritiva, diálogos, indicações de câmera, direção de arte, figurino, trilha sonora e duração estimada

---

## 🎞 02 — Decupagem Técnica
- **Slug:** `decupagem`
- **Categoria:** Direção
- **Tags:** Direção, DOP, Planejamento, Plano
- **O que faz:** Transforma roteiro em plano de filmagem com planos, movimentos de câmera, lentes e tempo estimado
- **Tempo:** < 3 minutos
- **Prompt:** Diretor de fotografia e AD. Tipos de plano, movimentos de câmera, lentes, iluminação, tempo estimado, lista de equipamentos e observações de segurança

---

## 📋 03 — Callsheet Inteligente
- **Slug:** `callsheet`
- **Categoria:** Produção
- **Tags:** Produção, Logística, Equipe, Set
- **O que faz:** Gera callsheet profissional com contatos, horários, locações e necessidades técnicas
- **Tempo:** < 1 minuto
- **Prompt:** Produtor executivo. Título, data, call time, locação, cenas, elenco, equipe por departamento, necessidades técnicas, refeições, transporte, emergência

---

## 💰 04 — Orçamento Automático
- **Slug:** `orcamento`
- **Categoria:** Comercial
- **Tags:** Comercial, Produtora, Freelance
- **O que faz:** Monta orçamentos realistas em BRL com diárias, equipamentos, equipe e pós
- **Tempo:** < 2 minutos
- **Prompt:** Produtor de orçamento. Pré-produção, produção (equipe, equipamentos), pós-produção, taxas (ISS, FGTS), reserva para imprevistos (10-15%). Valores de mercado brasileiro

---

## 💼 05 — Proposta Comercial
- **Slug:** `proposta`
- **Categoria:** Vendas
- **Tags:** Vendas, Cliente, Contrato
- **O que faz:** Gera propostas persuasivas com escopo, cronograma, valor e termos de pagamento
- **Tempo:** < 1 minuto
- **Prompt:** Diretor comercial sênior. Capa, introdução, escopo, cronograma, equipe, valores em BRL, condições de pagamento, cessão de direitos, garantias

---

## 📄 06 — Contratos
- **Slug:** `contrato`
- **Categoria:** Jurídico
- **Tags:** Jurídico, Proteção
- **O que faz:** Gera rascunhos de contratos de serviço, cessão de imagem, trilha e NDA
- **Tempo:** < 2 minutos
- **Prompt:** Especialista em direito audiovisual. Cláusulas de credenciamento, objeto, direitos/obrigações, cronograma, pagamento, cessão de imagem/áudio, confidencialidade

> [!warning] Revisão Legal
> Contratos gerados são **rascunhos de referência**. Revise com advogado especializado antes de assinar.

---

## 📝 07 — Briefing Inteligente
- **Slug:** `briefing`
- **Categoria:** Atendimento
- **Tags:** Discovery, Atendimento
- **O que faz:** Extrai e organiza informações do cliente (conversas, emails, notas) em briefing estruturado
- **Tempo:** < 1 minuto
- **Prompt:** Estrategista de conteúdo. Objetivo, público-alvo, tom e estilo, entregáveis, cronograma, orçamento, riscos, referências

---

## 🎨 08 — Moodboard & Look
- **Slug:** `moodboard`
- **Categoria:** Arte
- **Tags:** Arte, Look, Cor
- **O que faz:** Gera paleta de cores, referências visuais, iluminação e prompts para geração de imagens
- **Tempo:** < 2 minutos
- **Prompt:** Diretor de arte. Paleta HEX/RGB, luz, composição, referências de cinema, texturas, tipografia, prompts para Stable Diffusion/Midjourney/DALL-E

---

## ✅ 09 — Checklist de Set
- **Slug:** `checklist`
- **Categoria:** Produção
- **Tags:** Set, Câmera, Áudio
- **O que faz:** Lista completa de câmera, áudio, iluminação e produção para o dia de filmagem
- **Tempo:** < 1 minuto
- **Prompt:** Coordenador de produção. Checklist por departamento

---

## 📅 10 — Cronograma
- **Slug:** `cronograma`
- **Categoria:** Gestão
- **Tags:** Gestão, Prazo
- **O que faz:** Planejamento com fases de pré-produção, filmagem, pós e entrega
- **Tempo:** < 2 minutos
- **Prompt:** Gerente de projetos audiovisuais. Fases, marcos, dependências e buffer de risco

---

## 📊 11 — Relatório de Entrega
- **Slug:** `entrega`
- **Categoria:** Pós-produção
- **Tags:** Pós-prod, Arquivo, Entrega
- **O que faz:** Documenta o projeto com specs técnicas, arquivos entregues e notas
- **Tempo:** < 2 minutos
- **Prompt:** Supervisor de pós-produção. Lista de arquivos, codecs, pendências

---

## ✦ 12 — Assistente Livre
- **Slug:** `assistente`
- **Categoria:** IA
- **Tags:** IA, Chat, Dúvidas
- **O que faz:** Chat livre sobre produção, câmera, carreira ou qualquer dúvida do set
- **Tempo:** Resposta em segundos
- **Prompt:** Assistente IA especializado em produção audiovisual e negócios criativos no Brasil

---

## Configuração dos Providers

| Variável | Descrição |
|----------|-----------|
| `AI_PROVIDER` | `openrouter` (gratuito), `anthropic` ou `nvidia` |
| `OPENROUTER_API_KEY` | Chave da API OpenRouter |
| `OPENROUTER_MODEL` | Modelo (default: `openrouter/free`) |
| `OPENROUTER_MAX_TOKENS` | Tokens máximos (default: 4096) |
| `OPENROUTER_FREE_LIMIT` | Limite requisições/dia (default: 50) |
| `FALLBACK_AI_PROVIDER` | Provider alternativo quando limite atingido |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic |
| `ANTHROPIC_MODEL` | Modelo (default: `claude-sonnet-4-20250514`) |
| `NVIDIA_API_KEY` | Chave da API NVIDIA |
| `NVIDIA_MODEL` | Modelo (default: `nvidia/nemotron-3-ultra-550b-a55b`) |

**OpenRouter:** Modelos gratuitos via router (`openrouter/free`) - 50 requisições/dia no plano free. **Fallback automático** para Anthropic/NVIDIA quando atinge limite.

**Anthropic/NVIDIA:** Modelos pagos com melhor qualidade

Veja [[Setup & Configuração]] para detalhes completos.

---

## Fluxo Técnico

```
Usuário preenche campos → POST /api/ai/generate
    → authenticate middleware (JWT)
    → aiController valida input
    → aiService seleciona provider (openrouter/anthropic/nvidia)
    → Envia system prompt (tool.promptRole) + user input
    → Salva em generations (com project_id se houver)
    → Retorna output para o frontend
```

---

#ferramentas #ia #tools #producao
