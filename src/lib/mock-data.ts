// Simulated network monitoring data

const protocols = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS", "SSH", "FTP"];
const ips = [
  "192.168.1.1", "192.168.1.5", "192.168.1.10", "192.168.1.25",
  "10.0.0.1", "10.0.0.50", "10.0.0.100",
  "172.16.0.1", "172.16.0.22", "172.16.0.55",
  "8.8.8.8", "1.1.1.1", "203.0.113.50", "198.51.100.10",
];

export interface PacketLog {
  id: string;
  timestamp: string;
  src: string;
  dst: string;
  protocol: string;
  port: number;
  size: number;
  flagged: boolean;
}

export interface TrafficPoint {
  time: string;
  packets: number;
  bytes: number;
  anomaly: boolean;
}

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  type: "threshold" | "port_scan" | "dos" | "unusual_traffic";
  severity: "low" | "medium" | "high" | "critical";
  sourceIp: string;
  message: string;
  pps: number;
}

const randomPort = () => [22, 53, 80, 443, 3306, 5432, 8080, 8443][Math.floor(Math.random() * 8)];
const randomIp = () => ips[Math.floor(Math.random() * ips.length)];
const randomProto = () => protocols[Math.floor(Math.random() * protocols.length)];

let packetCounter = 0;

export function generatePacket(): PacketLog {
  const now = new Date();
  const flagged = Math.random() < 0.08;
  packetCounter++;
  return {
    id: `pkt-${packetCounter}`,
    timestamp: now.toLocaleTimeString("pt-BR", { hour12: false }),
    src: randomIp(),
    dst: randomIp(),
    protocol: randomProto(),
    port: randomPort(),
    size: Math.floor(Math.random() * 1400) + 64,
    flagged,
  };
}

export function generateTrafficSeries(count: number): TrafficPoint[] {
  const points: TrafficPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 2000);
    const base = 200 + Math.sin(i * 0.3) * 80;
    const spike = Math.random() < 0.05 ? Math.random() * 800 : 0;
    const packets = Math.floor(base + Math.random() * 60 + spike);
    points.push({
      time: t.toLocaleTimeString("pt-BR", { hour12: false, minute: "2-digit", second: "2-digit" }),
      packets,
      bytes: packets * (200 + Math.floor(Math.random() * 600)),
      anomaly: spike > 400,
    });
  }
  return points;
}

let alertCounter = 0;
const alertTypes: AnomalyAlert["type"][] = ["threshold", "port_scan", "dos", "unusual_traffic"];
const alertMessages: Record<AnomalyAlert["type"], (ip: string, pps: number) => string> = {
  threshold: (ip, pps) => `Threshold Exceeded: ${ip} → ${pps} pps`,
  port_scan: (ip) => `Port Scan Detected: ${ip} scanning ports 1-1024`,
  dos: (ip, pps) => `Possible DoS Attack: ${ip} → ${pps} pps sustained`,
  unusual_traffic: (ip) => `Unusual Traffic Pattern: ${ip} → anomalous protocol distribution`,
};

export function generateAlert(): AnomalyAlert {
  alertCounter++;
  const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
  const ip = randomIp();
  const pps = Math.floor(Math.random() * 2000) + 500;
  const severities: AnomalyAlert["severity"][] = ["low", "medium", "high", "critical"];
  return {
    id: `alert-${alertCounter}`,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour12: false }),
    type,
    severity: severities[Math.floor(Math.random() * severities.length)],
    sourceIp: ip,
    message: alertMessages[type](ip, pps),
    pps,
  };
}
