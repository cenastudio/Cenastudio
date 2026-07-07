import { generateWithAI } from './aiHelper.js';

export interface ScriptSuggestionsInput {
  briefTitle: string;
  briefDescription: string;
  targetAudience?: string;
  duration?: string;
  tone?: string;
}

export interface ScriptSuggestion {
  title: string;
  description: string;
  scenes: string[];
  narrative: string;
}

/**
 * Gera sugestões de roteiro baseadas no brief do projeto
 */
export async function generateScriptSuggestions(
  input: ScriptSuggestionsInput
): Promise<{ suggestions: ScriptSuggestion[]; rawOutput: string }> {
  const system = `Você é um especialista em roteiros para produção audiovisual.
Sua tarefa é analisar o brief fornecido e sugerir ideias criativas de roteiro.

INSTRUÇÕES:
- Gere 3 sugestões diferentes de roteiro
- Cada sugestão deve ter: título, descrição, cenas principais e narrativa
- Seja criativo mas alinhado com o objetivo do brief
- Considere público-alvo e tom desejado
- Formato de resposta: JSON array de objetos

FORMATO DE RESPOSTA:
[
  {
    "title": "Título da Sugestão",
    "description": "Breve descrição da ideia",
    "scenes": ["Cena 1 descrição", "Cena 2 descrição", "Cena 3 descrição"],
    "narrative": "Estrutura narrativa proposta"
  }
]`;

  let prompt = `Brief do Projeto:
Título: ${input.briefTitle}
Descrição: ${input.briefDescription}`;

  if (input.targetAudience) {
    prompt += `\nPúblico-alvo: ${input.targetAudience}`;
  }

  if (input.duration) {
    prompt += `\nDuração desejada: ${input.duration}`;
  }

  if (input.tone) {
    prompt += `\nTom/Estilo: ${input.tone}`;
  }

  prompt += `\n\nPor favor, gere 3 sugestões criativas de roteiro em formato JSON.`;

  const response = await generateWithAI(system, prompt);

  // Tentar parsear JSON
  let suggestions: ScriptSuggestion[] = [];
  try {
    // Remove markdown code blocks se existirem
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    suggestions = JSON.parse(cleanResponse);
  } catch (error) {
    // Se falhar parse, retornar estrutura padrão com o texto
    suggestions = [{
      title: 'Sugestão Gerada',
      description: 'Veja o output completo abaixo',
      scenes: ['Veja output detalhado'],
      narrative: response
    }];
  }

  return {
    suggestions,
    rawOutput: response
  };
}
