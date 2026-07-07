import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Target, Calendar, Download, Loader2, LineChart as LineChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RevenueChart } from "@/components/commercial/RevenueChart";
import { FunnelChart } from "@/components/commercial/FunnelChart";
import { ForecastChart } from "@/components/commercial/ForecastChart";
import { ComparisonBadge } from "@/components/commercial/ComparisonBadge";
import { SkeletonCard } from "@/components/commercial/SkeletonCard";
import { SkeletonChart } from "@/components/commercial/SkeletonChart";
import { SkeletonTable } from "@/components/commercial/SkeletonTable";
import { motion, type Variants } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";


interface CommercialStats {
  totalRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  pipelineValue: number;
  averageTicket: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
}

interface CommercialMetrics {
  winRate: number;
  avgCloseTime: number;
  stageTickets: Record<string, { count: number; totalValue: number; avgTicket: number }>;
  pipelineVelocity: number;
  velocityChange: number;
  totalOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  stage: string;
}

interface FilteredStats {
  revenue: number;
  opportunities: number;
  conversionRate: number;
  avgTicket: number;
}

interface PeriodComparison {
  revenue: { current: number; previous: number; change: string; isPositive: boolean };
  conversionRate: { current: number; previous: number; change: string; isPositive: boolean };
  pipelineValue: { current: number; previous: number; change: string; isPositive: boolean };
  activeDeals: { current: number; previous: number; change: string; isPositive: boolean };
}

interface ForecastData {
  historical: Array<{ month: string; revenue: number; isForecast: boolean }>;
  forecast: Array<{ month: string; revenue: number; isForecast: boolean }>;
  metrics: {
    avgRevenue: number;
    recentTrend: number;
    growthRate: string;
    confidence: string;
  };
}

