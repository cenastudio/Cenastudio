import { Request, Response } from 'express';
import { generateScriptSuggestions } from '../services/ai/scriptSuggestions.js';
import { analyzeBudget } from '../services/ai/budgetAnalysis.js';
import { generateProposal } from '../services/ai/proposalGenerator.js';
import { summarizeInteraction } from '../services/ai/interactionSummarizer.js';
import { analyzeSentiment } from '../services/ai/sentimentAnalysis.js';
import { chatbotHelp } from '../services/ai/helpChatbot.js';
import { generateForTool, trackUsage } from '../services/aiService.js';
import { checkAndIncrementUsage } from '../services/authService.js';
import { db } from '../models/db.js';
import { prisma, shouldUsePrisma } from '../models/prisma.js';
import { jsonSafe } from '../utils/prismaSerialization.js';

/**
 * POST /api/ai/generate
 * Gera conteúdo usando uma das 12 ferramentas IA
 */
export async function generate(req: Request, res: Response, next: (err?: unknown) => void) {
  try {
    const userId = req.user!.id;
    const { toolId, input, projectId, model } = req.body;

    await checkAndIncrementUsage(userId, toolId);
    const result = await generateForTool(userId, toolId, input || {}, projectId, model);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/ai/history/:toolId
 * Lista o histórico de gerações de uma ferramenta para o usuário autenticado
 */
export async function getHistory(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { toolId } = req.params;
    const { projectId } = req.query;

    let generations: any[];
    if (shouldUsePrisma) {
      const rows = await prisma.generation.findMany({
        where: {
          userId: BigInt(userId),
          toolId,
          ...(projectId ? { projectId: BigInt(Number(projectId)) } : {}),
        },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      generations = rows.map((row) => {
        const { project, ...rest } = row as any;
        return { ...jsonSafe(rest), projectName: project?.name ?? null };
      });
    } else {
      if (projectId) {
        generations = db
          .prepare(
            `SELECT g.*, p.name as project_name FROM generations g
             LEFT JOIN projects p ON g.project_id = p.id
             WHERE g.user_id = ? AND g.tool_id = ? AND g.project_id = ?
             ORDER BY g.created_at DESC LIMIT 50`,
          )
          .all(userId, toolId, Number(projectId)) as any[];
      } else {
        generations = db
          .prepare(
            `SELECT g.*, p.name as project_name FROM generations g
             LEFT JOIN projects p ON g.project_id = p.id
             WHERE g.user_id = ? AND g.tool_id = ?
             ORDER BY g.created_at DESC LIMIT 50`,
          )
          .all(userId, toolId) as any[];
      }
      // Normalize project_name to camelCase for consistency
      generations = generations.map((g: any) => ({ ...g, projectName: g.project_name ?? null }));
    }

    res.json({ success: true, data: generations });
  } catch (error) {
    console.error('Error in getHistory:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar histórico'
    });
  }
}

/**
 * POST /api/ai/script-suggestions
 * Gera sugestões de roteiro baseadas em brief
 */
export async function scriptSuggestions(req: Request, res: Response) {
  try {
    const { briefTitle, briefDescription, targetAudience, duration, tone } = req.body;

    if (!briefTitle || !briefDescription) {
      return res.status(400).json({
        success: false,
        error: 'briefTitle e briefDescription são obrigatórios'
      });
    }

    const result = await generateScriptSuggestions({
      briefTitle,
      briefDescription,
      targetAudience,
      duration,
      tone,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in scriptSuggestions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar sugestões'
    });
  }
}

/**
 * POST /api/ai/budget-analysis
 * Analisa orçamento e identifica problemas
 */
export async function budgetAnalysis(req: Request, res: Response) {
  try {
    const { projectName, totalBudget, items, projectType } = req.body;

    if (!projectName || !totalBudget || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'projectName, totalBudget e items[] são obrigatórios'
      });
    }

    const result = await analyzeBudget({
      projectName,
      totalBudget,
      items,
      projectType,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in budgetAnalysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao analisar orçamento'
    });
  }
}

/**
 * POST /api/ai/generate-proposal
 * Gera proposta comercial profissional
 */
export async function generateProposalEndpoint(req: Request, res: Response) {
  try {
    const {
      clientName,
      projectName,
      projectDescription,
      deliverables,
      timeline,
      budget,
      studioName
    } = req.body;

    if (!clientName || !projectName || !projectDescription || !deliverables || !timeline || !budget) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: clientName, projectName, projectDescription, deliverables[], timeline, budget'
      });
    }

    const proposal = await generateProposal({
      clientName,
      projectName,
      projectDescription,
      deliverables,
      timeline,
      budget,
      studioName,
    });

    res.json({ success: true, data: { proposal } });
  } catch (error) {
    console.error('Error in generateProposal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar proposta'
    });
  }
}

/**
 * POST /api/ai/summarize-interaction
 * Sumariza interação extraindo pontos principais
 */
export async function summarizeInteractionEndpoint(req: Request, res: Response) {
  try {
    const { interactionType, subject, notes, date } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'notes é obrigatório'
      });
    }

    const summary = await summarizeInteraction({
      interactionType: interactionType || 'Reunião',
      subject: subject || 'Interação com cliente',
      notes,
      date: date || new Date().toISOString(),
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error in summarizeInteraction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao resumir interação'
    });
  }
}

/**
 * POST /api/ai/analyze-sentiment
 * Analisa sentimento de texto
 */
export async function analyzeSentimentEndpoint(req: Request, res: Response) {
  try {
    const { text, context } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text é obrigatório'
      });
    }

    const result = await analyzeSentiment({ text, context });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in analyzeSentiment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao analisar sentimento'
    });
  }
}

/**
 * POST /api/ai/chatbot
 * Chatbot de ajuda contextual
 */
export async function chatbotEndpoint(req: Request, res: Response) {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'question é obrigatória'
      });
    }

    const response = await chatbotHelp({
      question,
      context,
    });

    res.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Error in chatbot:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro no chatbot'
    });
  }
}
