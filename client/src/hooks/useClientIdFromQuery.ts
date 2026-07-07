import { useSearch } from "wouter";

/**
 * Reads the `clientId` query parameter from the current URL and returns it
 * as a positive integer, or null if the parameter is missing, non-numeric,
 * zero, or negative.
 *
 * Requirements: 4.2, 5.3, 6.4, 9.3
 */
export function useClientIdFromQuery(): number | null {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const raw = params.get("clientId");
  // Reject non-integer strings (e.g. floats like "1.5") before parsing
  if (!raw || !/^-?\d+$/.test(raw)) return null;
  const parsed = parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
