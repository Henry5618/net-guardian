# NetGuard Agent - Agente de Monitoramento de Rede

## Requisitos

- Python 3.8+
- Permissões de root/administrador (necessário para captura de pacotes)
- Linux, macOS ou Windows com Npcap

## Instalação

```bash
cd agent
pip install -r requirements.txt
```

## Configuração

Edite o arquivo `netguard_agent.py` e configure:

| Variável | Descrição | Exemplo |
|---|---|---|
| `AGENT_API_KEY` | Chave de API (configurada no backend) | `minha-chave-secreta` |
| `INTERFACE` | Interface de rede | `eth0`, `wlan0`, `enp3s0` |
| `NETWORK_RANGE` | Faixa de IPs para scan | `192.168.1.0/24` |
| `SCAN_INTERVAL` | Intervalo entre scans ARP (segundos) | `60` |
| `TRAFFIC_INTERVAL` | Intervalo de envio de tráfego (segundos) | `5` |

## Execução

```bash
sudo python3 netguard_agent.py
```

## O que o agente faz

1. **Scan ARP** — Descobre dispositivos na rede local periodicamente
2. **Captura de pacotes** — Monitora tráfego TCP/UDP/ICMP em tempo real
3. **Detecção de anomalias**:
   - Mudança de IP de um dispositivo
   - Dispositivo ficou offline
   - Possível port scan (SYN sem ACK)
   - Pacotes grandes (possível exfiltração)
4. **Envio para o dashboard** — Todos os dados são enviados via API para visualização no NetGuard

## Descobrindo sua interface de rede

```bash
# Linux
ip link show

# macOS
ifconfig

# Windows (PowerShell)
Get-NetAdapter
```
