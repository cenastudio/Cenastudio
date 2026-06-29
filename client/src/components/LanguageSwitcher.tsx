import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  const label = locale === "pt" ? "PT" : "EN";
  const ariaLabel = t("language.label");

  const base =
    "min-h-8 px-2.5 text-[0.62rem] font-frame-mono font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 focus:ring-frame-orange/50";

  const inactive =
    "bg-white text-[#7a6f68] hover:bg-[#f4eee9] hover:text-[#211b18] dark:bg-transparent dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white";

  const active =
    "bg-frame-orange text-frame-black shadow-[0_0_18px_rgba(255,78,0,0.18)]";

  if (compact) {
    return (
      <span className="inline-flex items-center overflow-hidden border border-[#ded6cf] bg-white shadow-[0_8px_22px_rgba(30,20,15,0.08)] dark:border-frame-gray-3 dark:bg-frame-black/50 dark:shadow-none" role="group" aria-label={ariaLabel}>
        <button
          type="button"
          onClick={() => setLocale("pt")}
          className={`${base} ${locale === "pt" ? active : inactive}`}
        >
          PT
        </button>
        <span className="h-4 w-px bg-frame-gray-3" aria-hidden="true" />
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
      <span className="inline-flex items-center overflow-hidden border border-[#ded6cf] bg-white shadow-[0_8px_22px_rgba(30,20,15,0.08)] dark:border-frame-gray-3 dark:bg-frame-black/50 dark:shadow-none" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        className={`${base} ${locale === "pt" ? active : inactive}`}
      >
        PT
      </button>
      <span className="h-4 w-px bg-frame-gray-3" aria-hidden="true" />
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
