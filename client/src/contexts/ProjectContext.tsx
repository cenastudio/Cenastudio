import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { ApiError, api, type Project, type ToolState } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { translate } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  autosaveStatus: AutosaveStatus;
  toolStates: Record<string, ToolState>;
  loadProjects: () => Promise<void>;
  selectProject: (id: number | null) => Promise<Project | null>;
  createProject: (name: string, description?: string, clientId?: number, metadataJson?: string) => Promise<Project>;
  updateProject: (id: number, data: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">>) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  fetchToolState: (toolId: string) => Promise<ToolState | null>;
  saveToolStateImmediately: (toolId: string, formData: Record<string, string>, outputData: string) => Promise<void>;
  updateToolStateLocal: (toolId: string, formData: Record<string, string>, outputData: string) => void;
  triggerAutosave: (toolId: string, formData: Record<string, string>, outputData: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all projects for current user
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setProjects([]);
        setActiveProject(null);
        setToolStates({});
        return;
      }
      // Silently fail if not authenticated - don't show toast on landing page
      console.error("Failed to load projects:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load projects initially on auth change
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      setProjects([]);
      setActiveProject(null);
      setToolStates({});
    }
  }, [isAuthenticated, loadProjects]);

  // Select/activate a project and load details
  const selectProject = async (id: number | null) => {
    if (!id) {
      setActiveProject(null);
      setToolStates({});
      return null;
    }
    setIsLoading(true);
    try {
      const project = await api.projects.get(id);
      setActiveProject(project);
      setToolStates({}); // Reset state cache to reload states for new active project
      return project;
    } catch (e) {
      const locale = (localStorage.getItem("language") as "pt" | "en") || "pt";
      toast.error(translate(locale, "app.errors.loadProject"));
      setActiveProject(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new project
  const createProject = async (name: string, description?: string, clientId?: number, metadataJson?: string) => {
    try {
      const newProj = await api.projects.create(name, description, clientId, metadataJson);
      setProjects((prev) => [newProj, ...prev]);
      return newProj;
    } catch (e) {
      const locale = (localStorage.getItem("language") as "pt" | "en") || "pt";
      toast.error(e instanceof Error ? e.message : translate(locale, "app.errors.createProject"));
      throw e;
    }
  };

  // Update project metadata
  const updateProject = async (id: number, data: Partial<Omit<Project, "id" | "userId" | "createdAt" | "updatedAt">>) => {
    try {
      const updated = await api.projects.update(id, data);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activeProject?.id === id) {
        setActiveProject(updated);
      }
      return updated;
    } catch (e) {
      const locale = (localStorage.getItem("language") as "pt" | "en") || "pt";
      toast.error(translate(locale, "app.errors.updateProject"));
      throw e;
    }
  };

  // Delete project
  const deleteProject = async (id: number) => {
    try {
      await api.projects.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
        setToolStates({});
      }
    } catch (e) {
      const locale = (localStorage.getItem("language") as "pt" | "en") || "pt";
      toast.error(translate(locale, "app.errors.deleteProject"));
      throw e;
    }
  };

  // Fetch tool state from DB or return local cached version
  const fetchToolState = async (toolId: string) => {
    if (!activeProject) return null;

    // Check local cache first
    if (toolStates[toolId]) {
      return toolStates[toolId];
    }

    try {
      const state = await api.projects.getState(activeProject.id, toolId);
      if (state) {
        setToolStates((prev) => ({ ...prev, [toolId]: state }));
      }
      return state;
    } catch {
      return null;
    }
  };

  // Update tool state directly in local cache state
  const updateToolStateLocal = (toolId: string, formData: Record<string, string>, outputData: string) => {
    if (!activeProject) return;

    const mockState: ToolState = {
      projectId: activeProject.id,
      toolId,
      formData,
      outputData,
      updatedAt: new Date().toISOString(),
    };

    setToolStates((prev) => ({ ...prev, [toolId]: mockState }));
  };

  // Save state immediately (e.g. on execution completion or manual save)
  const saveToolStateImmediately = async (toolId: string, formData: Record<string, string>, outputData: string) => {
    if (!activeProject) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setAutosaveStatus("saving");
    try {
      await api.projects.saveState(activeProject.id, toolId, formData, outputData);
      updateToolStateLocal(toolId, formData, outputData);
      setAutosaveStatus("saved");
    } catch (e) {
      setAutosaveStatus("error");
    }
  };

  // Debounced Autosave Trigger
  const triggerAutosave = (toolId: string, formData: Record<string, string>, outputData: string) => {
    if (!activeProject) return;

    // Update local cache state immediately for UI responsiveness
    updateToolStateLocal(toolId, formData, outputData);

    setAutosaveStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.projects.saveState(activeProject.id, toolId, formData, outputData);
        setAutosaveStatus("saved");
      } catch (e) {
        setAutosaveStatus("error");
      }
    }, 1500);
  };

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        isLoading,
        autosaveStatus,
        toolStates,
        loadProjects,
        selectProject,
        createProject,
        updateProject,
        deleteProject,
        fetchToolState,
        saveToolStateImmediately,
        updateToolStateLocal,
        triggerAutosave,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return context;
}
