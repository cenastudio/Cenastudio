interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export default function BrandLogo({ compact = false, className = "" }: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center border border-frame-orange text-frame-orange">
        <span className="absolute left-1.5 right-1.5 top-1.5 h-px bg-frame-orange" />
        <span className="absolute bottom-1.5 left-1.5 right-1.5 h-px bg-frame-orange" />
        <span className="font-frame-display text-[1.05rem] leading-none tracking-normal text-frame-white">C</span>
      </span>
      <span className="inline-flex flex-col leading-none">
        <span className="font-frame-display text-[1.45rem] tracking-[0.08em] text-frame-white">
          CENA
        </span>
        {!compact && (
          <span className="-mt-0.5 font-frame-mono text-[0.48rem] tracking-[0.22em] uppercase text-frame-orange">
            Studio
          </span>
        )}
      </span>
    </span>
  );
}
