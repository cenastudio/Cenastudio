import { useLanguage } from "@/contexts/LanguageContext";
import { HardDrive, TrendingUp, Package, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface StorageStats {
  totalUsed: number;
  quota: number;
  byType: {
    images: number;
    videos: number;
    documents: number;
    audio: number;
  };
  topFiles: Array<{
    name: string;
    size: number;
    project: string;
  }>;
}

export default function StorageTab() {
  const { locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);

  const isEn = locale === "en";

  useEffect(() => {
    // TODO: Implement API call to /api/storage/stats
    // For now, show placeholder
    setTimeout(() => {
      setStats({
        totalUsed: 2.3 * 1024 * 1024 * 1024, // 2.3 GB
        quota: 10 * 1024 * 1024 * 1024, // 10 GB
        byType: {
          images: 850 * 1024 * 1024,
          videos: 1.2 * 1024 * 1024 * 1024,
          documents: 200 * 1024 * 1024,
          audio: 50 * 1024 * 1024,
        },
        topFiles: [
          { name: "final_edit_4k.mp4", size: 450 * 1024 * 1024, project: "Comercial Coca-Cola" },
          { name: "raw_footage.mov", size: 380 * 1024 * 1024, project: "Institucional Magazine Luiza" },
          { name: "product_shots.mp4", size: 220 * 1024 * 1024, project: "Comercial Coca-Cola" },
        ],
      });
      setLoading(false);
    }, 500);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-frame-gray-light">{isEn ? "Unable to load storage statistics" : "Não foi possível carregar estatísticas de armazenamento"}</p>
      </div>
    );
  }

  const usagePercent = Math.min(100, (stats.totalUsed / stats.quota) * 100);

  return (
    <div className="space-y-6">
      {/* Overall Usage */}
      <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-6 h-6 text-frame-orange" />
          <h3 className="text-lg font-semibold text-frame-white">
            {isEn ? "Storage Usage" : "Uso de Armazenamento"}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-frame-gray-light">{isEn ? "Used" : "Usado"}</span>
            <span className="text-sm font-semibold text-frame-white">
              {formatSize(stats.totalUsed)} / {formatSize(stats.quota)}
            </span>
          </div>

          <div className="w-full h-3 bg-frame-gray-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-frame-orange to-frame-orange/60 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <p className="text-xs text-frame-gray-muted">
            {usagePercent.toFixed(1)}% {isEn ? "of your storage quota" : "da sua cota de armazenamento"}
          </p>
        </div>
      </div>

      {/* By Type */}
      <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-6 h-6 text-frame-orange" />
          <h3 className="text-lg font-semibold text-frame-white">
            {isEn ? "By File Type" : "Por Tipo de Arquivo"}
          </h3>
        </div>

        <div className="space-y-3">
          {Object.entries(stats.byType).map(([type, size]) => {
            const percent = (size / stats.totalUsed) * 100;
            const labels: Record<string, { en: string; pt: string }> = {
              images: { en: "Images", pt: "Imagens" },
              videos: { en: "Videos", pt: "Vídeos" },
              documents: { en: "Documents", pt: "Documentos" },
              audio: { en: "Audio", pt: "Áudio" },
            };
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-frame-gray-light">{isEn ? labels[type].en : labels[type].pt}</span>
                  <span className="text-frame-white">{formatSize(size)} ({percent.toFixed(1)}%)</span>
                </div>
                <div className="w-full h-2 bg-frame-gray-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-frame-orange/70 transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Files */}
      <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-6 h-6 text-frame-orange" />
          <h3 className="text-lg font-semibold text-frame-white">
            {isEn ? "Largest Files" : "Maiores Arquivos"}
          </h3>
        </div>

        <div className="space-y-2">
          {stats.topFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-frame-gray-3/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-frame-white truncate">{file.name}</p>
                <p className="text-xs text-frame-gray-muted truncate">{file.project}</p>
              </div>
              <span className="text-sm text-frame-gray-light ml-4">{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="p-4 border border-frame-orange/30 bg-frame-orange/5 text-xs text-frame-gray-light">
        💡 {isEn
          ? "Storage analytics are calculated in real-time. Upgrade your plan to increase storage limits."
          : "Análises de armazenamento são calculadas em tempo real. Atualize seu plano para aumentar os limites de armazenamento."}
      </div>
    </div>
  );
}
