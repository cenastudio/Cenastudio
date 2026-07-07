import { useLanguage } from '@/contexts/LanguageContext';

interface FunnelChartProps {
  data: Array<{ stage: string; count: number; value: number }>;
  loading?: boolean;
}

const STAGE_CONFIG: Record<string, { color: string; gradient: string }> = {
  prospect: { color: '#6366f1', gradient: 'from-indigo-500/20 to-indigo-500/5' },
  qualified: { color: '#8b5cf6', gradient: 'from-violet-500/20 to-violet-500/5' },
  proposal: { color: '#a855f7', gradient: 'from-purple-500/20 to-purple-500/5' },
  negotiation: { color: '#e85002', gradient: 'from-orange-500/20 to-orange-500/5' },
  won: { color: '#22c55e', gradient: 'from-green-500/20 to-green-500/5' },
  lost: { color: '#ef4444', gradient: 'from-red-500/20 to-red-500/5' },
};

export function FunnelChart({ data, loading = false }: FunnelChartProps) {
  const { t } = useLanguage();

  const STAGE_LABELS: Record<string, string> = {
    prospect: t('app.commercial.stageProspect'),
    qualified: t('app.commercial.stageQualified'),
    proposal: t('app.commercial.stageProposal'),
    negotiation: t('app.commercial.stageNegotiation'),
    won: t('app.commercial.stageWon'),
    lost: t('app.commercial.stageLost'),
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-frame-gray-light">{t("app.commercial.chartLoading")}</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-frame-gray-light">{t("app.commercial.chartNoData")}</div>
      </div>
    );
  }

  // Exclude lost from the funnel shape, show it separately
  const funnelStages = data.filter(d => d.stage !== 'lost');
  const lostStage = data.find(d => d.stage === 'lost');
  const maxCount = Math.max(...funnelStages.map(d => d.count), 1);

  return (
    <div className="space-y-2 py-2">
      {funnelStages.map((item, idx) => {
        const config = STAGE_CONFIG[item.stage] || STAGE_CONFIG.prospect;
        const label = STAGE_LABELS[item.stage] || item.stage;
        // Width decreases from 100% to 55% creating funnel shape
        const funnelWidth = Math.max(50, 100 - (idx * 11));
        const barFill = item.count > 0 ? Math.max(20, (item.count / maxCount) * 100) : 0;

        return (
          <div key={item.stage} className="flex flex-col items-center">
            <div
              className="relative w-full transition-all duration-500 group cursor-default"
              style={{ maxWidth: `${funnelWidth}%` }}
            >
              {/* Bar background */}
              <div
                className="relative h-10 overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${config.color}22, ${config.color}08)`,
                  border: `1px solid ${config.color}30`,
                }}
              >
                {/* Fill bar */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700"
                  style={{
                    width: `${barFill}%`,
                    background: `linear-gradient(90deg, ${config.color}40, ${config.color}15)`,
                  }}
                />
                {/* Content */}
                <div className="relative h-full flex items-center justify-between px-3">
                  <span className="font-frame-mono text-[0.65rem] font-semibold text-frame-white truncate">{label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-frame-white">{item.count}</span>
                    {item.value > 0 && (
                      <span className="text-[0.6rem] text-frame-gray-light hidden sm:inline">
                        R$ {(item.value / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Lost — separate */}
      {lostStage && lostStage.count > 0 && (
        <div className="flex justify-center pt-2 mt-1 border-t border-frame-gray-3/20">
          <div className="flex items-center gap-3 px-4 py-2 border border-red-500/20 bg-red-500/[0.04]" style={{ maxWidth: '40%', width: '100%' }}>
            <span className="font-frame-mono text-[0.65rem] text-red-400">{STAGE_LABELS.lost}</span>
            <span className="ml-auto text-sm font-bold text-red-400">{lostStage.count}</span>
          </div>
        </div>
      )}
    </div>
  );
}
