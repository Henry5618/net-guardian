// Simulated network monitoring data

const protocols = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "DNS", "SSH", "FTP"];

export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  status: "online" | "offline";
  lastSeen: string;
  traffic: { sent: number; received: number };
  openPorts: number[];
}

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

export interface LogEntry {
  id: string;
  timestamp: string;
  category: "threat" | "error" | "update" | "login";
  severity: "info" | "warning" | "error" | "critical";
  source: string;
  message: string;
  details?: string;
}

export interface FirewallRule {
  id: string;
  name: string;
  direction: "inbound" | "outbound";
  protocol: "TCP" | "UDP" | "ICMP" | "ALL";
  sourceIp: string;
  destIp: string;
  port: string;
  action: "allow" | "deny";
  enabled: boolean;
  hits: number;
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  type: "check" | "error" | "maintenance";
  status: "pending" | "resolved" | "in_progress";
  title: string;
  description: string;
  recommendation: string;
}

// ---------- Network devices ----------
const deviceData: NetworkDevice[] = [
  { ip: "192.168.1.1", mac: "AA:BB:CC:DD:EE:01", hostname: "gateway-router", vendor: "Cisco", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 80, 443, 8080] },
  { ip: "192.168.1.5", mac: "AA:BB:CC:DD:EE:05", hostname: "desktop-admin", vendor: "Dell", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 3389] },
  { ip: "192.168.1.10", mac: "AA:BB:CC:DD:EE:10", hostname: "laptop-dev01", vendor: "Lenovo", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 8080, 3000] },
  { ip: "192.168.1.25", mac: "AA:BB:CC:DD:EE:25", hostname: "server-db", vendor: "HP", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 3306, 5432] },
  { ip: "192.168.1.30", mac: "AA:BB:CC:DD:EE:30", hostname: "nas-storage", vendor: "Synology", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 443, 5000, 5001] },
  { ip: "192.168.1.42", mac: "AA:BB:CC:DD:EE:42", hostname: "printer-office", vendor: "HP", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [80, 443, 9100] },
  { ip: "192.168.1.55", mac: "AA:BB:CC:DD:EE:55", hostname: "cam-lobby", vendor: "Hikvision", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [80, 554, 8000] },
  { ip: "192.168.1.60", mac: "AA:BB:CC:DD:EE:60", hostname: "ap-wifi-01", vendor: "Ubiquiti", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [22, 443] },
  { ip: "192.168.1.78", mac: "AA:BB:CC:DD:EE:78", hostname: "mobile-user01", vendor: "Apple", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [] },
  { ip: "192.168.1.90", mac: "AA:BB:CC:DD:EE:90", hostname: "iot-sensor-temp", vendor: "ESP32", status: "offline", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [80] },
  { ip: "192.168.1.102", mac: "AA:BB:CC:DD:EE:A2", hostname: "smart-tv", vendor: "Samsung", status: "online", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [8443] },
  { ip: "192.168.1.115", mac: "AA:BB:CC:DD:EE:B5", hostname: "guest-laptop", vendor: "ASUS", status: "offline", lastSeen: "", traffic: { sent: 0, received: 0 }, openPorts: [] },
];

export function getNetworkDevices(): NetworkDevice[] {
  const now = new Date();
  return deviceData.map((d) => ({
    ...d,
    lastSeen: d.status === "online"
      ? now.toLocaleTimeString("pt-BR", { hour12: false })
      : new Date(now.getTime() - Math.random() * 3600000).toLocaleTimeString("pt-BR", { hour12: false }),
    traffic: {
      sent: Math.floor(Math.random() * 500000) + 10000,
      received: Math.floor(Math.random() * 800000) + 20000,
    },
  }));
}

export function generateDeviceTraffic(count: number): TrafficPoint[] {
  const points: TrafficPoint[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 2000);
    const base = 50 + Math.sin(i * 0.4) * 30;
    const spike = Math.random() < 0.04 ? Math.random() * 300 : 0;
    const packets = Math.floor(base + Math.random() * 20 + spike);
    points.push({
      time: t.toLocaleTimeString("pt-BR", { hour12: false, minute: "2-digit", second: "2-digit" }),
      packets: Math.max(0, packets),
      bytes: packets * (200 + Math.floor(Math.random() * 600)),
      anomaly: spike > 200,
    });
  }
  return points;
}

