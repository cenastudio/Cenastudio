import express from "express";
import * as clientsController from "../controllers/clientsController.js";
import * as interactionsController from "../controllers/interactionsController.js";
import * as opportunitiesController from "../controllers/opportunitiesController.js";
import * as meetingsController from "../controllers/meetingsController.js";
import * as proposalsController from "../controllers/proposalsController.js";
import * as clientPortalAccessController from "../controllers/clientPortalAccessController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan, requireStudioPlan } from "../middleware/planAccess.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate, requireOperationalPlan);

// Clients — CRM básico is included in every plan (Free included).
router.get("/stats", clientsController.getClientStats);
router.get("/allowance", clientsController.getAllowance);
router.get("/lookup/cnpj/:cnpj", clientsController.getCompanyByCnpj);

// Portal do Cliente — gestão do acesso pela produtora (spec: portal-do-cliente).
// Disponível em todos os planos, limitado por clientPortalLimit (não é feature-gated).
router.get("/portal-access/allowance", clientPortalAccessController.getPortalAllowance);
router.get("/:id/portal-access", clientPortalAccessController.getPortalAccessStatus);
router.post("/:id/portal-access", clientPortalAccessController.createPortalAccess);
router.patch("/:id/portal-access", clientPortalAccessController.updatePortalAccessStatus);
router.post("/:id/portal-access/reset-password", clientPortalAccessController.resetPortalPassword);

// Opportunities (sales pipeline) — advertised as a Pro+ feature.
const pipelineGate = requireStudioPlan("pipeline");
router.get("/opportunities/stats", pipelineGate, opportunitiesController.getPipelineStats);
router.get("/opportunities", pipelineGate, opportunitiesController.listOpportunities);
router.get("/opportunities/:id", pipelineGate, opportunitiesController.getOpportunity);
router.post("/opportunities", pipelineGate, opportunitiesController.createOpportunity);
router.put("/opportunities/:id", pipelineGate, opportunitiesController.updateOpportunity);
router.delete("/opportunities/:id", pipelineGate, opportunitiesController.deleteOpportunity);

// Interactions — part of the same Pro+ pipeline feature ("CRM completo + pipeline comercial").
router.get("/interactions/follow-ups", pipelineGate, interactionsController.getUpcomingFollowUps);
router.get("/interactions", pipelineGate, interactionsController.listInteractions);
router.post("/interactions", pipelineGate, interactionsController.createInteraction);
router.put("/interactions/:id", pipelineGate, interactionsController.updateInteraction);
router.delete("/interactions/:id", pipelineGate, interactionsController.deleteInteraction);

// Meetings — used from the client detail page for any plan, not part of the
// Pro+ pipeline gate.
router.get("/meetings", meetingsController.listMeetings);
router.post("/meetings", meetingsController.createMeeting);
router.patch("/meetings/:id/portal-visibility", meetingsController.updatePortalVisibility);
router.post("/meetings/:id/cancel", meetingsController.cancelMeeting);
router.delete("/meetings/:id", meetingsController.deleteMeeting);

// Proposals ("Portal do cliente com aprovações") — advertised as a Pro+ feature.
const proposalsGate = requireStudioPlan("proposals");
router.get("/proposals", proposalsGate, proposalsController.listProposals);
router.get("/proposals/:id", proposalsGate, proposalsController.getProposal);
router.post("/proposals/from-budget", proposalsGate, proposalsController.createDraftFromBudget);
router.post("/proposals", proposalsGate, proposalsController.createProposal);
router.post("/proposals/:id/send", proposalsGate, proposalsController.sendProposalToClient);
router.patch("/proposals/:id/portal-visibility", proposalsGate, proposalsController.updatePortalVisibility);
router.post("/proposals/:id/revoke", proposalsGate, proposalsController.revokeProposal);
router.delete("/proposals/:id", proposalsGate, proposalsController.deleteProposal);

// Generic client routes must stay after nested collections.
router.get("/", clientsController.listClients);
router.get("/:id", clientsController.getClient);
router.post("/", clientsController.createClient);
router.put("/:id", clientsController.updateClient);
router.patch("/:id", clientsController.patchClient);
router.delete("/:id", clientsController.deleteClient);

export default router;
