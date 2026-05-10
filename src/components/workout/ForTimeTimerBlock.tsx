import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Minus, Plus, Dumbbell, RotateCcw } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  /** Save the metcon result.
   *  rounds: rounds the athlete completed.
   *  elapsedSec: timer time. capped at the block's cap if cap was hit.
   *  weightsByExerciseIdKg: optional dictionary of weight in KG per exercise_id.
   */
  onCompleteBlock: (rounds: number, elapsedSec: number, weightsByExerciseIdKg: Record<string, number>) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  nextBlockName?: string | null;
  onNextBlock?: () => void;
  /** Display unit for weight inputs. Default kg. */
  weightUnit?: "kg" | "lb";
}

/** Parse cap from cue like "cap 10 min" or "10 min cap" */
function parseCapSeconds(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (cue) {
      const capMatch = cue.match(/cap\s*(\d+)\s*min/i);
      if (capMatch) return parseInt(capMatch[1]) * 60;
      const minMatch = cue.match(/(\d+)\s*min/i);
      if (minMatch) return parseInt(minMatch[1]) * 60;
    }
  }
  return 15 * 60;
}

/** Parse planned rounds from cue like "5 RONDAS" / "3 ROUNDS". */
function parsePlannedRounds(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (!cue) continue;
    const m = cue.match(/(\d+)\s*ronda/i) || cue.match(/(\d+)\s*round/i);
    if (m) return parseInt(m[1]);
  }
  return 5;
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

