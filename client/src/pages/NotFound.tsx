import { Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="frame-label mb-4">// {t("app.notFound.error") as string}</p>
        <h1 className="frame-title text-[clamp(4rem,12vw,7rem)] text-frame-orange leading-none mb-2">
          404
        </h1>
        <h2 className="frame-title text-2xl text-frame-white mb-4">{t("app.notFound.title") as string}</h2>
        <p className="text-[0.88rem] text-frame-gray-light font-light mb-8 leading-relaxed">
          {t("app.notFound.description") as string}
        </p>
        <button type="button" onClick={() => setLocation("/")} className="frame-btn-primary inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          {t("app.notFound.backHome") as string}
        </button>
      </div>
    </div>
  );
}
