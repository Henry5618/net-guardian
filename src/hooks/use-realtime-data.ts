import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  createdAt: string;
}

export interface IpChangeEvent {
  mac: string;
  hostname: string | null;
  previousIp: string | null;
  currentIp: string;
  detectedAt: string;
}

// Fetch unique devices (latest entry per MAC)
export function useDevices(refreshInterval = 10000) {
  const [devices, setDevices] = useState<RealDevice[]>([]);
  const [ipChanges, setIpChanges] = useState<IpChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    const { data, error } = await supabase
      .from("device_history")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(500);

    if (error || !data) return;

    // Group by MAC, take latest entry
    const byMac = new Map<string, typeof data[0]>();
    for (const row of data) {
      if (!byMac.has(row.mac)) byMac.set(row.mac, row);
    }

    const now = Date.now();
    const deviceList: RealDevice[] = Array.from(byMac.values()).map((d) => {
      const age = now - new Date(d.detected_at).getTime();
      return {
        mac: d.mac,
        ip: d.ip,
        hostname: d.hostname,
        lastSeen: new Date(d.detected_at).toLocaleTimeString("pt-BR", { hour12: false }),
        status: age < 120000 ? "online" : "offline", // 2 min threshold
        eventType: d.event_type,
      };
    });

    setDevices(deviceList);

    // IP changes
    const changes = data
      .filter((d) => d.event_type === "ip_changed" && d.previous_ip)
      .slice(0, 20)
      .map((d) => ({
        mac: d.mac,
        hostname: d.hostname,
        previousIp: d.previous_ip,
        currentIp: d.ip,
        detectedAt: new Date(d.detected_at).toLocaleTimeString("pt-BR", { hour12: false }),
      }));
    setIpChanges(changes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDevices, refreshInterval]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("device_history_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "device_history" }, () => {
        fetchDevices();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDevices]);

  return { devices, ipChanges, loading };
}

// Fetch traffic data, optionally filtered by IP
export function useTrafficData(sourceIp?: string | null, refreshInterval = 5000) {
  const [traffic, setTraffic] = useState<RealTrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraffic = useCallback(async () => {
    let query = supabase
      .from("traffic_data")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (sourceIp) {
      query = query.or(`source_ip.eq.${sourceIp},dest_ip.eq.${sourceIp}`);
    }

    const { data, error } = await query;
    if (error || !data) return;

    const points: RealTrafficPoint[] = data.reverse().map((d) => {
      let timeStr = d.recorded_at;
      if (!timeStr.endsWith("Z") && !timeStr.includes("+") && timeStr.includes("T")) {
        timeStr += "Z";
      }
      return {
        time: new Date(timeStr).toLocaleTimeString("pt-BR", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      packets: d.packets,
      bytes: d.bytes,
      anomaly: d.anomaly,
      sourceIp: d.source_ip,
      destIp: d.dest_ip,
      protocol: d.protocol,
      };
    });
    setTraffic(points);
    setLoading(false);
  }, [sourceIp]);

  useEffect(() => {
    fetchTraffic();
    const interval = setInterval(fetchTraffic, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTraffic, refreshInterval]);

  useEffect(() => {
    const channel = supabase
      .channel("traffic_data_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "traffic_data" }, () => {
        fetchTraffic();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTraffic]);

  return { traffic, loading };
}

// Fetch alerts
export function useAlerts(refreshInterval = 10000) {
  const [alerts, setAlerts] = useState<RealAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const clearAlerts = async () => {
    // Delete all alerts by matching something essentially true
    const { error } = await supabase.from("network_alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      alert(`Não foi possível limpar os alertas globais: ${error.message}\nSua tabela "network_alerts" no Supabase provavelmente está com o modo RLS ativado bloqueando deletes.`);
    } else {
      await fetchAlerts();
    }
  };

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from("network_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return;

    setAlerts(
      data.map((d) => ({
        id: d.id,
        severity: d.severity,
        title: d.title,
        description: d.description,
        sourceIp: d.source_ip,
        destIp: d.dest_ip,
        protocol: d.protocol,
        resolved: d.resolved,
        createdAt: new Date(d.created_at).toLocaleTimeString("pt-BR", { hour12: false }),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAlerts, refreshInterval]);

  useEffect(() => {
    const channel = supabase
      .channel("network_alerts_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "network_alerts" }, () => {
        fetchAlerts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts, clearAlerts };
}

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
    
    if (error) {
      console.error("Error fetching reports:", error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    // Subscribe to changes on reports table
    const channel = supabase.channel("reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}
