import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useWorkoutData, WorkoutSetData } from "@/hooks/useWorkoutData";
import { ChevronLeft, ChevronRight, Sun, Zap, HeartPulse, Leaf, Loader2 } from "lucide-react";
import heroImage from "@/assets/briefing-hero.jpg";

/* ── Block metadata for visual styling ── */
const BLOCK_META: Record<string, { icon: typeof Sun; accentFrom: string; accentTo: string; iconColor: string; iconBg: string }> = {
  warmup: { icon: Sun, accentFrom: "#C9A96E", accentTo: "#D4A055", iconColor: "#C9A96E", iconBg: "rgba(201,169,110,0.08)" },
  working: { icon: Zap, accentFrom: "#B8622F", accentTo: "#D4784A", iconColor: "#B8622F", iconBg: "rgba(184,98,47,0.08)" },
  emom: { icon: HeartPulse, accentFrom: "#B8622F", accentTo: "#E09060", iconColor: "#B8622F", iconBg: "rgba(184,98,47,0.08)" },
  backoff: { icon: Leaf, accentFrom: "#8A8A8E", accentTo: "#9B9690", iconColor: "#8A8A8E", iconBg: "rgba(138,138,142,0.08)" },
};

/* ── Map set_type to LIFTORY block names ── */
const BLOCK_LABELS: Record<string, string> = {
  warmup: "MOVILIDAD",
  working: "FUERZA",
  emom: "FINISHER",
  backoff: "SCULPT",
  amrap: "FINISHER",
};

interface SessionBlock {
  id: string;
  name: string;
  setType: string;
  exerciseCount: number;
  setCount: number;
  estimatedTime: string;
  format?: string;
}

function groupSetsIntoBlocks(sets: WorkoutSetData[]): SessionBlock[] {
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
    const uniqueExercises = new Set(g.sets.map((s) => s.exercise_id));
    const avgRest = g.sets[0]?.planned_rest_seconds ?? 60;
    const repsPerSet = g.sets[0]?.planned_reps ?? 10;
    const timePerSet = (repsPerSet * 3 + avgRest) / 60; // rough mins
    const totalMins = Math.round(timePerSet * g.sets.length);

    return {
      id: `${g.type}-${i}`,
      name: BLOCK_LABELS[g.type] || g.type.toUpperCase(),
      setType: g.type,
      exerciseCount: uniqueExercises.size,
      setCount: g.sets.length,
      estimatedTime: `${Math.max(totalMins, 3)}-${Math.max(totalMins + 3, 5)} min`,
      format: g.type === "emom" ? "EMOM" : g.type === "amrap" ? "AMRAP" : undefined,
    };
  });
}

/* ── Briefing description based on day_label ── */
function getBriefingStatement(dayLabel: string): string {
  const l = dayLabel.toUpperCase();
  if (l.includes("PULL"))
    return "Hoy el foco es tracción y espalda. Controla la fase excéntrica, aprieta en la contracción. Arrancas con movilidad escapular, construyes fuerza con compuestos pesados, defines con aislamiento y cierras con un finisher metabólico.";
  if (l.includes("PRESS") || l.includes("PUSH"))
    return "Hoy el foco es tensión mecánica en pecho y hombros. Controla la bajada, domina el peso. Arrancas con movilidad para preparar articulaciones, construyes fuerza con tempos que transforman cada rep y cierras con recuperación activa.";
  if (l.includes("QUAD") || l.includes("LOWER"))
    return "Hoy toca tren inferior con foco en cuádriceps. Activa glúteos, estabiliza rodillas y empuja con intención. Cada rep cuenta cuando el peso está en tus piernas.";
  if (l.includes("POSTERIOR") || l.includes("HIP"))
    return "Hoy el foco es cadena posterior: isquios, glúteos y espalda baja. Bisagra perfecta, extensión completa. Construye potencia desde la cadera.";
  if (l.includes("UPPER"))
    return "Sesión de tren superior completa. Combina empuje y tracción para un desarrollo simétrico y funcional. Volumen controlado, técnica impecable.";
  if (l.includes("FLOW") || l.includes("MOBILITY"))
    return "Sesión de recuperación activa y movilidad. Respira, mueve, restaura. Tu cuerpo necesita esto tanto como las sesiones de fuerza.";
  if (l.includes("FULL FORCE"))
    return "Sesión de fuerza total: movimientos compuestos pesados que reclutan todo tu cuerpo. Máxima intención en cada repetición.";
  return "Sesión diseñada con la metodología LIFTORY. Movilidad, fuerza, volumen y finisher en un flujo inteligente.";
}

