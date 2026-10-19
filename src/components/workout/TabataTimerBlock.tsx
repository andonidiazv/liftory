import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Check, SkipForward, SkipBack, Plus, Minus, Dumbbell } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import WeightPickerSheet, { BODYWEIGHT_SENTINEL } from "./WeightPickerSheet";
import type { WorkoutSetData, ExerciseGroup } from "@/hooks/useWorkoutData";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { unlockAudio, playTick, playFinishBeep, speakLuxury } from "@/lib/audio";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SwapButton from "./SwapButton";

interface TabataTimerBlockProps {
  groups: ExerciseGroup[];
  /** Initial weight unit from profile. The component owns local unit state
   *  after mount so the KG/LB toggle can flip in-place (like EMOM). */
  weightUnit: string;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteSet: (set: WorkoutSetData) => Promise<void>;
  onUncompleteSet: (setId: string) => Promise<void>;
  onUpdateSetWeight: (setId: string, weightKg: number) => void | Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  workoutId?: string;
  userId?: string;
  onSwapExercise?: () => void;
}

type Phase = "idle" | "countdown" | "work" | "rest" | "done";

const COUNTDOWN_SECONDS = 10;
const MIN_ROUNDS = 2;
const MAX_ROUNDS = 30;
const MIN_WORK = 5;
const MAX_WORK = 120;
const MIN_REST = 0;
const MAX_REST = 60;

/** Convert kg <-> lb rounded to 0.5 */
/**
 * TabataTimerBlock: single timer for a block with 2+ exercises alternating.
 * Includes: rounds/work/rest configuration, per-exercise weight input,
 * 10s countdown intro, last-3s tick beeps, round transition beep, and
 * a spoken "última ronda" announcement on the final round.
 */
