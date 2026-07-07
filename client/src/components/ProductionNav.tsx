import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { FolderKanban, Sparkles, Video } from "lucide-react";

const PRODUCTION_TABS = [
  { href: "/projects", labelPt: "Jobs", labelEn: "Jobs", icon: FolderKanban },
  { href: "/tools", labelPt: "Studio IA", labelEn: "AI Studio", icon: Sparkles },
  { href: "/video-reviews", labelPt: "Aprovações", labelEn: "Approvals", icon: Video },
  { href: "/files", labelPt: "Arquivos", labelEn: "Files", icon: FolderKanban },
] as const;

/**
 * Sub-navigation for the Production area.
 * Appears below AppNavBar on production pages (projects, tools, video-reviews).
 */
export default function ProductionNav() {
  const [location, setLocation] = useLocation();
  const { locale } = useLanguage();

  // Don't show inside a specific project (ProjectHub has its own context)
  if (location.startsWith("/project/")) return null;

  return (
    <nav
      aria-label={locale === "en" ? "Production navigation" : "Navegação de produção"}
      className="border-b border-frame-gray-3/50 bg-frame-black/60 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex items-center overflow-x-auto scrollbar-none">
          {PRODUCTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              location === tab.href ||
              (tab.href !== "/projects" && location.startsWith(tab.href + "/"));
            const label = locale === "en" ? tab.labelEn : tab.labelPt;

            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => setLocation(tab.href)}
                aria-current={isActive ? "page" : undefined}
                className={`
                  relative flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all duration-200
                  font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase
                  after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-200
                  ${isActive
                    ? "text-frame-orange after:bg-frame-orange"
                    : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-frame-orange" : ""}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
