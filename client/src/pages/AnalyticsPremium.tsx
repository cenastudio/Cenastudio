import { useState } from "react";
import { Link, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TabsContent } from "@/components/ui/tabs";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import DashboardsTab from "@/components/analytics/DashboardsTab";
import ReportsTab from "@/components/analytics/ReportsTab";

function AnalyticsPremiumContent() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboards");

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-9">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="frame-label mb-2">// ANALYTICS PREMIUM</p>
              <h1 className="frame-title text-[clamp(2.3rem,4.4vw,4.2rem)]">
                Dashboards Customizáveis
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
                Crie dashboards personalizados com widgets drag & drop, gere relatórios avançados
                e exporte em múltiplos formatos.
              </p>
            </div>

            <Link href="/analytics" className="frame-btn-ghost">
              ← Voltar para Finance
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <ResponsiveTabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: "dashboards", label: "Dashboards" },
            { value: "reports", label: "Relatórios" },
          ]}
          listClassName="mb-6"
        >

          <TabsContent value="dashboards" className="mt-6">
            <DashboardsTab />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsTab />
          </TabsContent>
        </ResponsiveTabs>
      </main>
    </div>
  );
}

export default function AnalyticsPremium() {
  return (
    <ProtectedRoute>
      <AnalyticsPremiumContent />
    </ProtectedRoute>
  );
}
