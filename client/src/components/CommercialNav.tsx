import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, Users, GitBranch, FileText, MessageSquare } from "lucide-react";

const COMMERCIAL_TABS = [
  { href: "/commercial",    labelPt: "Visão geral", labelEn: "Overview",     icon: BarChart3     },
  { href: "/clients",       labelPt: "Clientes",    labelEn: "Clients",      icon: Users         },
  { href: "/pipeline",      labelPt: "Pipeline",    labelEn: "Pipeline",     icon: GitBranch     },
  { href: "/proposals",     labelPt: "Propostas",   labelEn: "Proposals",    icon: FileText      },
  { href: "/interactions",  labelPt: "Interações",  labelEn: "Interactions", icon: MessageSquare },
] as const;

export default function CommercialNav() {
  const [location, setLocation] = useLocation();
  const { locale } = useLanguage();

  return (
    <nav
      aria-label={locale === "en" ? "Commercial navigation" : "Navegação comercial"}
      className="border-b border-frame-gray-3/50 bg-frame-black/60 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex items-center overflow-x-auto scrollbar-none">
          {COMMERCIAL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              location === tab.href ||
              (tab.href !== "/commercial" && location.startsWith(tab.href + "/"));
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
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-frame-orange" : "text-frame-gray-light group-hover:text-frame-white"}`} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
