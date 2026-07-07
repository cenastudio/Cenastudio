import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface BarChartData {
  categories: string[];
  values: number[];
  colors?: string[];
}

interface BarChartWidgetProps {
  title: string;
  data: BarChartData;
  config?: any;
}

export default function BarChartWidget({ title, data, config }: BarChartWidgetProps) {
  // Transform data for Recharts format
  const chartData = data.categories.map((category, index) => ({
    name: category,
    value: data.values[index] || 0
  }));

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

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
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="name"
              stroke="#666"
              style={{ fontSize: "0.75rem" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#666"
              style={{ fontSize: "0.75rem" }}
              tickFormatter={formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "4px",
                fontSize: "0.875rem"
              }}
              formatter={(value) => [formatNumber(Number(value)), "Count"]}
            />
            <Bar
              dataKey="value"
              fill="#ff4e00"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
