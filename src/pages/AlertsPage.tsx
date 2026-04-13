import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-realtime-data";
import { supabase } from "@/integrations/supabase/client";

const severityConfig: Record<string, { label: string; color: string; style: string }> = {
  critical: { label: "Crítico", color: "text-destructive", style: "bg-destructive/20 text-destructive font-semibold" },
  high: { label: "Alto", color: "text-destructive", style: "bg-destructive/10 text-destructive" },
  medium: { label: "Médio", color: "text-warning", style: "bg-warning/10 text-warning" },
  low: { label: "Baixo", color: "text-primary", style: "bg-primary/10 text-primary" },
};

export default function AlertsPage() {
  const { alerts, loading, refetch, clearAlerts } = useAlerts();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  const handleResolve = async (id: string) => {
    const { error } = await supabase.from("network_alerts").update({ resolved: true }).eq("id", id);
    if (error) {
      alert(`Erro ao resolver: ${error.message}`);
    } else {
      refetch();
    }
  };

  const handleBulkResolve = async () => {
    if (!selected.length) return;
    const { error } = await supabase.from("network_alerts").update({ resolved: true }).in("id", selected);
    if (error) {
      alert(`Erro ao resolver em massa: ${error.message}`);
    } else {
      setSelected([]);
      refetch();
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    const { error } = await supabase.from("network_alerts").delete().in("id", selected);
    if (error) {
      alert(`Erro ao excluir: ${error.message}\n\nAcesse o Supabase e desative o RLS (Row Level Security) da tabela "network_alerts" para permitir exclusões pelo painel.`);
    } else {
      setSelected([]);
      refetch();
    }
  };

  const pendingCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => (a.severity === "critical" || a.severity === "high") && !a.resolved).length;
  const resolvedCount = alerts.filter((a) => a.resolved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Alertas da Rede</h2>
          <p className="text-xs text-muted-foreground">Ameaças detectadas pelo agente de monitoramento</p>
        </div>
        <button
          onClick={clearAlerts}
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Limpar Alertas
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {(["all", "pending", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : "Resolvidos"}
          </button>
        ))}
      </div>

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
              <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
              <p className="text-[10px] text-muted-foreground">Críticos/Altos</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
              <p className="text-[10px] text-muted-foreground">Resolvidos</p>
            </div>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-border bg-card">
          <CheckCircle2 className="h-10 w-10 text-success/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum alerta registrado</p>
          <p className="text-[10px] text-muted-foreground mt-1">Execute o agente para detectar ameaças</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={selected.length > 0 && selected.length === alerts.filter(a => filter === "all" || (filter === "resolved" ? a.resolved : !a.resolved)).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(alerts.filter(a => filter === "all" || (filter === "resolved" ? a.resolved : !a.resolved)).map(a => a.id));
                    } else {
                      setSelected([]);
                    }
                  }}
                />
                Selecionar Todos
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkResolve}
                  disabled={selected.length === 0}
                  className="rounded bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
                >
                  Marcar Resolvidos
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selected.length === 0}
                  className="rounded bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                >
                  Excluir Selecionados
                </button>
              </div>
            </div>
          )}
          {alerts
            .filter(a => filter === "all" || (filter === "resolved" ? a.resolved : !a.resolved))
            .map((alert) => {
            const sConf = severityConfig[alert.severity] || severityConfig.medium;
            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border bg-card p-4 card-shadow transition-opacity",
                  alert.resolved ? "border-border opacity-60" : "border-border",
                  selected.includes(alert.id) && "ring-1 ring-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer"
                      checked={selected.includes(alert.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(p => [...p, alert.id]);
                        else setSelected(p => p.filter(id => id !== alert.id));
                      }}
                    />
                  </div>
                  <AlertTriangle className={cn("h-5 w-5 mt-0.5 flex-shrink-0", sConf.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{alert.title}</h4>
                      <span className={cn("rounded px-1.5 py-0.5 text-[9px] uppercase font-medium", sConf.style)}>
                        {sConf.label}
                      </span>
                      {alert.resolved && (
                        <span className="rounded px-1.5 py-0.5 text-[9px] uppercase font-medium bg-success/10 text-success">
                          <CheckCircle2 className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                          Resolvido
                        </span>
                      )}
                    </div>
                    {alert.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                      {alert.sourceIp && <span>Origem: <span className="font-mono text-foreground">{alert.sourceIp}</span></span>}
                      {alert.destIp && <span>Destino: <span className="font-mono text-foreground">{alert.destIp}</span></span>}
                      {alert.protocol && <span>Protocolo: <span className="font-mono text-foreground">{alert.protocol}</span></span>}
                    </div>
                    {!alert.resolved && (
                      <div className="mt-2">
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="rounded-md bg-success/10 px-3 py-1 text-[10px] font-medium text-success hover:bg-success/20 transition-colors"
                        >
                          Marcar Resolvido
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{alert.createdAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
