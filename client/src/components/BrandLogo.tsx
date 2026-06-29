interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  useImage?: boolean;
  tone?: "auto" | "onDark";
}

export default function BrandLogo({ compact = false, className = "", tone = "auto" }: BrandLogoProps) {
  const textTone = tone === "onDark" ? "text-[#f9f9f9]" : "text-frame-white";

  return (
    <span className={`brand-wordmark ${compact ? "brand-wordmark--compact" : ""} ${className}`} aria-label="Cena Studio">
      <span className={`brand-wordmark-cena ${textTone}`}>Cena</span>
      <span className="brand-wordmark-dot" aria-hidden="true" />
      <span className={`brand-wordmark-studio ${textTone}`}>Studio</span>
    </span>
  );
}
