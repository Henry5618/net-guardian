import { useState } from "react";
import { Activity, AlertTriangle, Network, ShieldCheck } from "lucide-react";
import { SidebarNav } from "@/components/SidebarNav";
import { MetricCard } from "@/components/MetricCard";
import { TrafficChart } from "@/components/TrafficChart";
import { PacketTable } from "@/components/PacketTable";
import { AlertsPanel } from "@/components/AlertsPanel";
import { DeviceList } from "@/components/DeviceList";
import LogsPage from "@/pages/LogsPage";
import AlertsPage from "@/pages/AlertsPage";
import RulesPage from "@/pages/RulesPage";
import SettingsPage from "@/pages/SettingsPage";
import UsersPage from "@/pages/UsersPage";
import ReportPage from "@/pages/ReportPage";
import TopologyPage from "@/pages/TopologyPage";
import { useAuth } from "@/contexts/AuthContext";
import { useDevices, useTrafficData, useAlerts } from "@/hooks/use-realtime-data";
import type { TrafficPoint } from "@/lib/mock-data";

const Dashboard = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { devices } = useDevices();
  const { traffic: rawTraffic } = useTrafficData();
  const { alerts: rawAlerts } = useAlerts();

  // Convert to chart format
  const traffic: TrafficPoint[] = rawTraffic.map((t) => ({
    time: t.time,
    packets: t.packets,
    bytes: t.bytes,
    anomaly: t.anomaly,
  }));

  const currentPps = traffic.length > 0 ? traffic[traffic.length - 1].packets : 0;
  const totalPackets = rawTraffic.reduce((sum, t) => sum + t.packets, 0);
  const hasActiveThreats = rawAlerts.some(
    (a) => (a.severity === "critical" || a.severity === "high") && !a.resolved
  );
  const activeThreatsCount = rawAlerts.filter(
    (a) => (a.severity === "critical" || a.severity === "high") && !a.resolved
  ).length;

  // Convert alerts for AlertsPanel (mock format compatibility)
  const panelAlerts = rawAlerts.slice(0, 50).map((a) => ({
    id: a.id,
    type: "volume_spike" as const,
    severity: (a.severity === "critical" ? "critical" : a.severity === "high" ? "high" : a.severity === "low" ? "low" : "medium") as "critical" | "high" | "medium" | "low",
    message: a.title + (a.description ? ` — ${a.description}` : ""),
    timestamp: a.createdAt,
    pps: 0,
  }));

  const renderContent = () => {
    switch (activeTab) {
      case "logs":
        return <LogsPage />;
      case "alerts":
        return <AlertsPage />;
      case "rules":
        return hasPermission("technician") ? <RulesPage /> : <NoAccess />;
      case "settings":
        return hasPermission("technician") ? <SettingsPage /> : <NoAccess />;
      case "users":
        return hasPermission("admin") ? <UsersPage /> : <NoAccess />;
      case "report":
        return <ReportPage />;
      case "topology":
        return <TopologyPage />;
      default:
        return (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
              <p className="text-xs text-muted-foreground">
                Monitoramento de rede em tempo real — Dados do agente local
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Pacotes/s" value={currentPps} subtitle="Último registro" icon={Activity} variant="default" />
              <MetricCard title="Dispositivos" value={devices.length} subtitle={`${devices.filter(d => d.status === "online").length} online`} icon={Network} />
              <MetricCard
                title="Ameaças Ativas"
                value={activeThreatsCount}
                subtitle={hasActiveThreats ? "Atenção necessária" : "Nenhuma ameaça"}
                icon={AlertTriangle}
                variant={hasActiveThreats ? "destructive" : "success"}
              />
              <MetricCard
                title="Status"
                value={hasActiveThreats ? "ALERTA" : "NORMAL"}
                subtitle={hasActiveThreats ? "Anomalias detectadas" : "Rede estável"}
                icon={ShieldCheck}
                variant={hasActiveThreats ? "warning" : "success"}
              />
            </div>

            <div className="mb-6">
              <DeviceList />
            </div>

            <div className="mb-6">
              <TrafficChart data={traffic} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4 card-shadow">
                <h3 className="text-sm font-medium text-foreground mb-2">Tráfego Recente</h3>
                <p className="text-xs text-muted-foreground mb-3">{rawTraffic.length} registros</p>
                <div className="max-h-[340px] overflow-y-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Hora</th>
                        <th className="px-3 py-2 font-medium">Origem</th>
                        <th className="px-3 py-2 font-medium">Destino</th>
                        <th className="px-3 py-2 font-medium">Proto</th>
                        <th className="px-3 py-2 font-medium text-right">Pkts</th>
                        <th className="px-3 py-2 font-medium text-right">Bytes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawTraffic.slice(-50).reverse().map((t, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/50">
                          <td className="px-3 py-2 font-mono text-muted-foreground">{t.time}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{t.sourceIp || "—"}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{t.destIp || "—"}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-secondary-foreground">
                              {t.protocol || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{t.packets}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{t.bytes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <AlertsPanel alerts={panelAlerts} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="ml-[240px] flex-1 p-6">
        {renderContent()}
      </main>
    </div>
  );
};

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShieldCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-sm font-semibold text-foreground mb-1">Acesso Restrito</h3>
      <p className="text-xs text-muted-foreground">Você não tem permissão para acessar esta seção.</p>
    </div>
  );
}

export default Dashboard;
