import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useWorkoutData, type WorkoutSetData, type ExerciseGroup } from "@/hooks/useWorkoutData";
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Zap,
  HeartPulse,
  Leaf,
  Check,
  X,
  Loader2,
} from "lucide-react";
import Layout from "@/components/Layout";

/* ── Block metadata ── */
const BLOCK_META: Record<string, { icon: React.ElementType; accentColor: string; label: string }> = {
  warmup:  { icon: Sun,        accentColor: "#C9A96E", label: "CALENTAMIENTO" },
  working: { icon: Zap,        accentColor: "#B8622F", label: "FUERZA" },
  backoff: { icon: Leaf,       accentColor: "#8A8A8E", label: "SCULPT" },
  emom:    { icon: HeartPulse, accentColor: "#B8622F", label: "FINISHER" },
  amrap:   { icon: HeartPulse, accentColor: "#B8622F", label: "FINISHER" },
};

interface SessionBlock {
  id: string;
  label: string;
  setType: string;
  accentColor: string;
  icon: React.ElementType;
  exercises: { name: string; setsCount: number; reps: number | null; weight: number | null; tempo: string | null; rpe: number | null }[];
  totalSets: number;
  estimatedTime: string;
  format?: string;
}

function buildBlocks(sets: WorkoutSetData[]): SessionBlock[] {
  if (!sets.length) return [];

  // Group consecutive sets by set_type
  const groups: { type: string; sets: WorkoutSetData[] }[] = [];
  let current: { type: string; sets: WorkoutSetData[] } | null = null;

  for (const s of sets) {
    if (!current || current.type !== s.set_type) {
      current = { type: s.set_type, sets: [s] };
      groups.push(current);
    } else {
      current.sets.push(s);
    }
  }

  return groups.map((g, i) => {
    const meta = BLOCK_META[g.type] || BLOCK_META.working;

    // Group exercises within this block
    const exerciseMap = new Map<string, { name: string; sets: WorkoutSetData[] }>();
    for (const s of g.sets) {
      const key = s.exercise_id;
      if (!exerciseMap.has(key)) {
        exerciseMap.set(key, { name: s.exercise?.name || "Exercise", sets: [] });
      }
      exerciseMap.get(key)!.sets.push(s);
    }

    const exercises = Array.from(exerciseMap.values()).map((ex) => ({
      name: ex.name,
      setsCount: ex.sets.length,
      reps: ex.sets[0]?.planned_reps ?? null,
      weight: ex.sets[0]?.planned_weight ?? null,
      tempo: ex.sets[0]?.planned_tempo ?? null,
      rpe: ex.sets[0]?.planned_rpe ?? null,
    }));

    const avgRest = g.sets[0]?.planned_rest_seconds ?? 60;
    const repsPerSet = g.sets[0]?.planned_reps ?? 10;
    const timePerSet = (repsPerSet * 3 + avgRest) / 60;
    const totalMins = Math.round(timePerSet * g.sets.length);

    return {
      id: `${g.type}-${i}`,
      label: meta.label,
      setType: g.type,
      accentColor: meta.accentColor,
      icon: meta.icon,
      exercises,
      totalSets: g.sets.length,
      estimatedTime: `${Math.max(totalMins, 3)}-${Math.max(totalMins + 3, 5)} min`,
      format: g.type === "emom" ? "EMOM" : g.type === "amrap" ? "AMRAP" : undefined,
    };
  });
}

