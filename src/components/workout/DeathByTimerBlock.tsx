import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Play, Dumbbell } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  onCompleteBlock: (minutesCompleted: number) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}

/** Parse cap from cue like "cap 15 min" — Death By usually has a safety cap */
function parseCapMinutes(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (cue) {
      const capMatch = cue.match(/cap\s*(\d+)\s*min/i);
      if (capMatch) return parseInt(capMatch[1]);
    }
  }
  return 20; // default safety cap 20 min
}

const SAFE_VOLUME = 0.25;
const COUNTDOWN_SECONDS = 10;
const SECONDS_PER_MINUTE = 60;

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

function formatSecs(s: number): string {
  return s.toString().padStart(2, "0");
}

export default function DeathByTimerBlock({ block, onBack, onCompleteBlock, onOpenVideo }: Props) {
  const capMin = parseCapMinutes(block);

  // Strip format prefix from cue for display
  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^DEATH\s+BY[:.]?\s*/i, "").trim();

  const [currentMinute, setCurrentMinute] = useState(1);
  const [secondsInMinute, setSecondsInMinute] = useState(SECONDS_PER_MINUTE);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [scoreInput, setScoreInput] = useState<number>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // Prep countdown
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

  // Main tick — counts down seconds within a minute, then advances to next minute
  useEffect(() => {
    if (!running || stopped) return;
    intervalRef.current = setInterval(() => {
      setSecondsInMinute((prev) => {
        if (prev <= 1) {
          // Minute complete — advance
          const nextMin = currentMinuteRef.current + 1;
          if (nextMin > capMin) {
            // Hit cap — auto-stop
            clearInterval(intervalRef.current!);
            setRunning(false);
            setStopped(true);
            setScoreInput(capMin); // default to last minute
            playBeep(500, 300);
            setTimeout(() => playBeep(500, 300), 300);
            vibrate(500);
            return 0;
          }
          // New minute starts
          setCurrentMinute(nextMin);
          playBeep(1000, 200);
          vibrate(150);
          return SECONDS_PER_MINUTE;
        }
        // Warn at last 3 seconds of minute
        if (prev <= 4) {
          playBeep(600, 80);
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, stopped, capMin]);

  // Ref for currentMinute so interval closure has fresh value
  const currentMinuteRef = useRef(currentMinute);
  currentMinuteRef.current = currentMinute;

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setStopped(true);
    // Default score to the previous completed minute (not the current one being attempted)
    setScoreInput(Math.max(1, currentMinute - 1));
    playBeep(500, 200);
    vibrate(200);
  };

  const handleSubmit = async () => {
    await onCompleteBlock(scoreInput);
    onBack();
  };

  const totalRepsAtScore = (scoreInput * (scoreInput + 1)) / 2;

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
              DEATH BY · cap {capMin} min
            </p>
          </div>
        </div>
      </div>

      {/* Coaching cue */}
      {cleanCue && !stopped && countdown === null && (
        <div className="px-5 pt-2 pb-1">
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--secondary))", borderLeft: `3px solid hsl(var(--primary))` }}>
            <p className="font-body text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{cleanCue}</p>
          </div>
        </div>
      )}

      {/* Timer section */}
      <div className="flex flex-col items-center justify-center px-5 py-8" style={{ minHeight: "45vh" }}>
        {stopped ? (
          /* Input screen: ¿Hasta qué minuto completaste? */
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full max-w-xs">
            <p className="font-mono uppercase text-primary" style={{ fontSize: 10, letterSpacing: "2px" }}>
              ¿Hasta qué minuto completaste?
            </p>
            <div className="flex items-center gap-5 my-3">
              <button
                onClick={() => setScoreInput((s) => Math.max(1, s - 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary press-scale"
              >
                <span className="text-2xl text-foreground">−</span>
              </button>
              <div className="text-center min-w-[80px]">
                <p className="font-mono font-bold text-primary" style={{ fontSize: 72, lineHeight: 1 }}>
                  {scoreInput}
                </p>
                <p className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>
                  MINUTOS
                </p>
              </div>
              <button
                onClick={() => setScoreInput((s) => Math.min(capMin, s + 1))}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary press-scale"
              >
                <span className="text-2xl text-foreground">+</span>
              </button>
            </div>
            <p className="font-body text-muted-foreground text-center" style={{ fontSize: 13 }}>
              Total reps: <span className="font-mono text-foreground">{totalRepsAtScore}</span>
              <br />
              <span style={{ fontSize: 11 }}>
                (min 1 = 1 rep, min 2 = 2 reps, ...)
              </span>
            </p>
            <button
              onClick={handleSubmit}
              className="press-scale mt-4 rounded-xl bg-primary px-10 py-3 font-display text-sm font-semibold text-primary-foreground w-full"
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
        ) : !hasStarted ? (
          /* Idle state before first start */
          <div className="flex flex-col items-center gap-3">
            <p className="font-mono uppercase text-primary" style={{ fontSize: 10, letterSpacing: "2px" }}>
              Minuto 1 — 1 rep
            </p>
            <p className="font-body text-muted-foreground text-center" style={{ fontSize: 13, maxWidth: 280 }}>
              Cada minuto añades 1 rep. Timer corre solo. Tú ejecutas. Para cuando ya no puedas completar en el minuto.
            </p>
            <button
              onClick={() => setCountdown(COUNTDOWN_SECONDS)}
              className="mt-6 press-scale flex items-center gap-3 rounded-full bg-primary px-8 py-4 font-display text-sm font-semibold text-primary-foreground"
            >
              <Play className="h-5 w-5" />
              INICIAR
            </button>
          </div>
        ) : (
          /* Active state: show current minute + seconds left */
          <>
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>
              Minuto actual
            </p>
            <p
              className="font-mono font-bold text-primary"
              style={{ fontSize: 80, lineHeight: 1, letterSpacing: "-0.04em" }}
            >
              {currentMinute}
            </p>
            <p className="font-display text-foreground" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>
              HAZ {currentMinute} {currentMinute === 1 ? "REP" : "REPS"}
            </p>

            <div
              className="mt-6 font-mono text-muted-foreground"
              style={{ fontSize: 36, fontWeight: 500, color: secondsInMinute <= 5 ? "#D45555" : undefined }}
            >
              0:{formatSecs(secondsInMinute)}
            </div>
            <p className="font-mono text-muted-foreground mt-1" style={{ fontSize: 10, letterSpacing: "2px" }}>
              segundos en este minuto
            </p>

            <button
              onClick={handleStop}
              className="mt-8 press-scale rounded-full bg-destructive px-10 py-4 font-display text-base font-semibold text-destructive-foreground"
              style={{ minWidth: 200 }}
            >
              PARAR (ya no puedo)
            </button>
          </>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 px-5 pb-8">
        <p className="font-mono uppercase text-muted-foreground mb-3" style={{ fontSize: 9, letterSpacing: "2px" }}>
          Ejercicio
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
