import type { ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const candidateStatus = err instanceof AppError ? err.status : 500;
  const status = Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus <= 599
    ? candidateStatus
    : 500;
  const unexpected = !(err instanceof AppError) || status >= 500;
  const requestId = res.locals.requestId ?? randomUUID();

  if (unexpected) {
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    logger.error(
      {
        status,
        requestId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      "Unhandled request error",
    );
  }
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Nao foi possivel concluir esta acao. Tente novamente."
      : err.message || "Internal server error";
  res.status(status).json({
    success: false,
    error: message,
    ...(unexpected ? { requestId } : {}),
  });
};
