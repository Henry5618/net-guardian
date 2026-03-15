import { useState, useRef } from "react";
import { FileText, Download, Printer, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getNetworkDevices, generateTrafficSeries, generateLogs, generateSystemAlerts, getFirewallRules } from "@/lib/mock-data";

export default function ReportPage() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const devices = getNetworkDevices();
  const traffic = generateTrafficSeries(30);
  const logs = generateLogs(20);
  const alerts = generateSystemAlerts();
  const rules = getFirewallRules();

  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const criticalLogs = logs.filter((l) => l.severity === "critical" || l.severity === "error").length;
  const pendingAlerts = alerts.filter((a) => a.status === "pending").length;
  const activeRules = rules.filter((r) => r.enabled).length;
  const now = new Date();

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatório de Rede</h2>
          <p className="text-xs text-muted-foreground">Gere um relatório completo do estado da rede</p>
        </div>
        <div className="flex gap-2">
          {!generated ? (
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {generating ? "Gerando..." : "Gerar Relatório"}
            </button>
          ) : (
            <button onClick={handlePrint}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Salvar PDF
            </button>
          )}
        </div>
      </div>

      {!generated ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum relatório gerado</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            Clique em "Gerar Relatório" para criar um resumo completo com dispositivos, tráfego, alertas, logs e regras de firewall.
          </p>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6 print:text-black print:bg-white" id="report-content">
          {/* Header */}
          <div className="rounded-lg border border-border bg-card p-6 card-shadow print:border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground print:text-black">NetGuard IDS — Relatório de Rede</h3>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  Gerado em: {now.toLocaleDateString("pt-BR")} às {now.toLocaleTimeString("pt-BR", { hour12: false })}
                </p>
                <p className="text-xs text-muted-foreground print:text-gray-600">
                  Operador: {profile?.full_name || "—"} ({profile?.role || "—"})
                </p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Dispositivos Online", value: `${onlineDevices}/${devices.length}`, color: "text-success" },
              { label: "Logs Críticos", value: criticalLogs, color: "text-destructive" },
              { label: "Alertas Pendentes", value: pendingAlerts, color: "text-warning" },
              { label: "Regras Ativas", value: activeRules, color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                <p className={`text-2xl font-bold ${s.color} print:text-black`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground print:text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Devices */}
          <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
            <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Dispositivos na Rede</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-muted-foreground">Hostname</th>
                  <th className="py-2 text-left text-muted-foreground">IP</th>
                  <th className="py-2 text-left text-muted-foreground">MAC</th>
                  <th className="py-2 text-left text-muted-foreground">Status</th>
                  <th className="py-2 text-left text-muted-foreground">Portas</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.ip} className="border-b border-border">
                    <td className="py-1.5 font-mono text-foreground print:text-black">{d.hostname}</td>
                    <td className="py-1.5 font-mono text-foreground print:text-black">{d.ip}</td>
                    <td className="py-1.5 font-mono text-muted-foreground print:text-gray-600">{d.mac}</td>
                    <td className="py-1.5">
                      <span className={d.status === "online" ? "text-success" : "text-destructive"}>{d.status}</span>
                    </td>
                    <td className="py-1.5 font-mono text-muted-foreground print:text-gray-600">{d.openPorts.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent logs */}
          <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
            <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Últimos Logs Relevantes</h4>
            <div className="space-y-1">
              {logs.filter((l) => l.severity !== "info").slice(0, 10).map((l) => (
                <div key={l.id} className="flex gap-3 py-1.5 border-b border-border text-xs">
                  <span className="font-mono text-muted-foreground w-16">{l.timestamp}</span>
                  <span className={l.severity === "critical" ? "text-destructive font-semibold" : l.severity === "error" ? "text-destructive" : "text-warning"}>
                    [{l.severity.toUpperCase()}]
                  </span>
                  <span className="text-foreground print:text-black">{l.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Firewall rules */}
          <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
            <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Regras de Firewall Ativas</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-muted-foreground">Regra</th>
                  <th className="py-2 text-left text-muted-foreground">Ação</th>
                  <th className="py-2 text-left text-muted-foreground">Protocolo</th>
                  <th className="py-2 text-left text-muted-foreground">Porta</th>
                  <th className="py-2 text-left text-muted-foreground">Hits</th>
                </tr>
              </thead>
              <tbody>
                {rules.filter((r) => r.enabled).map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="py-1.5 text-foreground print:text-black">{r.name}</td>
                    <td className={r.action === "allow" ? "py-1.5 text-success" : "py-1.5 text-destructive"}>
                      {r.action === "allow" ? "PERMITIR" : "BLOQUEAR"}
                    </td>
                    <td className="py-1.5 font-mono text-muted-foreground">{r.protocol}</td>
                    <td className="py-1.5 font-mono text-foreground print:text-black">{r.port}</td>
                    <td className="py-1.5 font-mono text-muted-foreground">{r.hits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
