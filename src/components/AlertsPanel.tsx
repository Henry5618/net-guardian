import type { AnomalyAlert } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, Scan, Zap } from "lucide-react";

interface AlertsPanelProps {
  alerts: AnomalyAlert[];
}

const typeIcons: Record<AnomalyAlert["type"], typeof AlertTriangle> = {
  threshold: Zap,
  port_scan: Scan,
  dos: ShieldAlert,
  unusual_traffic: AlertTriangle,
};

const severityColors: Record<AnomalyAlert["severity"], string> = {
  low: "text-muted-foreground bg-muted",
  medium: "text-warning bg-warning/10",
  high: "text-destructive bg-destructive/10",
  critical: "text-destructive bg-destructive/15 font-semibold",
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="card-shadow rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma anomalia detectada</p>
      </div>
    );
  }

  return (
    <div className="card-shadow rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Alertas Recentes</h3>
        <p className="text-xs text-muted-foreground">{alerts.length} anomalias detectadas</p>
      </div>
      <div className="max-h-[340px] space-y-1 overflow-y-auto scrollbar-thin p-2">
        {alerts.map((alert) => {
          const Icon = typeIcons[alert.type];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-md border border-border/50 bg-accent/30 p-3 transition-colors hover:bg-accent/60"
            >
              <div className={cn("mt-0.5 rounded p-1", severityColors[alert.severity])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{alert.message}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="font-mono">{alert.timestamp}</span>
                  <span className={cn("rounded px-1.5 py-0.5 uppercase tracking-wider", severityColors[alert.severity])}>
                    {alert.severity}
                  </span>
                  <span className="font-mono">{alert.pps} pps</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
