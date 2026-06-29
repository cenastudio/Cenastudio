import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cena-font-scale";
const DEFAULT_SCALE = 1.06;
const OPTIONS = [
  { labelKey: "app.accessibility.default", value: 1 },
  { labelKey: "app.accessibility.comfort", value: 1.06 },
  { labelKey: "app.accessibility.large", value: 1.12 },
];

function readInitialScale() {
  if (typeof window === "undefined") return DEFAULT_SCALE;
  const saved = Number(window.localStorage.getItem(STORAGE_KEY));
  if (!Number.isFinite(saved)) return DEFAULT_SCALE;
  if (saved === 1.04) return DEFAULT_SCALE;
  return OPTIONS.some((option) => option.value === saved) ? saved : DEFAULT_SCALE;
}

export default function AccessibilityFontControls() {
  const { t } = useLanguage();
  const [scale, setScale] = useState(readInitialScale);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-font-scale", String(scale));
    window.localStorage.setItem(STORAGE_KEY, String(scale));
  }, [scale]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center border border-frame-gray-3 text-frame-gray-light transition hover:border-frame-orange hover:text-frame-orange"
        aria-label={t("app.accessibility.readingOptions") as string}
        aria-expanded={open}
        title={t("app.accessibility.textSize") as string}
      >
        <Type className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[800] w-52 border border-frame-gray-3 bg-frame-black p-2 shadow-2xl">
          <p className="px-2 pb-2 pt-1 font-frame-mono text-[0.64rem] uppercase tracking-[0.12em] text-frame-gray-light">
            {t("app.accessibility.readingComfort") as string}
          </p>
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setScale(option.value);
                setOpen(false);
              }}
              className={`flex min-h-10 w-full items-center justify-between px-2 text-left text-sm transition hover:bg-frame-gray-2 ${
                scale === option.value ? "text-frame-white" : "text-frame-gray-light"
              }`}
            >
              <span style={{ fontSize: `${option.value}rem` }}>{t(option.labelKey) as string}</span>
              {scale === option.value && <Check className="h-3.5 w-3.5 text-frame-orange" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
