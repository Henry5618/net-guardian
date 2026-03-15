import { useState } from "react";
import { Settings, Network, Eye, Palette, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const [gateway, setGateway] = useState("192.168.1.1");
  const [subnet, setSubnet] = useState("255.255.255.0");
  const [dns1, setDns1] = useState("8.8.8.8");
  const [dns2, setDns2] = useState("1.1.1.1");
  const [iface, setIface] = useState("eth0");

  const [showPackets, setShowPackets] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showOffline, setShowOffline] = useState(true);

  const [refreshRate, setRefreshRate] = useState("2");
  const [maxPackets, setMaxPackets] = useState("200");
  const [theme, setTheme] = useState("dark");

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">Rede, exibição e personalização</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          Salvar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Network settings */}
        <div className="rounded-lg border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Configurações de Rede</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground">Gateway Padrão</label>
              <input value={gateway} onChange={(e) => setGateway(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Máscara de Sub-rede</label>
              <input value={subnet} onChange={(e) => setSubnet(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground">DNS Primário</label>
                <input value={dns1} onChange={(e) => setDns1(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">DNS Secundário</label>
                <input value={dns2} onChange={(e) => setDns2(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Interface de Captura</label>
              <select value={iface} onChange={(e) => setIface(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                <option value="eth0">eth0 (Ethernet)</option>
                <option value="eth1">eth1 (Ethernet 2)</option>
                <option value="wlan0">wlan0 (Wi-Fi)</option>
                <option value="lo">lo (Loopback)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Display filters */}
        <div className="rounded-lg border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Filtros de Exibição</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Mostrar tabela de pacotes", value: showPackets, setter: setShowPackets },
              { label: "Mostrar painel de alertas", value: showAlerts, setter: setShowAlerts },
              { label: "Mostrar gráfico de tráfego", value: showChart, setter: setShowChart },
              { label: "Mostrar dispositivos offline", value: showOffline, setter: setShowOffline },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs text-foreground">{item.label}</span>
                <button
                  onClick={() => item.setter(!item.value)}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    item.value ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform",
                    item.value ? "left-[18px]" : "left-0.5"
                  )} />
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Layout / performance */}
        <div className="rounded-lg border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Layout e Performance</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-muted-foreground">Taxa de Atualização (segundos)</label>
              <select value={refreshRate} onChange={(e) => setRefreshRate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                <option value="1">1s (Alta frequência)</option>
                <option value="2">2s (Padrão)</option>
                <option value="5">5s (Econômico)</option>
                <option value="10">10s (Baixo consumo)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Máximo de Pacotes na Tabela</label>
              <select value={maxPackets} onChange={(e) => setMaxPackets(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200 (Padrão)</option>
                <option value="500">500</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Tema</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                <option value="dark">Escuro (Padrão)</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="rounded-lg border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Informações do Sistema</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Versão", value: "NetGuard IDS v2.4.1" },
              { label: "Motor de Regras", value: "Threshold Engine v1.2" },
              { label: "Base de Assinaturas", value: "45.891 regras" },
              { label: "Uptime", value: "12d 7h 34m" },
              { label: "Último Backup", value: "Hoje, 03:00" },
            ].map((info) => (
              <div key={info.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-[10px] text-muted-foreground">{info.label}</span>
                <span className="text-xs font-mono text-foreground">{info.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