// ---------- Packets ----------
const ips = deviceData.map((d) => d.ip);
const randomPort = () => [22, 53, 80, 443, 3306, 5432, 8080, 8443][Math.floor(Math.random() * 8)];
const randomIp = () => ips[Math.floor(Math.random() * ips.length)];
const randomProto = () => protocols[Math.floor(Math.random() * protocols.length)];

let packetCounter = 0;

export function generatePacket(): PacketLog {
  const now = new Date();
  packetCounter++;
  return {
    id: `pkt-${packetCounter}`,
    timestamp: now.toLocaleTimeString("pt-BR", { hour12: false }),
    src: randomIp(),
    dst: randomIp(),
    protocol: randomProto(),
    port: randomPort(),
    size: Math.floor(Math.random() * 1400) + 64,
    flagged: Math.random() < 0.08,
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

// ---------- Anomaly alerts ----------
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

// ---------- Log entries ----------
let logCounter = 0;

const logTemplates: { category: LogEntry["category"]; severity: LogEntry["severity"]; source: string; message: string; details?: string }[] = [
  { category: "threat", severity: "critical", source: "IDS Engine", message: "Tentativa de SQL Injection detectada", details: "Payload malicioso no parâmetro 'id' da requisição HTTP para 192.168.1.25:3306" },
  { category: "threat", severity: "error", source: "Firewall", message: "Conexão bloqueada — porta não autorizada", details: "IP 203.0.113.50 tentou acessar porta 4444 (backdoor conhecida)" },
  { category: "threat", severity: "warning", source: "IDS Engine", message: "Brute force SSH detectado", details: "15 tentativas de login em 30s de 10.0.0.100 para 192.168.1.25" },
  { category: "threat", severity: "critical", source: "Anomaly Detector", message: "Tráfego C2 suspeito identificado", details: "Padrão de beaconing detectado: 192.168.1.78 → 198.51.100.10 a cada 60s" },
  { category: "error", severity: "error", source: "Sistema", message: "Falha na captura de pacotes — interface eth0", details: "Permissão negada: execute com privilégios root" },
  { category: "error", severity: "warning", source: "Banco de Dados", message: "Conexão com SQLite excedeu timeout", details: "Tentativa de escrita falhou após 30s — disco cheio?" },
  { category: "error", severity: "error", source: "Edge Function", message: "Erro 500 no endpoint /api/alerts", details: "TypeError: Cannot read properties of undefined (reading 'severity')" },
  { category: "update", severity: "info", source: "Sistema", message: "NetGuard atualizado para v2.4.1", details: "Melhorias: novo motor de regras, correções de UI" },
  { category: "update", severity: "info", source: "Sistema", message: "Base de assinaturas IDS atualizada", details: "1.247 novas regras adicionadas — total: 45.891" },
  { category: "update", severity: "info", source: "Firewall", message: "Regras de firewall recarregadas", details: "12 regras ativas, 3 novas adicionadas" },
  { category: "login", severity: "info", source: "Auth", message: "Login bem-sucedido — admin@netguard.local", details: "IP de origem: 192.168.1.5 | Navegador: Chrome 120" },
  { category: "login", severity: "warning", source: "Auth", message: "Tentativa de login falhada", details: "Usuário: analyst@netguard.local | 3 tentativas restantes" },
  { category: "login", severity: "error", source: "Auth", message: "Conta bloqueada por excesso de tentativas", details: "Usuário: viewer@netguard.local bloqueado por 15 minutos" },
];

export function generateLogs(count: number): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    logCounter++;
    const tpl = logTemplates[Math.floor(Math.random() * logTemplates.length)];
    const t = new Date(now.getTime() - i * (Math.random() * 60000 + 5000));
    logs.push({
      id: `log-${logCounter}`,
      timestamp: t.toLocaleTimeString("pt-BR", { hour12: false }),
      ...tpl,
    });
  }
  return logs;
}

// ---------- System alerts / checks ----------
let sysAlertCounter = 0;

