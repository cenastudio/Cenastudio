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
  description: string;
}

const CATEGORIES: CategoryGroup[] = [
  {
    key: "commercial",
    slugs: ["briefing", "orcamento", "proposta", "contrato"],
    numbered: true,
    description: "Captação, valor e proposta.",
  },
  {
    key: "preproduction",
    slugs: ["roteiro", "decupagem", "callsheet", "cronograma", "checklist"],
    numbered: true,
    description: "Plano criativo e operação.",
  },
  {
    key: "delivery",
    slugs: ["entrega"],
    description: "Fechamento e handoff.",
  },
  {
    key: "creative",
    slugs: ["moodboard"],
    description: "Direção visual.",
  },
  {
    key: "assistant",
    slugs: ["assistente"],
    description: "Perguntas livres.",
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
    <aside className="studio-sidebar w-full shrink-0 border-b lg:w-[320px] lg:border-b-0 flex flex-col">
      <div className="border-b border-frame-gray-2 px-4 py-4 lg:px-5">
        <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">
          Oficina do Studio IA
        </p>
        <h2 className="mt-2 text-lg font-semibold leading-tight text-frame-white">
          Escolha a entrega que precisa criar.
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-frame-gray-light">
          As ferramentas seguem a jornada real: vender, planejar, produzir e entregar.
        </p>
      </div>

      {/* Project Selector context dropdown */}
      <ProjectSelector />

      {/* Categories / Navigation */}
      {activeCategory && activeTool && (
        <div className="grid grid-cols-1 gap-2 border-t border-frame-gray-2 px-3 py-3 sm:grid-cols-2 lg:hidden">
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
            className="w-full min-h-11 rounded-xl bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
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
            className="w-full min-h-11 rounded-xl bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
          >
            {activeCategory.tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="hidden w-full shrink-0 py-3 lg:flex lg:shrink lg:flex-col">
        {visibleCategories.map((cat) => {
          return (
            <div key={cat.key} className="flex shrink-0 items-center lg:shrink lg:flex-col lg:items-stretch">
              <div className="px-4 pb-2 pt-4">
                <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                  {categoryLabels[cat.key]}
                </p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-frame-gray-muted">
                  {cat.description}
                </p>
              </div>
              <div className="flex gap-2 px-2 lg:flex-col lg:px-3">
                {cat.tools.map((t, index) => {
                   const TIcon = getToolIcon(t.slug);
                   const active = t.id === activeToolId || t.slug === activeToolId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-label={`${index + 1} ${t.name}`}
                      onClick={() => onSelectTool(t.id)}
                      className={`studio-tool-nav group flex min-h-[58px] shrink-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-[background-color,border-color,color,box-shadow] lg:shrink ${
                        active
                          ? "is-active border-frame-orange/70 text-frame-white shadow-[0_0_24px_rgba(var(--ds-orange-rgb),0.08)]"
                          : "border-transparent text-frame-gray-light hover:border-frame-gray-3/70 hover:bg-frame-white/[0.03] hover:text-frame-white"
                      }`}
                    >
                      {cat.numbered ? (
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-frame-mono text-[0.62rem] ${active ? "border-frame-orange bg-frame-orange text-frame-black" : "border-frame-gray-3 text-frame-gray-light group-hover:border-frame-gray-light"}`}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? "border-frame-orange bg-frame-orange/10" : "border-frame-gray-3 group-hover:border-frame-gray-light"}`}>
                          <TIcon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-frame-orange" : "text-frame-gray-light"}`} />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[0.82rem] font-semibold tracking-wide font-frame-body">
                          {t.name}
                        </span>
                        <span className="mt-0.5 block line-clamp-1 text-[0.62rem] leading-relaxed text-frame-gray-muted">
                          {t.description}
                        </span>
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
