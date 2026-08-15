import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface GaugeData {
  value: number;
  min: number;
  max: number;
  target?: number;
  label?: string;
}

interface GaugeWidgetProps {
  title: string;
  data: GaugeData;
  config?: any;
}

export default function GaugeWidget({ title, data, config }: GaugeWidgetProps) {
  const percentage = ((data.value - data.min) / (data.max - data.min)) * 100;

  // Create gauge data (semicircle)
  const gaugeData = [
    { value: percentage, color: getGaugeColor(percentage) },
    { value: 100 - percentage, color: "var(--ds-chart-grid)" }
  ];

  function getGaugeColor(percent: number) {
    if (percent >= 80) return "var(--status-success)";
    if (percent >= 60) return "var(--status-warning)";
    if (percent >= 40) return "var(--ds-chart-accent)";
    return "var(--status-danger)";
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const isCurrency = data.max > 1000;

  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/20 rounded-lg p-6 hover:border-frame-orange/40 transition-colors">
      {/* Title */}
      <div className="mb-4">
        <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">
          {title}
        </p>
      </div>

      {/* Gauge Chart */}
      <div className="relative" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              stroke="none"
            >
              {gaugeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: "35%" }}>
          <div className="text-3xl font-bold text-frame-white">
            {percentage.toFixed(0)}%
          </div>
          <div className="text-sm text-frame-gray-light mt-1">
            {isCurrency ? formatCurrency(data.value) : data.value.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 space-y-2">
        {data.target !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-frame-gray-light">Target:</span>
            <span className="text-frame-white font-semibold">
              {isCurrency ? formatCurrency(data.target) : data.target.toLocaleString("pt-BR")}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="text-frame-gray-light">Range:</span>
          <span className="text-frame-white">
            {isCurrency ? formatCurrency(data.min) : data.min} -{" "}
            {isCurrency ? formatCurrency(data.max) : data.max}
          </span>
        </div>

        {data.label && (
          <div className="pt-2 border-t border-frame-gray-3">
            <p className="text-xs text-frame-gray-light text-center">
              {data.label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
