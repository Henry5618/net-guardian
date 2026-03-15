import type { PacketLog } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface PacketTableProps {
  packets: PacketLog[];
}

export function PacketTable({ packets }: PacketTableProps) {
  return (
    <div className="card-shadow rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Live Packet Logs</h3>
        <p className="text-xs text-muted-foreground">{packets.length} pacotes capturados</p>
      </div>
      <div className="max-h-[340px] overflow-y-auto scrollbar-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Timestamp</th>
              <th className="px-4 py-2 font-medium">Origem</th>
              <th className="px-4 py-2 font-medium">Destino</th>
              <th className="px-4 py-2 font-medium">Protocolo</th>
              <th className="px-4 py-2 font-medium text-right">Porta</th>
              <th className="px-4 py-2 font-medium text-right">Tamanho</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((pkt) => (
              <tr
                key={pkt.id}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-accent/50",
                  pkt.flagged && "bg-destructive/5"
                )}
              >
                <td className="px-4 py-2 font-mono text-muted-foreground">{pkt.timestamp}</td>
                <td className="px-4 py-2 font-mono text-foreground">{pkt.src}</td>
                <td className="px-4 py-2 font-mono text-foreground">{pkt.dst}</td>
                <td className="px-4 py-2">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-secondary-foreground">
                    {pkt.protocol}
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">{pkt.port}</td>
                <td className="px-4 py-2 text-right font-mono text-muted-foreground">{pkt.size}B</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
