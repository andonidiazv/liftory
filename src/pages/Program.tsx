import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProgramData } from "@/hooks/useProgramData";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Play,
  Coffee,
  Lock,
  Clock,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  strength: "Fuerza",
  hypertrophy: "Hipertrofia",
  conditioning: "Conditioning",
  mobility: "Movilidad",
  deload: "Deload",
  rest: "Descanso",
};

function ProgramSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-4">
      <Skeleton className="h-7 w-64 bg-muted" />
      <Skeleton className="h-4 w-40 bg-muted" />
      <div className="flex gap-2 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-14 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="space-y-3 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function Program() {
  const navigate = useNavigate();
  const { isPremium } = useAuth();
  const { program, loading, getBlockLabel, getWeekWorkouts, getWeekNumbers, todayStr } = useProgramData();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const premium = isPremium();
  const weeks = getWeekNumbers();

  // Auto-select current week
  const activeWeek = selectedWeek ?? program?.current_week ?? (weeks[0] || 1);
  const weekWorkouts = getWeekWorkouts(activeWeek);

  if (loading) {
    return (
      <Layout>
        <ProgramSkeleton />
      </Layout>
    );
  }

  if (!program) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center px-5 pt-32 stagger-fade-in">
          <p className="text-muted-foreground font-body text-center">
            Aún no tienes un programa activo. Completa el onboarding para generar tu primer plan.
          </p>
          <button
            onClick={() => navigate("/onboarding")}
            className="press-scale mt-6 rounded-xl bg-primary px-8 py-3 font-body text-sm font-medium text-primary-foreground"
          >
            Completar onboarding
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 stagger-fade-in">
        {/* Header */}
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "#F5F0EB" }}>
          {program.name}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            Semana {program.current_week} de {program.total_weeks}
          </p>
          <span
            className="rounded-full px-2.5 py-0.5 font-mono"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#C75B39", background: "rgba(199,91,57,0.15)" }}
          >
            {getBlockLabel(program.current_block)}
          </span>
        </div>

        {/* Week Selector */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(weeks.length > 0 ? weeks : Array.from({ length: program.total_weeks }, (_, i) => i + 1)).map((w) => {
            const isActive = w === activeWeek;
            const isCurrent = w === program.current_week;
            const weekWks = getWeekWorkouts(w);
            const allDone = weekWks.filter((x) => !x.is_rest_day).length > 0 &&
              weekWks.filter((x) => !x.is_rest_day).every((x) => x.is_completed);
            return (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2.5 transition-all"
                style={{
                  background: isActive ? (isCurrent ? "#C75B39" : "#1A1A1A") : "transparent",
                  border: isActive ? "none" : "1px solid #2A2A2A",
                  minWidth: 52,
                }}
              >
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: isActive ? "#fff" : allDone ? "#A89F95" : "#6B6360", letterSpacing: "0.05em" }}
                >
                  S{w}
                </span>
                {allDone && !isActive && <Check className="h-3 w-3" style={{ color: "#3CB371" }} />}
              </button>
            );
          })}
        </div>

        {/* Day Cards */}
        <div className="mt-6 space-y-3">
          {weekWorkouts.length > 0 ? (
            weekWorkouts.map((w) => {
              const isToday = w.scheduled_date === todayStr;
              const dateObj = new Date(w.scheduled_date + "T12:00:00");
              const dayName = dateObj.toLocaleDateString("es-MX", { weekday: "long" });
              const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
              const isPast = w.scheduled_date < todayStr;
              const isSkipped = isPast && !w.is_completed && !w.is_rest_day;

              if (w.is_rest_day) {
                return (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#1A1A1A" }}>
                    <Coffee className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-body text-sm font-medium text-muted-foreground">{dayCapitalized}</span>
                      <span className="ml-2 font-body text-xs text-muted-foreground">Día de recuperación</span>
                    </div>
                  </div>
                );
              }

              if (w.is_completed) {
                return (
                  <div key={w.id} className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid rgba(60,179,113,0.2)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>
                          {dayCapitalized} — {w.day_label}
                        </p>
                        <div className="mt-1.5 flex gap-1.5">
                          <span className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, letterSpacing: "0.05em", color: "#A89F95", background: "rgba(168,159,149,0.1)" }}>
                            {TYPE_LABELS[w.workout_type] ?? w.workout_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(60,179,113,0.15)" }}>
                        <Check className="h-4 w-4" style={{ color: "#3CB371" }} />
                      </div>
                    </div>
                    {w.estimated_duration && (
                      <div className="mt-3 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {w.estimated_duration} min
                      </div>
                    )}
                  </div>
                );
              }

              if (isToday) {
                return (
                  <div key={w.id} className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1.5px solid #C75B39" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-sm font-bold" style={{ color: "#F5F0EB" }}>
                          {dayCapitalized} — {w.day_label}
                        </p>
                        <div className="mt-1.5 flex gap-1.5">
                          <span className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", color: "#C75B39", background: "rgba(199,91,57,0.12)" }}>
                            {TYPE_LABELS[w.workout_type] ?? w.workout_type}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#fff", background: "#C75B39" }}>HOY</span>
                    </div>
                    {w.estimated_duration && (
                      <div className="mt-3 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {w.estimated_duration} min
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/briefing?workoutId=${w.id}`)}
                      className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-body text-sm font-bold text-foreground glow-primary"
                      style={{ background: "#C75B39" }}
                    >
                      <Play className="h-4 w-4 fill-current" /> COMENZAR
                    </button>
                  </div>
                );
              }

              if (isSkipped) {
                return (
                  <div key={w.id} className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid rgba(224,82,82,0.25)" }}>
                    <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>
                      {dayCapitalized} — {w.day_label}
                    </p>
                    <p className="mt-2 font-body text-xs" style={{ color: "#E05252" }}>No completado</p>
                  </div>
                );
              }

              // Future
              return (
                <div key={w.id} className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                  <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>
                    {dayCapitalized} — {w.day_label}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <span className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, letterSpacing: "0.05em", color: "#A89F95", background: "rgba(168,159,149,0.1)" }}>
                      {TYPE_LABELS[w.workout_type] ?? w.workout_type}
                    </span>
                  </div>
                  {w.estimated_duration && (
                    <div className="mt-2 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {w.estimated_duration} min
                    </div>
                  )}
                  {!premium && (
                    <button onClick={() => navigate("/paywall")} className="mt-3 flex items-center gap-1.5 font-body text-xs" style={{ color: "#6B6360" }}>
                      <Lock className="h-3 w-3" /> Desbloquea con Premium
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground font-body">No hay workouts en esta semana.</p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center" style={{ fontSize: 11, color: "#6B6360" }}>
          Tu programa se ajusta automáticamente según tu progreso y recuperación.
        </p>
      </div>
    </Layout>
  );
}
