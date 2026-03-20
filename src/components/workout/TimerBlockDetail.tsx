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
    const cue = (g.sets[0] as any)?.coaching_cue_override as string | null;
    if (cue) {
      const match = cue.match(/(\d+)\s*min/i);
      if (match) return parseInt(match[1]) * 60;
    }
  }
  return 12 * 60; // default 12 min
}

const playBeep = (freq = 800, duration = 100) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, duration);
  } catch {}
};

const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch {}
};

export default function TimerBlockDetail({ block, onBack, onCompleteBlock, onOpenVideo }: Props) {
  // Only AMRAPs use this timer now (EMOMs are handled as instruction blocks)
  const totalDurationSec = parseDurationFromCue(block);

  const [timeRemaining, setTimeRemaining] = useState(totalDurationSec);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rounds, setRounds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <div className="flex min-h-screen flex-col bg-background animate-slide-in-right">
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
                onClick={() => setRunning(r => !r)}
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
            const cue = (group.sets[0] as any)?.coaching_cue_override || ex.coaching_cue;
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
