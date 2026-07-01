export function jsonSafe<T>(value: T): T {
  if (typeof value === "bigint") return Number(value) as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (Array.isArray(value)) return value.map((item) => jsonSafe(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]),
    ) as T;
  }
  return value;
}

export function withSnakeCase<T extends Record<string, unknown>>(
  value: T,
  fields: Record<string, string>,
) {
  const safe = jsonSafe(value) as Record<string, unknown>;
  for (const [camelCase, snakeCase] of Object.entries(fields)) {
    if (camelCase in safe) safe[snakeCase] = safe[camelCase];
  }
  return safe;
}
