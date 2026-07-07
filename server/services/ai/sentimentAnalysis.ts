import { generateWithAI } from './aiHelper.js';

export interface SentimentInput {
  text: string;
  context?: string;
}

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 a 1
  confidence: number; // 0 a 1
  keywords: string[];
  summary: string;
}

/**
 * Analisa sentimento de feedbacks e comentários de clientes
 */
export async function analyzeSentiment(input: SentimentInput): Promise<SentimentResult> {
  const system = `Você é um especialista em análise de sentimento para produção audiovisual.
Analise o texto fornecido e classifique como:
- positive (cliente satisfeito, feedback positivo)
- neutral (neutro, informativo)
- negative (cliente insatisfeito, problemas)

Responda em formato JSON:
{
  "sentiment": "positive|neutral|negative",
  "score": -1.0 a 1.0,
  "confidence": 0.0 a 1.0,
  "keywords": ["palavra1", "palavra2"],
  "summary": "Breve explicação"
}`;

  let prompt = '';
  if (input.context) {
    prompt += `Contexto: ${input.context}\n\n`;
  }
  prompt += `Texto para analisar:
"${input.text}"

Analise o sentimento e retorne em formato JSON.`;

  const response = await generateWithAI(system, prompt);

  try {
    // Remove markdown code blocks
    const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanResponse);

    return {
      sentiment: parsed.sentiment || 'neutral',
      score: parsed.score || 0,
      confidence: parsed.confidence || 0.5,
      keywords: parsed.keywords || [],
      summary: parsed.summary || 'Análise não disponível',
    };
  } catch (error) {
    // Fallback: análise básica de palavras-chave
    const text = input.text.toLowerCase();
    const positiveWords = ['ótimo', 'excelente', 'maravilhoso', 'perfeito', 'adorei', 'amei', 'parabéns'];
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'problema', 'erro', 'insatisfeito', 'decepcionado'];

    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let score = 0;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = 0.7;
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = -0.7;
    }

    return {
      sentiment,
      score,
      confidence: 0.6,
      keywords: [],
      summary: response,
    };
  }
}
