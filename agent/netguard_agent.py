#!/usr/bin/env python3
"""
NetGuard Agent - Captura de rede real com Scapy
================================================
Requisitos:
    pip install scapy requests python-dotenv mac-vendor-lookup

Uso (como root/admin):
    sudo python3 netguard_agent.py

Configuração:
    Use o arquivo .env para configurar variáveis sensíveis.
"""

import os
import time
import threading
from collections import defaultdict

import requests
from dotenv import load_dotenv

try:
    from scapy.all import (
        ARP, Ether, srp, sniff, IP, TCP, UDP, ICMP, conf
    )
except ImportError:
    print("Erro: Scapy não encontrado. Instale com: pip install scapy")
    exit(1)

try:
    from mac_vendor_lookup import MacLookup
except ImportError:
    print("Erro: mac_vendor_lookup não encontrado. Instale com: pip install mac-vendor-lookup")
    exit(1)

# Carrega variáveis do .env
load_dotenv()

# ============================================================
# CONFIGURAÇÃO
# ============================================================
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    print("[ERRO] SUPABASE_URL não configurada no .env!")
    exit(1)

FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/ingest-network-data"

AGENT_API_KEY = os.getenv("AGENT_API_KEY")
if not AGENT_API_KEY:
    print("[ERRO] AGENT_API_KEY não configurada no .env!")
    exit(1)

INTERFACE = os.getenv("INTERFACE")
if not INTERFACE:
    try:
        # Tenta pegar as descrições em tela do Windows (nome do adaptador)
        INTERFACE = conf.iface.description if hasattr(conf.iface, "description") else conf.iface.name
    except:
        INTERFACE = str(conf.iface)
    print(f"[*] INTERFACE não definida no .env. Usando a padrão detectada: {INTERFACE}")

NETWORK_RANGE = os.getenv("NETWORK_RANGE")
if not NETWORK_RANGE:
    NETWORK_RANGE = "192.168.0.0/24"
    print(f"[*] NETWORK_RANGE não definido no .env. Usando padrão: {NETWORK_RANGE}")

SCAN_INTERVAL = 60  # Segundos entre scans ARP
TRAFFIC_INTERVAL = 5  # Segundos entre envios de tráfego
PACKET_CAPTURE_COUNT = 100  # Pacotes por ciclo de captura

WHITELIST_IPS = [
    "192.168.0.108",
]

WHITELIST_DESTINATIONS = [
    "ajcqektoddeipjnhbpho.supabase.co",
    "supabase.co",
]
# ============================================================

# Estado global
known_devices = {}
traffic_buffer = defaultdict(lambda: {"packets": 0, "bytes": 0})
alerts_buffer = []
syn_tracker = defaultdict(set)
lock = threading.Lock()

# Fila para requests falhos (resiliência)
failed_requests_queue = []

mac_lookup = MacLookup()

SYN_SCAN_THRESHOLD = 10


def is_whitelisted(src_ip, dst_ip=None):
    if src_ip in WHITELIST_IPS:
        return True
    if dst_ip and dst_ip in WHITELIST_IPS:
        return True
    return False


def get_mac_vendor(mac):
    try:
        return mac_lookup.lookup(mac)
    except Exception:
        return "Desconhecido"


def send_data(data_type, data):
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
            timeout=30,
        )
        if resp.status_code == 200:
            print(f"[OK] {data_type}: {len(data)} registros enviados")
        else:
            print(f"[ERRO] {data_type}: {resp.status_code} - {resp.text}")
            with lock:
                if len(failed_requests_queue) < 15:
                    failed_requests_queue.append((data_type, data))
    except Exception as e:
        print(f"[ERRO] Falha ao enviar {data_type}: {e}")
        with lock:
            if len(failed_requests_queue) < 15:
                failed_requests_queue.append((data_type, data))


def flush_failed_requests():
    """Tenta reenviar requisições que falharam."""
    with lock:
        to_retry = list(failed_requests_queue)
        failed_requests_queue.clear()
        
    for data_type, data in to_retry:
        print(f"[RETRY] Tentando reenviar {len(data)} registros do tipo {data_type} da fila de falhas...")
        try:
            resp = requests.post(
                FUNCTION_URL,
                json={"type": data_type, "data": data},
                headers={"Content-Type": "application/json", "x-api-key": AGENT_API_KEY},
                timeout=15,
            )
            if resp.status_code != 200:
                print(f"[ERRO-RETRY] Falhou novamente: {resp.status_code}")
                # Don't add back if it's too big
        except Exception as e:
            print(f"[ERRO-RETRY] Timeout/Exceção: {e}")


