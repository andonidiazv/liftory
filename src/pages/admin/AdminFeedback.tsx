import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, MessageSquare, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface FeedbackRow {
  id: string;
  user_id: string;
  workout_id: string | null;
  question_ids: string[];
  responses: Record<string, string | string[]>;
  created_at: string;
  // joined
  user_email?: string;
  user_name?: string;
  day_label?: string;
}

const QUESTION_LABELS: Record<string, string> = {
  session_mood: "Mood de la sesión",
  hardest_block: "Bloque más fuerte",
  preferred_duration: "Ritmo de la sesión",
  discomfort_flags: "Molestias",
};

const VALUE_LABELS: Record<string, string> = {
  "1": "Brutal",
  "2": "Dura",
  "3": "Bien",
  "4": "Perfecta",
  mobility: "Mobility",
  strength: "Fuerza",
  sculpt: "Sculpt",
  finisher: "Finisher",
  shorter: "Más corta",
  perfect: "Perfecto",
  longer: "Más larga",
  knees: "Rodillas",
  lower_back: "Espalda baja",
  shoulders: "Hombros",
  energy: "Energía",
  sleep: "Sueño",
  none: "Todo bien",
};

function formatValue(val: string): string {
  if (val.startsWith("other:")) return `Otro: ${val.slice(6)}`;
  return VALUE_LABELS[val] || val;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminFeedback() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuestion, setFilterQuestion] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) {
      // Fetch failed — will show empty state
      setLoading(false);
      return;
    }

    // Enrich with user info and workout label
    const userIds = [...new Set(data.map((r: FeedbackRow) => r.user_id))];
    const workoutIds = [...new Set(data.map((r: FeedbackRow) => r.workout_id).filter(Boolean))] as string[];

    const [{ data: profiles }, { data: workouts }] = await Promise.all([
      supabase.from("user_profiles").select("id, full_name, email").in("id", userIds),
      workoutIds.length > 0
        ? supabase.from("workouts").select("id, day_label").in("id", workoutIds)
        : Promise.resolve({ data: [] as { id: string; day_label: string }[] }),
    ]);

    const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));
    const workoutMap = new Map((workouts || []).map((w: { id: string; day_label: string }) => [w.id, w]));

    const enriched: FeedbackRow[] = data.map((r: FeedbackRow) => {
      const profile = profileMap.get(r.user_id);
      const workout = r.workout_id ? workoutMap.get(r.workout_id) : null;
      return {
        ...r,
        user_name: (profile as { full_name?: string })?.full_name || "—",
        user_email: (profile as { email?: string })?.email || "—",
        day_label: (workout as { day_label?: string })?.day_label || "—",
      };
    });

    setRows(enriched);
    setLoading(false);
  };

  // Stats summary
  const summary = useMemo(() => {
    const total = rows.length;
    const questionCounts: Record<string, number> = {};
    const valueCounts: Record<string, Record<string, number>> = {};

    for (const row of rows) {
      for (const [qId, response] of Object.entries(row.responses)) {
        questionCounts[qId] = (questionCounts[qId] || 0) + 1;
        if (!valueCounts[qId]) valueCounts[qId] = {};
        const values = Array.isArray(response) ? response : [response];
        for (const v of values) {
          valueCounts[qId][v] = (valueCounts[qId][v] || 0) + 1;
        }
      }
    }

    return { total, questionCounts, valueCounts };
  }, [rows]);

  const filtered = useMemo(() => {
    if (filterQuestion === "all") return rows;
    return rows.filter((r) => r.question_ids.includes(filterQuestion));
  }, [rows, filterQuestion]);

  // CSV export
  const exportCSV = () => {
    const headers = ["Fecha", "Usuario", "Email", "Workout", "Pregunta", "Respuesta"];
    const csvRows: string[] = [headers.join(",")];

    for (const row of rows) {
      for (const [qId, response] of Object.entries(row.responses)) {
        const values = Array.isArray(response) ? response : [response];
        const formatted = values.map(formatValue).join(" | ");
        csvRows.push([
          `"${formatDate(row.created_at)}"`,
          `"${row.user_name}"`,
          `"${row.user_email}"`,
          `"${row.day_label}"`,
          `"${QUESTION_LABELS[qId] || qId}"`,
          `"${formatted}"`,
        ].join(","));
      }
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftory-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
        <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold" style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}>
            Feedback
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "#8A8A8E" }}>
            {summary.total} respuestas de usuarios
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-medium transition-colors disabled:opacity-40"
          style={{ background: "rgba(199,91,57,0.15)", color: "#C75B39" }}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Summary cards */}
      {summary.total > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(summary.valueCounts).map(([qId, counts]) => (
            <div
              key={qId}
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="font-mono uppercase text-xs mb-3" style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}>
                {QUESTION_LABELS[qId] || qId}
              </p>
              <div className="space-y-1.5">
                {Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([val, count]) => {
                    const pct = summary.questionCounts[qId] > 0 ? (count / summary.questionCounts[qId]) * 100 : 0;
                    return (
                      <div key={val} className="flex items-center gap-2">
                        <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: "rgba(199,91,57,0.4)", minWidth: 4 }}
                          />
                        </div>
                        <span className="font-body text-xs shrink-0" style={{ color: "#FAF8F5", minWidth: 80 }}>
                          {formatValue(val)}
                        </span>
                        <span className="font-mono text-xs shrink-0" style={{ color: "#8A8A8E", fontSize: 10 }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4" style={{ color: "#8A8A8E" }} />
        <select
          value={filterQuestion}
          onChange={(e) => setFilterQuestion(e.target.value)}
          className="rounded-lg px-3 py-2 font-body text-sm"
          style={{ background: "rgba(255,255,255,0.05)", color: "#FAF8F5", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <option value="all">Todas las preguntas</option>
          <option value="session_mood">Mood de la sesión</option>
          <option value="hardest_block">Bloque más fuerte</option>
          <option value="preferred_duration">Ritmo de la sesión</option>
          <option value="discomfort_flags">Molestias</option>
        </select>
        <span className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
          <MessageSquare className="h-10 w-10 mb-3" style={{ color: "#8A8A8E" }} />
          <p className="font-body text-sm" style={{ color: "#8A8A8E" }}>
            No hay feedback todavía
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th className="font-mono uppercase text-xs px-4 py-3" style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}>Fecha</th>
                <th className="font-mono uppercase text-xs px-4 py-3" style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}>Usuario</th>
                <th className="font-mono uppercase text-xs px-4 py-3" style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}>Workout</th>
                <th className="font-mono uppercase text-xs px-4 py-3" style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}>Respuestas</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="transition-colors cursor-pointer"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: isExpanded ? "rgba(199,91,57,0.05)" : "transparent" }}
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  >
                    <td className="font-body text-sm px-4 py-3" style={{ color: "#FAF8F5" }}>
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-body text-sm" style={{ color: "#FAF8F5" }}>{row.user_name}</p>
                      <p className="font-mono text-xs" style={{ color: "#8A8A8E", fontSize: 10 }}>{row.user_email}</p>
                    </td>
                    <td className="font-body text-sm px-4 py-3" style={{ color: "#FAF8F5" }}>
                      {row.day_label}
                    </td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <div className="space-y-2">
                          {Object.entries(row.responses).map(([qId, response]) => {
                            const values = Array.isArray(response) ? response : [response];
                            return (
                              <div key={qId}>
                                <p className="font-mono uppercase text-xs mb-0.5" style={{ color: "#8A8A8E", fontSize: 9, letterSpacing: "0.08em" }}>
                                  {QUESTION_LABELS[qId] || qId}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {values.map((v, i) => (
                                    <span
                                      key={i}
                                      className="rounded-full px-2 py-0.5 font-body text-xs"
                                      style={{
                                        background: v.startsWith("other:") ? "rgba(201,169,110,0.15)" : "rgba(199,91,57,0.15)",
                                        color: v.startsWith("other:") ? "#C9A96E" : "#C75B39",
                                        fontSize: 11,
                                      }}
                                    >
                                      {formatValue(v)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {Object.values(row.responses).flat().slice(0, 3).map((v, i) => (
                            <span
                              key={i}
                              className="rounded-full px-2 py-0.5 font-body text-xs"
                              style={{ background: "rgba(199,91,57,0.1)", color: "#C75B39", fontSize: 11 }}
                            >
                              {formatValue(String(v))}
                            </span>
                          ))}
                          {Object.values(row.responses).flat().length > 3 && (
                            <span className="font-mono text-xs" style={{ color: "#8A8A8E", fontSize: 10 }}>
                              +{Object.values(row.responses).flat().length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" style={{ color: "#8A8A8E" }} />
                      ) : (
                        <ChevronDown className="h-4 w-4" style={{ color: "#8A8A8E" }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
