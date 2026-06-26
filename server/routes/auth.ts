import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../schemas/auth.js";
import passport, { isGitHubAuthConfigured } from "../config/passport.js";

const router = Router();

router.post("/login", validateBody(loginSchema), authController.login);
router.post("/register", validateBody(registerSchema), authController.register);
router.post("/forgot-password", validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), authController.resetPassword);
router.post("/logout", authController.logout);
router.post("/supabase", authController.supabaseLogin);
router.get("/me", authenticate, authController.me);
router.put("/profile", authenticate, authController.updateProfile);

// GitHub OAuth routes for admin login
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
