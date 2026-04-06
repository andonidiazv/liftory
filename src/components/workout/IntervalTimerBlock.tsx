import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Check, SkipForward, SkipBack } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import type { WorkoutSetData, ExerciseGroup } from "@/hooks/useWorkoutData";

interface IntervalTimerBlockProps {
  group: ExerciseGroup;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteSet: (set: WorkoutSetData) => Promise<void>;
  onUncompleteSet: (setId: string) => Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}

type Phase = "idle" | "work" | "rest" | "done";

export default function IntervalTimerBlock({
  group,
  isCompleted,
  onCompleteSet,
  onUncompleteSet,
  onOpenVideo,
}: IntervalTimerBlockProps) {
  const sets = group.sets;
  const totalRounds = sets.length;
  const workSeconds = sets[0]?.planned_duration_seconds ?? 30;
  const restSeconds = sets[0]?.planned_rest_seconds ?? 0;
  const ex = group.exercise;
  const cue = sets[0]?.coaching_cue_override;

  // Find first incomplete round
  const getFirstIncomplete = useCallback(() => {
    const idx = sets.findIndex((s) => !isCompleted(s));
    return idx === -1 ? totalRounds : idx;
  }, [sets, isCompleted, totalRounds]);

  const [currentRound, setCurrentRound] = useState(getFirstIncomplete);
  const [phase, setPhase] = useState<Phase>(getFirstIncomplete() >= totalRounds ? "done" : "idle");
  const [secondsLeft, setSecondsLeft] = useState(workSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs for callbacks
  const onCompleteSetRef = useRef(onCompleteSet);
  onCompleteSetRef.current = onCompleteSet;
  const setsRef = useRef(sets);
  setsRef.current = sets;

  // Cleanup
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Check if all done externally
  useEffect(() => {
    if (sets.every((s) => isCompleted(s)) && phase !== "done") {
      setPhase("done");
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [sets, isCompleted, phase]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        clearTimer();
        // Phase transition
        setPhase((currentPhase) => {
          if (currentPhase === "work") {
            // Complete this set
            const set = setsRef.current[currentRound];
            if (set) onCompleteSetRef.current(set);

            if (restSeconds > 0) {
              // Start rest phase
              setSecondsLeft(restSeconds);
              startTicking();
              return "rest";
            } else {
              // No rest — advance to next round or done
              const nextRound = currentRound + 1;
              if (nextRound >= totalRounds) {
                setRunning(false);
                return "done";
              }
              setCurrentRound(nextRound);
              setSecondsLeft(workSeconds);
              startTicking();
              return "work";
            }
          }
          if (currentPhase === "rest") {
            // Advance to next round or done
            const nextRound = currentRound + 1;
            if (nextRound >= totalRounds) {
              setRunning(false);
              return "done";
            }
            setCurrentRound(nextRound);
            setSecondsLeft(workSeconds);
            startTicking();
            return "work";
          }
          return currentPhase;
        });
        return 0;
      }
      return prev - 1;
    });
  }, [currentRound, totalRounds, workSeconds, restSeconds, clearTimer]);

  // We need this as a ref since tick references it
  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startTicking = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
  }, [clearTimer]);

  const handleStart = useCallback(() => {
    if (phase === "idle") {
      setPhase("work");
      setSecondsLeft(workSeconds);
      setRunning(true);
      startTicking();
    } else if (phase === "work" || phase === "rest") {
      // Resume
      setRunning(true);
      startTicking();
    }
  }, [phase, workSeconds, startTicking]);

  const handlePause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer();
    setRunning(false);
    // Uncomplete all completed sets
    for (const s of sets) {
      if (isCompleted(s)) onUncompleteSet(s.id);
    }
    setCurrentRound(0);
    setPhase("idle");
    setSecondsLeft(workSeconds);
  }, [clearTimer, sets, isCompleted, onUncompleteSet, workSeconds]);

  const handleSkip = useCallback(() => {
    clearTimer();
    if (phase === "work") {
      // Complete the set, then go to rest (or next round if no rest)
      const set = sets[currentRound];
      if (set && !isCompleted(set)) onCompleteSet(set);

      if (restSeconds > 0) {
        setPhase("rest");
        setSecondsLeft(restSeconds);
        if (running) startTicking();
      } else {
        // No rest — advance to next round or done
        const nextRound = currentRound + 1;
        if (nextRound >= totalRounds) {
          setPhase("done");
          setRunning(false);
        } else {
          setCurrentRound(nextRound);
          setPhase("work");
          setSecondsLeft(workSeconds);
          if (running) startTicking();
        }
      }
    } else if (phase === "rest") {
      // Skip rest → go to next round work or done
      const nextRound = currentRound + 1;
      if (nextRound >= totalRounds) {
        setPhase("done");
        setRunning(false);
      } else {
        setCurrentRound(nextRound);
        setPhase("work");
        setSecondsLeft(workSeconds);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, sets, currentRound, isCompleted, onCompleteSet, restSeconds, totalRounds, workSeconds, running, startTicking]);

  const handleBack = useCallback(() => {
    clearTimer();
    if (phase === "rest") {
      // Go back to work phase of same round, uncomplete the set
      const set = sets[currentRound];
      if (set && isCompleted(set)) onUncompleteSet(set.id);
      setPhase("work");
      setSecondsLeft(workSeconds);
      if (running) startTicking();
    } else if (phase === "work") {
      if (currentRound > 0) {
        // Go back to rest of previous round (or work if no rest)
        const prevSet = sets[currentRound - 1];
        if (prevSet && isCompleted(prevSet)) onUncompleteSet(prevSet.id);

        if (restSeconds > 0) {
          setCurrentRound(currentRound - 1);
          setPhase("rest");
          setSecondsLeft(restSeconds);
          if (running) startTicking();
        } else {
          setCurrentRound(currentRound - 1);
          setPhase("work");
          setSecondsLeft(workSeconds);
          if (running) startTicking();
        }
      } else {
        // Already at round 0 work — just reset timer
        setSecondsLeft(workSeconds);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, sets, currentRound, isCompleted, onUncompleteSet, restSeconds, workSeconds, running, startTicking]);

  // Format MM:SS
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress
  const totalSecs = phase === "rest" ? restSeconds : workSeconds;
  const progress = totalSecs > 0 ? ((totalSecs - secondsLeft) / totalSecs) * 100 : 100;
  const completedCount = sets.filter((s) => isCompleted(s)).length;

  const phaseColor = phase === "rest" ? "#7A8B5C" : "#D45555";
  const phaseLabel = phase === "rest" ? "DESCANSO" : phase === "work" ? ex.name.toUpperCase() : "";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cue })}
          className="shrink-0 overflow-hidden rounded-lg"
          style={{ width: 48, height: 36 }}
        >
          <ExerciseThumbnail
            thumbnailUrl={ex.thumbnail_url}
            videoUrl={ex.video_url}
            name={ex.name}
            width={48}
            height={36}
          />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[15px] font-semibold text-foreground">{ex.name}</p>
          <span className="font-mono text-[10px] text-muted-foreground">
            {totalRounds} x {workSeconds}s
            {restSeconds > 0 ? ` / ${restSeconds}s descanso` : ""}
          </span>
        </div>
        {phase === "done" && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shrink-0">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Coaching cue — always visible when present */}
      {cue && phase !== "done" && (
        <div className="px-4 pb-3">
          <p className="font-body text-[13px] text-muted-foreground leading-relaxed">{cue}</p>
        </div>
      )}

      {/* Round indicators */}
      <div className="px-4 pb-3 flex items-center gap-1.5">
        {sets.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-1.5 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: isCompleted(s)
                ? "#7A8B5C"
                : i === currentRound && (phase === "work" || phase === "rest")
                  ? phaseColor
                  : "#2A2A2A",
            }}
          />
        ))}
      </div>

      {phase === "done" ? (
        /* All done */
        <div className="px-4 pb-4 flex flex-col items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            {completedCount}/{totalRounds} intervalos completados
          </p>
          {/* Reset button in done state */}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-body text-xs">Reiniciar</span>
          </button>
        </div>
      ) : (
        /* Timer area */
        <div className="px-4 pb-4 space-y-4">
          {/* Phase label + round */}
          {phase !== "idle" && (
            <div className="text-center">
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                RONDA {currentRound + 1}/{totalRounds}
              </span>
              <p
                className="font-display text-sm tracking-wider mt-0.5"
                style={{ color: phaseColor }}
              >
                {phaseLabel}
              </p>
            </div>
          )}

          {/* Progress bar */}
          {phase !== "idle" && (
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%`, backgroundColor: phaseColor }}
              />
            </div>
          )}

          {/* Timer display */}
          <div className="flex items-center justify-center">
            <span
              className="font-mono tabular-nums"
              style={{
                color: phase === "idle" ? "#FAF8F5" : phaseColor,
                fontSize: phase === "idle" ? "2rem" : "3.5rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {formatTime(secondsLeft)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Back round */}
            {phase !== "idle" && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Ronda anterior"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            {/* Reset all */}
            {phase !== "idle" && (
              <button
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Reiniciar todo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Play / Pause */}
            <button
              onClick={running ? handlePause : handleStart}
              className="flex h-14 w-14 items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: phase === "idle" ? "#C75B39" : phaseColor }}
            >
              {running ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>

            {/* Skip round */}
            {phase !== "idle" && (
              <button
                onClick={handleSkip}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Saltar ronda"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
