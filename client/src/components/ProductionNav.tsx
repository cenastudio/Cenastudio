import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  FolderKanban,
  Sparkles,
  Video,
  FileText,
  Users,
  ChevronDown,
  Package,
  MoreHorizontal,
  Camera,
  Clock,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlanContext } from "@/contexts/PlanContext";
import { canAccessFeature } from "@/lib/feature-gating";
import type { FeatureName } from "@/types/plan";

type TeamRole = "admin" | "editor" | "member";

interface ProductionTab {
  href: string;
  labelPt: string;
  labelEn: string;
  icon: typeof FolderKanban;
  /** Highlighted tabs get a visual accent (used for the AI Studio entry point). */
  highlight?: boolean;
  /** Restrict visibility to these team roles. Omit to show to everyone. */
  roles?: TeamRole[];
  /** Hide the tab unless the current plan has access to this feature flag. */
  requiresFeature?: FeatureName;
}

/** Always-visible primary tabs — the areas used every day. */
const PRIMARY_TABS: ProductionTab[] = [
  { href: "/projects", labelPt: "Jobs", labelEn: "Jobs", icon: FolderKanban },
  { href: "/tools", labelPt: "Estúdio IA", labelEn: "AI Studio", icon: Sparkles, highlight: true },
  { href: "/video-reviews", labelPt: "Aprovações", labelEn: "Approvals", icon: Video },
];

/**
 * Secondary tabs — grouped under a "Mais" dropdown to keep the primary row
 * from growing unbounded as new verticals ship.
 *
 * "Colaboradores" (freelancer sem login) foi extinto e fundido em "Equipe"
 * (spec: team-task-delegation, Fase 6). Alocação de membros a um projeto
 * específico agora acontece dentro do próprio ProjectHub.
 */
const SECONDARY_TABS: ProductionTab[] = [
  { href: "/files-unified", labelPt: "Arquivos", labelEn: "Files", icon: FolderKanban },
  { href: "/documents", labelPt: "Documentos", labelEn: "Documents", icon: FileText },
  { href: "/equipment", labelPt: "Equipamento", labelEn: "Equipment", icon: Camera, requiresFeature: "equipment-inventory" },
  { href: "/timesheet", labelPt: "Timesheet", labelEn: "Timesheet", icon: Clock, requiresFeature: "timesheet" },
  { href: "/team", labelPt: "Equipe", labelEn: "Team", icon: Users, roles: ["admin"] },
];

function isTabActive(location: string, href: string) {
  return location === href || (href !== "/projects" && location.startsWith(href + "/"));
}

/**
 * Sub-navigation for the Production area.
 * Appears below AppNavBar on every production page (jobs, studio, approvals,
 * files, documents, team) so all sub-areas stay reachable without the tab
 * row growing unbounded as new verticals ship.
 *
 * - Primary tabs (Jobs, AI Studio, Approvals) are always visible — daily use.
 * - Secondary tabs (Files, Documents, Equipment, Timesheet, Team)
 *   live under a "Mais"/"More" dropdown on desktop.
 * - The AI Studio tab is visually highlighted since it's the product's key
 *   differentiator and would otherwise lose visibility now that it's no
 *   longer a top-level nav tab.
 * - "Equipe" is restricted to admins — team members shouldn't need to see
 *   a management area they can't act on.
 * - Desktop uses primary tabs + a dropdown; mobile uses a single compact
 *   dropdown listing every tab (which don't give a reliable, discoverable
 *   way to see every option on small screens if left as scrolling tabs).
 */
export default function ProductionNav() {
  const [location, setLocation] = useLocation();
  const { locale } = useLanguage();
  const { isAdmin, isTeamMember, teamRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Don't show inside a specific project (ProjectHub has its own context)
  if (location.startsWith("/project/")) return null;

  const { planMode } = usePlanContext();
  const effectiveRole: TeamRole | null = isAdmin ? "admin" : isTeamMember ? (teamRole as TeamRole | null) : "admin";
  const visibleSecondaryTabs = SECONDARY_TABS.filter((tab) => {
    if (tab.roles && !(effectiveRole && tab.roles.includes(effectiveRole))) return false;
    if (tab.requiresFeature && !canAccessFeature(tab.requiresFeature, planMode).hasAccess) return false;
    return true;
  });
  const visibleAllTabs = [...PRIMARY_TABS, ...visibleSecondaryTabs];

  const activeTab = visibleAllTabs.find((tab) => isTabActive(location, tab.href)) || visibleAllTabs[0];
  const activeSecondaryTab = visibleSecondaryTabs.find((tab) => isTabActive(location, tab.href));

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

  const navLabel = locale === "en" ? "Production navigation" : "Navegação de produção";
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
                  relative flex min-h-11 items-center gap-2 px-4 py-3 whitespace-nowrap transition-all duration-200
                  font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase
                  after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-200
                  ${isActive
                    ? "text-frame-orange after:bg-frame-orange"
                    : tab.highlight
                      ? "text-frame-orange/80 hover:text-frame-orange after:bg-transparent"
                      : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive || tab.highlight ? "text-frame-orange" : ""}`} />
                {label}
                {tab.highlight && (
                  <span
                    className="ml-0.5 h-1.5 w-1.5 rounded-full bg-frame-orange animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-current={activeSecondaryTab ? "page" : undefined}
                className={`
                  relative flex min-h-11 items-center gap-2 px-4 py-3 whitespace-nowrap transition-all duration-200
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
              {visibleSecondaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = isTabActive(location, tab.href);
                const label = locale === "en" ? tab.labelEn : tab.labelPt;

                return (
                  <DropdownMenuItem
                    key={tab.href}
                    onClick={() => setLocation(tab.href)}
                    className={`min-h-11 gap-2.5 font-frame-mono text-[0.62rem] tracking-[0.1em] uppercase cursor-pointer ${
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
            className="flex min-h-11 w-full items-center justify-between gap-2 border border-frame-gray-3/60 bg-frame-gray-1/30 px-3 py-2.5 text-left"
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
                    className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left font-frame-mono text-[0.62rem] tracking-[0.1em] uppercase transition ${
                      isActive ? "bg-frame-orange/10 text-frame-orange" : "text-frame-gray-light hover:bg-frame-gray-2/40 hover:text-frame-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive || tab.highlight ? "text-frame-orange" : ""}`} />
                    {label}
                    {tab.highlight && !isActive && (
                      <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-frame-orange animate-pulse" aria-hidden="true" />
                    )}
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
