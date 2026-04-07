import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Check, SkipForward, SkipBack, Dumbbell, ChevronDown } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import WeightPickerSheet from "./WeightPickerSheet";
import type { WorkoutBlock } from "./WorkoutOverview";
import type { WorkoutSetData } from "@/hooks/useWorkoutData";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";

/* ─── types ─── */

interface EmomTimerBlockProps {
  block: WorkoutBlock;
  saving: boolean;
  weightUnit: string;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteAll: () => Promise<void>;
  onUncompleteAll: () => Promise<void>;
  onUpdateSetWeight: (setId: string, weightKg: number) => void;
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weightKg: number | null; hint: string | null };
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}

type Phase = "idle" | "countdown" | "active" | "done";

interface RoundRpe {
  fromRound: number;
  toRound: number;
  rpe: string;
}

/* ─── Nomenclature ───
 *
 * VENTANA = each timed interval (e.g. 1:15). One exercise, one side.
 * RONDA   = a full cycle through ALL exercises in the Alterna sequence.
 *           e.g. Shrimp R → Shrimp L → Plyo BSS R → Plyo BSS L = 1 ronda (4 ventanas).
 * Total   = totalRondas × ventanasPerRonda ventanas.
 *
 * New cue format: "EMOM 75s | 3R x 4V. Alterna: Shrimp R, Shrimp L, Plyo BSS R, Plyo BSS L. R1-2: RPE 8.5, R3: RPE 9"
 * Legacy format:  "EMOM 75s x 8 rounds. Alterna: ... (x2). R1-4: RPE 7, R5-8: RPE 7.5"
 */

/* ─── pure helpers ─── */

const COUNTDOWN_SECONDS = 10;

interface EmomConfig {
  windowSeconds: number;
  totalRondas: number;
  ventanasPerRonda: number;
  totalVentanas: number;
}

function parseEmomConfig(block: WorkoutBlock): EmomConfig {
  const allSets = block.groups.flatMap((g) => g.sets);

  let windowSeconds = 0;
  let totalRondas = 1;
  let ventanasPerRonda = 1;

  for (const s of allSets) {
    const cue = s.coaching_cue_override || "";

    // New format: "EMOM 75s | 3R x 4V"
    const newMatch = cue.match(/EMOM\s+(\d+)s?\s*\|\s*(\d+)R\s*x\s*(\d+)V/i);
    if (newMatch) {
      windowSeconds = parseInt(newMatch[1], 10);
      totalRondas = parseInt(newMatch[2], 10);
      ventanasPerRonda = parseInt(newMatch[3], 10);
      break;
    }

    // Legacy format: "EMOM 75s x 8 rounds"
    const legacyMatch = cue.match(/EMOM\s+(\d+)s?\s*x\s*(\d+)\s*rounds?/i);
    if (legacyMatch) {
      windowSeconds = parseInt(legacyMatch[1], 10);
      const totalWindows = parseInt(legacyMatch[2], 10);
      // Derive rondas from Alterna item count
      const alternaMatch = cue.match(/Alterna:\s*(.+?)(?:\s*\(x\d+\))?(?:\.\s|$)/i);
      if (alternaMatch) {
        const items = alternaMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
        ventanasPerRonda = items.length || 1;
        totalRondas = Math.max(1, Math.round(totalWindows / ventanasPerRonda));
      } else {
        totalRondas = totalWindows;
        ventanasPerRonda = 1;
      }
      break;
    }
  }

  // Fallback for windowSeconds from planned_rest_seconds
  if (!windowSeconds) {
    for (const s of allSets) {
      if (s.planned_rest_seconds && s.planned_rest_seconds > 0) {
        windowSeconds = s.planned_rest_seconds;
        break;
      }
    }
  }

  if (!windowSeconds) windowSeconds = 60;
  if (totalRondas <= 0) totalRondas = 1;
  if (ventanasPerRonda <= 0) ventanasPerRonda = 1;

  return {
    windowSeconds,
    totalRondas,
    ventanasPerRonda,
    totalVentanas: totalRondas * ventanasPerRonda,
  };
}

