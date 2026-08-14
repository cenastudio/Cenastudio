import { getToolIcon } from "@/lib/toolIcons";
import { type ToolFromApi } from "@/lib/api";
import ContextPanel from "./ContextPanel";
import ProjectSelector from "./ProjectSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeTools } from "@/lib/toolTranslations";

interface ToolSidebarProps {
  tools: ToolFromApi[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

interface CategoryGroup {
  key: string;
  slugs: string[];
  numbered?: boolean;
}

const CATEGORIES: CategoryGroup[] = [
  {
    key: "commercial",
    slugs: ["briefing", "orcamento", "proposta", "contrato"],
    numbered: true,
  },
  {
    key: "preproduction",
    slugs: ["roteiro", "decupagem", "callsheet", "cronograma", "checklist"],
    numbered: true,
  },
  {
    key: "delivery",
    slugs: ["entrega"],
  },
  {
    key: "creative",
    slugs: ["moodboard"],
  },
  {
    key: "assistant",
    slugs: ["assistente"],
  },
];

export default function ToolSidebar({ tools, activeToolId, onSelectTool }: ToolSidebarProps) {
  const { locale, t } = useLanguage();
  const localizedTools = localizeTools(tools, locale);
  // Helper to find tool by slug
  const getToolBySlug = (slug: string) => localizedTools.find((t) => t.slug === slug);
  const categoryLabels: Record<string, string> = {
    commercial: locale === "pt" ? "Comercial primeiro" : "Commercial first",
    preproduction: locale === "pt" ? "Pré-produção" : "Pre-production",
    delivery: locale === "pt" ? "Entrega e fechamento" : "Delivery and wrap",
    creative: locale === "pt" ? "Direção visual" : "Visual direction",
    assistant: locale === "pt" ? "Apoio livre" : "Open support",
  };
  const visibleCategories = CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.slugs
      .map((slug) => getToolBySlug(slug))
      .filter((t): t is ToolFromApi => t !== undefined && t.isActive),
  })).filter((cat) => cat.tools.length > 0);
  const activeCategory =
    visibleCategories.find((cat) => cat.tools.some((tool) => tool.id === activeToolId || tool.slug === activeToolId)) ||
    visibleCategories[0];
  const activeTool =
    activeCategory?.tools.find((tool) => tool.id === activeToolId || tool.slug === activeToolId) ||
    activeCategory?.tools[0];

  return (
    <aside className="studio-sidebar w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 flex flex-col lg:overflow-y-auto">
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
      {activeCategory && activeTool && (
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 py-3 border-t border-frame-gray-2">
          <label className="sr-only" htmlFor="studio-tool-category">
            {locale === "pt" ? "Categoria de ferramenta" : "Tool category"}
          </label>
          <select
            id="studio-tool-category"
            value={activeCategory.key}
            onChange={(event) => {
              const nextCategory = visibleCategories.find((cat) => cat.key === event.target.value);
              const firstTool = nextCategory?.tools[0];
              if (firstTool) onSelectTool(firstTool.id);
            }}
            className="w-full min-h-11 bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
          >
            {visibleCategories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {categoryLabels[cat.key]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="studio-tool-select">
            {locale === "pt" ? "Ferramenta ativa" : "Active tool"}
          </label>
          <select
            id="studio-tool-select"
            value={activeTool.id}
            onChange={(event) => onSelectTool(event.target.value)}
            className="w-full min-h-11 bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
          >
            {activeCategory.tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="hidden lg:flex lg:flex-col shrink-0 lg:shrink py-2 lg:py-3 w-full">
        {visibleCategories.map((cat) => {
          return (
            <div key={cat.key} className="flex lg:flex-col items-center lg:items-stretch shrink-0 lg:shrink">
              {/* Category label (Hidden on mobile or rendered as badge) */}
              <p className="hidden lg:block font-frame-mono text-[0.62rem] tracking-[0.2em] uppercase text-frame-gray-muted px-[18px] pt-4 pb-1.5">
                // {categoryLabels[cat.key]}
              </p>
              <div className="flex lg:flex-col gap-2 px-2 lg:px-3">
                {cat.tools.map((t, index) => {
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
                      {cat.numbered ? (
                        <span className={`w-5 h-5 shrink-0 rounded-full border flex items-center justify-center font-frame-mono text-[0.58rem] ${active ? "border-frame-orange bg-frame-orange text-frame-black" : "border-frame-gray-3 text-frame-gray-light"}`}>
                          {index + 1}
                        </span>
                      ) : (
                        <TIcon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-frame-orange" : "text-frame-gray-light"}`} />
                      )}
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
