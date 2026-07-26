import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Minus, Plus, Dumbbell, RotateCcw, Check } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";
import { playBeep } from "@/lib/audio";
import { useWakeLock } from "@/hooks/useWakeLock";
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
  blockIndex?: number;
  totalBlocks?: number;
  onNextBlock?: () => void;
  /** Display unit for weight inputs. Default kg. */
  weightUnit?: "kg" | "lb";
  /** Suggested weight from previous sessions, used to pre-populate the chip. */
  getSuggestedWeight?: (exerciseId: string, plannedReps: number | null) => { weightKg: number | null; hint: string | null };
}

/** Heuristic: a movement that's never loaded (no weight chip needed). */
function isPureBodyweight(name: string): boolean {
  const n = name.toLowerCase();
  // Anything with "weighted", "plate", "loaded" in the name is by definition
  // NOT bodyweight — must show the weight input (e.g. Weighted Plank, Plate
  // Ground to Overhead, Loaded Carry). Guard early so the "plank" match below
  // doesn't swallow "Weighted Plank".
  if (/\b(weighted|plate|loaded)\b/i.test(n)) return false;
  return /^bodyweight\b|^pull-?up\b|^chin-?up\b|^air\s+squat\b|^sit-?up\b|^crunch\b|^burpee\b|^push-?up\b|^box\s+jump\b|hollow\s+body|plank/i.test(n);
}

/**
 * Parse a "Penalty por break: X" phrase from a coaching cue.
 * Returns just the penalty description ("70 Jump Rope Singles") or null.
 * Used to render a red BREAK badge on chipper exercises with penalties so
 * athletes see the rule at a glance without reading the full header.
 */
