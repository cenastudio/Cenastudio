import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const Projects = lazy(() => import("@/pages/Projects"));
const Tools = lazy(() => import("@/pages/Tools"));
const VideoReviews = lazy(() => import("@/pages/VideoReviews"));

function ProductionShellContent() {
  const [location] = useLocation();

  const getActiveView = () => {
    if (location === "/tools" || location.startsWith("/tools/")) return "tools";
    if (location === "/video-reviews" || location.startsWith("/video-reviews/")) return "reviews";
    return "projects";
  };

  const activeView = getActiveView();

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />
      <ProductionNav />
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
            </div>
          }
        >
          {activeView === "projects" && <Projects embedded />}
          {activeView === "tools" && <Tools embedded />}
          {activeView === "reviews" && <VideoReviews embedded />}
        </Suspense>
      </div>
    </div>
  );
}

export default function ProductionShell() {
  return (
    <ProtectedRoute>
      <ProductionShellContent />
    </ProtectedRoute>
  );
}
