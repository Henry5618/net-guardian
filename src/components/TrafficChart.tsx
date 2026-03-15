import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrafficPoint } from "@/lib/mock-data";

interface TrafficChartProps {
  data: TrafficPoint[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <div className="card-shadow rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Tráfego em Tempo Real</h3>
          <p className="text-xs text-muted-foreground">Pacotes por segundo (pps)</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Tráfego
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive" /> Anomalia
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(210, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(220, 10%, 50%)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220, 15%, 10%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(220, 15%, 90%)",
            }}
          />
          <Area
            type="monotone"
            dataKey="packets"
            stroke="hsl(210, 100%, 50%)"
            strokeWidth={2}
            fill="url(#trafficGradient)"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.anomaly) {
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(0, 84%, 60%)"
                    stroke="hsl(0, 84%, 70%)"
                    strokeWidth={2}
                  />
                );
              }
              return <circle key={`dot-${cx}-${cy}`} r={0} />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
