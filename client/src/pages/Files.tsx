import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Upload, Download, Trash2, FileText,
  Image as ImageIcon, Video, Music, File,
  Folder, Plus, X, Loader2, Search,
  Eye, Grid3X3, List, Link, ExternalLink,
  Globe,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface FileData {
  id: number;
  user_id?: number;
  project_id: number | null;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size: number | null;
  path: string;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
}

type FileFilter = "all" | "images" | "videos" | "documents" | "audio";

type UploadTab = "file" | "link";

function FilesContent() {
  const { t } = useLanguage();
  const params = useParams();
  const [location, setLocation] = useLocation();
  const projectId = params.projectId ? parseInt(params.projectId) : null;
  const isProjectScoped = location.startsWith("/project/");

  const [files, setFiles] = useState<FileData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);

  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [uploadTab, setUploadTab] = useState<UploadTab>("link");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const [filter, setFilter] = useState<FileFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // New project creation state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
    if (projectId) loadFiles();
    else setIsLoading(false);
  }, [projectId]);

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects", { credentials: "include" });
      const data = await response.json();
      if (data.success) setProjects(data.data);
    } catch {
      console.error("Erro ao carregar projetos");
    }
  };

  const loadFiles = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/files/projects/${projectId}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) setFiles(data.data);
    } catch {
      toast.error(t("app.errors.loadFiles"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.files.projectCreated"));
        setShowNewProject(false);
        setNewProjectName("");
        loadProjects();
        setLocation(isProjectScoped ? `/project/${data.data.id}/files` : `/files/${data.data.id}`);
      }
    } catch {
      toast.error(t("app.errors.createProject"));
    }
  };

  const handleSelectProject = (id: number) => {
    setLocation(isProjectScoped ? `/project/${id}/files` : `/files/${id}`);
  };

  const filteredFiles = files.filter((f) => {
    const mime = (f.mime_type || "").toLowerCase();
    if (filter === "images" && !mime.startsWith("image/")) return false;
    if (filter === "videos" && !mime.startsWith("video/")) return false;
    if (filter === "audio" && !mime.startsWith("audio/")) return false;
    if (filter === "documents" && !mime.includes("pdf") && !mime.includes("document") && !mime.includes("spreadsheet") && !mime.includes("presentation") && !mime.includes("text/")) return false;
    if (searchQuery && !f.original_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const fileCounts = {
    all: files.length,
    images: files.filter((f) => (f.mime_type || "").startsWith("image/")).length,
    videos: files.filter((f) => (f.mime_type || "").startsWith("video/")).length,
    audio: files.filter((f) => (f.mime_type || "").startsWith("audio/")).length,
    documents: files.filter((f) => {
      const m = (f.mime_type || "").toLowerCase();
      return m.includes("pdf") || m.includes("document") || m.includes("spreadsheet") || m.includes("presentation") || m.includes("text/");
    }).length,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFileForUpload(e.target.files[0]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFileForUpload(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const handleUpload = async () => {
    if (!selectedFileForUpload || !projectId) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setUploadProgress(50);
        const response = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            fileName: selectedFileForUpload.name,
            fileType: selectedFileForUpload.type,
            fileSize: selectedFileForUpload.size,
            fileData: base64.split(",")[1],
          }),
        });
        setUploadProgress(100);
        const data = await response.json();
        if (data.success) {
          toast.success(t("app.files.fileUploaded"));
          setIsUploadOpen(false);
          setSelectedFileForUpload(null);
          loadFiles();
        } else toast.error(data.error || t("app.errors.uploadFile"));
      };
      reader.onerror = () => { toast.error(t("app.errors.readFile")); setIsUploading(false); };
      reader.readAsDataURL(selectedFileForUpload);
    } catch { toast.error(t("app.errors.uploadFile")); } finally { setIsUploading(false); setUploadProgress(0); }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim() || !projectId) return;
    if (!linkName.trim()) { toast.error(t("app.files.nameLinkRequired")); return; }
    setIsUploading(true);
    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          fileName: linkName.trim(),
          fileType: "text/uri-list",
          fileSize: linkUrl.length,
          fileData: btoa(linkUrl),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.files.linkSaved"));
        setIsUploadOpen(false);
        setLinkUrl("");
        setLinkName("");
        loadFiles();
      } else toast.error(data.error || t("app.errors.saveLink"));
    } catch { toast.error(t("app.errors.saveLink")); } finally { setIsUploading(false); }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    try {
      const response = await fetch(`/api/files/${selectedFile.id}`, { method: "DELETE", credentials: "include" });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.files.fileDeleted"));
        setIsDeleteOpen(false);
        setSelectedFile(null);
        loadFiles();
      } else toast.error(data.error || t("app.errors.deleteFile"));
    } catch { toast.error(t("app.errors.deleteFile")); }
  };

  const handleDownload = (file: FileData) => window.open(`/api/files/${file.id}/download`, "_blank");

  const openPreview = (file: FileData) => { setPreviewFile(file); setIsPreviewOpen(true); };

  const getFileIcon = (fileType: string) => {
    if (fileType === "text/uri-list") return Link;
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.startsWith("video/")) return Video;
    if (fileType.startsWith("audio/")) return Music;
    if (fileType.includes("pdf")) return FileText;
    return File;
  };

  const getFileTypeLabel = (fileType: string) => {
    if (fileType === "text/uri-list") return t("app.files.link");
    if (fileType.startsWith("image/")) return t("app.files.image");
    if (fileType.startsWith("video/")) return t("app.files.video");
    if (fileType.startsWith("audio/")) return t("app.files.audio");
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("document")) return t("app.files.document");
    if (fileType.includes("spreadsheet")) return t("app.files.spreadsheet");
    return t("app.files.file");
  };

  const isLinkFile = (file: FileData) => file.mime_type === "text/uri-list";

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const isPreviewableImage = (file: FileData) => (file.mime_type || "").startsWith("image/");

  const filterTabs: { key: FileFilter; label: string }[] = [
    { key: "all", label: t("app.common.all") },
    { key: "images", label: t("app.files.images") },
    { key: "videos", label: t("app.files.videos") },
    { key: "documents", label: t("app.files.documents") },
    { key: "audio", label: t("app.files.audio") },
  ];

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />
      {isProjectScoped && projectId && <ProjectNav projectId={projectId} />}

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Header com seletor de projeto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="frame-label mb-2">// {t("app.files.projectMaterials")}</p>
            <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)]">
              {currentProject ? currentProject.name : t("app.files.title")}
            </h1>
            <p className="text-frame-gray-light text-sm mt-2">
              {currentProject
                ? `${files.length} ${files.length === 1 ? t("app.files.organizedMaterial") : t("app.files.organizedMaterials")} ${t("app.files.inThisProject")}`
                : t("app.files.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!projectId ? (
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(e) => { const v = e.target.value; if (v) handleSelectProject(parseInt(v)); }}
                  className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange min-w-[180px]"
                >
                  <option value="">{t("app.files.selectProject")}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="frame-btn-ghost flex items-center gap-1.5 text-sm"
                >
                  <Plus className="w-4 h-4" /> {t("app.common.new")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={projectId}
                  onChange={(e) => { const v = e.target.value; if (v) handleSelectProject(parseInt(v)); }}
                  className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange min-w-[180px]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setLocation(isProjectScoped ? `/project/${projectId}` : "/files")}
                  className="text-xs text-frame-gray-light hover:text-frame-white transition"
                >
                  {isProjectScoped ? t("app.files.overview") : t("app.files.leaveProject")}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (!projectId) { toast.error(t("app.files.selectProjectFirst")); return; }
                setUploadTab("link");
                setIsUploadOpen(true);
              }}
              className="frame-btn-primary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t("app.common.add")}
            </button>
          </div>
        </div>

        {/* Estado sem projeto selecionado */}
        {!projectId ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-6 text-center hover:border-frame-orange/50 transition">
                <Folder className="w-10 h-10 text-frame-orange mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t("app.files.selectProjectTitle")}</h3>
                <p className="text-sm text-frame-gray-light mb-4">
                  {t("app.files.selectProjectDescription")}
                </p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="frame-btn-primary text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" /> {t("app.files.createProject")}
                </button>
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-6 text-center hover:border-frame-orange/50 transition">
                <Link className="w-10 h-10 text-frame-orange mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t("app.files.externalLinks")}</h3>
                <p className="text-sm text-frame-gray-light mb-4">
                  {t("app.files.externalLinksDescription")}
                </p>
                <p className="text-xs text-frame-gray-light/60">{t("app.files.recommendedForLargeVideos")}</p>
              </div>
              <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-6 text-center hover:border-frame-orange/50 transition">
                <Upload className="w-10 h-10 text-frame-orange mx-auto mb-3" />
                <h3 className="font-semibold mb-1">{t("app.files.lightUpload")}</h3>
                <p className="text-sm text-frame-gray-light mb-4">
                  {t("app.files.lightUploadDescription")}
                </p>
                <p className="text-xs text-frame-gray-light/60">{t("app.files.currentLimit") }</p>
              </div>
            </div>

            {projects.length > 0 && (
              <div>
                <h3 className="text-sm font-frame-mono uppercase tracking-wider text-frame-gray-light mb-3">
                  {t("app.files.availableProjects")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 text-left hover:border-frame-orange/50 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-frame-orange shrink-0" />
                        <span className="font-semibold truncate">{p.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {filterTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 text-xs font-frame-mono uppercase tracking-wider transition ${
                      filter === key
                        ? "bg-frame-orange text-frame-black"
                        : "text-frame-gray-light border border-frame-gray-3 hover:border-frame-orange/50"
                    }`}
                  >
                    {label} <span className="opacity-60">({fileCounts[key]})</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial sm:min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                  <input
                    type="text"
                    placeholder={t("app.files.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-frame-gray-2 border border-frame-gray-3 pl-10 pr-4 py-2 text-sm outline-none focus:border-frame-orange"
                  />
                </div>
                <div className="flex border border-frame-gray-3">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${viewMode === "grid" ? "bg-frame-gray-3 text-frame-white" : "text-frame-gray-light hover:text-frame-white"}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${viewMode === "list" ? "bg-frame-gray-3 text-frame-white" : "text-frame-gray-light hover:text-frame-white"}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de arquivos */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <EmptyState
                icon={Folder}
                title={searchQuery || filter !== "all" ? t("app.files.noFilesForFilter") : t("app.files.noFilesInProject")}
                description={searchQuery || filter !== "all" ? t("app.files.tryOtherFilters") : t("app.files.saveLinkOrUpload")}
                action={{ label: t("app.files.addLink"), onClick: () => { setUploadTab("link"); setIsUploadOpen(true); } }}
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {filteredFiles.map((file) => {
                    const Icon = getFileIcon(file.mime_type || "");
                    const isLink = isLinkFile(file);
                    return (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 hover:border-frame-orange/50 transition group flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="p-3 bg-frame-gray-2 rounded-lg cursor-pointer"
                            onClick={() => !isLink && isPreviewableImage(file) && openPreview(file)}
                          >
                            <Icon className="w-6 h-6 text-frame-orange" />
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            {!isLink && isPreviewableImage(file) && (
                              <button onClick={() => openPreview(file)} className="p-2 hover:bg-frame-gray-3 transition" title={t("app.common.preview")}>
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            {isLink ? (
                              <a href={file.path} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-frame-gray-3 transition" title={t("app.files.openLink")}>
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            ) : (
                              <button onClick={() => handleDownload(file)} className="p-2 hover:bg-frame-gray-3 transition" title={t("app.common.download")}>
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => { setSelectedFile(file); setIsDeleteOpen(true); }} className="p-2 hover:bg-frame-red/20 hover:text-frame-red transition" title={t("app.common.delete")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h3 className="text-sm font-semibold text-frame-white mb-1 truncate flex-1">{file.original_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-frame-gray-light mt-2 pt-2 border-t border-frame-gray-3">
                          <span className="bg-frame-gray-2 px-1.5 py-0.5">{isLink ? t("app.files.link") : getFileTypeLabel(file.mime_type || "")}</span>
                          <span>{isLink ? "—" : formatFileSize(file.size || 0)}</span>
                          <span className="ml-auto">{formatDate(file.created_at)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="border border-frame-gray-3 divide-y divide-frame-gray-3">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.mime_type || "");
                  const isLink = isLinkFile(file);
                  return (
                    <div key={file.id} className="flex items-center gap-4 px-4 py-3 hover:bg-frame-gray-1/20 transition group">
                      <div className="p-2 bg-frame-gray-2 rounded shrink-0">
                        <Icon className="w-5 h-5 text-frame-orange" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.original_name}</p>
                        <p className="text-xs text-frame-gray-light">
                          {isLink ? t("app.files.link") : getFileTypeLabel(file.mime_type || "")} — {isLink ? t("app.files.externalUrl") : formatFileSize(file.size || 0)}
                        </p>
                      </div>
                      <span className="text-xs text-frame-gray-light hidden sm:block">{formatDate(file.created_at)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        {!isLink && isPreviewableImage(file) && (
                          <button onClick={() => openPreview(file)} className="p-1.5 hover:bg-frame-gray-3 transition" title={t("app.common.preview")}>
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {isLink ? (
                          <a href={file.path} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-frame-gray-3 transition" title={t("app.files.openLink")}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-frame-gray-3 transition" title={t("app.common.download")}>
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => { setSelectedFile(file); setIsDeleteOpen(true); }} className="p-1.5 hover:bg-frame-red/20 hover:text-frame-red transition" title={t("app.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Upload */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{t("app.files.addToProject")}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              {t("app.files.addToProjectDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 mb-4 border border-frame-gray-3">
            <button
              onClick={() => setUploadTab("link")}
              className={`flex-1 py-2 text-xs font-frame-mono uppercase tracking-wider transition ${
                uploadTab === "link" ? "bg-frame-orange text-frame-black" : "text-frame-gray-light hover:text-frame-white"
              }`}
            >
              <Link className="w-3.5 h-3.5 inline mr-1" /> Link
            </button>
            <button
              onClick={() => setUploadTab("file")}
              className={`flex-1 py-2 text-xs font-frame-mono uppercase tracking-wider transition ${
                uploadTab === "file" ? "bg-frame-orange text-frame-black" : "text-frame-gray-light hover:text-frame-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1" /> {t("app.files.lightUpload")}
            </button>
          </div>

          {uploadTab === "file" ? (
            <div className="space-y-4">
              {!selectedFileForUpload ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                    dragOver ? "border-frame-orange bg-frame-orange/5" : "border-frame-gray-3 hover:border-frame-orange/50"
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <Upload className={`w-8 h-8 ${dragOver ? "text-frame-orange" : "text-frame-gray-light"}`} />
                    <p className="text-sm text-frame-gray-light">{t("app.files.dropFileHere")}</p>
                    <p className="text-xs text-frame-gray-light/60">{t("app.files.fileLimitHint")}</p>
                  </label>
                </div>
              ) : (
                <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-frame-orange shrink-0" />
                      <span className="text-sm truncate">{selectedFileForUpload.name}</span>
                    </div>
                    <button onClick={() => setSelectedFileForUpload(null)} className="p-1 hover:bg-frame-gray-3">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-frame-gray-light">
                    <span>{formatFileSize(selectedFileForUpload.size)}</span>
                    <span>{selectedFileForUpload.type || t("app.files.file")}</span>
                  </div>
                  {isUploading && (
                    <div className="mt-3">
                      <div className="w-full bg-frame-gray-3 rounded-full h-2">
                        <div className="bg-frame-orange h-2 rounded-full transition-[width] duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <p className="text-xs text-frame-gray-light mt-1 text-center">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.files.linkName")}</label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder={t("app.files.linkNamePlaceholder")}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
                />
              </div>
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder={t("app.files.urlPlaceholder")}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
                />
              </div>
              <div className="bg-frame-gray-2/30 p-3 text-xs text-frame-gray-light">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                {t("app.files.heavyFilesHint")}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button type="button" disabled={isUploading} onClick={() => { setIsUploadOpen(false); setSelectedFileForUpload(null); setLinkUrl(""); setLinkName(""); }} className="frame-btn-ghost">
              {t("app.common.cancel")}
            </button>
            {uploadTab === "file" ? (
              <button type="button" disabled={!selectedFileForUpload || isUploading} onClick={handleUpload} className="frame-btn-primary">
                {isUploading ? t("app.files.uploading") : t("app.files.uploadFile")}
              </button>
            ) : (
              <button type="button" disabled={!linkUrl.trim() || !linkName.trim() || isUploading} onClick={handleLinkSubmit} className="frame-btn-primary">
                {isUploading ? t("app.common.saving") : t("app.files.saveLink")}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Excluir */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl text-frame-red">{t("app.files.deleteQuestion")}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">{t("app.files.permanentAction")}</DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 border border-frame-gray-3 bg-frame-gray-1/10 my-2">
              <File className="w-5 h-5 text-frame-orange shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.original_name}</p>
                <p className="text-xs text-frame-gray-light">{formatFileSize(selectedFile.size || 0)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button type="button" onClick={() => setIsDeleteOpen(false)} className="frame-btn-ghost">{t("app.common.cancel")}</button>
            <button type="button" onClick={handleDelete} className="bg-frame-red hover:bg-red-600 text-white px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition rounded-none">{t("app.common.delete")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-3xl rounded-none p-6" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="frame-title text-xl truncate pr-4">{previewFile?.original_name}</DialogTitle>
              <button onClick={() => setIsPreviewOpen(false)} className="text-frame-gray-light hover:text-frame-white p-1 hover:bg-frame-gray-3 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-center bg-frame-gray-2/50 min-h-[300px] max-h-[60vh] overflow-hidden">
            {previewFile && isPreviewableImage(previewFile) && (
              <img src={`/api/files/${previewFile.id}/download`} alt={previewFile.original_name} className="max-w-full max-h-[60vh] object-contain" />
            )}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-frame-gray-3 text-xs text-frame-gray-light">
            <span>{previewFile && formatFileSize(previewFile.size || 0)}</span>
            <span>{previewFile && formatDate(previewFile.created_at)}</span>
            <button onClick={() => previewFile && handleDownload(previewFile)} className="frame-btn-ghost text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> {t("app.common.download")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Novo Projeto */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">{t("app.files.newProject")}</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">{t("app.files.createProjectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.files.projectName")}</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={t("app.files.projectNamePlaceholder")}
              className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
            />
          </div>
          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button type="button" onClick={() => setShowNewProject(false)} className="frame-btn-ghost">{t("app.common.cancel")}</button>
            <button type="button" disabled={!newProjectName.trim()} onClick={handleCreateProject} className="frame-btn-primary">{t("app.files.createProject")}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Files() {
  return (
    <ProtectedRoute>
      <FilesContent />
    </ProtectedRoute>
  );
}
