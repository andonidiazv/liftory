import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useNavigableHome } from "@/hooks/useNavigableHome";
import { Skeleton } from "@/components/ui/skeleton";
import PrimeWeeklyReset from "@/components/home/PrimeWeeklyReset";
import FirstDayExperience from "@/components/onboarding/FirstDayExperience";
import { useBadgeReviewNotification } from "@/hooks/useBadgeReviewNotification";
import BadgeReviewCelebration from "@/components/celebrations/BadgeReviewCelebration";
import MesocycleClosingCard from "@/components/celebrations/MesocycleClosingCard";
import VipJoinerWelcomeCard from "@/components/celebrations/VipJoinerWelcomeCard";
import PushPermissionPrompt from "@/components/notifications/PushPermissionPrompt";
import { useMesocycleTransition } from "@/hooks/useMesocycleTransition";
import { isVipJoiner } from "@/lib/vip-emails";

/**
 * ATELIER HOME · Phase 1 of the home redesign.
 *
 * One ceremonial entry per day: brand mark → context → today → open.
 * Rich exploration (week navigator, stats, archive) moved out of Home —
 * stats live in /progreso, meso archive + week grid in /programa.
 *
 * Design source: public/home-redesign-atelier-journey.html (screen 02).
 *
 * Variants of the hero, in priority order:
 *  - NextCycleHero    — a new mesocycle is available to start
 *  - NoProgramHero    — user has no active program (pre-onboarding)
 *  - SundayResetHero  — Sundays show the existing PrimeWeeklyReset
 *  - RestDayHero      — today is a planned rest day
 *  - MobilityHero     — today is mobility / active recovery
 *  - SessionHero      — today is a strength training day (the main case)
 *  - NoWorkoutHero    — today has no scheduled workout (between phases)
 */

