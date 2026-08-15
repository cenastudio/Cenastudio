import { useState } from "react";
import { BriefcaseBusiness, Clapperboard, FileCheck2, FolderKanban, PackageCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const LANDING_WORKFLOW_STAGES = [
  {
    id: "commercial",
    image: "/landing/product/dashboard.png",
    route: "/commercial",
    nameKey: "app.landing.workflow.commercial.name",
    titleKey: "app.landing.workflow.commercial.title",
    descriptionKey: "app.landing.workflow.commercial.description",
    altKey: "app.landing.workflow.commercial.alt",
    surfaceKey: "app.landing.workflow.commercial.surface",
    icon: BriefcaseBusiness,
  },
  {
    id: "project",
    image: "/landing/product/project-hub.png",
    route: "/projects",
    nameKey: "app.landing.workflow.project.name",
    titleKey: "app.landing.workflow.project.title",
    descriptionKey: "app.landing.workflow.project.description",
    altKey: "app.landing.workflow.project.alt",
    surfaceKey: "app.landing.workflow.project.surface",
    icon: FolderKanban,
  },
  {
    id: "production",
    image: "/landing/product/studio.png",
    route: "/studio",
    nameKey: "app.landing.workflow.production.name",
    titleKey: "app.landing.workflow.production.title",
    descriptionKey: "app.landing.workflow.production.description",
    altKey: "app.landing.workflow.production.alt",
    surfaceKey: "app.landing.workflow.production.surface",
    icon: Clapperboard,
  },
  {
    id: "approval",
    image: "/landing/product/project-hub.png",
    route: "/portal/proposals",
    nameKey: "app.landing.workflow.approval.name",
    titleKey: "app.landing.workflow.approval.title",
    descriptionKey: "app.landing.workflow.approval.description",
    altKey: "app.landing.workflow.approval.alt",
    surfaceKey: "app.landing.workflow.approval.surface",
    icon: FileCheck2,
  },
  {
    id: "delivery",
    image: "/landing/product/dashboard.png",
    route: "/projects",
    nameKey: "app.landing.workflow.delivery.name",
    titleKey: "app.landing.workflow.delivery.title",
    descriptionKey: "app.landing.workflow.delivery.description",
    altKey: "app.landing.workflow.delivery.alt",
    surfaceKey: "app.landing.workflow.delivery.surface",
    icon: PackageCheck,
  },
] as const;

export default function ProductProofSection() {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<(typeof LANDING_WORKFLOW_STAGES)[number]["id"]>("commercial");
  const selectedStage = LANDING_WORKFLOW_STAGES.find((stage) => stage.id === selectedId) ?? LANDING_WORKFLOW_STAGES[0];

  return (
    <section id="product-proof" className="landing-section landing-product-proof">
      <span id="how-it-works" aria-hidden="true" className="block h-0 w-0" />

      <div className="landing-shell">
        <header className="max-w-[720px]">
          <p className="landing-eyebrow mb-4">{t("app.landing.workflow.eyebrow") as string}</p>
          <h2 className="landing-heading text-[clamp(2.35rem,4.6vw,4.7rem)]">
            {t("app.landing.workflow.heading") as string}
          </h2>
          <p className="landing-copy mt-5 max-w-[620px]">{t("app.landing.workflow.copy") as string}</p>
        </header>

        <div className="product-workflow mt-10 lg:mt-14">
          <div className="product-workflow-steps" role="tablist" aria-label={t("app.landing.workflow.stepsLabel") as string}>
            {LANDING_WORKFLOW_STAGES.map((stage, index) => {
              const Icon = stage.icon;
              const isSelected = stage.id === selectedStage.id;

              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`landing-workflow-${stage.id}`}
                  id={`landing-workflow-tab-${stage.id}`}
                  onClick={() => setSelectedId(stage.id)}
                  className={`product-workflow-step ${isSelected ? "is-active" : ""}`}
                  data-testid={`landing-workflow-step-${stage.id}`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <strong>{t(stage.nameKey) as string}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <article
            id={`landing-workflow-${selectedStage.id}`}
            role="tabpanel"
            aria-labelledby={`landing-workflow-tab-${selectedStage.id}`}
            className="product-workflow-stage"
            data-route={selectedStage.route}
            data-testid="landing-workflow-stage"
          >
            <div className="product-workflow-copy">
              <p className="landing-eyebrow">{t(selectedStage.surfaceKey) as string}</p>
              <h3>{t(selectedStage.titleKey) as string}</h3>
              <p>{t(selectedStage.descriptionKey) as string}</p>
            </div>
            <div className="product-workflow-screen">
              <img src={selectedStage.image} alt={t(selectedStage.altKey) as string} loading="lazy" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
