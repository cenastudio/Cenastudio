import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

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
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis
          dataKey="month"
          stroke="#999"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
        />
        <YAxis
          stroke="#999"
          style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}
          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: '12px'
          }}
          labelStyle={{ color: '#ff4d1d', marginBottom: '4px' }}
          formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, t('app.commercial.chartTooltipRevenue')]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#ff4d1d"
          strokeWidth={2}
          dot={{ fill: '#ff4d1d', r: 3 }}
          activeDot={{ r: 5, fill: '#ff4d1d' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
