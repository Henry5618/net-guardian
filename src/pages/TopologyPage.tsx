import { useState, useMemo } from "react";
import { useDevices } from "@/hooks/use-realtime-data";
import { cn } from "@/lib/utils";
import { Monitor, Router } from "lucide-react";

export default function TopologyPage() {
  const { devices, loading } = useDevices(5000);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const selected = devices.find((d) => d.ip === selectedIp) || null;

  const gateway = devices.find((d) => d.ip.endsWith(".1"));
  const others = devices.filter((d) => !d.ip.endsWith(".1"));

  // Arrange devices in a tree below the gateway
  const positions = useMemo(() => {
    const nodeY = 380;
    const spacing = others.length > 0 ? Math.min(120, 700 / others.length) : 0;
    const startX = 400 - ((others.length - 1) * spacing) / 2;

    return others.map((d, i) => {
      return {
        device: d,
        x: startX + i * spacing,
        y: nodeY + (i % 2 === 0 ? 0 : 40),
      };
    });
  }, [others]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Topologia de Rede</h2>
        <p className="text-xs text-muted-foreground">Mapa visual dos dispositivos conectados</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Map */}
        <div className="xl:col-span-2 rounded-lg border border-border bg-card card-shadow overflow-hidden">
          <svg viewBox="0 0 800 600" className="w-full h-auto" style={{ minHeight: 400 }}>
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220, 15%, 12%)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="600" fill="hsl(220, 15%, 7%)" />
            <rect width="800" height="600" fill="url(#grid)" />

            {/* Connection lines */}
            {positions.map(({ device, x, y }) => (
              <line
                key={`line-${device.ip}`}
                x1={400}
                y1={150}
                x2={x}
                y2={y}
                stroke={device.status === "online" ? "hsl(142, 76%, 36%)" : "hsl(220, 15%, 20%)"}
                strokeWidth={device.status === "online" ? 1.5 : 1}
                strokeDasharray={device.status === "offline" ? "4 4" : ""}
                opacity={device.status === "online" ? 0.6 : 0.3}
              />
            ))}

            {/* Gateway center node */}
            {gateway && (
              <g
                className="cursor-pointer"
                onClick={() => setSelectedIp(gateway.ip)}
              >
                <circle cx={400} cy={150} r={32} fill="hsl(210, 100%, 50%)" fillOpacity={0.15} stroke="hsl(210, 100%, 50%)" strokeWidth={2} />
                <circle cx={400} cy={150} r={24} fill="hsl(220, 15%, 10%)" stroke="hsl(210, 100%, 50%)" strokeWidth={1.5} />
                <text x={400} y={154} textAnchor="middle" fill="hsl(210, 100%, 60%)" fontSize={10} fontWeight="bold">GW</text>
                <text x={400} y={200} textAnchor="middle" fill="hsl(220, 10%, 50%)" fontSize={9}>{gateway.ip}</text>
              </g>
            )}

            {/* Device nodes */}
            {positions.map(({ device, x, y }) => {
              const isOnline = device.status === "online";
              const isSelected = selected?.ip === device.ip;
              return (
                <g key={device.ip} className="cursor-pointer" onClick={() => setSelectedIp(device.ip)}>
                  <circle
                    cx={x} cy={y} r={isSelected ? 22 : 18}
                    fill={isOnline ? "hsl(220, 15%, 10%)" : "hsl(220, 15%, 8%)"}
                    stroke={isSelected ? "hsl(210, 100%, 50%)" : isOnline ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Status dot */}
                  <circle
                    cx={x + 12} cy={y - 12} r={4}
                    fill={isOnline ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                  />
                  {/* Label */}
                  <text x={x} y={y + 3} textAnchor="middle" fill="hsl(220, 15%, 80%)" fontSize={8} fontFamily="JetBrains Mono">
                    {(device.hostname || device.mac).substring(0, 8)}
                  </text>
                  <text x={x} y={y + 34} textAnchor="middle" fill="hsl(220, 10%, 40%)" fontSize={8}>
                    {device.ip}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Details panel */}
        <div className="rounded-lg border border-border bg-card p-5 card-shadow">
          <h3 className="text-sm font-semibold text-foreground mb-4">Detalhes do Dispositivo</h3>
          {selected ? (
            <div className="space-y-3">
              {[
                { label: "Hostname/Vendor", value: selected.hostname || "Desconhecido" },
                { label: "IP", value: selected.ip },
                { label: "MAC", value: selected.mac },
                { label: "Status", value: selected.status === "online" ? "🟢 Online" : "🔴 Offline" },
                { label: "Último Visto", value: selected.lastSeen },
                { label: "Evento", value: selected.eventType },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-mono text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Clique em um dispositivo no mapa para ver os detalhes</p>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-[10px] text-muted-foreground mb-2">Legenda</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-[10px] text-foreground">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-[10px] text-foreground">Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-6 border-t border-dashed border-muted-foreground" />
                <span className="text-[10px] text-foreground">Conexão inativa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
