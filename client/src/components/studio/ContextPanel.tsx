import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ContextPanel() {
  const { plan } = useAuth();
  const { t } = useLanguage();

  if (!plan) return null;

  return (
    <div className="mt-auto px-[18px] py-4 border-t border-frame-gray-3 bg-frame-black/50 shrink-0">
      <div className="flex items-center gap-2 text-frame-gray-light">
        <div className="w-1.5 h-1.5 rounded-full bg-frame-orange animate-pulse" />
        <span className="font-frame-mono text-[0.64rem] tracking-wider uppercase">
          {t("app.studio.context.modelName") as string}
        </span>
      </div>
      <div className="mt-2 text-[0.63rem] font-frame-mono text-frame-gray-light flex flex-col gap-1">
        <div className="flex justify-between">
          <span>{t("app.studio.context.plan") as string}</span>
          <span className="text-frame-white font-medium">{plan.planName}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("app.studio.context.quota") as string}</span>
          <span className="text-frame-orange">
            {plan.generationLimit === -1 ? t("app.studio.context.unlimited") as string : `${plan.generationLimit} ${t("app.studio.context.generations") as string}`}
          </span>
        </div>
      </div>
    </div>
  );
}
