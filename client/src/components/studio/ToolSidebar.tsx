import { getToolIcon } from "@/lib/toolIcons";
import { type ToolFromApi } from "@/lib/api";
import ContextPanel from "./ContextPanel";
import ProjectSelector from "./ProjectSelector";
import BrandLogo from "@/components/BrandLogo";

interface ToolSidebarProps {
  tools: ToolFromApi[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
}

interface CategoryGroup {
  name: string;
  slugs: string[];
}

const CATEGORIES: CategoryGroup[] = [
  {
    name: "Pré-Produção",
    slugs: ["roteiro", "decupagem", "callsheet", "checklist", "cronograma"],
  },
  {
    name: "Comercial & Vendas",
    slugs: ["briefing", "orcamento", "proposta", "contrato"],
  },
  {
    name: "Estética & Entrega",
    slugs: ["moodboard", "entrega", "assistente"],
  },
];

export default function ToolSidebar({ tools, activeToolId, onSelectTool }: ToolSidebarProps) {
  // Helper to find tool by slug
  const getToolBySlug = (slug: string) => tools.find((t) => t.slug === slug);

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-frame-gray-1 border-b lg:border-b-0 lg:border-r border-frame-gray-2 flex flex-col overflow-x-auto lg:overflow-y-auto">
      {/* Brand Header (Hidden on Mobile) */}
      <div className="hidden lg:block px-[18px] py-5 border-b border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.15em] uppercase text-frame-gray-light mt-0.5">
          Studio WORKSPACE
        </p>
      </div>

      {/* Project Selector context dropdown */}
      <ProjectSelector />

      {/* Categories / Navigation */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible shrink-0 lg:shrink py-2 lg:py-0 w-full">
        {CATEGORIES.map((cat) => {
          // Filter tools belonging to this category
          const categoryTools = cat.slugs
            .map((slug) => getToolBySlug(slug))
            .filter((t): t is ToolFromApi => t !== undefined && t.isActive);

          if (categoryTools.length === 0) return null;

          return (
            <div key={cat.name} className="flex lg:flex-col items-center lg:items-stretch shrink-0 lg:shrink">
              {/* Category label (Hidden on mobile or rendered as badge) */}
              <p className="hidden lg:block font-frame-mono text-[0.62rem] tracking-[0.2em] uppercase text-frame-gray-muted px-[18px] pt-4 pb-1.5">
                // {cat.name}
              </p>
              <div className="flex lg:flex-col gap-1 px-2 lg:px-0">
{categoryTools.map((t) => {
                   const TIcon = getToolIcon(t.slug);
                   const active = t.id === activeToolId || t.slug === activeToolId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTool(t.id)}
                      className={`flex items-center gap-2.5 px-[15px] lg:px-[18px] py-2 lg:py-2.5 text-left border-l-2 transition-colors shrink-0 lg:shrink bg-transparent border-t-0 border-r-0 border-b-0 ${
                        active
                          ? "border-l-frame-orange bg-[rgba(255,77,0,0.08)] text-frame-white"
                          : "border-l-transparent text-frame-gray-light hover:bg-frame-gray-1 hover:text-frame-white"
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
