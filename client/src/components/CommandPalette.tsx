import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Home,
  Users,
  Clapperboard,
  Bot,
  DollarSign,
  GitBranch,
  MessageSquare,
  FileText,
  Film,
  UserCheck,
  User,
  Shield,
  UserPlus,
  BriefcaseBusiness,
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface CommandItemDef {
  labelKey: string;
  label: string; // For fuzzy search
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "primary" | "secondary" | "actions";
  keywords: string[]; // For enhanced fuzzy matching
}

// 5 PRIMARY NAVIGATION TABS per design spec
const PRIMARY_TABS: CommandItemDef[] = [
  {
    labelKey: "app.nav.home",
    label: "HOME",
    path: "/dashboard",
    icon: Home,
    category: "primary",
    keywords: ["home", "dashboard", "inicio", "painel"]
  },
  {
    labelKey: "app.nav.clients",
    label: "CLIENTS",
    path: "/commercial",
    icon: Users,
    category: "primary",
    keywords: ["clients", "clientes", "commercial", "crm"]
  },
  {
    labelKey: "app.nav.jobs",
    label: "JOBS",
    path: "/projects",
    icon: Clapperboard,
    category: "primary",
    keywords: ["jobs", "projects", "projetos", "trabalhos"]
  },
  {
    labelKey: "app.nav.studio",
    label: "STUDIO",
    path: "/tools",
    icon: Bot,
    category: "primary",
    keywords: ["studio", "ai", "ia", "tools", "ferramentas"]
  },
  {
    labelKey: "app.nav.finance",
    label: "FINANCE",
    path: "/analytics",
    icon: DollarSign,
    category: "primary",
    keywords: ["finance", "financeiro", "analytics", "money", "dinheiro"]
  },
];

// Secondary navigation items (sub-pages)
const SECONDARY_COMMANDS: CommandItemDef[] = [
  {
    labelKey: "app.commandPalette.cmd.clients",
    label: "Clients List",
    path: "/clients",
    icon: Users,
    category: "secondary",
    keywords: ["clients", "clientes", "list", "lista"]
  },
  {
    labelKey: "app.commandPalette.cmd.pipeline",
    label: "Pipeline",
    path: "/pipeline",
    icon: GitBranch,
    category: "secondary",
    keywords: ["pipeline", "sales", "vendas"]
  },
  {
    labelKey: "app.commandPalette.cmd.interactions",
    label: "Interactions",
    path: "/interactions",
    icon: MessageSquare,
    category: "secondary",
    keywords: ["interactions", "interações", "messages", "mensagens"]
  },
  {
    labelKey: "app.commandPalette.cmd.proposals",
    label: "Proposals",
    path: "/proposals",
    icon: FileText,
    category: "secondary",
    keywords: ["proposals", "propostas"]
  },
  {
    labelKey: "app.commandPalette.cmd.documents",
    label: "Documents",
    path: "/documents",
    icon: FileText,
    category: "secondary",
    keywords: ["documents", "documentos", "files"]
  },
  {
    labelKey: "app.commandPalette.cmd.videoReviews",
    label: "Video Reviews",
    path: "/video-reviews",
    icon: Film,
    category: "secondary",
    keywords: ["video", "reviews", "approval", "aprovação"]
  },
  {
    labelKey: "app.commandPalette.cmd.team",
    label: "Team",
    path: "/collaborators",
    icon: UserCheck,
    category: "secondary",
    keywords: ["team", "equipe", "collaborators", "colaboradores"]
  },
  {
    labelKey: "app.commandPalette.cmd.profile",
    label: "Profile",
    path: "/profile",
    icon: User,
    category: "secondary",
    keywords: ["profile", "perfil", "account", "conta"]
  },
  {
    labelKey: "app.commandPalette.cmd.admin",
    label: "Admin",
    path: "/admin",
    icon: Shield,
    category: "secondary",
    keywords: ["admin", "administração"]
  },
];

