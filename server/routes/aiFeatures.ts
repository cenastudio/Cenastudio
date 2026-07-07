import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  scriptSuggestions,
  budgetAnalysis,
  generateProposalEndpoint,
  summarizeInteractionEndpoint,
  analyzeSentimentEndpoint,
  chatbotEndpoint,
} from '../controllers/aiController.js';

const router = Router();

// Todas rotas requerem autenticação
router.use(authenticate);

// POST /api/ai-features/script-suggestions
router.post('/script-suggestions', scriptSuggestions);

// POST /api/ai-features/budget-analysis
router.post('/budget-analysis', budgetAnalysis);

// POST /api/ai-features/generate-proposal
router.post('/generate-proposal', generateProposalEndpoint);

// POST /api/ai-features/summarize-interaction
router.post('/summarize-interaction', summarizeInteractionEndpoint);

// POST /api/ai-features/analyze-sentiment
router.post('/analyze-sentiment', analyzeSentimentEndpoint);

// POST /api/ai-features/chatbot
router.post('/chatbot', chatbotEndpoint);

export default router;
