import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Check, X, Shuffle, Filter, Dumbbell, TrendingDown, ArrowLeftRight, Loader2 } from "lucide-react";

type Axis = "level" | "equipment";
type Status = "pending" | "approved" | "rejected";

interface ExerciseLite {
  id: string;
  name: string;
  name_es: string | null;
  difficulty: string;
  movement_pattern: string;
  movement_plane: string | null;
  primary_muscles: string[] | null;
  equipment_required: string[] | null;
  video_url: string | null;
}

interface Candidate {
  id: string;
  exercise_id: string;
  candidate_exercise_id: string;
  axis: Axis;
  score: number;
  reason: string | null;
  status: Status;
  origin?: ExerciseLite;
  candidate?: ExerciseLite;
  usage_origin?: string;
  usage_candidate?: string;
}

const DIFF_LABEL: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all_levels: "Todos",
};

const AXIS_LABEL: Record<Axis, { title: string; sub: string; Icon: typeof TrendingDown }> = {
  level: { title: "Nivel", sub: "Regresión más accesible", Icon: TrendingDown },
  equipment: { title: "Equipo", sub: "Mismo nivel, otro implemento", Icon: ArrowLeftRight },
};

/** Flags a pair whose purpose profiles disagree — the reviewer should look twice. */
function purposeWarning(a?: string, b?: string): string | null {
  if (!a || !b) return null;
  if (a === b) return null;
  if (a === "sin_uso" || b === "sin_uso") return "Uno nunca ha sido programado";
  if (a === "mixto" || b === "mixto") return null;
  return `Propósito distinto: ${a} vs ${b}`;
}

