import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "destructive" | "warning";
}

export function MetricCard({ title, value, subtitle, icon: Icon, variant = "default" }: MetricCardProps) {
  return (
    <div
      className={cn(
        "card-shadow rounded-lg border border-border bg-card p-4 transition-all",
        variant === "destructive" && "glow-pulse border-destructive/30",
        variant === "success" && "glow-pulse-success border-success/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground font-mono">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "success" && "bg-success/10 text-success",
            variant === "destructive" && "bg-destructive/10 text-destructive",
            variant === "warning" && "bg-warning/10 text-warning"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