export function generateSystemAlerts(): SystemAlert[] {
  sysAlertCounter = 0;
  const now = new Date();
  const templates: Omit<SystemAlert, "id" | "timestamp">[] = [
    { type: "check", status: "pending", title: "Certificado SSL expirando", description: "O certificado do servidor web expira em 7 dias", recommendation: "Renove o certificado SSL em Configurações > Segurança" },
    { type: "error", status: "pending", title: "Disco com 92% de uso", description: "O volume /var/log está quase cheio, logs podem ser perdidos", recommendation: "Limpe logs antigos ou expanda o volume de armazenamento" },
    { type: "check", status: "pending", title: "Firmware do roteador desatualizado", description: "Gateway 192.168.1.1 está na versão 3.2.1, disponível 4.0.0", recommendation: "Atualize o firmware em Regras > Gateway" },
    { type: "maintenance", status: "in_progress", title: "Backup automático em andamento", description: "Backup dos logs e configurações sendo realizado", recommendation: "Aguarde a conclusão — estimativa: 10 minutos" },
    { type: "error", status: "pending", title: "Interface eth1 sem resposta", description: "A interface secundária não responde a pings desde 14:30", recommendation: "Verifique o cabo de rede ou reinicie a interface" },
    { type: "check", status: "resolved", title: "Atualização de assinaturas concluída", description: "Base IDS atualizada com sucesso", recommendation: "Nenhuma ação necessária" },
    { type: "check", status: "pending", title: "Portas não utilizadas abertas", description: "Portas 21 (FTP) e 23 (Telnet) estão abertas no gateway", recommendation: "Desabilite portas não utilizadas em Regras > Portas" },
    { type: "error", status: "pending", title: "Alto consumo de CPU detectado", description: "Processo de captura usando 95% da CPU há 5 minutos", recommendation: "Verifique filtros de captura ou reinicie o serviço" },
  ];
  return templates.map((t) => {
    sysAlertCounter++;
    return {
      id: `sysalert-${sysAlertCounter}`,
      timestamp: new Date(now.getTime() - Math.random() * 7200000).toLocaleTimeString("pt-BR", { hour12: false }),
      ...t,
    };
  });
}

// ---------- Firewall rules ----------
export function getFirewallRules(): FirewallRule[] {
  return [
    { id: "fw-1", name: "Permitir HTTP", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "192.168.1.25", port: "80", action: "allow", enabled: true, hits: 15420 },
    { id: "fw-2", name: "Permitir HTTPS", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "192.168.1.25", port: "443", action: "allow", enabled: true, hits: 28903 },
    { id: "fw-3", name: "Permitir SSH interno", direction: "inbound", protocol: "TCP", sourceIp: "192.168.1.0/24", destIp: "192.168.1.25", port: "22", action: "allow", enabled: true, hits: 892 },
    { id: "fw-4", name: "Bloquear Telnet", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "0.0.0.0/0", port: "23", action: "deny", enabled: true, hits: 47 },
    { id: "fw-5", name: "Bloquear FTP externo", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "192.168.1.30", port: "21", action: "deny", enabled: true, hits: 156 },
    { id: "fw-6", name: "Permitir DNS", direction: "outbound", protocol: "UDP", sourceIp: "192.168.1.0/24", destIp: "8.8.8.8", port: "53", action: "allow", enabled: true, hits: 45021 },
    { id: "fw-7", name: "Permitir NTP", direction: "outbound", protocol: "UDP", sourceIp: "192.168.1.0/24", destIp: "0.0.0.0/0", port: "123", action: "allow", enabled: true, hits: 3200 },
    { id: "fw-8", name: "Bloquear porta 4444", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "0.0.0.0/0", port: "4444", action: "deny", enabled: true, hits: 12 },
    { id: "fw-9", name: "Permitir MySQL interno", direction: "inbound", protocol: "TCP", sourceIp: "192.168.1.0/24", destIp: "192.168.1.25", port: "3306", action: "allow", enabled: false, hits: 0 },
    { id: "fw-10", name: "Bloquear ICMP externo", direction: "inbound", protocol: "ICMP", sourceIp: "0.0.0.0/0", destIp: "0.0.0.0/0", port: "*", action: "deny", enabled: false, hits: 0 },
  ];
}