const PHASE_BY_WEEK = ["BASE", "BASE +", "ACUMULACIÓN", "INTENSIFICACIÓN", "PEAK", "DELOAD"] as const;
function phaseForWeek(week: number | null | undefined): string {
  if (!week || week < 1 || week > 6) return "DELOAD";
  return PHASE_BY_WEEK[week - 1];
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function romanize(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

/** Split "DENSITY DAY" → { top: "Density", bottom: "Day" }.
 *  Single-word labels render as one line (bottom=null). */
function splitDayLabel(label: string): { top: string; bottom: string | null } {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return { top: cap(parts[0]), bottom: null };
  return {
    top: parts.slice(0, -1).map(cap).join(" "),
    bottom: cap(parts[parts.length - 1]),
  };
}

function HomeSkeleton() {
  return (
    <div className="px-8 pt-14 pb-6 flex flex-col" style={{ minHeight: "calc(100dvh - 78px)" }}>
      <div className="flex flex-col items-center gap-1.5">
        <Skeleton className="h-3.5 w-20 bg-muted" />
        <Skeleton className="h-2.5 w-32 bg-muted" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <Skeleton className="h-3 w-24 bg-muted" />
        <Skeleton className="h-2.5 w-20 bg-muted" />
        <Skeleton className="h-20 w-56 bg-muted rounded-md" />
        <Skeleton className="h-px w-9 bg-muted" />
        <Skeleton className="h-3 w-32 bg-muted" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-1.5 w-32 bg-muted rounded-full" />
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
    quickStats,
    loading,
    todayStr,
    showNextCyclePrompt,
    nextCycleInfo,
    transitionToCycle,
    dismissCycle,
    transitioning,
  } = useNavigableHome();

  const displayName = profile?.full_name || "Atleta";

  // Mesocycle closing card — fires on the first Home visit after a meso transition.
  const transition = useMesocycleTransition(user?.id ?? null);

  // First Day Experience onboarding — keyed to user, not program
  const onboardingKey = user ? `liftory_onboarding_seen_${user.id}` : null;
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!loading && programInfo && onboardingKey) {
      const seen = localStorage.getItem(onboardingKey);
      if (seen) return;
      if (user && isVipJoiner(user.email)) {
        localStorage.setItem(onboardingKey, "true");
        return;
      }
      if (quickStats && quickStats.totalCompleted > 0) {
        localStorage.setItem(onboardingKey, "true");
        return;
      }
      localStorage.setItem(onboardingKey, "true");
      setShowOnboarding(true);
    }
  }, [loading, programInfo, onboardingKey, quickStats, user]);

  const handleOnboardingComplete = () => {
    if (onboardingKey) localStorage.setItem(onboardingKey, "true");
    setShowOnboarding(false);
  };

  // VIP joiner welcome
  const vipJoinerKey = user ? `liftory_vip_joiner_welcome_M2_${user.id}` : null;
  const [showVipJoinerWelcome, setShowVipJoinerWelcome] = useState(false);

  useEffect(() => {
    if (!user || !vipJoinerKey) return;
    if (!isVipJoiner(user.email)) return;
    if (localStorage.getItem(vipJoinerKey)) return;
    setShowVipJoinerWelcome(true);
  }, [user, vipJoinerKey]);

  const dismissVipJoinerWelcome = () => {
    if (vipJoinerKey) localStorage.setItem(vipJoinerKey, "true");
    setShowVipJoinerWelcome(false);
  };

  // Build week schedule for FirstDayExperience from weekDays
  const buildWeekSchedule = () => {
    return weekDays.map((day) => {
      let workoutType: string;
      if (day.isRestDay) workoutType = "rest";
      else if (day.workoutType === "mobility") workoutType = "mobility";
      else workoutType = "strength";

      const workoutName = day.workoutLabel || (day.isRestDay ? "DESCANSO" : "ENTRENAMIENTO");
      let muscleGroups = "";
      if (day.isRestDay) {
        muscleGroups = "Recuperacion completa";
      } else if (day.workoutType === "mobility") {
        muscleGroups = "Movilidad, respiracion, recovery";
      } else {
        const label = (day.workoutLabel || "").toUpperCase();
        if (label.includes("PULL")) muscleGroups = "Espalda, biceps, trapecios";
        else if (label.includes("QUAD") || label.includes("LOWER")) muscleGroups = "Cuadriceps, core, estabilidad";
        else if (label.includes("PUSH")) muscleGroups = "Pecho, hombros, triceps";
        else if (label.includes("SHOULDER") || label.includes("ARM")) muscleGroups = "Hombros, biceps, triceps";
        else if (label.includes("HINGE")) muscleGroups = "Cadena posterior, gluteos, isquios";
        else if (label.includes("FULL") || label.includes("TOTAL")) muscleGroups = "Cuerpo completo";
        else muscleGroups = "Fuerza y acondicionamiento";
      }
      return { dayLabel: day.dayLabel, workoutName, workoutType, muscleGroups };
    });
  };

  if (loading) {
    return <Layout><HomeSkeleton /></Layout>;
  }

  const workout = selectedWorkout;
  const isSelectedToday = selectedDate === todayStr;
  const selectedDayOfWeek = new Date(selectedDate + "T12:00:00").getDay();
  const isSunday = selectedDayOfWeek === 0;

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateDisplay = isSelectedToday
    ? new Date().toLocaleDateString("es-MX", { weekday: "long" })
    : selectedDateObj.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });

  // Tomorrow's label for soft preview on rest/mobility days
  const tomorrowDateStr = (() => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const tomorrowDay = weekDays.find(d => d.date === tomorrowDateStr);
  const tomorrowLabel = tomorrowDay
    ? tomorrowDay.isRestDay ? "Descanso" : tomorrowDay.workoutLabel || "Entrenamiento"
    : null;

  // Meso position for the bottom strip
  const currentMesoNum = quickStats.currentMeso ? parseInt(quickStats.currentMeso.replace(/\D/g, ""), 10) : null;

  return (
    <>
      {showOnboarding && programInfo && (
        <FirstDayExperience
          programName={programInfo.name}
          weekSchedule={buildWeekSchedule()}
          onComplete={handleOnboardingComplete}
        />
      )}
      {transition.shouldShow && transition.closingContent && transition.stats && (
        <MesocycleClosingCard
          closingContent={transition.closingContent}
          stats={transition.stats}
          userName={profile?.full_name ?? undefined}
          onContinue={transition.markSeen}
          onSkip={transition.markSeen}
        />
      )}
      {showVipJoinerWelcome && (
        <VipJoinerWelcomeCard
          firstName={(profile?.full_name || "Atleta").split(" ")[0]}
          onStart={dismissVipJoinerWelcome}
          onSkip={dismissVipJoinerWelcome}
        />
      )}
      <BadgeReviewCelebration
        notification={badgeReview}
        onDismiss={dismissBadgeReview}
        onCheckNext={checkNextBadgeReview}
      />
      <PushPermissionPrompt />

      <Layout>
        <div
          className="flex flex-col px-8 pt-14 pb-6"
          style={{ minHeight: "calc(100dvh - 78px)" }}
        >
          {/* Top mark — small LIFTORY + date + first name */}
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="font-display font-bold uppercase"
              style={{ fontSize: 13, letterSpacing: "0.02em", color: "#C4A24E" }}
            >
              LIFTORY
            </span>
            <span
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
            >
              {dateDisplay} · {displayName.split(" ")[0]}
            </span>
          </div>

          {/* Hero — centered, single decision per day */}
          <div className="flex-1 flex flex-col items-center justify-center gap-7 text-center py-10">
            {!programInfo ? (
              <NoProgramHero onStart={() => navigate("/onboarding")} />
            ) : showNextCyclePrompt && nextCycleInfo ? (
              <NextCycleHero
                cycleNumber={nextCycleInfo.cycleNumber}
                transitioning={transitioning}
                onStart={transitionToCycle}
                onDismiss={dismissCycle}
              />
            ) : isSunday ? (
              <PrimeWeeklyReset selectedDate={selectedDate} />
            ) : !workout ? (
              <NoWorkoutHero />
            ) : workout.is_rest_day ? (
              <RestDayHero tomorrowLabel={tomorrowLabel} />
            ) : workout.workout_type === "mobility" ? (
              <MobilityHero
                label={workout.day_label}
                duration={workout.estimated_duration}
                completed={workout.is_completed}
                onOpen={() => navigate(`/workout/${workout.id}`)}
              />
            ) : (
              <SessionHero
                label={workout.day_label}
                phase={phaseForWeek(viewingWeekNumber)}
                week={viewingWeekNumber ?? 1}
                totalWeeks={programInfo.total_weeks}
                duration={workout.estimated_duration}
                setCount={workout.setCount}
                isToday={isSelectedToday}
                completed={workout.is_completed}
                onOpen={() => navigate(`/workout/${workout.id}`)}
              />
            )}
          </div>

          {/* Meso dots — tap to open archive */}
          {currentMesoNum && programInfo && (
            <MesoStrip
              current={currentMesoNum}
              total={6}
              onTap={() => navigate("/program")}
            />
          )}
        </div>
      </Layout>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   HERO SUB-COMPONENTS
   ───────────────────────────────────────────────────────────────────── */

function SessionHero({
  label, phase, week, totalWeeks, duration, setCount, isToday, completed, onOpen,
}: {
  label: string; phase: string; week: number; totalWeeks: number;
  duration: number | null; setCount: number; isToday: boolean; completed: boolean;
  onOpen: () => void;
}) {
  const { top, bottom } = splitDayLabel(label);
  const ctaLabel = completed ? "Ver resumen" : isToday ? "Abrir sesión" : "Ver sesión";
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "#C4A24E" }}
      >
        {phase}
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
      >
        Semana {week} / {totalWeeks}
      </span>

      <h1
        className="font-display"
        style={{ fontWeight: 300, fontSize: 60, letterSpacing: "-0.05em", lineHeight: 0.88, color: "hsl(var(--foreground))" }}
      >
        {top}
        {bottom && <strong className="block" style={{ fontWeight: 700 }}>{bottom}</strong>}
      </h1>

      <div className="h-px" style={{ width: 36, background: "#C4A24E" }} />

      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
      >
        {duration ? `${duration} min · ` : ""}{setCount} sets
      </span>

      {completed ? (
        <p
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2px", color: "#7A8B5C", marginTop: 4 }}
        >
          ✓ Sesión completada
        </p>
      ) : null}

      <button
        onClick={onOpen}
        className="press-scale flex items-center gap-3"
        style={{ paddingTop: 6 }}
      >
        <span
          className="font-display font-semibold uppercase"
          style={{ fontSize: 13, letterSpacing: "0.05em", color: "hsl(var(--foreground))" }}
        >
          {ctaLabel}
        </span>
        <span
          className="flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid #C4A24E",
            boxShadow: completed ? "none" : "0 0 24px rgba(196,162,78,0.35)",
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "#C4A24E" }} />
        </span>
      </button>
    </>
  );
}

