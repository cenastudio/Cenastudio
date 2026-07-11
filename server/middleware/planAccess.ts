import type { RequestHandler } from "express";
import type { FeatureFlagId } from "../../shared/planEntitlements.js";
import { AppError } from "./errorHandler.js";
import { requireFeature, requireOperationalAccess } from "../services/entitlementService.js";

export const requireOperationalPlan: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    await requireOperationalAccess(req.user.id, req.user.role);
    next();
  } catch (error) {
    next(error);
  }
};

/** Gates a route behind the Studio plan entitlement for `feature` (admin bypasses). */
export const requireStudioPlan = (feature: FeatureFlagId): RequestHandler => async (req, _res, next) => {
  try {
    if (!req.user) throw new AppError("Unauthorized", 401);
    await requireFeature(req.user.id, req.user.role, feature);
    next();
  } catch (error) {
    next(error);
  }
};
