import AppNavBar from "@/components/AppNavBar";
import CommercialNav from "@/components/CommercialNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const CommercialOverview = lazy(() => import("@/pages/CommercialOverview"));
const Clients = lazy(() => import("@/pages/Clients"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const Interactions = lazy(() => import("@/pages/Interactions"));

function CommercialShellContent() {
  const [location] = useLocation();

  // Determine which sub-view to show based on current route
  const getActiveView = () => {
    if (location === "/clients" || location.startsWith("/clients/")) return "clients";
    if (location === "/pipeline" || location.startsWith("/pipeline/")) return "pipeline";
    if (location === "/proposals" || location.startsWith("/proposals/")) return "proposals";
    if (location === "/interactions" || location.startsWith("/interactions/")) return "interactions";
    return "overview";
  };

  const activeView = getActiveView();

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />
      <CommercialNav />
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
            </div>
          }
        >
          {activeView === "overview" && <CommercialOverview />}
          {activeView === "clients" && <Clients embedded />}
          {activeView === "pipeline" && <Pipeline embedded />}
          {activeView === "proposals" && <Proposals embedded />}
          {activeView === "interactions" && <Interactions embedded />}
        </Suspense>
      </div>
    </div>
  );
}

export default function CommercialHub() {
  return (
    <ProtectedRoute>
      <CommercialShellContent />
    </ProtectedRoute>
  );
}
