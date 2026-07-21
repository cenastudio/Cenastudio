import { useState, useEffect, useMemo } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Search,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FolderOpen,
  Grid3x3,
  List,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AssetItem {
  id: number;
  project_id: number | null;
  project_name: string | null;
  filename: string;
  original_name: string;
  mime_type: string | null;
  size: number | null;
  path: string;
  created_at: string;
}

type AssetType = "image" | "video" | "audio" | "document" | "other";

function getAssetType(mimeType: string | null): AssetType {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf" || mimeType.startsWith("text/") || mimeType.includes("document")) return "document";
  return "other";
}

function getFileIcon(type: AssetType) {
  switch (type) {
    case "image": return <FileImage className="w-5 h-5 text-blue-400" />;
    case "video": return <FileVideo className="w-5 h-5 text-purple-400" />;
    case "audio": return <FileAudio className="w-5 h-5 text-green-400" />;
    case "document": return <FileText className="w-5 h-5 text-orange-400" />;
    default: return <FileText className="w-5 h-5 text-frame-gray-light" />;
  }
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function AssetsContent({ embedded }: { embedded?: boolean }) {
  const { t, locale } = useLanguage();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<AssetType | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<AssetItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isEn = locale === "en";

  const loadAssets = () => {
    setLoading(true);
    setError(null);
    api.assets
      .list()
      .then(setAssets)
      .catch((e) => setError(e instanceof Error ? e.message : (isEn ? "Failed to load assets" : "Falha ao carregar assets")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const [storageQuota, setStorageQuota] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/storage/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.success) setStorageQuota(Number(d.data.quota)); })
      .catch(() => { /* quota display is best-effort */ });
  }, []);

  const totalSize = useMemo(() => assets.reduce((sum, a) => sum + (a.size || 0), 0), [assets]);
  // Real per-plan quota from the backend (-1 = unlimited).
  const isUnlimitedStorage = storageQuota != null && storageQuota < 0;
  const usagePercent = storageQuota != null && storageQuota > 0
    ? Math.min(100, (totalSize / storageQuota) * 100)
    : 0;

  const filteredAssets = assets.filter((asset) => {
    const type = getAssetType(asset.mime_type);
    const matchesSearch = asset.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.assets.delete(deleteTarget.id);
      setAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success(isEn ? "Asset deleted" : "Asset excluído");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (isEn ? "Failed to delete asset" : "Falha ao excluir asset"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`app-glass-surface min-h-screen text-frame-white ${embedded ? "" : ""}`}>
      {!embedded && <AppNavBar />}
      {!embedded && <ProductionNav />}

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="mb-8">
            <p className="frame-label mb-3">// {isEn ? "Asset Library" : "Biblioteca de Assets"}</p>
            <h1 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white">
              <FolderOpen className="inline-block w-8 h-8 mr-3 text-frame-orange -translate-y-1" />
              {isEn ? "ALL YOUR FILES" : "TODOS OS SEUS ARQUIVOS"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              {isEn
                ? "Every file uploaded across your projects, in one searchable place."
                : "Todos os arquivos enviados em seus projetos, em um só lugar com busca."}
            </p>

            {/* Storage info */}
            <div className="mt-6 p-4 border border-frame-gray-3 bg-frame-gray-1/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-frame-gray-light">{isEn ? "Storage used" : "Armazenamento usado"}</span>
                <span className="text-sm font-semibold text-frame-white">
                  {formatSize(totalSize)} / {storageQuota == null ? "—" : isUnlimitedStorage ? (isEn ? "Unlimited" : "Ilimitado") : formatSize(storageQuota)}
                </span>
              </div>
              <div className="w-full h-2 bg-frame-gray-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isUnlimitedStorage ? "bg-gradient-to-r from-frame-green to-frame-green/60 w-full" : "bg-gradient-to-r from-frame-orange to-frame-orange/60"}`}
                  style={isUnlimitedStorage ? undefined : { width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Filters and search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <input
                type="text"
                placeholder={isEn ? "Search assets..." : "Buscar assets..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="frame-input pl-10 w-full"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as AssetType | "all")}
                className="frame-input"
              >
                <option value="all">{isEn ? "All types" : "Todos os tipos"}</option>
                <option value="image">{isEn ? "Images" : "Imagens"}</option>
                <option value="video">{isEn ? "Videos" : "Vídeos"}</option>
                <option value="audio">{isEn ? "Audio" : "Áudio"}</option>
                <option value="document">{isEn ? "Documents" : "Documentos"}</option>
              </select>

              <div className="flex border border-frame-gray-3">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`p-2.5 transition ${view === "grid" ? "bg-frame-orange/20 text-frame-orange" : "text-frame-gray-light hover:text-frame-white"}`}
                  title={isEn ? "Grid view" : "Visualização em grade"}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`p-2.5 transition ${view === "list" ? "bg-frame-orange/20 text-frame-orange" : "text-frame-gray-light hover:text-frame-white"}`}
                  title={isEn ? "List view" : "Visualização em lista"}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">{error}</p>
              <button type="button" onClick={loadAssets} className="frame-btn-ghost">
                {isEn ? "Try again" : "Tentar novamente"}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filteredAssets.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-frame-gray-2/50 mb-4">
                <FolderOpen className="w-10 h-10 text-frame-gray-light" />
              </div>
              <h3 className="text-xl font-semibold text-frame-white mb-2">
                {searchQuery || filter !== "all"
                  ? (isEn ? "No assets found" : "Nenhum asset encontrado")
                  : (isEn ? "No assets yet" : "Nenhum asset ainda")}
              </h3>
              <p className="text-frame-gray-light max-w-md mx-auto">
                {searchQuery || filter !== "all"
                  ? (isEn ? "Try adjusting your search filters" : "Tente ajustar seus filtros de busca")
                  : (isEn
                      ? "Upload files inside any project — they'll show up here automatically."
                      : "Envie arquivos dentro de qualquer projeto — eles aparecerão aqui automaticamente.")}
              </p>
            </motion.div>
          )}

          {/* Grid view */}
          {!loading && !error && view === "grid" && filteredAssets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset, index) => {
                const type = getAssetType(asset.mime_type);
                return (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                    className="frame-card group overflow-hidden"
                  >
                    <div className="aspect-video bg-frame-gray-2/60 flex items-center justify-center">
                      {getFileIcon(type)}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-semibold text-frame-white truncate mb-1" title={asset.original_name}>
                        {asset.original_name}
                      </h4>
                      <p className="text-xs text-frame-gray-light mb-2">{formatSize(asset.size)}</p>
                      {asset.project_name && (
                        <p className="text-xs text-frame-gray-muted truncate mb-3">{asset.project_name}</p>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={api.assets.download(asset.id)}
                          className="flex-1 text-xs py-1.5 px-2 border border-frame-gray-3 hover:border-frame-orange hover:text-frame-orange transition flex items-center justify-center"
                          title={isEn ? "Download" : "Baixar"}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(asset)}
                          className="text-xs py-1.5 px-2 border border-frame-gray-3 hover:border-red-500 hover:text-red-500 transition"
                          title={isEn ? "Delete" : "Excluir"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* List view */}
          {!loading && !error && view === "list" && filteredAssets.length > 0 && (
            <div className="border border-frame-gray-3 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-frame-gray-2/40">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">{isEn ? "Name" : "Nome"}</th>
                    <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider hidden sm:table-cell">{isEn ? "Size" : "Tamanho"}</th>
                    <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider hidden md:table-cell">{isEn ? "Project" : "Projeto"}</th>
                    <th className="text-right p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">{isEn ? "Actions" : "Ações"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-frame-gray-3/50">
                  {filteredAssets.map((asset) => {
                    const type = getAssetType(asset.mime_type);
                    return (
                      <tr key={asset.id} className="hover:bg-frame-gray-1/30 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {getFileIcon(type)}
                            <div className="min-w-0">
                              <span className="block text-sm text-frame-white truncate max-w-[160px] sm:max-w-[240px]">{asset.original_name}</span>
                              <span className="block text-[0.65rem] text-frame-gray-light sm:hidden">{formatSize(asset.size)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-frame-gray-light whitespace-nowrap hidden sm:table-cell">{formatSize(asset.size)}</td>
                        <td className="p-3 text-sm text-frame-gray-light truncate max-w-[180px] hidden md:table-cell">{asset.project_name || "—"}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <a href={api.assets.download(asset.id)} className="p-1.5 hover:text-frame-orange transition" title={isEn ? "Download" : "Baixar"}>
                              <Download className="w-4 h-4" />
                            </a>
                            <button type="button" onClick={() => setDeleteTarget(asset)} className="p-1.5 hover:text-red-500 transition" title={isEn ? "Delete" : "Excluir"}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isEn ? "Delete asset?" : "Excluir asset?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEn
                ? `"${deleteTarget?.original_name}" will be permanently removed.`
                : `"${deleteTarget?.original_name}" será removido permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{isEn ? "Cancel" : "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? (isEn ? "Deleting..." : "Excluindo...") : (isEn ? "Delete" : "Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Assets({ embedded }: { embedded?: boolean }) {
  if (embedded) return <AssetsContent embedded />;

  return (
    <ProtectedRoute>
      <AssetsContent />
    </ProtectedRoute>
  );
}
