// Simulação completa da rede local — inventário fixo + cenários demonstrativos
// Inventário: 1 modem, 1 roteador, 1 repetidor, 10 máquinas, 5 celulares, 2 impressoras

export interface SimDevice {
  mac: string;
  ip: string;
  hostname: string;
  category: "modem" | "router" | "repeater" | "machine" | "phone" | "printer";
  status: "online" | "offline";
  lastSeen: Date;
  eventType: string;
  previousIp?: string | null;
}

export interface SimTraffic {
  id: string;
  recordedAt: Date;
  sourceIp: string | null;
  destIp: string | null;
  protocol: string;
  packets: number;
  bytes: number;
  anomaly: boolean;
}

export interface SimAlert {
  id: string;
  createdAt: Date;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;
  sourceIp: string | null;
  destIp: string | null;
  protocol: string | null;
  resolved: boolean;
  resolution: string | null;
}

export interface SimIpChange {
  mac: string;
  hostname: string | null;
  previousIp: string | null;
  currentIp: string;
  detectedAt: Date;
}

type Listener = () => void;

// ---------- Inventário fixo ----------
function buildInventory(): SimDevice[] {
  const now = new Date();
  const devices: SimDevice[] = [
    { mac: "AA:00:00:00:00:01", ip: "192.168.0.1", hostname: "modem-vivo", category: "modem", status: "online", lastSeen: now, eventType: "seen" },
    { mac: "AA:00:00:00:00:02", ip: "192.168.0.2", hostname: "router-tplink", category: "router", status: "online", lastSeen: now, eventType: "seen" },
    { mac: "AA:00:00:00:00:03", ip: "192.168.0.3", hostname: "repeater-mercusys", category: "repeater", status: "online", lastSeen: now, eventType: "seen" },
  ];
  // 10 máquinas
  for (let i = 1; i <= 10; i++) {
    devices.push({
      mac: `AA:00:00:00:01:${i.toString(16).padStart(2, "0").toUpperCase()}`,
      ip: `192.168.0.${9 + i}`,
      hostname: `pc-${i.toString().padStart(2, "0")}`,
      category: "machine",
      status: "online",
      lastSeen: now,
      eventType: "seen",
    });
  }
  // 5 celulares
  for (let i = 1; i <= 5; i++) {
    devices.push({
      mac: `AA:00:00:00:02:${(i + 29).toString(16).toUpperCase()}`,
      ip: `192.168.0.${29 + i}`,
      hostname: `phone-${i.toString().padStart(2, "0")}`,
      category: "phone",
      status: "online",
      lastSeen: now,
      eventType: "seen",
    });
  }
  // 2 impressoras
  for (let i = 1; i <= 2; i++) {
    devices.push({
      mac: `AA:00:00:00:03:${(i + 49).toString(16).toUpperCase()}`,
      ip: `192.168.0.${49 + i}`,
      hostname: `printer-${i.toString().padStart(2, "0")}`,
      category: "printer",
      status: "online",
      lastSeen: now,
      eventType: "seen",
    });
  }
  return devices;
}

const PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP"];
let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;

class NetworkSimulator {
  devices: SimDevice[] = buildInventory();
  traffic: SimTraffic[] = [];
  alerts: SimAlert[] = [];
  ipChanges: SimIpChange[] = [];
  private listeners: Set<Listener> = new Set();
  private started = false;

