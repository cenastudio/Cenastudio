import { generateWithAI } from './aiHelper.js';

export interface ChatbotInput {
  question: string;
  context?: {
    currentPage?: string;
    projectId?: number;
    userId?: number;
  };
}

/**
 * Chatbot de ajuda contextual do sistema
 */
export async function chatbotHelp(input: ChatbotInput): Promise<string> {
  let contextInfo = '';

  if (input.context?.currentPage) {
    contextInfo += `Página atual: ${input.context.currentPage}\n`;
  }

  const system = `Você é o assistente virtual do Cena Studio, uma plataforma de gestão para produção audiovisual.

O Cena Studio oferece:
- Gestão de Projetos (criar, editar, acompanhar status)
- Gestão de Clientes (CRM)
- Pipeline de Oportunidades (Kanban)
- Geração de Documentos com IA (roteiros, propostas, contratos)
- Video Reviews (aprovação de vídeos)
- Analytics e Relatórios Comerciais
- Gestão de Equipe (colaboradores)
- Financeiro (entradas e saídas)

Sua função é ajudar os usuários a:
1. Encontrar funcionalidades
2. Entender como usar o sistema
3. Resolver dúvidas rápidas
4. Sugerir melhorias de workflow

Seja amigável, objetivo e útil. Responda em português do Brasil.
Se não souber a resposta, seja honesto e sugira onde procurar.`;

  const prompt = `${contextInfo ? contextInfo + '\n' : ''}Pergunta do usuário: ${input.question}`;

  const response = await generateWithAI(system, prompt);

  return response;
}
