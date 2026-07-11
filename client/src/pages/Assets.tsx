import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Upload,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FolderOpen,
  Grid3x3,
  List,
  Download,
  Trash2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface Asset {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "document" | "other";
  size: number;
  url: string;
  uploadedAt: string;
  projectName?: string;
}

export default function Assets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // TODO: Fetch real assets from API
    // For now, showing empty state
    setLoading(false);
  }, []);

  const getFileIcon = (type: Asset["type"]) => {
    switch (type) {
      case "image": return <FileImage className="w-5 h-5 text-blue-400" />;
      case "video": return <FileVideo className="w-5 h-5 text-purple-400" />;
      case "audio": return <FileAudio className="w-5 h-5 text-green-400" />;
      case "document": return <FileText className="w-5 h-5 text-orange-400" />;
      default: return <FileText className="w-5 h-5 text-frame-gray-light" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || asset.type === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="frame-shell">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange"></div>
            <p className="mt-4 text-sm text-frame-gray-light">Carregando assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="frame-shell">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="frame-heading">
                <FolderOpen className="inline-block w-7 h-7 mr-3 text-frame-orange" />
                Biblioteca de Assets
              </h1>
              <p className="frame-copy mt-2">
                Gerencie todos os arquivos dos seus projetos em um só lugar
              </p>
            </div>
            <button
              type="button"
              className="frame-btn-primary flex items-center gap-2"
              onClick={() => toast.info("Upload em breve!")}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          {/* Storage info */}
          <div className="mt-4 p-4 border border-frame-gray-3 bg-frame-gray-1/30 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-frame-gray-light">Armazenamento usado</span>
              <span className="text-sm font-semibold text-frame-white">0 GB / 10 GB</span>
            </div>
            <div className="w-full h-2 bg-frame-gray-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-frame-orange to-frame-orange/60" style={{ width: "0%" }} />
            </div>
            <p className="mt-2 text-xs text-frame-gray-light">
              Plano Pro: 10GB disponíveis. <a href="#pricing" className="text-frame-orange hover:underline">Upgrade para mais espaço</a>
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
            <input
              type="text"
              placeholder="Buscar assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="frame-input pl-10 w-full"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="frame-input pr-8"
            >
              <option value="all">Todos os tipos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
              <option value="audio">Áudio</option>
              <option value="document">Documentos</option>
            </select>

            <div className="flex border border-frame-gray-3 rounded">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`p-2 transition ${view === "grid" ? "bg-frame-orange/20 text-frame-orange" : "text-frame-gray-light hover:text-frame-white"}`}
                title="Visualização em grade"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`p-2 transition ${view === "list" ? "bg-frame-orange/20 text-frame-orange" : "text-frame-gray-light hover:text-frame-white"}`}
                title="Visualização em lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredAssets.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-frame-gray-2/50 mb-4">
              <FolderOpen className="w-10 h-10 text-frame-gray-light" />
            </div>
            <h3 className="text-xl font-semibold text-frame-white mb-2">
              {searchQuery || filter !== "all" ? "Nenhum asset encontrado" : "Nenhum asset ainda"}
            </h3>
            <p className="text-frame-gray-light mb-6 max-w-md mx-auto">
              {searchQuery || filter !== "all"
                ? "Tente ajustar seus filtros de busca"
                : "Comece fazendo upload de arquivos para seus projetos. Eles aparecerão aqui automaticamente."}
            </p>
            {!searchQuery && filter === "all" && (
              <button
                type="button"
                className="frame-btn-primary"
                onClick={() => toast.info("Upload em breve!")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </button>
            )}
          </motion.div>
        )}

        {/* Grid view */}
        {view === "grid" && filteredAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="border border-frame-gray-3 bg-frame-gray-1/30 hover:border-frame-orange/50 transition-all group rounded overflow-hidden"
              >
                <div className="aspect-video bg-frame-gray-2 flex items-center justify-center">
                  {getFileIcon(asset.type)}
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-frame-white truncate mb-1">
                    {asset.name}
                  </h4>
                  <p className="text-xs text-frame-gray-light mb-2">
                    {formatSize(asset.size)}
                  </p>
                  {asset.projectName && (
                    <p className="text-xs text-frame-gray-muted truncate mb-3">
                      {asset.projectName}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 text-xs py-1.5 px-2 border border-frame-gray-3 hover:border-frame-orange hover:text-frame-orange transition rounded"
                      title="Baixar"
                    >
                      <Download className="w-3 h-3 mx-auto" />
                    </button>
                    <button
                      type="button"
                      className="flex-1 text-xs py-1.5 px-2 border border-frame-gray-3 hover:border-frame-orange hover:text-frame-orange transition rounded"
                      title="Abrir"
                    >
                      <ExternalLink className="w-3 h-3 mx-auto" />
                    </button>
                    <button
                      type="button"
                      className="text-xs py-1.5 px-2 border border-frame-gray-3 hover:border-red-500 hover:text-red-500 transition rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* List view */}
        {view === "list" && filteredAssets.length > 0 && (
          <div className="border border-frame-gray-3 rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-frame-gray-2/50">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">Nome</th>
                  <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">Tipo</th>
                  <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">Tamanho</th>
                  <th className="text-left p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">Projeto</th>
                  <th className="text-right p-3 text-xs font-semibold text-frame-gray-light uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-frame-gray-3">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-frame-gray-1/30 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {getFileIcon(asset.type)}
                        <span className="text-sm text-frame-white">{asset.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-frame-gray-light capitalize">{asset.type}</td>
                    <td className="p-3 text-sm text-frame-gray-light">{formatSize(asset.size)}</td>
                    <td className="p-3 text-sm text-frame-gray-light">{asset.projectName || "—"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="p-1.5 hover:text-frame-orange transition"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 hover:text-frame-orange transition"
                          title="Abrir"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 hover:text-red-500 transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