def arp_scan():
    print(f"[SCAN] Escaneando {NETWORK_RANGE} na interface {INTERFACE}...")
    try:
        ans, _ = srp(
            Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=NETWORK_RANGE),
            timeout=3,
            verbose=False,
            iface=INTERFACE,
            filter="arp"
        )
    except Exception as e:
        print(f"[ERRO] Falha no scan ARP da interface {INTERFACE}: {e}")
        return

    current_macs = set()
    device_events = []

    for sent, received in ans:
        mac = received.hwsrc.upper()
        ip = received.psrc
        current_macs.add(mac)
        
        vendor = get_mac_vendor(mac)

        with lock:
            if mac in known_devices:
                old_ip = known_devices[mac]["ip"]
                if old_ip != ip:
                    print(f"[ALERTA] Dispositivo {mac} ({vendor}) mudou IP: {old_ip} -> {ip}")
                    device_events.append({
                        "mac": mac, "ip": ip,
                        "previous_ip": old_ip, "event_type": "ip_changed",
                        "hostname": vendor
                    })
                    alerts_buffer.append({
                        "severity": "high",
                        "title": f"IP alterado: {vendor}",
                        "description": f"Dispositivo {mac} ({vendor}) mudou de {old_ip} para {ip}",
                        "source_ip": ip,
                    })
                else:
                    device_events.append({
                        "mac": mac, "ip": ip, "event_type": "seen",
                        "hostname": vendor
                    })
                known_devices[mac]["ip"] = ip
                known_devices[mac]["last_seen"] = time.time()
                known_devices[mac]["hostname"] = vendor
            else:
                print(f"[NOVO] Dispositivo descoberto: {mac} ({vendor}) - {ip}")
                known_devices[mac] = {"ip": ip, "last_seen": time.time(), "hostname": vendor}
                device_events.append({
                    "mac": mac, "ip": ip, "event_type": "new",
                    "hostname": vendor
                })

    with lock:
        keys_to_remove = []
        for mac, info in list(known_devices.items()):
            if mac not in current_macs and time.time() - info["last_seen"] > SCAN_INTERVAL * 3:
                vendor_name = info.get("hostname", "Desconhecido")
                print(f"[OFFLINE] Dispositivo {mac} ({vendor_name}) está offline")
                device_events.append({
                    "mac": mac, "ip": info["ip"], "event_type": "offline", "hostname": vendor_name
                })
                alerts_buffer.append({
                    "severity": "low",
                    "title": "Dispositivo Desconectado",
                    "description": f"O dispositivo {vendor_name} ({info['ip']}) ficou offline ou parou de responder.",
                    "source_ip": info["ip"],
                    "protocol": "ARP",
                })
                keys_to_remove.append(mac)
        
        # Remove offline devices to avoid perpetual offline alerts
        for mac in keys_to_remove:
            del known_devices[mac]

    send_data("devices", device_events)


def packet_callback(pkt):
    if not pkt.haslayer(IP):
        return

    src_ip = pkt[IP].src
    dst_ip = pkt[IP].dst
    size = len(pkt)

    proto = "other"
    if pkt.haslayer(TCP):
        proto = "TCP"
        dst_port = pkt[TCP].dport

        if pkt[TCP].flags == "S" and not is_whitelisted(src_ip, dst_ip):
            with lock:
                syn_tracker[src_ip].add(dst_port)
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
    while True:
        time.sleep(TRAFFIC_INTERVAL)
        
        flush_failed_requests()

        with lock:
            if traffic_buffer:
                data = list(traffic_buffer.values())
                traffic_buffer.clear()
                send_data("traffic", data)

            if alerts_buffer:
                data = list(alerts_buffer)
                alerts_buffer.clear()
                send_data("alerts", data)

            syn_tracker.clear()


def scan_loop():
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

    try:
        # Atualiza a base de MACs uma vez ao iniciar (opcional/descomentar se quiser base mais atual)
        # mac_lookup.update_vendors()
        print("[*] Resolução de fabricantes MAC (OUI) ativada e carregada.")
    except Exception as e:
        print(f"[*] Fallback na resolução de fabricantes MAC. ({e})")

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
