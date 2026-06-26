import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface BarDatum {
  name: string;
  value: number;
}

interface BarChartCardProps {
  title: string;
  data: BarDatum[];
  color?: string;
  /** Format values as money (£) in tooltips/axis. */
  money?: boolean;
  /** Message shown when there is no data. */
  emptyMessage?: string;
}

/**
 * A single bar chart inside a card. Bar charts only (no pie/line).
 * Uses Recharts' ResponsiveContainer so it fits the mobile width.
 */
export default function BarChartCard({
  title,
  data,
  color = "#4f46e5",
  money = false,
  emptyMessage = "No data yet.",
}: BarChartCardProps) {
  const fmt = (v: number) => (money ? `£${v.toFixed(2)}` : String(v));

  return (
    <div className="card">
      <h3>{title}</h3>
      {data.length === 0 ? (
        <p className="chart-empty">{emptyMessage}</p>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#5b6478" }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: "#e6e9f0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#5b6478" }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => (money ? `£${v}` : String(v))}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), title]}
                contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #e6e9f0" }}
              />
              <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
