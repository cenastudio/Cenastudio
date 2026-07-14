import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";import { validateBody } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.js";
import passport, { isGitHubAuthConfigured } from "../config/passport.js";

const router = Router();

router.get("/providers", authController.providers);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/register", validateBody(registerSchema), authController.register);
router.post("/forgot-password", validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), authController.resetPassword);
router.post("/logout", authController.logout);
router.post("/supabase", authController.supabaseLogin);
router.get("/me", authenticate, authController.me);
router.get("/usage-metrics", authenticate, authController.getUsageMetrics);
router.put("/profile", authenticate, authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);
router.get("/export-data", authenticate, authController.exportUserData);

// ═══ LGPD / GDPR ROUTES ═══
router.get("/data-stats", authenticate, authController.getDataStats);
router.get("/privacy-settings", authenticate, authController.getPrivacySettings);
router.put("/privacy-settings", authenticate, authController.updatePrivacySettings);
router.post("/lgpd-request", authenticate, authController.createLgpdRequest);
router.get("/lgpd-requests", authenticate, authController.listLgpdRequests);
router.get("/export-data", authenticate, authController.exportData);

// ═══ SECURITY ADVANCED: 2FA ═══
router.post("/2fa/setup", authenticate, authController.setup2FA);
router.post("/2fa/verify", authenticate, authController.verify2FA);
router.post("/2fa/disable", authenticate, authController.disable2FA);

// ═══ SECURITY ADVANCED: API KEYS ═══
router.post("/api-keys", authenticate, authController.createApiKey);
router.get("/api-keys", authenticate, authController.listApiKeys);
router.delete("/api-keys/:id", authenticate, authController.revokeApiKey);

// ═══ SECURITY ADVANCED: ACTIVITY LOG & ALERTS ═══
router.get("/activity", authenticate, authController.getActivityLog);
router.get("/security-alerts", authenticate, authController.getSecurityAlerts);
router.put("/security-alerts", authenticate, authController.updateSecurityAlerts);

// ═══ PREFERENCES ADVANCED (SPRINT 3) ═══
router.get("/notification-preferences", authenticate, authController.getNotificationPreferences);
router.put("/notification-preferences", authenticate, authController.updateNotificationPreferences);
router.get("/regional-preferences", authenticate, authController.getRegionalPreferences);
router.put("/regional-preferences", authenticate, authController.updateRegionalPreferences);
router.get("/visual-preferences", authenticate, authController.getVisualPreferences);
router.put("/visual-preferences", authenticate, authController.updateVisualPreferences);
router.get("/behavior-preferences", authenticate, authController.getBehaviorPreferences);
router.put("/behavior-preferences", authenticate, authController.updateBehaviorPreferences);

// GitHub OAuth routes for users; admin is granted only by explicit email policy.
router.get("/github", (req, res, next) => {
  if (!isGitHubAuthConfigured) {
    res.status(503).json({ success: false, error: "GitHub OAuth is not configured" });
    return;
  }
  passport.authenticate("github", { scope: ["user:email"], session: false })(req, res, next);
});
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login", session: false }),
  authController.githubCallback,
);

export default router;
