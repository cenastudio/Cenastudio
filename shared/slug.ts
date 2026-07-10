/**
 * Slugify utility shared between client and server for the white-label
 * pipeline. Produces filename-safe / URL-safe slugs from a display name.
 *
 * Used by:
 *   - client/src/lib/documentFormatter.ts (filename derived from brand name)
 *   - server/controllers/exportController.ts (export filename prefix)
 *   - future brand-asset upload naming
 *
 * Kept in `shared/` (not `client/src/`) so the server can import it too.
 */

/** Converts a display string into a filename/URL-safe slug.
 *  - Normalizes Unicode (removes accents/diacritics)
 *  - Lowercases
 *  - Replaces non-alphanumeric runs with a single `-`
 *  - Trims leading/trailing `-`
 *  - Falls back to "documento" if the result is empty (matches the
 *    behavior of the legacy `safeFilename` helper in documentFormatter.ts). */
export function slugify(input: unknown): string {
  const raw = typeof input === "string" ? input : "";
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "documento";
}
