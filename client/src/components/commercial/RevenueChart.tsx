import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const BRAND_ORANGE = 'var(--ds-orange)';

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
  loading?: boolean;
}

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const { t } = useLanguage();

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

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-surface-elevated)" />
        <XAxis
          dataKey="month"
          stroke="var(--ds-chart-axis)"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          stroke="var(--ds-chart-axis)"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--ds-surface-tooltip)',
            border: '1px solid var(--ds-dark-gray)',
            borderRadius: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '12px'
          }}
          labelStyle={{ color: BRAND_ORANGE, marginBottom: '4px' }}
          formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, t('app.commercial.chartTooltipRevenue')]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={BRAND_ORANGE}
          strokeWidth={2}
          dot={{ fill: BRAND_ORANGE, r: 3 }}
          activeDot={{ r: 5, fill: BRAND_ORANGE }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
