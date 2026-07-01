type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  return level === "debug" || level === "info" || level === "warn" || level === "error"
    ? level
    : "info";
}

function shouldLog(level: LogLevel) {
  return LEVELS[level] >= LEVELS[configuredLevel()];
}

function normalizeContext(context?: Record<string, unknown>) {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeContext(context),
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (context: Record<string, unknown> | undefined, message: string) =>
    write("debug", message, context),
  info: (context: Record<string, unknown> | undefined, message: string) =>
    write("info", message, context),
  warn: (context: Record<string, unknown> | undefined, message: string) =>
    write("warn", message, context),
  error: (context: Record<string, unknown> | undefined, message: string) =>
    write("error", message, context),
};