function MobilityHero({
  label, duration, completed, onOpen,
}: {
  label: string; duration: number | null; completed: boolean; onOpen: () => void;
}) {
  const { top, bottom } = splitDayLabel(label);
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "#7A8B5C" }}
      >
        Recuperación activa
      </span>
      <h1
        className="font-display"
        style={{ fontWeight: 300, fontSize: 56, letterSpacing: "-0.05em", lineHeight: 0.9, color: "hsl(var(--foreground))" }}
      >
        {top}
        {bottom && <strong className="block" style={{ fontWeight: 700 }}>{bottom}</strong>}
      </h1>
      <div className="h-px" style={{ width: 36, background: "#7A8B5C" }} />
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
      >
        Opcional{duration ? ` · ${duration} min` : ""}
      </span>
      {completed ? (
        <p
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2px", color: "#7A8B5C", marginTop: 4 }}
        >
          ✓ Completada
        </p>
      ) : (
        <button onClick={onOpen} className="press-scale flex items-center gap-3" style={{ paddingTop: 6 }}>
          <span
            className="font-display font-semibold uppercase"
            style={{ fontSize: 13, letterSpacing: "0.05em", color: "hsl(var(--foreground))" }}
          >
            Abrir sesión
          </span>
          <span
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #7A8B5C" }}
          >
            <ChevronRight className="h-3.5 w-3.5" style={{ color: "#7A8B5C" }} />
          </span>
        </button>
      )}
    </>
  );
}

