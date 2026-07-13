import { useState, useEffect } from "react";
import { FileText, Plus, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportExecution {
  id: string;
  status: string;
  executedAt: string;
}

interface Report {
  id: string;
  name: string;
  type: string;
  schedule: string | null;
  last_run: string | null;
  execution_count: number;
  last_execution: ReportExecution | null;
  created_at: string;
  updated_at: string;
}

const REPORT_TYPES = ["sales", "productivity", "pipeline", "roi", "health"] as const;

const TYPE_LABELS: Record<string, { pt: string; en: string }> = {
  sales: { pt: "Vendas", en: "Sales" },
  productivity: { pt: "Produtividade", en: "Productivity" },
  pipeline: { pt: "Pipeline", en: "Pipeline" },
  roi: { pt: "ROI", en: "ROI" },
  health: { pt: "Saúde do negócio", en: "Business health" },
};

export default function ReportsTab() {
  const { locale } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<string>(REPORT_TYPES[0]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/analytics/reports", { credentials: "include" });
      const result = await response.json();
      if (result.success) {
        setReports(result.data);
      } else {
        toast.error(result.error || (locale === "en" ? "Failed to load reports" : "Erro ao carregar relatórios"));
      }
    } catch {
      toast.error(locale === "en" ? "Failed to load reports" : "Erro ao carregar relatórios");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setName("");
    setType(REPORT_TYPES[0]);
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/analytics/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, filters: {} }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(locale === "en" ? "Report created" : "Relatório criado");
        setIsCreateOpen(false);
        loadReports();
      } else {
        toast.error(result.error || (locale === "en" ? "Failed to create report" : "Erro ao criar relatório"));
      }
    } catch {
      toast.error(locale === "en" ? "Failed to create report" : "Erro ao criar relatório");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRun = async (report: Report) => {
    setRunningId(report.id);
    try {
      const response = await fetch(`/api/analytics/reports/${report.id}/run`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        toast.success(locale === "en" ? "Report executed" : "Relatório executado");
        loadReports();
      } else {
        toast.error(result.error || (locale === "en" ? "Failed to run report" : "Erro ao executar relatório"));
      }
    } catch {
      toast.error(locale === "en" ? "Failed to run report" : "Erro ao executar relatório");
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (report: Report) => {
    if (!window.confirm(locale === "en" ? `Delete report "${report.name}"?` : `Excluir relatório "${report.name}"?`)) return;
    setDeletingId(report.id);
    try {
      const response = await fetch(`/api/analytics/reports/${report.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (result.success) {
        toast.success(locale === "en" ? "Report deleted" : "Relatório excluído");
        setReports((prev) => prev.filter((r) => r.id !== report.id));
      } else {
        toast.error(result.error || (locale === "en" ? "Failed to delete report" : "Erro ao excluir relatório"));
      }
    } catch {
      toast.error(locale === "en" ? "Failed to delete report" : "Erro ao excluir relatório");
    } finally {
      setDeletingId(null);
    }
  };

  const typeLabel = (t: string) => (locale === "en" ? TYPE_LABELS[t]?.en : TYPE_LABELS[t]?.pt) || t;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{locale === "en" ? "Reports" : "Relatórios"}</h2>
          <p className="text-sm text-frame-gray-light mt-1">
            {reports.length} {locale === "en" ? "report" : "relatório"}{reports.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="frame-btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          {locale === "en" ? "New Report" : "Novo Relatório"}
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card className="border-frame-gray-3 bg-frame-gray-1/20">
          <CardContent className="flex flex-col items-center justify-center min-h-64 text-center">
            <FileText className="h-12 w-12 text-frame-gray-light mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {locale === "en" ? "No reports yet" : "Nenhum relatório ainda"}
            </h3>
            <p className="text-sm text-frame-gray-light mb-6 max-w-md">
              {locale === "en"
                ? "Create a report to track sales, productivity, pipeline, ROI or business health over time."
                : "Crie um relatório para acompanhar vendas, produtividade, pipeline, ROI ou saúde do negócio ao longo do tempo."}
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {locale === "en" ? "Create first report" : "Criar primeiro relatório"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="border-frame-gray-3 bg-frame-gray-1/20">
              <CardHeader>
                <CardTitle className="text-lg">{report.name}</CardTitle>
                <CardDescription className="text-xs">{typeLabel(report.type)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-frame-gray-light">
                  <span>
                    {report.execution_count} {locale === "en" ? "run" : "execução"}
                    {report.execution_count !== 1 ? (locale === "en" ? "s" : "ões") : ""}
                  </span>
                  <span>
                    {report.last_run
                      ? new Date(report.last_run).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")
                      : locale === "en"
                        ? "Never run"
                        : "Nunca executado"}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRun(report)}
                    disabled={runningId === report.id}
                    className="flex-1"
                  >
                    {runningId === report.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    {locale === "en" ? "Run" : "Executar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(report)}
                    disabled={deletingId === report.id}
                    className="text-red-500 hover:text-red-400"
                  >
                    {deletingId === report.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === "en" ? "New Report" : "Novo Relatório"}</DialogTitle>
            <DialogDescription className="text-xs">
              {locale === "en"
                ? "Reports track a metric over time and can be re-run whenever you need updated numbers."
                : "Relatórios acompanham uma métrica ao longo do tempo e podem ser executados de novo quando precisar de números atualizados."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <label className="space-y-1.5 block">
              <span className="frame-label text-frame-gray-light">{locale === "en" ? "Name" : "Nome"}</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="frame-input w-full"
                placeholder={locale === "en" ? "e.g. Monthly sales" : "ex: Vendas mensais"}
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="frame-label text-frame-gray-light">{locale === "en" ? "Type" : "Tipo"}</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="frame-input w-full">
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button type="submit" disabled={isCreating || !name.trim()} className="frame-btn-primary">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {isCreating ? (locale === "en" ? "Creating..." : "Criando...") : (locale === "en" ? "Create" : "Criar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
