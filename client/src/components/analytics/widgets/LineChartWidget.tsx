import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

interface LineChartWidgetProps {
  title: string;
  data: LineChartData;
  config?: any;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function LineChartWidget({ title, data, config }: LineChartWidgetProps) {
  // Transform data for Recharts format
  const chartData = data.labels.map((label, index) => {
    const point: any = { name: label };
    data.datasets.forEach((dataset) => {
      point[dataset.label] = dataset.data[index] || 0;
    });
    return point;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  // Determine if values are currency (typically > 1000 on average)
  const avgValue = data.datasets[0]?.data.reduce((a, b) => a + b, 0) / (data.datasets[0]?.data.length || 1);
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
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="name"
              stroke="#666"
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              stroke="#666"
              style={{ fontSize: "0.75rem" }}
              tickFormatter={isCurrency ? formatCurrency : formatNumber}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "4px",
                fontSize: "0.875rem"
              }}
              formatter={(value) => [
                isCurrency ? formatCurrency(Number(value)) : formatNumber(Number(value)),
                ""
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.875rem" }}
            />
            {data.datasets.map((dataset, index) => (
              <Line
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color || COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
