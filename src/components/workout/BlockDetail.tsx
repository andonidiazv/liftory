import { useState, useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Check, Dumbbell, Loader2, Quote, Trophy, Shuffle, X, Play, Pause, Timer, RotateCcw } from "lucide-react";
import ReactDOM from "react-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import ExerciseThumbnail from "./ExerciseThumbnail";
import SwapBottomSheet from "./SwapBottomSheet";
import WeightPickerSheet, { BODYWEIGHT_SENTINEL } from "./WeightPickerSheet";
import RepsPickerSheet from "./RepsPickerSheet";
import ExpandableNote from "./ExpandableNote";

import type { WorkoutBlock } from "./WorkoutOverview";
import ExerciseVideoOverlay from "./ExerciseVideoOverlay";
import type { WorkoutSetData, ExerciseGroup, ExerciseDelta } from "@/hooks/useWorkoutData";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import IntervalTimerBlock from "./IntervalTimerBlock";
import EmomTimerBlock from "./EmomTimerBlock";
import { TimerErrorBoundary } from "./TimerErrorBoundary";
import { playSetClick, playBeep } from "@/lib/audio";

/** Block types by render mode */
const CARDIO_BLOCKS = ['ENGINE BLOCK'];
const MOBILITY_BLOCKS = ['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];
// "OPCIONAL · Z2" is a steady-state Z2 cardio block (Incline Walk 15 min) used as
// an optional post-workout add-on in M3 Upper Hypertrophy days. We render it as
// a cooldown card — the athlete sees the exercise + duration + a complete tap,
// same flow as recovery stretches. Strength-mode (weight/reps inputs) would be
// wrong for a single timed cardio set.
const COOLDOWN_BLOCKS = ['RECOVERY BLOCK', 'OPCIONAL · Z2'];

type BlockMode = 'strength' | 'mobility' | 'cooldown' | 'cardio' | 'emom';

/**
 * Strip the sub-block suffix ("PRIME BLOCK — A" → "PRIME BLOCK") so block-mode
 * detection works whether or not a block is split into sub-blocks.
 *
 * M3 started using sub-block naming (`BLOCK NAME — A`/`— B`/`— C`) for PRIME
 * the same way M1/M2 used it for HEAVY/BUILD. Without this normalization, sub-
 * blocks of PRIME would fall through to 'strength' mode and render weight/reps
 * inputs instead of the cue-only mobility view.
 */
function baseBlockName(name: string): string {
  const dashIdx = name.indexOf(' — ');
  return dashIdx === -1 ? name : name.slice(0, dashIdx);
}

function getBlockMode(block: WorkoutBlock): BlockMode {
  const base = baseBlockName(block.name);
  // Check if EMOM — render as instruction block
  if (block.groups.some(g => g.sets.some(s => s.set_type === 'emom'))) return 'emom';
  if (CARDIO_BLOCKS.includes(base)) return 'cardio';
  // Tabata-style intervals (set_type='interval' with work + rest durations)
  // render as cardio → IntervalTimerBlock per group, regardless of block name.
  // This enables Tabata in METCON BLOCK or FINISHER BLOCK without affecting M1.
  if (block.groups.some(g => g.sets.some(s => s.set_type === 'interval'))) return 'cardio';
  if (COOLDOWN_BLOCKS.includes(base)) return 'cooldown';

  // ATHLETIC INTEGRATION: dual-purpose block.
  //  - M1 used it for warmup flows (set_type='warmup') → render as mobility (cue-only)
  //  - M2+ uses it for sub-maximal strength work like Pause Box Squat (set_type='working')
  //    → render as strength so inputs (weight/reps/RPE/rest) appear.
  if (base === 'ATHLETIC INTEGRATION') {
    const hasWorking = block.groups.some(g => g.sets.some(s => s.set_type === 'working'));
    return hasWorking ? 'strength' : 'mobility';
  }

  if (MOBILITY_BLOCKS.includes(base)) return 'mobility';
  return 'strength';
}

/** Check if coaching cue indicates "per side" */
function isPerSide(cue: string | null | undefined): boolean {
  if (!cue) return false;
  const lower = cue.toLowerCase();
  return lower.includes('por lado') || lower.includes('per side') || lower.includes('ea side') || lower.includes(' ea');
}

/** Format reps display with /lado if applicable */
function formatReps(reps: number | null, cue: string | null | undefined): string {
  if (reps == null) return "—";
  return isPerSide(cue) ? `${reps}/lado` : `${reps}`;
}

/** Render block name with bold main part and normal suffix */
function BlockNameDisplay({ name, className: cls }: { name: string; className?: string }) {
  const dashIdx = name.indexOf(' — ');
  if (dashIdx === -1) {
    return <span className={cls}>{name}</span>;
  }
  return (
    <span className={cls}>
      <span className="font-bold">{name.slice(0, dashIdx)}</span>
      <span className="font-normal">{name.slice(dashIdx)}</span>
    </span>
  );
}

interface SetInputs {
  weight: string;
  reps: string;
}

interface Props {
  block: WorkoutBlock;
  weightUnit: string;
  saving: boolean;
  workoutId?: string;
  nextBlockName?: string | null;
  onBack: () => void;
  onCompleteSet: (set: WorkoutSetData, data: { actual_weight: number; actual_reps: number }) => Promise<unknown>;
  onUncompleteSet: (setId: string) => Promise<boolean>;
  onUpdateSetField: (setId: string, field: "actual_weight" | "actual_reps", value: number) => Promise<boolean>;
  onRecomputeIsPr?: (setId: string) => Promise<void>;
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weightKg: number | null; hint: string | null };
  onRestStart: (seconds: number) => void;
  onSwapExercise?: () => void;
  onNextBlock?: () => void;
  onFinishWorkout?: () => void;
  exerciseDeltas?: Record<string, ExerciseDelta>;
}

/** Format a delta into a human-readable chip label for an exercise */
function formatDelta(d: ExerciseDelta): string[] {
  const parts: string[] = [];
  if (d.setsDelta !== 0) parts.push(`${d.setsDelta > 0 ? "+" : ""}${d.setsDelta} set${Math.abs(d.setsDelta) !== 1 ? "s" : ""}`);
  if (d.repsFrom != null && d.repsTo != null) parts.push(`${d.repsFrom}→${d.repsTo} reps`);
  if (d.rpeFrom != null && d.rpeTo != null) parts.push(`RPE ${d.rpeFrom}→${d.rpeTo}`);
  return parts;
}

function formatPrescription(sets: WorkoutSetData[], hideRest = false): string {
  const first = sets[0];
  if (!first) return "";
  const parts: string[] = [];
  const repsStr = formatReps(first.planned_reps, first.coaching_cue_override);
  parts.push(`${sets.length} × ${repsStr}`);
  if (first.planned_tempo) parts.push(`Tempo ${first.planned_tempo}`);
  if (!hideRest && first.planned_rest_seconds) {
    const s = first.planned_rest_seconds;
    parts.push(`Descanso ${s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : `${s}s`}`);
  }
  return parts.join(" · ");
}

/** Parse sub-group header from coaching cue.
 *
 * Supported formats:
 *   - "N rondas | cue text"           → header "N RONDAS"        (M1/M2 legacy)
 *   - "N rondas"                       → header "N RONDAS"        (M1/M2 legacy)
 *   - "Mobility hombro | cue text"    → header "MOBILITY HOMBRO" (M3+)
 *
 * The labeled form lets a mobility block hold multiple sub-sections (e.g. PRIME
 * BLOCK with Mobility / Activación / Specific prep) under a single card while
 * still showing visual separators inside.
 *
 * The label is letters-and-spaces only (no digits) so cues that legitimately
 * contain "|" with numbers — like the EMOM cue "EMOM 60s | 6R x 2V" — never
 * false-positive into a header. (MobilityContent is the only caller and is
 * never rendered for EMOM blocks anyway, but the constraint keeps the parser
 * robust against future reuse.)
 */
