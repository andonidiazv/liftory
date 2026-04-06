import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Check, SkipForward } from "lucide-react";

interface SetCountdownTimerProps {
  /** Total seconds for this interval */
  durationSeconds: number;
  /** Rest seconds between intervals (optional) */
  restSeconds?: number | null;
  /** Label like "Sprint" or "Walk" */
  label: string;
  /** Current interval number (1-based) */
  intervalNumber: number;
  /** Total intervals */
  totalIntervals: number;
  /** Whether this set is already completed */
  isCompleted: boolean;
  /** Called when timer hits 0 or athlete taps complete */
  onComplete: () => void;
  /** Called when rest finishes (to auto-advance) */
  onRestDone?: () => void;
}

type TimerPhase = "idle" | "work" | "rest" | "done";

export default function SetCountdownTimer({
  durationSeconds,
  restSeconds,
  label,
  intervalNumber,
  totalIntervals,
  isCompleted,
  onComplete,
  onRestDone,
}: SetCountdownTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>(isCompleted ? "done" : "idle");
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onRestDoneRef = useRef(onRestDone);
  onCompleteRef.current = onComplete;
  onRestDoneRef.current = onRestDone;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Update if completed externally
  useEffect(() => {
    if (isCompleted && phase !== "done") setPhase("done");
  }, [isCompleted, phase]);

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    if (phase === "idle") {
      setPhase("work");
      setSecondsLeft(durationSeconds);
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          // Transition phases
          setPhase((currentPhase) => {
            if (currentPhase === "work") {
              // Work done → complete the set
              onCompleteRef.current();
              if (restSeconds && restSeconds > 0) {
                // Start rest phase
                setTimeout(() => {
                  setSecondsLeft(restSeconds);
                  setPhase("rest");
                  // Auto-start rest timer
                  startRestTimer(restSeconds);
                }, 100);
                return "work"; // brief transition
              }
              return "done";
            }
            if (currentPhase === "rest") {
              onRestDoneRef.current?.();
              return "done";
            }
            return currentPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [phase, durationSeconds, restSeconds]);

  const startRestTimer = useCallback((restSecs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(true);
    setSecondsLeft(restSecs);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          setPhase("done");
          onRestDoneRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (phase === "idle") {
      startTimer();
      return;
    }
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          setPhase((currentPhase) => {
            if (currentPhase === "work") {
              onCompleteRef.current();
              if (restSeconds && restSeconds > 0) {
                setTimeout(() => {
                  setSecondsLeft(restSeconds);
                  setPhase("rest");
                  startRestTimer(restSeconds);
                }, 100);
                return "work";
              }
              return "done";
            }
            if (currentPhase === "rest") {
              onRestDoneRef.current?.();
              return "done";
            }
            return currentPhase;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [phase, restSeconds, startTimer, startRestTimer]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setPhase("idle");
    setSecondsLeft(durationSeconds);
  }, [durationSeconds]);

  const skipToComplete = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    onComplete();
    setPhase("done");
  }, [onComplete]);

  // Format seconds to MM:SS
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress percentage
  const totalSecs = phase === "rest" ? (restSeconds ?? 0) : durationSeconds;
  const progress = totalSecs > 0 ? ((totalSecs - secondsLeft) / totalSecs) * 100 : 100;

  if (phase === "done" || isCompleted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shrink-0">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-xs text-muted-foreground">
            Intervalo {intervalNumber}/{totalIntervals}
          </span>
          <p className="font-body text-sm font-medium text-foreground">{label}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{durationSeconds}s</span>
      </div>
    );
  }

  const phaseLabel = phase === "rest" ? "DESCANSO" : label.toUpperCase();
  const phaseColor = phase === "rest" ? "#7A8B5C" : "#D45555";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
            INTERVALO {intervalNumber}/{totalIntervals}
          </span>
          <p
            className="font-display text-sm tracking-wider"
            style={{ color: phaseColor }}
          >
            {phaseLabel}
          </p>
        </div>
        <button
          onClick={skipToComplete}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward className="w-3 h-3" />
          Saltar
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%`, backgroundColor: phaseColor }}
        />
      </div>

      {/* Timer display */}
      <div className="flex items-center justify-center">
        <span
          className="font-mono text-4xl font-bold tabular-nums"
          style={{ color: phaseColor }}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={resetTimer}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={running ? pauseTimer : (phase === "idle" ? startTimer : resumeTimer)}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-colors"
          style={{ backgroundColor: phaseColor }}
        >
          {running ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </button>

        <button
          onClick={skipToComplete}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
