import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FolderPlus, LayoutDashboard, Loader2, Route, X } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStartTour?: () => void;
  onStartCommercial?: () => void;
  userName?: string;
}

export default function WelcomeModal({
  isOpen,
  onClose,
  onComplete,
  onStartTour,
  onStartCommercial,
  userName,
}: WelcomeModalProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoProjectId, setDemoProjectId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    api.demo
      .check()
      .then((result) => setDemoProjectId(result.exists && result.project ? result.project.id : null))
      .catch(() => setDemoProjectId(null));

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const complete = () => {
    localStorage.setItem("cena-studio-welcome-completed", "true");
    onComplete();
  };

  const defer = () => {
    localStorage.setItem("cena-studio-welcome-dismissed", "true");
    onClose();
  };

  const startCommercial = () => {
    complete();
    onStartCommercial?.();
  };

  const startTour = () => {
    onStartTour?.();
  };

  const openDemo = async () => {
    if (demoProjectId) {
      complete();
      setLocation(`/project/${demoProjectId}`);
      return;
    }

    setIsCreatingDemo(true);
    try {
      const result = await api.demo.create();
      complete();
      setLocation(`/project/${result.data.project.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.onboarding.errorDemo"));
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const options = [
    {
      icon: FolderPlus,
      title: t("app.onboarding.startCommercial"),
      description: t("app.onboarding.startCommercialDesc"),
      action: startCommercial,
      primary: true,
    },
    {
      icon: Route,
      title: demoProjectId ? t("app.onboarding.viewDemo") : t("app.onboarding.exploreDemo"),
      description: t("app.onboarding.exploreDemoDesc"),
      action: openDemo,
      loading: isCreatingDemo,
    },
    {
      icon: LayoutDashboard,
      title: t("app.onboarding.tourAction"),
      description: t("app.onboarding.tourActionDesc"),
      action: startTour,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end bg-frame-black/85 p-3 sm:items-center sm:justify-center sm:p-6">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto border border-frame-gray-3 bg-frame-black shadow-2xl"
          >
            <button
              type="button"
              onClick={defer}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center border border-transparent text-frame-gray-light transition hover:border-frame-gray-3 hover:text-frame-white"
              aria-label={t("app.onboarding.close")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="p-5 pb-4 sm:p-8 sm:pb-6">
              <p className="mb-3 font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">
                {t("app.onboarding.welcomeEyebrow")}
              </p>
              <h2 id={titleId} className="max-w-md pr-10 text-2xl font-bold text-frame-white sm:text-3xl">
                {userName ? t("app.onboarding.hello").replace("{name}", userName) : t("app.onboarding.welcomeTitle")}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-frame-gray-light sm:text-base">
                {t("app.onboarding.welcomeLead")}
              </p>

              <ol className="mt-6 grid grid-cols-3 border-y border-frame-gray-3/70 py-4">
                {["journeyClient", "journeyProject", "journeyDelivery"].map((key, index) => (
                  <li key={key} className="min-w-0 px-2 first:pl-0 last:pr-0">
                    <span className="block font-frame-mono text-[0.55rem] tracking-[0.14em] text-frame-orange">{String(index + 1).padStart(2, "0")}</span>
                    <span className="mt-1 block text-xs font-medium text-frame-white">{t(`app.onboarding.${key}`)}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 space-y-2">
                {options.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.title}
                      type="button"
                      onClick={option.action}
                      disabled={option.loading}
                      className={`group flex min-h-14 w-full items-center gap-3 border p-3 text-left transition disabled:cursor-wait disabled:opacity-70 ${
                        option.primary
                          ? "border-frame-orange bg-frame-orange text-frame-black hover:bg-frame-orange-dark"
                          : "border-frame-gray-3 bg-frame-gray-1/20 text-frame-white hover:border-frame-orange/60"
                      }`}
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center border ${option.primary ? "border-frame-black/20 bg-frame-black/10" : "border-frame-orange/30 bg-frame-orange/10"}`}>
                        {option.loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className={`h-4 w-4 ${option.primary ? "text-frame-black" : "text-frame-orange"}`} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{option.title}</span>
                        <span className={`mt-0.5 block text-xs leading-relaxed ${option.primary ? "text-frame-black/75" : "text-frame-gray-light"}`}>{option.description}</span>
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${option.primary ? "text-frame-black" : "text-frame-orange"}`} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-frame-gray-3 px-5 py-3 sm:px-8">
              <p className="text-xs text-frame-gray-light">{t("app.onboarding.welcomeFooter")}</p>
              <button type="button" onClick={defer} className="min-h-11 px-2 text-xs text-frame-gray-light transition hover:text-frame-white">
                {t("app.onboarding.defer")}
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
