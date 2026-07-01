import type { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (!(err instanceof AppError) || status >= 500) {
    logger.error(
      {
        status,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      "Unhandled request error",
    );
  }
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message || "Internal server error";
  res.status(status).json({ success: false, error: message });
};
