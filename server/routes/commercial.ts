import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { ownerOnly } from '../middleware/teamAccess.js';
import {
  getCommercialDashboard,
  getRevenueTracking,
  getCommercialMetrics,
  getSalesFunnel,
  getSalesForecast,
  getPeriodComparison,
} from '../controllers/commercialController.js';

const router = Router();

// All commercial routes require authentication + owner access (team members blocked)
router.use(authenticate, ownerOnly);

// GET /api/commercial/dashboard - General commercial stats
router.get('/dashboard', getCommercialDashboard);

// GET /api/commercial/metrics - Detailed KPIs and metrics
router.get('/metrics', getCommercialMetrics);

// GET /api/commercial/revenue - Revenue tracking over time
router.get('/revenue', getRevenueTracking);

// GET /api/commercial/forecast - Sales forecast (next 3 months)
router.get('/forecast', getSalesForecast);

// GET /api/commercial/funnel - Sales funnel data
router.get('/funnel', getSalesFunnel);

// GET /api/commercial/comparison - Period-over-period comparison
router.get('/comparison', getPeriodComparison);

export default router;
