import { useState } from "react";
import { SITE_CONFIG } from "@shared/site";

/**
 * Renders the current deploy's brand mark. In Fase 3, `SITE_CONFIG` is
 * env-driven, so this component reflects `APP_NAME` / `APP_NAME_PARTS` /
 * `APP_LOGO_URL` without touching individual call sites.
 *
 * Modes:
 *   variant="wordmark" (default) — text-only. Renders `brandNameParts`
 *                                   as two spans when present, else
 *                                   `brandName` as a single span.
 *   variant="image"              — renders `<img src={logoUrl}>`. Falls
 *                                   back to wordmark if the image errors
 *                                   or `logoUrl` is empty.
 */

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  variant?: "wordmark" | "image";
  tone?: "auto" | "onDark";
}

export default function BrandLogo({
  compact = false,
  className = "",
  variant = "wordmark",
  tone = "auto",
}: BrandLogoProps) {
  const [imageErrored, setImageErrored] = useState(false);
  const textTone = tone === "onDark" ? "text-[var(--ds-white)]" : "text-frame-white";
  const useImage = variant === "image" && !!SITE_CONFIG.logoUrl && !imageErrored;

  if (useImage) {
    return (
      <img
        src={SITE_CONFIG.logoUrl}
        alt={SITE_CONFIG.brandName}
        className={`brand-logo-image ${compact ? "brand-logo-image--compact" : ""} ${className}`}
        onError={() => setImageErrored(true)}
      />
    );
  }

  const parts = SITE_CONFIG.brandNameParts;

  return (
    <span
      className={`brand-wordmark ${compact ? "brand-wordmark--compact" : ""} ${className}`}
      aria-label={SITE_CONFIG.brandName}
    >
      {parts ? (
        <>
          <span className={`brand-wordmark-cena ${textTone}`}>{parts[0]}</span>
          <span className="brand-wordmark-dot" aria-hidden="true" />
          <span className={`brand-wordmark-studio ${textTone}`}>{parts[1]}</span>
        </>
      ) : (
        <span className={`brand-wordmark-cena ${textTone}`}>
          {SITE_CONFIG.brandName}
        </span>
      )}
    </span>
  );
}