/** RPE ranges — in the new format these refer to RONDAS (not ventanas). */
function parseRoundRpe(block: WorkoutBlock): RoundRpe[] {
  const allSets = block.groups.flatMap((g) => g.sets);
  const cue = allSets[0]?.coaching_cue_override || "";

  const results: RoundRpe[] = [];

  const todosMatch = cue.match(/Todos\s+a\s+RPE\s+([\d.]+(?:-[\d.]+)?)/i);
  if (todosMatch) {
    return [{ fromRound: 1, toRound: 999, rpe: todosMatch[1] }];
  }

  // "R1-2: RPE 8.5" or "R3: RPE 9"
  const shortRegex = /R(\d+)(?:-(\d+))?\s*:\s*RPE\s+([\d.]+(?:-[\d.]+)?)/gi;
  let shortMatch;
  while ((shortMatch = shortRegex.exec(cue)) !== null) {
    results.push({
      fromRound: parseInt(shortMatch[1], 10),
      toRound: shortMatch[2] ? parseInt(shortMatch[2], 10) : parseInt(shortMatch[1], 10),
      rpe: shortMatch[3],
    });
  }
  if (results.length > 0) return results;

  const longRegex = /Rounds?\s+(\d+)(?:-(\d+))?\s*:\s*RPE\s+([\d.]+(?:-[\d.]+)?)/gi;
  let longMatch;
  while ((longMatch = longRegex.exec(cue)) !== null) {
    results.push({
      fromRound: parseInt(longMatch[1], 10),
      toRound: longMatch[2] ? parseInt(longMatch[2], 10) : parseInt(longMatch[1], 10),
      rpe: longMatch[3],
    });
  }

  return results;
}

function getRpeForRound(rpeRanges: RoundRpe[], round: number): string | null {
  for (const r of rpeRanges) {
    if (round >= r.fromRound && round <= r.toRound) return r.rpe;
  }
  return null;
}

/**
 * Parse ventana-by-ventana exercise sequence from coaching cue.
 * Pattern: "Alterna: Shrimp R, Shrimp L, Plyo BSS R, Plyo BSS L"
 * Returns an array of labels, one per ventana (cycling for totalVentanas).
 * If no "Alterna:" pattern found, returns null.
 */
function parseVentanaSequence(block: WorkoutBlock, totalVentanas: number): string[] | null {
  const cue = block.groups.flatMap((g) => g.sets)[0]?.coaching_cue_override || "";

  const alternaMatch = cue.match(/Alterna:\s*(.+?)(?:\s*\(x\d+\))?(?:\.\s|$)/i);
  if (!alternaMatch) return null;

  const items = alternaMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  const sequence: string[] = [];
  for (let i = 0; i < totalVentanas; i++) {
    sequence.push(items[i % items.length]);
  }
  return sequence;
}

/**
 * Detect if the EMOM alternates R/L sides (bilateral work).
 * Returns true if Alterna items contain both "R" and "L" variants.
 */
function isBilateral(block: WorkoutBlock): boolean {
  const cue = block.groups.flatMap((g) => g.sets)[0]?.coaching_cue_override || "";
  const alternaMatch = cue.match(/Alterna:\s*(.+?)(?:\s*\(x\d+\))?(?:\.\s|$)/i);
  if (!alternaMatch) return false;
  const items = alternaMatch[1].split(",").map((s) => s.trim());
  const hasR = items.some((i) => /\bR$/i.test(i) || /\bRight$/i.test(i));
  const hasL = items.some((i) => /\bL$/i.test(i) || /\bLeft$/i.test(i));
  return hasR && hasL;
}

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/* ─── robust mobile audio engine ───
 *
 * iOS Safari blocks AudioContext playback unless it is created + resumed inside
 * a user-gesture handler. Oscillator-based beeps also fail silently on many
 * mobile browsers. This engine uses a dual approach:
 *
 *  1. On first user tap (handleStart), we create an AudioContext AND play a
 *     short silent buffer to permanently unlock the audio pipeline.
 *  2. Beep sounds are generated via oscillators with gain envelope shaping
 *     for a clean Tabata-style sound (no clicks/pops).
 *  3. Fallback: if AudioContext fails entirely, we use an <audio> element
 *     playing a tiny inline WAV data-URI.
 */

function createSilentBuffer(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  return buf;
}

/* ─── component ─── */

