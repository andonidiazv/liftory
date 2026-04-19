import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Play, Pause, Minus, Plus, Dumbbell } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  onCompleteBlock: (roundsCompleted: number) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
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

const SAFE_VOLUME = 0.25; // hard cap — never exceed this
const COUNTDOWN_SECONDS = 10;

const playBeep = (freq = 800, duration = 100) => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(SAFE_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
    osc.start(now);
    osc.stop(now + duration / 1000 + 0.02);
    setTimeout(() => { ctx.close(); }, duration + 200);
  } catch {}
};

const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch {}
};

export default function TimerBlockDetail({ block, onBack, onCompleteBlock, onOpenVideo }: Props) {
  // Only AMRAPs use this timer now (EMOMs are handled as instruction blocks)
  const totalDurationSec = parseDurationFromCue(block);

  // Extract coaching cue and meta rounds for display
  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? '') as string;
  // Strip the "AMRAP X min:" prefix since it's already shown in the header
  const cleanCue = rawCue.replace(/^AMRAP\s+\d+\s*min\s*:?\s*/i, '').trim();
  const metaMatch = cleanCue.match(/Meta:\s*(\d+(?:-\d+)?\s*rondas?)/i);
  const metaRounds = metaMatch?.[1] ?? null;

  const [timeRemaining, setTimeRemaining] = useState(totalDurationSec);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null); // null = no countdown, N = N seconds left
  const [hasStarted, setHasStarted] = useState(false); // true once the first countdown finishes
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          clearInterval(intervalRef.current!);
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

  const progress = totalDurationSec > 0 ? 1 - (timeRemaining / totalDurationSec) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              {block.name}
            </h1>
            <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
              AMRAP {formatTime(totalDurationSec)}
            </p>
          </div>
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
      <div className="flex-1 px-5 pb-8">
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
                  <p className="font-body text-sm font-semibold text-foreground truncate">{ex.name}</p>
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
    </div>
  );
}
