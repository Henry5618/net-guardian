import { useState, useEffect } from "react";
import { UserPlus, Users, Shield, Wrench, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  full_name: string;
  role: AppRole;
  created_at: string;
}

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; style: string }> = {
  admin: { label: "Administrador", icon: Shield, style: "bg-destructive/10 text-destructive" },
  technician: { label: "Técnico", icon: Wrench, style: "bg-warning/10 text-warning" },
  viewer: { label: "Visitante", icon: Eye, style: "bg-primary/10 text-primary" },
};

export default function UsersPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "viewer" as AppRole });

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    if (data) setUsers(data as UserProfile[]);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Usuário ${form.full_name} criado com sucesso!`);
      setShowModal(false);
      setForm({ full_name: "", email: "", password: "", role: "viewer" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gerenciar Usuários</h2>
          <p className="text-xs text-muted-foreground">Cadastro e controle de acesso</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <UserPlus className="h-3.5 w-3.5" />
          Novo Usuário
        </button>
      </div>

      {/* Users list */}
      <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nível</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const rc = roleConfig[u.role];
              const Icon = rc.icon;
              return (
                <tr key={u.id} className="border-b border-border hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold uppercase", rc.style)}>
                      <Icon className="h-3 w-3" />
                      {rc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 card-shadow">
            <h3 className="text-sm font-semibold text-foreground mb-4">Cadastrar Novo Usuário</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground">Nome Completo</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  placeholder="João Silva" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  placeholder="usuario@netguard.local" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Senha</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  placeholder="••••••••" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Nível de Acesso</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
                  className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground outline-none">
                  <option value="admin">Administrador — Acesso total</option>
                  <option value="technician">Técnico — Alterações limitadas</option>
                  <option value="viewer">Visitante — Somente visualização</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)}
                className="rounded-md bg-secondary px-4 py-2 text-xs text-secondary-foreground hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={loading}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