export default function SessionSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workoutId = searchParams.get("workoutId") || undefined;
  const fromWorkout = searchParams.get("from") === "workout";
  const { startWorkout, workoutActive } = useApp();

  const { workout, sets, loading } = useWorkoutData(workoutId);

  const [expanded, setExpanded] = useState<string[]>(["working-1"]);

  const toggleBlock = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (!workoutActive) startWorkout();
    navigate(workoutId ? `/workout/${workoutId}` : "/home", { replace: true });
  };

  const handleClose = () => {
    if (fromWorkout && workoutId) {
      navigate(`/workout/${workoutId}`, { replace: true });
    } else {
      navigate("/home");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 bg-background">
        <p className="text-muted-foreground font-body text-sm">No se encontró el workout.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-body font-medium text-sm">← Volver</button>
      </div>
    );
  }

  const blocks = buildBlocks(sets);
  const totalExercises = new Set(sets.map((s) => s.exercise_id)).size;
  const estDuration = workout.estimated_duration ?? 55;
  const completedSetsCount = sets.filter((s) => s.is_completed).length;

  const Wrapper = fromWorkout ? "div" : Layout;
  const wrapperProps = fromWorkout ? { className: "min-h-screen bg-background" } : {};

  return (
    <Wrapper {...wrapperProps}>
      <div className="animate-fade-up px-5 pt-14 pb-32">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {workout.day_label}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body font-light">
              Sesión completa · {estDuration}-{estDuration + 10} min · {blocks.length} bloques
            </p>
          </div>
          {fromWorkout && (
            <button onClick={handleClose} className="press-scale flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <X className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>

        {/* Blocks */}
        <div className="mt-6 flex flex-col gap-3">
          {blocks.map((block) => {
            const Icon = block.icon;
            const isExpanded = expanded.includes(block.id);

            return (
              <button
                key={block.id}
                onClick={() => toggleBlock(block.id)}
                className="press-scale w-full text-left bg-card transition-all duration-300"
                style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="flex overflow-hidden" style={{ borderRadius: 12 }}>
                  <div className="w-1 shrink-0" style={{ backgroundColor: block.accentColor }} />
                  <div className="flex-1 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${block.accentColor}15` }}>
                          <Icon className="h-4.5 w-4.5" style={{ color: block.accentColor }} />
                        </div>
                        <div>
                          <p className="font-display text-sm font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                            {block.label}
                          </p>
                          <p className="text-xs text-muted-foreground font-body font-normal">
                            {block.exercises.length} ejercicio{block.exercises.length !== 1 ? "s" : ""} · {block.estimatedTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.format && (
                          <span
                            className="px-2 py-1 font-mono"
                            style={{ backgroundColor: `${block.accentColor}15`, color: block.accentColor, borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}
                          >
                            {block.format}
                          </span>
                        )}
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded exercises */}
                    {isExpanded && (
                      <div className="mt-4 animate-fade-up">
                        {/* Grouping label */}
                        {block.exercises.length > 1 && (block.setType === "warmup" || block.setType === "backoff") && (
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="px-2 py-0.5 font-mono uppercase"
                              style={{
                                backgroundColor: `${block.accentColor}15`,
                                color: block.accentColor,
                                borderRadius: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.08em",
                              }}
                            >
                              {block.setType === "warmup"
                                ? block.exercises.length >= 3 ? "TRI-SET · CIRCUITO" : "SUPERSET · CIRCUITO"
                                : "SUPERSET"}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}

                        <div className="relative flex flex-col gap-0">
                          {/* Vertical connector line for grouped exercises */}
                          {block.exercises.length > 1 && (block.setType === "warmup" || block.setType === "backoff") && (
                            <div
                              className="absolute left-[14px] top-3 bottom-3 w-px"
                              style={{ backgroundColor: `${block.accentColor}30` }}
                            />
                          )}

                          {block.exercises.map((ex, i) => {
                            const isGrouped = block.exercises.length > 1 && (block.setType === "warmup" || block.setType === "backoff");
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-2.5 bg-secondary relative"
                                style={{
                                  borderRadius: isGrouped
                                    ? i === 0 ? "12px 12px 0 0"
                                    : i === block.exercises.length - 1 ? "0 0 12px 12px"
                                    : "0"
                                    : "12px",
                                  marginTop: isGrouped && i > 0 ? 1 : i > 0 ? 8 : 0,
                                }}
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {isGrouped ? (
                                    <div
                                      className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center font-mono relative z-10"
                                      style={{ backgroundColor: `${block.accentColor}20`, color: block.accentColor, fontSize: 9, fontWeight: 700 }}
                                    >
                                      {String.fromCharCode(65 + i)}
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 shrink-0 rounded-full border border-border" />
                                  )}
                                  <span className="text-sm font-body font-normal text-foreground truncate">
                                    {ex.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: "0.05em" }}>
                                    {ex.setsCount}×{ex.reps ?? "?"}
                                  </span>
                                  {ex.weight != null && ex.weight > 0 && (
                                    <span className="font-mono text-xs text-foreground font-medium" style={{ letterSpacing: "0.05em" }}>
                                      {ex.weight} kg
                                    </span>
                                  )}
                                  {ex.tempo && (
                                    <span className="font-mono text-primary" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
                                      {ex.tempo}
                                    </span>
                                  )}
                                  {ex.rpe != null && (
                                    <span className="px-1.5 py-0.5 font-mono" style={{ backgroundColor: `${block.accentColor}15`, color: block.accentColor, borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                                      RPE {ex.rpe}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-4">
        <button
          onClick={handleStart}
          className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
        >
          {workoutActive ? "Volver al workout" : "Comenzar sesión"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </Wrapper>
  );
}
