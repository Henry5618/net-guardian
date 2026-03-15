import { useState, useEffect } from "react";
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
import {
  generatePacket,
  generateTrafficSeries,
  generateAlert,
  type PacketLog,
  type TrafficPoint,
  type AnomalyAlert,
} from "@/lib/mock-data";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [packets, setPackets] = useState<PacketLog[]>([]);
  const [traffic, setTraffic] = useState<TrafficPoint[]>(() => generateTrafficSeries(30));
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [totalPackets, setTotalPackets] = useState(0);
  const [currentPps, setCurrentPps] = useState(0);

  useEffect(() => {
    const packetInterval = setInterval(() => {
      const batch = Array.from({ length: 3 }, () => generatePacket());
      setPackets((prev) => [...batch, ...prev].slice(0, 200));
      setTotalPackets((prev) => prev + batch.length);
    }, 800);

    const trafficInterval = setInterval(() => {
      setTraffic((prev) => {
        const last = prev[prev.length - 1];
        const base = last ? last.packets : 250;
        const spike = Math.random() < 0.06 ? Math.random() * 800 : 0;
        const packets = Math.floor(base + (Math.random() - 0.5) * 60 + spike);
        const anomaly = spike > 400;
        const now = new Date();
        const point: TrafficPoint = {
          time: now.toLocaleTimeString("pt-BR", { hour12: false, minute: "2-digit", second: "2-digit" }),
          packets: Math.max(0, packets),
          bytes: packets * (200 + Math.floor(Math.random() * 600)),
          anomaly,
        };
        setCurrentPps(point.packets);
        if (anomaly) {
          setAlerts((prev) => [generateAlert(), ...prev].slice(0, 50));
        }
        return [...prev.slice(1), point];
      });
    }, 2000);

    return () => {
      clearInterval(packetInterval);
      clearInterval(trafficInterval);
    };
  }, []);

  const hasActiveThreats = alerts.some(
    (a) => a.severity === "critical" || a.severity === "high"
  );

  const renderContent = () => {
    switch (activeTab) {
      case "logs":
        return <LogsPage />;
      case "alerts":
        return <AlertsPage />;
      case "rules":
        return <RulesPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
              <p className="text-xs text-muted-foreground">
                Monitoramento de rede em tempo real — Interface eth0
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Pacotes/s" value={currentPps} subtitle="Taxa atual" icon={Activity} variant="default" />
              <MetricCard title="Total Capturado" value={totalPackets.toLocaleString()} subtitle="Desde o início" icon={Network} />
              <MetricCard
                title="Ameaças Ativas"
                value={alerts.filter((a) => a.severity === "critical" || a.severity === "high").length}
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

            {/* Device discovery */}
            <div className="mb-6">
              <DeviceList />
            </div>

            <div className="mb-6">
              <TrafficChart data={traffic} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PacketTable packets={packets} />
              <AlertsPanel alerts={alerts} />
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

export default Dashboard;
