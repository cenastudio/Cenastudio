import { generateWithAI } from './aiHelper.js';

export interface InteractionSummaryInput {
  interactionType: string;
  subject: string;
  notes: string;
  date: string;
}

export interface InteractionSummary {
  mainPoints: string[];
  actionItems: string[];
  nextSteps: string[];
  summary: string;
}

/**
 * Sumariza interação com cliente extraindo pontos principais e ações
 */
export async function summarizeInteraction(
  input: InteractionSummaryInput
): Promise<InteractionSummary> {
  const system = `Você é um assistente que analisa reuniões e interações de produção audiovisual.
Sua tarefa é extrair:
- Pontos principais discutidos
- Action items (tarefas a fazer)
- Próximos passos
- Resumo executivo

Seja objetivo e focado em ação.`;

  const prompt = `Tipo de Interação: ${input.interactionType}
Assunto: ${input.subject}
Data: ${input.date}

Notas da Interação:
${input.notes}

Por favor, analise e forneça:
1. Pontos principais (3-5 itens)
2. Action items (tarefas a fazer)
3. Próximos passos
4. Resumo executivo (1 parágrafo)

Formato: Use listas simples com • para cada item.`;

  const response = await generateWithAI(system, prompt);

  // Parse do response
  const result: InteractionSummary = {
    mainPoints: [],
    actionItems: [],
    nextSteps: [],
    summary: '',
  };

  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detectar seções
    if (trimmed.toLowerCase().includes('principais') || trimmed.toLowerCase().includes('pontos')) {
      currentSection = 'main';
      continue;
    } else if (trimmed.toLowerCase().includes('action') || trimmed.toLowerCase().includes('tarefas')) {
      currentSection = 'actions';
      continue;
    } else if (trimmed.toLowerCase().includes('próximos') || trimmed.toLowerCase().includes('passos')) {
      currentSection = 'next';
      continue;
    } else if (trimmed.toLowerCase().includes('resumo') || trimmed.toLowerCase().includes('executivo')) {
      currentSection = 'summary';
      continue;
    }

    // Adicionar conteúdo às seções
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      const content = trimmed.substring(1).trim();
      if (currentSection === 'main') {
        result.mainPoints.push(content);
      } else if (currentSection === 'actions') {
        result.actionItems.push(content);
      } else if (currentSection === 'next') {
        result.nextSteps.push(content);
      }
    } else if (currentSection === 'summary') {
      result.summary += (result.summary ? ' ' : '') + trimmed;
    }
  }

  // Fallback: se não conseguiu parsear, coloca tudo no summary
  if (result.summary === '' && result.mainPoints.length === 0) {
    result.summary = response;
  }

  return result;
}