function parseSubGroupHeader(cue: string | null | undefined): { header: string | null; cleanCue: string | null } {
  if (!cue) return { header: null, cleanCue: null };
  // "N rondas | actual cue"
  const withCue = cue.match(/^(\d+(?:-\d+)?\s*rondas?)\s*\|\s*(.*)/i);
  if (withCue) {
    const header = withCue[1].toUpperCase();
    const rest = (withCue[2] || '').trim();
    // If the text after "|" is just "N rondas" again, it's redundant — drop it
    const redundant = /^\d+(?:-\d+)?\s*rondas?$/i.test(rest);
    return { header, cleanCue: redundant || !rest ? null : rest };
  }
  // Cue is just "N rondas" with no pipe → treat as header only, no cue
  const onlyHeader = cue.match(/^(\d+(?:-\d+)?\s*rondas?)\s*$/i);
  if (onlyHeader) {
    return { header: onlyHeader[1].toUpperCase(), cleanCue: null };
  }
  // Labeled sub-group: starts with uppercase letter, letters+spaces+accents
  // and the connectors `·`, `-`, `+`, `/` (no digits — keeps EMOM-style cues
  // like "EMOM 60s | 6R x 2V" from matching).
  const labeled = cue.match(/^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s·\-+/]+?)\s*\|\s*(.*)/);
  if (labeled) {
    const rest = (labeled[2] || '').trim();
    return { header: labeled[1].trim().toUpperCase(), cleanCue: rest || null };
  }
  return { header: null, cleanCue: cue };
}