export default function ForTimeTimerBlock({
  block, onBack, onCompleteBlock, onOpenVideo, nextBlockName, onNextBlock, weightUnit = "kg",
}: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;

  const capSec = parseCapSeconds(block);
  const plannedRounds = parsePlannedRounds(block);

  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^FOR\s+TIME[:.]?\s*/i, "").trim();

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rounds, setRounds] = useState(0);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // Countdown tick — shared shape with TimerBlockDetail (AMRAP)
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

  // Main count-up
  useEffect(() => {
    if (!running || completed) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next === capSec - 60) {
          playBeep(900, 150);
          vibrate(100);
        }
        if (next >= capSec) {
          if (intervalRef.current) clearInterval(intervalRef.current);
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
  const progress = capSec > 0 ? Math.min(elapsed / capSec, 1) : 0;

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setCompleted(true);
    playBeep(800, 100);
    setTimeout(() => playBeep(800, 100), 200);
    setTimeout(() => playBeep(800, 100), 400);
    vibrate(300);
    // Default rounds to whatever the athlete tracked during the timer; if 0,
    // assume they finished (planned rounds).
    if (rounds === 0) setRounds(plannedRounds);
  };

  const handleRestart = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setElapsed(0);
    setCountdown(null);
    setRunning(false);
    setHasStarted(false);
    setCompleted(false);
    setRounds(0);
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const weightsKg: Record<string, number> = {};
      for (const [exId, raw] of Object.entries(weights)) {
        const n = parseFloat(raw);
        if (!isNaN(n) && n > 0) weightsKg[exId] = toStorageWeight(n, weightUnit);
      }
      await onCompleteBlock(rounds, elapsed, weightsKg);
    } finally {
      setSaving(false);
    }
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
              FOR TIME · cap {formatTime(capSec)} · {plannedRounds} {plannedRounds === 1 ? "ronda" : "rondas"}
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

      {/* Timer / countdown / completed states */}
      <div className="flex flex-col items-center justify-center px-5 py-6" style={{ minHeight: "32vh" }}>
        {completed ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <p className="font-display text-xl font-bold text-primary">
              {elapsed >= capSec ? "Cap alcanzado" : "For Time Completado"} — {formatTime(elapsed)}
            </p>
            {rounds > 0 && (
              <p className="font-mono text-muted-foreground" style={{ fontSize: 13 }}>
                {rounds} {rounds === 1 ? "ronda" : "rondas"}
              </p>
            )}
          </div>
        ) : countdown !== null ? (
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
              Empieza el For Time en {countdown} {countdown === 1 ? "segundo" : "segundos"}
            </p>
            <button onClick={() => setCountdown(null)} className="mt-4 press-scale font-body text-sm text-muted-foreground underline">
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
              {formatTime(elapsed)}
            </p>
            <p className="mt-2 font-mono text-primary" style={{ fontSize: 14 }}>
              Quedan {formatTime(remaining)} del cap
            </p>

            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full" style={{ backgroundColor: "hsl(var(--border))" }}>
              <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
            </div>

            <div className="mt-6 flex items-center gap-6">
              <button
                onClick={handleFinish}
                className="font-body text-sm text-muted-foreground"
              >
                TERMINÉ
              </button>
              <button
                onClick={() => {
                  if (!hasStarted && !running) {
                    setCountdown(COUNTDOWN_SECONDS);
                  } else {
                    setRunning((r) => !r);
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
              <div style={{ width: 56 }} />{/* symmetry placeholder */}
            </div>

            {/* Restart pill — same pattern as TimerBlockDetail */}
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

            {/* Round counter — increment as you finish each round during the timer */}
            <div className="mt-6 flex items-center gap-5">
              <button
                onClick={() => setRounds((r) => Math.max(0, r - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              >
                <Minus className="h-4 w-4 text-foreground" />
              </button>
              <div className="text-center">
                <p className="font-mono font-bold text-foreground" style={{ fontSize: 36, lineHeight: 1 }}>{rounds}</p>
                <p className="font-mono text-muted-foreground" style={{ fontSize: 10 }}>RONDAS</p>
              </div>
              <button
                onClick={() => setRounds((r) => r + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              >
                <Plus className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Weight inputs after finish — only for loaded exercises */}
      {completed && (
        <div className="px-5 mb-3 animate-fade-in">
          {(() => {
            const loaded = block.groups.filter((g) => {
              const lower = g.exercise.name.toLowerCase();
              return !/^pull-?up\b|bodyweight|air squat|sit-?up|crunch/.test(lower);
            });
            if (loaded.length === 0) return null;
            return (
              <div className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9, letterSpacing: "2px" }}>
                  Pesos usados (opcional)
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {loaded.map((group) => {
                    const ex = group.exercise;
                    const exId = ex.id;
                    return (
                      <div key={exId} className="flex items-center gap-3">
                        <p className="flex-1 font-body text-foreground truncate" style={{ fontSize: 13 }}>{ex.name}</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={weights[exId] ?? ""}
                            onChange={(e) => setWeights((w) => ({ ...w, [exId]: e.target.value }))}
                            placeholder={
                              group.sets[0]?.planned_weight != null && group.sets[0].planned_weight > 0
                                ? String(toDisplayWeight(group.sets[0].planned_weight, weightUnit))
                                : "—"
                            }
                            className="w-20 rounded-lg px-2 py-1.5 text-right font-mono"
                            style={{
                              fontSize: 14,
                              background: "hsl(var(--secondary))",
                              border: "1px solid hsl(var(--border))",
                              color: "hsl(var(--foreground))",
                            }}
                          />
                          <span className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>{weightUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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

      {/* Next block button — same pattern as TimerBlockDetail (AMRAP).
          Saves the result before navigating so the block lands as completed. */}
      {completed && onNextBlock && nextBlockName && (
        <div className="px-5 pb-8">
          <button
            onClick={async () => {
              await handleSubmit();
              onNextBlock();
            }}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[14px] font-semibold transition-colors disabled:opacity-60"
            style={{ background: tc.accentBgStrong, color: tc.accent, border: `1px solid ${tc.accentBgStrong}` }}
          >
            Siguiente: {nextBlockName} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* If completed but no next block, show a save button so the result still persists. */}
      {completed && !onNextBlock && (
        <div className="px-5 pb-8">
          <button
            onClick={async () => { await handleSubmit(); onBack(); }}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[14px] font-semibold transition-colors disabled:opacity-60"
            style={{ background: tc.accentBgStrong, color: tc.accent, border: `1px solid ${tc.accentBgStrong}` }}
          >
            Guardar y volver
          </button>
        </div>
      )}
    </div>
  );
}
