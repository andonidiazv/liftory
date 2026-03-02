import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Crown, Clock, AlertTriangle, Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface KPI {
  label: string;
  value: number | null;
  icon: React.ElementType;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  subscription_status: string;
  created_at: string;
  experience_level: string | null;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [totalRes, premiumRes, trialRes, expiredRes, exercisesRes, recentRes, activeRes] = await Promise.all([
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("is_deleted", false),
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "trial"),
        supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("subscription_status", "expired"),
        supabase.from("exercises").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("user_profiles").select("id, full_name, subscription_status, created_at, experience_level").eq("is_deleted", false).order("created_at", { ascending: false }).limit(10),
        // Active users: distinct user_ids with completed workouts in last 7 days
        supabase.from("workouts").select("user_id").eq("is_completed", true).gte("completed_at", sevenDaysAgo),
      ]);

      const activeCount = activeRes.data ? new Set(activeRes.data.map((w) => w.user_id)).size : 0;

      setKpis([
        { label: "TOTAL USUARIOS", value: totalRes.count ?? 0, icon: Users },
        { label: "ACTIVOS (7D)", value: activeCount, icon: UserCheck },
        { label: "PREMIUM", value: premiumRes.count ?? 0, icon: Crown },
        { label: "EN TRIAL", value: trialRes.count ?? 0, icon: Clock },
        { label: "EXPIRED", value: expiredRes.count ?? 0, icon: AlertTriangle },
        { label: "EJERCICIOS", value: exercisesRes.count ?? 0, icon: Dumbbell },
      ]);

      setRecentUsers((recentRes.data as RecentUser[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const statusColor: Record<string, string> = {
    active: "#7A8B5C",
    trial: "#C9A96E",
    expired: "#C0392B",
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Dashboard</h1>
        <div className="mt-8 grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" style={{ background: "#1C1C1E" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Dashboard</h1>

      {/* KPI Cards */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-xl p-5"
            style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}
          >
            <kpi.icon className="absolute right-4 top-4 h-5 w-5" style={{ color: "rgba(250,248,245,0.15)" }} />
            <p className="font-mono-num" style={{ fontSize: 32, fontWeight: 500, color: "#FAF8F5", lineHeight: 1 }}>
              {kpi.value}
            </p>
            <p className="mt-2 text-label-tech text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Users Table */}
      <div className="mt-10">
        <span className="eyebrow-label">ÚLTIMOS 10 REGISTROS</span>
        <div className="mt-4 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                <th className="px-5 py-3 text-left text-label-tech text-muted-foreground font-normal">Nombre</th>
                <th className="px-5 py-3 text-left text-label-tech text-muted-foreground font-normal">Estado</th>
                <th className="px-5 py-3 text-left text-label-tech text-muted-foreground font-normal">Nivel</th>
                <th className="px-5 py-3 text-left text-label-tech text-muted-foreground font-normal">Registro</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(250,248,245,0.04)" }}>
                  <td className="px-5 py-3 font-body text-sm" style={{ color: "#FAF8F5" }}>
                    {u.full_name || "Sin nombre"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background: `${statusColor[u.subscription_status] || "#8A8A8E"}20`,
                        color: statusColor[u.subscription_status] || "#8A8A8E",
                      }}
                    >
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground capitalize">
                    {u.experience_level || "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {format(new Date(u.created_at), "dd/MM/yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
