import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ScreenDesignPass } from "@/components/discovery/ScreenDesignPass";
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

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-8 md:py-10 space-y-8">
        <ScreenDesignPass
          eyebrow={`// ${isEn ? "File Management" : "Gerenciamento de Arquivos"}`}
          title={isEn ? "Files stay tied to delivery." : "Arquivos ligados à entrega."}
          description={
            isEn
              ? "Manage all project materials, uploads, storage and client-facing delivery from one visible place."
              : "Gerencie materiais, uploads, armazenamento e entrega ao cliente em uma tela com caminho claro."
          }
          icon={FolderOpen}
          currentStage="Entrega"
          metrics={[
            { label: "Escopo", value: isProjectScoped ? "Projeto" : "Todos", detail: projectId ? `#${projectId}` : "biblioteca" },
            { label: "Aba", value: activeTab, detail: "ativa" },
            { label: "Entrega", value: "Portal", detail: "cliente" },
            { label: "Storage", value: "Uso", detail: "monitorado" },
          ]}
          actions={[
            { label: isEn ? "All files" : "Todos", detail: "Biblioteca completa", onClick: () => setActiveTab("all") },
            { label: isEn ? "By project" : "Por projeto", detail: "Materiais por job", onClick: () => setActiveTab("project") },
            { label: isEn ? "Storage" : "Armazenamento", detail: "Uso e limites", onClick: () => setActiveTab("storage") },
          ]}
        />

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
