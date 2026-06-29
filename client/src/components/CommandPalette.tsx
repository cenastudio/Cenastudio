import { useEffect, useState } from "react";
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
  LayoutDashboard,
  Users,
  GitBranch,
  MessageSquare,
  FileText,
  Film,
  UserCheck,
  BarChart3,
  User,
  Shield,
  UserPlus,
  Wrench,
} from "lucide-react";

interface CommandItem {
  labelKey: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMAND_DEFS: CommandItem[] = [
  { labelKey: "app.commandPalette.cmd.studioIa", path: "/tools", icon: Wrench },
  { labelKey: "app.commandPalette.cmd.clients", path: "/clients", icon: Users },
  { labelKey: "app.commandPalette.cmd.pipeline", path: "/pipeline", icon: GitBranch },
  { labelKey: "app.commandPalette.cmd.interactions", path: "/interactions", icon: MessageSquare },
  { labelKey: "app.commandPalette.cmd.proposals", path: "/proposals", icon: FileText },
  { labelKey: "app.commandPalette.cmd.documents", path: "/documents", icon: FileText },
  { labelKey: "app.commandPalette.cmd.videoReviews", path: "/video-reviews", icon: Film },
  { labelKey: "app.commandPalette.cmd.team", path: "/collaborators", icon: UserCheck },
  { labelKey: "app.commandPalette.cmd.analytics", path: "/analytics", icon: BarChart3 },
  { labelKey: "app.commandPalette.cmd.profile", path: "/profile", icon: User },
  { labelKey: "app.commandPalette.cmd.dashboard", path: "/dashboard", icon: LayoutDashboard },
  { labelKey: "app.commandPalette.cmd.admin", path: "/admin", icon: Shield },
  { labelKey: "app.commandPalette.cmd.newClient", path: "/clients/new", icon: UserPlus },
];

export default function CommandPalette() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const handleOpen = () => setOpen(true);

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("cena:open-command-palette", handleOpen);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("cena:open-command-palette", handleOpen);
    };
  }, []);

  const handleSelect = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title={t("app.commandPalette.title") as string} description={t("app.commandPalette.description") as string}>
      <CommandInput placeholder={t("app.commandPalette.placeholder") as string} />
      <CommandList>
        <CommandEmpty>{t("app.commandPalette.noResults") as string}</CommandEmpty>
        <CommandGroup heading={t("app.commandPalette.navigation") as string}>
          {COMMAND_DEFS.filter((cmd) => cmd.path !== "/admin" || isAdmin).map((cmd) => {
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
      </CommandList>
    </CommandDialog>
  );
}
