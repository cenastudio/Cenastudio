/**
 * Team Routes
 * Endpoints for managing team members (Studio plan only)
 *
 * POST   /team          - Create team member (admin creates login/password)
 * GET    /team          - List team members
 * PUT    /team/:id      - Update member role/status
 * DELETE /team/:id      - Deactivate member
 * GET    /team/context  - Get current user's team context (is member? role? owner?)
 */

import { Router, type RequestHandler } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { requireOperationalPlan } from "../middleware/planAccess.js";
import {
  createTeamMember,
  listTeamMembers,
  updateTeamMember,
  removeTeamMember,
  getTeamMemberContext,
  type TeamRole,
} from "../services/teamService.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();

// All team routes require auth
router.use(authenticate);

/**
 * GET /team/context
 * Returns the current user's team context — used by frontend to decide what to show
 */
const getContext: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const context = await getTeamMemberContext(userId);
    res.json({ success: true, data: context });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /team
 * List all team members (only workspace owners can call this)
 */
const list: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const context = await getTeamMemberContext(userId);
    if (context?.isTeamMember) {
      throw new AppError("Apenas o administrador pode gerenciar a equipe.", 403);
    }
    const members = await listTeamMembers(userId);
    res.json({ success: true, data: members });
  } catch (e) {
    next(e);
  }
};

/**
 * POST /team
 * Create a new team member account
 */
const create: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const context = await getTeamMemberContext(userId);
    if (context?.isTeamMember) {
      throw new AppError("Apenas o administrador pode criar membros.", 403);
    }

    const { name, email, password, role } = req.body;
    const validRoles: TeamRole[] = ["producer", "editor", "viewer"];
    if (role && !validRoles.includes(role)) {
      throw new AppError(`Role inválida. Use: ${validRoles.join(", ")}`, 400);
    }

    const member = await createTeamMember(userId, {
      name,
      email,
      password,
      role: role || "editor",
    });

    res.status(201).json({ success: true, data: member });
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /team/:id
 * Update team member role or status
 */
const update: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberId = parseInt(req.params.id);
    if (!memberId) throw new AppError("ID do membro é obrigatório.", 400);

    const context = await getTeamMemberContext(userId);
    if (context?.isTeamMember) {
      throw new AppError("Apenas o administrador pode atualizar membros.", 403);
    }

    const { role, status } = req.body;
    const updated = await updateTeamMember(userId, memberId, { role, status });
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

/**
 * DELETE /team/:id
 * Deactivate a team member
 */
const remove: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberId = parseInt(req.params.id);
    if (!memberId) throw new AppError("ID do membro é obrigatório.", 400);

    const context = await getTeamMemberContext(userId);
    if (context?.isTeamMember) {
      throw new AppError("Apenas o administrador pode remover membros.", 403);
    }

    await removeTeamMember(userId, memberId);
    res.json({ success: true, message: "Membro removido com sucesso." });
  } catch (e) {
    next(e);
  }
};

// Register routes (context first since it doesn't need plan gate)
router.get("/context", getContext);
router.get("/", requireOperationalPlan, list);
router.post("/", requireOperationalPlan, create);
router.put("/:id", requireOperationalPlan, update);
router.delete("/:id", requireOperationalPlan, remove);

export default router;