export default function BlockDetail({
  block,
  weightUnit: initialWeightUnit,
  saving,
  workoutId,
  nextBlockName,
  onBack,
  onCompleteSet,
  onUncompleteSet,
  onUpdateSetField,
  onRecomputeIsPr,
  getSuggestedWeight,
  onRestStart,
  onSwapExercise,
  onNextBlock,
  onFinishWorkout,
  exerciseDeltas,
}: Props) {
  const { user, refreshProfile } = useAuth();
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;
  const [setInputs, setSetInputs] = useState<Record<string, SetInputs>>({});
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [videoOverlay, setVideoOverlay] = useState<{ name: string; videoUrl: string | null; coachingCue: string | null } | null>(null);
  const [localUnit, setLocalUnit] = useState(initialWeightUnit || "kg");

  const weightUnit = localUnit;

  const handleToggleUnit = async () => {
    const oldUnit = localUnit;
    const newUnit = oldUnit === "kg" ? "lb" : "kg";

    // 1. Reconvert all cached input weights synchronously (same React batch = no flash)
    setSetInputs((prev) => {
      const converted: Record<string, SetInputs> = {};
      for (const [id, inp] of Object.entries(prev)) {
        const w = parseFloat(inp.weight);
        if (!isNaN(w) && w > 0) {
          const kg = toStorageWeight(w, oldUnit);
          converted[id] = { ...inp, weight: String(toDisplayWeight(kg, newUnit)) };
        } else {
          converted[id] = inp;
        }
      }
      return converted;
    });

    // 2. Flip unit (batched with setSetInputs above — single render, zero flash)
    setLocalUnit(newUnit);

    // 3. Persist to profile (async, doesn't affect display)
    if (user) {
      await supabase.from("user_profiles").update({ weight_unit: newUnit }).eq("user_id", user.id);
      refreshProfile();
    }
  };

  // Optimistic completed state
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of block.groups) {
      for (const s of g.sets) {
        if (s.is_completed) initial.add(s.id);
      }
    }
    return initial;
  });

  // ─── FIX 3: Sync optimistic state when block data actually changes (after refetch) ───
  const blockSyncKey = block.groups
    .flatMap((g) => g.sets.map((s) => `${s.id}:${s.is_completed}:${s.actual_weight}:${s.actual_reps}`))
    .join(",");

  useEffect(() => {
    const freshCompleted = new Set<string>();
    for (const g of block.groups) {
      for (const s of g.sets) {
        if (s.is_completed) freshCompleted.add(s.id);
      }
    }
    setOptimisticCompleted((prev) => {
      const merged = new Set(prev);
      for (const id of freshCompleted) merged.add(id);
      for (const id of prev) {
        if (!freshCompleted.has(id)) {
          const existsInBlock = block.groups.some((g) => g.sets.some((s) => s.id === id));
          if (existsInBlock) merged.delete(id);
        }
      }
      return merged;
    });

    setSetInputs((prev) => {
      const updated = { ...prev };
      for (const g of block.groups) {
        for (const s of g.sets) {
          // Only seed local input from server when there's NO local input yet.
          // Removing the "|| s.is_completed" branch — that branch was causing data loss:
          // a refetch (visibility change, completeSet response, network ping) would
          // overwrite a value the athlete was actively editing on top of a completed set.
          if (!prev[s.id]) {
            if (s.actual_weight != null || s.actual_reps != null) {
              updated[s.id] = {
                weight: s.actual_weight != null ? String(toDisplayWeight(s.actual_weight, localUnit)) : "",
                reps: s.actual_reps != null ? String(s.actual_reps) : "",
              };
            }
          }
        }
      }
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockSyncKey]);

  const blockMode = getBlockMode(block);

  const getInputs = useCallback(
    (set: WorkoutSetData): SetInputs => {
      if (setInputs[set.id]) return setInputs[set.id];
      const suggestion = getSuggestedWeight(set.exercise_id, set.planned_reps);
      // DB stores kg — convert to display unit using localUnit
      const displayWeight = set.actual_weight != null ? String(toDisplayWeight(set.actual_weight, localUnit))
        : set.planned_weight ? String(toDisplayWeight(set.planned_weight, localUnit))
        : suggestion.weightKg != null ? String(toDisplayWeight(suggestion.weightKg, localUnit))
        : "";
      return {
        weight: displayWeight,
        reps: set.actual_reps != null ? String(set.actual_reps) : String(set.planned_reps ?? ""),
      };
    },
    [setInputs, getSuggestedWeight]
  );

  // Debounce DB writes per (setId, dbField) so rapid taps on the picker don't
  // create races where reordered network requests overwrite the latest value.
  // Local UI state updates immediately — only the network call is debounced.
  // Pending writes are flushed on unmount so the user never loses the last value
  // typed before navigating back.
  type PendingWrite = {
    timer: ReturnType<typeof setTimeout>;
    setId: string;
    field: "actual_weight" | "actual_reps";
    value: number;
    onComplete?: () => void;
  };
  const pendingWritesRef = useRef<Map<string, PendingWrite>>(new Map());
  const WRITE_DEBOUNCE_MS = 400;

  const scheduleWrite = useCallback(
    (
      setId: string,
      dbField: "actual_weight" | "actual_reps",
      value: number,
      onComplete?: () => void
    ) => {
      const key = `${setId}:${dbField}`;
      const existing = pendingWritesRef.current.get(key);
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(async () => {
        await onUpdateSetField(setId, dbField, value);
        pendingWritesRef.current.delete(key);
        if (onComplete) onComplete();
      }, WRITE_DEBOUNCE_MS);
      pendingWritesRef.current.set(key, { timer, setId, field: dbField, value, onComplete });
    },
    [onUpdateSetField]
  );

  // Flush all pending writes when the block unmounts (back, navigate, complete workout).
  // We read onUpdateSetField via a ref so the cleanup only fires on real unmount,
  // not whenever the parent re-renders with a new callback identity.
  const onUpdateSetFieldRef = useRef(onUpdateSetField);
  useEffect(() => { onUpdateSetFieldRef.current = onUpdateSetField; }, [onUpdateSetField]);
  useEffect(() => {
    return () => {
      const pending = pendingWritesRef.current;
      for (const [, p] of pending) {
        clearTimeout(p.timer);
        // Fire-and-forget — last value the athlete entered for this set+field.
        // Note: we don't await; if there was an onComplete (e.g. recompute is_pr)
        // we still trigger it so post-edit consistency follows the user.
        onUpdateSetFieldRef.current(p.setId, p.field, p.value).then(() => {
          if (p.onComplete) p.onComplete();
        });
      }
      pending.clear();
    };
  }, []);

  const updateInput = (setId: string, field: keyof SetInputs, value: string) => {
    const existing = setInputs[setId] || getInputs(block.groups.flatMap(g => g.sets).find(s => s.id === setId)!);
    setSetInputs((prev) => ({ ...prev, [setId]: { ...existing, [field]: value } }));

    // Schedule debounced DB write (convert display unit → kg for storage)
    if (field === "weight") {
      if (value === "BW") {
        scheduleWrite(setId, "actual_weight", BODYWEIGHT_SENTINEL);
      } else {
        const w = parseFloat(value);
        if (!isNaN(w)) scheduleWrite(setId, "actual_weight", toStorageWeight(w, localUnit));
      }
    } else if (field === "reps") {
      const r = parseInt(value);
      if (!isNaN(r)) scheduleWrite(setId, "actual_reps", r);
    }
  };

  // Edits to already-completed sets also go through the debounced writer to
  // avoid races when the athlete spins the picker fast on a logged set.
  // After the write commits, we trigger onRecomputeIsPr so the PR flag
  // stays accurate when the athlete corrects a logged value later.
  const updateCompletedWeight = useCallback((setId: string, newWeight: string) => {
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;
    scheduleWrite(setId, "actual_weight", toStorageWeight(w, localUnit), () => {
      onRecomputeIsPr?.(setId);
    });
  }, [scheduleWrite, localUnit, onRecomputeIsPr]);

  const updateCompletedReps = useCallback((setId: string, newReps: string) => {
    const r = parseInt(newReps);
    if (isNaN(r)) return;
    scheduleWrite(setId, "actual_reps", r, () => {
      onRecomputeIsPr?.(setId);
    });
  }, [scheduleWrite, onRecomputeIsPr]);

  const handleComplete = async (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    const inputs = getInputs(set);
    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
    setJustCompleted(set.id);
    setTimeout(() => setJustCompleted(null), 1500);
    playSetClick();

    const shouldRest = block.supersetGroup ? isLastInSuperset : true;
    if (shouldRest && set.planned_rest_seconds) {
      onRestStart(set.planned_rest_seconds);
    }

    // Timed sets (planks, holds) don't have weight/reps inputs — use sentinel
    const isTimed = (set.planned_duration_seconds ?? 0) > 0;
    const actualWeight = isTimed
      ? 0
      : inputs.weight === "BW"
      ? BODYWEIGHT_SENTINEL
      : toStorageWeight(parseFloat(inputs.weight) || 0, localUnit);

    const result = await onCompleteSet(set, {
      actual_weight: actualWeight,
      actual_reps: isTimed ? 1 : (parseInt(inputs.reps) || 0),
    });

    if (!result) {
      setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
      toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
      return;
    }
    if (result.is_pr) {
      setPrFlash(set.id);
      setTimeout(() => setPrFlash(null), 2000);
    }
  };

  const handleUncomplete = async (set: WorkoutSetData) => {
    setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
    const ok = await onUncompleteSet(set.id);
    if (!ok) {
      setOptimisticCompleted((prev) => new Set(prev).add(set.id));
      toast({ title: "Error al desmarcar", variant: "destructive" });
    }
  };

  const handleToggleSet = (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    if (optimisticCompleted.has(set.id)) {
      handleUncomplete(set);
    } else {
      handleComplete(set, groupIndex, isLastInSuperset);
    }
  };

  const isCompleted = (set: WorkoutSetData) => optimisticCompleted.has(set.id);

  const isSupersetBlock = block.supersetGroup && block.supersetGroup.type !== "single";
  // In a superset/triserie the rest is the one fired AFTER the LAST exercise of the round
  // (see handleComplete: shouldRest only fires when isLastInSuperset). The header must
  // reflect the same value, otherwise the displayed rest contradicts the timer.
  const restInfo = isSupersetBlock
    ? block.groups[block.groups.length - 1]?.sets[0]?.planned_rest_seconds
    : block.groups[0]?.sets[0]?.planned_rest_seconds;
  const restDisplay = restInfo
    ? restInfo >= 60
      ? `Descanso ${Math.floor(restInfo / 60)}:${(restInfo % 60).toString().padStart(2, "0")}`
      : `Descanso ${restInfo}s`
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background animate-slide-in-right">
      {/* Header — Atelier compact bar matching WorkoutOverview.
          Back arrow on the left, block name + meta centered, invisible
          spacer on the right to keep the title optically balanced. No
          brand mark — this is an action context. */}
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
            <div
              className="font-display text-foreground"
              style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              <BlockNameDisplay name={block.name} />
            </div>
            <p
              className="mt-0.5 font-mono uppercase"
              style={{ fontSize: 8, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
            >
              {blockMode === 'strength' && (
                <>{block.totalSets} sets{restDisplay ? ` · ${restDisplay}` : ""}{block.formatBadge ? ` · ${block.formatBadge}` : ""}</>
              )}
              {blockMode === 'mobility' && (() => {
                let rounds: string | null = null;
                for (const g of block.groups) {
                  const cue = g.sets[0]?.coaching_cue_override ?? '';
                  const m = cue.match(/(\d+(?:-\d+)?\s*rondas?)/i);
                  if (m) { rounds = m[1]; break; }
                }
                return <>{block.groups.length} ejercicios · {rounds ?? '2 rondas'}</>;
              })()}
              {blockMode === 'cooldown' && <>{block.groups.length} estiramientos</>}
              {blockMode === 'cardio' && <>Cardio</>}
              {blockMode === 'emom' && <>EMOM</>}
            </p>
          </div>
          <div className="shrink-0" style={{ width: 36 }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {blockMode === 'emom' ? (
          <TimerErrorBoundary blockName="EMOM">
          <EmomTimerBlock
            block={block}
            saving={saving}
            weightUnit={weightUnit}
            isCompleted={isCompleted}
            onCompleteAll={async () => {
              for (const g of block.groups) {
                for (const set of g.sets) {
                  if (!isCompleted(set)) {
                    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                    // Use existing actual_weight if user already logged it, otherwise 0
                    const existingWeight = set.actual_weight ?? 0;
                    await onCompleteSet(set, { actual_weight: existingWeight, actual_reps: set.planned_reps || 1 });
                  }
                }
              }
            }}
            onUncompleteAll={async () => {
              for (const g of block.groups) {
                for (const set of g.sets) {
                  if (isCompleted(set)) {
                    await handleUncomplete(set);
                  }
                }
              }
            }}
            onUpdateSetWeight={async (setId, weightKg) => {
              await onUpdateSetField(setId, "actual_weight", weightKg);
            }}
            getSuggestedWeight={getSuggestedWeight}
            onOpenVideo={(v) => setVideoOverlay(v)}
          />
          </TimerErrorBoundary>
        ) : blockMode === 'cardio' ? (
          <div className="flex flex-col gap-4">
            {block.groups.map((group) => {
              const hasTimedSets = group.sets.some(s => s.planned_duration_seconds != null && s.planned_duration_seconds > 0);

              if (hasTimedSets) {
                return (
                  <TimerErrorBoundary key={group.exercise.id} blockName="Sprint">
                  <IntervalTimerBlock
                    group={group}
                    isCompleted={isCompleted}
                    onCompleteSet={async (set) => {
                      setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                      await onCompleteSet(set, { actual_weight: 0, actual_reps: 1 });
                    }}
                    onUncompleteSet={async (setId) => {
                      setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(setId); return n; });
                      await onUncompleteSet(setId);
                    }}
                    onOpenVideo={(v) => setVideoOverlay(v)}
                  />
                  </TimerErrorBoundary>
                );
              }

              return (
                <CardioCard
                  key={group.exercise.id}
                  group={group}
                  saving={saving}
                  isCompleted={isCompleted}
                  onCompleteAll={async () => {
                    for (const set of group.sets) {
                      if (!isCompleted(set)) {
                        setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                        await onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 });
                      }
                    }
                  }}
                  onUncompleteAll={async () => {
                    for (const set of group.sets) {
                      if (isCompleted(set)) {
                        await handleUncomplete(set);
                      }
                    }
                  }}
                  onOpenVideo={(v) => setVideoOverlay(v)}
                />
              );
            })}
          </div>
        ) : blockMode === 'mobility' ? (
          <MobilityContent
            block={block}
            saving={saving}
            isCompleted={isCompleted}
            onToggle={(set) => {
              if (optimisticCompleted.has(set.id)) {
                handleUncomplete(set);
              } else {
                setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                setJustCompleted(set.id);
                setTimeout(() => setJustCompleted(null), 1500);
                onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 }).then((result) => {
                  if (!result) {
                    setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
                    toast({ title: "Error", variant: "destructive" });
                  }
                });
              }
            }}
            onOpenVideo={(v) => setVideoOverlay(v)}
          />
        ) : blockMode === 'cooldown' ? (
          <div className="flex flex-col gap-2">
            {block.groups.map((group) => (
              <CooldownCard
                key={group.exercise.id}
                group={group}
                saving={saving}
                isCompleted={isCompleted}
                onToggle={(set) => {
                  if (optimisticCompleted.has(set.id)) {
                    handleUncomplete(set);
                  } else {
                    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                    onCompleteSet(set, { actual_weight: 0, actual_reps: 1 }).then((result) => {
                      if (!result) {
                        setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
                        toast({ title: "Error", variant: "destructive" });
                      }
                    });
                  }
                }}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        ) : isSupersetBlock ? (
          <SupersetContent
            block={block}
            weightUnit={weightUnit}
            saving={saving}
            getInputs={getInputs}
            updateInput={updateInput}
            handleToggle={handleToggleSet}
            updateCompletedWeight={updateCompletedWeight}
            updateCompletedReps={updateCompletedReps}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            isCompleted={isCompleted}
            onOpenVideo={(v) => setVideoOverlay(v)}
            workoutId={workoutId}
            userId={user?.id}
            onSwapExercise={onSwapExercise}
            localUnit={localUnit}
            onToggleUnit={handleToggleUnit}
            exerciseDeltas={exerciseDeltas}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {block.groups.map((group, gi) => (
              <ExerciseCard
                key={group.exercise.id}
                group={group}
                weightUnit={weightUnit}
                saving={saving}
                getInputs={getInputs}
                updateInput={updateInput}
                onToggle={(set) => handleToggleSet(set, gi, true)}
                updateCompletedWeight={updateCompletedWeight}
                updateCompletedReps={updateCompletedReps}
                getSuggestedWeight={getSuggestedWeight}
                prFlash={prFlash}
                justCompleted={justCompleted}
                isCompleted={isCompleted}
                onOpenVideo={(v) => setVideoOverlay(v)}
                workoutId={workoutId}
                userId={user?.id}
                onSwapExercise={onSwapExercise}
                localUnit={localUnit}
                onToggleUnit={handleToggleUnit}
                delta={exerciseDeltas?.[group.exercise.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Next block CTA — Atelier text + breathing circle, same language
          as the home "Abrir sesión" gesture. */}
      {onNextBlock && nextBlockName && (
        <div className="px-5 pt-6 pb-10 flex items-center justify-center">
          <button
            onClick={onNextBlock}
            className="press-scale flex items-center gap-4"
            aria-label={`Siguiente bloque: ${nextBlockName}`}
          >
            <div className="text-right">
              <p
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
              >
                Siguiente bloque
              </p>
              <p
                className="mt-0.5 font-display"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.1,
                }}
              >
                {nextBlockName}
              </p>
            </div>
            <span
              className="liftory-breathe flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid #C4A24E",
              }}
            >
              <ChevronRight className="h-4 w-4" style={{ color: "#C4A24E" }} />
            </span>
          </button>
        </div>
      )}

      {/* Finish workout CTA (last block) — same gesture, check icon instead
          of chevron + a filled gold circle to signal "completion". */}
      {!onNextBlock && onFinishWorkout && (
        <div className="px-5 pt-6 pb-10 flex items-center justify-center">
          <button
            onClick={onFinishWorkout}
            disabled={saving}
            className="press-scale flex items-center gap-4 disabled:opacity-50"
            aria-label="Terminar sesión"
          >
            <div className="text-right">
              <p
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
              >
                Cierre
              </p>
              <p
                className="mt-0.5 font-display"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.1,
                }}
              >
                Terminar sesión
              </p>
            </div>
            <span
              className="liftory-breathe flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#C4A24E",
                boxShadow: "0 0 18px rgba(196,162,78,0.45)",
              }}
            >
              <Check className="h-4 w-4" style={{ color: "#0D0D0F" }} strokeWidth={3} />
            </span>
          </button>
        </div>
      )}

      <ExerciseVideoOverlay
        videoUrl={videoOverlay?.videoUrl ?? null}
        exerciseName={videoOverlay?.name ?? ""}
        coachingCue={videoOverlay?.coachingCue ?? null}
        visible={!!videoOverlay}
        onClose={() => setVideoOverlay(null)}
      />
    </div>
  );
}

