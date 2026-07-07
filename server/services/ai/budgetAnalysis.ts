import { generateWithAI } from './aiHelper.js';

export interface BudgetItem {
  category: string;
  description: string;
  cost: number;
}

export interface BudgetAnalysisInput {
  projectName: string;
  totalBudget: number;
  items: BudgetItem[];
  projectType?: string;
}

export interface BudgetAnalysisResult {
  overallAssessment: string;
  warnings: string[];
  suggestions: string[];
  optimizations: Array<{
    item: string;
    currentCost: number;
    suggestedCost: number;
    reason: string;
  }>;
  rawOutput: string;
}

/**
 * Analisa orçamento do projeto e identifica problemas/oportunidades
 */
export async function analyzeBudget(
  input: BudgetAnalysisInput
): Promise<BudgetAnalysisResult> {
  const system = `Você é um especialista em orçamento de produção audiovisual.
Analise o orçamento fornecido e identifique:
- Itens fora da média de mercado
- Possíveis otimizações
- Riscos de estouro de orçamento
- Sugestões de melhoria

Seja específico e baseado em valores reais de mercado brasileiro.`;

  const itemsList = input.items
    .map((item) => `- ${item.category}: ${item.description} - R$ ${item.cost.toFixed(2)}`)
    .join('\n');

  const prompt = `Projeto: ${input.projectName}
${input.projectType ? `Tipo: ${input.projectType}\n` : ''}Orçamento Total: R$ ${input.totalBudget.toFixed(2)}

Itens do Orçamento:
${itemsList}

Por favor, analise este orçamento e forneça:
1. Avaliação geral
2. Alertas sobre itens problemáticos
3. Sugestões de otimização
4. Comparação com valores de mercado`;

  const response = await generateWithAI(system, prompt);

  // Parse básico do response para estrutura
  const result: BudgetAnalysisResult = {
    overallAssessment: '',
    warnings: [],
    suggestions: [],
    optimizations: [],
    rawOutput: response,
  };

  // Tentar extrair informações estruturadas
  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().includes('avaliação') || trimmed.toLowerCase().includes('geral')) {
      currentSection = 'assessment';
    } else if (trimmed.toLowerCase().includes('alerta') || trimmed.toLowerCase().includes('atenção')) {
      currentSection = 'warnings';
    } else if (trimmed.toLowerCase().includes('sugestões') || trimmed.toLowerCase().includes('recomendações')) {
      currentSection = 'suggestions';
    }

    if (currentSection === 'assessment' && result.overallAssessment === '') {
      result.overallAssessment = trimmed;
    } else if (currentSection === 'warnings' && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
      result.warnings.push(trimmed.substring(1).trim());
    } else if (currentSection === 'suggestions' && (trimmed.startsWith('-') || trimmed.startsWith('•'))) {
      result.suggestions.push(trimmed.substring(1).trim());
    }
  }

  // Se não conseguiu parsear, pelo menos coloca o texto todo na avaliação
  if (result.overallAssessment === '') {
    result.overallAssessment = response;
  }

  return result;
}
