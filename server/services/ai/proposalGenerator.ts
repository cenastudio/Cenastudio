import { generateWithAI } from './aiHelper.js';

export interface ProposalInput {
  clientName: string;
  projectName: string;
  projectDescription: string;
  deliverables: string[];
  timeline: string;
  budget: number;
  studioName?: string;
}

/**
 * Gera proposta comercial profissional baseada nos dados do projeto
 */
export async function generateProposal(input: ProposalInput): Promise<string> {
  const system = `Você é um especialista em redação de propostas comerciais para produção audiovisual.
Crie uma proposta profissional, persuasiva e bem estruturada.

A proposta deve ter:
1. Introdução personalizada
2. Entendimento do projeto
3. Conceito criativo
4. Entregas detalhadas
5. Cronograma
6. Investimento
7. Próximos passos

Use tom profissional mas caloroso. Demonstre entusiasmo pelo projeto.
IMPORTANTE: Entregue texto limpo, sem markdown, pronto para copiar e usar.`;

  const deliverablesText = input.deliverables
    .map((d, i) => `${i + 1}. ${d}`)
    .join('\n');

  const prompt = `Crie uma proposta comercial com as seguintes informações:

Cliente: ${input.clientName}
Projeto: ${input.projectName}
${input.studioName ? `Estúdio: ${input.studioName}\n` : ''}
Descrição do Projeto:
${input.projectDescription}

Entregas:
${deliverablesText}

Cronograma: ${input.timeline}
Investimento: R$ ${input.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Por favor, gere uma proposta completa, profissional e persuasiva.`;

  const response = await generateWithAI(system, prompt);

  return response;
}