/* ═══════ SUPERSET ═══════ */
function SupersetContent({
  block, weightUnit, saving, getInputs, updateInput, handleToggle,
  updateCompletedWeight, updateCompletedReps, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
  workoutId, userId, onSwapExercise, localUnit, onToggleUnit, exerciseDeltas,
}: {
  block: WorkoutBlock; weightUnit: string; saving: boolean;
  getInputs: (s: WorkoutSetData) => SetInputs;
  updateInput: (id: string, f: keyof SetInputs, v: string) => void;
  handleToggle: (s: WorkoutSetData, gi: number, last: boolean) => void;
  updateCompletedWeight: (id: string, w: string) => void;
  updateCompletedReps: (id: string, r: string) => void;
  getSuggestedWeight: (eid: string, reps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null; justCompleted: string | null;
  isCompleted: (s: WorkoutSetData) => boolean;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  workoutId?: string; userId?: string; onSwapExercise?: () => void;
  localUnit: string;
  onToggleUnit: () => void;
  exerciseDeltas?: Record<string, ExerciseDelta>;
}) {
  const label = block.supersetGroup?.label || "SUPERSET";
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center pt-8 pb-4">
        <div
          className="w-px flex-1"
          style={{
            background: "#C4A24E",
            opacity: 0.55,
            boxShadow: "0 0 8px rgba(196,162,78,0.3)",
          }}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <span
          className="font-mono uppercase mb-2"
          style={{
            fontSize: 9,
            letterSpacing: "2.5px",
            color: "#C4A24E",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {block.groups.map((group, gi) => (
          <ExerciseCard
            key={group.exercise.id}
            group={group}
            weightUnit={weightUnit}
            saving={saving}
            getInputs={getInputs}
            updateInput={updateInput}
            onToggle={(set) => handleToggle(set, gi, gi === block.groups.length - 1)}
            updateCompletedWeight={updateCompletedWeight}
            updateCompletedReps={updateCompletedReps}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            isCompleted={isCompleted}
            onOpenVideo={onOpenVideo}
            workoutId={workoutId}
            userId={userId}
            onSwapExercise={onSwapExercise}
            localUnit={localUnit}
            onToggleUnit={onToggleUnit}
            delta={exerciseDeltas?.[group.exercise.id]}
            hideRest
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════ EXERCISE CUE TOGGLE ═══════
 *
 * Collapsible "Cue" pill that opens the technical instruction inline.
 * Hidden by default because most athletes know the technique by week 3
 * of a meso — the cue is reference material, not active reading. Tapping
 * the pill expands the italic note and rotates the chevron. Same pattern
 * as Notas del coach in the workout overview.
 */
function ExerciseCueToggle({ cue }: { cue: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="press-scale inline-flex items-center gap-1.5"
        style={{
          border: "1px solid rgba(196,162,78,0.25)",
          borderRadius: 999,
          padding: "4px 10px",
        }}
        aria-expanded={open}
      >
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2px", color: "#C4A24E" }}
        >
          Cue
        </span>
        <span
          style={{
            fontSize: 10,
            color: "#C4A24E",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <p
          className="mt-2 font-body italic"
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.55,
          }}
        >
          {cue}
        </p>
      )}
    </div>
  );
}

/* ═══════ STRENGTH EXERCISE CARD ═══════ */
function ExerciseCard({
  group, weightUnit, saving, getInputs, updateInput, onToggle,
  updateCompletedWeight, updateCompletedReps, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
  workoutId, userId, onSwapExercise, localUnit, onToggleUnit, hideRest = false, delta,
}: {
  group: ExerciseGroup; weightUnit: string; saving: boolean;
  getInputs: (s: WorkoutSetData) => SetInputs;
  updateInput: (id: string, f: keyof SetInputs, v: string) => void;
  onToggle: (s: WorkoutSetData) => void;
  updateCompletedWeight: (id: string, w: string) => void;
  updateCompletedReps: (id: string, r: string) => void;
  getSuggestedWeight: (eid: string, reps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null; justCompleted: string | null;
  isCompleted: (s: WorkoutSetData) => boolean;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  workoutId?: string;
  userId?: string;
  onSwapExercise?: () => void;
  localUnit: string;
  onToggleUnit: () => void;
  hideRest?: boolean;
  delta?: ExerciseDelta;
}) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;
  const ex = group.exercise;
  const sets = group.sets;
  const completedCount = sets.filter((s) => isCompleted(s)).length;
  const cueOverride = sets[0]?.coaching_cue_override;
  const blockLabel = sets[0]?.block_label || "";

  // Substitution state
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [hasSubs, setHasSubs] = useState(false);
  const [originalExerciseId, setOriginalExerciseId] = useState<string | null>(null);

  // Weight picker state
  const [pickerSetId, setPickerSetId] = useState<string | null>(null);
  const [pickerInitialValue, setPickerInitialValue] = useState(0);

  const openWeightPicker = (set: WorkoutSetData) => {
    const inputs = getInputs(set);
    if (inputs.weight === "BW") {
      setPickerInitialValue(BODYWEIGHT_SENTINEL);
    } else {
      setPickerInitialValue(parseFloat(inputs.weight) || 0);
    }
    setPickerSetId(set.id);
  };

  // Reps picker state
  const [repsPickerSetId, setRepsPickerSetId] = useState<string | null>(null);
  const [repsPickerInitialValue, setRepsPickerInitialValue] = useState(1);

  const openRepsPicker = (set: WorkoutSetData) => {
    const inputs = getInputs(set);
    const val = parseInt(inputs.reps) || set.planned_reps || 1;
    setRepsPickerInitialValue(val);
    setRepsPickerSetId(set.id);
  };

  const handlePickerConfirm = (value: number) => {
    if (!pickerSetId) return;
    updateInput(pickerSetId, "weight", String(value));
  };

  // Check if this exercise has substitutions — either directly or via a swap record
  useEffect(() => {
    if (!workoutId || !userId) return;

    const check = async () => {
      // 1. Check if the CURRENT exercise has subs directly
      const { count: directCount } = await supabase
        .from("exercise_substitutions")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", ex.id);

      if ((directCount ?? 0) > 0) {
        setHasSubs(true);
        setOriginalExerciseId(null); // current IS the original
        return;
      }

      // 2. Check if this exercise is a REPLACEMENT (user already swapped)
      const { data: swapRecord } = await supabase
        .from("workout_exercise_swaps")
        .select("original_exercise_id")
        .eq("user_id", userId)
        .eq("workout_id", workoutId)
        .eq("replacement_exercise_id", ex.id)
        .eq("block_label", blockLabel)
        .maybeSingle();

      if (swapRecord) {
        // The original has subs — verify
        const { count: origCount } = await supabase
          .from("exercise_substitutions")
          .select("id", { count: "exact", head: true })
          .eq("exercise_id", swapRecord.original_exercise_id);

        if ((origCount ?? 0) > 0) {
          setHasSubs(true);
          setOriginalExerciseId(swapRecord.original_exercise_id);
          return;
        }
      }

      setHasSubs(false);
      setOriginalExerciseId(null);
    };

    check();
  }, [ex.id, workoutId, userId, blockLabel]);

  return (
    <div
      className="py-5 mb-1"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
          className="shrink-0 overflow-hidden rounded-md"
          style={{ width: 56, height: 42 }}
          aria-label={`Ver video · ${ex.name}`}
        >
          <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={56} height={42} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <p
              className="font-display leading-snug"
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "hsl(var(--foreground))",
                wordBreak: "break-word",
              }}
            >
              {ex.name}
            </p>
            {hasSubs && (
              <button
                onClick={() => setShowSwapSheet(true)}
                className="shrink-0 flex items-center justify-center rounded-full mt-1"
                style={{ width: 22, height: 22, border: "1px solid hsl(var(--border))" }}
                title="Sustituir ejercicio"
                aria-label="Sustituir ejercicio"
              >
                <Shuffle className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          {/* Prescription line removed — every part of it (N sets · tempo ·
              rest · reps) lives elsewhere:
                - sets count + rest are in the block header
                - reps are in each set table row
                - tempo is in the italic cue below
              Showing it here was pure duplication. */}
          {delta && (() => {
            const parts = formatDelta(delta);
            if (parts.length === 0) return null;
            return (
              <p
                className="font-mono uppercase mt-1.5"
                style={{ fontSize: 8, color: "#C4A24E", letterSpacing: "2px", fontWeight: 600 }}
              >
                vs semana pasada · {parts.join(" · ")}
              </p>
            );
          })()}
        </div>
        <span
          className="font-mono shrink-0 mt-1"
          style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
        >
          {completedCount}/{sets.length}
        </span>
      </div>

      {/* Swap bottom sheet */}
      {workoutId && userId && (
        <SwapBottomSheet
          visible={showSwapSheet}
          exerciseId={ex.id}
          exerciseName={ex.name}
          blockLabel={blockLabel}
          workoutId={workoutId}
          userId={userId}
          originalExerciseId={originalExerciseId}
          onClose={() => setShowSwapSheet(false)}
          onSwapComplete={() => onSwapExercise?.()}
        />
      )}

      {cueOverride && <ExerciseCueToggle cue={cueOverride} />}

      {/* Weight Picker */}
      <WeightPickerSheet
        visible={pickerSetId !== null}
        unit={weightUnit as "kg" | "lb"}
        initialValue={pickerInitialValue}
        onConfirm={(value) => {
          const targetSetId = pickerSetId;
          if (!targetSetId) return;
          if (value === BODYWEIGHT_SENTINEL) {
            updateInput(targetSetId, "weight", "BW");
          } else {
            updateInput(targetSetId, "weight", String(value));
          }
        }}
        onClose={() => setPickerSetId(null)}
      />

      {/* Reps Picker */}
      <RepsPickerSheet
        visible={repsPickerSetId !== null}
        initialValue={repsPickerInitialValue}
        onConfirm={(value) => {
          const targetSetId = repsPickerSetId;
          if (!targetSetId) return;
          updateInput(targetSetId, "reps", String(value));
        }}
        onClose={() => setRepsPickerSetId(null)}
      />

      {/* Set table */}
      <div className="mt-3">
        <div className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 px-1 mb-1.5">
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>SET</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>RPE</span>
          <div
            onClick={onToggleUnit}
            className="flex items-center rounded-full cursor-pointer select-none -mx-1"
            style={{
              background: tc.accentBg,
              border: `1px solid ${tc.accentBgStrong}`,
              height: 20,
              width: 58,
            }}
          >
            <span
              className="font-mono flex-1 text-center transition-all"
              style={{
                fontSize: 8,
                fontWeight: localUnit === "kg" ? 700 : 400,
                color: localUnit === "kg" ? tc.btnText : tc.muted,
                background: localUnit === "kg" ? tc.accent : "transparent",
                borderRadius: 9999,
                lineHeight: "18px",
                letterSpacing: "0.05em",
              }}
            >
              KG
            </span>
            <span
              className="font-mono flex-1 text-center transition-all"
              style={{
                fontSize: 8,
                fontWeight: localUnit === "lb" ? 700 : 400,
                color: localUnit === "lb" ? tc.btnText : tc.muted,
                background: localUnit === "lb" ? tc.accent : "transparent",
                borderRadius: 9999,
                lineHeight: "18px",
                letterSpacing: "0.05em",
              }}
            >
              LB
            </span>
          </div>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>REPS</span>
          <Check className="h-3 w-3 text-muted-foreground mx-auto" />
        </div>

        {sets.map((set, si) => {
          const completed = isCompleted(set);
          const inputs = getInputs(set);
          const isWarmup = set.set_type === "warmup";
          const isBackoff = set.set_type === "backoff";
          const isPrFlash = prFlash === set.id;
          const isJustDone = justCompleted === set.id;
          const rpeHigh = (set.planned_rpe ?? 0) >= 9;
          const setCue = set.coaching_cue_override;
          const isTimed = (set.planned_duration_seconds ?? 0) > 0;

          // Timed sets (planks, holds, etc.): render a timer instead of weight/reps inputs
          if (isTimed) {
            return (
              <TimedSetRow
                key={set.id}
                set={set}
                index={si}
                completed={completed}
                isJustDone={isJustDone}
                rpeHigh={rpeHigh}
                accent={tc.accent}
                accentBg={tc.accentBg}
                accentBgStrong={tc.accentBgStrong}
                muted={tc.muted}
                isDark={isDark}
                onComplete={() => onToggle(set)}
                saving={saving}
                exerciseName={group.exercise.name}
              />
            );
          }

          return (
            <div
              key={set.id}
              className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 items-center px-1 py-1.5 rounded-lg transition-all"
              style={{
                opacity: completed ? 0.8 : isWarmup ? 0.6 : 1,
                backgroundColor: isJustDone ? tc.accentBg : undefined,
              }}
            >
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-foreground" style={{ fontSize: 11, backgroundColor: "hsl(var(--secondary))" }}>
                  {si + 1}
                </span>
                {isWarmup && <span className="font-mono text-muted-foreground" style={{ fontSize: 8 }}>W</span>}
                {isBackoff && <span className="font-mono" style={{ fontSize: 8, color: tc.accent }}>BK</span>}
              </div>

              <span className="font-mono rounded-full px-1.5 py-0.5 text-center" style={{ fontSize: 9, backgroundColor: rpeHigh ? tc.accentBgStrong : (isDark ? "rgba(138,126,114,0.15)" : "rgba(129,109,102,0.1)"), color: rpeHigh ? tc.accent : tc.muted }}>
                {set.planned_rpe ? `RPE ${set.planned_rpe}` : "—"}
              </span>

              <button
                onClick={() => openWeightPicker(set)}
                className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full text-left"
                style={{ background: "hsl(var(--border))", border: "none", fontSize: 14, minHeight: 34 }}
              >
                {(() => {
                  // BW sentinel: show "BW" label
                  if (inputs.weight === "BW" || set.actual_weight === BODYWEIGHT_SENTINEL) {
                    return <span style={{ color: tc.accent, fontWeight: 600, fontSize: 13 }}>BW</span>;
                  }
                  const displayVal = inputs.weight || (set.actual_weight != null && set.actual_weight > 0 ? String(toDisplayWeight(set.actual_weight, localUnit)) : "");
                  return displayVal ? (
                    <span>{displayVal}</span>
                  ) : (
                    <span className="text-muted-foreground" style={{ fontSize: 12 }}>{weightUnit}</span>
                  );
                })()}
              </button>

              {/* Reps with /lado */}
              <button
                onClick={() => openRepsPicker(set)}
                className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full text-left"
                style={{ background: "hsl(var(--border))", border: "none", fontSize: 14, minHeight: 34 }}
              >
                {(() => {
                  const displayVal = inputs.reps || (set.actual_reps != null ? String(set.actual_reps) : "");
                  return displayVal ? (
                    <span>
                      {displayVal}
                      {isPerSide(setCue) ? <span className="text-muted-foreground" style={{ fontSize: 9 }}>/l</span> : null}
                      {(isPrFlash || set.is_pr) && <span className={`ml-1 font-mono ${isPrFlash ? "animate-pr-pulse" : ""}`} style={{ fontSize: 9, color: "#D4A03C", fontWeight: 700 }}>PR</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground" style={{ fontSize: 12 }}>reps</span>
                  );
                })()}
              </button>

              <button
                onClick={() => onToggle(set)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all mx-auto"
                style={{
                  borderColor: completed ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: completed ? "hsl(var(--primary))" : "transparent",
                }}
              >
                {completed ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ MOBILITY CONTENT with sub-groups ═══════ */
function MobilityContent({
  block, saving, isCompleted, onToggle, onOpenVideo,
}: {
  block: WorkoutBlock; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onToggle: (s: WorkoutSetData) => void;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  // Build items with sub-group headers
  const items: Array<{ type: 'header'; text: string } | { type: 'exercise'; group: ExerciseGroup; cleanCue: string | null }> = [];

  for (const group of block.groups) {
    const cueOverride = group.sets[0]?.coaching_cue_override as string | null;
    const { header, cleanCue } = parseSubGroupHeader(cueOverride);
    if (header) {
      items.push({ type: 'header', text: header });
    }
    items.push({ type: 'exercise', group, cleanCue });
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        if (item.type === 'header') {
          return (
            <div
              key={`h-${i}`}
              className="pt-7 pb-3 first:pt-2"
              style={{ borderBottom: "1px solid hsl(var(--border))" }}
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "2.5px", color: "#C4A24E" }}
              >
                {item.text}
              </span>
            </div>
          );
        }
        const { group, cleanCue } = item;
        const ex = group.exercise;
        const sets = group.sets;
        const allDone = sets.every(s => isCompleted(s));

        const repsLabel = sets[0]?.planned_reps ? formatReps(sets[0].planned_reps, cleanCue) : null;
        const durSec = sets[0]?.planned_duration_seconds;
        const durLabel = durSec ? (durSec >= 60 ? `${Math.round(durSec / 60)} min` : `${durSec} seg`) : null;
        const primary = durLabel || repsLabel;
        const cueIsVerbose = cleanCue && cleanCue.length > 20;

        return (
          <div
            key={ex.id}
            className="flex items-start gap-4 py-4"
            style={{
              borderBottom: "1px solid hsl(var(--border))",
              opacity: allDone ? 0.5 : 1,
            }}
          >
            {/* Tiny thumbnail — taps open the video */}
            <button
              onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cleanCue })}
              className="shrink-0 overflow-hidden rounded-md"
              style={{ width: 40, height: 30 }}
              aria-label={`Ver video · ${ex.name}`}
            >
              <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={40} height={30} />
            </button>

            {/* Name + meta + optional verbose cue */}
            <div className="flex-1 min-w-0">
              <p
                className="font-display"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.2,
                  wordBreak: "break-word",
                }}
              >
                {ex.name}
              </p>
              {/* Rep/duration label.
                  Short cue → "5 reps · cue" inline.
                  Verbose cue → show reps as its own eyebrow line UNLESS
                  the cue already contains the rep count (avoid "5/lado"
                  appearing twice).
                  Verbose cue gets its own italic line below in both cases. */}
              {(() => {
                const cueAlreadyHasReps = !!(primary && cleanCue && cleanCue.includes(primary));
                const showRepsInline = !cueIsVerbose && primary;
                const showRepsStandalone = cueIsVerbose && primary && !cueAlreadyHasReps;
                return (
                  <>
                    {showRepsInline && (
                      <p
                        className="mt-1 font-mono uppercase"
                        style={{ fontSize: 9, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
                      >
                        {primary}{cleanCue ? ` · ${cleanCue}` : ""}
                      </p>
                    )}
                    {showRepsStandalone && (
                      <p
                        className="mt-1 font-mono uppercase"
                        style={{ fontSize: 9, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
                      >
                        {primary}
                      </p>
                    )}
                    {cueIsVerbose && cleanCue && (
                      <p
                        className="mt-1.5 font-body italic"
                        style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.45, color: "hsl(var(--muted-foreground))" }}
                      >
                        {cleanCue}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Check buttons — one per set/round. Minimal circles. */}
            <div className="flex gap-1.5 shrink-0 mt-0.5">
              {sets.map((set) => {
                const done = isCompleted(set);
                return (
                  <button
                    key={set.id}
                    onClick={() => onToggle(set)}
                    disabled={saving}
                    className="press-scale flex items-center justify-center transition-all"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: `1.5px solid ${done ? "#C4A24E" : "hsl(var(--border))"}`,
                      background: done ? "#C4A24E" : "transparent",
                      boxShadow: done ? "0 0 10px rgba(196,162,78,0.35)" : "none",
                    }}
                    aria-label={done ? "Marcar incompleto" : "Marcar completo"}
                  >
                    {done && <Check className="h-3 w-3" style={{ color: "#0D0D0F" }} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════ COOLDOWN CARD ═══════ */
function CooldownCard({
  group, saving, isCompleted, onToggle, onOpenVideo,
}: {
  group: ExerciseGroup; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onToggle: (s: WorkoutSetData) => void;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const ex = group.exercise;
  const sets = group.sets;
  const cueOverride = sets[0]?.coaching_cue_override;
  const durSec = sets[0]?.planned_duration_seconds;
  const allDone = sets.every((s) => isCompleted(s));

  // Short duration label (e.g., "60 seg", "45 seg", "1 min") extracted from data
  const durLabel = durSec ? (durSec >= 60 && durSec % 60 === 0 ? `${durSec / 60} min` : `${durSec} seg`) : null;
  // Use the cue as descriptive text on its own line when present
  const cueText = cueOverride?.trim() || null;
  const cueIsShort = cueText && cueText.length <= 12;

  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{
        borderBottom: "1px solid hsl(var(--border))",
        opacity: allDone ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
        className="shrink-0 overflow-hidden rounded-md mt-0.5"
        style={{ width: 40, height: 30 }}
        aria-label={`Ver video · ${ex.name}`}
      >
        <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={40} height={30} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className="font-display"
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "hsl(var(--foreground))",
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            {ex.name}
          </p>
          {(durLabel || cueIsShort) && (
            <span
              className="font-mono uppercase shrink-0"
              style={{ fontSize: 9, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
            >
              {cueIsShort ? cueText : durLabel}
            </span>
          )}
        </div>
        {cueText && !cueIsShort && (
          <p
            className="mt-1.5 font-body italic"
            style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.45, color: "hsl(var(--muted-foreground))" }}
          >
            {cueText}
          </p>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0 mt-0.5">
        {sets.map((set) => {
          const done = isCompleted(set);
          return (
            <button
              key={set.id}
              onClick={() => onToggle(set)}
              disabled={saving}
              className="press-scale flex items-center justify-center transition-all"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `1.5px solid ${done ? "#C4A24E" : "hsl(var(--border))"}`,
                background: done ? "#C4A24E" : "transparent",
                boxShadow: done ? "0 0 10px rgba(196,162,78,0.35)" : "none",
              }}
              aria-label={done ? "Marcar incompleto" : "Marcar completo"}
            >
              {done && <Check className="h-3 w-3" style={{ color: "#0D0D0F" }} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════ CARDIO CARD ═══════ */
function CardioCard({
  group, saving, isCompleted, onCompleteAll, onUncompleteAll, onOpenVideo,
}: {
  group: ExerciseGroup; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteAll: () => Promise<void>;
  onUncompleteAll: () => Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const [notes, setNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const ex = group.exercise;
  const sets = group.sets;
  const allDone = sets.every((s) => isCompleted(s));
  const cueOverride = sets[0]?.coaching_cue_override;

  const handleDone = async () => {
    setCompleting(true);
    await onCompleteAll();
    setCompleting(false);
  };

  return (
    <div
      className="py-5"
      style={{ borderBottom: "1px solid hsl(var(--border))", opacity: allDone ? 0.55 : 1 }}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
          className="shrink-0 overflow-hidden rounded-md"
          style={{ width: 56, height: 42 }}
          aria-label={`Ver video · ${ex.name}`}
        >
          <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={56} height={42} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className="font-display"
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "hsl(var(--foreground))",
              lineHeight: 1.2,
              wordBreak: "break-word",
            }}
          >
            {ex.name}
          </p>
        </div>
        {allDone && (
          <button
            onClick={async () => { setCompleting(true); await onUncompleteAll(); setCompleting(false); }}
            disabled={saving || completing}
            className="press-scale flex items-center justify-center shrink-0"
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#C4A24E",
              boxShadow: "0 0 10px rgba(196,162,78,0.35)",
            }}
            aria-label="Marcar incompleto"
          >
            <Check className="h-3.5 w-3.5" style={{ color: "#0D0D0F" }} strokeWidth={3} />
          </button>
        )}
      </div>

      {cueOverride && (
        <p
          className="mt-3 font-body italic"
          style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.55, color: "hsl(var(--muted-foreground))" }}
        >
          {cueOverride}
        </p>
      )}

      {!allDone && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Velocidad, inclinación, observaciones..."
            className="mt-4 w-full font-body outline-none resize-none"
            style={{
              fontSize: 13,
              padding: "12px 14px",
              background: "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              color: "hsl(var(--foreground))",
            }}
            rows={2}
          />
          <button
            onClick={handleDone}
            disabled={saving || completing}
            className="press-scale mt-3 flex w-full items-center justify-center gap-2 disabled:opacity-50"
            style={{
              padding: "14px 0",
              borderRadius: 14,
              border: "1px solid #C4A24E",
              background: "transparent",
              color: "#C4A24E",
              fontFamily: "'Syne', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Completado
          </button>
        </>
      )}
    </div>
  );
}

/* ═══════ TIMED SET ROW (for planks, dead hangs, L-sit holds, farmer carries) ═══════
 * Renders a countdown timer instead of weight/reps inputs when a set has
 * planned_duration_seconds > 0.
 *
 * Phase machine:
 *   idle      Timer at full duration, ready to start. Tap to begin.
 *   prep      3-2-1 countdown so the athlete has time to set up
 *             (grip the bar, get into plank position, etc.). Tap to cancel.
 *   running   Actual timer counting down. Tap to pause.
 *   paused    Paused mid-run. Tap to resume.
 *   done      Timer hit 0 — auto-completes the set.
 *
 * A small reset button appears whenever there's something to reset
 * (prep / running / paused) so the athlete can bail out of a bad rep
 * setup or restart for any reason. Reset returns to `idle` and clears
 * the remaining time back to the full target.
 *
 * Auto-completes the set when the timer reaches zero. User can also
 * manually complete by tapping the check.
 *
 * Stored value uses actual_weight=0, actual_reps=1 (sentinel for "held once").
 */
const PREP_SECONDS = 10;

type TimerPhase = "idle" | "prep" | "running" | "paused" | "done";

function TimedSetRow({
  set, index, completed, isJustDone, rpeHigh, accent, accentBg, accentBgStrong, muted, isDark, onComplete, saving, exerciseName,
}: {
  set: WorkoutSetData;
  index: number;
  completed: boolean;
  isJustDone: boolean;
  rpeHigh: boolean;
  accent: string;
  accentBg: string;
  accentBgStrong: string;
  muted: string;
  isDark: boolean;
  onComplete: () => void;
  saving: boolean;
  exerciseName: string;
}) {
  const targetSec = set.planned_duration_seconds ?? 60;
  const [phase, setPhase] = useState<TimerPhase>(completed ? "done" : "idle");
  const [remaining, setRemaining] = useState(targetSec);
  const [prepRemaining, setPrepRemaining] = useState(PREP_SECONDS);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const completedRef = useRef(completed);
  useEffect(() => { completedRef.current = completed; }, [completed]);

  // Tick: drives both the prep 3-2-1 and the actual timer based on phase.
  // Audio + haptic cues are intentionally generous because the athlete has the
  // phone on the floor and can't see the screen during a hold — they need to
  // hear when prep is about to end and when the hold itself finishes.
  useEffect(() => {
    if (phase !== "prep" && phase !== "running") return;
    const intervalId = window.setInterval(() => {
      if (phase === "prep") {
        setPrepRemaining((p) => {
          if (p <= 1) {
            // Prep finished — start the real timer next tick.
            playBeep(1000, 300);
            try { navigator.vibrate?.(200); } catch { /* noop */ }
            setPhase("running");
            return PREP_SECONDS; // reset for any future restart
          }
          if (p <= 4) {
            // Last 3 seconds of prep: short tick beeps so athlete knows to grip.
            playBeep(700, 80);
            try { navigator.vibrate?.(40); } catch { /* noop */ }
          }
          return p - 1;
        });
      } else {
        setRemaining((r) => {
          if (r <= 1) {
            // Timer finished — long beep + buzz so athlete can drop the load.
            playBeep(500, 400);
            window.setTimeout(() => playBeep(500, 400), 450);
            try { navigator.vibrate?.([400, 100, 400]); } catch { /* noop */ }
            setPhase("done");
            if (!completedRef.current) onCompleteRef.current();
            return 0;
          }
          if (r <= 4) {
            // Last 3 seconds of the hold: tick beeps for "almost there".
            playBeep(900, 100);
            try { navigator.vibrate?.(50); } catch { /* noop */ }
          }
          return r - 1;
        });
      }
    }, 1000);
    return () => { window.clearInterval(intervalId); };
  }, [phase]);

  // Reset state when the set gets uncompleted externally (e.g. user untaps the check).
  useEffect(() => {
    if (!completed) {
      setPhase("idle");
      setRemaining(targetSec);
      setPrepRemaining(PREP_SECONDS);
    } else {
      setPhase("done");
    }
  }, [completed, targetSec]);

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const handleTimerTap = () => {
    if (completed) return;
    if (phase === "idle") {
      // Start with a 3-2-1 setup window before the real timer.
      setPrepRemaining(PREP_SECONDS);
      setRemaining(targetSec);
      setPhase("prep");
    } else if (phase === "prep") {
      // Tap during prep → cancel and go back to idle.
      setPhase("idle");
      setPrepRemaining(PREP_SECONDS);
    } else if (phase === "running") {
      setPhase("paused");
    } else if (phase === "paused") {
      setPhase("running");
    } else if (phase === "done") {
      // Tap a finished timer to restart.
      setRemaining(targetSec);
      setPrepRemaining(PREP_SECONDS);
      setPhase("prep");
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhase("idle");
    setRemaining(targetSec);
    setPrepRemaining(PREP_SECONDS);
  };

  const isActive = phase === "prep" || phase === "running" || phase === "paused";
  const pct = completed ? 100 : ((targetSec - remaining) / targetSec) * 100;

  // Fullscreen overlay shown while the timer is active. Required because the
  // inline row's font-size (14px) is invisible from 1-2 m away — and that's
  // exactly where the phone sits when the athlete is mid-hold (floor next to
  // a kettlebell, propped on a bench, etc.). The overlay uses 240px digits
  // (mm:ss) that read across a gym, plus a giant tap target to pause/resume,
  // a "Hecho" exit, and a reset. It pulses red in the final 3 s so the
  // athlete sees the end coming even if the audio cue gets missed.
  const overlay = isActive ? ReactDOM.createPortal(
    (
      <div
        className="fixed inset-0 z-[90] flex flex-col items-stretch justify-between bg-background"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Top: exercise name + close (× reset to idle) */}
        <div className="flex items-center justify-between px-5 pt-14 pb-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "2px" }}>
              {phase === "prep" ? "Prepárate" : phase === "paused" ? "Pausado" : "Hold"}
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground leading-tight" style={{ letterSpacing: "-0.02em", wordBreak: "break-word" }}>
              {exerciseName}
            </h2>
            <p className="font-mono text-muted-foreground mt-1" style={{ fontSize: 12 }}>
              Set {index + 1} · objetivo {mmss(targetSec)}
            </p>
          </div>
          <button
            onClick={handleReset}
            aria-label="Cancelar timer"
            className="flex h-11 w-11 items-center justify-center rounded-full shrink-0"
            style={{ background: "hsl(var(--secondary))" }}
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Center: GIANT timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-5">
          {phase === "prep" ? (
            <>
              <p className="font-mono uppercase text-muted-foreground" style={{ fontSize: 12, letterSpacing: "3px", marginBottom: 16 }}>
                Empieza el hold en
              </p>
              <p
                className="font-mono font-bold text-primary tabular-nums"
                style={{
                  // prep es 1-2 dígitos, puede ser más grande sin desbordar
                  fontSize: "clamp(160px, 50vw, 320px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.06em",
                  animation: prepRemaining <= 3 ? "pulse 0.8s infinite" : undefined,
                }}
              >
                {prepRemaining}
              </p>
            </>
          ) : (
            <>
              <p
                className="font-mono font-bold tabular-nums"
                style={{
                  // mm:ss son 5 chars en mono ≈ 3× font-size de ancho.
                  // 28vw mantiene el reloj dentro del viewport en iPhone (~110px)
                  // y crece hasta 240px cap en tablets/desktop.
                  fontSize: "clamp(96px, 28vw, 240px)",
                  lineHeight: 0.9,
                  letterSpacing: "-0.06em",
                  color: remaining <= 3 ? "#D45555" : "hsl(var(--foreground))",
                  animation: remaining <= 3 ? "pulse 0.6s infinite" : undefined,
                }}
              >
                {mmss(remaining)}
              </p>
              {/* Progress bar — wide and thick so it reads from far. */}
              <div className="mt-8 h-3 w-full max-w-md overflow-hidden rounded-full" style={{ backgroundColor: "hsl(var(--border))" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${pct}%`,
                    background: remaining <= 3 ? "#D45555" : accent,
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom: huge action buttons. Each ~84px tall — finger-sized for a sweaty hand. */}
        <div className="px-5 pb-10 flex flex-col gap-3">
          {phase !== "prep" && (
            <button
              onClick={() => setPhase(phase === "running" ? "paused" : "running")}
              className="press-scale w-full rounded-2xl flex items-center justify-center gap-3"
              style={{
                height: 84,
                background: phase === "running" ? "hsl(var(--secondary))" : accent,
                color: phase === "running" ? "hsl(var(--foreground))" : "hsl(var(--background))",
              }}
            >
              {phase === "running" ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
              <span className="font-display text-lg font-bold uppercase" style={{ letterSpacing: "0.08em" }}>
                {phase === "running" ? "Pausa" : "Reanudar"}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setPhase("done");
              if (!completedRef.current) onCompleteRef.current();
            }}
            className="press-scale w-full rounded-2xl flex items-center justify-center gap-3"
            style={{
              height: 84,
              background: phase === "running" ? accent : "hsl(var(--secondary))",
              color: phase === "running" ? "hsl(var(--background))" : "hsl(var(--foreground))",
              border: phase === "running" ? "none" : `2px solid ${accent}`,
            }}
          >
            <Check className="h-7 w-7" />
            <span className="font-display text-lg font-bold uppercase" style={{ letterSpacing: "0.08em" }}>
              Hecho
            </span>
          </button>
        </div>
      </div>
    ),
    document.body,
  ) : null;

  // What to show in the timer button:
  //   prep    → big number "3" / "2" / "1"
  //   running → mm:ss + Pause icon
  //   paused  → mm:ss + Play icon
  //   idle    → mm:ss + Timer icon
  //   done    → mm:ss (0:00) + Check
  let timerIcon: React.ReactNode;
  let timerLabel: string;
  if (phase === "prep") {
    timerIcon = null;
    timerLabel = String(prepRemaining);
  } else if (phase === "running") {
    timerIcon = <Pause className="h-3.5 w-3.5" style={{ color: accent }} />;
    timerLabel = mmss(remaining);
  } else if (phase === "paused") {
    timerIcon = <Play className="h-3.5 w-3.5" style={{ color: accent }} />;
    timerLabel = mmss(remaining);
  } else if (phase === "done" || completed) {
    timerIcon = <Check className="h-3.5 w-3.5" style={{ color: accent }} />;
    timerLabel = mmss(remaining);
  } else {
    timerIcon = <Timer className="h-3.5 w-3.5 text-muted-foreground" />;
    timerLabel = mmss(remaining);
  }

  return (
    <div
      className="flex items-center gap-2 px-1 py-1.5 rounded-lg transition-all"
      style={{
        opacity: completed ? 0.8 : 1,
        backgroundColor: isJustDone ? accentBg : undefined,
      }}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-foreground shrink-0"
        style={{ fontSize: 11, backgroundColor: "hsl(var(--secondary))" }}
      >
        {index + 1}
      </span>

      <span
        className="font-mono rounded-full px-1.5 py-0.5 text-center shrink-0"
        style={{
          fontSize: 9,
          backgroundColor: rpeHigh ? accentBgStrong : (isDark ? "rgba(138,126,114,0.15)" : "rgba(129,109,102,0.1)"),
          color: rpeHigh ? accent : muted,
        }}
      >
        {set.planned_rpe ? `RPE ${set.planned_rpe}` : "—"}
      </span>

      <button
        onClick={handleTimerTap}
        disabled={completed && phase !== "done"}
        className="flex-1 relative overflow-hidden rounded-lg px-3 py-2 transition-all"
        style={{
          background: completed ? accentBg : "hsl(var(--border))",
          border: `1px solid ${phase === "running" || phase === "prep" ? accent : "transparent"}`,
        }}
      >
        {/* Progress bar fill — only during real timer phases, not prep */}
        {phase !== "prep" && (
          <div
            className="absolute inset-y-0 left-0 transition-all"
            style={{
              width: `${pct}%`,
              background: completed ? accent : accentBgStrong,
              opacity: completed ? 0.35 : 0.25,
            }}
          />
        )}
        <div className="relative flex items-center justify-center gap-2">
          {timerIcon}
          <span
            className="font-mono text-foreground tabular-nums"
            style={{
              fontSize: phase === "prep" ? 18 : 14,
              fontWeight: phase === "prep" ? 700 : 600,
              color: phase === "prep" ? accent : undefined,
              letterSpacing: phase === "prep" ? "0.05em" : undefined,
            }}
          >
            {phase === "prep" && <span className="text-muted-foreground" style={{ fontSize: 9, marginRight: 6, letterSpacing: "1.5px" }}>LISTO</span>}
            {timerLabel}
          </span>
        </div>
      </button>

      {/* Reset — only visible while a timer is running/prep/paused.
          Lets the athlete bail and restart for any reason (bad grip, distraction, etc.). */}
      {isActive && (
        <button
          onClick={handleReset}
          aria-label="Reiniciar timer"
          className="flex h-7 w-7 items-center justify-center rounded-full border transition-all shrink-0"
          style={{
            borderColor: "hsl(var(--border))",
            background: "transparent",
          }}
        >
          <RotateCcw className="h-3 w-3" style={{ color: muted }} />
        </button>
      )}

      <button
        onClick={onComplete}
        disabled={saving}
        className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all mx-auto shrink-0"
        style={{
          borderColor: completed ? "hsl(var(--primary))" : "hsl(var(--border))",
          backgroundColor: completed ? "hsl(var(--primary))" : "transparent",
        }}
      >
        {completed ? <Check className="h-3.5 w-3.5 text-primary-foreground" /> : null}
      </button>

      {overlay}
    </div>
  );
}
