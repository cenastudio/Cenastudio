import { getToolIcon } from "@/lib/toolIcons";
import { type ToolFromApi } from "@/lib/api";
import ContextPanel from "./ContextPanel";
import ProjectSelector from "./ProjectSelector";
import { useLanguage } from "@/contexts/LanguageContext";

interface ToolSidebarProps {
  tools: ToolFromApi[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

interface CategoryGroup {
  key: string;
  slugs: string[];
}

const CATEGORIES: CategoryGroup[] = [
  {
    key: "preProduction",
    slugs: ["roteiro", "decupagem", "callsheet", "checklist", "cronograma"],
  },
  {
    key: "commercial",
    slugs: ["briefing", "orcamento", "proposta", "contrato"],
  },
  {
    key: "aesthetic",
    slugs: ["moodboard", "entrega", "assistente"],
  },
];

export default function ToolSidebar({ tools, activeToolId, onSelectTool }: ToolSidebarProps) {
  const { t } = useLanguage();
  // Helper to find tool by slug
  const getToolBySlug = (slug: string) => tools.find((t) => t.slug === slug);
  const categoryLabels: Record<string, string> = {
    preProduction: t("app.studio.preProduction") as string,
    commercial: t("app.studio.commercial") as string,
    aesthetic: t("app.studio.aesthetic") as string,
  };

  return (
    <aside className="studio-sidebar w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-frame-gray-2 flex flex-col overflow-x-auto lg:overflow-y-auto">
      {/* Brand Header (Hidden on Mobile) */}
      <div className="hidden lg:block px-5 py-5 border-b border-frame-gray-2">
        <p className="frame-label mb-1">// Studio</p>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.15em] uppercase text-frame-gray-light">
          {t("app.studio.workspace") as string}
        </p>
      </div>

      {/* Project Selector context dropdown */}
      <ProjectSelector />

      {/* Categories / Navigation */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible shrink-0 lg:shrink py-2 lg:py-3 w-full">
        {CATEGORIES.map((cat) => {
          // Filter tools belonging to this category
          const categoryTools = cat.slugs
            .map((slug) => getToolBySlug(slug))
            .filter((t): t is ToolFromApi => t !== undefined && t.isActive);

          if (categoryTools.length === 0) return null;

          return (
            <div key={cat.key} className="flex lg:flex-col items-center lg:items-stretch shrink-0 lg:shrink">
              {/* Category label (Hidden on mobile or rendered as badge) */}
              <p className="hidden lg:block font-frame-mono text-[0.62rem] tracking-[0.2em] uppercase text-frame-gray-muted px-[18px] pt-4 pb-1.5">
                // {categoryLabels[cat.key]}
              </p>
              <div className="flex lg:flex-col gap-2 px-2 lg:px-3">
                {categoryTools.map((t) => {
                   const TIcon = getToolIcon(t.slug);
                   const active = t.id === activeToolId || t.slug === activeToolId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTool(t.id)}
                      className={`studio-tool-nav flex items-center gap-2.5 px-3.5 py-2.5 text-left border transition shrink-0 lg:shrink ${
                        active
                          ? "is-active border-frame-orange text-frame-white"
                          : "border-transparent text-frame-gray-light hover:text-frame-white"
                      }`}
                    >
                      <TIcon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-frame-orange" : "text-frame-gray-light"}`} />
                      <span className="text-[0.76rem] font-medium tracking-wide font-frame-body">
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Panel (Model and Billing Cota) */}
      <div className="hidden lg:block mt-auto">
        <ContextPanel />
      </div>
    </aside>
  );
}
