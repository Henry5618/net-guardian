import { useState, useRef } from "react";
import { FileText, Printer, Loader2, Plus, Calendar, ShieldAlert, Network, Clock, CheckCircle2, MonitorSmartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDevices, useAlerts, useReports, Report } from "@/hooks/use-realtime-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function ReportPage() {
  const { profile } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  const { devices } = useDevices(15000);
  const { alerts: logs } = useAlerts(15000);
  const { reports, loading, refetch } = useReports();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState("completo");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    
    // Create snapshot from current realtime data based on type
    const snapshotDevices = reportType === "alertas" ? [] : devices;
    const snapshotAlerts = reportType === "dispositivos" ? [] : logs;
    
    const content = {
      type: reportType,
      devices: snapshotDevices,
      alerts: snapshotAlerts,
      stats: {
        onlineDevices: devices.filter((d) => d.status === "online").length,
        totalDevices: devices.length,
        criticalAlerts: logs.filter((l) => l.severity === "critical" || l.severity === "high").length,
        pendingAlerts: logs.filter((a) => !a.resolved).length,
      }
    };

    const typeNames: Record<string, string> = {
      completo: "Completo",
      dispositivos: "de Dispositivos",
      alertas: "de Segurança"
    };

    const title = `Relatório ${typeNames[reportType]} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const { error } = await supabase.from("reports").insert({
      title,
      content: content as any,
      user_id: profile?.id || null
    });

    if (!error) {
      refetch();
      setShowModal(false);
    } else {
      console.error(error);
    }
    
    setGenerating(false);
  };

  const handlePrint = () => {
    window.print();
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

      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #report-content, #report-content * { visibility: visible; }
            #report-content { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; background: white; margin: 0; padding: 20px;}
            .print\\:text-black { color: #000 !important; }
            .print\\:border-gray-300 { border-color: #e5e7eb !important; border-width: 1px;}
          }
        `}
      </style>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Sidebar: List of Reports */}
        <div className="rounded-lg border border-border bg-card card-shadow flex flex-col overflow-hidden max-h-[600px]">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold text-foreground">Histórico</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground">Nenhum relatório salvo</p>
              </div>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={cn(
                    "w-full flex flex-col gap-1 p-3 rounded-md text-left transition-colors border",
                    selectedReport?.id === report.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-transparent border-transparent hover:bg-accent/40"
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold truncate w-full",
                    selectedReport?.id === report.id ? "text-primary" : "text-foreground"
                  )}>
                    {report.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.created_at).toLocaleString("pt-BR")}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Area: Report Viewer */}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground print:text-black">{selectedReport.title}</h3>
                        <p className="text-xs text-muted-foreground print:text-gray-600">
                          Gerado em: {new Date(selectedReport.created_at).toLocaleString("pt-BR")}
                        </p>
                        <p className="text-xs text-muted-foreground print:text-gray-600">
                          Operador: {profile?.full_name || "—"} ({profile?.role || "—"})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                      <p className="text-2xl font-bold text-success print:text-black">{selectedReport.content.stats?.onlineDevices || 0}/{selectedReport.content.stats?.totalDevices || 0}</p>
                      <p className="text-[10px] text-muted-foreground print:text-gray-600">Dispositivos Online</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                      <p className="text-2xl font-bold text-destructive print:text-black">{selectedReport.content.stats?.criticalAlerts || 0}</p>
                      <p className="text-[10px] text-muted-foreground print:text-gray-600">Logs Críticos</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                      <p className="text-2xl font-bold text-warning print:text-black">{selectedReport.content.stats?.pendingAlerts || 0}</p>
                      <p className="text-[10px] text-muted-foreground print:text-gray-600">Alertas Pendentes</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4 card-shadow print:border-gray-300">
                      <p className="text-2xl font-bold text-primary print:text-black">0</p>
                      <p className="text-[10px] text-muted-foreground print:text-gray-600">Regras Ativas</p>
                    </div>
                  </div>

                  {selectedReport.content.devices && selectedReport.content.devices.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Snapshot: Dispositivos</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-2 text-left text-muted-foreground">Hostname</th>
                            <th className="py-2 text-left text-muted-foreground">IP</th>
                            <th className="py-2 text-left text-muted-foreground">MAC</th>
                            <th className="py-2 text-left text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.content.devices.map((d: any) => (
                            <tr key={d.ip} className="border-b border-border">
                              <td className="py-1.5 font-mono text-foreground print:text-black">{d.hostname || "Desconhecido"}</td>
                              <td className="py-1.5 font-mono text-foreground print:text-black">{d.ip}</td>
                              <td className="py-1.5 font-mono text-muted-foreground print:text-gray-600">{d.mac}</td>
                              <td className="py-1.5">
                                <span className={d.status === "online" ? "text-success" : "text-destructive"}>{d.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedReport.content.alerts && selectedReport.content.alerts.length > 0 && (
                    <div className="rounded-lg border border-border bg-card p-5 card-shadow print:border-gray-300">
                      <h4 className="text-sm font-semibold text-foreground mb-3 print:text-black">Snapshot: Alertas e Eventos</h4>
                      <div className="space-y-1">
                        {selectedReport.content.alerts.slice(0, 15).map((l: any) => (
                          <div key={l.id} className="flex gap-3 py-1.5 border-b border-border text-xs">
                            <span className="font-mono text-muted-foreground w-16">{l.createdAt}</span>
                            <span className={l.severity === "critical" ? "text-destructive font-semibold" : l.severity === "high" ? "text-destructive" : "text-warning"}>
                              [{l.severity.toUpperCase()}]
                            </span>
                            <span className="text-foreground print:text-black">{l.title}</span>
                          </div>
                        ))}
                      </div>
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
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 card-shadow">
            <h3 className="text-sm font-semibold text-foreground mb-4">Gerar Novo Relatório</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Capture um instantâneo (snapshot) do estado atual da rede e armazene no banco para auditorias futuras.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Tipo do Relatório</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  <button onClick={() => setReportType("completo")} className={cn("flex items-center gap-3 p-3 rounded-md border text-left transition-colors", reportType === "completo" ? "border-primary bg-primary/10" : "border-border bg-transparent")}>
                    <Network className={cn("h-5 w-5", reportType === "completo" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Resumo Completo</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Dispositivos, alertas e estatísticas gerais.</span>
                    </div>
                  </button>
                  <button onClick={() => setReportType("dispositivos")} className={cn("flex items-center gap-3 p-3 rounded-md border text-left transition-colors", reportType === "dispositivos" ? "border-primary bg-primary/10" : "border-border bg-transparent")}>
                    <MonitorSmartphone className={cn("h-5 w-5", reportType === "dispositivos" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Apenas Dispositivos</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Lista de hosts detectados na rede no momento.</span>
                    </div>
                  </button>
                  <button onClick={() => setReportType("alertas")} className={cn("flex items-center gap-3 p-3 rounded-md border text-left transition-colors", reportType === "alertas" ? "border-primary bg-primary/10" : "border-border bg-transparent")}>
                    <ShieldAlert className={cn("h-5 w-5", reportType === "alertas" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <span className="block text-xs font-semibold text-foreground">Eventos de Segurança</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Auditoria contendo as últimas anomalias do IDS.</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={generating} onClick={() => setShowModal(false)}
                className="rounded-md bg-secondary px-4 py-2 text-xs text-secondary-foreground hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button disabled={generating} onClick={handleGenerate}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <CheckCircle2 className="h-3.5 w-3.5"/>}
                Confirmar Captura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
