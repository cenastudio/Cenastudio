import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface PieChartData {
  labels: string[];
  values: number[];
  colors?: string[];
}

interface PieChartWidgetProps {
  title: string;
  data: PieChartData;
  config?: any;
}

const DEFAULT_COLORS = ["#ff4e00", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function PieChartWidget({ title, data, config }: PieChartWidgetProps) {
  // Transform data for Recharts format
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.values[index] || 0
  }));

  const colors = data.colors || DEFAULT_COLORS;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Check if values are currency
  const avgValue = data.values.reduce((a, b) => a + b, 0) / (data.values.length || 1);
  const isCurrency = avgValue > 1000;

  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/20 rounded-lg p-6 hover:border-frame-orange/40 transition-colors">
      {/* Title */}
      <div className="mb-6">
        <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">
          {title}
        </p>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "4px",
                fontSize: "0.875rem"
              }}
              formatter={(value) => [
                isCurrency ? formatCurrency(Number(value)) : Number(value).toLocaleString("pt-BR"),
                ""
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
