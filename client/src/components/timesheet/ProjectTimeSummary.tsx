import { useEffect, useState } from "react";
import { Clock, Loader2, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimesheetReportRow {
  projectId: number | null;
  totalDurationSec: number;
  totalCost: number;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function ProjectTimeSummary({ projectId }: { projectId: number }) {
  const { t } = useLanguage();
  const [row, setRow] = useState<TimesheetReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setIsUnavailable(false);
    api.timesheets
      .getReport()
      .then((report) => {
        if (!active) return;
        setRow(report.find((item) => item.projectId === projectId) ?? null);
      })
      .catch(() => {
        if (active) setIsUnavailable(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  if (isUnavailable) return null;

  return (
    <section className="border border-frame-gray-3/50 bg-frame-gray-1/10 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light">
            {t("app.timesheet.projectSummaryTitle")}
          </h3>
          <p className="text-[0.65rem] text-frame-gray-light mt-1">{t("app.timesheet.projectSummaryDesc")}</p>
        </div>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-frame-orange" />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-frame-gray-3/50 p-3">
          <p className="flex items-center gap-1.5 font-frame-mono text-[0.56rem] uppercase tracking-wider text-frame-gray-light">
            <Clock className="w-3.5 h-3.5 text-frame-orange" />
            {t("app.timesheet.projectSummaryHours")}
          </p>
          <p className="mt-1 font-mono text-lg text-frame-white">{formatDuration(row?.totalDurationSec ?? 0)}</p>
        </div>
        <div className="border border-frame-gray-3/50 p-3">
          <p className="flex items-center gap-1.5 font-frame-mono text-[0.56rem] uppercase tracking-wider text-frame-gray-light">
            <Wallet className="w-3.5 h-3.5 text-frame-orange" />
            {t("app.timesheet.projectSummaryCost")}
          </p>
          <p className="mt-1 text-lg font-semibold text-frame-white">{formatCurrency(row?.totalCost ?? 0)}</p>
        </div>
      </div>
    </section>
  );
}
