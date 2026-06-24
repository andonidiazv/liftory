import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Minus, Plus, Dumbbell, RotateCcw } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { playBeep } from "@/lib/audio";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  onCompleteBlock: (roundsCompleted: number) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  nextBlockName?: string | null;
  blockIndex?: number;
  totalBlocks?: number;
  onNextBlock?: () => void;
}

/** Parse duration from coaching cue like "AMRAP 16 min" or "16 min" */
function parseDurationFromCue(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (cue) {
      const match = cue.match(/(\d+)\s*min/i);
      if (match) return parseInt(match[1]) * 60;
    }
  }
  return 12 * 60; // default 12 min
}

const COUNTDOWN_SECONDS = 10;

// playBeep is imported from @/lib/audio — uses the shared AudioContext
// singleton so long sessions (AMRAP 15min+) don't hit iOS context limits.
const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch {}
};

export default function TimerBlockDetail({ block, onBack, onCompleteBlock, onOpenVideo, nextBlockName, onNextBlock, blockIndex, totalBlocks }: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;
  // Only AMRAPs use this timer now (EMOMs are handled as instruction blocks)
  const totalDurationSec = parseDurationFromCue(block);

  // Extract coaching cue and meta rounds for display
  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? '') as string;
  // Strip the "AMRAP X min:" prefix since it's already shown in the header
  const cleanCue = rawCue.replace(/^AMRAP\s+\d+\s*min\s*:?\s*/i, '').trim();
  const metaMatch = cleanCue.match(/Meta:\s*(\d+(?:-\d+)?\s*rondas?)/i);
  const metaRounds = metaMatch?.[1] ?? null;

  // If every set is already marked completed in the DB, start in "completed"
  // state so re-entering the block shows the post-completion view (with
  // "Siguiente: [next block]") instead of a fresh timer. Mirrors EmomTimerBlock's
  // allDone pattern.
  const allDone = block.groups.length > 0 &&
    block.groups.every(g => g.sets.length > 0 && g.sets.every(s => s.is_completed));
  const initialRounds = allDone
    ? (block.groups[0]?.sets[0]?.actual_reps ?? 0)
    : 0;

  const [timeRemaining, setTimeRemaining] = useState(allDone ? 0 : totalDurationSec);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(allDone);
  const [rounds, setRounds] = useState(initialRounds);
  const [countdown, setCountdown] = useState<number | null>(null); // null = no countdown, N = N seconds left
  const [hasStarted, setHasStarted] = useState(allDone); // true once the first countdown finishes
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // countdownRef stores a setTimeout handle, NOT setInterval — was mistyped.
  // The function works in browser (clearInterval/clearTimeout share handles
  // on web) but the type was a foot-gun for any future refactor.
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      // Final "GO" beep (longer, slightly higher)
      playBeep(1000, 300);
      vibrate(200);
      setCountdown(null);
      setHasStarted(true);
      setRunning(true);
      return;
    }
    // Short tick each second (final 3 are louder/higher)
    if (countdown <= 3) {
      playBeep(900, 120);
      vibrate(50);
    } else {
      playBeep(700, 80);
    }
    countdownRef.current = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [countdown]);

  useEffect(() => {
    if (!running || completed) return;
    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Defensive null-check: unmount-on-same-frame can null the ref.
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, completed]);

  const isLast60 = timeRemaining <= 60 && timeRemaining > 0 && running;

  useEffect(() => {
    if (timeRemaining !== 0 || !running) return;
    setRunning(false);
    setCompleted(true);
    playBeep(800, 100);
    setTimeout(() => playBeep(800, 100), 200);
    setTimeout(() => playBeep(800, 100), 400);
    vibrate(500);
  }, [timeRemaining, running]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const adjustTime = (delta: number) => {
    if (completed) return;
    setTimeRemaining(prev => Math.max(0, prev + delta));
  };

  const handleFinish = async () => {
    await onCompleteBlock(rounds);
    onBack();
  };

  const handleRestart = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setRunning(false);
    setCompleted(false);
    setHasStarted(false);
    setCountdown(null);
    setTimeRemaining(totalDurationSec);
    setRounds(0);
  };

  const progress = totalDurationSec > 0 ? 1 - (timeRemaining / totalDurationSec) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background animate-slide-in-right">
      {/* Header — Atelier compact bar (matches BlockDetail / WorkoutOverview) */}
      <div
        className="sticky top-0 z-40 px-5 pt-14 pb-5"
        style={{ background: "rgba(13,13,15,0.92)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="press-scale flex h-9 w-9 items-center justify-center -ml-2 shrink-0"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" style={{ color: "#C4A24E" }} />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <h1
              className="font-display text-foreground"
              style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              {block.name}
            </h1>
            <p
              className="mt-0.5 font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
            >
              AMRAP {formatTime(totalDurationSec)}
            </p>
          </div>
          <div className="shrink-0" style={{ width: 36 }} />
        </div>
      </div>

      {/* Coaching cue + meta rondas */}
      {cleanCue && (
        <div className="px-5 pt-2 pb-1">
          <div
            className="rounded-xl p-3"
            style={{ background: "hsl(var(--secondary))", borderLeft: `3px solid hsl(var(--primary))` }}
          >
            {metaRounds && (
              <p className="font-mono uppercase mb-1" style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--primary))" }}>
                META · {metaRounds}
              </p>
            )}
            <p className="font-body text-[13px] text-foreground leading-relaxed">{cleanCue}</p>
          </div>
        </div>
      )}

      {/* Timer section */}
      <div className="flex flex-col items-center justify-center px-5 py-8" style={{ minHeight: "38vh" }}>
        {completed ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <p className="font-display text-xl font-bold text-primary">
              AMRAP Completado — {rounds} rondas
            </p>
            <button
              onClick={handleFinish}
              className="press-scale mt-4 rounded-xl bg-primary px-8 py-3 font-display text-sm font-semibold text-primary-foreground"
            >
              Continuar
            </button>
          </div>
        ) : countdown !== null ? (
          /* Countdown phase — 10s prep */
          <div className="flex flex-col items-center gap-3">
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>
              Preparate
            </p>
            <p
              className="font-mono font-bold text-primary"
              style={{
                fontSize: 120,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                animation: countdown <= 3 ? "pulse 0.8s infinite" : undefined,
              }}
            >
              {countdown}
            </p>
            <p className="font-body text-muted-foreground" style={{ fontSize: 13 }}>
              Empieza el AMRAP en {countdown} {countdown === 1 ? 'segundo' : 'segundos'}
            </p>
            <button
              onClick={() => setCountdown(null)}
              className="mt-4 press-scale font-body text-sm text-muted-foreground underline"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p
              className="font-mono font-bold text-foreground transition-colors"
              style={{
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: isLast60 ? "#D45555" : undefined,
                animation: isLast60 ? "pulse 1s infinite" : undefined,
              }}
            >
              {formatTime(timeRemaining)}
            </p>
            <p className="mt-2 font-mono text-primary" style={{ fontSize: 14 }}>
              AMRAP {formatTime(totalDurationSec)}
            </p>

            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full" style={{ backgroundColor: "hsl(var(--border))" }}>
              <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="mt-6 flex items-center gap-6">
              <button onClick={() => adjustTime(-15)} className="font-body text-sm text-muted-foreground">-15s</button>
              <button
                onClick={() => {
                  // First press on a fresh timer → start countdown
                  if (!hasStarted && !running) {
                    setCountdown(COUNTDOWN_SECONDS);
                  } else {
                    setRunning(r => !r);
                  }
                }}
                className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary"
              >
                {running ? (
                  <Pause className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                )}
              </button>
              <button onClick={() => adjustTime(15)} className="font-body text-sm text-muted-foreground">+15s</button>
            </div>

            {/* Restart button — only show after timer has started or is running */}
            {(hasStarted || running) && (
              <button
                onClick={handleRestart}
                className="press-scale mt-4 flex items-center gap-2 rounded-full px-4 py-2 font-body text-xs text-muted-foreground"
                style={{ background: "hsl(var(--secondary))" }}
                title="Reiniciar timer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar
              </button>
            )}

            {/* AMRAP round counter */}
            <div className="mt-6 flex items-center gap-5">
              <button
                onClick={() => setRounds(r => Math.max(0, r - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              >
                <Minus className="h-4 w-4 text-foreground" />
              </button>
              <div className="text-center">
                <p className="font-mono font-bold text-foreground" style={{ fontSize: 36, lineHeight: 1 }}>{rounds}</p>
                <p className="font-mono text-muted-foreground" style={{ fontSize: 10 }}>RONDAS</p>
              </div>
              <button
                onClick={() => setRounds(r => r + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              >
                <Plus className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 px-5 pb-4">
        <p className="font-mono uppercase text-muted-foreground mb-3" style={{ fontSize: 9, letterSpacing: "2px" }}>
          EJERCICIOS
        </p>
        <div className="flex flex-col gap-2">
          {block.groups.map((group) => {
            const ex = group.exercise;
            const cue = group.sets[0]?.coaching_cue_override || ex.coaching_cue;
            return (
              <div
                key={ex.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <button
                  onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cue })}
                  className="shrink-0 overflow-hidden rounded-lg"
                  style={{ width: 48, height: 36 }}
                >
                  {ex.thumbnail_url ? (
                    <img src={ex.thumbnail_url} alt={ex.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-foreground leading-snug" style={{ wordBreak: "break-word" }}>{ex.name}</p>
                  {group.sets[0]?.planned_reps && (
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {group.sets[0].planned_reps} reps
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next-block CTA — single line + breathing circle */}
      {onNextBlock && nextBlockName && (
        <div className="px-5 pt-6 pb-10 flex flex-col items-center gap-3">
          {typeof blockIndex === "number" && typeof totalBlocks === "number" && (
            <p
              className="font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Bloque {blockIndex + 1} de {totalBlocks}
            </p>
          )}
          <button
            onClick={onNextBlock}
            className="press-scale flex items-center gap-3"
            aria-label={`Siguiente bloque: ${nextBlockName}`}
          >
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 500 }}>
              Siguiente bloque
            </span>
            <span
              className="liftory-breathe flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #C4A24E" }}
            >
              <ChevronRight className="h-3.5 w-3.5" style={{ color: "#C4A24E" }} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
