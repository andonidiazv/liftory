import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData, type WorkoutSetData, type ExerciseGroup, type SupersetGroup } from "@/hooks/useWorkoutData";
import { useApp } from "@/context/AppContext";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Check,
  Clock,
  Info,
  List,
  ArrowUp,
  Loader2,
  Leaf,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRestDisplay(seconds: number) {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m}:00`;
  }
  return `${seconds}s`;
}

function parseTempo(tempo: string | null): string {
  if (!tempo) return "";
  const parts = tempo.split(/[.\-]/);
  if (parts.length !== 4) return tempo;
  const labels = ["bajando", "abajo", "subiendo", "arriba"];
  return parts.map((p, i) => `${p}s ${labels[i]}`).join(" · ");
}

interface SetInputs {
  weight: string;
  reps: string;
  rpe: string;
  rir: string;
}

export default function Workout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    workout,
    exerciseGroups,
    supersetGroups,
    cooldownGroups,
    cooldownCompleted,
    loading,
    saving,
    weightUnit,
    allSetsCompleted,
    completeSet,
    finishWorkout,
    getLastBestWeight,
  } = useWorkoutData(id);

  const {
    workoutElapsed,
    workoutActive,
    startWorkout,
    endWorkout,
    restTimerActive,
    restTimeRemaining,
    startRestTimer,
    skipRestTimer,
  } = useApp();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseView, setExerciseView] = useState<"ficha" | "execution">("ficha");
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [setInputs, setSetInputs] = useState<Record<string, SetInputs>>({});
  const [exerciseCompleteFlash, setExerciseCompleteFlash] = useState(false);
  const [finishNotes, setFinishNotes] = useState("");
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showCooldown, setShowCooldown] = useState(false);
  const [cooldownSkipped, setCooldownSkipped] = useState(false);
  const [cooldownTimers, setCooldownTimers] = useState<Record<string, number>>({});
  const [activeCooldownTimer, setActiveCooldownTimer] = useState<string | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start workout timer on mount
  useEffect(() => {
    if (!workoutActive && workout && !workout.is_completed) {
      startWorkout();
    }
  }, [workout, workoutActive, startWorkout]);

  // Reset on exercise change
  useEffect(() => {
    setActiveSetId(null);
    setExerciseView("ficha");
  }, [currentExerciseIndex]);

  if (loading) {
    return (
      <div className="grain-overlay flex min-h-screen flex-col bg-background px-5 pt-14">
        <Skeleton className="h-6 w-48 bg-muted" />
        <Skeleton className="mt-4 h-4 w-32 bg-muted" />
        <Skeleton className="mt-8 h-64 w-full rounded-xl bg-muted" />
        <Skeleton className="mt-4 h-40 w-full rounded-xl bg-muted" />
      </div>
    );
  }

  if (!workout || exerciseGroups.length === 0) {
    return (
      <div className="grain-overlay flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <p className="text-muted-foreground font-body">No se encontró este workout.</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-body font-medium">
          Volver al inicio
        </button>
      </div>
    );
  }

  const currentGroup = exerciseGroups[currentExerciseIndex];
  const currentExercise = currentGroup.exercise;
  const currentSets = currentGroup.sets;

  const totalSets = exerciseGroups.reduce((acc, g) => acc + g.sets.length, 0);
  const completedSetsCount = exerciseGroups.reduce(
    (acc, g) => acc + g.sets.filter((s) => s.is_completed).length,
    0
  );
  const progress = totalSets > 0 ? completedSetsCount / totalSets : 0;

  // Compute superset/circuit grouping for current exercise using supersetGroups
  const getGroupingInfo = (idx: number) => {
    const group = exerciseGroups[idx];
    if (!group) return null;
    // Find which supersetGroup contains this exerciseGroup
    let flatIdx = 0;
    for (const sg of supersetGroups) {
      for (let gi = 0; gi < sg.groups.length; gi++) {
        if (flatIdx === idx) {
          if (sg.type === "single") return null;
          return {
            label: sg.label,
            position: gi,
            count: sg.groups.length,
            letter: String.fromCharCode(65 + gi),
            supersetGroup: sg,
          };
        }
        flatIdx++;
      }
    }
    return null;
  };

  const groupingInfo = getGroupingInfo(currentExerciseIndex);

  // Find the superset group for the current exercise to manage flow
  const getCurrentSupersetGroup = (): SupersetGroup | null => {
    let flatIdx = 0;
    for (const sg of supersetGroups) {
      for (let gi = 0; gi < sg.groups.length; gi++) {
        if (flatIdx === currentExerciseIndex && sg.type !== "single") {
          return sg;
        }
        flatIdx++;
      }
    }
    return null;
  };

  const currentSupersetGroup = getCurrentSupersetGroup();

  const allCurrentExerciseDone = currentSets.every((s) => s.is_completed);
  const nextPendingSet = currentSets.find((s) => !s.is_completed);

  const nextExerciseGroup = currentExerciseIndex < exerciseGroups.length - 1
    ? exerciseGroups[currentExerciseIndex + 1]
    : null;

  const getInputs = (set: WorkoutSetData): SetInputs => {
    if (setInputs[set.id]) return setInputs[set.id];
    const rirDefault = set.planned_rpe != null ? String(Math.max(0, 10 - set.planned_rpe)) : "";
    // Weight: use planned if > 0, else try last best weight, else empty
    const plannedW = set.planned_weight ?? 0;
    const lastBest = getLastBestWeight(set.exercise_id, set.planned_reps);
    const weightDefault = plannedW > 0 ? String(plannedW) : lastBest != null ? String(lastBest) : "";
    return {
      weight: weightDefault,
      reps: String(set.planned_reps ?? ""),
      rpe: String(set.planned_rpe ?? ""),
      rir: set.planned_rir != null ? String(set.planned_rir) : rirDefault,
    };
  };

  const updateInput = (setId: string, field: keyof SetInputs, value: string) => {
    const set = currentSets.find((s) => s.id === setId);
    if (!set) return;
    const current = getInputs(set);
    let updated = { ...current, [field]: value };
    // Auto-compute RIR from RPE
    if (field === "rpe") {
      const rpe = parseFloat(value);
      if (!isNaN(rpe)) updated.rir = String(Math.max(0, 10 - rpe));
    }
    setSetInputs((prev) => ({ ...prev, [setId]: updated }));
  };

  const handleCompleteSet = async (set: WorkoutSetData) => {
    const inputs = getInputs(set);
    const result = await completeSet(set.id, {
      actual_weight: parseFloat(inputs.weight) || 0,
      actual_reps: parseInt(inputs.reps) || 0,
      actual_rpe: parseFloat(inputs.rpe) || 0,
      actual_rir: parseInt(inputs.rir) || 0,
    });

    if (!result) return;

    setActiveSetId(null);

    // Check if all sets for this exercise are done
    const updatedSets = currentSets.map((s) =>
      s.id === set.id ? { ...s, is_completed: true } : s
    );
    const allDone = updatedSets.every((s) => s.is_completed);

    if (allDone) {
      setExerciseCompleteFlash(true);
      setTimeout(() => setExerciseCompleteFlash(false), 2000);
    } else {
      // Start rest timer
      const restSec = set.planned_rest_seconds ?? 90;
      startRestTimer(restSec);
    }
  };

  const handleFinish = async () => {
    const ok = await finishWorkout(finishNotes);
    if (ok) {
      endWorkout();
      navigate(`/workout-complete/${id}`, { replace: true });
    }
  };

  const goNext = () => {
    if (currentExerciseIndex < exerciseGroups.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };
  const goPrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const restTimerTotal = currentSets.find((s) => s.id === activeSetId)?.planned_rest_seconds ?? 90;

  const isAbovePlanned = (set: WorkoutSetData, actualWeight: number) => {
    return set.planned_weight != null && actualWeight > set.planned_weight;
  };

  const setTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      warmup: "bg-warning/20 text-warning",
      working: "bg-primary/20 text-primary",
      amrap: "bg-destructive/20 text-destructive",
      emom: "bg-accent/20 text-accent",
      backoff: "bg-primary/15 text-primary",
      superset: "bg-primary/15 text-primary",
      cooldown: "bg-muted text-muted-foreground",
      cardio: "bg-accent/20 text-accent",
    };
    return colors[type] || "bg-secondary text-secondary-foreground";
  };

  return (
    <div className="grain-overlay flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14 relative">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display" style={{ fontSize: 12, fontWeight: 800, letterSpacing: "-0.04em", color: "#333333" }}>
              LIFTORY
            </span>
            <div>
              <p className="font-display text-sm font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                {workout.day_label}
              </p>
              <p className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: "0.05em" }}>
                {formatTime(workoutElapsed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
              <List className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={() => allSetsCompleted ? setShowFinishModal(true) : handleFinish()}
              className="press-scale flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-body font-medium text-foreground"
            >
              <Pause className="h-3.5 w-3.5" /> Terminar
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="relative z-10 mt-1 text-muted-foreground text-right font-mono" style={{ fontSize: 10, letterSpacing: "0.15em" }}>
          {currentExerciseIndex + 1}/{exerciseGroups.length} ejercicios
        </p>
      </div>

      {/* Rest Timer Fullscreen Takeover */}
      {restTimerActive && (
        <div className="grain-overlay fixed inset-0 z-[60] flex flex-col items-center justify-center" style={{ backgroundColor: "#080808" }}>
          <div className="relative z-10 flex flex-col items-center">
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 14, letterSpacing: "4px", fontWeight: 500 }}>
              Descanso
            </p>
            <div className="relative mt-6">
              <svg className="h-64 w-64 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1C1C1E" strokeWidth="3" />
                <defs>
                  <linearGradient id="restGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#B8622F" />
                    <stop offset="100%" stopColor="#C9A96E" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#restGradient)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - restTimeRemaining / (restTimerTotal || 90))}
                  className="transition-all duration-1000 linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold leading-none" style={{ fontSize: 96, color: "#FAF8F5", textShadow: "0 0 40px rgba(184,98,47,0.2)" }}>
                  {formatTime(restTimeRemaining)}
                </span>
              </div>
            </div>
            {nextExerciseGroup && (
              <p className="mt-8 text-base text-muted-foreground font-body font-light">
                Siguiente: <span className="font-medium text-foreground">{nextExerciseGroup.exercise.name}</span>
              </p>
            )}
            <button onClick={skipRestTimer} className="mt-8 text-sm font-body font-medium text-primary">
              Saltar descanso →
            </button>
          </div>
        </div>
      )}

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowFinishModal(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-foreground">Finalizar sesión</h3>
            <textarea
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder="Notas de la sesión (opcional)..."
              className="mt-4 w-full rounded-xl bg-secondary p-4 text-sm text-foreground font-body placeholder:text-muted-foreground outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleFinish}
              disabled={saving}
              className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Finalizar workout
            </button>
          </div>
        </div>
      )}

      {/* Exercise content */}
      <div className="flex-1 relative z-10">
        {exerciseView === "ficha" ? (
          <div className="animate-fade-up px-5 mt-4 pb-6 flex flex-col flex-1 stagger-fade-in">
            {/* Superset container with terracotta sidebar */}
            {currentSupersetGroup ? (
              <div className="flex gap-3">
                {/* Terracotta sidebar */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  {/* Superset label */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "hsl(var(--primary))" }}>
                      {currentSupersetGroup.label} · CIRCUITO
                    </span>
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>
                  {/* All exercises in superset */}
                  {currentSupersetGroup.groups.map((sg, sgIdx) => {
                    const isCurrentInGroup = sg.exercise.id === currentExercise.id;
                    const letter = String.fromCharCode(65 + sgIdx);
                    return (
                      <div
                        key={sg.exercise.id}
                        className={`card-fbb transition-all ${isCurrentInGroup ? "ring-1 ring-primary" : "opacity-70"}`}
                        onClick={() => {
                          // Navigate to this exercise in the superset
                          const globalIdx = exerciseGroups.findIndex((g) => g.exercise.id === sg.exercise.id);
                          if (globalIdx >= 0) setCurrentExerciseIndex(globalIdx);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold" style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                            {letter}
                          </span>
                          <h3 className="font-display text-[16px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                            {sg.exercise.name}
                          </h3>
                        </div>
                        <p className="mt-1 ml-8 text-xs text-muted-foreground font-body">
                          {sg.sets.length} sets × {sg.sets[0]?.planned_reps ?? "—"} reps
                        </p>
                        {sg.exercise.coaching_cue && (
                          <p className="mt-1 ml-8 font-serif italic text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.3 }}>
                            {sg.exercise.coaching_cue}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {/* Rest info for superset */}
                  <p className="text-xs text-muted-foreground font-body text-center">
                    Descanso: {formatRestDisplay(currentSets[0]?.planned_rest_seconds ?? 60)} después de completar {currentSupersetGroup.label.toLowerCase()}
                  </p>
                </div>
              </div>
            ) : (
              /* Normal single exercise ficha */
              <div className="card-fbb flex-1">
                {groupingInfo && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold" style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                      {groupingInfo.letter}
                    </span>
                    <span className="font-mono uppercase text-primary" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                      {groupingInfo.label} · {groupingInfo.position + 1}/{groupingInfo.count}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <h2 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
                  {currentExercise.name}
                </h2>

                {currentExercise.default_tempo && (
                  <>
                    <div className="mt-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-mono text-lg font-medium text-primary" style={{ letterSpacing: "0.05em" }}>
                        Tempo: {currentExercise.default_tempo}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                      {parseTempo(currentExercise.default_tempo)}
                    </p>
                  </>
                )}

                {currentExercise.primary_muscles && currentExercise.primary_muscles.length > 0 && (
                  <div className="mt-5">
                    <p className="text-label-tech text-foreground">Músculos</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {currentExercise.primary_muscles.map((m) => (
                        <span key={m} className="pill">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {currentExercise.coaching_cue && (
                  <div className="mt-5">
                    <p className="text-label-tech text-foreground">Coaching cue</p>
                    <p className="mt-2 font-serif italic text-muted-foreground" style={{ fontSize: 15, lineHeight: 1.4 }}>
                      {currentExercise.coaching_cue}
                    </p>
                  </div>
                )}

                {currentExercise.founder_notes && (
                  <div className="mt-5">
                    <p className="text-label-tech text-foreground">Notas del coach</p>
                    <p className="mt-2 text-sm text-muted-foreground font-body font-light">
                      {currentExercise.founder_notes}
                    </p>
                  </div>
                )}

                {currentExercise.equipment_required && currentExercise.equipment_required.length > 0 && (
                  <div className="mt-5">
                    <p className="text-label-tech text-foreground">Equipo</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {currentExercise.equipment_required.map((e) => (
                        <span key={e} className="pill">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setExerciseView("execution");
                if (nextPendingSet) setActiveSetId(nextPendingSet.id);
              }}
              className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
            >
              Iniciar ejercicio
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="animate-fade-up flex flex-col flex-1">
            {/* Video area */}
            <div className="relative" style={{ height: "50vh" }}>
              {currentExercise.video_url ? (
                <video
                  src={currentExercise.video_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: "#0D0C0A", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                    <Play className="h-7 w-7 text-white/80 ml-0.5" />
                  </div>
                  <span className="mt-3 text-xs text-white/40 font-body">Video demo</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-[60px]" style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
            </div>

              <div className="px-5 -mt-3 pb-6 relative z-10">
              {/* Superset indicator bar at top when in superset */}
              {currentSupersetGroup && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                  <span className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(var(--primary))" }}>
                    {currentSupersetGroup.label}
                  </span>
                  <div className="flex gap-1">
                    {currentSupersetGroup.groups.map((sg, sgIdx) => {
                      const isCurrent = sg.exercise.id === currentExercise.id;
                      const letter = String.fromCharCode(65 + sgIdx);
                      return (
                        <button
                          key={sg.exercise.id}
                          onClick={() => {
                            const globalIdx = exerciseGroups.findIndex((g) => g.exercise.id === sg.exercise.id);
                            if (globalIdx >= 0) setCurrentExerciseIndex(globalIdx);
                          }}
                          className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                            isCurrent ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 h-px bg-primary/20" />
                </div>
              )}

              <div className={`${currentSupersetGroup ? "flex gap-3" : ""}`}>
                {/* Terracotta sidebar in execution */}
                {currentSupersetGroup && (
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 flex-1 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                  </div>
                )}
                <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {groupingInfo && (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold shrink-0" style={{ backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
                      {groupingInfo.letter}
                    </span>
                  )}
                  <div>
                    {groupingInfo && (
                      <span className="font-mono uppercase text-primary block" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
                        {groupingInfo.label} · {groupingInfo.position + 1}/{groupingInfo.count}
                      </span>
                    )}
                    <h3 className="font-display text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                      {currentExercise.name}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setExerciseView("ficha")} className="flex items-center gap-1 text-xs text-primary font-body font-medium">
                  <Info className="h-3.5 w-3.5" /> Ficha
                </button>
              </div>

              {currentExercise.coaching_cue && (
                <p className="mt-1 font-serif italic text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.3 }}>
                  {currentExercise.coaching_cue}
                </p>
              )}

              {/* Exercise complete flash */}
              {exerciseCompleteFlash && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl py-3" style={{ background: "rgba(60,179,113,0.12)", border: "1px solid rgba(60,179,113,0.3)" }}>
                  <Check className="h-5 w-5" style={{ color: "#3CB371" }} />
                  <span className="font-body text-sm font-semibold" style={{ color: "#3CB371" }}>Ejercicio completado</span>
                </div>
              )}

              {/* Interactive Set Table */}
              <div className="mt-4">
                <div className="grid grid-cols-[36px_44px_1fr_52px_44px_44px_38px] gap-1 px-1 mb-2">
                  <span className="text-label-tech text-muted-foreground">Set</span>
                  <span className="text-label-tech text-muted-foreground">Tipo</span>
                  <span className="text-label-tech text-muted-foreground">Peso</span>
                  <span className="text-label-tech text-muted-foreground">Reps</span>
                  <span className="text-label-tech text-muted-foreground">RPE</span>
                  <span className="text-label-tech text-muted-foreground">RIR</span>
                  <span></span>
                </div>
                {currentSets.map((set, setIndex) => {
                  const completed = set.is_completed;
                  const isActive = activeSetId === set.id && !completed;
                  const isEditable = !completed; // All non-completed sets are editable
                  const isNext = set.id === nextPendingSet?.id;
                  const inputs = getInputs(set);

                  const displayWeight = completed ? String(set.actual_weight ?? inputs.weight) : inputs.weight;
                  const displayReps = completed ? String(set.actual_reps ?? inputs.reps) : inputs.reps;
                  const displayRpe = completed ? String(set.actual_rpe ?? inputs.rpe) : inputs.rpe;
                  const displayRir = completed ? String(set.actual_rir ?? "—") : inputs.rir;

                  const actualW = completed ? (set.actual_weight ?? 0) : 0;
                  const weightAbove = completed && isAbovePlanned(set, actualW);

                  return (
                    <div
                      key={set.id}
                      onClick={() => { if (!completed && !isActive) setActiveSetId(set.id); }}
                      className={`grid grid-cols-[36px_44px_1fr_52px_44px_44px_38px] gap-1 items-center rounded-xl px-1 py-2.5 transition-all cursor-pointer ${
                        completed ? "bg-success/10" : isActive ? "bg-primary/8" : isNext ? "bg-primary/5" : ""
                      }`}
                    >
                      <span className="font-mono text-sm font-medium text-foreground">{setIndex + 1}</span>

                      {/* Type badge */}
                      <span className={`rounded px-1.5 py-0.5 text-center font-mono ${setTypeBadge(set.set_type)}`} style={{ fontSize: 9, letterSpacing: "0.05em" }}>
                        {set.set_type === "working" ? "W" : set.set_type === "warmup" ? "WU" : set.set_type === "superset" ? "SS" : set.set_type === "backoff" ? "SS" : set.set_type === "cooldown" ? "CD" : set.set_type === "cardio" ? "Z2" : set.set_type.toUpperCase().slice(0, 2)}
                      </span>

                      {/* Weight */}
                      {isEditable ? (
                        <input
                          type="number"
                          step={0.5}
                          value={inputs.weight}
                          onChange={(e) => updateInput(set.id, "weight", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm flex items-center gap-1 ${completed ? "font-semibold" : ""}`} style={{
                          color: set.is_pr ? "#D4A843" : weightAbove ? "#3CB371" : completed ? "#FAF8F5" : "#6B6360",
                          letterSpacing: "0.05em",
                        }}>
                          {displayWeight} {weightUnit}
                          {weightAbove && !set.is_pr && <ArrowUp className="h-3 w-3" />}
                          {set.is_pr && (
                            <span className="ml-1 rounded-full px-1.5 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 700, background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>PR</span>
                          )}
                        </span>
                      )}

                      {/* Reps */}
                      {isEditable ? (
                        <input
                          type="number"
                          step={1}
                          value={inputs.reps}
                          onChange={(e) => updateInput(set.id, "reps", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm ${completed ? "font-semibold text-foreground" : ""}`} style={{ color: completed ? "#FAF8F5" : "#6B6360", letterSpacing: "0.05em" }}>
                          {displayReps}
                        </span>
                      )}

                      {/* RPE */}
                      {isEditable ? (
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          max={10}
                          value={inputs.rpe}
                          onChange={(e) => updateInput(set.id, "rpe", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-1.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm ${completed ? "font-semibold text-foreground" : ""}`} style={{ color: completed ? "#FAF8F5" : "#6B6360", letterSpacing: "0.05em" }}>
                          {displayRpe}
                        </span>
                      )}

                      {/* RIR */}
                      {isEditable ? (
                        <input
                          type="number"
                          step={1}
                          min={0}
                          max={5}
                          value={inputs.rir}
                          onChange={(e) => updateInput(set.id, "rir", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-1.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm ${completed ? "font-semibold text-foreground" : ""}`} style={{ color: completed ? "#FAF8F5" : "#6B6360", letterSpacing: "0.05em" }}>
                          {displayRir || "—"}
                        </span>
                      )}

                      {/* Check */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!completed) { setActiveSetId(set.id); handleCompleteSet(set); } }}
                        disabled={completed || saving}
                        className={`press-scale flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                          completed ? "border-success bg-success glow-success" : isActive ? "border-primary" : "border-border"
                        }`}
                      >
                        {saving && isActive ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : completed ? (
                          <Check className="h-3.5 w-3.5 text-success-foreground animate-set-complete" />
                        ) : null}
                      </button>
                    </div>
                  );
                })}

                {/* Rest info */}
                {currentSets[0]?.planned_rest_seconds && (
                  <p className="mt-2 text-xs text-muted-foreground font-body text-center">
                    Descanso: {formatRestDisplay(currentSets[0].planned_rest_seconds)}
                    {currentSupersetGroup && ` después del ${currentSupersetGroup.label.toLowerCase()}`}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={goPrev} disabled={currentExerciseIndex === 0} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-secondary font-display text-sm font-semibold text-foreground disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                {allSetsCompleted ? (
                  <button onClick={() => setShowFinishModal(true)} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground glow-primary">
                    Finalizar workout ✓
                  </button>
                ) : (
                  <button onClick={goNext} disabled={currentExerciseIndex === exerciseGroups.length - 1} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-30">
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {nextExerciseGroup && (
                <div className="mt-3 rounded-xl bg-secondary/50 p-3 flex items-center gap-3">
                  <span className="text-label-tech text-muted-foreground">Siguiente</span>
                  <span className="text-sm font-body font-normal text-foreground">
                    {nextExerciseGroup.exercise.name}
                  </span>
                </div>
              )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