export default function TabataTimerBlock({
  groups,
  weightUnit: initialWeightUnit,
  isCompleted,
  onCompleteSet,
  onUncompleteSet,
  onUpdateSetWeight,
  onOpenVideo,
  workoutId,
  userId,
  onSwapExercise,
}: TabataTimerBlockProps) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const { user, refreshProfile } = useAuth();

  // Local KG/LB toggle — persists to profile. Mirrors EmomTimerBlock so the
  // KG/LB switcher looks and behaves identically across every block type.
  const [localUnit, setLocalUnit] = useState<"kg" | "lb">((initialWeightUnit as "kg" | "lb") || "kg");
  const weightUnit = localUnit;

  const handleToggleUnit = useCallback(async () => {
    const oldUnit = localUnit;
    const newUnit: "kg" | "lb" = oldUnit === "kg" ? "lb" : "kg";
    setLocalUnit(newUnit);
    if (user) {
      await supabase.from("user_profiles").update({ weight_unit: newUnit }).eq("user_id", user.id);
      refreshProfile();
    }
  }, [localUnit, user, refreshProfile]);

  // Flatten sets in set_order — this is the timer sequence
  const sets = useMemo(() => {
    const all: WorkoutSetData[] = [];
    for (const g of groups) all.push(...g.sets);
    return all.sort((a, b) => a.set_order - b.set_order);
  }, [groups]);

  const exerciseBySetId = useMemo(() => {
    const m = new Map<string, ExerciseGroup["exercise"]>();
    for (const g of groups) for (const s of g.sets) m.set(s.id, g.exercise);
    return m;
  }, [groups]);

  const baseRounds = sets.length;
  const baseWork = sets[0]?.planned_duration_seconds ?? 20;
  const baseRest = sets[0]?.planned_rest_seconds ?? 10;

  // Configurable state — editable in idle only
  const [customRounds, setCustomRounds] = useState(baseRounds);
  const [customWork, setCustomWork] = useState(baseWork);
  const [customRest, setCustomRest] = useState(baseRest);

  const getFirstIncomplete = useCallback(() => {
    const idx = sets.findIndex((s) => !isCompleted(s));
    return idx === -1 ? customRounds : idx;
  }, [sets, isCompleted, customRounds]);

  const [currentRound, setCurrentRound] = useState(getFirstIncomplete);
  const [phase, setPhase] = useState<Phase>(getFirstIncomplete() >= customRounds ? "done" : "idle");
  const [secondsLeft, setSecondsLeft] = useState(customWork);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Weight state — one value per exercise (in kg for storage; BODYWEIGHT_SENTINEL = BW).
  // Preload from existing actual_weight if any set logged it.
  const [weightsKg, setWeightsKg] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {};
    for (const g of groups) {
      const anyLoggedSet = g.sets.find(s => s.actual_weight != null);
      init[g.exercise.id] = anyLoggedSet?.actual_weight ?? null;
    }
    return init;
  });

  // Weight picker sheet — pattern matches EmomTimerBlock: tap "Peso" chip to open,
  // confirm → apply to all sets of that exercise (persists via onUpdateSetWeight).
  const [pickerExerciseId, setPickerExerciseId] = useState<string | null>(null);
  const [pickerInitial, setPickerInitial] = useState<number>(0);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (sets.length > 0 && sets.every((s) => isCompleted(s)) && phase !== "done") {
      setPhase("done");
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [sets, isCompleted, phase]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refs for tick to read latest values without stale closures
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const customRoundsRef = useRef(customRounds);
  customRoundsRef.current = customRounds;
  const customWorkRef = useRef(customWork);
  customWorkRef.current = customWork;
  const customRestRef = useRef(customRest);
  customRestRef.current = customRest;
  const onCompleteSetRef = useRef(onCompleteSet);
  onCompleteSetRef.current = onCompleteSet;
  const setsRef = useRef(sets);
  setsRef.current = sets;

  const startTickingRef = useRef<() => void>(() => {});

  // Announce final round when a NEW work phase starts on the last round
  const announceFinalRoundIfNeeded = useCallback((round: number) => {
    const total = customRoundsRef.current;
    if (round === total - 1) {
      speakLuxury("Última ronda");
    }
  }, []);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      // Last-3s tick: play beep when prev is 3, 2, 1 (before it hits 0)
      if (prev === 3 || prev === 2 || prev === 1) {
        const p = phaseRef.current;
        if (p === "work" || p === "rest" || p === "countdown") {
          playTick();
        }
      }
      if (prev <= 1) {
        clearTimer();
        queueMicrotask(() => {
          const currentPhase = phaseRef.current;
          const round = currentRoundRef.current;
          const total = customRoundsRef.current;
          const _work = customWorkRef.current;
          const _rest = customRestRef.current;

          if (currentPhase === "countdown") {
            // Countdown finished — start first work round
            setPhase("work");
            setSecondsLeft(_work);
            announceFinalRoundIfNeeded(round);
            startTickingRef.current();
            return;
          }

          if (currentPhase === "work") {
            // Complete this round's set (if exists in DB)
            const set = setsRef.current[round];
            if (set) onCompleteSetRef.current(set);

            const isLastRound = round >= total - 1;
            if (isLastRound) {
              // Finished last work — done, no rest after
              playFinishBeep();
              setPhase("done");
              setRunning(false);
              return;
            }
            // Round transition beep
            playFinishBeep();
            if (_rest > 0) {
              setPhase("rest");
              setSecondsLeft(_rest);
              startTickingRef.current();
            } else {
              const nextRound = round + 1;
              setCurrentRound(nextRound);
              setPhase("work");
              setSecondsLeft(_work);
              announceFinalRoundIfNeeded(nextRound);
              startTickingRef.current();
            }
          } else if (currentPhase === "rest") {
            const nextRound = round + 1;
            if (nextRound >= total) {
              setPhase("done");
              setRunning(false);
            } else {
              setCurrentRound(nextRound);
              setPhase("work");
              setSecondsLeft(_work);
              announceFinalRoundIfNeeded(nextRound);
              startTickingRef.current();
            }
          }
        });
        return 0;
      }
      return prev - 1;
    });
  }, [clearTimer, announceFinalRoundIfNeeded]);

  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startTicking = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
  }, [clearTimer]);
  startTickingRef.current = startTicking;

  const handleStart = useCallback(() => {
    unlockAudio();
    if (phase === "idle") {
      setPhase("countdown");
      setSecondsLeft(COUNTDOWN_SECONDS);
      setRunning(true);
      startTicking();
    } else if (phase === "countdown" || phase === "work" || phase === "rest") {
      setRunning(true);
      startTicking();
    }
  }, [phase, startTicking]);

  const handlePause = useCallback(() => {
    clearTimer();
    setRunning(false);
  }, [clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer();
    setRunning(false);
    for (const s of sets) {
      if (isCompleted(s)) onUncompleteSet(s.id);
    }
    setCurrentRound(0);
    setPhase("idle");
    setSecondsLeft(customWork);
  }, [clearTimer, sets, isCompleted, onUncompleteSet, customWork]);

  const handleSkip = useCallback(() => {
    clearTimer();
    if (phase === "countdown") {
      // Skip countdown → start first work
      setPhase("work");
      setSecondsLeft(customWork);
      announceFinalRoundIfNeeded(0);
      if (running) startTicking();
      return;
    }
    if (phase === "work") {
      const set = sets[currentRound];
      if (set && !isCompleted(set)) onCompleteSet(set);
      const isLast = currentRound >= customRounds - 1;
      if (isLast) {
        setPhase("done");
        setRunning(false);
        return;
      }
      if (customRest > 0) {
        setPhase("rest");
        setSecondsLeft(customRest);
        if (running) startTicking();
      } else {
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        setPhase("work");
        setSecondsLeft(customWork);
        announceFinalRoundIfNeeded(nextRound);
        if (running) startTicking();
      }
    } else if (phase === "rest") {
      const nextRound = currentRound + 1;
      if (nextRound >= customRounds) {
        setPhase("done");
        setRunning(false);
      } else {
        setCurrentRound(nextRound);
        setPhase("work");
        setSecondsLeft(customWork);
        announceFinalRoundIfNeeded(nextRound);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, sets, currentRound, isCompleted, onCompleteSet, customRest, customRounds, customWork, running, startTicking, announceFinalRoundIfNeeded]);

  const handleBack = useCallback(() => {
    clearTimer();
    if (phase === "rest") {
      const set = sets[currentRound];
      if (set && isCompleted(set)) onUncompleteSet(set.id);
      setPhase("work");
      setSecondsLeft(customWork);
      if (running) startTicking();
    } else if (phase === "work") {
      if (currentRound > 0) {
        const prevSet = sets[currentRound - 1];
        if (prevSet && isCompleted(prevSet)) onUncompleteSet(prevSet.id);
        if (customRest > 0) {
          setCurrentRound(currentRound - 1);
          setPhase("rest");
          setSecondsLeft(customRest);
          if (running) startTicking();
        } else {
          setCurrentRound(currentRound - 1);
          setPhase("work");
          setSecondsLeft(customWork);
          if (running) startTicking();
        }
      } else {
        setSecondsLeft(customWork);
        if (running) startTicking();
      }
    }
  }, [clearTimer, phase, sets, currentRound, isCompleted, onUncompleteSet, customRest, customWork, running, startTicking]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentSet = sets[currentRound];
  const currentEx = currentSet ? exerciseBySetId.get(currentSet.id) ?? null : null;
  // Next exercise cycles through groups in ABAB pattern when we run past DB sets
  const nextRoundIdx = currentRound + 1;
  const nextSet = nextRoundIdx < sets.length ? sets[nextRoundIdx] : null;
  const nextEx = nextSet
    ? exerciseBySetId.get(nextSet.id) ?? null
    : groups[nextRoundIdx % groups.length]?.exercise ?? null;

  const cue = sets[0]?.coaching_cue_override;
  const totalSecs = phase === "rest" ? customRest : phase === "countdown" ? COUNTDOWN_SECONDS : customWork;
  const progress = totalSecs > 0 ? ((totalSecs - secondsLeft) / totalSecs) * 100 : 100;
  const completedCount = sets.filter((s) => isCompleted(s)).length;

  const phaseColor = phase === "rest" ? t.muted : phase === "countdown" ? "#C4A24E" : t.accent;
  const phaseLabel = phase === "countdown"
    ? "PREPARÁ"
    : phase === "rest"
      ? `DESCANSO — SIGUIENTE: ${nextEx?.name?.toUpperCase() ?? ""}`
      : phase === "work"
        ? currentEx?.name?.toUpperCase() ?? ""
        : "";

  const openWeightPicker = (exerciseId: string) => {
    const current = weightsKg[exerciseId];
    let initial: number = 0;
    if (current === BODYWEIGHT_SENTINEL) {
      initial = BODYWEIGHT_SENTINEL;
    } else if (current != null && current > 0) {
      initial = toDisplayWeight(current, weightUnit);
    }
    setPickerExerciseId(exerciseId);
    setPickerInitial(initial);
  };

  const handleWeightPickerConfirm = (value: number) => {
    if (!pickerExerciseId) return;
    const isBW = value === BODYWEIGHT_SENTINEL;
    const kgValue = isBW ? BODYWEIGHT_SENTINEL : toStorageWeight(value, weightUnit);
    setWeightsKg(prev => ({ ...prev, [pickerExerciseId]: kgValue }));
    const group = groups.find(g => g.exercise.id === pickerExerciseId);
    if (group) {
      for (const s of group.sets) {
        Promise.resolve(onUpdateSetWeight(s.id, kgValue));
      }
    }
    setPickerExerciseId(null);
  };

  // Configurable increments
  const adjustRounds = (delta: number) => {
    setCustomRounds(prev => Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, prev + delta)));
  };
  const adjustWork = (delta: number) => {
    setCustomWork(prev => {
      const next = Math.max(MIN_WORK, Math.min(MAX_WORK, prev + delta));
      if (phase === "idle") setSecondsLeft(next);
      return next;
    });
  };
  const adjustRest = (delta: number) => {
    setCustomRest(prev => Math.max(MIN_REST, Math.min(MAX_REST, prev + delta)));
  };

  const configDisabled = phase !== "idle";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header — TABATA meta + KG/LB toggle (same pill style as EMOM/BlockDetail) */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono uppercase flex-1 truncate" style={{ fontSize: 9, letterSpacing: "2.5px", color: "#C4A24E", fontWeight: 500 }}>
            TABATA · {customRounds} rondas · {customWork}s / {customRest}s
          </span>
          <button
            onClick={handleToggleUnit}
            className="press-scale flex items-center rounded-full shrink-0"
            aria-label={`Cambiar a ${localUnit === "kg" ? "libras" : "kilogramos"}`}
            style={{
              background: "rgba(196,162,78,0.10)",
              border: `1px solid rgba(196,162,78,0.28)`,
              height: 22,
              width: 64,
              padding: 0,
            }}
          >
            <span
              className="font-mono flex-1 text-center transition-all"
              style={{
                fontSize: 9,
                fontWeight: localUnit === "kg" ? 700 : 400,
                color: localUnit === "kg" ? "#0A0A0A" : "hsl(var(--muted-foreground))",
                background: localUnit === "kg" ? "#C4A24E" : "transparent",
                borderRadius: 9999,
                lineHeight: "20px",
                letterSpacing: "0.05em",
              }}
            >
              KG
            </span>
            <span
              className="font-mono flex-1 text-center transition-all"
              style={{
                fontSize: 9,
                fontWeight: localUnit === "lb" ? 700 : 400,
                color: localUnit === "lb" ? "#0A0A0A" : "hsl(var(--muted-foreground))",
                background: localUnit === "lb" ? "#C4A24E" : "transparent",
                borderRadius: 9999,
                lineHeight: "20px",
                letterSpacing: "0.05em",
              }}
            >
              LB
            </span>
          </button>
          {phase === "done" && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shrink-0">
              <Check className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Exercise cards with weight chip (opens WeightPickerSheet, same pattern as EMOM) */}
        <div className="flex flex-col gap-2">
          {groups.map((g) => {
            const isActive = currentEx?.id === g.exercise.id && phase === "work";
            const kg = weightsKg[g.exercise.id];
            const isBW = kg === BODYWEIGHT_SENTINEL;
            const hasWeight = isBW || (kg != null && kg > 0);
            const displayValue = isBW
              ? "BW"
              : kg != null && kg > 0
                ? String(toDisplayWeight(kg, weightUnit))
                : null;
            return (
              <div
                key={g.exercise.id}
                className="flex items-center gap-2 rounded-lg p-2 transition-all"
                style={{
                  border: isActive ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
                  background: isActive ? "rgba(196,162,78,0.06)" : "transparent",
                }}
              >
                <button
                  onClick={() => onOpenVideo({ name: g.exercise.name, videoUrl: g.exercise.video_url, coachingCue: g.sets[0]?.coaching_cue_override ?? null })}
                  className="shrink-0 overflow-hidden rounded"
                  style={{ width: 44, height: 33 }}
                >
                  <ExerciseThumbnail
                    thumbnailUrl={g.exercise.thumbnail_url}
                    videoUrl={g.exercise.video_url}
                    name={g.exercise.name}
                    width={44}
                    height={33}
                  />
                </button>
                <p className="font-body text-[12.5px] font-semibold text-foreground text-left flex-1 truncate">
                  {g.exercise.name}
                </p>
                <SwapButton
                  exerciseId={g.exercise.id}
                  exerciseName={g.exercise.name}
                  blockLabel={g.sets[0]?.block_label || ""}
                  workoutId={workoutId}
                  userId={userId}
                  onSwapComplete={onSwapExercise}
                  size={20}
                />
                <button
                  onClick={() => openWeightPicker(g.exercise.id)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 shrink-0"
                  style={{
                    background: hasWeight ? "rgba(196,162,78,0.14)" : t.border,
                    border: hasWeight ? `1px solid ${t.accent}4D` : "1px solid transparent",
                    minWidth: 68,
                  }}
                >
                  <Dumbbell className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent }} />
                  {hasWeight ? (
                    displayValue === "BW" ? (
                      <span className="font-mono text-xs font-semibold" style={{ color: t.accent }}>BW</span>
                    ) : (
                      <>
                        <span className="font-mono text-xs font-semibold" style={{ color: t.accent }}>
                          {displayValue}
                        </span>
                        <span className="font-mono text-[9px]" style={{ color: t.accent, opacity: 0.7 }}>
                          {weightUnit}
                        </span>
                      </>
                    )
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Peso
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coaching cue */}
      {cue && phase !== "done" && (
        <div className="px-4 pb-3">
          <p className="font-body text-[13px] text-muted-foreground leading-relaxed">{cue}</p>
        </div>
      )}

      {/* Round indicators — visualize customRounds */}
      <div className="px-4 pb-3 flex items-center gap-1">
        {Array.from({ length: customRounds }, (_, i) => {
          const set = sets[i];
          const completed = set ? isCompleted(set) : false;
          return (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: completed
                  ? "#7A8B5C"
                  : i === currentRound && (phase === "work" || phase === "rest")
                    ? phaseColor
                    : t.border,
              }}
            />
          );
        })}
      </div>

      {phase === "done" ? (
        <div className="px-4 pb-4 flex flex-col items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            {Math.min(completedCount, customRounds)}/{customRounds} rondas completadas
          </p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="font-body text-xs">Reiniciar</span>
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-4">
          {/* Config controls — visible always but disabled during active phases */}
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: "rgba(196,162,78,0.04)", border: `1px solid ${t.border}` }}
          >
            <div className="grid grid-cols-3 gap-2">
              <ConfigStepper
                label="Rondas"
                value={customRounds}
                onDec={() => adjustRounds(-1)}
                onInc={() => adjustRounds(+1)}
                disabled={configDisabled}
                canDec={customRounds > MIN_ROUNDS}
                canInc={customRounds < MAX_ROUNDS}
              />
              <ConfigStepper
                label="Trabajo"
                value={`${customWork}s`}
                onDec={() => adjustWork(-5)}
                onInc={() => adjustWork(+5)}
                disabled={configDisabled}
                canDec={customWork > MIN_WORK}
                canInc={customWork < MAX_WORK}
              />
              <ConfigStepper
                label="Descanso"
                value={`${customRest}s`}
                onDec={() => adjustRest(-5)}
                onInc={() => adjustRest(+5)}
                disabled={configDisabled}
                canDec={customRest > MIN_REST}
                canInc={customRest < MAX_REST}
              />
            </div>
          </div>

          {phase !== "idle" && (
            <div className="text-center">
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                {phase === "countdown" ? "INICIO EN" : `RONDA ${currentRound + 1}/${customRounds}`}
              </span>
              <p
                className="font-display text-sm tracking-wider mt-0.5"
                style={{ color: phaseColor }}
              >
                {phaseLabel}
              </p>
            </div>
          )}
          {phase !== "idle" && (
            <div className="h-px overflow-hidden" style={{ background: "hsl(var(--border))", opacity: 0.5 }}>
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%`, background: phaseColor }}
              />
            </div>
          )}
          <div className="flex items-center justify-center">
            <span
              className="font-display tabular-nums"
              style={{
                fontWeight: 300,
                color: phase === "idle" ? "hsl(var(--foreground))" : phaseColor,
                fontSize: phase === "idle" ? 40 : 72,
                lineHeight: 1,
                letterSpacing: "-0.05em",
              }}
            >
              {formatTime(secondsLeft)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-5">
            {phase !== "idle" && phase !== "countdown" && (
              <button
                onClick={handleBack}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
                title="Ronda anterior"
              >
                <SkipBack className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            )}
            {phase !== "idle" && (
              <button
                onClick={handleReset}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
                title="Reiniciar todo"
              >
                <RotateCcw className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            )}
            <button
              onClick={running ? handlePause : handleStart}
              className={`press-scale flex items-center justify-center ${!running && phase === "idle" ? "liftory-breathe" : ""}`}
              style={{
                width: 52, height: 52, borderRadius: "50%",
                border: `1px solid ${phase === "idle" ? "#C4A24E" : phaseColor}`,
                boxShadow: running ? `0 0 22px ${phaseColor}40` : `0 0 16px #C4A24E30`,
              }}
            >
              {running ? (
                <Pause className="w-4 h-4" style={{ color: phaseColor }} />
              ) : (
                <Play className="w-4 h-4 ml-0.5" style={{ color: phase === "idle" ? "#C4A24E" : phaseColor }} />
              )}
            </button>
            {phase !== "idle" && (
              <button
                onClick={handleSkip}
                className="press-scale flex items-center justify-center"
                style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
                title={phase === "countdown" ? "Saltar countdown" : "Saltar ronda"}
              >
                <SkipForward className="w-3.5 h-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Weight picker sheet — same pattern used across EMOM + BlockDetail */}
      <WeightPickerSheet
        visible={pickerExerciseId !== null}
        unit={weightUnit as "kg" | "lb"}
        initialValue={pickerInitial}
        onConfirm={handleWeightPickerConfirm}
        onClose={() => setPickerExerciseId(null)}
      />
    </div>
  );
}

/** Little +/- stepper used for the three config controls (rounds, work, rest). */
function ConfigStepper({
  label, value, onDec, onInc, disabled, canDec, canInc,
}: {
  label: string;
  value: string | number;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  canDec?: boolean;
  canInc?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono uppercase" style={{ fontSize: 8.5, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDec}
          disabled={disabled || !canDec}
          className="press-scale flex items-center justify-center rounded"
          style={{
            width: 26, height: 26,
            border: "1px solid hsl(var(--border))",
            opacity: (disabled || !canDec) ? 0.35 : 1,
            cursor: (disabled || !canDec) ? "not-allowed" : "pointer",
          }}
          aria-label={`Bajar ${label.toLowerCase()}`}
        >
          <Minus className="w-3 h-3" style={{ color: "#C4A24E" }} />
        </button>
        <span
          className="font-display tabular-nums text-center"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "hsl(var(--foreground))", minWidth: 40 }}
        >
          {value}
        </span>
        <button
          onClick={onInc}
          disabled={disabled || !canInc}
          className="press-scale flex items-center justify-center rounded"
          style={{
            width: 26, height: 26,
            border: "1px solid hsl(var(--border))",
            opacity: (disabled || !canInc) ? 0.35 : 1,
            cursor: (disabled || !canInc) ? "not-allowed" : "pointer",
          }}
          aria-label={`Subir ${label.toLowerCase()}`}
        >
          <Plus className="w-3 h-3" style={{ color: "#C4A24E" }} />
        </button>
      </div>
    </div>
  );
}
