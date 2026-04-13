import { useState, useRef } from "react";
import { FileText, Printer, Loader2, Plus, Calendar, ShieldAlert, Network, CheckCircle2, MonitorSmartphone, BarChart3, Wifi, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDevices, useAlerts, useReports, useTrafficData, Report } from "@/hooks/use-realtime-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function ReportPage() {
  const { profile } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const { devices } = useDevices(15000);
  const { alerts: logs } = useAlerts(15000);
  const { traffic } = useTrafficData(null, 15000);
  const { reports, loading, refetch } = useReports();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState("completo");
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const reportTypes = [
    { key: "completo", label: "Resumo Completo", desc: "Dispositivos, alertas, tráfego e estatísticas gerais.", icon: Network },
    { key: "dispositivos", label: "Apenas Dispositivos", desc: "Lista de hosts detectados na rede no momento.", icon: MonitorSmartphone },
    { key: "alertas", label: "Eventos de Segurança", desc: "Auditoria contendo as últimas anomalias do IDS.", icon: ShieldAlert },
    { key: "trafego", label: "Análise de Tráfego", desc: "Snapshot do tráfego de rede atual por protocolo e IP.", icon: BarChart3 },
    { key: "conectividade", label: "Conectividade", desc: "Status de conectividade de todos os dispositivos.", icon: Wifi },
  ];

  const handleGenerate = async () => {
    setGenerating(true);

    const includeDevices = ["completo", "dispositivos", "conectividade"].includes(reportType);
    const includeAlerts = ["completo", "alertas"].includes(reportType);
    const includeTraffic = ["completo", "trafego"].includes(reportType);

    const snapshotDevices = includeDevices ? devices : [];
    const snapshotAlerts = includeAlerts ? logs : [];
    const snapshotTraffic = includeTraffic ? traffic.slice(0, 50) : [];

    // Aggregate traffic by protocol
    const protocolStats: Record<string, { packets: number; bytes: number }> = {};
    for (const t of traffic) {
      const proto = t.protocol || "other";
      if (!protocolStats[proto]) protocolStats[proto] = { packets: 0, bytes: 0 };
      protocolStats[proto].packets += t.packets;
      protocolStats[proto].bytes += t.bytes;
    }

    const content = {
      type: reportType,
      devices: snapshotDevices,
      alerts: snapshotAlerts,
      traffic: snapshotTraffic,
      protocolStats,
      stats: {
        onlineDevices: devices.filter((d) => d.status === "online").length,
        totalDevices: devices.length,
        criticalAlerts: logs.filter((l) => l.severity === "critical" || l.severity === "high").length,
        pendingAlerts: logs.filter((a) => !a.resolved).length,
        resolvedAlerts: logs.filter((a) => a.resolved).length,
        totalTrafficBytes: traffic.reduce((s, t) => s + t.bytes, 0),
        totalTrafficPackets: traffic.reduce((s, t) => s + t.packets, 0),
      },
    };

    const typeNames: Record<string, string> = {
      completo: "Completo",
      dispositivos: "de Dispositivos",
      alertas: "de Segurança",
      trafego: "de Tráfego",
      conectividade: "de Conectividade",
    };

    const title = `Relatório ${typeNames[reportType]} - ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const { error } = await supabase.from("reports").insert({
      title,
      content: content as any,
      user_id: profile?.id || null,
    });

    if (!error) {
      refetch();
      setShowModal(false);
    } else {
      console.error(error);
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) {
      if (selectedReport?.id === id) setSelectedReport(null);
      refetch();
    } else {
      alert(`Erro ao excluir: ${error.message}`);
    }
    setDeleting(null);
  };

  const handlePrint = () => window.print();

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Relatórios</h2>
          <p className="text-xs text-muted-foreground">Gere e visualize relatórios históricos do sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Relatório
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; background: white; margin: 0; padding: 20px;}
          .print\\:text-black { color: #000 !important; }
          .print\\:border-gray-300 { border-color: #e5e7eb !important; border-width: 1px;}
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="rounded-lg border border-border bg-card card-shadow flex flex-col overflow-hidden max-h-[600px]">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">Histórico ({reports.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground">Nenhum relatório salvo</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-md transition-colors border",
                    selectedReport?.id === report.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-transparent border-transparent hover:bg-accent/40"
                  )}
                >
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="flex-1 flex flex-col gap-1 text-left min-w-0"
                  >
                    <span className={cn("text-xs font-semibold truncate w-full", selectedReport?.id === report.id ? "text-primary" : "text-foreground")}>
                      {report.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {new Date(report.created_at).toLocaleString("pt-BR")}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(report.id); }}
                    disabled={deleting === report.id}
                    className="shrink-0 p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir relatório"
                  >
                    {deleting === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Report Viewer */}
        <div className="md:col-span-2 rounded-lg border border-border bg-card card-shadow overflow-hidden flex flex-col">
          {selectedReport ? (
            <>
              <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
                <h3 className="text-sm font-semibold text-foreground">Visualização do Relatório</h3>
                <button onClick={handlePrint} className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-accent transition-colors">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir PDF
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin print:p-0 print:overflow-visible" id="report-content" ref={reportRef}>
                <div className="space-y-6 print:text-black print:bg-white">
                  {/* Header */}
                  <div className="rounded-lg border border-border bg-card p-6 card-shadow print:border-gray-300">
                    <h3 className="text-lg font-bold text-foreground print:text-black">{selectedReport.title}</h3>
                    <p className="text-xs text-muted-foreground print:text-gray-600">
                      Gerado em: {new Date(selectedReport.created_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground print:text-gray-600">
                      Operador: {profile?.full_name || "—"} ({profile?.role || "—"})
                    </p>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                      { label: "Dispositivos Online", value: `${selectedReport.content.stats?.onlineDevices || 0}/${selectedReport.content.stats?.totalDevices || 0}`, color: "text-success" },
                      { label: "Alertas Críticos", value: selectedReport.content.stats?.criticalAlerts || 0, color: "text-destructive" },
                      { label: "Alertas Pendentes", value: selectedReport.content.stats?.pendingAlerts || 0, color: "text-warning" },
                      { label: "Alertas Resolvidos", value: selectedReport.content.stats?.resolvedAlerts || 0, color: "text-primary" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                        <p className={`text-2xl font-bold ${card.color} print:text-black`}>{card.value}</p>
                        <p className="text-[10px] text-muted-foreground print:text-gray-600">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Traffic summary */}
                  {selectedReport.content.stats?.totalTrafficBytes > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Resumo de Tráfego</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-lg font-bold text-foreground print:text-black">{formatBytes(selectedReport.content.stats.totalTrafficBytes)}</p>
                          <p className="text-[10px] text-muted-foreground">Volume Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground print:text-black">{(selectedReport.content.stats.totalTrafficPackets || 0).toLocaleString("pt-BR")}</p>
                          <p className="text-[10px] text-muted-foreground">Pacotes Capturados</p>
                        </div>
                      </div>
                      {selectedReport.content.protocolStats && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Distribuição por Protocolo</p>
                          <div className="space-y-1">
                            {Object.entries(selectedReport.content.protocolStats as Record<string, { packets: number; bytes: number }>).map(([proto, data]) => (
                              <div key={proto} className="flex items-center justify-between text-xs border-b border-border py-1.5 last:border-0">
                                <span className="font-mono text-foreground print:text-black">{proto}</span>
                                <span className="text-muted-foreground print:text-gray-600">
                                  {data.packets.toLocaleString("pt-BR")} pkts · {formatBytes(data.bytes)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Devices table */}
                  {selectedReport.content.devices?.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Dispositivos ({selectedReport.content.devices.length})</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-2 text-left text-muted-foreground">Hostname</th>
                            <th className="py-2 text-left text-muted-foreground">IP</th>
                            <th className="py-2 text-left text-muted-foreground">MAC</th>
                            <th className="py-2 text-left text-muted-foreground">Status</th>
                            <th className="py-2 text-left text-muted-foreground">Último Visto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.content.devices.map((d: any) => (
                            <tr key={d.ip + d.mac} className="border-b border-border">
                              <td className="py-1.5 font-mono text-foreground print:text-black">{d.hostname || "Desconhecido"}</td>
                              <td className="py-1.5 font-mono text-foreground print:text-black">{d.ip}</td>
                              <td className="py-1.5 font-mono text-muted-foreground print:text-gray-600">{d.mac}</td>
                              <td className="py-1.5">
                                <span className={d.status === "online" ? "text-success" : "text-destructive"}>{d.status}</span>
                              </td>
                              <td className="py-1.5 text-muted-foreground">{d.lastSeen || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Alerts */}
                  {selectedReport.content.alerts?.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Alertas e Eventos ({selectedReport.content.alerts.length})</h4>
                      <div className="space-y-1">
                        {selectedReport.content.alerts.map((l: any, i: number) => (
                          <div key={l.id || i} className="flex gap-3 py-1.5 border-b border-border text-xs">
                            <span className="font-mono text-muted-foreground w-16 shrink-0">{l.createdAt || "—"}</span>
                            <span className={cn(
                              "font-semibold shrink-0 w-16",
                              l.severity === "critical" || l.severity === "high" ? "text-destructive" : "text-warning"
                            )}>
                              [{(l.severity || "").toUpperCase()}]
                            </span>
                            <span className="text-foreground print:text-black flex-1">{l.title}</span>
                            {l.resolved && <span className="text-success text-[10px]">✓ Resolvido</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Traffic details */}
                  {selectedReport.content.traffic?.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Detalhes de Tráfego</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-2 text-left text-muted-foreground">Hora</th>
                            <th className="py-2 text-left text-muted-foreground">Origem</th>
                            <th className="py-2 text-left text-muted-foreground">Destino</th>
                            <th className="py-2 text-left text-muted-foreground">Proto</th>
                            <th className="py-2 text-right text-muted-foreground">Pacotes</th>
                            <th className="py-2 text-right text-muted-foreground">Bytes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.content.traffic.slice(0, 30).map((t: any, i: number) => (
                            <tr key={i} className="border-b border-border">
                              <td className="py-1.5 font-mono text-muted-foreground">{t.time || "—"}</td>
                              <td className="py-1.5 font-mono text-foreground print:text-black">{t.sourceIp || "—"}</td>
                              <td className="py-1.5 font-mono text-foreground print:text-black">{t.destIp || "—"}</td>
                              <td className="py-1.5 font-mono text-muted-foreground">{t.protocol || "—"}</td>
                              <td className="py-1.5 text-right text-foreground">{t.packets}</td>
                              <td className="py-1.5 text-right text-foreground">{formatBytes(t.bytes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center opacity-70">
              <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Visualizador de Relatórios</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Selecione um relatório no painel ao lado para visualizar e imprimir, ou gere um novo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 card-shadow max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-foreground mb-4">Gerar Novo Relatório</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Capture um instantâneo (snapshot) do estado atual da rede.
            </p>
            <div className="space-y-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.key}
                  onClick={() => setReportType(rt.key)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                    reportType === rt.key ? "border-primary bg-primary/10" : "border-border bg-transparent"
                  )}
                >
                  <rt.icon className={cn("h-5 w-5 shrink-0", reportType === rt.key ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <span className="block text-xs font-semibold text-foreground">{rt.label}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{rt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={generating} onClick={() => setShowModal(false)}
                className="rounded-md bg-secondary px-4 py-2 text-xs text-secondary-foreground hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button disabled={generating} onClick={handleGenerate}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Gerar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
