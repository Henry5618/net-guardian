import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSimulator } from "@/lib/simulation";

export interface RealDevice {
  mac: string;
  ip: string;
  hostname: string | null;
  lastSeen: string;
  status: "online" | "offline";
  eventType: string;
}

export interface RealTrafficPoint {
  time: string;
  packets: number;
  bytes: number;
  anomaly: boolean;
  sourceIp: string | null;
  destIp: string | null;
  protocol: string | null;
}

export interface RealAlert {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  sourceIp: string | null;
  destIp: string | null;
  protocol: string | null;
  resolved: boolean;
  resolution: string | null;
  createdAt: string;
}

export interface IpChangeEvent {
  mac: string;
  hostname: string | null;
  previousIp: string | null;
  currentIp: string;
  detectedAt: string;
}

const fmtTime = (d: Date) => d.toLocaleTimeString("pt-BR", { hour12: false });

function useSim() {
  const sim = getSimulator();
  const subscribe = useCallback((cb: () => void) => sim.subscribe(cb), [sim]);
  const tick = useSyncExternalStore(subscribe, () => sim.devices.length + sim.traffic.length + sim.alerts.length);
  return { sim, tick };
}

export function useDevices(_refreshInterval = 10000) {
  const { sim } = useSim();
  // re-render on changes
  useSyncExternalStore(
    useCallback((cb) => sim.subscribe(cb), [sim]),
    () => sim.devices.map((d) => d.lastSeen.getTime()).join(",")
  );

  const now = Date.now();
  const devices: RealDevice[] = sim.devices.map((d) => ({
    mac: d.mac,
    ip: d.ip,
    hostname: d.hostname,
    lastSeen: fmtTime(d.lastSeen),
    status: d.status === "offline" || now - d.lastSeen.getTime() > 180000 ? "offline" : "online",
    eventType: d.eventType,
  }));

  const ipChanges: IpChangeEvent[] = sim.ipChanges.map((c) => ({
    mac: c.mac,
    hostname: c.hostname,
    previousIp: c.previousIp,
    currentIp: c.currentIp,
    detectedAt: fmtTime(c.detectedAt),
  }));

  return { devices, ipChanges, loading: false };
}

export function useTrafficData(deviceIp?: string | null, _refreshInterval = 5000) {
  const { sim } = useSim();
  useSyncExternalStore(
    useCallback((cb) => sim.subscribe(cb), [sim]),
    () => sim.traffic.length
  );

  const filtered = deviceIp
    ? sim.traffic.filter((t) => t.sourceIp === deviceIp || t.destIp === deviceIp)
    : sim.traffic;

  const traffic: RealTrafficPoint[] = filtered.slice(-100).map((t) => ({
    time: fmtTime(t.recordedAt),
    packets: t.packets,
    bytes: t.bytes,
    anomaly: t.anomaly,
    sourceIp: t.sourceIp,
    destIp: t.destIp,
    protocol: t.protocol,
  }));

  return { traffic, loading: false };
}

export function useAlerts(_refreshInterval = 10000) {
  const { sim } = useSim();
  useSyncExternalStore(
    useCallback((cb) => sim.subscribe(cb), [sim]),
    () => sim.alerts.map((a) => a.id + a.resolved).join(",")
  );

  const alerts: RealAlert[] = sim.alerts
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((a) => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      description: a.description,
      sourceIp: a.sourceIp,
      destIp: a.destIp,
      protocol: a.protocol,
      resolved: a.resolved,
      resolution: a.resolution,
      createdAt: fmtTime(a.createdAt),
    }));

  return {
    alerts,
    loading: false,
    refetch: () => {},
    clearAlerts: async () => { sim.clearAlerts(); },
  };
}

// Helpers exportados para páginas que precisam mutar (Alertas/Logs)
export const simActions = {
  resolveAlert: (id: string, resolution: string | null) => getSimulator().resolveAlert(id, resolution),
  bulkResolve: (ids: string[]) => getSimulator().bulkResolve(ids),
  bulkDelete: (ids: string[]) => getSimulator().bulkDelete(ids),
};

// ---------- Reports — continua persistindo no backend ----------
export interface Report {
  id: string;
  title: string;
  created_at: string;
  content: any;
  user_id: string | null;
}

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching reports:", error);
    else setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel("reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}
