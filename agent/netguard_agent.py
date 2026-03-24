#!/usr/bin/env python3
"""
NetGuard Agent - Captura de rede real com Scapy
================================================
Requisitos:
    pip install scapy requests

Uso (como root/admin):
    sudo python3 netguard_agent.py

Configuração:
    Edite as variáveis SUPABASE_URL, AGENT_API_KEY e INTERFACE abaixo.
"""

import time
import threading
from collections import defaultdict

import requests

try:
    from scapy.all import (
        ARP, Ether, srp, sniff, IP, TCP, UDP, ICMP, conf
    )
except ImportError:
    print("Erro: Scapy não encontrado. Instale com: pip install scapy")
    exit(1)

# ============================================================
# CONFIGURAÇÃO - Edite estas variáveis
# ============================================================
SUPABASE_URL = "https://ajcqektoddeipjnhbpho.supabase.co"
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/ingest-network-data"
AGENT_API_KEY = "*He8165y*"  # Configure no Supabase Secrets
INTERFACE = "eth0"  # Interface de rede (ex: eth0, wlan0, Wi-Fi)
NETWORK_RANGE = "192.168.1.0/24"  # Faixa de IPs para scan ARP
SCAN_INTERVAL = 60  # Segundos entre scans ARP
TRAFFIC_INTERVAL = 5  # Segundos entre envios de tráfego
PACKET_CAPTURE_COUNT = 100  # Pacotes por ciclo de captura

# IPs que NÃO devem gerar alertas (ex: a própria máquina do agente)
# Adicione aqui o IP da máquina onde o agente roda
WHITELIST_IPS = [
    # "192.168.0.108",  # <-- Descomente e coloque o IP da sua máquina
]

# Destinos que NÃO devem gerar alertas (ex: servidores Supabase)
WHITELIST_DESTINATIONS = [
    "ajcqektoddeipjnhbpho.supabase.co",
    "supabase.co",
]
# ============================================================

# Estado global
known_devices = {}
traffic_buffer = defaultdict(lambda: {"packets": 0, "bytes": 0})
alerts_buffer = []
syn_tracker = defaultdict(set)  # IP -> set de portas (para detectar scan real)
lock = threading.Lock()

SYN_SCAN_THRESHOLD = 10  # Mínimo de portas diferentes para considerar port scan


def is_whitelisted(src_ip, dst_ip=None):
    """Verifica se o tráfego deve ser ignorado para alertas."""
    if src_ip in WHITELIST_IPS:
        return True
    if dst_ip and dst_ip in WHITELIST_IPS:
        return True
    return False


