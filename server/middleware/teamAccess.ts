/**
 * Team Access Middleware
 * Blocks team members from accessing routes reserved for workspace owners
 * (commercial, finance, analytics, clients management)
 */

import type { RequestHandler } from "express";
import { AppError } from "./errorHandler.js";
import { getTeamMemberContext } from "../services/teamService.js";

/**
 * Blocks access for team members — only workspace owners can proceed
 */
export const ownerOnly: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401));
    }

    const context = await getTeamMemberContext(req.user.id);
    if (context?.isTeamMember) {
      return next(
        new AppError("Acesso restrito ao administrador do estúdio.", 403),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Allows access only if user is a team member with one of the specified roles
 */
export function requireTeamRole(...allowedRoles: string[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new AppError("Unauthorized", 401));
      }

      const context = await getTeamMemberContext(req.user.id);

      // Owners can always access everything
      if (!context?.isTeamMember) {
        return next();
      }

      // Check if team member has the required role
      if (context.role && allowedRoles.includes(context.role)) {
        return next();
      }

      return next(
        new AppError("Você não tem permissão para acessar este recurso.", 403),
      );
    } catch (error) {
      next(error);
    }
  };
}
