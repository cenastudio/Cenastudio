import express from "express";
import * as clientsController from "../controllers/clientsController.js";
import * as interactionsController from "../controllers/interactionsController.js";
import * as opportunitiesController from "../controllers/opportunitiesController.js";
import * as meetingsController from "../controllers/meetingsController.js";
import * as proposalsController from "../controllers/proposalsController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate, requireOperationalPlan);

// Clients
router.get("/stats", clientsController.getClientStats);
router.get("/allowance", clientsController.getAllowance);
router.get("/lookup/cnpj/:cnpj", clientsController.getCompanyByCnpj);

// Opportunities
router.get("/opportunities/stats", opportunitiesController.getPipelineStats);
router.get("/opportunities", opportunitiesController.listOpportunities);
router.get("/opportunities/:id", opportunitiesController.getOpportunity);
router.post("/opportunities", opportunitiesController.createOpportunity);
router.put("/opportunities/:id", opportunitiesController.updateOpportunity);
router.delete("/opportunities/:id", opportunitiesController.deleteOpportunity);

// Interactions
router.get("/interactions/follow-ups", interactionsController.getUpcomingFollowUps);
router.get("/interactions", interactionsController.listInteractions);
router.post("/interactions", interactionsController.createInteraction);
router.put("/interactions/:id", interactionsController.updateInteraction);
router.delete("/interactions/:id", interactionsController.deleteInteraction);

// Meetings
router.get("/meetings", meetingsController.listMeetings);
router.post("/meetings", meetingsController.createMeeting);
router.delete("/meetings/:id", meetingsController.deleteMeeting);

// Proposals
router.get("/proposals", proposalsController.listProposals);
router.get("/proposals/:id", proposalsController.getProposal);
router.post("/proposals", proposalsController.createProposal);
router.delete("/proposals/:id", proposalsController.deleteProposal);

// Generic client routes must stay after nested collections.
router.get("/", clientsController.listClients);
router.get("/:id", clientsController.getClient);
router.post("/", clientsController.createClient);
router.put("/:id", clientsController.updateClient);
router.patch("/:id", clientsController.patchClient);
router.delete("/:id", clientsController.deleteClient);

export default router;