export default function Briefing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startWorkout } = useApp();
  const { profile } = useAuth();
  const workoutId = searchParams.get("workoutId") || undefined;

  const { workout, sets, loading } = useWorkoutData(workoutId);

  const handleStart = () => {
    startWorkout();
    navigate(workoutId ? `/workout/${workoutId}` : "/home", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0D0C0A" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#B8622F" }} />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6" style={{ background: "#0D0C0A" }}>
        <p style={{ color: "#8A8A8E", fontSize: 15 }}>No se encontró el workout.</p>
        <button onClick={() => navigate(-1)} className="font-mono" style={{ color: "#B8622F", fontSize: 13 }}>← Volver</button>
      </div>
    );
  }

  const blocks = groupSetsIntoBlocks(sets);
  const totalSets = sets.length;
  const estDuration = workout.estimated_duration ?? 55;

  return (
    <div className="grain-overlay min-h-screen" style={{ background: "#0D0C0A" }}>
      {/* HERO IMAGE */}
      <div className="relative w-full" style={{ height: "48vh" }}>
        <img src={heroImage} alt="Workout del día" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0" style={{ height: 80, background: "linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)" }} />
        <div className="absolute inset-x-0 bottom-0" style={{ height: "60%", background: "linear-gradient(to top, #0D0C0A 0%, rgba(13,12,10,0.92) 30%, rgba(13,12,10,0.4) 60%, transparent 100%)" }} />

        {/* Nav overlay */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-14">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ChevronLeft className="h-5 w-5" style={{ color: "#FAF8F5" }} />
          </button>
          <div className="font-mono rounded-full px-3 py-1.5" style={{ color: "#FAF8F5", fontSize: 11, letterSpacing: "0.15em", background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {workout.day_label}
          </div>
        </div>

        {/* Content over hero */}
        <div className="absolute inset-x-0 bottom-0 px-6 pb-4 relative z-10">
          <p className="font-mono uppercase" style={{ color: "#B8622F", fontSize: 11, letterSpacing: "2.5px" }}>
            {workout.workout_type.toUpperCase()}
          </p>
          <h1 className="font-display mt-1" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", color: "#FAF8F5", lineHeight: 1.1 }}>
            {workout.day_label}
          </h1>
          <p className="mt-1" style={{ color: "#8A8A8E", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            {totalSets} series · ~{estDuration} min
          </p>
        </div>
      </div>

      {/* PROGRESS BAR (sets completed vs total) */}
      <div className="relative z-10 flex items-center gap-3 px-6 py-3.5">
        <div className="flex-1 overflow-hidden" style={{ height: 4, background: "#1C1C1E", borderRadius: 2 }}>
          <div className="h-full" style={{ width: `${sets.length > 0 ? (sets.filter((s) => s.is_completed).length / sets.length) * 100 : 0}%`, background: "linear-gradient(to right, #B8622F, #C9A96E)", borderRadius: 2 }} />
        </div>
        <span className="font-mono" style={{ color: "#8A8A8E", fontSize: 11, letterSpacing: "0.05em" }}>
          {sets.filter((s) => s.is_completed).length}/{sets.length}
        </span>
      </div>

      {/* STATEMENT CARD */}
      <div className="relative z-10 px-6">
        <div style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.06)", borderRadius: 12, padding: 20 }}>
          <p className="font-serif italic" style={{ color: "#FAF8F5", fontSize: 15, lineHeight: 1.65, fontWeight: 300 }}>
            {getBriefingStatement(workout.day_label)}
          </p>
        </div>
      </div>

      {/* SESSION LABEL */}
      <div className="relative z-10 flex items-center gap-3 px-6 pb-2 pt-6">
        <span className="eyebrow-label">BLOQUES DE SESIÓN</span>
        <div className="flex-1" style={{ height: 1, background: "rgba(250,248,245,0.06)" }} />
        <span className="shrink-0" style={{ color: "#8A8A8E", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 400 }}>
          ~{estDuration} min
        </span>
      </div>

      {/* BLOCK GRID */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 px-6 pb-40 stagger-fade-in">
        {blocks.map((block) => {
          const meta = BLOCK_META[block.setType] || BLOCK_META.working;
          const Icon = meta.icon;

          return (
            <div
              key={block.id}
              className="relative overflow-hidden"
              style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.06)", borderRadius: 12 }}
            >
              <div className="h-[3px] w-full" style={{ background: `linear-gradient(to right, ${meta.accentFrom}, ${meta.accentTo})` }} />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-[38px] w-[38px] items-center justify-center" style={{ background: meta.iconBg, borderRadius: 12 }}>
                    <Icon className="h-[18px] w-[18px]" style={{ color: meta.iconColor }} strokeWidth={1.5} />
                  </div>
                  <span className="font-mono" style={{ color: "#8A8A8E", fontSize: 11, letterSpacing: "0.05em" }}>{block.estimatedTime}</span>
                </div>
                <p className="mt-3 font-display font-bold" style={{ color: "#FAF8F5", fontSize: 14 }}>{block.name}</p>
                <p className="mt-0.5" style={{ color: "#8A8A8E", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                  {block.exerciseCount} ejercicio{block.exerciseCount !== 1 ? "s" : ""} · {block.setCount} series
                </p>
                {block.format && (
                  <span className="font-mono mt-2 inline-block px-2 py-1" style={{ color: "#B8622F", background: "rgba(184,98,47,0.08)", border: "1px solid rgba(184,98,47,0.12)", borderRadius: 4, fontSize: 10 }}>
                    {block.format}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FIXED CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-6 pb-8 pt-4" style={{ background: "linear-gradient(to top, #0D0C0A 60%, transparent)" }}>
        <button
          onClick={handleStart}
          className="press-scale flex w-full items-center justify-center gap-2 py-[18px] font-body font-medium text-white"
          style={{ background: "linear-gradient(to right, #B8622F, #8B4513)", boxShadow: "0 8px 28px rgba(184,98,47,0.3)", fontSize: 15, borderRadius: 12 }}
        >
          Comenzar sesión
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
