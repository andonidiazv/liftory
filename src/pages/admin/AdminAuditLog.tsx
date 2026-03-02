import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditRow {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  old_values: any;
  new_values: any;
  created_at: string;
}

const actionColors: Record<string, string> = {
  subscription_forced: "#C9A96E",
  subscription_expired_forced: "#B8622F",
  subscription_trial_reset: "#8A8A8E",
  content_updated: "#7A8B5C",
  content_deleted: "#C0392B",
  content_activated: "#7A8B5C",
  content_deactivated: "#8A8A8E",
  ai_rule_changed: "#B8622F",
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (actionFilter !== "all") query = query.eq("action_type", actionFilter);
    if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      query = query.lt("created_at", end.toISOString());
    }
    const { data } = await query;
    setLogs((data as AuditRow[]) || []);
    setLoading(false);
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const actionTypes = [...new Set(logs.map((l) => l.action_type))].sort();

  return (
    <div>
      <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Audit Log</h1>
      <p className="mt-1 text-sm text-muted-foreground font-body">Registro inmutable de acciones administrativas.</p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm font-body" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}>
          <option value="all">Todas las acciones</option>
          {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg px-3 py-2 text-sm font-mono" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg px-3 py-2 text-sm font-mono" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />)}</div>
      ) : logs.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">No hay registros en el audit log.</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                <th className="w-8"></th>
                {["Fecha", "Acción", "Tabla", "Target ID"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-label-tech text-muted-foreground font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isOpen = expanded.has(log.id);
                const color = actionColors[log.action_type] || "#8A8A8E";
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid rgba(250,248,245,0.04)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="pl-3 pr-0 py-3">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: `${color}20`, color }}>{log.action_type}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted-foreground">{log.target_table}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground max-w-[180px] truncate">{log.target_id}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4" style={{ background: "rgba(0,0,0,0.2)" }}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-label-tech text-muted-foreground">OLD VALUES</span>
                              <pre className="mt-2 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[300px]" style={{ background: "#0D0C0A", color: "#C0392B" }}>
                                {log.old_values ? JSON.stringify(log.old_values, null, 2) : "null"}
                              </pre>
                            </div>
                            <div>
                              <span className="text-label-tech text-muted-foreground">NEW VALUES</span>
                              <pre className="mt-2 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[300px]" style={{ background: "#0D0C0A", color: "#7A8B5C" }}>
                                {log.new_values ? JSON.stringify(log.new_values, null, 2) : "null"}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className="text-label-tech text-muted-foreground">ADMIN USER ID</span>
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{log.admin_user_id}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
