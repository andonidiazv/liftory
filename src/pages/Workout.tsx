import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout } from "@/data/workout";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
  Check,
  Clock,
  Info,
  List,
} from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Workout() {
  const navigate = useNavigate();
  const {
    currentExerciseIndex,
    setCurrentExercise,
    completeSet,
    isSetCompleted,
    workoutElapsed,
    restTimerActive,
    restTimeRemaining,
    startRestTimer,
    skipRestTimer,
    endWorkout,
    completedSets,
  } = useApp();

  const [showVideo, setShowVideo] = useState(false);
  const [showTempo, setShowTempo] = useState(false);

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

  const allCurrentSetsComplete = setsForCurrentExercise.every((i) =>
    isSetCompleted(currentExercise.id, i)
  );

  const allWorkoutComplete =
    exercises.every((ex) =>
      Array.from({ length: ex.sets }, (_, i) => i).every((i) =>
        isSetCompleted(ex.id, i)
      )
    );

  const handleCompleteSet = (setIndex: number) => {
    completeSet(currentExercise.id, setIndex);
    // Start rest timer if not last set
    const isLastSet = setIndex === currentExercise.sets - 1;
    if (!isLastSet) {
      startRestTimer(90);
    }
  };

  const handleFinish = () => {
    endWorkout();
    navigate("/workout-complete", { replace: true });
  };

  const goNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExercise(currentExerciseIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExercise(currentExerciseIndex - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              {todayWorkout.name}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatTime(workoutElapsed)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/session?from=workout")}
              className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
            >
              <List className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={handleFinish}
              className="press-scale flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-foreground"
            >
              <Pause className="h-3.5 w-3.5" /> Terminar
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground text-right">
          {currentExerciseIndex + 1}/{exercises.length} ejercicios
        </p>
      </div>

      {/* Rest Timer Overlay */}
      {restTimerActive && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground">Descanso</p>
          <div className="relative mt-4">
            <svg className="h-40 w-40 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={283 * (1 - restTimeRemaining / 90)}
                className="transition-all duration-1000 linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-5xl font-semibold text-foreground">
                {restTimeRemaining}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">segundos</p>
          <button
            onClick={skipRestTimer}
            className="press-scale mt-8 rounded-xl bg-secondary px-8 py-3 font-display font-semibold text-foreground"
          >
            Saltar
          </button>
        </div>
      )}

      {/* Video Fullscreen Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background">
          <div className="flex-1 flex items-center justify-center bg-secondary">
            <div className="flex flex-col items-center gap-3">
              <Play className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Video demo</span>
            </div>
          </div>
          <div className="bg-background p-5 pb-10" style={{
            background: 'linear-gradient(to top, hsl(var(--background)), hsl(var(--background) / 0.85))'
          }}>
            <h3 className="font-display text-xl font-bold text-foreground">
              {currentExercise.name}
            </h3>
            <p className="mt-2 font-mono text-sm text-primary">
              Tempo: {currentExercise.tempo}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentExercise.tempoExplain}
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Músculos</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {currentExercise.muscles.map((m) => (
                  <span key={m} className="pill">{m}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Errores comunes</p>
              {currentExercise.commonMistakes.map((m, i) => (
                <p key={i} className="mt-1 text-xs text-muted-foreground">• {m}</p>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Sustituciones</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {currentExercise.substitutions.map((s) => (
                  <span key={s} className="pill">{s}</span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowVideo(false)}
            className="absolute right-4 top-14 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>
      )}

      {/* Video Placeholder */}
      <div className="px-5 mt-2">
        <button
          onClick={() => setShowVideo(true)}
          className="press-scale relative w-full overflow-hidden rounded-2xl bg-secondary"
          style={{ aspectRatio: "9/7" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
              <Play className="h-6 w-6 text-foreground ml-0.5" />
            </div>
            <span className="text-xs text-muted-foreground">Ver demo</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-4">
            <p className="text-sm font-semibold text-foreground">
              {currentExercise.name}
            </p>
          </div>
        </button>
      </div>

      {/* Exercise Card */}
      <div className="flex-1 px-5 mt-4 pb-6">
        <div className="card-fbb">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {currentExercise.name}
              </h2>
              <button
                onClick={() => setShowTempo(!showTempo)}
                className="mt-1 flex items-center gap-1 font-mono text-sm font-medium text-primary"
              >
                <Clock className="h-3.5 w-3.5" />
                {currentExercise.tempo}
                <Info className="h-3 w-3 text-muted-foreground" />
              </button>
              {showTempo && (
                <p className="mt-1 text-xs text-muted-foreground animate-fade-up">
                  {currentExercise.tempoExplain}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {currentExercise.muscles.slice(0, 2).map((m) => (
                <span key={m} className="pill text-[10px]">{m}</span>
              ))}
            </div>
          </div>

          {/* Sets Table */}
          <div className="mt-5">
            <div className="grid grid-cols-[40px_1fr_60px_50px_44px] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
              <span>Set</span>
              <span>Peso</span>
              <span>Reps</span>
              <span>RPE</span>
              <span></span>
            </div>
            {setsForCurrentExercise.map((setIdx) => {
              const completed = isSetCompleted(currentExercise.id, setIdx);
              return (
                <div
                  key={setIdx}
                  className={`grid grid-cols-[40px_1fr_60px_50px_44px] gap-2 items-center rounded-xl px-1 py-3 transition-all ${
                    completed ? "bg-success/10" : ""
                  }`}
                >
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {setIdx + 1}
                  </span>
                  <span className="font-mono text-sm text-foreground">
                    {currentExercise.weight}
                  </span>
                  <span className="font-mono text-sm text-foreground">
                    {currentExercise.reps}
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {currentExercise.rpe}
                  </span>
                  <button
                    onClick={() => handleCompleteSet(setIdx)}
                    disabled={completed}
                    className={`press-scale flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                      completed
                        ? "border-success bg-success glow-success"
                        : "border-border"
                    }`}
                  >
                    {completed && (
                      <Check className="h-4 w-4 text-success-foreground" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={currentExerciseIndex === 0}
            className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-secondary font-display text-sm font-semibold text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          {allWorkoutComplete ? (
            <button
              onClick={handleFinish}
              className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-primary font-display text-sm font-bold text-primary-foreground glow-primary"
            >
              Finalizar ✓
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={currentExerciseIndex === exercises.length - 1}
              className="press-scale flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground disabled:opacity-30"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Next exercise preview */}
        {currentExerciseIndex < exercises.length - 1 && (
          <div className="mt-3 rounded-xl bg-secondary/50 p-3 flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Siguiente</span>
            <span className="text-sm font-medium text-foreground">
              {exercises[currentExerciseIndex + 1].name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
