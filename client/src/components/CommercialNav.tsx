import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarChart3, Users, GitBranch, FileText, MessageSquare, MoreHorizontal, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommercialTab {
  href: string;
  labelPt: string;
  labelEn: string;
  icon: typeof BarChart3;
}

/** Always-visible primary tabs — most commonly used areas. */
const PRIMARY_TABS: CommercialTab[] = [
  { href: "/commercial", labelPt: "Visão geral", labelEn: "Overview", icon: BarChart3 },
  { href: "/clients", labelPt: "Clientes", labelEn: "Clients", icon: Users },
  { href: "/pipeline", labelPt: "Pipeline", labelEn: "Pipeline", icon: GitBranch },
];

/** Secondary tabs — grouped under a "Mais" dropdown to improve mobile discoverability. */
const SECONDARY_TABS: CommercialTab[] = [
  { href: "/proposals", labelPt: "Propostas", labelEn: "Proposals", icon: FileText },
  { href: "/interactions", labelPt: "Interações", labelEn: "Interactions", icon: MessageSquare },
];

function isTabActive(location: string, href: string) {
  return location === href || (href !== "/commercial" && location.startsWith(href + "/"));
}

/**
 * Sub-navigation for the Commercial area.
 * Appears below AppNavBar on every commercial page (overview, clients, pipeline, proposals, interactions).
 *
 * - Desktop: primary tabs (Overview, Clients, Pipeline) are always visible,
 *   secondary tabs (Proposals, Interactions) are under a "Mais"/"More" dropdown.
 * - Mobile: single compact dropdown listing all tabs for better discoverability
 *   (replaces previous horizontal scroll with hidden scrollbar).
 *
 * Ensures all 5 sections are accessible in ≤2 touches on mobile.
 */
export default function CommercialNav() {
  const [location, setLocation] = useLocation();
  const { locale } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleAllTabs = [...PRIMARY_TABS, ...SECONDARY_TABS];
  const activeTab = visibleAllTabs.find((tab) => isTabActive(location, tab.href)) || visibleAllTabs[0];
  const activeSecondaryTab = SECONDARY_TABS.find((tab) => isTabActive(location, tab.href));

  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  const navLabel = locale === "en" ? "Commercial navigation" : "Navegação comercial";
  const moreLabel = locale === "en" ? "More" : "Mais";

  return (
    <nav aria-label={navLabel} className="border-b border-frame-gray-3/50 bg-frame-black/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Desktop: primary tabs + "More" dropdown for secondary areas */}
        <div className="hidden sm:flex items-center">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = isTabActive(location, tab.href);
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-current={activeSecondaryTab ? "page" : undefined}
                className={`
                  relative flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all duration-200
                  font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase
                  after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-200
                  ${activeSecondaryTab
                    ? "text-frame-orange after:bg-frame-orange"
                    : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                  }
                `}
              >
                {activeSecondaryTab ? (
                  <activeSecondaryTab.icon className="w-3.5 h-3.5 text-frame-orange" />
                ) : (
                  <MoreHorizontal className="w-3.5 h-3.5" />
                )}
                {activeSecondaryTab ? (locale === "en" ? activeSecondaryTab.labelEn : activeSecondaryTab.labelPt) : moreLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-frame-black border-frame-gray-3 rounded-none min-w-[180px]">
              {SECONDARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = isTabActive(location, tab.href);
                const label = locale === "en" ? tab.labelEn : tab.labelPt;

                return (
                  <DropdownMenuItem
                    key={tab.href}
                    onClick={() => setLocation(tab.href)}
                    className={`gap-2.5 font-frame-mono text-[0.62rem] tracking-[0.1em] uppercase cursor-pointer ${
                      isActive ? "text-frame-orange" : "text-frame-gray-light"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-frame-orange" : ""}`} />
                    {label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: compact dropdown instead of horizontal-scroll tabs */}
        <div className="sm:hidden py-2" ref={containerRef}>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            className="flex w-full items-center justify-between gap-2 border border-frame-gray-3/60 bg-frame-gray-1/30 px-3 py-3 text-left min-h-11"
          >
            <span className="flex items-center gap-2 font-frame-mono text-[0.65rem] tracking-[0.1em] uppercase text-frame-orange">
              {activeTab && <activeTab.icon className="w-3.5 h-3.5" />}
              {activeTab ? (locale === "en" ? activeTab.labelEn : activeTab.labelPt) : ""}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-frame-gray-light transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
          </button>

          {mobileOpen && (
            <div className="mt-1 border border-frame-gray-3/60 bg-frame-black/95 backdrop-blur-xl divide-y divide-frame-gray-3/30">
              {visibleAllTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = isTabActive(location, tab.href);
                const label = locale === "en" ? tab.labelEn : tab.labelPt;

                return (
                  <button
                    key={tab.href}
                    type="button"
                    onClick={() => {
                      setLocation(tab.href);
                      setMobileOpen(false);
                    }}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-2.5 px-3 py-3 text-left font-frame-mono text-[0.62rem] tracking-[0.1em] uppercase transition min-h-11 ${
                      isActive ? "bg-frame-orange/10 text-frame-orange" : "text-frame-gray-light hover:bg-frame-gray-2/40 hover:text-frame-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-frame-orange" : ""}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
