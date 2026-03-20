import { useNavigate } from "react-router-dom";
import { Leaf, ChevronRight, ChevronLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useNavigableHome } from "@/hooks/useNavigableHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import MonthCalendarSheet from "@/components/home/MonthCalendarSheet";

const BLOCK_LABELS: Record<string, string> = {
  accumulation: "PROGRESSIVE OVERLOAD",
  intensification: "INTENSIFICACIÓN",
  peaking: "PEAK",
  deload: "DELOAD",
  base: "BASE",
};

function HomeSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-6">
      <Skeleton className="h-8 w-48 bg-muted" />
      <Skeleton className="h-4 w-36 bg-muted" />
      <Skeleton className="h-44 w-full rounded-2xl bg-muted" />
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-full bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    programInfo,
    selectedDate,
    selectedWorkout,
    weekDays,
    viewingWeekNumber,
    quickStats,
    allWorkouts,
    minDate,
    maxDate,
    loading,
    todayStr,
    selectDay,
    goToPrevWeek,
    goToNextWeek,
    canGoPrev,
    canGoNext,
  } = useNavigableHome();

  const displayName = profile?.full_name || "Atleta";

  if (loading) {
    return <Layout><HomeSkeleton /></Layout>;
  }

  const workout = selectedWorkout;
  const isSelectedToday = selectedDate === todayStr;

  // Format selected date for display
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateDisplay = isSelectedToday
    ? new Date().toLocaleDateString("es-MX", { weekday: "long" })
    : selectedDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 space-y-8">
        {/* 1. Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Hola, {displayName.split(" ")[0]}
          </h1>
          {programInfo && (
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[2.5px] text-primary">
              {programInfo.name}
            </p>
          )}
        </div>

        {/* 2. Workout Card */}
        {programInfo ? (
          workout ? (
            <div
              className="rounded-2xl p-5 border-l-4 cursor-pointer"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderLeftColor: workout.is_rest_day ? "#7A8B5C" : "hsl(var(--primary))",
                borderLeftWidth: 4,
                opacity: workout.is_completed ? 0.8 : 1,
              }}
              onClick={() => !workout.is_completed && navigate(`/workout/${workout.id}`)}
            >
              {workout.is_rest_day ? (
                <>
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4" style={{ color: "#7A8B5C" }} />
                    <span className="font-display text-[20px] font-semibold text-foreground">
                      LIFTORY FLOW
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground font-body">
                    Movilidad + Recovery
                  </p>
                </>
              ) : workout.is_completed ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(122,139,92,0.2)" }}>
                    <span style={{ color: "#7A8B5C" }}>✓</span>
                  </div>
                  <div>
                    <p className="font-display text-[20px] font-semibold text-foreground">{workout.day_label}</p>
                    <p className="text-[13px] text-muted-foreground font-body">Sesión completada ✓</p>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-[20px] font-semibold text-foreground">
                    {workout.day_label}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted-foreground font-body">
                    {dateDisplay} · ~{workout.estimated_duration ?? "—"} min · {workout.setCount} sets
                  </p>
                  {workout.coach_note && (
                    <p className="mt-2 text-[12px] text-muted-foreground font-body italic truncate">
                      {workout.coach_note}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/workout/${workout.id}`); }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-[14px] font-semibold text-primary-foreground"
                  >
                    {isSelectedToday ? "EMPEZAR SESIÓN" : "VER SESIÓN"} <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <p className="font-display text-[16px] font-semibold text-foreground">Sin workout {isSelectedToday ? "hoy" : "este día"}</p>
              <p className="mt-1 text-[13px] text-muted-foreground font-body">Descansa o consulta tu programa.</p>
            </div>
          )
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="font-display text-[18px] font-semibold text-foreground">Comienza tu programa</p>
            <p className="mt-2 text-[13px] text-muted-foreground font-body">
              Completa el onboarding para recibir tu plan personalizado.
            </p>
            <button
              onClick={() => navigate("/onboarding")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display text-[15px] font-semibold text-primary-foreground"
            >
              Comienza tu programa <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 3. Week Navigation */}
        <div className="space-y-2">
          {/* Week label + arrows */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevWeek}
              disabled={!canGoPrev}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">
              {viewingWeekNumber != null && programInfo
                ? `Semana ${viewingWeekNumber} de ${programInfo.total_weeks}`
                : "Semana"}
            </span>
            <button
              onClick={goToNextWeek}
              disabled={!canGoNext}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-20 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day circles + calendar button */}
          <div className="flex items-center gap-1">
            <div className="flex flex-1 items-center justify-between">
              {weekDays.map((day, i) => {
                const isSelected = day.date === selectedDate;
                return (
                  <button
                    key={i}
                    disabled={!day.isEnabled}
                    onClick={() => day.isEnabled && selectDay(day.date)}
                    className="flex flex-col items-center gap-1.5 transition-all"
                    style={{ opacity: day.isEnabled ? 1 : 0.3 }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                      style={{
                        background: day.isCompleted
                          ? "hsl(var(--primary))"
                          : "transparent",
                        border: day.isCompleted
                          ? "none"
                          : isSelected && !day.isToday
                          ? "2px solid hsl(var(--accent))"
                          : day.isToday
                          ? "2px solid hsl(var(--primary))"
                          : "2px solid hsl(var(--border))",
                        boxShadow: day.isToday
                          ? "0 0 0 3px hsl(var(--primary) / 0.2)"
                          : isSelected && !day.isToday
                          ? "0 0 0 3px hsl(var(--accent) / 0.2)"
                          : "none",
                      }}
                    >
                      {day.isCompleted ? (
                        <span className="text-sm font-bold text-primary-foreground">✓</span>
                      ) : day.isRestDay ? (
                        <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <span className={`text-xs font-body ${
                          day.isToday ? "text-primary font-semibold" : isSelected ? "text-accent font-semibold" : "text-muted-foreground"
                        }`}>
                          {day.dayLabel}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {day.dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Calendar button */}
            <MonthCalendarSheet
              allWorkouts={allWorkouts}
              selectedDate={selectedDate}
              todayStr={todayStr}
              minDate={minDate}
              maxDate={maxDate}
              onSelectDay={selectDay}
            />
          </div>
        </div>

        {/* 4. Quick Stats */}
        <div className="flex gap-2">
          {[
            { emoji: "🔥", label: `${quickStats.streak} días streak` },
            { emoji: "💪", label: `${quickStats.totalCompleted} workouts` },
            { emoji: "🏆", label: `${quickStats.monthPRs} PRs este mes` },
          ].map((s) => (
            <div
              key={s.label}
              className="flex-1 rounded-[20px] px-3 py-2 text-center"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {s.emoji} {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* 5. Mesocycle Progress */}
        {programInfo && (
          <div className="space-y-2">
            <p className="text-[13px] text-muted-foreground font-body">
              Semana {programInfo.current_week} de {programInfo.total_weeks} · Mesociclo 1
            </p>
            <Progress
              value={(programInfo.current_week / programInfo.total_weeks) * 100}
              className="h-2"
              style={{ background: "#2A2A2A" }}
            />
            <span
              className="inline-block rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-wider"
              style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))" }}
            >
              {BLOCK_LABELS[programInfo.current_block] ?? programInfo.current_block.toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </Layout>
  );
}
