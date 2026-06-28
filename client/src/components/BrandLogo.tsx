interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  useImage?: boolean;
  tone?: "auto" | "onDark";
}

export default function BrandLogo({ compact = false, className = "", tone = "auto" }: BrandLogoProps) {
  const textTone = tone === "onDark" ? "text-[#f9f9f9]" : "text-frame-white";

  return (
    <span className={`inline-flex items-baseline gap-2 leading-none ${className}`} aria-label="Cena Studio">
      <span className={`font-frame-body font-semibold tracking-normal ${textTone} ${compact ? "text-lg" : "text-xl"}`}>
        Cena
      </span>
      <span className={`font-frame-mono uppercase tracking-[0.18em] text-frame-orange ${compact ? "text-[0.56rem]" : "text-[0.62rem]"}`}>
        Studio
      </span>
    </span>
  );
}
