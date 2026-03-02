import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout } from "@/data/workout";
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
} from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRestTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseWeight(w: string): number {
  return parseFloat(w.replace(/[^0-9.]/g, "")) || 0;
}

// Mock PR records for comparison
const PR_RECORDS: Record<string, number> = {
  "bench-press": 80,
  "incline-db-press": 24,
  "cable-fly": 17,
  "shoulder-press": 18,
  "lateral-raise": 10,
  "tricep-pushdown": 22,
};

interface SetInputs {
  weight: string;
  reps: string;
  rpe: string;
  rir: string;
}

export default function Workout() {
  const navigate = useNavigate();
  const {
    currentExerciseIndex,
    setCurrentExercise,
    completeSet,
    getSetData,
    isSetCompleted,
    workoutElapsed,
    restTimerActive,
    restTimeRemaining,
    startRestTimer,
    skipRestTimer,
    endWorkout,
    completedSets,
  } = useApp();

  const [exerciseView, setExerciseView] = useState<"ficha" | "execution">("ficha");
  const [activeSetIndex, setActiveSetIndex] = useState<number | null>(null);
  const [setInputs, setSetInputs] = useState<Record<string, SetInputs>>({});
  const [exerciseCompleteFlash, setExerciseCompleteFlash] = useState(false);

  const exercises = todayWorkout.exercises;
  const currentExercise = exercises[currentExerciseIndex];

  const totalSetsInWorkout = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.sets, 0),
    [exercises]
  );

  const completedSetsCount = completedSets.length;
  const progress = totalSetsInWorkout > 0 ? completedSetsCount / totalSetsInWorkout : 0;

  const setsForCurrentExercise = Array.from(
    { length: currentExercise.sets },
    (_, i) => i
  );

  const allSetsForExerciseComplete = setsForCurrentExercise.every((i) =>
    isSetCompleted(currentExercise.id, i)
  );

  const allWorkoutComplete = exercises.every((ex) =>
    Array.from({ length: ex.sets }, (_, i) => i).every((i) =>
      isSetCompleted(ex.id, i)
    )
  );

  const nextExercise = currentExerciseIndex < exercises.length - 1
    ? exercises[currentExerciseIndex + 1]
    : null;

  const nextSetIndex = setsForCurrentExercise.find(
    (i) => !isSetCompleted(currentExercise.id, i)
  );

  // Auto-open next pending set
  useEffect(() => {
    if (exerciseView === "execution" && nextSetIndex !== undefined && activeSetIndex === null) {
      setActiveSetIndex(nextSetIndex);
    }
  }, [exerciseView, nextSetIndex, activeSetIndex, currentExerciseIndex]);

  // Reset active set on exercise change
  useEffect(() => {
    setActiveSetIndex(null);
  }, [currentExerciseIndex]);

  const getInputKey = (exerciseId: string, setIdx: number) => `${exerciseId}-${setIdx}`;

  const getInputs = (setIdx: number): SetInputs => {
    const key = getInputKey(currentExercise.id, setIdx);
    const rpeVal = currentExercise.rpe.split("-")[0];
    const rirDefault = String(Math.max(0, 10 - Number(rpeVal)));
    return setInputs[key] || {
      weight: currentExercise.weight.replace(/\s*kg/, ""),
      reps: currentExercise.reps,
      rpe: rpeVal,
      rir: rirDefault,
    };
  };

  const updateInput = (setIdx: number, field: keyof SetInputs, value: string) => {
    const key = getInputKey(currentExercise.id, setIdx);
    setSetInputs((prev) => ({
      ...prev,
      [key]: { ...getInputs(setIdx), [field]: value },
    }));
  };

  const handleCompleteSet = (setIndex: number) => {
    const inputs = getInputs(setIndex);
    completeSet(currentExercise.id, setIndex, {
      weight: inputs.weight,
      reps: inputs.reps,
      rpe: inputs.rpe,
      rir: inputs.rir,
    });

    const isLastSet = setIndex === currentExercise.sets - 1;
    const allDoneAfter = setsForCurrentExercise.every((i) =>
      i === setIndex || isSetCompleted(currentExercise.id, i)
    );

    if (allDoneAfter) {
      setExerciseCompleteFlash(true);
      setActiveSetIndex(null);
      setTimeout(() => setExerciseCompleteFlash(false), 2000);
    } else {
      // Advance to next set
      const nextPending = setsForCurrentExercise.find(
        (i) => i !== setIndex && !isSetCompleted(currentExercise.id, i)
      );
      setActiveSetIndex(nextPending ?? null);
      if (!isLastSet) startRestTimer(90);
    }
  };

  const handleFinish = () => {
    endWorkout();
    navigate("/workout-complete", { replace: true });
  };

  const goNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExercise(currentExerciseIndex + 1);
      setExerciseView("ficha");
    }
  };

  const goPrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExercise(currentExerciseIndex - 1);
      setExerciseView("ficha");
    }
  };

  const restTimerTotal = 90;

  const isPR = (exerciseId: string, weightStr: string) => {
    const w = parseFloat(weightStr) || 0;
    const record = PR_RECORDS[exerciseId] || Infinity;
    return w > record;
  };

  const isAbovePlanned = (weightStr: string) => {
    const planned = parseWeight(currentExercise.weight);
    const actual = parseFloat(weightStr) || 0;
    return actual > planned;
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
                {todayWorkout.name}
              </p>
              <p className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: "0.05em" }}>
                {formatTime(workoutElapsed)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/session?from=workout")} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
              <List className="h-4 w-4 text-foreground" />
            </button>
            <button onClick={handleFinish} className="press-scale flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-body font-medium text-foreground">
              <Pause className="h-3.5 w-3.5" /> Terminar
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="relative z-10 mt-1 text-muted-foreground text-right font-mono" style={{ fontSize: 10, letterSpacing: "0.15em" }}>
          {currentExerciseIndex + 1}/{exercises.length} ejercicios
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
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#restGradient)" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - restTimeRemaining / restTimerTotal)} className="transition-all duration-1000 linear" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold leading-none" style={{ fontSize: 96, color: "#FAF8F5", textShadow: "0 0 40px rgba(184,98,47,0.2)" }}>
                  {formatRestTime(restTimeRemaining)}
                </span>
              </div>
            </div>
            {nextExercise && (
              <p className="mt-8 text-base text-muted-foreground font-body font-light">
                Siguiente: <span className="font-medium text-foreground">{nextExercise.name}</span> · {nextExercise.sets}×{nextExercise.reps}
              </p>
            )}
            <button onClick={skipRestTimer} className="mt-8 text-sm font-body font-medium text-primary">
              Saltar descanso →
            </button>
          </div>
        </div>
      )}

      {/* Exercise content */}
      <div className="flex-1 relative z-10">
        {exerciseView === "ficha" ? (
          <div className="animate-fade-up px-5 mt-4 pb-6 flex flex-col flex-1 stagger-fade-in">
            <div className="card-fbb flex-1">
              <h2 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
                {currentExercise.name}
              </h2>

              <div className="mt-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono text-lg font-medium text-primary" style={{ letterSpacing: "0.05em" }}>
                  Tempo: {currentExercise.tempo}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                {currentExercise.tempoExplain}
              </p>

              <div className="mt-5">
                <p className="text-label-tech text-foreground">Músculos</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {currentExercise.muscles.map((m) => (
                    <span key={m} className="pill">{m}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-label-tech text-foreground">Errores comunes</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {currentExercise.commonMistakes.map((m, i) => (
                    <p key={i} className="text-sm text-muted-foreground font-body font-light">• {m}</p>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-label-tech text-foreground">Sustituciones</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {currentExercise.substitutions.map((s) => (
                    <span key={s} className="pill">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setExerciseView("execution")}
              className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
            >
              Iniciar ejercicio
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="animate-fade-up flex flex-col flex-1">
            <div className="relative" style={{ height: "50vh" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: "#0D0C0A", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <Play className="h-7 w-7 text-white/80 ml-0.5" />
                </div>
                <span className="mt-3 text-xs text-white/40 font-body">Video demo</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[60px]" style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
            </div>

            <div className="px-5 -mt-3 pb-6 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  {currentExercise.name}
                </h3>
                <button onClick={() => setExerciseView("ficha")} className="flex items-center gap-1 text-xs text-primary font-body font-medium">
                  <Info className="h-3.5 w-3.5" /> Ficha
                </button>
              </div>

              {/* Exercise complete flash */}
              {exerciseCompleteFlash && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl py-3" style={{ background: "rgba(60,179,113,0.12)", border: "1px solid rgba(60,179,113,0.3)" }}>
                  <Check className="h-5 w-5" style={{ color: "#3CB371" }} />
                  <span className="font-body text-sm font-semibold" style={{ color: "#3CB371" }}>Ejercicio completado</span>
                </div>
              )}

              {/* Interactive Set Table */}
              <div className="mt-4">
                <div className="grid grid-cols-[36px_1fr_52px_44px_44px_38px] gap-1.5 px-1 mb-2">
                  <span className="text-label-tech text-muted-foreground">Set</span>
                  <span className="text-label-tech text-muted-foreground">Peso</span>
                  <span className="text-label-tech text-muted-foreground">Reps</span>
                  <span className="text-label-tech text-muted-foreground">RPE</span>
                  <span className="text-label-tech text-muted-foreground">RIR</span>
                  <span></span>
                </div>
                {setsForCurrentExercise.map((setIdx) => {
                  const completed = isSetCompleted(currentExercise.id, setIdx);
                  const completedData = getSetData(currentExercise.id, setIdx);
                  const isActive = activeSetIndex === setIdx && !completed;
                  const isNext = setIdx === nextSetIndex;
                  const inputs = getInputs(setIdx);

                  const displayWeight = completed ? (completedData?.actualWeight || inputs.weight) : inputs.weight;
                  const displayReps = completed ? (completedData?.actualReps || inputs.reps) : inputs.reps;
                  const displayRpe = completed ? (completedData?.actualRpe || inputs.rpe) : inputs.rpe;
                  const displayRir = completed ? (completedData?.actualRir || "—") : inputs.rir;

                  const weightAbove = completed && isAbovePlanned(displayWeight);
                  const prHit = completed && isPR(currentExercise.id, displayWeight);

                  return (
                    <div
                      key={setIdx}
                      onClick={() => { if (!completed && !isActive) setActiveSetIndex(setIdx); }}
                      className={`grid grid-cols-[36px_1fr_52px_44px_44px_38px] gap-1.5 items-center rounded-xl px-1 py-2.5 transition-all cursor-pointer ${
                        completed ? "bg-success/10" : isActive ? "bg-primary/8" : isNext ? "bg-primary/5" : ""
                      }`}
                    >
                      <span className="font-mono text-sm font-medium text-foreground">{setIdx + 1}</span>

                      {/* Weight */}
                      {isActive ? (
                        <input
                          type="number"
                          step={0.5}
                          value={inputs.weight}
                          onChange={(e) => updateInput(setIdx, "weight", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm flex items-center gap-1 ${
                          completed ? "font-semibold" : ""
                        }`} style={{
                          color: prHit ? "#D4A843" : weightAbove ? "#3CB371" : completed ? "#FAF8F5" : "#6B6360",
                          letterSpacing: "0.05em",
                        }}>
                          {displayWeight} kg
                          {weightAbove && !prHit && <ArrowUp className="h-3 w-3" />}
                          {prHit && (
                            <span className="ml-1 rounded-full px-1.5 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 700, background: "rgba(212,168,67,0.2)", color: "#D4A843" }}>PR</span>
                          )}
                        </span>
                      )}

                      {/* Reps */}
                      {isActive ? (
                        <input
                          type="number"
                          step={1}
                          value={inputs.reps}
                          onChange={(e) => updateInput(setIdx, "reps", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm ${completed ? "font-semibold text-foreground" : ""}`} style={{ color: completed ? "#FAF8F5" : "#6B6360", letterSpacing: "0.05em" }}>
                          {displayReps}
                        </span>
                      )}

                      {/* RPE */}
                      {isActive ? (
                        <input
                          type="number"
                          step={0.5}
                          min={1}
                          max={10}
                          value={inputs.rpe}
                          onChange={(e) => updateInput(setIdx, "rpe", e.target.value)}
                          className="font-mono text-sm text-foreground rounded-lg px-1.5 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", fontSize: 14 }}
                        />
                      ) : (
                        <span className={`font-mono text-sm ${completed ? "font-semibold text-foreground" : ""}`} style={{ color: completed ? "#FAF8F5" : "#6B6360", letterSpacing: "0.05em" }}>
                          {displayRpe}
                        </span>
                      )}

                      {/* RIR */}
                      {isActive ? (
                        <input
                          type="number"
                          step={1}
                          min={0}
                          max={5}
                          placeholder="0-5"
                          value={inputs.rir}
                          onChange={(e) => updateInput(setIdx, "rir", e.target.value)}
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
                        onClick={(e) => { e.stopPropagation(); if (!completed) handleCompleteSet(setIdx); }}
                        disabled={completed}
                        className={`press-scale flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                          completed ? "border-success bg-success glow-success" : "border-border"
                        }`}
                      >
                        {completed && (
                          <Check className="h-3.5 w-3.5 text-success-foreground animate-set-complete" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <button onClick={goPrev} disabled={currentExerciseIndex === 0} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-secondary font-display text-sm font-semibold text-foreground disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                {allWorkoutComplete ? (
                  <button onClick={handleFinish} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground glow-primary">
                    Finalizar workout ✓
                  </button>
                ) : (
                  <button onClick={goNext} disabled={currentExerciseIndex === exercises.length - 1} className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-30">
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              {currentExerciseIndex < exercises.length - 1 && (
                <div className="mt-3 rounded-xl bg-secondary/50 p-3 flex items-center gap-3 separator-dark">
                  <span className="text-label-tech text-muted-foreground">Siguiente</span>
                  <span className="text-sm font-body font-normal text-foreground">{exercises[currentExerciseIndex + 1].name}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
