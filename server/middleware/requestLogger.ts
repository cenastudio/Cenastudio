import type { RequestHandler } from "express";
import { logger } from "../utils/logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        userId: req.user?.id,
      },
      "HTTP request",
    );
  });

  next();
};
