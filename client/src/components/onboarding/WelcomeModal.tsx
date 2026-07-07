import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Check, Sparkles, Target, Zap, Rocket, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStartTour?: () => void;
  userName?: string;
}

const stepIcons = [Sparkles, Target, Zap, Rocket];

export default function WelcomeModal({
  isOpen,
  onClose,
  onComplete,
  onStartTour,
  userName,
}: WelcomeModalProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoProjectId, setDemoProjectId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const steps = [
    {
      id: "welcome",
      icon: Sparkles,
      title: t("app.onboarding.welcomeTitle"),
      description: t("app.onboarding.welcomeDescription"),
      features: [
        t("app.onboarding.welcomeFeature1"),
        t("app.onboarding.welcomeFeature2"),
        t("app.onboarding.welcomeFeature3"),
        t("app.onboarding.welcomeFeature4"),
      ],
    },
    {
      id: "tour",
      icon: Target,
      title: t("app.onboarding.tourTitle"),
      description: t("app.onboarding.tourDescription"),
      features: [
        t("app.onboarding.tourFeature1"),
        t("app.onboarding.tourFeature2"),
        t("app.onboarding.tourFeature3"),
        t("app.onboarding.tourFeature4"),
      ],
    },
    {
      id: "demo",
      icon: Zap,
      title: t("app.onboarding.demoTitle"),
      description: t("app.onboarding.demoDescription"),
      features: [
        t("app.onboarding.demoFeature1"),
        t("app.onboarding.demoFeature2"),
        t("app.onboarding.demoFeature3"),
        t("app.onboarding.demoFeature4"),
      ],
    },
    {
      id: "start",
      icon: Rocket,
      title: t("app.onboarding.startTitle"),
      description: t("app.onboarding.startDescription"),
      features: [
        t("app.onboarding.startFeature1"),
        t("app.onboarding.startFeature2"),
        t("app.onboarding.startFeature3"),
        t("app.onboarding.startFeature4"),
      ],
    },
  ];

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const Icon = step.icon;

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Force dark theme
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Check if demo project exists when opening Step 3
  useEffect(() => {
    if (isOpen && currentStep === 2) {
      api.demo
        .check()
        .then((result) => {
          if (result.exists && result.project) {
            setDemoProjectId(result.project.id);
          }
        })
        .catch(() => {
          // Silently fail, demo check is not critical
        });
    }
  }, [isOpen, currentStep]);

  const handleNext = () => {
    // Step 2: Tour - if onStartTour provided, trigger tour
    if (currentStep === 1 && onStartTour) {
      onStartTour();
      return;
    }

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
    if (neverShowAgain) {
      localStorage.setItem("cena-studio-welcome-dismissed", "true");
    }
    onClose();
  };

  const handleComplete = () => {
    localStorage.setItem("cena-studio-welcome-completed", "true");
    if (neverShowAgain) {
      localStorage.setItem("cena-studio-welcome-dismissed", "true");
    }
    onComplete();
  };

  const handleCreateDemo = async () => {
    setIsCreatingDemo(true);
    try {
      const result = await api.demo.create();
      setDemoProjectId(result.data.project.id);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || t("app.onboarding.errorDemo"));
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const handleViewDemo = () => {
    if (demoProjectId) {
      handleComplete();
      setLocation(`/project/${demoProjectId}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Cinematic Backdrop with Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: `
                radial-gradient(circle at 50% 50%, rgba(255, 107, 0, 0.15) 0%, transparent 50%),
                linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)
              `,
            }}
          >
            {/* Animated Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255, 107, 0, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 107, 0, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />

            {/* Blur Layer */}
            <div className="absolute inset-0 backdrop-blur-sm" />
          </motion.div>

          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl relative"
              style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                border: '1px solid rgba(255, 107, 0, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 100px rgba(255, 107, 0, 0.1)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 hover:bg-frame-gray-2 rounded transition z-10"
                aria-label={t("app.onboarding.close")}
              >
                <X className="w-5 h-5 text-frame-gray-light hover:text-frame-white" />
              </button>

              {/* Progress Dots */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2 h-2 rounded-full transition ${
                      index === currentStep
                        ? "bg-frame-orange w-6"
                        : index < currentStep
                        ? "bg-frame-orange/50"
                        : "bg-frame-gray-3"
                    }`}
                    aria-label={t("app.onboarding.goToStep").replace("{step}", String(index + 1))}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="p-8 pt-16 min-h-[500px] flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col"
                  >
                    {/* Icon */}
                    <div className="mb-6">
                      <div className="inline-flex p-4 bg-frame-orange/10 border border-frame-orange/30 rounded-lg">
                        <Icon className="w-8 h-8 text-frame-orange" />
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-frame-white mb-3">
                      {currentStep === 0 && userName
                        ? t("app.onboarding.hello").replace("{name}", userName)
                        : step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-frame-gray-light text-lg mb-8 leading-relaxed">
                      {step.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {step.features.map((feature, index) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3"
                        >
                          <div className="mt-1 p-1 bg-frame-orange/20 rounded">
                            <Check className="w-4 h-4 text-frame-orange" />
                          </div>
                          <p className="text-frame-white text-sm">{feature}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Step 3: Demo Project Actions */}
                    {currentStep === 2 && (
                      <div className="mb-8 border border-frame-gray-3 bg-frame-gray-2/50 p-6">
                        <p className="text-frame-gray-light text-sm mb-4">
                          {demoProjectId
                            ? t("app.onboarding.demoExists")
                            : t("app.onboarding.demoCreate")}
                        </p>
                        <div className="flex gap-3">
                          {demoProjectId ? (
                            <button
                              onClick={handleViewDemo}
                              className="frame-btn-primary flex items-center gap-2"
                            >
                              <Target className="w-4 h-4" />
                              {t("app.onboarding.viewDemo")}
                            </button>
                          ) : (
                            <button
                              onClick={handleCreateDemo}
                              disabled={isCreatingDemo}
                              className="frame-btn-primary flex items-center gap-2"
                            >
                              {isCreatingDemo ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  {t("app.onboarding.creating")}
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4" />
                                  {t("app.onboarding.createDemo")}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Footer */}
                <div className="pt-6 border-t border-frame-gray-3">
                  <div className="flex items-center justify-between">
                    {/* Never show again */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={neverShowAgain}
                        onChange={(e) => setNeverShowAgain(e.target.checked)}
                        className="w-4 h-4 bg-frame-gray-2 border border-frame-gray-3 rounded accent-frame-orange cursor-pointer"
                      />
                      <span className="text-xs text-frame-gray-light group-hover:text-frame-white transition">
                        {t("app.onboarding.dontShowAgain")}
                      </span>
                    </label>

                    {/* Navigation */}
                    <div className="flex items-center gap-3">
                      {!isFirstStep && (
                        <button
                          onClick={handleBack}
                          className="frame-btn-ghost flex items-center gap-2"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          {t("app.onboarding.back")}
                        </button>
                      )}

                      {!isLastStep && (
                        <button
                          onClick={handleSkip}
                          className="frame-btn-ghost"
                        >
                          {t("app.onboarding.skip")}
                        </button>
                      )}

                      <button
                        onClick={handleNext}
                        className="frame-btn-primary flex items-center gap-2"
                      >
                        {currentStep === 1 ? (
                          <>
                            <Target className="w-4 h-4" />
                            {t("app.onboarding.startTour")}
                          </>
                        ) : isLastStep ? (
                          <>
                            <Rocket className="w-4 h-4" />
                            {t("app.onboarding.start")}
                          </>
                        ) : (
                          <>
                            {t("app.onboarding.next")}
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