function RestDayHero({ tomorrowLabel }: { tomorrowLabel: string | null }) {
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "#7A8B5C" }}
      >
        Descanso
      </span>
      <h1
        className="font-display text-center"
        style={{ fontWeight: 300, fontSize: 52, letterSpacing: "-0.05em", lineHeight: 0.9, color: "hsl(var(--foreground))" }}
      >
        Día de<br />
        <strong style={{ fontWeight: 700 }}>recuperación</strong>
      </h1>
      <div className="h-px" style={{ width: 36, background: "#7A8B5C" }} />
      <p
        className="font-body italic max-w-[260px] leading-snug"
        style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
      >
        El cuerpo se adapta cuando descansas. Hoy creces.
      </p>
      {tomorrowLabel && (
        <p
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
        >
          Mañana · <span style={{ color: "hsl(var(--foreground))" }}>{tomorrowLabel}</span>
        </p>
      )}
    </>
  );
}

function NoWorkoutHero() {
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "hsl(var(--muted-foreground))" }}
      >
        Sin sesión hoy
      </span>
      <h1
        className="font-display"
        style={{ fontWeight: 300, fontSize: 52, letterSpacing: "-0.05em", lineHeight: 0.9, color: "hsl(var(--foreground))" }}
      >
        Día <strong style={{ fontWeight: 700 }}>libre</strong>
      </h1>
      <div className="h-px" style={{ width: 36, background: "hsl(var(--border))" }} />
      <p
        className="font-body italic max-w-[260px] leading-snug"
        style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
      >
        Descansa o explora tu programa.
      </p>
    </>
  );
}

