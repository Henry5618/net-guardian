import { useState } from "react";
import { Monitor, Wifi, WifiOff, HardDrive, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrafficChart } from "./TrafficChart";
import { useDevices, useTrafficData } from "@/hooks/use-realtime-data";
import type { TrafficPoint } from "@/lib/mock-data";

export function DeviceList() {
  const { devices, ipChanges, loading } = useDevices();
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const { traffic: deviceTraffic, loading: trafficLoading } = useTrafficData(selectedIp);

  const selectedDevice = devices.find((d) => d.ip === selectedIp);
  const onlineCount = devices.filter((d) => d.status === "online").length;

  // Convert to TrafficChart format
  const chartData: TrafficPoint[] = deviceTraffic.map((t) => ({
    time: t.time,
    packets: t.packets,
    bytes: t.bytes,
    anomaly: t.anomaly,
  }));

  const formatBytes = (b: number) => {
    if (b > 1000000) return `${(b / 1000000).toFixed(1)} MB`;
    if (b > 1000) return `${(b / 1000).toFixed(1)} KB`;
    return `${b} B`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando dispositivos...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* IP Change Alerts */}
      {ipChanges.length > 0 && (
        <div className="lg:col-span-3 rounded-lg border border-warning/30 bg-warning/5 p-4 card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h4 className="text-xs font-semibold text-warning">Alterações de IP Detectadas</h4>
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
            {ipChanges.map((change, i) => (
              <div key={`${change.mac}-${i}`} className="flex items-center gap-3 text-[10px] py-1 border-b border-border last:border-0">
                <span className="font-mono text-muted-foreground w-16">{change.detectedAt}</span>
                <span className="text-foreground font-medium">{change.hostname || change.mac}</span>
                <span className="text-muted-foreground">({change.mac})</span>
                <span className="font-mono text-destructive">{change.previousIp || "—"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono text-success">{change.currentIp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device list */}
      <div className="lg:col-span-1 rounded-lg border border-border bg-card p-4 card-shadow">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Dispositivos na Rede</h3>
          <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">
            {onlineCount} online
          </span>
        </div>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <HardDrive className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum dispositivo detectado</p>
            <p className="text-[10px] text-muted-foreground mt-1">Execute o agente para descobrir dispositivos</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin">
            {devices.map((device) => (
              <button
                key={device.mac}
                onClick={() => setSelectedIp(device.ip)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  selectedIp === device.ip
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-accent border border-transparent"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  device.status === "online" ? "bg-success/10" : "bg-muted"
                )}>
                  {device.status === "online" ? (
                    <Wifi className="h-4 w-4 text-success" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground truncate">{device.hostname || device.mac}</p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">{device.ip}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Device detail + traffic */}
      <div className="lg:col-span-2 space-y-4">
        {selectedDevice ? (
          <>
            <div className="rounded-lg border border-border bg-card p-5 card-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg",
                  selectedDevice.status === "online" ? "bg-success/10" : "bg-muted"
                )}>
                  <Monitor className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selectedDevice.hostname || selectedDevice.mac}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{selectedDevice.ip} • {selectedDevice.mac}</p>
                </div>
                <span className={cn(
                  "ml-auto rounded-full px-3 py-1 text-[10px] font-semibold uppercase",
                  selectedDevice.status === "online"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                )}>
                  {selectedDevice.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Último Visto</p>
                  <p className="text-sm font-mono font-medium text-foreground">{selectedDevice.lastSeen}</p>
                </div>
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">MAC</p>
                  <p className="text-sm font-mono font-medium text-foreground">{selectedDevice.mac}</p>
                </div>
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Evento</p>
                  <p className="text-sm font-medium text-foreground">{selectedDevice.eventType}</p>
                </div>
              </div>
            </div>

            {trafficLoading ? (
              <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length > 0 ? (
              <TrafficChart data={chartData} title={`Tráfego — ${selectedDevice.hostname || selectedDevice.ip}`} />
            ) : (
              <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-card card-shadow">
                <p className="text-xs text-muted-foreground">Sem dados de tráfego para este dispositivo</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-border bg-card p-12 card-shadow">
            <div className="text-center">
              <HardDrive className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Selecione um dispositivo para ver o tráfego</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
