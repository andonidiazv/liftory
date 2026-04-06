import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Check, SkipForward, SkipBack } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import type { WorkoutBlock } from "./WorkoutOverview";
import type { WorkoutSetData } from "@/hooks/useWorkoutData";

/* ─── types ─── */

interface EmomTimerBlockProps {
  block: WorkoutBlock;
  saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteAll: () => Promise<void>;
  onUncompleteAll: () => Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}

type Phase = "idle" | "countdown" | "active" | "done";

interface RoundRpe {
  fromRound: number;
  toRound: number;
  rpe: string; // keep as string to support ranges like "9-9.5"
}

/* ─── pure helpers ─── */

const COUNTDOWN_SECONDS = 10;

function parseEmomConfig(block: WorkoutBlock): { windowSeconds: number; totalRounds: number } {
  const allSets = block.groups.flatMap((g) => g.sets);

  // 1. Try coaching cue pattern "EMOM Xs x N rounds"
  let windowSeconds = 0;
  let totalRounds = 1;

  for (const s of allSets) {
    const cue = s.coaching_cue_override || "";
    const match = cue.match(/EMOM\s+(\d+)s?\s*x\s*(\d+)\s*rounds?/i);
    if (match) {
      windowSeconds = parseInt(match[1], 10);
      totalRounds = parseInt(match[2], 10);
      break;
    }
  }

  // 2. Fallback: planned_rest_seconds
  if (!windowSeconds) {
    for (const s of allSets) {
      if (s.planned_rest_seconds && s.planned_rest_seconds > 0) {
        windowSeconds = s.planned_rest_seconds;
        break;
      }
    }
  }

  // 3. Last resort
  if (!windowSeconds) windowSeconds = 60;
  if (totalRounds <= 0) totalRounds = 1;

  return { windowSeconds, totalRounds };
}

function parseRoundRpe(block: WorkoutBlock): RoundRpe[] {
  const allSets = block.groups.flatMap((g) => g.sets);
  const cue = allSets[0]?.coaching_cue_override || "";

  const results: RoundRpe[] = [];

  // "Todos a RPE X-Y" pattern (deload)
  const todosMatch = cue.match(/Todos\s+a\s+RPE\s+([\d.]+(?:-[\d.]+)?)/i);
  if (todosMatch) {
    return [{ fromRound: 1, toRound: 999, rpe: todosMatch[1] }];
  }

  // "R1-4: RPE 8, R5-8: RPE 9" pattern (Shrimp/Plyo)
  const shortRegex = /R(\d+)-(\d+)\s*:\s*RPE\s+([\d.]+(?:-[\d.]+)?)/gi;
  let shortMatch;
  while ((shortMatch = shortRegex.exec(cue)) !== null) {
    results.push({
      fromRound: parseInt(shortMatch[1], 10),
      toRound: parseInt(shortMatch[2], 10),
      rpe: shortMatch[3],
    });
  }
  if (results.length > 0) return results;

  // "Rounds 1-2: RPE 6-7. Rounds 3-5: RPE 8. Round 6: RPE 8.5" pattern
  const longRegex = /Rounds?\s+(\d+)(?:-(\d+))?\s*:\s*RPE\s+([\d.]+(?:-[\d.]+)?)/gi;
  let longMatch;
  while ((longMatch = longRegex.exec(cue)) !== null) {
    results.push({
      fromRound: parseInt(longMatch[1], 10),
      toRound: longMatch[2] ? parseInt(longMatch[2], 10) : parseInt(longMatch[1], 10),
      rpe: longMatch[3],
    });
  }

  return results;
}

function getRpeForRound(rpeRanges: RoundRpe[], round: number): string | null {
  for (const r of rpeRanges) {
    if (round >= r.fromRound && round <= r.toRound) return r.rpe;
  }
  return null;
}

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ─── component ─── */