function parsePenalty(cue: string | null | undefined): string | null {
  if (!cue) return null;
  // Match "Penalty por break: <phrase>." (stopping at period or end of string).
  const m = cue.match(/penalty\s+por\s+break\s*:\s*([^.]+?)(?:\s+antes\s+de\b|\.|$)/i);
  if (!m) return null;
  return m[1].trim();
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
  block, onBack, onCompleteBlock, onOpenVideo, nextBlockName, onNextBlock, weightUnit = "kg", getSuggestedWeight, blockIndex, totalBlocks,
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
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Absolute-time tracking so background/throttle doesn't drift the clock.
  const countdownEndRef = useRef<number>(0);
  const lastCountdownBeepRef = useRef<number>(-1);
  // Count-up: elapsed = accumulatedSec + (running ? (Date.now() - segmentStart)/1000 : 0)
  const segmentStartRef = useRef<number>(0); // Date.now() when the current running segment began (0 when paused/stopped)
  const accumulatedRef = useRef<number>(0); // seconds elapsed BEFORE the current running segment
  const warnedRef = useRef<boolean>(false); // cap-60s warning fired
  const finishedRef = useRef<boolean>(allDone); // cap-reached beep fired
  const completedRef = useRef<boolean>(allDone);
  useEffect(() => { completedRef.current = completed; }, [completed]);

  // Keep the screen on during countdown, running timer, and finish flow.
  useWakeLock(!completed && (running || countdown !== null));

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Countdown tick — absolute time so it survives backgrounding.
  useEffect(() => {
    if (countdown === null) {
      // Reset so a future Start begins the countdown fresh.
      countdownEndRef.current = 0;
      lastCountdownBeepRef.current = -1;
      return;
    }
    // Set the absolute end time on the first entry into countdown.
    if (countdownEndRef.current === 0) {
      countdownEndRef.current = Date.now() + countdown * 1000;
      lastCountdownBeepRef.current = -1;
    }
    const tick = () => {
      const msLeft = countdownEndRef.current - Date.now();
      const secsLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setCountdown(secsLeft);
      // Per-second beep (deduped so background jumps don't double-fire).
      if (secsLeft > 0 && lastCountdownBeepRef.current !== secsLeft) {
        lastCountdownBeepRef.current = secsLeft;
        if (secsLeft <= 3) {
          playBeep(900, 120);
          vibrate(50);
        } else {
          playBeep(700, 80);
        }
      }
      if (secsLeft <= 0) {
        countdownEndRef.current = 0;
        playBeep(1000, 300);
        vibrate(200);
        setCountdown(null);
        setHasStarted(true);
        setRunning(true);
      }
    };
    tick();
    countdownIntervalRef.current = setInterval(tick, 250);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown === null]);

  // Manage count-up base on running/completed transitions.
  useEffect(() => {
    if (completed) {
      // Freeze — nothing to accumulate.
      segmentStartRef.current = 0;
      return;
    }
    if (running) {
      // Starting a new running segment.
      segmentStartRef.current = Date.now();
    } else {
      // Being paused/stopped — commit the segment to accumulated.
      if (segmentStartRef.current > 0) {
        accumulatedRef.current += (Date.now() - segmentStartRef.current) / 1000;
        segmentStartRef.current = 0;
      }
    }
  }, [running, completed]);

  // Main count-up tick — absolute time so it stays honest under backgrounding.
  useEffect(() => {
    if (!running || completed) return;

    const tick = () => {
      const now = Date.now();
      const seg = segmentStartRef.current > 0 ? (now - segmentStartRef.current) / 1000 : 0;
      const secs = Math.floor(accumulatedRef.current + seg);
      const next = Math.min(secs, capSec);
      setElapsed(next);
      // Cap-60s warning — fires exactly once (background jumps included).
      if (!warnedRef.current && capSec - 60 > 0 && next >= capSec - 60) {
        warnedRef.current = true;
        playBeep(900, 150);
        vibrate(100);
      }
      // Cap hit — fires exactly once.
      if (next >= capSec && !finishedRef.current) {
        finishedRef.current = true;
        setRunning(false);
        setCompleted(true);
        playBeep(500, 200);
        setTimeout(() => playBeep(500, 200), 250);
        vibrate(500);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 250);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
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
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    // Reset absolute-time counters so a fresh run starts from zero.
    segmentStartRef.current = 0;
    accumulatedRef.current = 0;
    countdownEndRef.current = 0;
    lastCountdownBeepRef.current = -1;
    warnedRef.current = false;
    finishedRef.current = false;
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
            {/* Restart — athlete can re-run the For Time (mistake, redo, second
                attempt). Without this, completed locks the block. */}
            <button
              onClick={handleRestart}
              className="press-scale mt-4 flex items-center gap-2"
              title="Volver a correr el For Time"
            >
              <RotateCcw className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
              >
                Reintentar
              </span>
            </button>
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
              Empieza el For Time en {countdown} {countdown === 1 ? "segundo" : "segundos"}
            </p>
            <button
              onClick={() => setCountdown(null)}
              className="press-scale mt-3 font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <p
              className="font-display tabular-nums transition-colors"
              style={{
                fontWeight: 300,
                fontSize: 72,
                lineHeight: 1,
                letterSpacing: "-0.05em",
                color: isLast60 ? "#D45555" : "hsl(var(--foreground))",
                animation: isLast60 ? "pulse 1s infinite" : undefined,
              }}
            >
              {formatTime(elapsed)}
            </p>
            <p
              className="mt-3 font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "2.5px", color: "#C4A24E" }}
            >
              {formatTime(remaining)} restantes
            </p>

            <div className="mt-4 h-px w-full max-w-xs overflow-hidden" style={{ background: "hsl(var(--border))", opacity: 0.5 }}>
              <div className="h-full transition-all duration-1000" style={{ width: `${progress * 100}%`, background: "#C4A24E" }} />
            </div>

            <div className="mt-7 flex items-center gap-6">
              <button
                onClick={() => {
                  if (!hasStarted && !running) {
                    setCountdown(COUNTDOWN_SECONDS);
                  } else {
                    setRunning((r) => !r);
                  }
                }}
                className={`press-scale flex items-center justify-center ${!running ? "liftory-breathe" : ""}`}
                style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: "1px solid #C4A24E",
                  boxShadow: running ? `0 0 28px #C4A24E40` : `0 0 18px #C4A24E30`,
                }}
              >
                {running ? (
                  <Pause className="h-5 w-5" style={{ color: "#C4A24E" }} />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" style={{ color: "#C4A24E" }} />
                )}
              </button>
              <button
                onClick={handleFinish}
                className="press-scale flex items-center gap-2"
              >
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "2.5px", color: "#C4A24E", fontWeight: 600 }}
                >
                  Terminé
                </span>
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: "1px solid #C4A24E",
                  }}
                >
                  <Check className="h-3 w-3" style={{ color: "#C4A24E" }} />
                </span>
              </button>
            </div>

            {(hasStarted || running) && (
              <button
                onClick={handleRestart}
                className="press-scale mt-5 flex items-center gap-2"
                title="Reiniciar timer"
              >
                <RotateCcw className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                >
                  Reiniciar
                </span>
              </button>
            )}

            {/* Round counter */}
            <div className="mt-7 flex items-center gap-6">
              <button
                onClick={() => setRounds((r) => Math.max(0, r - 1))}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
              >
                <Minus className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
              <div className="text-center">
                <p
                  className="font-display tabular-nums"
                  style={{ fontWeight: 300, fontSize: 40, lineHeight: 1, letterSpacing: "-0.04em", color: "hsl(var(--foreground))" }}
                >
                  {rounds}
                </p>
                <p
                  className="font-mono uppercase mt-1"
                  style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                >
                  Rondas
                </p>
              </div>
              <button
                onClick={() => setRounds((r) => r + 1)}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
              >
                <Plus className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Exercise list — each loaded exercise carries its own weight chip
          (same pattern as the rest of the app: weight lives with the exercise,
          not in a separate "pesos usados" form).
          When the chipper is fully completed, dim the whole list to the
          unified 0.5 "done" opacity — matches strength rows, mobility rows,
          cooldown cards, and block cards in WorkoutOverview. */}
      <div className="flex-1 px-5 pb-4 transition-opacity" style={{ opacity: completed ? 0.5 : 1 }}>
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
            const durationSec = group.sets[0]?.planned_duration_seconds;
            const penalty = parsePenalty(cue);
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
                  {group.sets[0]?.planned_reps != null && group.sets[0].planned_reps > 0 && (
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {group.sets[0].planned_reps} reps
                    </p>
                  )}
                  {durationSec != null && durationSec > 0 && (
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {durationSec >= 60
                        ? `${Math.floor(durationSec / 60)} min${durationSec % 60 ? ` ${durationSec % 60}s` : ""}`
                        : `${durationSec}s`}
                    </p>
                  )}
                  {/* BREAK penalty badge — parsed from cue. Bright red pill so
                      athletes see the rule without opening the video card. */}
                  {penalty && (
                    <div
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5"
                      style={{
                        background: "#D4555520",
                        border: "1px solid #D4555560",
                      }}
                    >
                      <span className="font-mono font-bold" style={{ fontSize: 9, letterSpacing: "1px", color: "#D45555" }}>
                        BREAK
                      </span>
                      <span className="font-mono" style={{ fontSize: 10, color: "#D45555" }}>·</span>
                      <span className="font-mono font-medium" style={{ fontSize: 10, color: "#D45555" }}>
                        {penalty}
                      </span>
                    </div>
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
        <div className="px-5 pt-6 pb-10 flex flex-col items-center gap-3">
          {typeof blockIndex === "number" && typeof totalBlocks === "number" && (
            <p
              className="font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Último bloque · {blockIndex + 1} de {totalBlocks}
            </p>
          )}
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