  constructor() {
    this.seedScenarios();
    this.start();
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  // ---------- Cenários iniciais (4.2 a 4.6) ----------
  private seedScenarios() {
    const now = Date.now();

    // Tráfego base — gera ~2 minutos de histórico para cada dispositivo
    for (let s = 120; s >= 0; s -= 3) {
      const ts = new Date(now - s * 1000);
      // 6 amostras aleatórias de tráfego entre dispositivos
      for (let k = 0; k < 6; k++) {
        const src = this.devices[Math.floor(Math.random() * this.devices.length)];
        const dst = this.devices[Math.floor(Math.random() * this.devices.length)];
        if (src.ip === dst.ip) continue;
        const packets = 20 + Math.floor(Math.random() * 80);
        this.traffic.push({
          id: uid("pkt"),
          recordedAt: ts,
          sourceIp: src.ip,
          destIp: dst.ip,
          protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
          packets,
          bytes: packets * (200 + Math.floor(Math.random() * 800)),
          anomaly: false,
        });
      }
    }

    // 4.2 — Port scanning: pc-03 (192.168.0.12) sondou 25 portas do servidor printer-01
    const scanner = this.devices.find((d) => d.hostname === "pc-03")!;
    const target = this.devices.find((d) => d.hostname === "printer-01")!;
    for (let p = 0; p < 25; p++) {
      this.traffic.push({
        id: uid("pkt"),
        recordedAt: new Date(now - 60000 + p * 200),
        sourceIp: scanner.ip,
        destIp: target.ip,
        protocol: "TCP",
        packets: 1,
        bytes: 64,
        anomaly: true,
      });
    }
    this.alerts.push({
      id: uid("alert"),
      createdAt: new Date(now - 55000),
      severity: "critical",
      title: "Possível Port Scan detectado",
      description: `IP ${scanner.ip} (${scanner.hostname}) realizou tentativas de conexão TCP SYN em 25 portas distintas do host ${target.ip} (${target.hostname}) em menos de 10 segundos.`,
      sourceIp: scanner.ip,
      destIp: target.ip,
      protocol: "TCP",
      resolved: false,
      resolution: null,
    });

    // 4.3 — Entrada de novo dispositivo (phone-05 marcado como new_device)
    const newDev = this.devices.find((d) => d.hostname === "phone-05")!;
    newDev.eventType = "new_device";
    newDev.lastSeen = new Date(now - 30000);
    this.alerts.push({
      id: uid("alert"),
      createdAt: new Date(now - 30000),
      severity: "medium",
      title: "Novo dispositivo conectado à rede",
      description: `Dispositivo desconhecido detectado: MAC ${newDev.mac} recebeu IP ${newDev.ip} (hostname ${newDev.hostname}). Não estava presente em varreduras anteriores.`,
      sourceIp: newDev.ip,
      destIp: null,
      protocol: null,
      resolved: false,
      resolution: null,
    });

    // 4.4 — Saída de dispositivo (pc-10 offline há mais de 5 min)
    const goneDev = this.devices.find((d) => d.hostname === "pc-10")!;
    goneDev.status = "offline";
    goneDev.lastSeen = new Date(now - 360000);
    goneDev.eventType = "offline";
    this.alerts.push({
      id: uid("alert"),
      createdAt: new Date(now - 300000),
      severity: "low",
      title: "Dispositivo saiu da rede",
      description: `O host ${goneDev.hostname} (${goneDev.ip}) deixou de responder a varreduras ARP. Última detecção: ${goneDev.lastSeen.toLocaleTimeString("pt-BR")}.`,
      sourceIp: goneDev.ip,
      destIp: null,
      protocol: null,
      resolved: false,
      resolution: null,
    });

    // 4.5 — Alteração de IP (pc-02 mudou de 192.168.0.55 → 192.168.0.11)
    const changedDev = this.devices.find((d) => d.hostname === "pc-02")!;
    changedDev.previousIp = "192.168.0.55";
    changedDev.eventType = "ip_changed";
    this.ipChanges.push({
      mac: changedDev.mac,
      hostname: changedDev.hostname,
      previousIp: "192.168.0.55",
      currentIp: changedDev.ip,
      detectedAt: new Date(now - 90000),
    });
    this.alerts.push({
      id: uid("alert"),
      createdAt: new Date(now - 90000),
      severity: "medium",
      title: "Alteração de IP detectada",
      description: `O dispositivo ${changedDev.hostname} (MAC ${changedDev.mac}) alterou seu endereço de 192.168.0.55 para ${changedDev.ip}. Possível reconfiguração ou conflito DHCP.`,
      sourceIp: changedDev.ip,
      destIp: null,
      protocol: null,
      resolved: false,
      resolution: null,
    });

    // 4.6 — Tráfego anômalo (pacote grande / pico)
    const noisy = this.devices.find((d) => d.hostname === "pc-05")!;
    const ext = this.devices.find((d) => d.hostname === "modem-vivo")!;
    this.traffic.push({
      id: uid("pkt"),
      recordedAt: new Date(now - 15000),
      sourceIp: noisy.ip,
      destIp: ext.ip,
      protocol: "UDP",
      packets: 850,
      bytes: 1450000,
      anomaly: true,
    });
    this.alerts.push({
      id: uid("alert"),
      createdAt: new Date(now - 15000),
      severity: "high",
      title: "Tráfego anômalo detectado",
      description: `Volume incomum de pacotes UDP partindo de ${noisy.ip} (${noisy.hostname}) em direção a ${ext.ip}: 850 pacotes / ~1.45 MB em 1 segundo. Padrão fora do baseline da rede.`,
      sourceIp: noisy.ip,
      destIp: ext.ip,
      protocol: "UDP",
      resolved: false,
      resolution: null,
    });
  }

  // ---------- Loop em tempo real ----------
  private start() {
    if (this.started) return;
    this.started = true;

    // Tráfego contínuo a cada 3s
    setInterval(() => {
      const onlineDevs = this.devices.filter((d) => d.status === "online");
      for (let k = 0; k < 4; k++) {
        const src = onlineDevs[Math.floor(Math.random() * onlineDevs.length)];
        const dst = onlineDevs[Math.floor(Math.random() * onlineDevs.length)];
        if (!src || !dst || src.ip === dst.ip) continue;
        const packets = 10 + Math.floor(Math.random() * 90);
        this.traffic.push({
          id: uid("pkt"),
          recordedAt: new Date(),
          sourceIp: src.ip,
          destIp: dst.ip,
          protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
          packets,
          bytes: packets * (200 + Math.floor(Math.random() * 800)),
          anomaly: false,
        });
        // atualiza lastSeen
        src.lastSeen = new Date();
        if (src.eventType === "new_device") src.eventType = "seen";
      }
      // mantém somente os últimos 800 registros
      if (this.traffic.length > 800) this.traffic = this.traffic.slice(-800);
      this.notify();
    }, 3000);
  }

  // ---------- API pública ----------
  resolveAlert(id: string, resolution: string | null) {
    const a = this.alerts.find((x) => x.id === id);
    if (a) {
      a.resolved = true;
      a.resolution = resolution;
      this.notify();
    }
  }

  bulkResolve(ids: string[]) {
    for (const id of ids) this.resolveAlert(id, null);
  }

  bulkDelete(ids: string[]) {
    this.alerts = this.alerts.filter((a) => !ids.includes(a.id));
    this.notify();
  }

  clearAlerts() {
    this.alerts = [];
    this.notify();
  }
}

// Singleton — inicializa apenas no browser
declare global {
  interface Window { __netSim?: NetworkSimulator }
}

export function getSimulator(): NetworkSimulator {
  if (typeof window === "undefined") {
    // SSR fallback
    return new NetworkSimulator();
  }
  if (!window.__netSim) window.__netSim = new NetworkSimulator();
  return window.__netSim;
}
