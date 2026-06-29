import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import { getToolById } from "@/shared/tools";
import { getToolIcon } from "@/lib/toolIcons";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ArrowLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";

function ToolDetailContent() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/tools/:id");
  const toolId = params?.id;
  const tool = toolId ? getToolById(toolId) : undefined;

  if (!tool) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4">
        <p className="frame-label">{t("app.tools.toolNotFound") as string}</p>
        <button type="button" onClick={() => setLocation("/tools")} className="frame-btn-ghost">
          {t("app.common.back") as string}
        </button>
      </div>
    );
  }

  const Icon = getToolIcon(tool.slug);

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <AppNavBar />

      <div className="px-9 md:px-12 pt-6">
        <button
          type="button"
          onClick={() => setLocation("/tools")}
          className="flex items-center gap-2 font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase text-frame-gray-light hover:text-frame-white transition bg-transparent border-none"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("app.tools.backToTools") as string}
        </button>
      </div>

      <div className="px-9 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-start gap-4 mb-8">
              <Icon className="w-12 h-12 text-frame-orange shrink-0" />
              <div>
                <p className="frame-label mb-2">// {tool.id}</p>
                <h1 className="frame-title text-[clamp(2rem,4vw,3rem)] text-frame-white mb-2">
                  {tool.name}
                </h1>
                <p className="text-[0.88rem] text-frame-gray-light font-light leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-10">
              {tool.tags.map((tag) => (
                <span key={tag} className="frame-tag">
                  {tag}
                </span>
              ))}
            </div>

            <div>
              <p className="frame-label mb-3">{t("app.tools.about") as string}</p>
              <p className="text-[0.88rem] text-frame-gray-light font-light leading-relaxed">
                {tool.description}
              </p>
            </div>
          </div>

          <div className="frame-card h-fit lg:sticky lg:top-24">
            <p className="font-frame-mono text-[0.64rem] tracking-[0.14em] uppercase text-frame-gray-light mb-1">
              {t("app.tools.estimatedTime") as string}
            </p>
            <p className="frame-title text-2xl text-frame-white mb-6">{tool.processingTime}</p>
            <button
              type="button"
              className="frame-btn-primary w-full mb-3"
              onClick={() => setLocation(`/studio/${tool.id}`)}
            >
              {t("app.tools.openInStudio") as string}
            </button>
            <button type="button" className="frame-btn-ghost w-full" onClick={() => setLocation("/tools")}>
              {t("app.common.back") as string}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ToolDetail() {
  return (
    <ProtectedRoute>
      <ToolDetailContent />
    </ProtectedRoute>
  );
}
