import { useState } from "react";
import { ScrollText, ShieldAlert, Bug, RefreshCw, LogIn, Filter, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-realtime-data";
import { supabase } from "@/integrations/supabase/client";

type LogCategory = "threat" | "error" | "update" | "login" | "all";

const categoryConfig = {
  threat: { label: "Ameaças", icon: ShieldAlert, color: "text-destructive" },
  error: { label: "Erros", icon: Bug, color: "text-warning" },
  update: { label: "Atualizações", icon: RefreshCw, color: "text-primary" },
  login: { label: "Logins", icon: LogIn, color: "text-success" },
};

const severityStyles: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  low: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  medium: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive/20 text-destructive font-semibold",
};

function mapAlertToCategory(severity: string): "threat" | "error" {
  if (severity === "critical" || severity === "high") return "threat";
  return "error";
}

export default function LogsPage() {
  const { alerts, loading, refetch, clearAlerts } = useAlerts();
  const [filter, setFilter] = useState<LogCategory>("all");
  const [selected, setSelected] = useState<string[]>([]);

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    const { error } = await supabase.from("network_alerts").delete().in("id", selected);
    if (error) {
      alert(`Erro ao excluir: ${error.message}\n\nAcesse o Supabase e desative o RLS (Row Level Security) da tabela "network_alerts".`);
    } else {
      setSelected([]);
      refetch();
    }
  };

  // Map real alerts into log entries
  const logs = alerts.map((a) => ({
    id: a.id,
    timestamp: a.createdAt,
    category: mapAlertToCategory(a.severity),
    severity: a.severity,
    source: a.protocol ? `${a.protocol}` : "Agente",
    message: a.title,
    details: [
      a.description,
      a.sourceIp ? `Origem: ${a.sourceIp}` : null,
      a.destIp ? `Destino: ${a.destIp}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
  }));

  const counts: Record<string, number> = {
    all: logs.length,
    threat: logs.filter((l) => l.category === "threat").length,
    error: logs.filter((l) => l.category === "error").length,
    update: 0,
    login: 0,
  };

  const filtered = filter === "all" ? logs : logs.filter((l) => l.category === filter);

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
          <h2 className="text-lg font-semibold text-foreground">Logs do Sistema</h2>
          <p className="text-xs text-muted-foreground">Eventos reais capturados pelo agente de rede</p>
        </div>
        <button
          onClick={clearAlerts}
          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Limpar Logs
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "threat", "error", "update", "login"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            )}
          >
            {cat === "all" ? "Todos" : categoryConfig[cat].label}
            <span className="ml-1.5 opacity-70">({counts[cat]})</span>
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={selected.length > 0 && selected.length === filtered.length}
                onChange={(e) => {
                  if (e.target.checked) setSelected(filtered.map(l => l.id));
                  else setSelected([]);
                }}
              />
              Selecionar Todos
            </label>
            <button
              onClick={handleBulkDelete}
              disabled={selected.length === 0}
              className="rounded bg-destructive/10 px-3 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
            >
              Excluir Selecionados ({selected.length})
            </button>
          </div>
        )}
        <div className="max-h-[650px] overflow-y-auto scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
              <p className="text-[10px] text-muted-foreground mt-1">Execute o agente para capturar eventos da rede</p>
            </div>
          ) : (
            filtered.map((log) => {
              const catConf = categoryConfig[log.category];
              const Icon = catConf?.icon || ScrollText;
              const color = catConf?.color || "text-muted-foreground";
              return (
                <div
                  key={log.id}
                  className={cn("flex w-full flex-col border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/30", selected.includes(log.id) && "bg-accent/20")}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer mr-1"
                      checked={selected.includes(log.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(p => [...p, log.id]);
                        else setSelected(p => p.filter(id => id !== log.id));
                      }}
                    />
                    <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                    <span className="text-[10px] font-mono text-muted-foreground w-16 flex-shrink-0">
                      {log.timestamp}
                    </span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] uppercase", severityStyles[log.severity] || severityStyles.medium)}>
                      {log.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{log.source}</span>
                    <span className="flex-1 truncate text-xs text-foreground">{log.message}</span>
                  </div>
                  {log.details && (
                    <div className="mt-2 ml-7 rounded bg-secondary/50 p-3">
                      <p className="text-[11px] text-secondary-foreground font-mono leading-relaxed">{log.details}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
