import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Play, Dumbbell } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  onCompleteBlock: (elapsedSeconds: number) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}

/** Parse cap from cue like "cap 10 min" or "10 min cap" */
function parseCapSeconds(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (cue) {
      // Try "cap X min" pattern first
      const capMatch = cue.match(/cap\s*(\d+)\s*min/i);
      if (capMatch) return parseInt(capMatch[1]) * 60;
      // Fall back to any "X min" pattern
      const minMatch = cue.match(/(\d+)\s*min/i);
      if (minMatch) return parseInt(minMatch[1]) * 60;
    }
  }
  return 15 * 60; // default 15 min cap
}

const SAFE_VOLUME = 0.25;
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
  } catch { /* noop */ }
};

const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch { /* noop */ }
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function ForTimeTimerBlock({ block, onBack, onCompleteBlock, onOpenVideo }: Props) {
  const capSec = parseCapSeconds(block);

  // Strip format prefix from cue for display
  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^FOR\s+TIME[:.]?\s*/i, "").trim();

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // Countdown tick
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      playBeep(1000, 300);
      vibrate(200);
      setCountdown(null);
      setHasStarted(true);
      setRunning(true);
      return;
    }
    if (countdown <= 3) {
      playBeep(900, 120);
      vibrate(50);
    } else {
      playBeep(700, 80);
    }
    countdownRef.current = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [countdown]);

  // Main count-up tick
  useEffect(() => {
    if (!running || completed) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        // Warn at 60s before cap
        if (next === capSec - 60) {
          playBeep(900, 150);
          vibrate(100);
        }
        // Auto-stop at cap
        if (next >= capSec) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setCompleted(true);
          playBeep(500, 200);
          setTimeout(() => playBeep(500, 200), 250);
          vibrate(500);
          return capSec;
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, completed, capSec]);

  const remaining = Math.max(0, capSec - elapsed);
  const isLast60 = remaining <= 60 && remaining > 0 && running;

  const handleFinish = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setCompleted(true);
    playBeep(800, 100);
    setTimeout(() => playBeep(800, 100), 200);
    setTimeout(() => playBeep(800, 100), 400);
    vibrate(300);
  };

  const handleSubmit = async () => {
    await onCompleteBlock(elapsed);
    onBack();
  };

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
              FOR TIME · cap {formatTime(capSec)}
            </p>
          </div>
        </div>
      </div>

      {/* Coaching cue */}
      {cleanCue && (
        <div className="px-5 pt-2 pb-1">
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--secondary))", borderLeft: `3px solid hsl(var(--primary))` }}>
            <p className="font-body text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{cleanCue}</p>
          </div>
        </div>
      )}

      {/* Timer section */}
      <div className="flex flex-col items-center justify-center px-5 py-8" style={{ minHeight: "40vh" }}>
        {completed ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>Tu tiempo</p>
            <p className="font-mono font-bold text-primary" style={{ fontSize: 80, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {formatTime(elapsed)}
            </p>
            {elapsed >= capSec && (
              <p className="font-body text-destructive" style={{ fontSize: 13 }}>
                Llegaste al cap — registrado como tiempo máximo
              </p>
            )}
            <button
              onClick={handleSubmit}
              className="press-scale mt-4 rounded-xl bg-primary px-8 py-3 font-display text-sm font-semibold text-primary-foreground"
            >
              Guardar y continuar
            </button>
          </div>
        ) : countdown !== null ? (
          /* 10s prep countdown */
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
              Empieza en {countdown} {countdown === 1 ? "segundo" : "segundos"}
            </p>
            <button onClick={() => setCountdown(null)} className="mt-4 press-scale font-body text-sm text-muted-foreground underline">
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px", marginBottom: 4 }}>
              Tiempo transcurrido
            </p>
            <p
              className="font-mono font-bold text-foreground transition-colors"
              style={{
                fontSize: 72,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: isLast60 ? "#D45555" : undefined,
                animation: isLast60 ? "pulse 1s infinite" : undefined,
              }}
            >
              {formatTime(elapsed)}
            </p>
            <p className="mt-2 font-mono text-muted-foreground" style={{ fontSize: 13 }}>
              Quedan {formatTime(remaining)} del cap
            </p>

            {!hasStarted && !running ? (
              <button
                onClick={() => setCountdown(COUNTDOWN_SECONDS)}
                className="mt-8 press-scale flex items-center gap-3 rounded-full bg-primary px-8 py-4 font-display text-sm font-semibold text-primary-foreground"
              >
                <Play className="h-5 w-5" />
                INICIAR
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="mt-8 press-scale rounded-full bg-primary px-10 py-4 font-display text-base font-semibold text-primary-foreground"
                style={{ minWidth: 200 }}
              >
                ✓ TERMINÉ
              </button>
            )}
          </>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 px-5 pb-8">
        <p className="font-mono uppercase text-muted-foreground mb-3" style={{ fontSize: 9, letterSpacing: "2px" }}>
          Ejercicios del circuito
        </p>
        <div className="flex flex-col gap-2">
          {block.groups.map((group) => {
            const ex = group.exercise;
            const cue = group.sets[0]?.coaching_cue_override || ex.coaching_cue;
            return (
              <div
                key={ex.id}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
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
