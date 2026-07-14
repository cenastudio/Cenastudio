import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import * as checkoutController from "./controllers/checkoutController.js";
import { requireEnvOrThrow } from "./controllers/contactController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { initDatabase } from "./models/db.js";
import { initPrismaCoreData } from "./models/prismaSeed.js";
import passport from "./config/passport.js";
import { assertLaunchReadyEnvironment } from "./config/launchGuards.js";
import apiRouter from "./router.js";
import healthRoutes from "./routes/health.js";
import { shouldUsePrisma } from "./models/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let databaseInitialized = false;
let prismaCoreReady: Promise<void> | null = null;
let sqliteInitReady: Promise<void> | null = null;

function ensureDatabase() {
  if (!databaseInitialized) {
    assertLaunchReadyEnvironment();
    requireEnvOrThrow();
    if (!shouldUsePrisma) {
      sqliteInitReady = initDatabase();
    }
    if (shouldUsePrisma) {
      prismaCoreReady = initPrismaCoreData();
    } else {
      prismaCoreReady = Promise.resolve();
    }
    databaseInitialized = true;
  }
}

// Force rebuild: 2026-07-04 15:45 - URGENT FIX FOR PRESENTATION
type SpaRequestLike = { path: string };
type SpaResponseLike = {
  setHeader: (name: string, value: string) => void;
  sendFile: (filePath: string) => void;
};

// Serve the SPA shell. Every route other than the public landing page ("/")
// is a private, authenticated area that must never be indexed, so it carries
// an explicit X-Robots-Tag alongside the client-side <meta> hints. Extracted
// as a named handler so the robots policy can be unit tested without booting
// the full production app (which requires the launch-ready env guards).
export function createSpaFallbackHandler(staticPath: string) {
  return (req: SpaRequestLike, res: SpaResponseLike) => {
    if (req.path !== "/") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    res.sendFile(path.join(staticPath, "index.html"));
  };
}

export function createApp() {
  ensureDatabase();

  const app = express();
  app.set("trust proxy", 1);
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
        frameSrc: ["'self'", "https://drive.google.com", "https://*.stripe.com"],
        mediaSrc: ["'self'", "blob:", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://*.stripe.com"],
        frameAncestors: ["'none'"],
      },
    },
  }));
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(async (_req, _res, next) => {
    try {
      if (sqliteInitReady) await sqliteInitReady;
      await prismaCoreReady;
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(requestLogger);
  app.use(healthRoutes);
  app.use("/api", healthRoutes); // Also mount under /api for consistency

  app.post(
    "/api/checkout/webhook",
    express.raw({ type: "application/json" }),
    checkoutController.webhook,
  );

  // Increased limit for video uploads (base64 has ~33% overhead)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));

  const tooManyRequestsHandler = (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: "Muitas tentativas no servidor. Aguarde alguns segundos e tente novamente.",
    });
  };
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    skip: (req) => req.method === "GET",
    handler: tooManyRequestsHandler,
  });
  const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, handler: tooManyRequestsHandler });
  const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, handler: tooManyRequestsHandler });
  // Admin routes carry destructive power (suspend, plan/subscription changes,
  // password resets, deletes) — a tighter limit than the general API makes a
  // compromised/leaked admin session much less useful to an attacker doing
  // bulk damage, without getting in the way of normal admin usage.
  const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, handler: tooManyRequestsHandler });

  app.use("/api/auth", authLimiter);
  app.use("/api/ai", aiLimiter);
  app.use("/api/contact", formLimiter);
  app.use("/api/checkout", formLimiter);
  app.use("/api/admin", adminLimiter);

  app.use("/api", apiRouter);

  // In Vercel, static files are served directly by the platform
  // Only serve static files in non-Vercel environments
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", createSpaFallbackHandler(staticPath));
  }

  app.use(errorHandler);

  return app;
}
