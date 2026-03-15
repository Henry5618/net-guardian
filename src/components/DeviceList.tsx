import { useState, useEffect, useRef } from "react";
import { Monitor, Wifi, WifiOff, HardDrive, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNetworkDevices, generateDeviceTraffic, type NetworkDevice, type TrafficPoint } from "@/lib/mock-data";
import { TrafficChart } from "./TrafficChart";

interface IpChangeEvent {
  mac: string;
  hostname: string;
  oldIp: string;
  newIp: string;
  timestamp: string;
}

export function DeviceList() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [deviceTraffic, setDeviceTraffic] = useState<TrafficPoint[]>([]);
  const [ipChanges, setIpChanges] = useState<IpChangeEvent[]>([]);
  const prevDevicesRef = useRef<NetworkDevice[]>([]);

  useEffect(() => {
    const initial = getNetworkDevices();
    setDevices(initial);
    prevDevicesRef.current = initial;

    const interval = setInterval(() => {
      const newDevices = getNetworkDevices();
      const prev = prevDevicesRef.current;

      // Detect IP changes by MAC address
      for (const nd of newDevices) {
        const old = prev.find((d) => d.mac === nd.mac);
        if (old && old.ip !== nd.ip) {
          setIpChanges((c) => [{
            mac: nd.mac,
            hostname: nd.hostname,
            oldIp: old.ip,
            newIp: nd.ip,
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
          }, ...c].slice(0, 20));
        }
        // Detect device going offline
        if (old && old.status === "online" && nd.status === "offline") {
          setIpChanges((c) => [{
            mac: nd.mac,
            hostname: nd.hostname,
            oldIp: nd.ip,
            newIp: "OFFLINE",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
          }, ...c].slice(0, 20));
        }
      }

      prevDevicesRef.current = newDevices;
      setDevices(newDevices);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedIp) return;
    setDeviceTraffic(generateDeviceTraffic(30));
    const interval = setInterval(() => {
      setDeviceTraffic((prev) => {
        const now = new Date();
        const base = prev.length > 0 ? prev[prev.length - 1].packets : 50;
        const spike = Math.random() < 0.05 ? Math.random() * 300 : 0;
        const packets = Math.max(0, Math.floor(base + (Math.random() - 0.5) * 30 + spike));
        return [
          ...prev.slice(1),
          {
            time: now.toLocaleTimeString("pt-BR", { hour12: false, minute: "2-digit", second: "2-digit" }),
            packets,
            bytes: packets * (200 + Math.floor(Math.random() * 600)),
            anomaly: spike > 200,
          },
        ];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedIp]);

  const selectedDevice = devices.find((d) => d.ip === selectedIp);
  const onlineCount = devices.filter((d) => d.status === "online").length;

  const formatBytes = (b: number) => {
    if (b > 1000000) return `${(b / 1000000).toFixed(1)} MB`;
    if (b > 1000) return `${(b / 1000).toFixed(1)} KB`;
    return `${b} B`;
  };

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
                <span className="font-mono text-muted-foreground w-16">{change.timestamp}</span>
                <span className="text-foreground font-medium">{change.hostname}</span>
                <span className="text-muted-foreground">({change.mac})</span>
                <span className="font-mono text-destructive">{change.oldIp}</span>
                <span className="text-muted-foreground">→</span>
                <span className={cn("font-mono", change.newIp === "OFFLINE" ? "text-destructive font-semibold" : "text-success")}>
                  {change.newIp}
                </span>
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
        <div className="space-y-1 max-h-[600px] overflow-y-auto scrollbar-thin">
          {devices.map((device) => (
            <button
              key={device.ip}
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
                  <p className="text-xs font-medium text-foreground truncate">{device.hostname}</p>
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">{device.ip}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Device detail + traffic */}
      <div className="lg:col-span-2 space-y-4">
        {selectedDevice ? (
          <>
            {/* Device info card */}
            <div className="rounded-lg border border-border bg-card p-5 card-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg",
                  selectedDevice.status === "online" ? "bg-success/10" : "bg-muted"
                )}>
                  <Monitor className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selectedDevice.hostname}</h3>
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

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Fabricante</p>
                  <p className="text-sm font-medium text-foreground">{selectedDevice.vendor}</p>
                </div>
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Último Visto</p>
                  <p className="text-sm font-mono font-medium text-foreground">{selectedDevice.lastSeen}</p>
                </div>
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Enviado</p>
                  <p className="text-sm font-medium text-foreground">{formatBytes(selectedDevice.traffic.sent)}</p>
                </div>
                <div className="rounded-md bg-accent/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Recebido</p>
                  <p className="text-sm font-medium text-foreground">{formatBytes(selectedDevice.traffic.received)}</p>
                </div>
              </div>

              {selectedDevice.openPorts.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground mb-2">Portas Abertas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDevice.openPorts.map((port) => (
                      <span key={port} className="rounded bg-secondary px-2 py-0.5 text-[10px] font-mono text-secondary-foreground">
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Per-device traffic chart */}
            <TrafficChart data={deviceTraffic} title={`Tráfego — ${selectedDevice.hostname}`} />
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
