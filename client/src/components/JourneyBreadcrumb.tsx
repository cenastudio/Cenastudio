import { ChevronRight } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Contextual breadcrumb that tells the user WHERE they are in the job story.
 * Shows: Área > Contexto > Página atual
 *
 * Examples:
 *   Comercial > Atlântica Beachwear > Proposta
 *   Produção > Campanha Verão 2026 > Roteiro
 *   Financeiro > Visão geral
 */
export default function JourneyBreadcrumb() {
  const [location] = useLocation();
  const { projects, activeProject } = useProject();
  const { locale, t } = useLanguage();

  if (
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/reset-password" ||
    location === "/dashboard" ||
    location === "/home"
  ) {
    return null;
  }

  const crumbs = buildCrumbs(location, projects, activeProject, locale, t);
  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb contextual"
      className="border-b border-frame-gray-3/50 bg-frame-black/80 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <ol className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && (
                  <ChevronRight className="w-3 h-3 text-frame-gray-light/40" />
                )}
                {isLast || !crumb.href ? (
                  <span
                    className={`font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase ${
                      isLast ? "text-frame-white" : "text-frame-gray-light"
                    }`}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase text-frame-gray-light hover:text-frame-orange transition"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function buildCrumbs(
  location: string,
  projects: Array<{ id: number; name: string; clientName?: string | null }>,
  activeProject: { id: number; name: string; clientName?: string | null } | null,
  locale: string,
  t: (key: string) => string,
): Crumb[] {
  const crumbs: Crumb[] = [];

  // --- COMERCIAL area ---
  const commercialPaths = ["/commercial", "/clients", "/pipeline", "/interactions", "/proposals"];
  if (commercialPaths.some((p) => location === p || location.startsWith(p + "/"))) {
    crumbs.push({ label: t("app.breadcrumb.commercial"), href: "/commercial" });

    if (location === "/commercial") {
      crumbs.push({ label: t("app.breadcrumb.overview") });
    } else if (location === "/clients" || location === "/clients/new") {
      crumbs.push({ label: t("app.breadcrumb.clients"), href: "/clients" });
      if (location === "/clients/new") crumbs.push({ label: t("app.breadcrumb.newClient") });
    } else if (location.match(/^\/clients\/\d+\/editar/)) {
      crumbs.push({ label: t("app.breadcrumb.clients"), href: "/clients" });
      crumbs.push({ label: t("app.breadcrumb.edit") });
    } else if (location.match(/^\/clients\/\d+/)) {
      crumbs.push({ label: t("app.breadcrumb.clients"), href: "/clients" });
      crumbs.push({ label: t("app.breadcrumb.details") });
    } else if (location === "/pipeline") {
      crumbs.push({ label: t("app.breadcrumb.pipeline") });
    } else if (location === "/interactions") {
      crumbs.push({ label: t("app.breadcrumb.interactions") });
    } else if (location === "/proposals") {
      crumbs.push({ label: t("app.breadcrumb.proposals") });
    }
    return crumbs;
  }

  // --- PRODUÇÃO area (projects, tools, studio) ---
  const projectMatch = location.match(/^\/project\/(\d+)/);
  if (projectMatch) {
    const projectId = parseInt(projectMatch[1]);
    const project = projects.find((p) => p.id === projectId);
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });

    if (project?.clientName) {
      crumbs.push({ label: project.clientName, href: "/clients" });
    }

    crumbs.push({ label: project?.name || `Job #${projectId}`, href: `/project/${projectId}` });

    // Sub-pages within project
    const subPath = location.replace(`/project/${projectId}`, "");
    if (subPath.startsWith("/studio/")) {
      const toolSlug = subPath.replace("/studio/", "");
      const toolLabels: Record<string, string> = {
        briefing: "Briefing",
        roteiro: "Roteiro",
        decupagem: "Decupagem",
        callsheet: "Callsheet",
        orcamento: "Orçamento",
        proposta: "Proposta",
        contrato: "Contrato",
        moodboard: "Moodboard",
        cronograma: "Cronograma",
        checklist: "Checklist",
        entrega: "Entrega",
        assistente: "Assistente",
      };
      crumbs.push({ label: toolLabels[toolSlug] || toolSlug });
    } else if (subPath.startsWith("/journey/")) {
      const stageId = subPath.replace("/journey/", "");
      const stageLabels: Record<string, string> = {
        entry: t("app.breadcrumb.stageEntry"),
        planning: t("app.breadcrumb.stagePlanning"),
        production: t("app.breadcrumb.stageProduction"),
        review: t("app.breadcrumb.stageReview"),
        delivery: t("app.breadcrumb.stageDelivery"),
        closing: t("app.breadcrumb.stageClosing"),
      };
      crumbs.push({ label: stageLabels[stageId] || stageId });
    } else if (subPath === "/files") {
      crumbs.push({ label: t("app.breadcrumb.files") });
    } else if (subPath === "/video-reviews") {
      crumbs.push({ label: t("app.breadcrumb.approvals") });
    } else if (subPath === "/collaborators") {
      crumbs.push({ label: t("app.breadcrumb.team") });
    } else if (subPath === "/documents") {
      crumbs.push({ label: t("app.breadcrumb.documents") });
    }
    // else: root project hub, no extra crumb needed
    return crumbs;
  }

  if (location === "/projects") {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.allJobs") });
    return crumbs;
  }

  if (location === "/tools" || location.startsWith("/tools/")) {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.studioIa"), href: "/tools" });
    if (location.startsWith("/tools/")) {
      crumbs.push({ label: t("app.breadcrumb.tool") });
    }
    return crumbs;
  }

  if (location.startsWith("/studio/")) {
    const toolSlug = location.replace("/studio/", "");
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.studioIa"), href: "/tools" });

    // Map tool slugs to translation keys
    const toolNameMap: Record<string, string> = {
      roteiro: t("app.breadcrumb.tool.roteiro"),
      decupagem: t("app.breadcrumb.tool.decupagem"),
      callsheet: t("app.breadcrumb.tool.callsheet"),
      orcamento: t("app.breadcrumb.tool.orcamento"),
      proposta: t("app.breadcrumb.tool.proposta"),
      contrato: t("app.breadcrumb.tool.contrato"),
      briefing: t("app.breadcrumb.tool.briefing"),
      moodboard: t("app.breadcrumb.tool.moodboard"),
      checklist: t("app.breadcrumb.tool.checklist"),
      cronograma: t("app.breadcrumb.tool.cronograma"),
      entrega: t("app.breadcrumb.tool.entrega"),
      assistente: t("app.breadcrumb.tool.assistente"),
    };

    crumbs.push({ label: toolNameMap[toolSlug] || toolSlug });
    return crumbs;
  }

  if (location === "/files" || location.startsWith("/files/")) {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.files") });
    return crumbs;
  }

  if (location === "/video-reviews" || location.startsWith("/video-reviews/")) {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.approvals") });
    return crumbs;
  }

  if (location === "/collaborators") {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.team") });
    return crumbs;
  }

  if (location === "/documents") {
    crumbs.push({ label: t("app.breadcrumb.production"), href: "/projects" });
    crumbs.push({ label: t("app.breadcrumb.documents") });
    return crumbs;
  }

  // --- FINANCEIRO area ---
  if (location === "/analytics" || location.startsWith("/analytics")) {
    crumbs.push({ label: t("app.breadcrumb.financial"), href: "/analytics" });
    if (location !== "/analytics") {
      crumbs.push({ label: t("app.breadcrumb.details") });
    }
    return crumbs;
  }

  // --- Other pages ---
  if (location === "/profile") {
    crumbs.push({ label: t("app.breadcrumb.myAccount") });
    return crumbs;
  }

  if (location === "/company") {
    crumbs.push({ label: t("app.breadcrumb.studioSettings") });
    return crumbs;
  }

  if (location.startsWith("/admin")) {
    crumbs.push({ label: t("app.breadcrumb.admin"), href: "/admin" });
    if (location === "/admin/gerenciar") {
      crumbs.push({ label: t("app.breadcrumb.users") });
    }
    return crumbs;
  }

  return crumbs;
}