export default function EmomTimerBlock({
  block,
  saving,
  isCompleted,
  onCompleteAll,
  onUncompleteAll,
  onOpenVideo,
}: EmomTimerBlockProps) {
  const { windowSeconds, totalRounds } = useMemo(() => parseEmomConfig(block), [block]);
  const rpeRanges = useMemo(() => parseRoundRpe(block), [block]);
  const allSets = useMemo(() => block.groups.flatMap((g) => g.sets), [block]);
  const firstCue = allSets[0]?.coaching_cue_override;
  const allDone = allSets.every((s) => isCompleted(s));

  const [phase, setPhase] = useState<Phase>(allDone ? "done" : "idle");
  const [currentRound, setCurrentRound] = useState(0); // 0-indexed
  const [secondsLeft, setSecondsLeft] = useState(windowSeconds);
  const [running, setRunning] = useState(false);
  const [roundFlash, setRoundFlash] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Stable refs for use inside tick
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const onCompleteAllRef = useRef(onCompleteAll);
  onCompleteAllRef.current = onCompleteAll;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sync external completion
  useEffect(() => {
    if (allDone && phase !== "done") {
      setPhase("done");
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [allDone, phase]);

  /* ─── audio ─── */

  const playBeep = useCallback((frequency: number = 800, duration: number = 0.12) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // silent fail
    }
    try {
      navigator.vibrate?.(100);
    } catch {
      // silent fail
    }
  }, []);

  /* ─── timer core ─── */

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      const next = prev - 1;

      // Audio alerts in last 5 seconds
      if (next >= 1 && next <= 5) {
        playBeep(800, 0.12);
      }

      if (next <= 0) {
        clearTimer();

        if (phaseRef.current === "countdown") {
          // Countdown finished → start first round
          playBeep(1000, 0.25);
          setPhase("active");
          phaseRef.current = "active";
          setCurrentRound(0);
          currentRoundRef.current = 0;
          setSecondsLeft(windowSeconds);
          setRoundFlash(true);
          setTimeout(() => setRoundFlash(false), 400);
          startTicking();
          return windowSeconds;
        }

        if (phaseRef.current === "active") {
          const nextRound = currentRoundRef.current + 1;
          if (nextRound >= totalRounds) {
            // All rounds done
            playBeep(1000, 0.4);
            setPhase("done");
            phaseRef.current = "done";
            setRunning(false);
            onCompleteAllRef.current();
            return 0;
          }
          // Next round
          playBeep(1000, 0.25);
          setCurrentRound(nextRound);
          currentRoundRef.current = nextRound;
          setSecondsLeft(windowSeconds);
          setRoundFlash(true);
          setTimeout(() => setRoundFlash(false), 400);
          startTicking();
          return windowSeconds;
        }

        return 0;
      }
      return next;
    });
  }, [windowSeconds, totalRounds, clearTimer, playBeep]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startTicking = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
  }, [clearTimer]);

  /* ─── handlers ─── */

  const handleStart = useCallback(() => {
    // Init audio context on user gesture
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    if (phase === "idle") {
      setPhase("countdown");
      phaseRef.current = "countdown";
      setSecondsLeft(COUNTDOWN_SECONDS);
      setRunning(true);
      startTicking();
    } else if (phase === "countdown" || phase === "active") {
      // Resume
      setRunning(true);
      startTicking();
    }
  }, [phase, startTicking]);

  const handlePause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const handleSkip = useCallback(() => {
    clearTimer();

    if (phase === "countdown") {
      // Skip countdown → go to round 1
      playBeep(1000, 0.25);
      setPhase("active");
      phaseRef.current = "active";
      setCurrentRound(0);
      currentRoundRef.current = 0;
      setSecondsLeft(windowSeconds);
      setRoundFlash(true);
      setTimeout(() => setRoundFlash(false), 400);
      if (running) startTicking();
    } else if (phase === "active") {
      const nextRound = currentRound + 1;
      if (nextRound >= totalRounds) {
        playBeep(1000, 0.4);
        setPhase("done");
        phaseRef.current = "done";
        setRunning(false);
        onCompleteAll();
      } else {
        playBeep(1000, 0.25);
        setCurrentRound(nextRound);
        currentRoundRef.current = nextRound;
        setSecondsLeft(windowSeconds);
        setRoundFlash(true);
        setTimeout(() => setRoundFlash(false), 400);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, currentRound, totalRounds, windowSeconds, running, startTicking, playBeep, onCompleteAll]);

  const handleBack = useCallback(() => {
    clearTimer();

    if (phase === "countdown") {
      // Back to idle
      setPhase("idle");
      phaseRef.current = "idle";
      setRunning(false);
      setSecondsLeft(windowSeconds);
    } else if (phase === "active") {
      if (currentRound > 0) {
        setCurrentRound(currentRound - 1);
        currentRoundRef.current = currentRound - 1;
        setSecondsLeft(windowSeconds);
        if (running) startTicking();
      } else {
        // Round 0 — restart this round
        setSecondsLeft(windowSeconds);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, currentRound, windowSeconds, running, startTicking]);

  const handleReset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setPhase("idle");
    phaseRef.current = "idle";
    setCurrentRound(0);
    currentRoundRef.current = 0;
    setSecondsLeft(windowSeconds);
    onUncompleteAll();
  }, [clearTimer, windowSeconds, onUncompleteAll]);

  /* ─── derived values ─── */

  const progress =
    phase === "countdown"
      ? ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100
      : phase === "active"
        ? ((windowSeconds - secondsLeft) / windowSeconds) * 100
        : 0;

  const currentRpe = phase === "active" ? getRpeForRound(rpeRanges, currentRound + 1) : null;

  const phaseLabel =
    phase === "countdown"
      ? "PREPARATE"
      : phase === "active"
        ? `RONDA ${currentRound + 1}/${totalRounds}`
        : "";

  const timerColor = phase === "countdown" ? "#8A8A8E" : "#C75B39";

  /* ─── render ─── */

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-body text-[15px] font-semibold text-foreground">{block.label}</p>
          {phase === "done" && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shrink-0">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          EMOM {formatTime(windowSeconds)} x {totalRounds} rondas
        </span>
      </div>

      {/* Exercise list — always visible in idle, compact in other states */}
      {(phase === "idle" || phase === "done") && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {block.groups.map((group) => {
            const ex = group.exercise;
            const reps = group.sets[0]?.planned_reps;
            const cue = group.sets[0]?.coaching_cue_override;
            return (
              <div key={ex.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <button
                  onClick={() =>
                    onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cue })
                  }
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
                <p className="font-body text-sm font-semibold text-foreground truncate flex-1">
                  {ex.name}
                </p>
                {reps != null && (
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    x{reps}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Coaching cue — visible in idle */}
      {firstCue && phase === "idle" && (
        <div className="px-4 pb-3">
          <p className="font-body text-[13px] text-muted-foreground leading-relaxed">{firstCue}</p>
        </div>
      )}

      {/* Compact exercise names during active/countdown */}
      {(phase === "active" || phase === "countdown") && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {block.groups.map((group) => (
              <span key={group.exercise.id} className="font-body text-[11px] text-muted-foreground">
                {group.exercise.name}
                {group.sets[0]?.planned_reps ? ` x${group.sets[0].planned_reps}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Round indicators */}
      {phase !== "idle" && (
        <div className="px-4 pb-3 flex items-center gap-1.5">
          {Array.from({ length: totalRounds }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  phase === "done" || i < currentRound
                    ? "#7A8B5C"
                    : i === currentRound && phase === "active"
                      ? "#C75B39"
                      : "#2A2A2A",
              }}
            />
          ))}
        </div>
      )}

      {phase === "done" ? (
        /* Done state */
        <div className="px-4 pb-4 flex flex-col items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            {totalRounds}/{totalRounds} rondas completadas
          </p>
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
          {/* Phase label + RPE */}
          {phase !== "idle" && (
            <div className="text-center">
              <p
                className={`font-mono text-[10px] tracking-widest text-muted-foreground transition-opacity duration-300 ${roundFlash ? "opacity-0" : "opacity-100"}`}
              >
                {phaseLabel}
              </p>
              {currentRpe && phase === "active" && (
                <span
                  className="inline-block mt-1.5 font-mono text-xs px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(199, 91, 57, 0.15)", color: "#C75B39" }}
                >
                  RPE {currentRpe}
                </span>
              )}
            </div>
          )}

          {/* Progress bar */}
          {phase !== "idle" && (
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%`, backgroundColor: timerColor }}
              />
            </div>
          )}

          {/* Timer display */}
          <div className="flex items-center justify-center">
            <span
              className={`font-mono tabular-nums transition-opacity duration-300 ${roundFlash ? "opacity-40" : "opacity-100"}`}
              style={{
                color: phase === "idle" ? "#FAF8F5" : timerColor,
                fontSize: phase === "idle" ? "2rem" : "3.5rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {phase === "idle" ? formatTime(windowSeconds) : formatTime(secondsLeft)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            {/* Back */}
            {phase !== "idle" && (
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Ronda anterior"
              >
                <SkipBack className="w-4 h-4" />
              </button>
            )}

            {/* Reset */}
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
              disabled={saving}
              className="flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#C75B39" }}
            >
              {running ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-0.5" />
              )}
            </button>

            {/* Skip */}
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