export default function CommercialOverview() {
  const { t, locale } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<CommercialStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
    pipelineValue: 0,
    averageTicket: 0,
    activeDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
  });
  const [metrics, setMetrics] = useState<CommercialMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [funnelData, setFunnelData] = useState<Array<{ stage: string; count: number; value: number }>>([]);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Report filters
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    stage: 'all',
  });
  const [filteredStats, setFilteredStats] = useState<FilteredStats | null>(null);

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  useEffect(() => {
    loadDashboardData();
    loadChartsData();
    loadMetricsData();
    loadForecastData();
    loadComparisonData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const data = await api.commercial.dashboard();
      setStats(data);
    } catch (error) {
      console.error("Error loading commercial dashboard:", error);
      toast.error(t("app.commercial.toastDashboardError"));
    } finally {
      setLoading(false);
    }
  }

  async function loadChartsData() {
    try {
      setChartsLoading(true);
      const [revenue, funnel] = await Promise.all([
        api.commercial.revenue(),
        api.commercial.funnel(),
      ]);
      setRevenueData(revenue);
      setFunnelData(funnel);
    } catch (error) {
      console.error("Error loading charts data:", error);
      toast.error(t("app.commercial.toastChartsError"));
    } finally {
      setChartsLoading(false);
    }
  }

  async function loadMetricsData() {
    try {
      setMetricsLoading(true);
      const data = await api.commercial.metrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics data:", error);
      toast.error(t("app.commercial.toastMetricsError"));
    } finally {
      setMetricsLoading(false);
    }
  }

  async function loadForecastData() {
    try {
      setForecastLoading(true);
      const data = await api.commercial.forecast();
      setForecastData(data);
    } catch (error) {
      console.error("Error loading forecast data:", error);
      toast.error(t("app.commercial.toastForecastError"));
    } finally {
      setForecastLoading(false);
    }
  }

  async function loadComparisonData() {
    try {
      const data = await api.commercial.comparison();
      setComparison(data);
    } catch (error) {
      console.error("Error loading comparison data:", error);
      // Silent fail - comparison is optional
    }
  }

  function handleApplyFilters() {
    // Calculate filtered stats based on current data
    // This is a simplified version - in production, would call backend API with filters
    const filtered: FilteredStats = {
      revenue: stats.totalRevenue,
      opportunities: stats.activeDeals + stats.wonDeals + stats.lostDeals,
      conversionRate: stats.conversionRate,
      avgTicket: stats.averageTicket,
    };
    setFilteredStats(filtered);
    toast.success(t("app.commercial.toastFiltersApplied"));
  }

  function handleClearFilters() {
    setReportFilters({
      startDate: '',
      endDate: '',
      stage: 'all',
    });
    setFilteredStats(null);
    toast.info(t("app.commercial.toastFiltersCleared"));
  }

  async function handleExport(format: 'excel' | 'pdf' | 'csv') {
    try {
      setExportLoading(true);

      // Generate export data
      const exportData = {
        stats,
        metrics,
        revenueData,
        funnelData,
        filters: reportFilters,
        generatedAt: new Date().toISOString(),
      };

      if (format === 'csv') {
        // CSV export with better formatting
        exportToCSV(exportData);
        toast.success(t("app.commercial.toastCsvExported"));
      } else if (format === 'excel') {
        // Excel-like CSV with tabs
        exportToExcelCSV(exportData);
        toast.success(t("app.commercial.toastExcelExported"));
      } else if (format === 'pdf') {
        // For now, export a detailed CSV that can be imported to PDF
        exportToDetailedCSV(exportData);
        toast.info(t("app.commercial.toastPdfExported"));
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error(t("app.commercial.toastExportError"));
    } finally {
      setExportLoading(false);
    }
  }

  function exportToCSV(data: any) {
    const csv = [
      // Header
      [t('app.commercial.exportDocTitle')],
      [t('app.commercial.exportDocGenerated'), new Date().toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')],
      [''],
      [t('app.commercial.exportDocStats')],
      [t('app.commercial.exportDocMetric'), t('app.commercial.exportDocValue')],
      [t('app.commercial.exportDocTotalRevenue'), `R$ ${data.stats.totalRevenue.toLocaleString('pt-BR')}`],
      [t('app.commercial.exportDocMonthlyRevenue'), `R$ ${data.stats.monthlyRevenue.toLocaleString('pt-BR')}`],
      [t('app.commercial.exportDocConversionRate'), `${data.stats.conversionRate}%`],
      [t('app.commercial.exportDocPipelineValue'), `R$ ${data.stats.pipelineValue.toLocaleString('pt-BR')}`],
      [t('app.commercial.exportDocAvgTicket'), `R$ ${data.stats.averageTicket.toLocaleString('pt-BR')}`],
      [t('app.commercial.exportDocActiveDeals'), data.stats.activeDeals],
      [t('app.commercial.exportDocWonDeals'), data.stats.wonDeals],
      [t('app.commercial.exportDocLostDeals'), data.stats.lostDeals],
      [''],
      [t('app.commercial.exportDocFunnel')],
      [t('app.commercial.exportDocStage'), t('app.commercial.exportDocQty'), t('app.commercial.thTotalValue')],
      ...data.funnelData.map((item: any) => [
        item.stage,
        item.count,
        `R$ ${item.value.toLocaleString('pt-BR')}`
      ]),
      [''],
      [t('app.commercial.exportDocMonthlyRevenueTitle')],
      [t('app.commercial.exportDocMonth'), t('app.commercial.exportDocRevenue')],
      ...data.revenueData.map((item: any) => [
        item.month,
        `R$ ${item.revenue.toLocaleString('pt-BR')}`
      ]),
    ].map(row => row.join(',')).join('\n');

    downloadFile(csv, 'commercial-hub-report.csv', 'text/csv');
  }

  function exportToExcelCSV(data: any) {
    // Excel-compatible CSV with better formatting
    const csv = [
      [t('app.commercial.exportDocFull')],
      [t('app.commercial.exportDocGenerated') + ':', new Date().toLocaleString(locale === 'en' ? 'en-US' : 'pt-BR')],
      [''],
      [t('app.commercial.exportDocExecSummary')],
      [''],
      [t('app.commercial.exportDocMainKpis')],
      [t('app.commercial.exportDocMetric'), t('app.commercial.exportDocCurrentValue'), t('app.commercial.exportDocChange')],
      [t('app.commercial.exportDocTotalRevenue'), data.stats.totalRevenue, comparison ? `${comparison.revenue.change}%` : 'N/A'],
      [t('app.commercial.exportDocConversionRate'), `${data.stats.conversionRate}%`, comparison ? `${comparison.conversionRate.change}%` : 'N/A'],
      ['Pipeline', data.stats.pipelineValue, comparison ? `${comparison.pipelineValue.change}%` : 'N/A'],
      [t('app.commercial.exportDocActiveDeals'), data.stats.activeDeals, comparison ? `${comparison.activeDeals.change}%` : 'N/A'],
      [''],
      [t('app.commercial.exportDocFunnelSection')],
      [''],
      [t('app.commercial.funnelThStage'), t('app.commercial.exportDocQty'), t('app.commercial.thTotalValue'), t('app.commercial.exportDocPctTotal')],
      ...data.funnelData.map((item: any, idx: number, arr: any[]) => {
        const totalCount = arr.reduce((sum: number, i: any) => sum + i.count, 0);
        const percentage = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0';
        return [item.stage, item.count, item.value, `${percentage}%`];
      }),
      [''],
      [t('app.commercial.exportDocRevenueSection')],
      [''],
      [t('app.commercial.exportDocMonth'), t('app.commercial.exportDocRevenue'), t('app.commercial.exportDocChangePct')],
      ...data.revenueData.map((item: any, idx: number, arr: any[]) => {
        const prevRevenue = idx > 0 ? arr[idx - 1].revenue : item.revenue;
        const change = prevRevenue > 0 ? (((item.revenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : '0.0';
        return [item.month, item.revenue, idx > 0 ? `${change}%` : '-'];
      }),
      [''],
      [t('app.commercial.exportDocMetricsSection')],
    ];

    if (data.metrics) {
      csv.push(
        [''],
        [t('app.commercial.exportDocKpiPerformance')],
        [t('app.commercial.exportDocMetric'), t('app.commercial.exportDocValue')],
        [t('app.commercial.exportDocWinRate'), `${data.metrics.winRate}%`],
        [t('app.commercial.exportDocAvgCloseTime'), `${data.metrics.avgCloseTime} ${t('app.commercial.days')}`],
        [t('app.commercial.exportDocPipelineVelocity'), `${data.metrics.pipelineVelocity} ${t('app.commercial.dealsPerMonth')}`],
        [t('app.commercial.exportDocVelocityChange'), `${data.metrics.velocityChange}%`],
        [''],
        [t('app.commercial.exportDocAvgTicketStage')],
        [t('app.commercial.thStage'), t('app.commercial.thQty'), t('app.commercial.thTotalValue'), t('app.commercial.thAvgTicket')],
        ...Object.entries(data.metrics.stageTickets || {}).map(([stage, stageData]: [string, any]) => [
          stage,
          stageData.count,
          stageData.totalValue,
          stageData.avgTicket
        ])
      );
    }

    const csvText = csv.map(row => row.join('\t')).join('\n'); // Use tab delimiter for Excel
    downloadFile(csvText, 'commercial-hub-excel.csv', 'text/csv');
  }

  function exportToDetailedCSV(data: any) {
    // Generate a beautiful dark-theme PDF report via print
    const color = "#e85002";
    const formattedDate = new Date().toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const stageLabels: Record<string, string> = { prospect: t("app.commercial.stageProspect"), qualified: t("app.commercial.stageQualified"), proposal: t("app.commercial.stageProposal"), negotiation: t("app.commercial.stageNegotiation"), won: t("app.commercial.stageWon"), lost: t("app.commercial.stageLost") };

    const funnelRows = data.funnelData.map((item: any) => `
      <tr><td>${stageLabels[item.stage] || item.stage}</td><td>${item.count}</td><td>R$ ${item.value.toLocaleString("pt-BR")}</td></tr>
    `).join("");

    const revenueRows = data.revenueData.slice(-6).map((item: any) => `
      <tr><td>${item.month}</td><td>R$ ${item.revenue.toLocaleString("pt-BR")}</td></tr>
    `).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${t("app.commercial.exportDocDetailed")}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;min-height:100%;background:#0d0d0d;color:#e8e8e8;font-family:Arial,sans-serif}
body{background:radial-gradient(circle at 88% 5%,${color}2e,transparent 34%),linear-gradient(135deg,#15100d 0%,#0d0d0d 42%,#050505 100%)}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm;position:relative}
.page:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(232,80,2,.06),transparent 32%);pointer-events:none}
.page>*{position:relative;z-index:1}
.header{display:flex;justify-content:space-between;padding-bottom:24px;border-bottom:3px solid ${color}}
.brand{font-size:30px;font-weight:900;letter-spacing:.06em;color:#fff}.brand span{color:${color}}
.doc{text-align:right}.doc small{display:block;color:#777;font-size:9px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
.doc strong{display:block;color:${color};font-size:11px;margin-top:4px}
h1{font-size:32px;margin:28px 0 6px;color:#fff;letter-spacing:.02em}
.muted{color:#999;font-size:12px}
.divider{height:1px;background:linear-gradient(90deg,${color}44,transparent);margin:24px 0}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}
.stat{background:#151515;border:1px solid #252525;padding:14px}
.stat .label{font-size:9px;color:#777;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
.stat .value{font-size:18px;color:#fff;font-weight:800}
.section{margin-top:28px}
.section-title{font-size:10px;color:${color};font-weight:900;letter-spacing:.16em;text-transform:uppercase;margin-bottom:12px}
table{width:100%;border-collapse:collapse;background:#141414;border:1px solid #252525}
th{padding:10px 12px;text-align:left;background:#1b1b1b;color:#777;font-size:9px;text-transform:uppercase;letter-spacing:.1em}
td{padding:10px 12px;border-top:1px solid #252525;color:#ddd;font-size:12px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #252525;display:flex;justify-content:space-between;color:#555;font-size:10px}
@media print{html,body{background:#0d0d0d}.page{box-shadow:none}table,tr,td,th,.stat{break-inside:avoid}}
</style></head><body><main class="page">
<header class="header"><div><div class="brand">Cena<span>.</span> Studio</div></div><div class="doc"><small>${t("app.commercial.exportDocDetailed")}</small><strong>${formattedDate}</strong></div></header>
<h1>${t("app.commercial.title")}</h1><p class="muted">${t("app.commercial.subtitle")}</p>
<div class="grid">
<div class="stat"><div class="label">${t("app.commercial.cardRevenue")}</div><div class="value">R$ ${data.stats.totalRevenue.toLocaleString("pt-BR")}</div></div>
<div class="stat"><div class="label">${t("app.commercial.cardConversion")}</div><div class="value">${data.stats.conversionRate}%</div></div>
<div class="stat"><div class="label">${t("app.commercial.cardPipeline")}</div><div class="value">R$ ${data.stats.pipelineValue.toLocaleString("pt-BR")}</div></div>
<div class="stat"><div class="label">${t("app.commercial.cardDeals")}</div><div class="value">${data.stats.activeDeals}</div></div>
</div>
<div class="divider"></div>
<section class="section"><div class="section-title">${t("app.commercial.funnelTitle")}</div>
<table><thead><tr><th>${t("app.commercial.funnelThStage")}</th><th>${t("app.commercial.funnelThOpps")}</th><th>${t("app.commercial.funnelThValue")}</th></tr></thead><tbody>${funnelRows}</tbody></table></section>
<div class="divider"></div>
<section class="section"><div class="section-title">${t("app.commercial.chartRevenue")}</div>
<table><thead><tr><th>${t("app.commercial.exportDocMonth")}</th><th>${t("app.commercial.exportDocRevenue")}</th></tr></thead><tbody>${revenueRows}</tbody></table></section>
<footer class="footer"><span>Cena Studio · cenastudio.com.br</span><span>${formattedDate}</span></footer>
</main></body></html>`;

    // Open print dialog (save as PDF)
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(iframe);
    const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);
    iframe.onload = () => {
      const fw = iframe.contentWindow;
      if (!fw) { cleanup(); return; }
      fw.focus();
      fw.onafterprint = cleanup;
      window.setTimeout(() => { fw.print(); cleanup(); }, 250);
    };
    iframe.srcdoc = html;
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loading) {
    return (
      <div className="py-8">
        {/* Content skeleton */}
        <div className="mx-auto max-w-7xl px-6">
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Charts skeleton */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded border border-frame-gray-3 bg-frame-gray-1 p-6">
              <div className="mb-4 h-6 w-48 animate-pulse rounded bg-frame-gray-3" />
              <SkeletonChart />
            </div>
            <div className="rounded border border-frame-gray-3 bg-frame-gray-1 p-6">
              <div className="mb-4 h-6 w-32 animate-pulse rounded bg-frame-gray-3" />
              <SkeletonChart />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="border-b border-frame-gray-3 bg-frame-gray-1/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="frame-label mb-1">{t("app.commercial.eyebrow")}</p>
              <h1 className="text-2xl font-bold text-frame-white">{t("app.commercial.title")}</h1>
              <p className="mt-1 text-sm text-frame-gray-light max-w-lg">
                {t("app.commercial.subtitle")}
              </p>
            </div>
            {/* Workflow steps */}
            <div className="flex gap-2 shrink-0">
              <div className="border border-frame-orange/30 bg-frame-orange/[0.06] px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-orange">01</span>
                <span className="block text-[0.6rem] font-medium text-frame-white mt-0.5">{t("app.commercial.stepProspect")}</span>
              </div>
              <div className="border border-frame-gray-3/40 px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-gray-light">02</span>
                <span className="block text-[0.6rem] font-medium text-frame-gray-light mt-0.5">{t("app.commercial.stepQualify")}</span>
              </div>
              <div className="border border-frame-gray-3/40 px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-gray-light">03</span>
                <span className="block text-[0.6rem] font-medium text-frame-gray-light mt-0.5">{t("app.commercial.stepClose")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 w-full flex-wrap justify-start gap-2 md:flex-nowrap overflow-x-auto scrollbar-none">
            <TabsTrigger value="dashboard" className="flex-1 md:flex-initial">{t("app.commercial.tabDashboard")}</TabsTrigger>
            <TabsTrigger value="metrics" className="flex-1 md:flex-initial">{t("app.commercial.tabMetrics")}</TabsTrigger>
            <TabsTrigger value="funnel" className="flex-1 md:flex-initial">{t("app.commercial.tabFunnel")}</TabsTrigger>
            <TabsTrigger value="reports" className="flex-1 md:flex-initial">{t("app.commercial.tabReports")}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <motion.div
              className="space-y-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: t("app.commercial.cardRevenue"), value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR")}`, comparison: comparison?.revenue },
                  { label: t("app.commercial.cardConversion"), value: `${stats.conversionRate}%`, comparison: comparison?.conversionRate },
                  { label: t("app.commercial.cardPipeline"), value: `R$ ${stats.pipelineValue.toLocaleString("pt-BR")}`, comparison: comparison?.pipelineValue },
                  { label: t("app.commercial.cardDeals"), value: String(stats.activeDeals), comparison: comparison?.activeDeals },
                ].map((card) => (
                  <motion.div key={card.label} variants={itemVariants}>
                    <Card className="bg-frame-gray-1 border-frame-gray-3 p-5 transition-all hover:border-frame-orange/50">
                      <p className="text-sm text-frame-gray-light">{card.label}</p>
                      <p className="mt-2 text-2xl font-bold text-frame-white">{card.value}</p>
                      {card.comparison && (
                        <div className="mt-2">
                          <ComparisonBadge change={card.comparison.change} isPositive={card.comparison.isPositive} />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Charts Section */}
              <motion.div
                className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                variants={itemVariants}
              >
                <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-frame-white">
                    {t("app.commercial.chartRevenue")}
                  </h3>
                  <div role="img" aria-label={t("app.commercial.ariaRevenue")}>
                    {chartsLoading ? (
                      <SkeletonChart />
                    ) : (
                      <RevenueChart data={revenueData} loading={false} />
                    )}
                  </div>
                </Card>

                <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-frame-white">
                    {t("app.commercial.chartFunnel")}
                  </h3>
                  <div role="img" aria-label={t("app.commercial.ariaFunnel")}>
                    {chartsLoading ? (
                      <SkeletonChart />
                    ) : (
                      <FunnelChart data={funnelData} loading={false} />
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Forecast Section */}
              <motion.div variants={itemVariants}>
                <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <LineChartIcon className="text-frame-orange" size={20} />
                    <h3 className="text-lg font-semibold text-frame-white">
                      {t("app.commercial.chartForecast")}
                    </h3>
                  </div>
                  {forecastLoading ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse rounded border border-frame-gray-3 bg-frame-gray-2/50 p-3">
                            <div className="h-3 w-24 rounded bg-frame-gray-3" />
                            <div className="mt-2 h-6 w-32 rounded bg-frame-gray-3" />
                          </div>
                        ))}
                      </div>
                      <SkeletonChart height="320px" />
                    </div>
                  ) : (
                    <ForecastChart data={forecastData} loading={false} />
                  )}
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics">
            {metricsLoading ? (
              <div className="space-y-8">
                {/* KPI Cards Skeleton */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
                {/* Table Skeleton */}
                <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                  <div className="mb-4 h-6 w-48 animate-pulse rounded bg-frame-gray-3" />
                  <SkeletonTable />
                </Card>
              </div>
            ) : !metrics ? (
              <Card className="bg-frame-gray-1 border-frame-gray-3 p-8">
                <p className="text-center text-frame-gray-light">{t("app.commercial.metricsNone")}</p>
              </Card>
            ) : (
              <motion.div
                className="space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {/* Win Rate Card */}
                  <motion.div variants={itemVariants}>
                    <Card className="bg-frame-gray-1 border-frame-gray-3 p-6 transition-all hover:border-green-500/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-frame-gray-light">Win Rate</p>
                          <p className="mt-2 text-3xl font-bold text-frame-white">
                            {metrics.winRate}%
                          </p>
                          <p className="mt-1 text-xs text-frame-gray-light">
                            {metrics.wonOpportunities} {t("app.commercial.wonOf")} {metrics.totalOpportunities}
                          </p>
                        </div>
                        <div className="rounded-full bg-green-500/20 p-3">
                          <TrendingUp className="text-green-500" size={24} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Average Close Time Card */}
                  <motion.div variants={itemVariants}>
                    <Card className="bg-frame-gray-1 border-frame-gray-3 p-6 transition-all hover:border-blue-500/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-frame-gray-light">
                            {t("app.commercial.avgCloseTime")}
                          </p>
                          <p className="mt-2 text-3xl font-bold text-frame-white">
                            {metrics.avgCloseTime}
                          </p>
                          <p className="mt-1 text-xs text-frame-gray-light">{t("app.commercial.days")}</p>
                        </div>
                        <div className="rounded-full bg-blue-500/20 p-3">
                          <Calendar className="text-blue-500" size={24} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Pipeline Velocity Card */}
                  <motion.div variants={itemVariants}>
                    <Card className="bg-frame-gray-1 border-frame-gray-3 p-6 transition-all hover:border-purple-500/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-frame-gray-light">
                            {t("app.commercial.pipelineVelocity")}
                          </p>
                          <p className="mt-2 text-3xl font-bold text-frame-white">
                            {metrics.pipelineVelocity}
                          </p>
                          <p className="mt-1 text-xs text-frame-gray-light">{t("app.commercial.dealsPerMonth")}</p>
                        </div>
                        <div className="rounded-full bg-purple-500/20 p-3">
                          <Target className="text-purple-500" size={24} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Velocity Change Card */}
                  <motion.div variants={itemVariants}>
                    <Card className="bg-frame-gray-1 border-frame-gray-3 p-6 transition-all hover:border-frame-orange/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-frame-gray-light">
                            {t("app.commercial.monthlyChange")}
                          </p>
                          <p className={`mt-2 text-3xl font-bold ${
                            metrics.velocityChange >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {metrics.velocityChange > 0 ? '+' : ''}{metrics.velocityChange}%
                          </p>
                          <p className="mt-1 text-xs text-frame-gray-light">{t("app.commercial.vsPrevMonth")}</p>
                        </div>
                        <div className={`rounded-full p-3 ${
                          metrics.velocityChange >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          <TrendingUp className={
                            metrics.velocityChange >= 0 ? 'text-green-500' : 'text-red-500'
                          } size={24} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Stage Tickets Table */}
                <motion.div variants={itemVariants}>
                  <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                    <h3 className="mb-4 text-lg font-semibold text-frame-white">
                      {t("app.commercial.avgTicketByStage")}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-frame-gray-3">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-frame-gray-light">
                              {t("app.commercial.thStage")}
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-frame-gray-light">
                              {t("app.commercial.thQty")}
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-frame-gray-light">
                              {t("app.commercial.thTotalValue")}
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-frame-gray-light">
                              {t("app.commercial.thAvgTicket")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(metrics.stageTickets).map(([stage, data]) => {
                            const stageLabels: Record<string, string> = {
                              prospect: t('app.commercial.stageProspect'),
                              qualified: t('app.commercial.stageQualified'),
                              proposal: t('app.commercial.stageProposal'),
                              negotiation: t('app.commercial.stageNegotiation'),
                              won: t('app.commercial.stageWon'),
                              lost: t('app.commercial.stageLost'),
                            };
                            return (
                              <tr key={stage} className="border-b border-frame-gray-3/50 transition-colors hover:bg-frame-gray-2/30">
                                <td className="px-4 py-3 text-sm text-frame-white">
                                  {stageLabels[stage] || stage}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-frame-white">
                                  {data.count}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-frame-white">
                                  R$ {data.totalValue.toLocaleString('pt-BR')}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-semibold text-frame-orange">
                                  R$ {data.avgTicket.toLocaleString('pt-BR')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel">
            <div className="space-y-5">
              {/* Header */}
              <div className="liquid-glass p-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.2em] text-frame-orange mb-2">{t("app.commercial.eyebrow")}</p>
                    <h2 className="text-2xl font-bold text-frame-white">{t("app.commercial.funnelTitle")}</h2>
                    <p className="text-frame-gray-light text-sm mt-1">
                      {t("app.commercial.funnelSubtitle")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="glow-card px-4 py-2.5 text-center min-w-[80px]">
                      <span className="block text-xl font-bold text-frame-white">
                        {funnelData.filter(s => !['won','lost'].includes(s.stage)).reduce((a,b) => a + b.count, 0)}
                      </span>
                      <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light mt-0.5">{t("app.commercial.funnelInProgress")}</span>
                    </div>
                    <div className="glow-card px-4 py-2.5 text-center min-w-[80px]">
                      <span className="block text-xl font-bold text-frame-green">
                        {funnelData.find(s => s.stage === 'won')?.count ?? 0}
                      </span>
                      <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light mt-0.5">{t("app.commercial.funnelClosed")}</span>
                    </div>
                    <div className="glow-card px-4 py-2.5 text-center min-w-[80px]">
                      <span className="block text-xl font-bold text-frame-orange">
                        {(() => {
                          const total = funnelData.reduce((a,b) => a + b.count, 0);
                          const won = funnelData.find(s => s.stage === 'won')?.count ?? 0;
                          return total > 0 ? `${Math.round((won/total)*100)}%` : '—';
                        })()}
                      </span>
                      <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light mt-0.5">{t("app.commercial.funnelWinRate")}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funil visual */}
              {chartsLoading ? (
                <div className="liquid-glass p-12 text-center">
                  <div className="w-8 h-8 border-2 border-frame-orange border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : funnelData.length === 0 || funnelData.every(s => s.count === 0) ? (
                <div className="frame-empty-state p-10 text-center space-y-3">
                  <p className="text-frame-white font-semibold">{t("app.commercial.funnelEmpty")}</p>
                  <p className="text-frame-gray-light text-sm">{t("app.commercial.funnelEmptyHint")}</p>
                </div>
              ) : (
                <div className="liquid-glass p-6 space-y-1">
                  {(() => {
                    const STAGES = [
                      { key: 'prospect',    label: t('app.commercial.stageProspect'),  step: '01', color: '#6366f1' },
                      { key: 'qualified',   label: t('app.commercial.stageQualified'), step: '02', color: '#8b5cf6' },
                      { key: 'proposal',    label: t('app.commercial.stageProposal'),    step: '03', color: '#a855f7' },
                      { key: 'negotiation', label: t('app.commercial.stageNegotiation'),  step: '04', color: '#e85002' },
                      { key: 'won',         label: t('app.commercial.stageWon'),       step: '05', color: '#22c55e' },
                    ];
                    const firstStage = funnelData.find(f => f.stage === 'prospect');
                    const firstCount = firstStage?.count || 1;

                    return STAGES.map((stage, idx) => {
                      const data = funnelData.find(f => f.stage === stage.key);
                      const count = data?.count ?? 0;
                      const value = data?.value ?? 0;
                      const isWon = stage.key === 'won';
                      // Funnel width: decreases from 100% to 50% across stages
                      const funnelWidth = Math.max(45, 100 - (idx * 12));
                      // Conversion from previous
                      const prevData = idx > 0 ? funnelData.find(f => f.stage === STAGES[idx-1]?.key) : null;
                      const convRate = prevData && prevData.count > 0 ? Math.round((count / prevData.count) * 100) : null;

                      return (
                        <div key={stage.key} className="flex flex-col items-center">
                          {/* Conversion arrow */}
                          {idx > 0 && convRate !== null && (
                            <div className="flex items-center gap-2 py-1.5">
                              <div className="w-px h-3 bg-frame-gray-3/40" />
                              <span className="font-frame-mono text-[0.55rem] text-frame-gray-light">
                                {t("app.commercial.funnelConversion")} <strong className={convRate >= 70 ? "text-frame-green" : convRate >= 40 ? "text-frame-orange" : "text-frame-red"}>{convRate}%</strong>
                              </span>
                              <div className="w-px h-3 bg-frame-gray-3/40" />
                            </div>
                          )}
                          {/* Stage bar — trapezoid funnel shape */}
                          <div
                            className="relative w-full transition-all duration-500"
                            style={{ maxWidth: `${funnelWidth}%` }}
                          >
                            <div
                              className={`relative overflow-hidden py-4 px-5 ${isWon ? "rounded-lg" : "rounded-sm"}`}
                              style={{
                                background: isWon
                                  ? `linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))`
                                  : `linear-gradient(135deg, ${stage.color}18, ${stage.color}08)`,
                                border: `1px solid ${isWon ? 'rgba(34,197,94,0.3)' : `${stage.color}35`}`,
                              }}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="font-frame-mono text-[0.55rem] text-frame-gray-muted">{stage.step}</span>
                                  <div className="min-w-0">
                                    <p className={`font-semibold text-sm ${isWon ? "text-frame-green" : "text-frame-white"}`}>{stage.label}</p>
                                    {value > 0 && (
                                      <p className="text-[0.65rem] text-frame-gray-light">R$ {value.toLocaleString('pt-BR')}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-2xl font-bold ${isWon ? "text-frame-green" : count === 0 ? "text-frame-gray-muted" : "text-frame-white"}`}>{count}</span>
                                  <span className="text-[0.6rem] text-frame-gray-light">{t("app.commercial.funnelOpportunities")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Perdidos — separate section */}
                  {(() => {
                    const lost = funnelData.find(f => f.stage === 'lost');
                    if (!lost || lost.count === 0) return null;
                    return (
                      <div className="pt-3 mt-2 border-t border-frame-gray-3/30">
                        <div className="flex items-center justify-between px-5 py-3 rounded-lg border border-frame-red/20 bg-frame-red/[0.04] max-w-[50%] mx-auto">
                          <div className="flex items-center gap-3">
                            <span className="font-frame-mono text-[0.55rem] text-frame-gray-muted">—</span>
                            <p className="font-semibold text-sm text-frame-red/80">{t("app.commercial.stageLost")}</p>
                          </div>
                          <span className="text-xl font-bold text-frame-red/80">{lost.count}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tabela resumo */}
              {!chartsLoading && funnelData.some(s => s.count > 0) && (
                <div className="liquid-glass p-6">
                  <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange mb-4">{t("app.commercial.funnelSummary")}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-frame-gray-3/40">
                          <th className="text-left pb-3 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light">{t("app.commercial.funnelThStage")}</th>
                          <th className="text-right pb-3 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light">{t("app.commercial.funnelThOpps")}</th>
                          <th className="text-right pb-3 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light">{t("app.commercial.funnelThValue")}</th>
                          <th className="text-right pb-3 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-gray-light">{t("app.commercial.funnelThTicket")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'prospect', label: t('app.commercial.stageProspect') },
                          { key: 'qualified', label: t('app.commercial.stageQualified') },
                          { key: 'proposal', label: t('app.commercial.stageProposal') },
                          { key: 'negotiation', label: t('app.commercial.stageNegotiation') },
                          { key: 'won', label: t('app.commercial.stageWon') },
                          { key: 'lost', label: t('app.commercial.stageLost') },
                        ].map(({ key, label }) => {
                          const d = funnelData.find(f => f.stage === key);
                          if (!d || d.count === 0) return null;
                          const ticket = d.count > 0 ? Math.round(d.value / d.count) : 0;
                          const isWon = key === 'won';
                          const isLost = key === 'lost';
                          return (
                            <tr key={key} className="border-b border-frame-gray-3/20 last:border-0">
                              <td className={`py-3 font-medium ${isWon ? "text-frame-green" : isLost ? "text-frame-red/70" : "text-frame-white"}`}>{label}</td>
                              <td className="py-3 text-right text-frame-white font-mono">{d.count}</td>
                              <td className="py-3 text-right text-frame-gray-light font-mono">R$ {d.value.toLocaleString('pt-BR')}</td>
                              <td className="py-3 text-right text-frame-gray-light font-mono">{ticket > 0 ? `R$ ${ticket.toLocaleString('pt-BR')}` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="space-y-6">
              {/* Filters Section */}
              <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                <h3 className="mb-4 text-lg font-semibold text-frame-white">
                  {t("app.commercial.reportFilters")}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm text-frame-gray-light">
                      {t("app.commercial.startDate")}
                    </label>
                    <input
                      type="date"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                      className="w-full border border-frame-gray-3 bg-frame-black px-3 py-2 text-sm text-frame-white focus:border-frame-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-frame-gray-light">
                      {t("app.commercial.endDate")}
                    </label>
                    <input
                      type="date"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                      className="w-full border border-frame-gray-3 bg-frame-black px-3 py-2 text-sm text-frame-white focus:border-frame-orange focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-frame-gray-light">
                      {t("app.commercial.stage")}
                    </label>
                    <select
                      value={reportFilters.stage}
                      onChange={(e) => setReportFilters({ ...reportFilters, stage: e.target.value })}
                      className="w-full border border-frame-gray-3 bg-frame-black px-3 py-2 text-sm text-frame-white focus:border-frame-orange focus:outline-none"
                    >
                      <option value="all">{t("app.commercial.optionAll")}</option>
                      <option value="prospect">{t("app.commercial.stageProspect")}</option>
                      <option value="qualified">{t("app.commercial.stageQualified")}</option>
                      <option value="proposal">{t("app.commercial.stageProposal")}</option>
                      <option value="negotiation">{t("app.commercial.stageNegotiation")}</option>
                      <option value="won">{t("app.commercial.stageWon")}</option>
                      <option value="lost">{t("app.commercial.stageLost")}</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleApplyFilters}
                    className="frame-btn-primary"
                  >
                    {t("app.commercial.applyFilters")}
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="frame-btn-ghost"
                  >
                    {t("app.commercial.clearFilters")}
                  </button>
                </div>
              </Card>

              {/* Export Buttons */}
              <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                <h3 className="mb-4 text-lg font-semibold text-frame-white">
                  {t("app.commercial.exportReports")}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={exportLoading}
                    className="frame-btn-primary flex items-center gap-2"
                    aria-label={t("app.commercial.ariaExportExcel")}
                  >
                    {exportLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {t("app.commercial.exportExcel")}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exportLoading}
                    className="frame-btn-primary flex items-center gap-2"
                    aria-label={t("app.commercial.ariaExportPdf")}
                  >
                    {exportLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {t("app.commercial.exportPdf")}
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exportLoading}
                    className="frame-btn-ghost flex items-center gap-2"
                    aria-label={t("app.commercial.ariaExportCsv")}
                  >
                    {exportLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {t("app.commercial.exportCsv")}
                  </button>
                </div>
                <p className="mt-3 text-xs text-frame-gray-light">
                  {t("app.commercial.exportHint")}
                </p>
              </Card>

              {/* Report Preview */}
              <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                <h3 className="mb-4 text-lg font-semibold text-frame-white">
                  {t("app.commercial.reportPreview")}
                </h3>
                {stats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-frame-gray-light">{t("app.commercial.totalRevenue")}</p>
                        <p className="text-xl font-bold text-frame-white">
                          R$ {(filteredStats?.revenue ?? stats.totalRevenue).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-frame-gray-light">{t("app.commercial.opportunities")}</p>
                        <p className="text-xl font-bold text-frame-white">
                          {filteredStats?.opportunities ?? (stats.activeDeals + stats.wonDeals + stats.lostDeals)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-frame-gray-light">{t("app.commercial.conversionRate")}</p>
                        <p className="text-xl font-bold text-frame-white">
                          {filteredStats?.conversionRate ?? stats.conversionRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-frame-gray-light">{t("app.commercial.avgTicket")}</p>
                        <p className="text-xl font-bold text-frame-white">
                          R$ {(filteredStats?.avgTicket ?? stats.averageTicket).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-frame-gray-light">
                      {t("app.commercial.period")} {reportFilters.startDate || t("app.commercial.periodStart")} {t("app.commercial.periodUntil")} {reportFilters.endDate || t("app.commercial.periodToday")}
                      {reportFilters.stage !== 'all' && ` • ${t("app.commercial.stage")}: ${reportFilters.stage}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-frame-gray-light">
                    {t("app.commercial.reportPreviewHint")}
                  </p>
                )}
              </Card>

              {/* Scheduled Reports — functional */}
              <Card className="bg-frame-gray-1 border-frame-gray-3 p-6">
                <h3 className="mb-4 text-lg font-semibold text-frame-white">
                  {t("app.commercial.scheduledReports")}
                </h3>
                <p className="mb-4 text-sm text-frame-gray-light">
                  {t("app.commercial.scheduledHint")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const current = localStorage.getItem("cena-scheduled-report");
                      if (current) {
                        localStorage.removeItem("cena-scheduled-report");
                        toast.info(locale === "en" ? "Scheduled export disabled" : "Exportação agendada desativada");
                      } else {
                        localStorage.setItem("cena-scheduled-report", JSON.stringify({ frequency: "weekly", format: "pdf", enabled: true }));
                        toast.success(locale === "en" ? "Weekly PDF export scheduled! You'll be reminded every Monday." : "Exportação PDF semanal ativada! Você será lembrado toda segunda.");
                      }
                    }}
                    className={`frame-btn-primary flex items-center gap-2 ${localStorage.getItem("cena-scheduled-report") ? "bg-frame-green" : ""}`}
                  >
                    {localStorage.getItem("cena-scheduled-report")
                      ? (locale === "en" ? "✓ Active — click to disable" : "✓ Ativo — clique para desativar")
                      : (locale === "en" ? "Activate weekly export" : "Ativar exportação semanal")}
                  </button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
