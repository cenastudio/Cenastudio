import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Building2,
  Video,
  Zap,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  description: string;
  icon: any;
  position: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void;
  highlightPadding?: number;
}

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ProductTour({
  isOpen,
  onClose,
  onComplete,
}: ProductTourProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const tourSteps: TourStep[] = [
    {
      id: "dashboard",
      target: '[data-tour="dashboard"]',
      title: t("app.onboarding.tour.dashboardTitle"),
      description: t("app.onboarding.tour.dashboardDesc"),
      icon: LayoutDashboard,
      position: "bottom",
      highlightPadding: 8,
    },
    {
      id: "projects",
      target: '[data-tour="projects"]',
      title: t("app.onboarding.tour.projectsTitle"),
      description: t("app.onboarding.tour.projectsDesc"),
      icon: FolderKanban,
      position: "bottom",
      highlightPadding: 8,
    },
    {
      id: "clients",
      target: '[data-tour="clients"]',
      title: t("app.onboarding.tour.clientsTitle"),
      description: t("app.onboarding.tour.clientsDesc"),
      icon: Building2,
      position: "bottom",
      highlightPadding: 8,
    },
    {
      id: "reviews",
      target: '[data-tour="reviews"]',
      title: t("app.onboarding.tour.reviewsTitle"),
      description: t("app.onboarding.tour.reviewsDesc"),
      icon: Video,
      position: "bottom",
      highlightPadding: 8,
    },
    {
      id: "studio",
      target: '[data-tour="studio"]',
      title: t("app.onboarding.tour.studioTitle"),
      description: t("app.onboarding.tour.studioDesc"),
      icon: Zap,
      position: "bottom",
      highlightPadding: 8,
    },
    {
      id: "profile",
      target: '[data-tour="profile"]',
      title: t("app.onboarding.tour.profileTitle"),
      description: t("app.onboarding.tour.profileDesc"),
      icon: Settings,
      position: "left",
      highlightPadding: 8,
    },
  ];

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const Icon = step?.icon || Sparkles;

  // Calculate highlight and tooltip position
  useEffect(() => {
    if (!isOpen || !step) return;

    const updatePositions = () => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement) {
        console.warn(`Tour target not found: ${step.target}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      setHighlightRect(rect);

      // Calculate tooltip position based on step.position
      const tooltipEl = tooltipRef.current;
      if (!tooltipEl) return;

      const tooltipRect = tooltipEl.getBoundingClientRect();
      const padding = step.highlightPadding || 8;
      const gap = 16;

      let top = 0;
      let left = 0;

      switch (step.position) {
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "top":
          top = rect.top - tooltipRect.height - gap;
          left = rect.left + rect.width / 2 - tooltipRect.width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.left - tooltipRect.width - gap;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          left = rect.right + gap;
          break;
        case "center":
          top = window.innerHeight / 2 - tooltipRect.height / 2;
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          break;
      }

      // Bounds checking
      const maxLeft = window.innerWidth - tooltipRect.width - 20;
      const maxTop = window.innerHeight - tooltipRect.height - 20;

      left = Math.max(20, Math.min(left, maxLeft));
      top = Math.max(20, Math.min(top, maxTop));

      setTooltipPosition({ top, left });
    };

    // Initial calculation
    setTimeout(updatePositions, 100);

    // Recalculate on resize/scroll
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);

    return () => {
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
    };
  }, [isOpen, step, currentStep]);

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

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("cena-studio-tour-skipped", "true");
    onClose();
  };

  const handleComplete = () => {
    localStorage.setItem("cena-studio-tour-completed", "true");
    onComplete();
  };

  if (!isOpen || !step) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with spotlight effect */}
          <div className="fixed inset-0 z-[9997] pointer-events-none">
            {/* Dark backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              style={{
                clipPath: highlightRect
                  ? `polygon(
                      0% 0%,
                      0% 100%,
                      ${highlightRect.left - (step.highlightPadding || 8)}px 100%,
                      ${highlightRect.left - (step.highlightPadding || 8)}px ${highlightRect.top - (step.highlightPadding || 8)}px,
                      ${highlightRect.right + (step.highlightPadding || 8)}px ${highlightRect.top - (step.highlightPadding || 8)}px,
                      ${highlightRect.right + (step.highlightPadding || 8)}px ${highlightRect.bottom + (step.highlightPadding || 8)}px,
                      ${highlightRect.left - (step.highlightPadding || 8)}px ${highlightRect.bottom + (step.highlightPadding || 8)}px,
                      ${highlightRect.left - (step.highlightPadding || 8)}px 100%,
                      100% 100%,
                      100% 0%
                    )`
                  : "none",
              }}
            />

            {/* Highlight border */}
            {highlightRect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute border-2 border-frame-orange shadow-[0_0_20px_rgba(255,111,15,0.5)] pointer-events-none"
                style={{
                  top: highlightRect.top - (step.highlightPadding || 8),
                  left: highlightRect.left - (step.highlightPadding || 8),
                  width: highlightRect.width + (step.highlightPadding || 8) * 2,
                  height:
                    highlightRect.height + (step.highlightPadding || 8) * 2,
                }}
              />
            )}

            {/* Pulsing dot indicator */}
            {highlightRect && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-4 h-4 bg-frame-orange rounded-full pointer-events-none"
                style={{
                  top: highlightRect.top + highlightRect.height / 2 - 8,
                  left: highlightRect.left + highlightRect.width / 2 - 8,
                  boxShadow: "0 0 20px rgba(255,111,15,0.8)",
                }}
              />
            )}
          </div>

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed z-[9998] w-full max-w-md bg-frame-gray-1 border-2 border-frame-orange shadow-2xl pointer-events-auto"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1.5 hover:bg-frame-gray-2 rounded transition z-10"
              aria-label={t("app.onboarding.tour.skipTour")}
            >
              <X className="w-4 h-4 text-frame-gray-light hover:text-frame-white" />
            </button>

            {/* Progress */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="font-frame-mono text-[0.6rem] text-frame-orange uppercase tracking-wider">
                {currentStep + 1}/{tourSteps.length}
              </span>
            </div>

            {/* Content */}
            <div className="p-6 pt-10">
              {/* Icon */}
              <div className="mb-4">
                <div className="inline-flex p-3 bg-frame-orange/10 border border-frame-orange/30 rounded">
                  <Icon className="w-6 h-6 text-frame-orange" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-frame-white mb-2">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-frame-gray-light leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-frame-gray-3">
                <button
                  onClick={handleSkip}
                  className="text-xs text-frame-gray-light hover:text-frame-white transition"
                >
                  {t("app.onboarding.tour.skipTour")}
                </button>

                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <button
                      onClick={handleBack}
                      className="frame-btn-ghost !py-1.5 !px-3 !text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {t("app.onboarding.back")}
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="frame-btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1"
                  >
                    {isLastStep ? (
                      <>
                        {t("app.onboarding.tour.finish")}
                        <Sparkles className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        {t("app.onboarding.next")}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Arrow indicator pointing to target */}
            {step.position === "bottom" && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent border-b-frame-orange"
                style={{
                  filter: "drop-shadow(0 -2px 4px rgba(0,0,0,0.3))",
                }}
              />
            )}
            {step.position === "top" && (
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-frame-orange"
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            )}
            {step.position === "left" && (
              <div
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[12px] border-b-[12px] border-l-[12px] border-t-transparent border-b-transparent border-l-frame-orange"
                style={{
                  filter: "drop-shadow(2px 0 4px rgba(0,0,0,0.3))",
                }}
              />
            )}
            {step.position === "right" && (
              <div
                className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[12px] border-b-[12px] border-r-[12px] border-t-transparent border-b-transparent border-r-frame-orange"
                style={{
                  filter: "drop-shadow(-2px 0 4px rgba(0,0,0,0.3))",
                }}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
