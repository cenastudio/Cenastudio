import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  homeLabel?: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projetos",
  clients: "Clientes",
  pipeline: "Pipeline",
  "video-reviews": "Video Reviews",
  studio: "Studio",
  tools: "Tools",
  files: "Arquivos",
  documents: "Documentos",
  proposals: "Propostas",
  analytics: "Analytics",
  "commercial-hub": "Hub Comercial",
  settings: "Configurações",
  profile: "Perfil",
  journey: "Jornada",
  briefing: "Briefing",
  script: "Roteiro",
  storyboard: "Storyboard",
  production: "Produção",
  edit: "Edição",
  delivery: "Entrega",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = "";

  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Skip numeric IDs (like project IDs)
    if (/^\d+$/.test(segment)) {
      continue;
    }

    // Get label from dictionary or use segment as-is
    const label = routeLabels[segment] || segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.push({
      label,
      path: currentPath,
    });
  }

  return breadcrumbs;
}

export default function Breadcrumbs({ items, homeLabel = "Início" }: BreadcrumbsProps) {
  const [location] = useLocation();

  // Use provided items or auto-generate from location
  const breadcrumbs = items || generateBreadcrumbs(location);

  // Don't show breadcrumbs on home/dashboard
  if (location === "/" || location === "/dashboard") {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" data-touch-target-exempt className="mb-6">
      <ol className="flex items-center gap-2 text-sm">
        {/* Home */}
        <li>
          <Link href="/dashboard">
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-frame-gray-light hover:text-frame-white transition group"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{homeLabel}</span>
            </motion.a>
          </Link>
        </li>

        {/* Breadcrumb Items */}
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-frame-gray-light/50" />

              {isLast ? (
                <span className="text-frame-white font-medium">
                  {item.label}
                </span>
              ) : (
                <Link href={item.path}>
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-frame-gray-light hover:text-frame-white transition truncate max-w-[200px]"
                  >
                    {item.label}
                  </motion.a>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Export helper for custom breadcrumbs
export { type BreadcrumbItem };
