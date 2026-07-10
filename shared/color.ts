/**
 * Color utilities shared between client and server for the white-label
 * pipeline. Parses hex colors robustly, produces RGB tuples and rgba
 * strings, and never throws on invalid input (returns null/fallback).
 *
 * Used by:
 *   - shared/site.ts (validate APP_PRIMARY_COLOR env)
 *   - client/src/lib/design-system/apply-tokens.ts (derive rgba() from primaryColor)
 *   - client/src/lib/documentFormatter.ts (PDF/DOCX brand color)
 *   - server (email templates, ICS)
 */

const HEX_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Validates a hex color string. Accepts `#RGB` and `#RRGGBB`, case-insensitive.
 *  The leading `#` is optional. Empty or non-hex input returns false. */
export function isValidHex(color: unknown): boolean {
  if (typeof color !== "string" || color.length === 0) return false;
  return HEX_REGEX.test(color.trim());
}

/** Parses a hex color into an [r, g, b] tuple of 0-255 integers.
 *  Returns null for invalid input (does not throw). */
export function parseHexColor(hex: unknown): [number, number, number] | null {
  if (!isValidHex(hex)) return null;
  const raw = (hex as string).trim().replace(/^#/, "");
  // Expand shorthand #abc → #aabbcc.
  const full = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

/** Returns "R, G, B" (no parens, no rgb prefix) for use in CSS custom
 *  properties like `--ds-orange-rgb: 232, 80, 2;`. Falls back to
 *  "0, 0, 0" on invalid input. */
export function colorToRgbString(hex: unknown): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return "0, 0, 0";
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

/** Returns a `rgba(R, G, B, alpha)` string. Alpha is clamped to [0, 1].
 *  Invalid hex falls back to rgba(0, 0, 0, alpha). */
export function hexToRgba(hex: unknown, alpha: number): string {
  const clampedAlpha = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 0));
  const rgb = parseHexColor(hex) ?? [0, 0, 0];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${clampedAlpha})`;
}
