import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Settings,
  X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  t: (key: string) => string;
}

function TourCard({ step, currentStep, totalSteps, isFirstStep, isLastStep, onBack, onNext, onSkip, t }: TourCardProps) {
  const Icon = step.icon;

  return (
    <div className="bg-frame-black">
      <div className="flex items-center justify-between border-b border-frame-gray-3 px-5 py-3">
        <span className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">
          {String(currentStep + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
        </span>
        <button type="button" onClick={onSkip} className="grid h-11 w-11 place-items-center text-frame-gray-light transition hover:text-frame-white" aria-label={t("app.onboarding.tour.skipTour")}>
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-4 grid h-11 w-11 place-items-center border border-frame-orange/30 bg-frame-orange/10">
          <span aria-hidden="true"><Icon className="h-5 w-5 text-frame-orange" /></span>
        </div>
        <h2 className="text-xl font-bold text-frame-white">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-frame-gray-light">{step.description}</p>

        <div className="mt-5 flex items-center justify-between border-t border-frame-gray-3 pt-3">
          <button type="button" onClick={onSkip} className="min-h-11 px-1 text-xs text-frame-gray-light transition hover:text-frame-white">
            {t("app.onboarding.tour.skipTour")}
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button type="button" onClick={onBack} className="frame-btn-ghost inline-flex min-h-11 items-center gap-1 !px-3 !py-2 text-xs">
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {t("app.onboarding.back")}
              </button>
            )}
            <button type="button" onClick={onNext} className="frame-btn-primary inline-flex min-h-11 items-center gap-1 !px-3 !py-2 text-xs">
              {isLastStep ? t("app.onboarding.tour.finish") : t("app.onboarding.next")}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductTour({ isOpen, onClose, onComplete }: ProductTourProps) {
  const { t } = useLanguage();
  const { isTeamMember } = useAuth();
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [desktopPosition, setDesktopPosition] = useState({ top: 24, left: 24 });
  const desktopCardRef = useRef<HTMLDivElement>(null);

  const tourSteps = useMemo<TourStep[]>(() => {
    const steps: TourStep[] = [
      { id: "dashboard", target: '[data-tour="dashboard"]', title: t("app.onboarding.tour.dashboardTitle"), description: t("app.onboarding.tour.dashboardDesc"), icon: LayoutDashboard },
      { id: "mytasks", target: '[data-tour="mytasks"]', title: t("app.onboarding.tour.myTasksTitle"), description: t("app.onboarding.tour.myTasksDesc"), icon: CheckSquare },
      { id: "projects", target: '[data-tour="projects"]', title: t("app.onboarding.tour.projectsTitle"), description: t("app.onboarding.tour.projectsDesc"), icon: FolderKanban },
    ];

    if (!isTeamMember) {
      steps.push(
        { id: "clients", target: '[data-tour="clients"]', title: t("app.onboarding.tour.clientsTitle"), description: t("app.onboarding.tour.clientsDesc"), icon: Building2 },
        { id: "analytics", target: '[data-tour="analytics"]', title: t("app.onboarding.tour.analyticsTitle"), description: t("app.onboarding.tour.analyticsDesc"), icon: BarChart3 },
      );
    }

    steps.push({ id: "profile", target: '[data-tour="profile"]', title: t("app.onboarding.tour.profileTitle"), description: t("app.onboarding.tour.profileDesc"), icon: Settings });
    return steps;
  }, [isTeamMember, t]);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePosition = () => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>(step.target));
      const target = targets.find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) ?? targets[0];

      if (!target) {
        setHighlightRect(null);
        return;
      }

      if (window.innerWidth < 1024) {
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "nearest" });
      }

      const rect = target.getBoundingClientRect();
      setHighlightRect(rect);
      const card = desktopCardRef.current;
      if (!card) return;

      const cardRect = card.getBoundingClientRect();
      const gap = 16;
      const left = Math.max(20, Math.min(rect.left + rect.width / 2 - cardRect.width / 2, window.innerWidth - cardRect.width - 20));
      const top = rect.bottom + gap + cardRect.height <= window.innerHeight - 20
        ? rect.bottom + gap
        : Math.max(20, rect.top - cardRect.height - gap);
      setDesktopPosition({ top, left });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [currentStep, isOpen, reduceMotion, step]);

  const complete = () => {
    localStorage.setItem("cena-studio-tour-completed", "true");
    localStorage.setItem("cena-studio-welcome-completed", "true");
    onComplete();
  };

  const skip = () => {
    localStorage.setItem("cena-studio-tour-skipped", "true");
    localStorage.setItem("cena-studio-welcome-dismissed", "true");
    onClose();
  };

  if (!isOpen || !step) return null;

  const cardProps: TourCardProps = {
    step,
    currentStep,
    totalSteps: tourSteps.length,
    isFirstStep,
    isLastStep,
    onBack: () => setCurrentStep((value) => Math.max(0, value - 1)),
    onNext: () => (isLastStep ? complete() : setCurrentStep((value) => value + 1)),
    onSkip: skip,
    t,
  };

  return (
    <div className="fixed inset-0 z-[9998]" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-frame-black/80 backdrop-blur-sm" />
      {highlightRect && (
        <motion.div
          aria-hidden="true"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute hidden border border-frame-orange lg:block"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
          }}
        />
      )}

      <motion.div
        ref={desktopCardRef}
        data-testid="product-tour-desktop-card"
        role="dialog"
        aria-modal="true"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto fixed z-[9999] hidden w-[min(26rem,calc(100vw-2.5rem))] border border-frame-orange bg-frame-black shadow-2xl lg:block"
        style={desktopPosition}
      >
        <TourCard {...cardProps} />
      </motion.div>

      <motion.div
        data-testid="product-tour-sheet"
        role="dialog"
        aria-modal="true"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[9999] border-t border-frame-orange bg-frame-black shadow-2xl lg:hidden"
      >
        <div className="mx-auto h-1 w-10 bg-frame-gray-3" aria-hidden="true" />
        <TourCard {...cardProps} />
      </motion.div>
    </div>
  );
}
