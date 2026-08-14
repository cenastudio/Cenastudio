import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { TabsContent } from "@/components/ui/tabs";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { FolderOpen } from "lucide-react";
import AllFilesTab from "@/components/files/AllFilesTab";
import ProjectFilesTab from "@/components/files/ProjectFilesTab";
import StorageTab from "@/components/files/StorageTab";

type TabValue = "all" | "project" | "storage";

function FilesUnifiedContent() {
  const { t, locale } = useLanguage();
  const [location] = useLocation();
  const isEn = locale === "en";

  // Parse URL to determine initial tab and project context
  const urlParams = new URLSearchParams(window.location.search);
  const urlTab = urlParams.get("tab") as TabValue | null;
  const isProjectScoped = location.startsWith("/project/");
  const projectIdMatch = location.match(/\/project\/(\d+)/);
  const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : null;

  // Default tab: if in project context, show "project" tab; otherwise "all"
  const defaultTab: TabValue = urlTab || (isProjectScoped ? "project" : "all");
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  useEffect(() => {
    // Sync tab from URL on navigation
    if (urlTab) setActiveTab(urlTab);
  }, [urlTab]);

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      {isProjectScoped && projectId ? (
        <ProjectNav projectId={projectId} />
      ) : (
        <ProductionNav />
      )}

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="frame-label mb-2">// {isEn ? "File Management" : "Gerenciamento de Arquivos"}</p>
          <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)]">
            <FolderOpen className="inline-block w-8 h-8 mr-3 text-frame-orange -translate-y-1" />
            {isEn ? "FILES" : "ARQUIVOS"}
          </h1>
          <p className="text-frame-gray-light text-sm mt-2">
            {isEn
              ? "Manage all your project materials, uploads, and storage in one unified place"
              : "Gerencie todos os materiais de projeto, uploads e armazenamento em um só lugar"}
          </p>
        </div>

        {/* Tabs */}
        <ResponsiveTabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabValue)}
          tabs={[
            { value: "all", label: isEn ? "All Files" : "Todos os Arquivos" },
            { value: "project", label: isEn ? "By Project" : "Por Projeto" },
            { value: "storage", label: isEn ? "Storage" : "Armazenamento" },
          ]}
        >

          <TabsContent value="all" className="mt-0">
            <AllFilesTab />
          </TabsContent>

          <TabsContent value="project" className="mt-0">
            <ProjectFilesTab initialProjectId={projectId} />
          </TabsContent>

          <TabsContent value="storage" className="mt-0">
            <StorageTab />
          </TabsContent>
        </ResponsiveTabs>
      </main>
    </div>
  );
}

export default function FilesUnified() {
  return (
    <ProtectedRoute>
      <FilesUnifiedContent />
    </ProtectedRoute>
  );
}