export default function AdminSwaps() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [axisFilter, setAxisFilter] = useState<Axis | "all">("all");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: cands, error } = await supabase
      .from("substitution_candidates")
      .select("*")
      .eq("status", "pending")
      .order("score", { ascending: false })
      .limit(800);

    if (error) {
      toast({ title: "Error al cargar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const ids = Array.from(
      new Set((cands ?? []).flatMap((c) => [c.exercise_id, c.candidate_exercise_id]))
    );

    const { data: exs } = await supabase
      .from("exercises")
      .select("id,name,name_es,difficulty,movement_pattern,movement_plane,primary_muscles,equipment_required,video_url")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const byId: Record<string, ExerciseLite> = Object.fromEntries((exs ?? []).map((e) => [e.id, e as ExerciseLite]));

    // Usage profile per exercise, read from real programming, so the reviewer
    // can see when a pair would mix a warmup drill with loaded work.
    // One round trip for all of them — the scalar version meant ~1,400.
    const usage: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await supabase.rpc("exercise_usage_profiles", { ex_ids: ids });
      for (const p of (profiles ?? []) as { exercise_id: string; profile: string }[]) {
        usage[p.exercise_id] = p.profile;
      }
    }

    setRows(
      (cands ?? []).map((c) => ({
        ...(c as Candidate),
        origin: byId[c.exercise_id],
        candidate: byId[c.candidate_exercise_id],
        usage_origin: usage[c.exercise_id],
        usage_candidate: usage[c.candidate_exercise_id],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    let r = rows;
    if (axisFilter !== "all") r = r.filter((x) => x.axis === axisFilter);
    if (onlyWarnings) r = r.filter((x) => purposeWarning(x.usage_origin, x.usage_candidate));
    return r;
  }, [rows, axisFilter, onlyWarnings]);

  const grouped = useMemo(() => {
    const g: Record<string, Candidate[]> = {};
    for (const c of visible) (g[c.exercise_id] ??= []).push(c);
    return Object.entries(g);
  }, [visible]);

  const decide = useCallback(async (c: Candidate, status: Exclude<Status, "pending">) => {
    setBusy((s) => new Set(s).add(c.id));
    try {
      if (status === "approved") {
        // Promote into the live table. priority 1 = closest option, 2 = fallback.
        const priority = c.axis === "level" ? 1 : 2;
        const { error: insErr } = await supabase.from("exercise_substitutions").insert({
          exercise_id: c.exercise_id,
          substitute_exercise_id: c.candidate_exercise_id,
          priority,
        });
        if (insErr && !insErr.message.includes("duplicate")) throw insErr;
      }

      const { error } = await supabase
        .from("substitution_candidates")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
        .eq("id", c.id);
      if (error) throw error;

      setRows((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(c.id); return n; });
    }
  }, [user?.id]);

  const decideAll = useCallback(async (list: Candidate[], status: Exclude<Status, "pending">) => {
    for (const c of list) await decide(c, status);
  }, [decide]);

  const counts = useMemo(() => ({
    total: rows.length,
    level: rows.filter((r) => r.axis === "level").length,
    equipment: rows.filter((r) => r.axis === "equipment").length,
    warn: rows.filter((r) => purposeWarning(r.usage_origin, r.usage_candidate)).length,
  }), [rows]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start gap-3 mb-1">
        <Shuffle className="h-6 w-6 text-primary mt-0.5 shrink-0" />
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight">Sustituciones</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Candidatos generados por similitud de patrón, plano, músculos y propósito.
            Nada de aquí llega al atleta hasta que lo apruebes.
          </p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        {[
          { label: "Pendientes", value: counts.total },
          { label: "Eje nivel", value: counts.level },
          { label: "Eje equipo", value: counts.equipment },
          { label: "Con alerta", value: counts.warn, warn: true },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-card px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.warn && s.value > 0 ? "text-[#B8862B]" : ""}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(["all", "level", "equipment"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAxisFilter(a)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border transition-colors ${
              axisFilter === a
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {a === "all" ? "Todos" : AXIS_LABEL[a].title}
          </button>
        ))}
        <button
          onClick={() => setOnlyWarnings((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider border transition-colors ${
            onlyWarnings ? "bg-[#B8862B] text-background border-[#B8862B]" : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Solo alertas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando candidatos…
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-md">
          <Check className="h-8 w-8 text-[#7A8B5C] mx-auto mb-3" />
          <p className="font-display text-lg font-bold">Cola vacía</p>
          <p className="text-sm text-muted-foreground mt-1">
            No hay candidatos pendientes con este filtro.
          </p>
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            node scripts/generate-swap-candidates.mjs
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(([exerciseId, list]) => {
            const origin = list[0].origin;
            return (
              <div key={exerciseId} className="rounded-md border border-border bg-card overflow-hidden">
                {/* Encabezado: el ejercicio original */}
                <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-[15px] leading-snug">
                      {origin?.name ?? "—"}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                      {DIFF_LABEL[origin?.difficulty ?? ""] ?? origin?.difficulty}
                      {" · "}{origin?.movement_pattern}
                      {origin?.movement_plane ? ` · ${origin.movement_plane}` : ""}
                      {list[0].usage_origin ? ` · ${list[0].usage_origin}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => decideAll(list, "approved")}
                      className="px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border border-[#7A8B5C] text-[#7A8B5C] hover:bg-[#7A8B5C] hover:text-background transition-colors"
                    >
                      Aprobar {list.length}
                    </button>
                    <button
                      onClick={() => decideAll(list, "rejected")}
                      className="px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Descartar
                    </button>
                  </div>
                </div>

                {/* Candidatos */}
                <div className="divide-y divide-border">
                  {list.map((c) => {
                    const warn = purposeWarning(c.usage_origin, c.usage_candidate);
                    const { Icon, sub } = AXIS_LABEL[c.axis];
                    const isBusy = busy.has(c.id);
                    return (
                      <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                        <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="font-body text-sm font-semibold">{c.candidate?.name}</p>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {DIFF_LABEL[c.candidate?.difficulty ?? ""] ?? c.candidate?.difficulty}
                            </span>
                            {c.candidate?.video_url && (
                              <span className="font-mono text-[10px] text-primary">video</span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-0.5">
                            {sub} · score {c.score}
                          </p>
                          {c.candidate?.equipment_required?.length ? (
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                              <Dumbbell className="h-3 w-3" />
                              {c.candidate.equipment_required.join(" · ")}
                            </p>
                          ) : null}
                          {warn && (
                            <p className="text-[11px] text-[#B8862B] mt-1.5 font-medium">⚠ {warn}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            disabled={isBusy}
                            onClick={() => decide(c, "approved")}
                            className="h-8 w-8 rounded-md border border-[#7A8B5C] text-[#7A8B5C] flex items-center justify-center hover:bg-[#7A8B5C] hover:text-background transition-colors disabled:opacity-40"
                            aria-label={`Aprobar ${c.candidate?.name}`}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => decide(c, "rejected")}
                            className="h-8 w-8 rounded-md border border-border text-muted-foreground flex items-center justify-center hover:border-[#C0392B] hover:text-[#C0392B] transition-colors disabled:opacity-40"
                            aria-label={`Descartar ${c.candidate?.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
