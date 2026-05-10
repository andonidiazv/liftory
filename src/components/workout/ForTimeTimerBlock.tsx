import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Play, Dumbbell, RotateCcw, Check } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  /** Save the metcon result.
   *  rounds: rounds the athlete completed (typically full rounds; partial reps not split out yet).
   *  elapsedSec: timer time. capped at the block's cap if cap was hit.
   *  weightsByExerciseIdKg: optional dictionary of weight in KG per exercise_id (for DB cleans, etc.).
   *  Pass `0` rounds to mark the block as skipped/completed-without-timing.
   */
  onCompleteBlock: (rounds: number, elapsedSec: number, weightsByExerciseIdKg: Record<string, number>) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  /** Display unit (kg/lb) — read from BlockDetail/WorkoutOverview parent context.
   *  Default kg if not provided. */
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

/** Parse planned rounds from cue like "5 RONDAS" / "3 ROUNDS" / "AMRAP 12 min" */
function parsePlannedRounds(block: WorkoutBlock): number {
  for (const g of block.groups) {
    const cue = g.sets[0]?.coaching_cue_override as string | null;
    if (!cue) continue;
    const m = cue.match(/(\d+)\s*ronda/i) || cue.match(/(\d+)\s*round/i);
    if (m) return parseInt(m[1]);
  }
  return 5; // sensible default for For Time metcons
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

export default function ForTimeTimerBlock({ block, onBack, onCompleteBlock, onOpenVideo, weightUnit = "kg" }: Props) {
  const capSec = parseCapSeconds(block);
  const plannedRounds = parsePlannedRounds(block);

  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^FOR\s+TIME[:.]?\s*/i, "").trim();

  // Phase machine: idle → countdown → running → finished
  type Phase = "idle" | "countdown" | "running" | "finished";
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Result form (shown after finish)
  const [roundsDone, setRoundsDone] = useState<number>(plannedRounds);
  const [weights, setWeights] = useState<Record<string, string>>({}); // exercise_id → display-unit string
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, []);

  // Countdown tick
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      playBeep(1000, 300);
      vibrate(200);
      setPhase("running");
      return;
    }
    if (countdown <= 3) {
      playBeep(900, 120);
      vibrate(50);
    } else {
      playBeep(700, 80);
    }
    countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [phase, countdown]);

  // Main count-up
  useEffect(() => {
    if (phase !== "running") return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next === capSec - 60) {
          playBeep(900, 150);
          vibrate(100);
        }
        if (next >= capSec) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPhase("finished");
          playBeep(500, 200);
          setTimeout(() => playBeep(500, 200), 250);
          vibrate(500);
          return capSec;
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, capSec]);

  const remaining = Math.max(0, capSec - elapsed);
  const isLast60 = remaining <= 60 && remaining > 0 && phase === "running";

  const handleStart = () => {
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
  };

  const handleCancelCountdown = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setPhase("idle");
    setCountdown(COUNTDOWN_SECONDS);
  };

  const handleFinish = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("finished");
    playBeep(800, 100);
    setTimeout(() => playBeep(800, 100), 200);
    setTimeout(() => playBeep(800, 100), 400);
    vibrate(300);
  };

  /** Reset everything back to idle. Used both from running (with confirm)
   *  and from the finished screen ("rehacer") if the athlete wants to retry. */
  const doReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setElapsed(0);
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("idle");
    setShowResetConfirm(false);
  };

  const handleResetTap = () => {
    if (phase === "running" || phase === "countdown") {
      setShowResetConfirm(true);
    } else {
      doReset();
    }
  };

  /** Skip path: mark the block as done without recording a timed score.
   *  Useful when the athlete already did the metcon offline / wants to log
   *  it without running the timer. We persist `rounds = plannedRounds` and
   *  `elapsed = 0` so the block reads as "completed, no timer recorded". */
  const handleMarkCompletedNoTimer = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onCompleteBlock(plannedRounds, 0, {});
      onBack();
    } finally {
      setSaving(false);
    }
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
      await onCompleteBlock(roundsDone, elapsed, weightsKg);
      onBack();
    } finally {
      setSaving(false);
    }
  };

  /* ── RENDER ─────────────────────────────────────────────────────────── */

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
      {cleanCue && phase !== "finished" && (
        <div className="px-5 pt-2 pb-1">
          <div className="rounded-xl p-3" style={{ background: "hsl(var(--secondary))", borderLeft: `3px solid hsl(var(--primary))` }}>
            <p className="font-body text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{cleanCue}</p>
          </div>
        </div>
      )}

      {/* Timer / countdown / finished states */}
      <div className="flex flex-col items-center justify-center px-5 py-8" style={{ minHeight: "36vh" }}>
        {phase === "finished" ? (
          /* RESULT FORM — happens automatically after TERMINÉ or hitting cap */
          <div className="flex w-full max-w-sm flex-col items-center gap-3 animate-fade-in">
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>Tu tiempo</p>
            <p className="font-mono font-bold text-primary" style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-0.04em" }}>
              {formatTime(elapsed)}
            </p>
            {elapsed >= capSec && (
              <p className="font-body text-destructive" style={{ fontSize: 13 }}>
                Llegaste al cap — registrado como tiempo máximo
              </p>
            )}
          </div>
        ) : phase === "countdown" ? (
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
            <button onClick={handleCancelCountdown} className="mt-4 press-scale font-body text-sm text-muted-foreground underline">
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

            {phase === "idle" ? (
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={handleStart}
                  className="press-scale flex items-center gap-3 rounded-full bg-primary px-8 py-4 font-display text-sm font-semibold text-primary-foreground"
                >
                  <Play className="h-5 w-5" />
                  INICIAR
                </button>
                <button
                  onClick={handleMarkCompletedNoTimer}
                  disabled={saving}
                  className="press-scale font-body text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Ya lo hice — marcar completo sin timer
                </button>
              </div>
            ) : (
              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={handleResetTap}
                  aria-label="Reiniciar timer"
                  className="press-scale flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card"
                  title="Reiniciar"
                >
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                </button>
                <button
                  onClick={handleFinish}
                  className="press-scale rounded-full bg-primary px-10 py-4 font-display text-base font-semibold text-primary-foreground"
                  style={{ minWidth: 200 }}
                >
                  ✓ TERMINÉ
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* RESULT FORM continues — rounds + weights */}
      {phase === "finished" && (
        <div className="flex-1 px-5 pb-8 animate-fade-in">
          {/* Rounds picker */}
          <div className="mt-2 rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9, letterSpacing: "2px" }}>
              Rondas completadas
            </p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {Array.from({ length: plannedRounds + 1 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  onClick={() => setRoundsDone(n)}
                  className="press-scale flex h-10 min-w-[40px] items-center justify-center rounded-lg px-3 font-mono"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    background: roundsDone === n ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                    color: roundsDone === n ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    border: roundsDone === n ? "1px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 font-body text-muted-foreground" style={{ fontSize: 11 }}>
              {roundsDone === plannedRounds
                ? `Completaste las ${plannedRounds} rondas`
                : roundsDone === 0
                  ? "Sin rondas registradas"
                  : `${roundsDone} de ${plannedRounds} ronda${roundsDone === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* Per-exercise weights */}
          <div className="mt-3 rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9, letterSpacing: "2px" }}>
              Pesos usados (opcional)
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              {block.groups.map((group) => {
                const ex = group.exercise;
                const exId = ex.id;
                // Skip bodyweight-only / no-load exercises (Pull-up etc)
                // Heuristic: if name contains "pull-up", "lunge bodyweight", "air squat" → no weight field
                const lower = ex.name.toLowerCase();
                const noLoad = /^pull-?up\b|bodyweight|air squat|sit-?up|crunch/.test(lower);
                if (noLoad) return null;
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

          {/* Action buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="press-scale flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Guardar y continuar
            </button>
            <button
              onClick={doReset}
              disabled={saving}
              className="press-scale font-body text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Rehacer el metcon
            </button>
          </div>
        </div>
      )}

      {/* Exercise list — only visible when not in finished state (it's redundant once you see the form) */}
      {phase !== "finished" && (
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
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
            <p className="font-display text-base font-semibold text-foreground">¿Reiniciar el metcon?</p>
            <p className="mt-2 font-body text-muted-foreground" style={{ fontSize: 13 }}>
              Vas a perder los {formatTime(elapsed)} actuales y vuelves a 00:00.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="press-scale flex-1 rounded-xl py-3 font-body text-sm font-medium text-foreground"
                style={{ background: "hsl(var(--secondary))" }}
              >
                Cancelar
              </button>
              <button
                onClick={doReset}
                className="press-scale flex-1 rounded-xl bg-destructive py-3 font-body text-sm font-medium text-destructive-foreground"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
