import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Dumbbell, Check } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { playBeep } from "@/lib/audio";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  onCompleteBlock: (minutesCompleted: number) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  nextBlockName?: string | null;
  blockIndex?: number;
  totalBlocks?: number;
  onNextBlock?: () => void;
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

const COUNTDOWN_SECONDS = 10;
const SECONDS_PER_MINUTE = 60;

// playBeep is imported from @/lib/audio — uses the shared AudioContext
// singleton so Death By's long potential durations (up to capMin minutes)
// don't hit iOS context limits.
const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch { /* noop */ }
};

function formatSecs(s: number): string {
  return s.toString().padStart(2, "0");
}

export default function DeathByTimerBlock({ block, onBack, onCompleteBlock, onOpenVideo, nextBlockName, onNextBlock, blockIndex, totalBlocks }: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;
  const capMin = parseCapMinutes(block);

  // Strip format prefix from cue for display
  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^DEATH\s+BY[:.]?\s*/i, "").trim();

  // If every set is already marked completed in the DB, start in "stopped"
  // state so re-entering the block shows the post-completion view (with
  // "Siguiente: [next block]") instead of a fresh timer.
  const allDone = block.groups.length > 0 &&
    block.groups.every(g => g.sets.length > 0 && g.sets.every(s => s.is_completed));
  const initialMinute = allDone
    ? (block.groups[0]?.sets[0]?.actual_reps ?? 1)
    : 1;
  const [saving, setSaving] = useState(false);

  const [currentMinute, setCurrentMinute] = useState(initialMinute);
  const [secondsInMinute, setSecondsInMinute] = useState(SECONDS_PER_MINUTE);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(allDone);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(allDone);
  const [scoreInput, setScoreInput] = useState<number>(initialMinute);
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
            // Hit cap — auto-stop. Null-check the ref defensively: in the
            // edge case where unmount happens on the same frame, the cleanup
            // function may have already nulled it.
            if (intervalRef.current) clearInterval(intervalRef.current);
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
    if (saving) return;
    setSaving(true);
    try {
      await onCompleteBlock(scoreInput);
    } finally {
      setSaving(false);
    }
  };

  const totalRepsAtScore = (scoreInput * (scoreInput + 1)) / 2;

  return (
    <div className="flex min-h-dvh flex-col bg-background animate-slide-in-right">
      {/* Header */}
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
              Death by · cap {capMin} min
            </p>
          </div>
          <div className="shrink-0" style={{ width: 36 }} />
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
          <div className="flex flex-col items-center gap-5 animate-fade-in w-full max-w-xs">
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "3px", color: "#C4A24E" }}>
              ¿Hasta qué minuto completaste?
            </p>
            <div className="flex items-center gap-6 my-2">
              <button
                onClick={() => setScoreInput((s) => Math.max(1, s - 1))}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
              >
                <span style={{ fontSize: 18, color: "hsl(var(--muted-foreground))" }}>−</span>
              </button>
              <div className="text-center min-w-[88px]">
                <p
                  className="font-display tabular-nums"
                  style={{ fontWeight: 300, fontSize: 80, lineHeight: 1, letterSpacing: "-0.05em", color: "hsl(var(--foreground))" }}
                >
                  {scoreInput}
                </p>
                <p
                  className="font-mono uppercase mt-1"
                  style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                >
                  Minutos
                </p>
              </div>
              <button
                onClick={() => setScoreInput((s) => Math.min(capMin, s + 1))}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
              >
                <span style={{ fontSize: 18, color: "hsl(var(--muted-foreground))" }}>+</span>
              </button>
            </div>
            <p className="font-body italic text-center" style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
              Total reps: <span className="font-display" style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>{totalRepsAtScore}</span>
            </p>
            {/* Block-level next-step CTA — single line + breathing circle */}
            {onNextBlock && nextBlockName ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                {typeof blockIndex === "number" && typeof totalBlocks === "number" && (
                  <p
                    className="font-mono uppercase"
                    style={{ fontSize: 8, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                  >
                    Bloque {blockIndex + 1} de {totalBlocks}
                  </p>
                )}
                <button
                  onClick={async () => { await handleSubmit(); onNextBlock(); }}
                  disabled={saving}
                  className="press-scale flex items-center justify-center gap-3 disabled:opacity-50"
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
            ) : (
              <button
                onClick={async () => { await handleSubmit(); onBack(); }}
                disabled={saving}
                className="press-scale mt-6 flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
                aria-label="Guardar y volver"
              >
                <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 500 }}>
                  Guardar y volver
                </span>
                <span
                  className="liftory-breathe flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "#C4A24E", boxShadow: "0 0 18px rgba(196,162,78,0.45)" }}
                >
                  <Check className="h-3.5 w-3.5" style={{ color: "#0D0D0F" }} strokeWidth={3} />
                </span>
              </button>
            )}
          </div>
        ) : countdown !== null ? (
          <div className="flex flex-col items-center gap-4">
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "3px", color: "#C4A24E" }}>
              Prepárate
            </p>
            <p
              className="font-display tabular-nums"
              style={{
                fontWeight: 300,
                fontSize: 140,
                lineHeight: 1,
                letterSpacing: "-0.06em",
                color: "#C4A24E",
                animation: countdown <= 3 ? "pulse 0.8s infinite" : undefined,
              }}
            >
              {countdown}
            </p>
            <p className="font-body italic" style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
              Empieza en {countdown} {countdown === 1 ? "segundo" : "segundos"}
            </p>
            <button
              onClick={() => setCountdown(null)}
              className="press-scale mt-3 font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Cancelar
            </button>
          </div>
        ) : !hasStarted ? (
          <div className="flex flex-col items-center gap-4">
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "3px", color: "#C4A24E" }}>
              Minuto 1 · 1 rep
            </p>
            <p className="font-body italic text-center" style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", maxWidth: 280 }}>
              Cada minuto añades 1 rep. Timer corre solo. Tú ejecutas. Para cuando ya no puedas completar en el minuto.
            </p>
            <button
              onClick={() => setCountdown(COUNTDOWN_SECONDS)}
              className="press-scale mt-6 flex items-center gap-3"
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
              >
                Iniciar
              </span>
              <span
                className="liftory-breathe flex items-center justify-center shrink-0"
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "1px solid #C4A24E",
                  boxShadow: "0 0 24px #C4A24E40",
                }}
              >
                <Play className="h-4 w-4 ml-0.5" style={{ color: "#C4A24E" }} />
              </span>
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}>
              Minuto actual
            </p>
            <p
              className="font-display tabular-nums"
              style={{ fontWeight: 300, fontSize: 96, lineHeight: 1, letterSpacing: "-0.06em", color: "hsl(var(--foreground))" }}
            >
              {currentMinute}
            </p>
            <p
              className="font-display mt-2"
              style={{ fontWeight: 500, fontSize: 20, color: "#C4A24E", letterSpacing: "-0.01em", textTransform: "uppercase" }}
            >
              Haz {currentMinute} {currentMinute === 1 ? "rep" : "reps"}
            </p>

            <div
              className="mt-7 font-display tabular-nums"
              style={{
                fontWeight: 300,
                fontSize: 36,
                color: secondsInMinute <= 5 ? "#D45555" : "hsl(var(--muted-foreground))",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              0:{formatSecs(secondsInMinute)}
            </div>
            <p
              className="font-mono uppercase mt-2"
              style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Segundos en este minuto
            </p>

            <button
              onClick={handleStop}
              className="press-scale mt-8 flex items-center gap-3"
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: 11, letterSpacing: "2.5px", color: "#D45555", fontWeight: 600 }}
              >
                Parar
              </span>
              <span
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: "1px solid #D45555",
                }}
              >
                <Pause className="h-3.5 w-3.5" style={{ color: "#D45555" }} />
              </span>
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
                  <p className="font-body text-sm font-semibold text-foreground leading-snug" style={{ wordBreak: "break-word" }}>{ex.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
