import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();

  const label = locale === "pt" ? "PT" : "EN";

  const base =
    "min-h-8 px-2 text-[0.62rem] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-frame-orange/50";

  const inactive =
    "text-white/50 hover:text-white";

  const active =
    "text-white";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1" role="group" aria-label="Language">
        <button
          type="button"
          onClick={() => setLocale("pt")}
          className={`${base} ${locale === "pt" ? active : inactive}`}
        >
          PT
        </button>
        <span className="text-white/20 text-[0.62rem]">/</span>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`${base} ${locale === "en" ? active : inactive}`}
        >
          EN
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLocale("pt")}
        className={`${base} ${locale === "pt" ? active : inactive}`}
      >
        PT
      </button>
      <span className="text-white/20 text-[0.65rem]">/</span>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`${base} ${locale === "en" ? active : inactive}`}
      >
        EN
      </button>
    </span>
  );
}