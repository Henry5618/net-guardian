import { Shield, LayoutDashboard, ScrollText, Settings, Bell, Activity, Users, FileText, Map, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SidebarNav({ activeTab, onTabChange }: SidebarNavProps) {
  const { profile, signOut, hasPermission } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "viewer" as const },
    { id: "topology", label: "Topologia", icon: Map, minRole: "viewer" as const },
    { id: "logs", label: "Logs", icon: ScrollText, minRole: "viewer" as const },
    { id: "alerts", label: "Alertas", icon: Bell, minRole: "viewer" as const },
    { id: "rules", label: "Regras", icon: Activity, minRole: "technician" as const },
    { id: "report", label: "Relatório", icon: FileText, minRole: "viewer" as const },
    { id: "settings", label: "Configurações", icon: Settings, minRole: "technician" as const },
    { id: "users", label: "Usuários", icon: Users, minRole: "admin" as const },
  ];

  const roleLabels = { admin: "Administrador", technician: "Técnico", viewer: "Visitante" };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">NetGuard</h1>
          <p className="text-[10px] text-muted-foreground">IDS Monitor</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.filter((item) => hasPermission(item.minRole)).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-border p-4 space-y-3">
        {profile && (
          <div>
            <p className="text-xs font-medium text-foreground truncate">{profile.full_name}</p>
            <p className="text-[10px] text-muted-foreground">{roleLabels[profile.role]}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-xs text-muted-foreground">Monitorando</span>
          </div>
          <button onClick={signOut} className="rounded p-1 hover:bg-sidebar-accent transition-colors" title="Sair">
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );
}