// Quick actions
const ACTION_COMMANDS: CommandItemDef[] = [
  {
    labelKey: "app.commandPalette.cmd.newClient",
    label: "New Client",
    path: "/clients/new",
    icon: UserPlus,
    category: "actions",
    keywords: ["new", "novo", "client", "cliente", "add", "adicionar"]
  },
];

/**
 * Fuzzy search implementation
 * Matches if query characters appear in order in the target string
 * Example: "cli" matches "clients", "clientes"
 */
function fuzzyMatch(query: string, target: string, keywords: string[]): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase();

  if (!normalizedQuery) return true;

  // Exact match check
  if (normalizedTarget.includes(normalizedQuery)) return true;

  // Check keywords
  if (keywords.some(keyword => keyword.toLowerCase().includes(normalizedQuery))) {
    return true;
  }

  // Fuzzy match: characters in order
  let queryIndex = 0;
  for (let i = 0; i < normalizedTarget.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedTarget[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === normalizedQuery.length;
}

export default function CommandPalette() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();
  const { projects } = useProject();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Esc key closes modal
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    const handleOpen = () => setOpen(true);

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("cena:open-command-palette", handleOpen);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("cena:open-command-palette", handleOpen);
    };
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter commands based on fuzzy search
  const filterCommands = useCallback((commands: CommandItemDef[], searchQuery: string) => {
    return commands.filter(cmd => {
      const translatedLabel = t(cmd.labelKey) as string;
      return fuzzyMatch(searchQuery, translatedLabel, cmd.keywords) ||
             fuzzyMatch(searchQuery, cmd.label, cmd.keywords);
    });
  }, [t]);

  const filteredPrimary = filterCommands(PRIMARY_TABS, query);
  const filteredSecondary = filterCommands(
    SECONDARY_COMMANDS.filter(cmd => cmd.path !== "/admin" || isAdmin),
    query
  );
  const filteredActions = filterCommands(ACTION_COMMANDS, query);
  const filteredProjects = projects
    .filter(project =>
      fuzzyMatch(query, project.name, []) ||
      fuzzyMatch(query, project.clientName || "", [])
    )
    .slice(0, 8);

  const handleSelect = useCallback((path: string) => {
    setLocation(path);
    setOpen(false);
  }, [setLocation]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("app.commandPalette.title") as string}
      description={t("app.commandPalette.description") as string}
    >
      <CommandInput
        placeholder={t("app.commandPalette.placeholder") as string}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t("app.commandPalette.noResults") as string}</CommandEmpty>

        {/* PRIMARY NAVIGATION - 5 Tabs */}
        {filteredPrimary.length > 0 && (
          <CommandGroup heading="Navegação">
            {filteredPrimary.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.path}
                  value={t(cmd.labelKey) as string}
                  onSelect={() => handleSelect(cmd.path)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span className="font-medium">{t(cmd.labelKey) as string}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* SECONDARY NAVIGATION */}
        {filteredSecondary.length > 0 && (
          <CommandGroup heading="Páginas">
            {filteredSecondary.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.path}
                  value={t(cmd.labelKey) as string}
                  onSelect={() => handleSelect(cmd.path)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{t(cmd.labelKey) as string}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* QUICK ACTIONS */}
        {filteredActions.length > 0 && (
          <CommandGroup heading="Ações rápidas">
            {filteredActions.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <CommandItem
                  key={cmd.path}
                  value={t(cmd.labelKey) as string}
                  onSelect={() => handleSelect(cmd.path)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{t(cmd.labelKey) as string}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* RECENT PROJECTS */}
        {filteredProjects.length > 0 && (
          <CommandGroup heading="Jobs">
            {filteredProjects.map((project) => (
              <CommandItem
                key={project.id}
                value={`${project.name} ${project.clientName || ""}`}
                onSelect={() => handleSelect(`/project/${project.id}`)}
              >
                <Clapperboard className="mr-2 h-4 w-4" />
                <span>{project.name}</span>
                {project.clientName && (
                  <span className="ml-2 text-xs text-muted-foreground">• {project.clientName}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
