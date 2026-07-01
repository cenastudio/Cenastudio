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

function ensureDatabase() {
  if (!databaseInitialized) {
    assertLaunchReadyEnvironment();
    requireEnvOrThrow();
    if (!shouldUsePrisma) initDatabase();
    prismaCoreReady = initPrismaCoreData();
    databaseInitialized = true;
  }
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
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:"],
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
      await prismaCoreReady;
      next();
    } catch (error) {
      next(error);
    }
  });
  app.use(requestLogger);
  app.use(healthRoutes);

  app.post(
    "/api/checkout/webhook",
    express.raw({ type: "application/json" }),
    checkoutController.webhook,
  );

  app.use(express.json({ limit: "1mb" }));

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

  app.use("/api/auth", authLimiter);
  app.use("/api/ai", aiLimiter);
  app.use("/api/contact", formLimiter);
  app.use("/api/checkout", formLimiter);

  app.use("/api", apiRouter);

  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  app.use(errorHandler);

  return app;
}
