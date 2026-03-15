import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Clock, Wrench, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSystemAlerts, type SystemAlert } from "@/lib/mock-data";

const typeConfig: Record<SystemAlert["type"], { label: string; icon: typeof AlertTriangle; color: string }> = {
  check: { label: "Verificação", icon: AlertTriangle, color: "text-warning" },
  error: { label: "Erro", icon: XCircle, color: "text-destructive" },
  maintenance: { label: "Manutenção", icon: Wrench, color: "text-primary" },
};

const statusConfig: Record<SystemAlert["status"], { label: string; icon: typeof Clock; style: string }> = {
  pending: { label: "Pendente", icon: Clock, style: "bg-warning/10 text-warning" },
  in_progress: { label: "Em Andamento", icon: Wrench, style: "bg-primary/10 text-primary" },
  resolved: { label: "Resolvido", icon: CheckCircle2, style: "bg-success/10 text-success" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<SystemAlert[]>(() => generateSystemAlerts());

  const handleResolve = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "resolved" as const } : a));
  };

  const pendingCount = alerts.filter((a) => a.status === "pending").length;
  const errorCount = alerts.filter((a) => a.type === "error" && a.status !== "resolved").length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Alertas do Sistema</h2>
        <p className="text-xs text-muted-foreground">Verificações necessárias, erros e manutenções</p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{errorCount}</p>
              <p className="text-[10px] text-muted-foreground">Erros Ativos</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {alerts.filter((a) => a.status === "resolved").length}
              </p>
              <p className="text-[10px] text-muted-foreground">Resolvidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const tConf = typeConfig[alert.type];
          const sConf = statusConfig[alert.status];
          const TypeIcon = tConf.icon;
          const StatusIcon = sConf.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border bg-card p-4 card-shadow transition-opacity",
                alert.status === "resolved" ? "border-border opacity-60" : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <TypeIcon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", tConf.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] uppercase font-medium", sConf.style)}>
                      <StatusIcon className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                      {sConf.label}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-secondary-foreground">
                      {tConf.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-primary">
                      💡 {alert.recommendation}
                    </p>
                    {alert.status === "pending" && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="rounded-md bg-success/10 px-3 py-1 text-[10px] font-medium text-success hover:bg-success/20 transition-colors"
                      >
                        Marcar Resolvido
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{alert.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
