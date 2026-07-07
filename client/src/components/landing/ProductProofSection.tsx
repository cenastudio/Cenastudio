import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Play, Pause, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Zap, Video } from "lucide-react";

interface ProductScene {
  id: string;
  title: string;
  description: string;
  image: string;
  annotation: {
    text: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  };
  icon: any;
}

const SCENES_PT: ProductScene[] = [
  {
    id: "dashboard",
    title: "Dashboard Inteligente",
    description: "Visão geral de todos os projetos, próximas ações e radar do diretor em um só lugar.",
    image: "/landing/product/dashboard.png",
    annotation: {
      text: "← Central operacional",
      position: "top-right",
    },
    icon: Sparkles,
  },
  {
    id: "project-hub",
    title: "Centro do Projeto",
    description: "Cada job vira um hub completo com meta, equipe, arquivos e jornada criativa.",
    image: "/landing/product/project-hub.png",
    annotation: {
      text: "Hub do projeto →",
      position: "center",
    },
    icon: Zap,
  },
  {
    id: "studio",
    title: "Studio IA",
    description: "Ferramentas de IA para roteiros, storyboards, briefings e documentos operacionais.",
    image: "/landing/product/studio.png",
    annotation: {
      text: "IA gerando conteúdo ↓",
      position: "bottom-right",
    },
    icon: Video,
  },
];

const SCENES_EN: ProductScene[] = [
  {
    id: "dashboard",
    title: "Smart Dashboard",
    description: "A single view of every project, next actions and the director's radar.",
    image: "/landing/product/dashboard.png",
    annotation: {
      text: "← Operations hub",
      position: "top-right",
    },
    icon: Sparkles,
  },
  {
    id: "project-hub",
    title: "Project Hub",
    description: "Every job becomes a complete hub with goals, team, files and creative journey.",
    image: "/landing/product/project-hub.png",
    annotation: {
      text: "Project hub →",
      position: "center",
    },
    icon: Zap,
  },
  {
    id: "studio",
    title: "AI Studio",
    description: "AI tools for scripts, storyboards, briefings and operational documents.",
    image: "/landing/product/studio.png",
    annotation: {
      text: "AI generating content ↓",
      position: "bottom-right",
    },
    icon: Video,
  },
];

export default function ProductProofSection() {
  const { t, locale } = useLanguage();
  const isEn = locale === "en";
  const scenes = isEn ? SCENES_EN : SCENES_PT;
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const scene = scenes[currentScene];
  const Icon = scene.icon;
  const duration = 4000; // 4 seconds per scene

  const handleNext = () => {
    setCurrentScene((prev) => (prev + 1) % scenes.length);
    setProgress(0);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentScene]);

  const handlePrev = () => {
    setCurrentScene((prev) => (prev - 1 + scenes.length) % scenes.length);
    setProgress(0);
  };

  const handleSceneClick = (index: number) => {
    setCurrentScene(index);
    setProgress(0);
  };

  const getAnnotationPosition = (position: string) => {
    switch (position) {
      case "top-left":
        return "top-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "bottom-left":
        return "bottom-6 left-6";
      case "bottom-right":
        return "bottom-6 right-6";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "top-6 left-6";
    }
  };

  return (
    <section id="product-proof" className="landing-section">
      {/* Anchor for nav "How it works" link (Navigation.tsx uses #how-it-works) */}
      <span id="how-it-works" aria-hidden="true" className="block h-0 w-0" />
      <div className="landing-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="frame-label mb-3">
            {isEn ? "// PRODUCT IN ACTION" : "// PRODUTO EM AÇÃO"}
          </p>
          <h2 className="frame-title text-[clamp(2.8rem,5.5vw,5rem)] mb-4">
            {isEn ? (
              <>
                See <span className="text-frame-orange">Cena Studio</span> in action
              </>
            ) : (
              <>
                Veja o <span className="text-frame-orange">Cena Studio</span> funcionando
              </>
            )}
          </h2>
          <p className="text-frame-gray-light text-lg max-w-2xl mx-auto">
            {isEn
              ? "Real screenshots from the product. No mockups or prototypes."
              : "Screenshots reais do produto. Nada de mockups ou protótipos."}
          </p>
        </motion.div>

        {/* Product Demo Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          {/* Main Demo Area */}
          <div className="relative border border-frame-gray-3 bg-frame-gray-1/10 backdrop-blur-xl overflow-hidden">
            {/* Play/Pause Controls */}
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 sm:p-2 bg-frame-black/80 border border-frame-gray-3 hover:border-frame-orange rounded transition text-xs sm:text-base"
                aria-label={isPlaying ? "Pausar" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3 sm:w-4 sm:h-4 text-frame-white" />
                ) : (
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-frame-orange" />
                )}
              </button>
              <span className="px-2 py-1 sm:px-3 bg-frame-black/80 border border-frame-gray-3 text-[10px] sm:text-xs text-frame-white font-mono">
                {currentScene + 1}/{scenes.length}
              </span>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 bg-frame-black/80 border border-frame-gray-3 hover:border-frame-orange rounded-full transition"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-frame-white" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 sm:p-3 bg-frame-black/80 border border-frame-gray-3 hover:border-frame-orange rounded-full transition"
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-frame-white" />
            </button>

            {/* Screenshot Container */}
            <div className="relative aspect-video bg-frame-black">
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0"
                >
                  <img
                    src={scene.image}
                    alt={scene.title}
                    className="w-full h-full object-cover object-top"
                  />

                  {/* Annotation */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`absolute ${getAnnotationPosition(scene.annotation.position)} px-4 py-2 bg-frame-orange border border-frame-orange/50 backdrop-blur-xl`}
                  >
                    <p className="font-mono text-xs text-black font-semibold whitespace-nowrap">
                      {scene.annotation.text}
                    </p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-frame-gray-3">
                <motion.div
                  className="h-full bg-frame-orange"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </div>

          {/* Scene Selector */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenes.map((s, index) => {
              const SceneIcon = s.icon;
              const isActive = index === currentScene;

              return (
                <motion.button
                  key={s.id}
                  onClick={() => handleSceneClick(index)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-5 border transition ${
                    isActive
                      ? "border-frame-orange bg-frame-orange/10"
                      : "border-frame-gray-3 bg-frame-gray-1/5 hover:border-frame-gray-2"
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded ${isActive ? "bg-frame-orange" : "bg-frame-gray-2"}`}>
                      <SceneIcon className={`w-4 h-4 ${isActive ? "text-black" : "text-frame-orange"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold mb-1 ${isActive ? "text-frame-orange" : "text-frame-white"}`}>
                        {s.title}
                      </h4>
                      <p className="text-xs text-frame-gray-light line-clamp-2">
                        {s.description}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      className="h-0.5 bg-frame-orange"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 border border-frame-gray-3 bg-frame-gray-1/5">
              <CheckCircle2 className="w-4 h-4 text-frame-orange" />
              <span className="text-xs text-frame-gray-light">100% Real Product</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border border-frame-gray-3 bg-frame-gray-1/5">
              <CheckCircle2 className="w-4 h-4 text-frame-orange" />
              <span className="text-xs text-frame-gray-light">No Mockups</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border border-frame-gray-3 bg-frame-gray-1/5">
              <CheckCircle2 className="w-4 h-4 text-frame-orange" />
              <span className="text-xs text-frame-gray-light">Live Platform</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
