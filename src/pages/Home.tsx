import { useNavigate } from "react-router-dom";
import { Leaf, ChevronRight, ChevronLeft, Flame, Dumbbell, Trophy, Check } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useNavigableHome } from "@/hooks/useNavigableHome";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress"; // kept for potential future use
import MonthCalendarSheet from "@/components/home/MonthCalendarSheet";
import PrimeWeeklyReset from "@/components/home/PrimeWeeklyReset";

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
  const selectedDayOfWeek = new Date(selectedDate + "T12:00:00").getDay(); // 0 = Sunday
  const isSunday = selectedDayOfWeek === 0;

  // Format selected date for display
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateDisplay = isSelectedToday
    ? new Date().toLocaleDateString("es-MX", { weekday: "long" })
    : selectedDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });

  return (
    <Layout>
      <div className="px-5 pt-14 pb-20 space-y-8">
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

        {/* 2. Workout Card / PRIME Weekly Reset */}
        {programInfo ? (
          isSunday ? (
            <PrimeWeeklyReset selectedDate={selectedDate} />
          ) : workout ? (
            <div
              className="rounded-2xl p-5 cursor-pointer"
              style={{
                background: "hsl(var(--card))",
                borderTop: "1px solid hsl(var(--border))",
                borderRight: "1px solid hsl(var(--border))",
                borderBottom: "1px solid hsl(var(--border))",
                borderLeft: `4px solid ${workout.is_rest_day ? "#7A8B5C" : "hsl(var(--primary))"}`,
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
                    <Check className="h-4 w-4" style={{ color: "#7A8B5C" }} />
                  </div>
                  <div>
                    <p className="font-display text-[20px] font-semibold text-foreground">{workout.day_label}</p>
                    <p className="text-[13px] text-muted-foreground font-body">Sesión completada</p>
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
                        <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
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
            { icon: <Flame className="h-3.5 w-3.5" />, label: `${quickStats.streak} días streak` },
            { icon: <Dumbbell className="h-3.5 w-3.5" />, label: `${quickStats.totalCompleted} workouts` },
            { icon: <Trophy className="h-3.5 w-3.5" />, label: `${quickStats.monthPRs} PRs este mes` },
          ].map((s) => (
            <div
              key={s.label}
              className="flex-1 rounded-[20px] px-3 py-2.5 flex flex-col items-center gap-1"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <span className="text-primary">{s.icon}</span>
              <span className="font-mono text-[10px] text-muted-foreground text-center">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* 5. Mesocycle Workout Tracker */}
        {programInfo && (() => {
          const trainingDays = allWorkouts.filter(w => !w.isRestDay);
          const completedCount = trainingDays.filter(w => w.isCompleted).length;
          const totalCount = trainingDays.length;
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          // Group training days by week
          const weekGroups: { weekNumber: number; days: typeof trainingDays }[] = [];
          const weekMap = new Map<number, typeof trainingDays>();
          for (const d of trainingDays) {
            const arr = weekMap.get(d.weekNumber) || [];
            arr.push(d);
            weekMap.set(d.weekNumber, arr);
          }
          Array.from(weekMap.entries())
            .sort((a, b) => a[0] - b[0])
            .forEach(([wn, days]) => weekGroups.push({ weekNumber: wn, days }));

          // SVG ring constants
          const ringSize = 72;
          const strokeW = 5;
          const radius = (ringSize - strokeW) / 2;
          const circumference = 2 * Math.PI * radius;
          const dashOffset = circumference - (pct / 100) * circumference;

          return (
            <div
              className="rounded-2xl px-5 py-6"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* Top row: ring + info */}
              <div className="flex items-center gap-5">
                {/* Progress ring */}
                <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
                  <svg width={ringSize} height={ringSize} className="-rotate-90">
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={strokeW}
                    />
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-[18px] font-bold tabular-nums text-foreground">
                      {completedCount}
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                      /{totalCount}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[15px] font-semibold text-foreground">
                    Mesociclo
                  </p>
                  <span
                    className="inline-block mt-1 rounded-full px-2.5 py-0.5 font-mono text-[8px] uppercase tracking-[1.5px]"
                    style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" }}
                  >
                    {BLOCK_LABELS[programInfo.current_block] ?? programInfo.current_block.toUpperCase()}
                  </span>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    Semana {programInfo.current_week} de {programInfo.total_weeks}
                  </p>
                </div>
              </div>

              {/* Separator */}
              <div className="mt-5 mb-4" style={{ height: 1, background: "hsl(var(--border))" }} />

              {/* Dot grid — centered */}
              <div className="flex flex-col items-center gap-[10px]">
                {weekGroups.map(({ weekNumber, days }) => (
                  <div key={weekNumber} className="flex items-center gap-[7px]">
                    <span
                      className="font-mono text-[8px] uppercase tracking-wider text-right text-muted-foreground"
                      style={{ width: 16 }}
                    >
                      {weekNumber}
                    </span>
                    {days.map((d, i) => {
                      const isToday = d.date === todayStr;
                      const isPast = d.date < todayStr && !d.isCompleted;
                      return (
                        <div
                          key={i}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: d.isCompleted
                              ? "hsl(var(--primary))"
                              : isToday
                              ? "hsl(var(--primary) / 0.12)"
                              : isPast
                              ? "hsl(var(--primary) / 0.05)"
                              : "hsl(var(--secondary))",
                            border: isToday && !d.isCompleted
                              ? "1.5px solid hsl(var(--primary))"
                              : "none",
                            boxShadow: d.isCompleted
                              ? "0 0 8px hsl(var(--primary) / 0.25)"
                              : "none",
                            transition: "all 0.3s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
}
