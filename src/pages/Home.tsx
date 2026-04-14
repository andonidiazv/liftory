import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, ChevronRight, ChevronLeft, Flame, Dumbbell, Trophy, Check, Rocket, Loader2, Wind } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useNavigableHome } from "@/hooks/useNavigableHome";
import { Skeleton } from "@/components/ui/skeleton";
import PrimeWeeklyReset from "@/components/home/PrimeWeeklyReset";
import FirstDayExperience from "@/components/onboarding/FirstDayExperience";
import { useBadgeReviewNotification } from "@/hooks/useBadgeReviewNotification";
import BadgeReviewCelebration from "@/components/celebrations/BadgeReviewCelebration";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

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

function getPhaseDescription(week: number): string {
  if (week === 1) return "Construyendo patrones de movimiento y adaptación. Enfoque en técnica y control.";
  if (week === 2) return "Subiendo volumen con la base técnica establecida. Más series, misma calidad.";
  if (week === 3) return "Acumulando volumen de trabajo. Tu cuerpo se adapta a cargas más exigentes.";
  if (week === 4) return "Subiendo intensidad, bajando repeticiones. Preparando el cuerpo para cargas máximas.";
  if (week === 5) return "Semana de máximo rendimiento. Pocas reps, máxima intensidad. Demuestra tu progreso.";
  return "Semana de recuperación activa. Volumen bajo para que tu cuerpo se regenere y sobrecompense.";
}

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
  const { user, profile } = useAuth();
  const { notification: badgeReview, dismiss: dismissBadgeReview, checkNext: checkNextBadgeReview } = useBadgeReviewNotification();
  const {
    programInfo,
    selectedDate,
    selectedWorkout,
    weekDays,
    viewingWeekNumber,
    currentWeekNumber,
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
    showNextCyclePrompt,
    nextCycleInfo,
    transitionToCycle,
    dismissCycle,
    transitioning,
  } = useNavigableHome();

  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const displayName = profile?.full_name || "Atleta";

  // First Day Experience onboarding — keyed to user, not program
  // Uses localStorage as fast cache + completed workouts as DB-backed fallback
  const onboardingKey = user ? `liftory_onboarding_seen_${user.id}` : null;
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && programInfo && onboardingKey) {
      // Fast check: localStorage says already seen
      const seen = localStorage.getItem(onboardingKey);
      if (seen) return;

      // Fallback check: if user has completed workouts, they've used the app before
      // (handles cache clearing / new device without needing a DB column)
      if (quickStats && quickStats.totalCompleted > 0) {
        localStorage.setItem(onboardingKey, "true");
        return;
      }

      // Truly new user: show FDE and mark as seen
      localStorage.setItem(onboardingKey, "true");
      setShowOnboarding(true);
    }
  }, [loading, programInfo, onboardingKey, quickStats]);

  const handleOnboardingComplete = () => {
    if (onboardingKey) {
      localStorage.setItem(onboardingKey, "true");
    }
    setShowOnboarding(false);
  };

  // Build week schedule for FirstDayExperience from weekDays
  const buildWeekSchedule = () => {
    const DAY_LABELS_FULL = ["D", "L", "M", "M", "J", "V", "S"];
    return weekDays.map((day) => {
      let workoutType: string;
      if (day.isRestDay) {
        workoutType = "rest";
      } else if (day.workoutType === "mobility") {
        workoutType = "mobility";
      } else {
        workoutType = "strength";
      }

      // Derive workout name and muscle groups from workoutLabel
      const workoutName = day.workoutLabel || (day.isRestDay ? "DESCANSO" : "ENTRENAMIENTO");
      let muscleGroups = "";
      if (day.isRestDay) {
        muscleGroups = "Recuperacion completa";
      } else if (day.workoutType === "mobility") {
        muscleGroups = "Movilidad, respiracion, recovery";
      } else {
        // Use workout label to infer muscle groups
        const label = (day.workoutLabel || "").toUpperCase();
        if (label.includes("PULL")) muscleGroups = "Espalda, biceps, trapecios";
        else if (label.includes("QUAD") || label.includes("LOWER")) muscleGroups = "Cuadriceps, core, estabilidad";
        else if (label.includes("PUSH")) muscleGroups = "Pecho, hombros, triceps";
        else if (label.includes("SHOULDER") || label.includes("ARM")) muscleGroups = "Hombros, biceps, triceps";
        else if (label.includes("HINGE")) muscleGroups = "Cadena posterior, gluteos, isquios";
        else if (label.includes("FULL") || label.includes("TOTAL")) muscleGroups = "Cuerpo completo";
        else muscleGroups = "Fuerza y acondicionamiento";
      }

      return {
        dayLabel: day.dayLabel,
        workoutName,
        workoutType,
        muscleGroups,
      };
    });
  };

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
    <>
      {showOnboarding && programInfo && (
        <FirstDayExperience
          programName={programInfo.name}
          weekSchedule={buildWeekSchedule()}
          onComplete={handleOnboardingComplete}
        />
      )}
      <BadgeReviewCelebration
        notification={badgeReview}
        onDismiss={dismissBadgeReview}
        onCheckNext={checkNextBadgeReview}
      />
      <PushPermissionPrompt />
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

        {/* NEW CYCLE PROMPT — with celebration of completed cycle */}
        {showNextCyclePrompt && nextCycleInfo && (() => {
          const completedCycle = nextCycleInfo.cycleNumber - 1;
          const cycleTitle = completedCycle === 1
            ? "6 semanas. Más fuerte que cuando empezaste."
            : completedCycle === 2
            ? "Dos ciclos. Esto ya es disciplina, no motivación."
            : completedCycle === 3
            ? "3 ciclos. El hierro ya te conoce."
            : `Ciclo ${completedCycle}. Esto es lo que te separa.`;
          const subtitles = [
            "Construiste esto rep por rep. Sin atajos.",
            "El trabajo pesado da resultados pesados.",
            "Hiciste lo que dijiste que ibas a hacer.",
            "Nadie te regaló esto. Te lo ganaste.",
            "El hierro no miente. Tu progreso tampoco.",
            "Entrena duro. Recupera bien. Repite.",
          ];
          const subtitle = subtitles[completedCycle % subtitles.length];

          return (
            <div className="space-y-3">
              {/* Celebration card */}
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.08))",
                  border: "1px solid hsl(var(--primary) / 0.25)",
                }}
              >
                <div className="flex justify-center mb-3">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.12)" }}>
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="font-display text-[17px] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  {cycleTitle}
                </p>
                <p className="mt-2 text-[13px] text-muted-foreground font-body">
                  {subtitle}
                </p>
              </div>

              {/* Action card */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--primary) / 0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  <span className="font-display text-[15px] font-semibold text-foreground">
                    Ciclo {nextCycleInfo.cycleNumber} listo
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground font-body">
                  Tus datos del ciclo anterior quedan guardados.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={transitionToCycle}
                    disabled={transitioning}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {transitioning ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Preparando...</>
                    ) : (
                      <>Empezar Ciclo {nextCycleInfo.cycleNumber} <ChevronRight className="h-4 w-4" /></>
                    )}
                  </button>
                  <button
                    onClick={dismissCycle}
                    disabled={transitioning}
                    className="px-4 py-3 rounded-xl font-body text-[13px] text-muted-foreground"
                    style={{ border: "1px solid hsl(var(--border))" }}
                  >
                    Ahora no
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2. Fused Workout + Weekly Progress Card */}
        {programInfo ? (
          isSunday ? (
            <PrimeWeeklyReset selectedDate={selectedDate} />
          ) : (() => {
            // Build this week's training days (non-rest) from weekDays
            const weekTrainingDays = weekDays.filter(d => d.hasWorkout && !d.isRestDay && d.workoutType === "strength");
            const totalTraining = weekTrainingDays.length;
            const completedCount = weekTrainingDays.filter(d => d.isCompleted).length;

            // Find which training day number the selected workout is (1-indexed)
            const selectedTrainingIndex = workout && !workout.is_rest_day
              ? weekTrainingDays.findIndex(d => d.date === selectedDate)
              : -1;
            const trainingDayNumber = selectedTrainingIndex >= 0 ? selectedTrainingIndex + 1 : null;

            // Ring progress: completed / total training days
            const allDone = completedCount >= totalTraining && totalTraining > 0;
            const pct = totalTraining > 0 ? Math.min(Math.round((completedCount / totalTraining) * 100), 100) : 0;
            const rSize = 72;
            const rStroke = 5;
            const rRadius = (rSize - rStroke) / 2;
            const rCirc = 2 * Math.PI * rRadius;
            const rOffset = rCirc - (pct / 100) * rCirc;
            const ringColor = allDone ? "#7A8B5C" : "hsl(var(--primary))";

            // Perfect week banner — only show once per week via sessionStorage
            const perfectWeekKey = `liftory-perfect-week-${viewingWeekNumber}`;
            const perfectWeekSeen = sessionStorage.getItem(perfectWeekKey);
            const showPerfectWeek = allDone && viewingWeekNumber === currentWeekNumber && !perfectWeekSeen;
            if (showPerfectWeek) sessionStorage.setItem(perfectWeekKey, "true");

            // Find tomorrow's workout for previews
            const tomorrowDate = new Date(new Date(selectedDate + "T12:00:00").getTime() + 86400000).toISOString().slice(0, 10);
            const tomorrowDay = weekDays.find(d => d.date === tomorrowDate);
            const tomorrowLabel = tomorrowDay
              ? tomorrowDay.isRestDay ? "Descanso" : tomorrowDay.workoutLabel || "Entrenamiento"
              : null;

            // Rest day messages rotation based on day of week
            const restMessages = [
              "Tu cuerpo se adapta cuando descansas. Hoy creces.",
              "Cada dia de descanso es una inversion en tu rendimiento.",
              "Descansa con la misma intencion con la que entrenas.",
              "Hoy se reparan las fibras que rompiste esta semana.",
              "El descanso no es opcional. Es parte del plan.",
            ];
            const restMsgIndex = new Date(selectedDate + "T12:00:00").getDay() % restMessages.length;

            // Rest day card (fallback for non-Sunday rest days)
            if (workout?.is_rest_day) {
              return (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "hsl(var(--card))",
                    borderLeft: "4px solid #7A8B5C",
                    borderTop: "1px solid hsl(var(--border))",
                    borderRight: "1px solid hsl(var(--border))",
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Leaf className="h-5 w-5" style={{ color: "#7A8B5C" }} />
                    <p className="font-display text-[16px] font-semibold text-foreground">Dia de descanso</p>
                  </div>
                  <p className="mt-2 text-[13px] text-muted-foreground font-body leading-relaxed">
                    {restMessages[restMsgIndex]}
                  </p>
                  {tomorrowLabel && (
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
                      Mañana: {tomorrowLabel}
                    </p>
                  )}
                </div>
              );
            }

            // Active recovery card (LIFTORY FLOW / mobility)
            if (workout?.workout_type === "mobility") {
              return (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "hsl(var(--card))",
                    borderTop: "1px solid hsl(var(--border))",
                    borderRight: "1px solid hsl(var(--border))",
                    borderBottom: "1px solid hsl(var(--border))",
                    borderLeft: "4px solid #7A8B5C",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4" style={{ color: "#7A8B5C" }} />
                    <span className="font-display text-[20px] font-semibold text-foreground">
                      {workout.day_label}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground font-body">
                    Recuperacion activa · Opcional
                  </p>
                  {!workout.is_completed && (
                    <button
                      onClick={() => navigate(`/workout/${workout.id}`)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-[13px] font-semibold"
                      style={{
                        background: "rgba(122, 139, 92, 0.1)",
                        color: "#7A8B5C",
                        border: "1px solid rgba(122, 139, 92, 0.25)",
                      }}
                    >
                      VER SESION <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {workout.is_completed && (
                    <p className="mt-2 text-[12px] font-body flex items-center gap-1.5" style={{ color: "#7A8B5C" }}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Completada
                    </p>
                  )}
                </div>
              );
            }

            // No workout for this day
            if (!workout) {
              return (
                <div className="rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <p className="font-display text-[16px] font-semibold text-foreground">Sin workout {isSelectedToday ? "hoy" : "este día"}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground font-body">Descansa o consulta tu programa.</p>
                </div>
              );
            }

            // Training day card (fused: ring + workout info + progress bars)
            return (
              <>
              {showPerfectWeek && (
                <div
                  className="rounded-2xl p-4 mb-3 text-center sticker-slam"
                  style={{
                    background: "linear-gradient(135deg, rgba(122,139,92,0.08), rgba(122,139,92,0.15))",
                    border: "1px solid rgba(122,139,92,0.3)",
                  }}
                >
                  <p className="font-display text-[16px] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                    SEMANA PERFECTA
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground font-body">
                    Completaste todas las sesiones. Eso es consistencia.
                  </p>
                </div>
              )}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "hsl(var(--card))",
                  border: `1px solid ${allDone ? "rgba(122,139,92,0.3)" : workout.is_completed ? "rgba(122,139,92,0.2)" : "hsl(var(--border))"}`,
                }}
              >
                <div className="p-5 flex items-center gap-5">
                  {/* Progress Ring */}
                  <div className="relative shrink-0" style={{ width: rSize, height: rSize }}>
                    <svg width={rSize} height={rSize} className="-rotate-90">
                      <circle
                        cx={rSize / 2} cy={rSize / 2} r={rRadius}
                        fill="none" stroke="hsl(var(--secondary))" strokeWidth={rStroke}
                      />
                      <circle
                        cx={rSize / 2} cy={rSize / 2} r={rRadius}
                        fill="none" stroke={ringColor} strokeWidth={rStroke}
                        strokeLinecap="round"
                        strokeDasharray={rCirc} strokeDashoffset={rOffset}
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {workout.is_completed ? (
                        <Check className="h-5 w-5" style={{ color: "#7A8B5C" }} strokeWidth={3} />
                      ) : (
                        <span className="font-display text-[20px] font-[800] text-foreground" style={{ letterSpacing: "-0.03em", lineHeight: 1 }}>
                          {completedCount}
                        </span>
                      )}
                      <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                        de {totalTraining}
                      </span>
                    </div>
                  </div>

                  {/* Workout info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[2px] text-muted-foreground mb-1">
                      {workout.is_completed ? "Completado" : "Esta semana"}
                    </p>
                    <h2 className="font-display text-[18px] font-[700] text-foreground" style={{ letterSpacing: "-0.02em" }}>
                      {workout.day_label}
                    </h2>
                    {!workout.is_completed && (
                      <p className="mt-0.5 text-[12px] text-muted-foreground font-body">
                        {dateDisplay} · ~{workout.estimated_duration ?? "—"} min · {workout.setCount} sets
                      </p>
                    )}
                    {workout.is_completed && (
                      <p className="mt-0.5 text-[12px] font-body" style={{ color: "#7A8B5C" }}>
                        Sesión completada
                      </p>
                    )}

                    {/* Training day progress bars */}
                    <div className="flex gap-1 mt-2.5">
                      {weekTrainingDays.map((td, i) => {
                        const isCurrent = td.date === selectedDate;
                        return (
                          <div
                            key={i}
                            className="h-[4px] rounded-full transition-all duration-300"
                            style={{
                              width: 18,
                              background: td.isCompleted
                                ? ringColor
                                : isCurrent && !td.isCompleted
                                ? `color-mix(in srgb, hsl(var(--primary)) 30%, transparent)`
                                : "hsl(var(--secondary))",
                              border: isCurrent && !td.isCompleted
                                ? "1px solid color-mix(in srgb, hsl(var(--primary)) 50%, transparent)"
                                : "none",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="px-5 pb-5">
                  {workout.is_completed ? (
                    <>
                      <button
                        onClick={() => navigate(`/workout/${workout.id}`)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-[13px] font-semibold text-muted-foreground"
                        style={{ border: "1px solid hsl(var(--border))" }}
                      >
                        VER RESUMEN <ChevronRight className="h-4 w-4" />
                      </button>
                      {tomorrowLabel && (
                        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
                          Mañana: {tomorrowLabel}
                        </p>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(`/workout/${workout.id}`)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-[14px] font-semibold text-primary-foreground ${isSelectedToday ? "animate-pulse-glow" : ""}`}
                    >
                      {isSelectedToday ? "EMPEZAR SESIÓN" : "VER SESIÓN"} <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              </>
            );
          })()
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
            <div className="flex items-center gap-2">
              {viewingWeekNumber != null && programInfo ? (
                <>
                  <span className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">
                    SEMANA {viewingWeekNumber}/{programInfo.total_weeks}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold"
                    style={{ background: t.accentBgStrong, color: t.accent }}
                  >
                    {getPhaseForWeek(viewingWeekNumber)}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-[2px] text-muted-foreground">
                  Semana
                </span>
              )}
            </div>
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
                      ) : day.workoutType === "mobility" ? (
                        <Wind className="h-3.5 w-3.5" style={{ color: "rgba(122, 139, 92, 0.55)" }} />
                      ) : day.workoutType === "strength" ? (
                        <Dumbbell className={`h-3.5 w-3.5 ${
                          day.isToday ? "text-primary" : isSelected ? "text-accent" : "text-muted-foreground"
                        }`} />
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

            {/* Calendar button removed — accessible via Programa tab */}
          </div>
        </div>

        {/* 4. Quick Stats */}
        <div className="flex gap-2">
          {[
            { icon: <Flame className={`h-3.5 w-3.5 ${quickStats.streak >= 3 ? "animate-flicker" : ""}`} />, label: quickStats.streak >= 7 ? `${quickStats.streak} días · Imparable` : quickStats.streak >= 3 ? `${quickStats.streak} días · En racha` : `${quickStats.streak} días streak` },
            { icon: <Dumbbell className="h-3.5 w-3.5" />, label: `${quickStats.totalCompleted} workouts` },
            { icon: <Trophy className="h-3.5 w-3.5" />, label: `${quickStats.monthPRs} PRs este mes` },
          ].map((s) => (
            <div
              key={s.label}
              className="flex-1 rounded-2xl px-3 py-2.5 flex flex-col items-center gap-1"
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
          const trainingDays = allWorkouts.filter(w => !w.isRestDay && w.workoutType === "strength");
          const totalCount = trainingDays.length;
          const currentDayNumber = trainingDays.filter(w => w.date <= todayStr).length;
          const pct = totalCount > 0 ? Math.round((currentDayNumber / totalCount) * 100) : 0;

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
                      {currentDayNumber}
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
                    {getPhaseForWeek(currentWeekNumber)}
                  </span>
                  <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                    Semana {currentWeekNumber} de {programInfo.total_weeks}
                  </p>
                  <p className="mt-1.5 font-body text-[11px] text-muted-foreground leading-snug">
                    {getPhaseDescription(currentWeekNumber)}
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
    </>
  );
}
