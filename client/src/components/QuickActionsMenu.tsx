import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  FolderKanban,
  Users,
  Target,
  Video,
  Settings,
  Plus,
  FileText,
  BarChart3,
  Command,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  category: "navigation" | "create" | "settings";
}

export default function QuickActionsMenu() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to close
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearch("");
      }

      // Global shortcuts (work even when menu is closed)
      if (event.metaKey || event.ctrlKey) {
        const key = event.key;
        if (key === "1") { event.preventDefault(); setLocation("/dashboard"); setIsOpen(false); }
        if (key === "2") { event.preventDefault(); setLocation("/commercial"); setIsOpen(false); }
        if (key === "3") { event.preventDefault(); setLocation("/projects"); setIsOpen(false); }
        if (key === "4") { event.preventDefault(); setLocation("/analytics"); setIsOpen(false); }
        if (key === "j" || key === "J") { event.preventDefault(); setLocation("/dashboard?newProject=1"); setIsOpen(false); }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setLocation]);

  // Listen for custom event (from AppNavBar and CommandPalette via Cmd+K)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("cena:open-command-palette", handleOpen);
    return () => window.removeEventListener("cena:open-command-palette", handleOpen);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const actions: QuickAction[] = [
    // Navigation
    {
      id: "nav-dashboard",
      label: t("app.quickActions.panel"),
      description: t("app.quickActions.panelDesc"),
      icon: Home,
      action: () => setLocation("/dashboard"),
      shortcut: "⌘ 1",
      category: "navigation",
    },
    {
      id: "nav-commercial",
      label: t("app.quickActions.commercial"),
      description: t("app.quickActions.commercialDesc"),
      icon: Users,
      action: () => setLocation("/commercial"),
      shortcut: "⌘ 2",
      category: "navigation",
    },
    {
      id: "nav-projects",
      label: t("app.quickActions.production"),
      description: t("app.quickActions.productionDesc"),
      icon: FolderKanban,
      action: () => setLocation("/projects"),
      shortcut: "⌘ 3",
      category: "navigation",
    },
    {
      id: "nav-analytics",
      label: t("app.quickActions.financial"),
      description: t("app.quickActions.financialDesc"),
      icon: BarChart3,
      action: () => setLocation("/analytics"),
      shortcut: "⌘ 4",
      category: "navigation",
    },
    {
      id: "nav-pipeline",
      label: t("app.quickActions.pipeline"),
      description: t("app.quickActions.pipelineDesc"),
      icon: Target,
      action: () => setLocation("/pipeline"),
      category: "navigation",
    },
    {
      id: "nav-video-reviews",
      label: t("app.quickActions.approvals"),
      description: t("app.quickActions.approvalsDesc"),
      icon: Video,
      action: () => setLocation("/video-reviews"),
      category: "navigation",
    },

    // Create Actions
    {
      id: "create-project",
      label: t("app.quickActions.newJob"),
      description: t("app.quickActions.newJobDesc"),
      icon: Plus,
      action: () => setLocation("/dashboard?newProject=1"),
      shortcut: "⌘ J",
      category: "create",
    },
    {
      id: "create-client",
      label: t("app.quickActions.newClient"),
      description: t("app.quickActions.newClientDesc"),
      icon: Plus,
      action: () => setLocation("/clients/new"),
      category: "create",
    },
    {
      id: "create-opportunity",
      label: t("app.quickActions.newNegotiation"),
      description: t("app.quickActions.newNegotiationDesc"),
      icon: Plus,
      action: () => setLocation("/pipeline?new=1"),
      category: "create",
    },

    // Settings
    {
      id: "settings",
      label: t("app.quickActions.settings"),
      description: t("app.quickActions.settingsDesc"),
      icon: Settings,
      action: () => setLocation("/settings"),
      category: "settings",
    },
  ];

  const filteredActions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return actions;

    return actions.filter(
      (action) =>
        action.label.toLowerCase().includes(term) ||
        action.description.toLowerCase().includes(term)
    );
  }, [search, t]);

  const handleSelectAction = (action: QuickAction) => {
    action.action();
    setIsOpen(false);
    setSearch("");
  };

  const groupedActions = useMemo(() => {
    const groups: Record<string, QuickAction[]> = {
      navigation: [],
      create: [],
      settings: [],
    };

    filteredActions.forEach((action) => {
      groups[action.category].push(action);
    });

    return groups;
  }, [filteredActions]);

  const categoryLabels = {
    navigation: t("app.quickActions.categoryNavigation"),
    create: t("app.quickActions.categoryCreate"),
    settings: t("app.quickActions.categorySettings"),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setIsOpen(false);
              setSearch("");
            }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-2xl bg-frame-gray-1 border border-frame-gray-3 shadow-2xl overflow-hidden"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-frame-gray-3">
                <Search className="w-5 h-5 text-frame-gray-light shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("app.quickActions.searchPlaceholder")}
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-frame-white placeholder:text-frame-gray-light"
                />
                <div className="flex items-center gap-2 text-xs text-frame-gray-light">
                  <kbd className="px-2 py-1 bg-frame-gray-2 border border-frame-gray-3 rounded font-frame-mono">
                    <Command className="w-3 h-3 inline" />K
                  </kbd>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className="p-1 hover:bg-frame-gray-2 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions List */}
              <div className="max-h-[60vh] overflow-y-auto">
                {filteredActions.length === 0 ? (
                  <div className="py-12 text-center text-frame-gray-light text-sm">
                    {t("app.quickActions.noResults")}
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedActions).map(([category, categoryActions]) => {
                      if (categoryActions.length === 0) return null;

                      return (
                        <div key={category} className="py-2">
                          <div className="px-4 py-2">
                            <p className="text-xs font-frame-mono uppercase tracking-wider text-frame-orange">
                              {categoryLabels[category as keyof typeof categoryLabels]}
                            </p>
                          </div>
                          <div>
                            {categoryActions.map((action) => {
                              const Icon = action.icon;
                              return (
                                <button
                                  key={action.id}
                                  onClick={() => handleSelectAction(action)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-frame-gray-2 transition group"
                                >
                                  <div className="p-2 rounded bg-frame-gray-2 group-hover:bg-frame-gray-3 transition">
                                    <Icon className="w-4 h-4 text-frame-gray-light group-hover:text-frame-white transition" />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-medium text-frame-white group-hover:text-frame-orange transition">
                                      {action.label}
                                    </p>
                                    <p className="text-xs text-frame-gray-light truncate">
                                      {action.description}
                                    </p>
                                  </div>
                                  {action.shortcut && (
                                    <kbd className="px-2 py-1 text-xs font-frame-mono bg-frame-gray-2 border border-frame-gray-3 rounded text-frame-gray-light">
                                      {action.shortcut}
                                    </kbd>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-frame-gray-3 bg-frame-gray-2/50">
                <div className="flex items-center gap-4 text-xs text-frame-gray-light">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-frame-gray-3 rounded">↑↓</kbd> {t("app.quickActions.navigate")}
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-frame-gray-3 rounded">Enter</kbd> {t("app.quickActions.select")}
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-frame-gray-3 rounded">Esc</kbd> {t("app.quickActions.closeAction")}
                  </span>
                </div>
                <p className="text-xs text-frame-gray-light font-frame-mono">
                  {t("app.quickActions.actionsCount").replace("{count}", String(filteredActions.length))}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