def send_data(data_type, data):
    """Envia dados para a Edge Function."""
    if not data:
        return
    try:
        resp = requests.post(
            FUNCTION_URL,
            json={"type": data_type, "data": data},
            headers={
                "Content-Type": "application/json",
                "x-api-key": AGENT_API_KEY,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            print(f"[OK] {data_type}: {len(data)} registros enviados")
        else:
            print(f"[ERRO] {data_type}: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"[ERRO] Falha ao enviar {data_type}: {e}")


def arp_scan():
    """Realiza scan ARP na rede local para descobrir dispositivos."""
    print(f"[SCAN] Escaneando {NETWORK_RANGE}...")
    try:
        ans, _ = srp(
            Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=NETWORK_RANGE),
            timeout=3,
            verbose=False,
            iface=INTERFACE,
        )
    except Exception as e:
        print(f"[ERRO] Falha no scan ARP: {e}")
        return

    current_macs = set()
    device_events = []

    for sent, received in ans:
        mac = received.hwsrc.upper()
        ip = received.psrc
        current_macs.add(mac)

        with lock:
            if mac in known_devices:
                old_ip = known_devices[mac]["ip"]
                if old_ip != ip:
                    print(f"[ALERTA] Dispositivo {mac} mudou IP: {old_ip} -> {ip}")
                    device_events.append({
                        "mac": mac, "ip": ip,
                        "previous_ip": old_ip, "event_type": "ip_changed",
                    })
                    alerts_buffer.append({
                        "severity": "high",
                        "title": f"IP alterado: {mac}",
                        "description": f"Dispositivo {mac} mudou de {old_ip} para {ip}",
                        "source_ip": ip,
                    })
                else:
                    device_events.append({
                        "mac": mac, "ip": ip, "event_type": "seen",
                    })
                known_devices[mac]["ip"] = ip
                known_devices[mac]["last_seen"] = time.time()
            else:
                print(f"[NOVO] Dispositivo descoberto: {mac} ({ip})")
                known_devices[mac] = {"ip": ip, "last_seen": time.time()}
                device_events.append({
                    "mac": mac, "ip": ip, "event_type": "new",
                })

    # Verificar dispositivos offline
    with lock:
        for mac, info in list(known_devices.items()):
            if mac not in current_macs and time.time() - info["last_seen"] > SCAN_INTERVAL * 3:
                print(f"[OFFLINE] Dispositivo {mac} ({info['ip']}) está offline")
                device_events.append({
                    "mac": mac, "ip": info["ip"], "event_type": "offline",
                })

    send_data("devices", device_events)


def packet_callback(pkt):
    """Processa cada pacote capturado."""
    if not pkt.haslayer(IP):
        return

    src_ip = pkt[IP].src
    dst_ip = pkt[IP].dst
    size = len(pkt)

    proto = "other"
    if pkt.haslayer(TCP):
        proto = "TCP"
        dst_port = pkt[TCP].dport

        # Rastrear SYN para detectar port scan REAL (não conexões normais)
        if pkt[TCP].flags == "S" and not is_whitelisted(src_ip, dst_ip):
            with lock:
                syn_tracker[src_ip].add(dst_port)
                # Só alerta se mais de N portas diferentes forem sondadas
                if len(syn_tracker[src_ip]) == SYN_SCAN_THRESHOLD:
                    ports = sorted(list(syn_tracker[src_ip]))[:10]
                    alerts_buffer.append({
                        "severity": "high",
                        "title": f"Port scan detectado: {src_ip}",
                        "description": f"SYN para {len(syn_tracker[src_ip])} portas: {ports}",
                        "source_ip": src_ip,
                        "dest_ip": dst_ip,
                        "protocol": "TCP",
                    })
    elif pkt.haslayer(UDP):
        proto = "UDP"
    elif pkt.haslayer(ICMP):
        proto = "ICMP"

    key = f"{src_ip}->{dst_ip}:{proto}"
    with lock:
        traffic_buffer[key]["packets"] += 1
        traffic_buffer[key]["bytes"] += size
        traffic_buffer[key]["source_ip"] = src_ip
        traffic_buffer[key]["dest_ip"] = dst_ip
        traffic_buffer[key]["protocol"] = proto

    # Detectar pacotes grandes (possível exfiltração) - ignorar whitelisted
    if size > 10000 and not is_whitelisted(src_ip, dst_ip):
        with lock:
            alerts_buffer.append({
                "severity": "medium",
                "title": "Pacote grande detectado",
                "description": f"{src_ip} -> {dst_ip}: {size} bytes ({proto})",
                "source_ip": src_ip,
                "dest_ip": dst_ip,
                "protocol": proto,
            })


def capture_packets():
    """Captura pacotes continuamente."""
    print(f"[CAPTURA] Iniciando captura na interface {INTERFACE}...")
    while True:
        try:
            sniff(
                iface=INTERFACE,
                prn=packet_callback,
                count=PACKET_CAPTURE_COUNT,
                store=False,
                timeout=30,
            )
        except Exception as e:
            print(f"[ERRO] Falha na captura: {e}")
            time.sleep(5)


def flush_traffic():
    """Envia dados de tráfego acumulados e limpa o rastreador de SYN."""
    while True:
        time.sleep(TRAFFIC_INTERVAL)
        with lock:
            if traffic_buffer:
                data = list(traffic_buffer.values())
                traffic_buffer.clear()
                send_data("traffic", data)

            if alerts_buffer:
                data = list(alerts_buffer)
                alerts_buffer.clear()
                send_data("alerts", data)

            # Limpar rastreador de SYN a cada ciclo para não acumular infinitamente
            syn_tracker.clear()


def scan_loop():
    """Loop de scan ARP periódico."""
    while True:
        arp_scan()
        time.sleep(SCAN_INTERVAL)


def main():
    print("=" * 60)
    print("  NetGuard Agent - Monitoramento de Rede")
    print("=" * 60)
    print(f"  Interface: {INTERFACE}")
    print(f"  Rede: {NETWORK_RANGE}")
    print(f"  Servidor: {SUPABASE_URL}")
    print(f"  Whitelist IPs: {WHITELIST_IPS or '(nenhum)'}")
    print("=" * 60)

    if AGENT_API_KEY == "SUA_CHAVE_API_AQUI":
        print("\n[AVISO] Configure AGENT_API_KEY antes de executar!")
        return

    threads = [
        threading.Thread(target=scan_loop, daemon=True, name="ARP-Scanner"),
        threading.Thread(target=capture_packets, daemon=True, name="Packet-Capture"),
        threading.Thread(target=flush_traffic, daemon=True, name="Traffic-Flush"),
    ]

    for t in threads:
        t.start()
        print(f"  [+] Thread {t.name} iniciada")

    print("\n[ATIVO] Agente rodando. Ctrl+C para parar.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[PARADO] Agente encerrado.")


if __name__ == "__main__":
    main()
