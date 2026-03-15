import { useState } from "react";
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFirewallRules, type FirewallRule } from "@/lib/mock-data";

export default function RulesPage() {
  const [rules, setRules] = useState<FirewallRule[]>(() => getFirewallRules());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState<Partial<FirewallRule>>({
    name: "", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "0.0.0.0/0", port: "", action: "deny", enabled: true,
  });

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const addRule = () => {
    if (!newRule.name || !newRule.port) return;
    const rule: FirewallRule = {
      id: `fw-${Date.now()}`,
      name: newRule.name!,
      direction: newRule.direction as "inbound" | "outbound",
      protocol: newRule.protocol as FirewallRule["protocol"],
      sourceIp: newRule.sourceIp!,
      destIp: newRule.destIp!,
      port: newRule.port!,
      action: newRule.action as "allow" | "deny",
      enabled: true,
      hits: 0,
    };
    setRules((prev) => [...prev, rule]);
    setShowAddModal(false);
    setNewRule({ name: "", direction: "inbound", protocol: "TCP", sourceIp: "0.0.0.0/0", destIp: "0.0.0.0/0", port: "", action: "deny", enabled: true });
  };

  const allowCount = rules.filter((r) => r.action === "allow" && r.enabled).length;
  const denyCount = rules.filter((r) => r.action === "deny" && r.enabled).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Regras de Firewall</h2>
          <p className="text-xs text-muted-foreground">Controle de portas e tráfego de rede</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Regra
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <p className="text-2xl font-bold text-foreground">{rules.length}</p>
          <p className="text-[10px] text-muted-foreground">Total de Regras</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <p className="text-2xl font-bold text-success">{allowCount}</p>
          <p className="text-[10px] text-muted-foreground">Permitindo</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 card-shadow">
          <p className="text-2xl font-bold text-destructive">{denyCount}</p>
          <p className="text-[10px] text-muted-foreground">Bloqueando</p>
        </div>
      </div>

      {/* Rules table */}
      <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dir.</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Proto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origem</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destino</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Porta</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hits</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Controles</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className={cn("border-b border-border transition-colors hover:bg-accent/20", !rule.enabled && "opacity-40")}>
                  <td className="px-4 py-2.5">
                    <button onClick={() => toggleRule(rule.id)}>
                      {rule.enabled
                        ? <ToggleRight className="h-5 w-5 text-success" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{rule.name}</td>
                  <td className="px-4 py-2.5">
                    {rule.direction === "inbound"
                      ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                      : <ArrowUpRight className="h-4 w-4 text-warning" />
                    }
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{rule.protocol}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{rule.sourceIp}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{rule.destIp}</td>
                  <td className="px-4 py-2.5 font-mono text-foreground">{rule.port}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "rounded px-2 py-0.5 text-[9px] font-semibold uppercase",
                      rule.action === "allow" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {rule.action === "allow" ? "PERMITIR" : "BLOQUEAR"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{rule.hits.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => deleteRule(rule.id)} className="rounded p-1 hover:bg-destructive/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add rule modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 card-shadow">
            <h3 className="text-sm font-semibold text-foreground mb-4">Nova Regra de Firewall</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Nome</label>
                <input
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Ex: Bloquear porta 8080"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Direção</label>
                  <select value={newRule.direction} onChange={(e) => setNewRule({ ...newRule, direction: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                    <option value="inbound">Entrada</option>
                    <option value="outbound">Saída</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Protocolo</label>
                  <select value={newRule.protocol} onChange={(e) => setNewRule({ ...newRule, protocol: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="ICMP">ICMP</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">IP Origem</label>
                  <input value={newRule.sourceIp} onChange={(e) => setNewRule({ ...newRule, sourceIp: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">IP Destino</label>
                  <input value={newRule.destIp} onChange={(e) => setNewRule({ ...newRule, destIp: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Porta</label>
                  <input value={newRule.port} onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ex: 8080" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Ação</label>
                  <select value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                    className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                    <option value="deny">Bloquear</option>
                    <option value="allow">Permitir</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)}
                className="rounded-md bg-secondary px-4 py-2 text-xs text-secondary-foreground hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button onClick={addRule}
                className="rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition-colors">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
