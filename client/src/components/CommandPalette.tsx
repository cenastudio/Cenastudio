import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
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
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const commands: CommandItem[] = [
  { label: "Studio IA", path: "/tools", icon: Wrench },
  { label: "Clientes", path: "/clients", icon: Users },
  { label: "Pipeline", path: "/pipeline", icon: GitBranch },
  { label: "Intera\u00e7\u00f5es", path: "/interactions", icon: MessageSquare },
  { label: "Propostas", path: "/proposals", icon: FileText },
  { label: "Documentos", path: "/documents", icon: FileText },
  { label: "Review de V\u00eddeos", path: "/video-reviews", icon: Film },
  { label: "Equipe", path: "/collaborators", icon: UserCheck },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Perfil", path: "/profile", icon: User },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Admin", path: "/admin", icon: Shield },
  { label: "Novo Cliente", path: "/clients/new", icon: UserPlus },
];

export default function CommandPalette() {
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
    <CommandDialog open={open} onOpenChange={setOpen} title="Busca rápida" description="Navegue pelas áreas da Cena Studio">
      <CommandInput placeholder="Buscar uma área ou ação..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {commands.filter((cmd) => cmd.path !== "/admin" || isAdmin).map((cmd) => {
            const Icon = cmd.icon;
            return (
              <CommandItem
                key={cmd.path}
                value={cmd.label}
                onSelect={() => handleSelect(cmd.path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{cmd.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
