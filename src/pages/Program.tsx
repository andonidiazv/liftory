import { useNavigate } from "react-router-dom";
import { useProgramData } from "@/hooks/useProgramData";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Leaf } from "lucide-react";

const BLOCK_LABELS: Record<string, string> = {
  accumulation: "PROGRESSIVE OVERLOAD I",
  intensification: "INTENSIFICACIÓN",
  peaking: "PEAK",
  deload: "DELOAD",
  base: "BASE",
};

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function ProgramSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-6">
      <Skeleton className="h-7 w-56 bg-muted" />
      <Skeleton className="h-4 w-40 bg-muted" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export default function Program() {
  const navigate = useNavigate();
  const { program, workouts, loading, getBlockLabel, getWeekWorkouts, getWeekNumbers, todayStr } = useProgramData();

  if (loading) return <Layout><ProgramSkeleton /></Layout>;

  if (!program) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center px-5 pt-32">
          <p className="text-muted-foreground font-body text-center">
            Aún no tienes un programa activo.
          </p>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-6 rounded-xl bg-primary px-8 py-3 font-body text-sm font-medium text-primary-foreground"
          >
            Completar onboarding
          </button>
        </div>
      </Layout>
    );
  }

  const weeks = getWeekNumbers().length > 0
    ? getWeekNumbers()
    : Array.from({ length: program.total_weeks }, (_, i) => i + 1);

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground">{program.name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground font-body">
            Mesociclo 1 · Semana {program.current_week} de {program.total_weeks}
          </p>
          <span
            className="mt-2 inline-block rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider"
            style={{ background: "rgba(199,91,57,0.15)", color: "#C75B39" }}
          >
            {BLOCK_LABELS[program.current_block] ?? program.current_block.toUpperCase()}
          </span>
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekWorkouts = getWeekWorkouts(week);
            const isCurrent = week === program.current_week;

            // Build a map: day index (0=Mon..6=Sun) -> workout
            const dayMap: Record<number, typeof weekWorkouts[0] | null> = {};
            weekWorkouts.forEach((w) => {
              const d = new Date(w.scheduled_date + "T12:00:00");
              const jsDay = d.getDay(); // 0=Sun
              const idx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon
              dayMap[idx] = w;
            });

            return (
              <div
                key={week}
                className="rounded-2xl p-4"
                style={{
                  background: isCurrent ? "rgba(199,91,57,0.04)" : "transparent",
                  border: isCurrent ? "1px solid rgba(199,91,57,0.15)" : "1px solid hsl(var(--border))",
                }}
              >
                {/* Week label */}
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  SEMANA {week} — {BLOCK_LABELS[program.current_block] ?? program.current_block.toUpperCase()}
                </p>

                {/* 7 day squares */}
                <div className="flex items-start justify-between gap-1">
                  {DAY_LETTERS.map((letter, dayIdx) => {
                    const w = dayMap[dayIdx] ?? null;
                    const isToday = w?.scheduled_date === todayStr;
                    const isCompleted = w?.is_completed ?? false;
                    const isRest = w?.is_rest_day ?? false;
                    const shortLabel = w?.day_label
                      ? w.day_label.length > 5
                        ? w.day_label.slice(0, 5)
                        : w.day_label
                      : null;

                    return (
                      <button
                        key={dayIdx}
                        className="flex flex-col items-center gap-1"
                        onClick={() => w && !isRest && navigate(`/workout/${w.id}`)}
                        disabled={!w || isRest}
                      >
                        <span className="font-mono text-[9px] text-muted-foreground">{letter}</span>
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl transition-all"
                          style={{
                            background: isCompleted
                              ? "#C75B39"
                              : isRest
                              ? "rgba(122,139,92,0.2)"
                              : "#2A2A2A",
                            boxShadow: isToday ? "0 0 0 2px #C75B39, 0 0 0 4px rgba(199,91,57,0.2)" : "none",
                          }}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : isRest ? (
                            <Leaf className="h-3.5 w-3.5" style={{ color: "#7A8B5C" }} />
                          ) : null}
                        </div>
                        {shortLabel && (
                          <span className="font-mono text-[8px] text-muted-foreground truncate w-11 text-center">
                            {shortLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
