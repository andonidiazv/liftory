import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProgramData } from "@/hooks/useProgramData";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Leaf, BookOpen } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import MesocycleManual from "@/components/program/MesocycleManual";
import { M2_MANUAL_CONTENT, getMesoForDate } from "@/lib/mesocycle-content";

const BLOCK_LABELS: Record<string, string> = {
  accumulation: "BASE",
  intensification: "ACUMULACIÓN",
  peaking: "PEAK",
  deload: "DELOAD",
  base: "BASE",
};

function getPhaseForWeek(week: number): string {
  if (week === 1) return "BASE";
  if (week === 2) return "BASE +";
  if (week === 3) return "ACUMULACIÓN";
  if (week === 4) return "INTENSIFICACIÓN";
  if (week === 5) return "PEAK";
  return "DELOAD";
}

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
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [showManual, setShowManual] = useState(false);

  // Detect which meso the user is "actively in" using the workout the athlete is about to do.
  // Strategy: prefer the next non-rest workout scheduled on/after today. If none (e.g. program
  // already finished), fall back to the most recent past workout. This is the cleanest signal —
  // it's "what comes next" from the athlete's perspective, regardless of stale skipped workouts.
  const currentMeso = (() => {
    const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local TZ
    const realWorkouts = workouts.filter((w) => !w.is_rest_day);
    if (realWorkouts.length === 0) return null;

    // Next upcoming workout (on/after today)
    const upcoming = realWorkouts
      .filter((w) => w.scheduled_date >= todayStr)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];

    // Fallback: most recent past workout (program ended)
    const recent = realWorkouts
      .filter((w) => w.scheduled_date < todayStr)
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))[0];

    const reference = upcoming ?? recent;
    return reference ? getMesoForDate(reference.scheduled_date) : null;
  })();
  const hasManualForCurrentMeso = currentMeso === "M2"; // Only M2 has manual content for now

  // Scope ALL workout-derived UI (counter, grid, weeks list) to the current meso.
  // Without this, M1 + M2 collide: the counter shows M1+M2 sums (e.g. 17/60), and the
  // grid mixes weeks because M1 W1 and M2 W1 share week_number=1.
  const mesoWorkouts = currentMeso
    ? workouts.filter((w) => getMesoForDate(w.scheduled_date) === currentMeso)
    : workouts;
  const mesoWeekNumbers = Array.from(
    new Set(mesoWorkouts.map((w) => w.week_number))
  ).sort((a, b) => a - b);
  const getMesoWeekWorkouts = (week: number) =>
    mesoWorkouts.filter((w) => w.week_number === week);

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

  const weeks = mesoWeekNumbers.length > 0
    ? mesoWeekNumbers
    : Array.from({ length: program.total_weeks }, (_, i) => i + 1);

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-[22px] font-bold text-foreground">{program.name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground font-body">
            {currentMeso ? `Mesociclo ${currentMeso.replace(/\D/g, "")}` : "Mesociclo"} · Semana {program.current_week} de {program.total_weeks}
          </p>
          <span
            className="mt-2 inline-block rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider"
            style={{ background: t.accentBgStrong, color: t.accent }}
          >
            {getPhaseForWeek(program.current_week)}
          </span>

          {/* Progress bar — scoped to currentMeso so M1 completions don't pollute M2 progress */}
          {(() => {
            const totalWorkouts = mesoWorkouts.filter(w => !w.is_rest_day && w.workout_type === "strength").length;
            const completedWorkouts = mesoWorkouts.filter(w => !w.is_rest_day && w.workout_type === "strength" && w.is_completed).length;
            const pct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
            return (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{completedWorkouts}/{totalWorkouts} sesiones</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--border))" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: "hsl(var(--primary))" }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Manual button — only visible during the current meso's active date range */}
          {hasManualForCurrentMeso && (
            <button
              onClick={() => setShowManual(true)}
              className="press-scale w-full mt-5 flex items-center gap-3 rounded-xl px-4 py-3.5 text-left"
              style={{
                backgroundColor: t.accentBg,
                border: `1px solid ${t.accentBgStrong}`,
              }}
            >
              <BookOpen className="h-4 w-4 shrink-0" style={{ color: t.accent }} />
              <div className="flex-1 min-w-0">
                <p
                  className="font-display text-[13px] font-semibold leading-tight"
                  style={{ color: t.text }}
                >
                  Manual de {currentMeso}
                </p>
                <p
                  className="font-body text-[11px] leading-tight mt-0.5"
                  style={{ color: t.muted }}
                >
                  Ejemplos paso a paso de cada formato
                </p>
              </div>
              <span
                className="font-mono text-[16px] shrink-0"
                style={{ color: t.accent }}
              >
                →
              </span>
            </button>
          )}
        </div>

        {/* Weeks */}
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekWorkouts = getMesoWeekWorkouts(week);
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
                  background: isCurrent ? t.accentBg : "transparent",
                  border: isCurrent ? `1px solid ${t.accentBgStrong}` : `1px solid ${t.border}`,
                }}
              >
                {/* Week label */}
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  SEMANA {week} — {getPhaseForWeek(week)}
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
                              ? t.accent
                              : isRest
                              ? "rgba(122,139,92,0.2)"
                              : t.card,
                            border: isCompleted || isRest ? "none" : `1px solid ${t.border}`,
                            boxShadow: isToday ? `0 0 0 2px ${t.accent}, 0 0 0 4px ${t.accentBgStrong}` : "none",
                          }}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" style={{ color: t.btnText }} />
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

      {/* Manual de M2 modal */}
      {showManual && (
        <MesocycleManual
          content={M2_MANUAL_CONTENT}
          onClose={() => setShowManual(false)}
        />
      )}
    </Layout>
  );
}