function NoProgramHero({ onStart }: { onStart: () => void }) {
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "#C4A24E" }}
      >
        Bienvenido
      </span>
      <h1
        className="font-display"
        style={{ fontWeight: 300, fontSize: 48, letterSpacing: "-0.05em", lineHeight: 0.95, color: "hsl(var(--foreground))" }}
      >
        Tu primer<br /><strong style={{ fontWeight: 700 }}>capítulo</strong>
      </h1>
      <div className="h-px" style={{ width: 36, background: "#C4A24E" }} />
      <p
        className="font-body italic max-w-[260px] leading-snug"
        style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
      >
        Completa el onboarding para recibir tu plan personalizado.
      </p>
      <button
        onClick={onStart}
        className="press-scale flex items-center gap-3"
        style={{ paddingTop: 6 }}
      >
        <span
          className="font-display font-semibold uppercase"
          style={{ fontSize: 13, letterSpacing: "0.05em", color: "hsl(var(--foreground))" }}
        >
          Comenzar
        </span>
        <span
          className="flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid #C4A24E",
            boxShadow: "0 0 24px rgba(196,162,78,0.35)",
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "#C4A24E" }} />
        </span>
      </button>
    </>
  );
}

function NextCycleHero({
  cycleNumber, transitioning, onStart, onDismiss,
}: {
  cycleNumber: number; transitioning: boolean;
  onStart: () => void; onDismiss: () => void;
}) {
  const previousCycle = cycleNumber - 1;
  // Cycle-specific celebration title rotation (preserved from the original Home).
  const cycleTitle =
    previousCycle === 1 ? "Más fuerte que cuando empezaste."
    : previousCycle === 2 ? "Esto ya es disciplina, no motivación."
    : previousCycle === 3 ? "El hierro ya te conoce."
    : `Ciclo ${previousCycle} cerrado.`;
  return (
    <>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 10, letterSpacing: "3px", color: "#C4A24E" }}
      >
        Ciclo {romanize(previousCycle)} · cerrado
      </span>
      <h1
        className="font-display max-w-[300px]"
        style={{ fontWeight: 300, fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1.0, color: "hsl(var(--foreground))" }}
      >
        <strong style={{ fontWeight: 700 }}>{cycleTitle}</strong>
      </h1>
      <div className="h-px" style={{ width: 36, background: "#C4A24E" }} />
      <p
        className="font-body italic max-w-[260px] leading-snug"
        style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
      >
        Ciclo {romanize(cycleNumber)} está listo. Tus datos del anterior quedan guardados.
      </p>
      <button
        onClick={onStart}
        disabled={transitioning}
        className="press-scale flex items-center gap-3 disabled:opacity-60"
        style={{ paddingTop: 6 }}
      >
        <span
          className="font-display font-semibold uppercase"
          style={{ fontSize: 13, letterSpacing: "0.05em", color: "hsl(var(--foreground))" }}
        >
          {transitioning ? "Preparando…" : `Empezar ciclo ${romanize(cycleNumber)}`}
        </span>
        <span
          className="flex items-center justify-center"
          style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "1px solid #C4A24E",
            boxShadow: "0 0 24px rgba(196,162,78,0.35)",
          }}
        >
          {transitioning
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#C4A24E" }} />
            : <ChevronRight className="h-3.5 w-3.5" style={{ color: "#C4A24E" }} />}
        </span>
      </button>
      <button
        onClick={onDismiss}
        disabled={transitioning}
        className="font-body underline disabled:opacity-60"
        style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: -8 }}
      >
        Ahora no
      </button>
    </>
  );
}

function MesoStrip({
  current, total, onTap,
}: { current: number; total: number; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="press-scale flex flex-col items-center gap-3 py-2 mx-auto"
      aria-label="Abrir archivo de mesociclos"
    >
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const isDone = n < current;
          const isActive = n === current;
          return (
            <span
              key={i}
              style={{
                width: isActive ? 24 : 6,
                height: 6,
                borderRadius: isActive ? 3 : 999,
                background: isActive
                  ? "#C4A24E"
                  : isDone
                    ? "hsl(var(--muted-foreground))"
                    : "hsl(var(--border))",
                boxShadow: isActive ? "0 0 10px rgba(196,162,78,0.6)" : "none",
                transition: "all 0.3s ease",
              }}
            />
          );
        })}
      </div>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "3px", color: "hsl(var(--muted-foreground))" }}
      >
        Mesociclo <span style={{ color: "hsl(var(--foreground))" }}>{romanize(current)}</span> de {romanize(total)}
      </span>
    </button>
  );
}