export default function EmomTimerBlock({
  block,
  saving,
  weightUnit,
  isCompleted,
  onCompleteAll,
  onUncompleteAll,
  onUpdateSetWeight,
  getSuggestedWeight,
  onOpenVideo,
}: EmomTimerBlockProps) {
  // Defensive: if block has no groups or no sets, show a minimal fallback
  const hasData = block.groups.length > 0 && block.groups.some((g) => g.sets.length > 0);

  const { windowSeconds, totalRondas, ventanasPerRonda, totalVentanas } = useMemo(
    () => parseEmomConfig(block),
    [block],
  );
  const rpeRanges = useMemo(() => parseRoundRpe(block), [block]);
  const ventanaSequence = useMemo(
    () => parseVentanaSequence(block, totalVentanas),
    [block, totalVentanas],
  );
  const bilateral = useMemo(() => isBilateral(block), [block]);
  const allSets = useMemo(() => block.groups.flatMap((g) => g.sets), [block]);
  const firstCue = allSets[0]?.coaching_cue_override;
  const allDone = allSets.length > 0 && allSets.every((s) => isCompleted(s));

  const [phase, setPhase] = useState<Phase>(allDone ? "done" : "idle");
  // currentWindow = global ventana index (0 to totalVentanas-1)
  const [currentWindow, setCurrentWindow] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(windowSeconds);

  // Derived from currentWindow
  const currentRonda = Math.floor(currentWindow / ventanasPerRonda); // 0-indexed
  const ventanaInRonda = currentWindow % ventanasPerRonda; // 0-indexed

  // Weight inputs — one array per exercise, one entry per ronda
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of block.groups) {
      const weights: string[] = [];
      for (const set of g.sets) {
        if (set.actual_weight != null && set.actual_weight > 0) {
          weights.push(String(toDisplayWeight(set.actual_weight, weightUnit)));
        } else {
          const suggestion = getSuggestedWeight(set.exercise_id, set.planned_reps);
          weights.push(
            suggestion.weightKg != null
              ? String(toDisplayWeight(suggestion.weightKg, weightUnit))
              : "",
          );
        }
      }
      init[g.exercise.id] = weights;
    }
    return init;
  });
  // Tracks which ronda indices the user explicitly changed (for smart-fill)
  const [userOverrides, setUserOverrides] = useState<Record<string, Set<number>>>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [pickerExerciseId, setPickerExerciseId] = useState<string | null>(null);
  const [pickerRondaIndex, setPickerRondaIndex] = useState<number | null>(null);
  const [pickerInitial, setPickerInitial] = useState(0);
  const [running, setRunning] = useState(false);
  const [ventanaFlash, setVentanaFlash] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  // Stable refs for use inside tick
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentWindowRef = useRef(currentWindow);
  currentWindowRef.current = currentWindow;
  const onCompleteAllRef = useRef(onCompleteAll);
  onCompleteAllRef.current = onCompleteAll;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Sync external completion
  useEffect(() => {
    if (allDone && phase !== "done") {
      setPhase("done");
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [allDone, phase]);

  /* ─── audio engine ─── */

  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Play a silent buffer to permanently unlock the audio pipeline on iOS
      const source = ctx.createBufferSource();
      source.buffer = createSilentBuffer(ctx);
      source.connect(ctx.destination);
      source.start(0);

      if (ctx.state === "suspended") ctx.resume();
      audioUnlockedRef.current = true;
    } catch {
      // AudioContext not available — vibration only
    }
  }, []);

  const playBeep = useCallback(
    (type: "tick" | "transition" | "ronda" | "finish") => {
      // Vibrate as haptic feedback
      try {
        if (type === "finish") navigator.vibrate?.([100, 50, 100, 50, 200]);
        else if (type === "ronda") navigator.vibrate?.([100, 60, 100]);
        else if (type === "transition") navigator.vibrate?.([80, 40, 80]);
        else navigator.vibrate?.(40);
      } catch {
        /* no vibration API */
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      try {
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;

        if (type === "tick") {
          // Short high beep — Tabata countdown style
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.13);
        } else if (type === "transition") {
          // Single beep — ventana change within same ronda
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 1046.5; // C6
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.13);
        } else if (type === "ronda") {
          // Double beep — new ronda starts
          for (let i = 0; i < 2; i++) {
            const t = now + i * 0.15;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 1046.5; // C6
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.13);
          }
        } else {
          // Triple ascending beep — done
          const freqs = [880, 1046.5, 1318.5]; // A5, C6, E6
          for (let i = 0; i < 3; i++) {
            const t = now + i * 0.18;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freqs[i];
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.22);
          }
        }
      } catch {
        // silent fail
      }
    },
    [],
  );

  /* ─── timer core ─── */

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refs for stable access inside tick without re-creating the callback
  const windowSecondsRef = useRef(windowSeconds);
  windowSecondsRef.current = windowSeconds;
  const totalVentanasRef = useRef(totalVentanas);
  totalVentanasRef.current = totalVentanas;
  const ventanasPerRondaRef = useRef(ventanasPerRonda);
  ventanasPerRondaRef.current = ventanasPerRonda;
  const startTickingRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      const next = prev - 1;

      // Tabata-style countdown beeps for last 5 seconds
      if (next >= 1 && next <= 5) {
        playBeep("tick");
      }

      if (next <= 0) {
        // Timer hit zero — schedule phase transition as microtask so we
        // never nest setState calls inside this functional updater.
        clearTimer();
        queueMicrotask(() => {
          const _windowSeconds = windowSecondsRef.current;
          const _totalVentanas = totalVentanasRef.current;
          const _ventanasPerRonda = ventanasPerRondaRef.current;

          if (phaseRef.current === "countdown") {
            playBeep("ronda");
            setPhase("active");
            phaseRef.current = "active";
            setCurrentWindow(0);
            currentWindowRef.current = 0;
            setSecondsLeft(_windowSeconds);
            setVentanaFlash(true);
            setTimeout(() => setVentanaFlash(false), 500);
            startTickingRef.current();
            return;
          }

          if (phaseRef.current === "active") {
            const nextWin = currentWindowRef.current + 1;
            if (nextWin >= _totalVentanas) {
              // All done
              playBeep("finish");
              setPhase("done");
              phaseRef.current = "done";
              setRunning(false);
              onCompleteAllRef.current();
              return;
            }
            // Determine if we're crossing into a new ronda
            const isNewRonda = nextWin % _ventanasPerRonda === 0;
            playBeep(isNewRonda ? "ronda" : "transition");
            setCurrentWindow(nextWin);
            currentWindowRef.current = nextWin;
            setSecondsLeft(_windowSeconds);
            setVentanaFlash(true);
            setTimeout(() => setVentanaFlash(false), 500);
            startTickingRef.current();
          }
        });
        return 0;
      }
      return next;
    });
  }, [clearTimer, playBeep]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startTicking = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
  }, [clearTimer]);

  // Keep startTickingRef current
  startTickingRef.current = startTicking;

  /* ─── handlers ─── */

  const handleStart = useCallback(() => {
    // Unlock audio on user gesture (critical for iOS)
    unlockAudio();

    if (phase === "idle") {
      setPhase("countdown");
      phaseRef.current = "countdown";
      setSecondsLeft(COUNTDOWN_SECONDS);
      setRunning(true);
      startTicking();
    } else if (phase === "countdown" || phase === "active") {
      setRunning(true);
      startTicking();
    }
  }, [phase, startTicking, unlockAudio]);

  const handlePause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const handleSkip = useCallback(() => {
    clearTimer();

    if (phase === "countdown") {
      playBeep("ronda");
      setPhase("active");
      phaseRef.current = "active";
      setCurrentWindow(0);
      currentWindowRef.current = 0;
      setSecondsLeft(windowSeconds);
      setVentanaFlash(true);
      setTimeout(() => setVentanaFlash(false), 500);
      if (running) startTicking();
    } else if (phase === "active") {
      const nextWindow = currentWindow + 1;
      if (nextWindow >= totalVentanas) {
        playBeep("finish");
        setPhase("done");
        phaseRef.current = "done";
        setRunning(false);
        onCompleteAll();
      } else {
        const isNewRonda = nextWindow % ventanasPerRonda === 0;
        playBeep(isNewRonda ? "ronda" : "transition");
        setCurrentWindow(nextWindow);
        currentWindowRef.current = nextWindow;
        setSecondsLeft(windowSeconds);
        setVentanaFlash(true);
        setTimeout(() => setVentanaFlash(false), 500);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, currentWindow, totalVentanas, ventanasPerRonda, windowSeconds, running, startTicking, playBeep, onCompleteAll]);

  const handleBack = useCallback(() => {
    clearTimer();

    if (phase === "countdown") {
      setPhase("idle");
      phaseRef.current = "idle";
      setRunning(false);
      setSecondsLeft(windowSeconds);
    } else if (phase === "active") {
      if (currentWindow > 0) {
        setCurrentWindow(currentWindow - 1);
        currentWindowRef.current = currentWindow - 1;
        setSecondsLeft(windowSeconds);
        if (running) startTicking();
      } else {
        setSecondsLeft(windowSeconds);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, currentWindow, windowSeconds, running, startTicking]);

  const handleReset = useCallback(() => {
    clearTimer();
    setRunning(false);
    setPhase("idle");
    phaseRef.current = "idle";
    setCurrentWindow(0);
    currentWindowRef.current = 0;
    setSecondsLeft(windowSeconds);
    onUncompleteAll();
  }, [clearTimer, windowSeconds, onUncompleteAll]);

  /* ─── derived values ─── */

  const totalWindowSeconds =
    phase === "countdown" ? COUNTDOWN_SECONDS : windowSeconds;
  const progress =
    phase === "countdown" || phase === "active"
      ? ((totalWindowSeconds - secondsLeft) / totalWindowSeconds) * 100
      : 0;

  // RPE is per RONDA (1-indexed)
  const currentRpe = phase === "active" ? getRpeForRound(rpeRanges, currentRonda + 1) : null;
  const currentExercise = phase === "active" && ventanaSequence ? ventanaSequence[currentWindow] : null;

  // Next ventana info
  const hasNextVentana = phase === "active" && currentWindow + 1 < totalVentanas;
  const nextWindow = currentWindow + 1;
  const nextRonda = Math.floor(nextWindow / ventanasPerRonda);
  const nextRpe = hasNextVentana ? getRpeForRound(rpeRanges, nextRonda + 1) : null;
  const nextExercise = hasNextVentana && ventanaSequence ? ventanaSequence[nextWindow] : null;
  const rpeChanges = hasNextVentana && nextRpe !== currentRpe;
  const isNextNewRonda = hasNextVentana && nextRonda !== currentRonda;

  const isWarning = phase !== "idle" && secondsLeft <= 5 && secondsLeft > 0;

  /* ─── circular progress for active timer ─── */
  const RADIUS = 88;
  const STROKE = 6;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDash = CIRCUMFERENCE * (1 - progress / 100);

  /* ─── render ─── */

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-body text-sm text-muted-foreground">
          No se encontraron ejercicios para este bloque EMOM.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-lg font-bold text-foreground tracking-tight">
            {block.name}
          </p>
          {phase === "done" && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shrink-0">
              <Check className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
          )}
        </div>
        <span className="font-mono text-xs text-muted-foreground tracking-wider">
          EMOM {formatTime(windowSeconds)} · {totalRondas} RONDAS x {ventanasPerRonda} VENTANAS
        </span>
      </div>

      {/* Exercise list — idle + done */}
      {(phase === "idle" || phase === "done") && (
        <div className="px-5 pb-3 flex flex-col gap-2">
          {block.groups.map((group) => {
            const ex = group.exercise;
            const set = group.sets[0];
            const reps = set?.planned_reps;
            const cue = set?.coaching_cue_override;
            const weights = exerciseWeights[ex.id] ?? [];
            const mainWeight = weights[0] ?? "";
            const hasWeight = mainWeight !== "" && parseFloat(mainWeight) > 0;
            const isExpanded = expandedExercise === ex.id;
            const hasMultipleRondas = group.sets.length > 1;
            const allSameWeight = weights.length > 0 && weights.every((w) => w === weights[0]);

            return (
              <div key={ex.id} className="rounded-xl bg-secondary/50 p-3">
                {/* Main exercise row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cue })
                    }
                    className="shrink-0 overflow-hidden rounded-lg"
                    style={{ width: 52, height: 40 }}
                  >
                    <ExerciseThumbnail
                      thumbnailUrl={ex.thumbnail_url}
                      videoUrl={ex.video_url}
                      name={ex.name}
                      width={52}
                      height={40}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-[15px] font-semibold text-foreground truncate">
                      {ex.name}
                    </p>
                    {reps != null && (
                      <span className="font-mono text-xs text-muted-foreground">
                        x{reps}{bilateral && (
                          <span
                            className="ml-1 font-body text-[10px] font-medium px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#C9A96E" }}
                          >
                            /lado
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Weight button — collapsed: applies to all rondas */}
                  <button
                    onClick={() => {
                      setPickerExerciseId(ex.id);
                      setPickerRondaIndex(null); // null = all rondas
                      setPickerInitial(parseFloat(mainWeight) || 0);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 shrink-0"
                    style={{
                      background: hasWeight ? "rgba(199,91,57,0.12)" : "hsl(var(--border))",
                      border: hasWeight ? "1px solid rgba(199,91,57,0.25)" : "1px solid transparent",
                      minWidth: 68,
                    }}
                  >
                    {hasWeight ? (
                      <>
                        <span className="font-mono text-sm font-medium" style={{ color: "#C75B39" }}>
                          {mainWeight}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "#C75B39", opacity: 0.7 }}>
                          {weightUnit}
                        </span>
                      </>
                    ) : (
                      <>
                        <Dumbbell className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono text-xs text-muted-foreground">{weightUnit}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Per-ronda expand toggle + pills */}
                {hasMultipleRondas && (
                  <div className="mt-2" style={{ marginLeft: 64 }}>
                    {!isExpanded ? (
                      <button
                        onClick={() => setExpandedExercise(ex.id)}
                        className="flex items-center gap-1 py-0.5"
                      >
                        <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "#8A8A8E" }}>
                          {allSameWeight && hasWeight
                            ? `x${group.sets.length} rondas`
                            : "por ronda"}
                        </span>
                        <ChevronDown className="w-3 h-3" style={{ color: "#8A8A8E" }} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setExpandedExercise(null)}
                          className="flex items-center gap-1 py-0.5 mb-1.5"
                        >
                          <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "#8A8A8E" }}>
                            por ronda
                          </span>
                          <ChevronDown
                            className="w-3 h-3 transition-transform rotate-180"
                            style={{ color: "#8A8A8E" }}
                          />
                        </button>
                        <div className="flex gap-1.5">
                          {group.sets.map((rondaSet, idx) => {
                            const rondaWeight = weights[idx] ?? "";
                            const hasRondaWeight = rondaWeight !== "" && parseFloat(rondaWeight) > 0;
                            return (
                              <button
                                key={rondaSet.id}
                                onClick={() => {
                                  setPickerExerciseId(ex.id);
                                  setPickerRondaIndex(idx);
                                  setPickerInitial(parseFloat(rondaWeight) || parseFloat(mainWeight) || 0);
                                }}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors"
                                style={{
                                  background: hasRondaWeight ? "rgba(199,91,57,0.08)" : "rgba(255,255,255,0.04)",
                                  border: hasRondaWeight
                                    ? "1px solid rgba(199,91,57,0.2)"
                                    : "1px solid rgba(255,255,255,0.06)",
                                }}
                              >
                                <span
                                  className="font-mono text-[10px] font-medium"
                                  style={{ color: "#8A8A8E" }}
                                >
                                  R{idx + 1}
                                </span>
                                <span
                                  className="font-mono text-xs font-medium"
                                  style={{ color: hasRondaWeight ? "#C75B39" : "#8A8A8E" }}
                                >
                                  {hasRondaWeight ? `${rondaWeight} ${weightUnit}` : `— ${weightUnit}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Weight picker sheet — with smart-fill logic */}
      <WeightPickerSheet
        visible={pickerExerciseId !== null}
        unit={weightUnit as "kg" | "lb"}
        initialValue={pickerInitial}
        onConfirm={(value) => {
          if (!pickerExerciseId) return;
          const group = block.groups.find((g) => g.exercise.id === pickerExerciseId);
          if (!group) return;

          const kgValue = toStorageWeight(value, weightUnit);
          const displayVal = String(value);

          if (pickerRondaIndex === null) {
            // Collapsed mode → apply to ALL rondas, clear overrides
            setExerciseWeights((prev) => ({
              ...prev,
              [pickerExerciseId]: group.sets.map(() => displayVal),
            }));
            setUserOverrides((prev) => ({ ...prev, [pickerExerciseId]: new Set() }));
            for (const s of group.sets) {
              onUpdateSetWeight(s.id, kgValue);
            }
          } else {
            // Specific ronda → smart fill downstream non-overridden rondas
            const overrides = userOverrides[pickerExerciseId] ?? new Set();
            setExerciseWeights((prev) => {
              const current = [...(prev[pickerExerciseId] ?? [])];
              for (let i = pickerRondaIndex; i < current.length; i++) {
                if (i === pickerRondaIndex || !overrides.has(i)) {
                  current[i] = displayVal;
                }
              }
              return { ...prev, [pickerExerciseId]: current };
            });
            // Mark this ronda as user-overridden
            setUserOverrides((prev) => {
              const newSet = new Set(prev[pickerExerciseId] ?? []);
              newSet.add(pickerRondaIndex);
              return { ...prev, [pickerExerciseId]: newSet };
            });
            // Persist to DB
            for (let i = pickerRondaIndex; i < group.sets.length; i++) {
              if (i === pickerRondaIndex || !overrides.has(i)) {
                onUpdateSetWeight(group.sets[i].id, kgValue);
              }
            }
          }
        }}
        onClose={() => {
          setPickerExerciseId(null);
          setPickerRondaIndex(null);
        }}
      />

      {/* Coaching cue — visible in idle */}
      {firstCue && phase === "idle" && (
        <div className="px-5 pb-4">
          <p className="font-body text-[13px] text-muted-foreground leading-relaxed">{firstCue}</p>
        </div>
      )}

      {/* Current exercise label during active */}
      {phase === "active" && currentExercise && (
        <div className="px-5 pb-1 text-center">
          <p className="font-body text-base font-semibold text-foreground">
            {currentExercise}
          </p>
        </div>
      )}

      {/* Compact exercise names during countdown (no sequence yet) */}
      {phase === "countdown" && (
        <div className="px-5 pb-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {block.groups.map((group) => (
              <span key={group.exercise.id} className="font-body text-xs text-muted-foreground">
                {group.exercise.name}
                {group.sets[0]?.planned_reps ? ` x${group.sets[0].planned_reps}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Compact exercise names when no sequence parsed (active fallback) */}
      {phase === "active" && !currentExercise && (
        <div className="px-5 pb-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {block.groups.map((group) => (
              <span key={group.exercise.id} className="font-body text-xs text-muted-foreground">
                {group.exercise.name}
                {group.sets[0]?.planned_reps ? ` x${group.sets[0].planned_reps}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ventana indicators — grouped by ronda */}
      {phase !== "idle" && (
        <div className="px-5 pb-4 flex items-center gap-2.5">
          {Array.from({ length: totalRondas }, (_, r) => (
            <div key={r} className="flex flex-1 gap-0.5">
              {Array.from({ length: ventanasPerRonda }, (_, v) => {
                const idx = r * ventanasPerRonda + v;
                return (
                  <div
                    key={v}
                    className="flex-1 h-2 rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor:
                        phase === "done" || idx < currentWindow
                          ? "#7A8B5C"
                          : idx === currentWindow && phase === "active"
                            ? "#C75B39"
                            : "#2A2A2A",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {phase === "done" ? (
        /* Done state */
        <div className="px-5 pb-6 flex flex-col items-center gap-4">
          <p className="font-body text-base text-muted-foreground">
            {totalRondas}/{totalRondas} rondas completadas
          </p>
          {/* Nudge to log weights if missing */}
          {block.groups.some((g) => {
            const w = exerciseWeights[g.exercise.id] ?? [];
            return w.length === 0 || w.some((v) => !v || parseFloat(v) <= 0);
          }) && (
            <p className="font-body text-xs text-center" style={{ color: "#C9A96E" }}>
              Registra los pesos que usaste arriba
            </p>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-body text-sm">Reiniciar</span>
          </button>
        </div>
      ) : (
        /* Timer area */
        <div className="px-5 pb-6">
          {/* Phase label + RPE */}
          {phase !== "idle" && (
            <div className="text-center mb-4">
              <p
                className={`font-mono text-xs tracking-[0.2em] uppercase transition-all duration-300 ${
                  ventanaFlash ? "opacity-0 scale-90" : "opacity-100 scale-100"
                }`}
                style={{ color: phase === "countdown" ? "#8A8A8E" : "#C75B39" }}
              >
                {phase === "countdown"
                  ? "PREPARATE"
                  : `RONDA ${currentRonda + 1} DE ${totalRondas} · VENTANA ${ventanaInRonda + 1}/${ventanasPerRonda}`}
              </p>
              {currentRpe && phase === "active" && (
                <span
                  className="inline-block mt-2 font-mono text-sm px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(199, 91, 57, 0.15)", color: "#C75B39" }}
                >
                  RPE {currentRpe}
                </span>
              )}
            </div>
          )}

          {/* Timer display — circular for active states, simple for idle */}
          {phase === "idle" ? (
            <div className="flex items-center justify-center py-4">
              <span
                className="font-mono tabular-nums font-bold"
                style={{ color: "#FAF8F5", fontSize: "3rem", lineHeight: 1 }}
              >
                {formatTime(windowSeconds)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="relative" style={{ width: RADIUS * 2 + STROKE * 2, height: RADIUS * 2 + STROKE * 2 }}>
                {/* SVG circular progress */}
                <svg
                  width={RADIUS * 2 + STROKE * 2}
                  height={RADIUS * 2 + STROKE * 2}
                  className="absolute inset-0"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {/* Background track */}
                  <circle
                    cx={RADIUS + STROKE}
                    cy={RADIUS + STROKE}
                    r={RADIUS}
                    fill="none"
                    stroke="#2A2A2A"
                    strokeWidth={STROKE}
                  />
                  {/* Progress arc */}
                  <circle
                    cx={RADIUS + STROKE}
                    cy={RADIUS + STROKE}
                    r={RADIUS}
                    fill="none"
                    stroke={isWarning ? "#D45555" : phase === "countdown" ? "#8A8A8E" : "#C75B39"}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDash}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`font-mono tabular-nums font-bold transition-all duration-300 ${
                      ventanaFlash ? "opacity-30 scale-95" : "opacity-100 scale-100"
                    } ${isWarning ? "animate-pulse" : ""}`}
                    style={{
                      color: isWarning ? "#D45555" : phase === "countdown" ? "#8A8A8E" : "#C75B39",
                      fontSize: "4rem",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatTime(secondsLeft)}
                  </span>
                  {phase === "active" && (
                    <span
                      className="font-mono text-[10px] tracking-wider mt-1"
                      style={{ color: "#8A8A8E" }}
                    >
                      VENTANA {currentWindow + 1}/{totalVentanas}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next ventana preview */}
          {phase === "active" && hasNextVentana && (nextExercise || rpeChanges) && (
            <div
              className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-xl mx-auto"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", maxWidth: "fit-content" }}
            >
              <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: "#8A8A8E" }}>
                {isNextNewRonda ? "NUEVA RONDA:" : "SIGUIENTE:"}
              </span>
              {nextExercise && (
                <span className="font-body text-xs font-medium text-foreground">
                  {nextExercise}
                </span>
              )}
              {nextRpe && rpeChanges && (
                <span
                  className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(199, 91, 57, 0.1)", color: "#C75B39" }}
                >
                  RPE {nextRpe}
                </span>
              )}
              {nextRpe && !rpeChanges && !nextExercise && (
                <span className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
                  RPE {nextRpe}
                </span>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {/* Back */}
            {phase !== "idle" && (
              <button
                onClick={handleBack}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                title="Ventana anterior"
              >
                <SkipBack className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {/* Reset */}
            {phase !== "idle" && (
              <button
                onClick={handleReset}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                title="Reiniciar todo"
              >
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {/* Play / Pause */}
            <button
              onClick={running ? handlePause : handleStart}
              disabled={saving}
              className="flex h-16 w-16 items-center justify-center rounded-full transition-all disabled:opacity-50 shadow-lg"
              style={{
                backgroundColor: "#C75B39",
                boxShadow: running ? "0 0 24px rgba(199, 91, 57, 0.4)" : "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {running ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-0.5" />
              )}
            </button>

            {/* Skip */}
            {phase !== "idle" && (
              <button
                onClick={handleSkip}
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                title="Saltar ventana"
              >
                <SkipForward className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
