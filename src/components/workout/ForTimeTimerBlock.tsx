import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Minus, Plus, Dumbbell, RotateCcw, Check } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";
import { playBeep } from "@/lib/audio";
import WeightPickerSheet, { BODYWEIGHT_SENTINEL } from "./WeightPickerSheet";

interface Props {
  block: WorkoutBlock;
  onBack: () => void;
  /** Save the metcon result.
   *  rounds: rounds the athlete completed.
   *  elapsedSec: timer time. capped at the block's cap if cap was hit.
   *  weightsByExerciseIdKg: optional dictionary of weight in KG per exercise_id.
   *  Use BODYWEIGHT_SENTINEL value for bodyweight ("BW").
   */
  onCompleteBlock: (rounds: number, elapsedSec: number, weightsByExerciseIdKg: Record<string, number>) => Promise<void>;
  onOpenVideo: (exercise: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  nextBlockName?: string | null;
  onNextBlock?: () => void;
  /** Display unit for weight inputs. Default kg. */
  weightUnit?: "kg" | "lb";
  /** Suggested weight from previous sessions, used to pre-populate the chip. */
  getSuggestedWeight?: (exerciseId: string, plannedReps: number | null) => { weightKg: number | null; hint: string | null };
}

/** Heuristic: a movement that's never loaded (no weight chip needed). */
function isPureBodyweight(name: string): boolean {
  const n = name.toLowerCase();
  return /^bodyweight\b|^pull-?up\b|^chin-?up\b|^air\s+squat\b|^sit-?up\b|^crunch\b|^burpee\b|^push-?up\b|^box\s+jump\b|hollow\s+body|plank/i.test(n);
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

const COUNTDOWN_SECONDS = 10;

// playBeep is now imported from @/lib/audio — uses the shared AudioContext
// singleton, eliminating the iOS context-per-origin limit issue.
const vibrate = (ms: number) => {
  try { navigator.vibrate?.(ms); } catch { /* noop */ }
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function ForTimeTimerBlock({
  block, onBack, onCompleteBlock, onOpenVideo, nextBlockName, onNextBlock, weightUnit = "kg", getSuggestedWeight,
}: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;

  const capSec = parseCapSeconds(block);
  const plannedRounds = parsePlannedRounds(block);

  const rawCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "") as string;
  const cleanCue = rawCue.replace(/^FOR\s+TIME[:.]?\s*/i, "").trim();

  // If every set in the block is already marked completed in the DB, start
  // the component in "completed" state so re-entering the block shows the
  // post-completion view (with "Siguiente: [next block]") instead of a fresh
  // 00:00 timer. Mirrors EmomTimerBlock's allDone pattern.
  const allDone = block.groups.length > 0 &&
    block.groups.every(g => g.sets.length > 0 && g.sets.every(s => s.is_completed));
  // Recover the rounds the athlete logged from the first completed set (we
  // store rounds as actual_reps when saving — see Workout.tsx).
  const initialRounds = allDone
    ? (block.groups[0]?.sets[0]?.actual_reps ?? plannedRounds)
    : 0;

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(allDone);
  const [completed, setCompleted] = useState(allDone);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rounds, setRounds] = useState(initialRounds);
  // weights: per-exercise display string. "BW" sentinel for bodyweight, "" for unset, else number string in display unit.
  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of block.groups) {
      const exId = g.exercise.id;
      const set = g.sets[0];
      // 1) Already logged in DB → use that.
      if (set?.actual_weight === BODYWEIGHT_SENTINEL) {
        init[exId] = "BW";
        continue;
      }
      if (set?.actual_weight != null && set.actual_weight > 0) {
        init[exId] = String(toDisplayWeight(set.actual_weight, weightUnit));
        continue;
      }
      // 2) Suggested from history.
      if (getSuggestedWeight) {
        const sug = getSuggestedWeight(exId, set?.planned_reps ?? null);
        if (sug.weightKg === BODYWEIGHT_SENTINEL) {
          init[exId] = "BW";
        } else if (sug.weightKg != null && sug.weightKg > 0) {
          init[exId] = String(toDisplayWeight(sug.weightKg, weightUnit));
        } else {
          init[exId] = "";
        }
      } else {
        init[exId] = "";
      }
    }
    return init;
  });
  const [pickerExerciseId, setPickerExerciseId] = useState<string | null>(null);
  const [pickerInitial, setPickerInitial] = useState(0);
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
        if (raw === "BW") {
          weightsKg[exId] = BODYWEIGHT_SENTINEL;
          continue;
        }
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
              For time · cap {formatTime(capSec)} · {plannedRounds} {plannedRounds === 1 ? "ronda" : "rondas"}
            </p>
          </div>
          <div className="shrink-0" style={{ width: 36 }} />
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

            <div className="mt-6 flex items-center gap-5">
              <button
                onClick={() => {
                  if (!hasStarted && !running) {
                    setCountdown(COUNTDOWN_SECONDS);
                  } else {
                    setRunning((r) => !r);
                  }
                }}
                className="press-scale flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary"
              >
                {running ? (
                  <Pause className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                )}
              </button>
              {/* "Terminé" pill — was a muted text-link before, easy to miss next
                  to the giant Play circle. Promoted to a visible bordered pill so
                  athletes notice they can close out the For Time before the cap
                  hits (the cap auto-completes too, but most For Times finish
                  early). */}
              <button
                onClick={handleFinish}
                className="press-scale rounded-full px-5 py-2.5 font-display text-xs font-semibold uppercase"
                style={{
                  background: tc.accentBg,
                  color: tc.accent,
                  border: `1px solid ${tc.accent}66`,
                  letterSpacing: "0.05em",
                }}
              >
                Terminé
              </button>
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

      {/* Exercise list — each loaded exercise carries its own weight chip
          (same pattern as the rest of the app: weight lives with the exercise,
          not in a separate "pesos usados" form). */}
      <div className="flex-1 px-5 pb-4">
        <p className="font-mono uppercase text-muted-foreground mb-3" style={{ fontSize: 9, letterSpacing: "2px" }}>
          EJERCICIOS
        </p>
        <div className="flex flex-col gap-2">
          {block.groups.map((group) => {
            const ex = group.exercise;
            const exId = ex.id;
            const cue = group.sets[0]?.coaching_cue_override || ex.coaching_cue;
            const isBW = isPureBodyweight(ex.name);
            const currentWeight = weights[exId] ?? "";
            const hasWeight = currentWeight === "BW" || (currentWeight !== "" && parseFloat(currentWeight) > 0);
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
                  {group.sets[0]?.planned_reps && (
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {group.sets[0].planned_reps} reps
                    </p>
                  )}
                </div>
                {/* Weight chip — same look as EmomTimerBlock's "Peso de la barra".
                    Tap to open the shared WeightPickerSheet. Hidden for pure bodyweight movements. */}
                {!isBW && (
                  <button
                    onClick={() => {
                      setPickerExerciseId(exId);
                      const init = currentWeight === "BW"
                        ? BODYWEIGHT_SENTINEL
                        : (parseFloat(currentWeight) || 0);
                      setPickerInitial(init);
                    }}
                    className="press-scale flex items-center gap-1.5 rounded-lg px-3 py-1.5 shrink-0"
                    style={{
                      background: hasWeight ? tc.accentBgStrong : "hsl(var(--secondary))",
                      border: hasWeight ? `1px solid ${tc.accent}4D` : "1px solid hsl(var(--border))",
                      minWidth: 72,
                    }}
                  >
                    {hasWeight ? (
                      currentWeight === "BW" ? (
                        <span className="font-mono text-sm font-semibold" style={{ color: tc.accent }}>BW</span>
                      ) : (
                        <>
                          <span className="font-mono text-sm font-semibold" style={{ color: tc.accent }}>
                            {currentWeight}
                          </span>
                          <span className="font-mono text-[10px]" style={{ color: tc.accent, opacity: 0.7 }}>
                            {weightUnit}
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground">{weightUnit}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared weight picker — same one used by EmomTimerBlock + BlockDetail. */}
      <WeightPickerSheet
        visible={pickerExerciseId !== null}
        unit={weightUnit}
        initialValue={pickerInitial}
        onConfirm={(value) => {
          if (!pickerExerciseId) return;
          const isBW = value === BODYWEIGHT_SENTINEL;
          const displayVal = isBW ? "BW" : String(value);
          setWeights((prev) => ({ ...prev, [pickerExerciseId]: displayVal }));
        }}
        onClose={() => setPickerExerciseId(null)}
      />

      {/* Next-block CTA — single line + breathing circle */}
      {completed && onNextBlock && nextBlockName && (
        <div className="px-5 pt-6 pb-10 flex items-center justify-center">
          <button
            onClick={async () => { await handleSubmit(); onNextBlock(); }}
            disabled={saving}
            className="press-scale flex items-center gap-3 disabled:opacity-50"
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

      {/* Save-and-return CTA when no next block exists. */}
      {completed && !onNextBlock && (
        <div className="px-5 pt-6 pb-10 flex items-center justify-center">
          <button
            onClick={async () => { await handleSubmit(); onBack(); }}
            disabled={saving}
            className="press-scale flex items-center gap-3 disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
}
