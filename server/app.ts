import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import * as checkoutController from "./controllers/checkoutController.js";
import { requireEnvOrThrow } from "./controllers/contactController.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initDatabase } from "./models/db.js";
import passport from "./config/passport.js";
import apiRouter from "./router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let databaseInitialized = false;

function ensureDatabase() {
  if (!databaseInitialized) {
    requireEnvOrThrow();
    initDatabase();
    databaseInitialized = true;
  }
}

export function createApp() {
  ensureDatabase();

  const app = express();
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(passport.initialize());

  app.post(
    "/api/checkout/webhook",
    express.raw({ type: "application/json" }),
    checkoutController.webhook,
  );

  app.use(express.json({ limit: "1mb" }));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
  const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
  const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

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
