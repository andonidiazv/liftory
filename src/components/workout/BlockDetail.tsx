import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Dumbbell, Loader2, Quote, Trophy, Shuffle, X } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import SwapBottomSheet from "./SwapBottomSheet";
import WeightPickerSheet from "./WeightPickerSheet";
import RepsPickerSheet from "./RepsPickerSheet";
import type { WorkoutBlock } from "./WorkoutOverview";
import ExerciseVideoOverlay from "./ExerciseVideoOverlay";
import type { WorkoutSetData, ExerciseGroup } from "@/hooks/useWorkoutData";
import { toDisplayWeight, toStorageWeight } from "@/utils/weightConversion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import IntervalTimerBlock from "./IntervalTimerBlock";

/** Block types by render mode */
const CARDIO_BLOCKS = ['ENGINE BLOCK'];
const MOBILITY_BLOCKS = ['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];
const COOLDOWN_BLOCKS = ['RECOVERY BLOCK'];

type BlockMode = 'strength' | 'mobility' | 'cooldown' | 'cardio' | 'emom';

function getBlockMode(block: WorkoutBlock): BlockMode {
  // Check if EMOM — render as instruction block
  if (block.groups.some(g => g.sets.some(s => s.set_type === 'emom'))) return 'emom';
  if (CARDIO_BLOCKS.includes(block.name)) return 'cardio';
  if (COOLDOWN_BLOCKS.includes(block.name)) return 'cooldown';
  if (MOBILITY_BLOCKS.includes(block.name)) return 'mobility';
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
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weightKg: number | null; hint: string | null };
  onRestStart: (seconds: number) => void;
  onSwapExercise?: () => void;
  onNextBlock?: () => void;
  onFinishWorkout?: () => void;
}

function formatPrescription(sets: WorkoutSetData[]): string {
  const first = sets[0];
  if (!first) return "";
  const parts: string[] = [];
  const repsStr = formatReps(first.planned_reps, first.coaching_cue_override);
  parts.push(`${sets.length} × ${repsStr}`);
  if (first.planned_tempo) parts.push(`Tempo ${first.planned_tempo}`);
  if (first.planned_rest_seconds) {
    const s = first.planned_rest_seconds;
    parts.push(`Descanso ${s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : `${s}s`}`);
  }
  return parts.join(" · ");
}

/** Parse sub-group header from coaching cue (e.g. "2-3 rondas | cue text") */
function parseSubGroupHeader(cue: string | null | undefined): { header: string | null; cleanCue: string | null } {
  if (!cue) return { header: null, cleanCue: null };
  const match = cue.match(/^(\d+(?:-\d+)?\s*rondas?)\s*\|\s*(.*)/i);
  if (match) {
    return { header: match[1].toUpperCase(), cleanCue: match[2] || null };
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
  getSuggestedWeight,
  onRestStart,
  onSwapExercise,
  onNextBlock,
  onFinishWorkout,
}: Props) {
  const { user, refreshProfile } = useAuth();
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
          if (!prev[s.id] || s.is_completed) {
            if (s.actual_weight != null || s.actual_reps != null) {
              updated[s.id] = {
                weight: s.actual_weight != null ? String(toDisplayWeight(s.actual_weight, localUnit)) : prev[s.id]?.weight ?? "",
                reps: s.actual_reps != null ? String(s.actual_reps) : prev[s.id]?.reps ?? "",
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

  const updateInput = (setId: string, field: keyof SetInputs, value: string) => {
    const existing = setInputs[setId] || getInputs(block.groups.flatMap(g => g.sets).find(s => s.id === setId)!);
    setSetInputs((prev) => ({ ...prev, [setId]: { ...existing, [field]: value } }));

    // Always persist to DB immediately (convert display unit → kg for storage)
    if (field === "weight") {
      const w = parseFloat(value);
      if (!isNaN(w)) onUpdateSetField(setId, "actual_weight", toStorageWeight(w, localUnit));
    } else if (field === "reps") {
      const r = parseInt(value);
      if (!isNaN(r)) onUpdateSetField(setId, "actual_reps", r);
    }
  };

  const updateCompletedWeight = useCallback(async (setId: string, newWeight: string) => {
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;
    await onUpdateSetField(setId, "actual_weight", toStorageWeight(w, localUnit));
  }, [onUpdateSetField, localUnit]);

  const updateCompletedReps = useCallback(async (setId: string, newReps: string) => {
    const r = parseInt(newReps);
    if (isNaN(r)) return;
    await onUpdateSetField(setId, "actual_reps", r);
  }, [onUpdateSetField]);

  const handleComplete = async (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    const inputs = getInputs(set);
    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
    setJustCompleted(set.id);
    setTimeout(() => setJustCompleted(null), 1500);

    const shouldRest = block.supersetGroup ? isLastInSuperset : true;
    if (shouldRest && set.planned_rest_seconds) {
      onRestStart(set.planned_rest_seconds);
    }

    const result = await onCompleteSet(set, {
      actual_weight: toStorageWeight(parseFloat(inputs.weight) || 0, localUnit),
      actual_reps: parseInt(inputs.reps) || 0,
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
  const restInfo = block.groups[0]?.sets[0]?.planned_rest_seconds;
  const restDisplay = restInfo
    ? restInfo >= 60
      ? `Descanso ${Math.floor(restInfo / 60)}:${(restInfo % 60).toString().padStart(2, "0")}`
      : `Descanso ${restInfo}s`
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <BlockNameDisplay
              name={block.name}
              className="font-display text-xl font-bold text-foreground"
            />
            <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
              {blockMode === 'strength' && (
                <>{block.totalSets} sets{restDisplay ? ` · ${restDisplay}` : ""}{block.formatBadge ? ` · ${block.formatBadge}` : ""}</>
              )}
              {blockMode === 'mobility' && <>{block.groups.length} ejercicios · 2-3 rondas</>}
              {blockMode === 'cooldown' && <>{block.groups.length} estiramientos · 2 rondas</>}
              {blockMode === 'cardio' && <>Cardio</>}
              {blockMode === 'emom' && <>EMOM</>}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {blockMode === 'emom' ? (
          <EmomCard
            block={block}
            saving={saving}
            isCompleted={isCompleted}
            onCompleteAll={async () => {
              for (const g of block.groups) {
                for (const set of g.sets) {
                  if (!isCompleted(set)) {
                    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                    await onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 });
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
            onOpenVideo={(v) => setVideoOverlay(v)}
            workoutId={workoutId}
            userId={user?.id}
            onSwapExercise={onSwapExercise}
          />
        ) : blockMode === 'cardio' ? (
          <div className="flex flex-col gap-4">
            {block.groups.map((group) => {
              const hasTimedSets = group.sets.some(s => s.planned_duration_seconds != null && s.planned_duration_seconds > 0);

              if (hasTimedSets) {
                return (
                  <IntervalTimerBlock
                    key={group.exercise.id}
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Next block button */}
      {onNextBlock && nextBlockName && (
        <div className="px-5 pb-8">
          <button
            onClick={onNextBlock}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display text-[14px] font-semibold transition-colors"
            style={{ background: "rgba(199,91,57,0.1)", color: "#C75B39", border: "1px solid rgba(199,91,57,0.2)" }}
          >
            Siguiente: {nextBlockName} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Finish workout button (last block) */}
      {!onNextBlock && onFinishWorkout && (
        <div className="px-5 pb-8">
          <button
            onClick={onFinishWorkout}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-display text-[15px] font-semibold text-primary-foreground transition-all press-scale"
            style={{ background: "#C75B39" }}
          >
            <Check className="h-4 w-4" />
            Terminar sesión
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

/* ═══════ EMOM CARD (instruction mode) ═══════ */
function EmomCard({
  block, saving, isCompleted, onCompleteAll, onUncompleteAll, onOpenVideo,
  workoutId, userId, onSwapExercise,
}: {
  block: WorkoutBlock; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteAll: () => Promise<void>;
  onUncompleteAll: () => Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
  workoutId?: string; userId?: string; onSwapExercise?: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ exerciseId: string; exerciseName: string; blockLabel: string; originalExerciseId?: string | null } | null>(null);
  const [exercisesWithSubs, setExercisesWithSubs] = useState<Set<string>>(new Set());
  const [originalExerciseMap, setOriginalExerciseMap] = useState<Map<string, string>>(new Map());
  const allSets = block.groups.flatMap(g => g.sets);
  const allDone = allSets.every(s => isCompleted(s));
  const firstCue = allSets[0]?.coaching_cue_override;

  // Check which exercises in this EMOM have substitutions (directly or via swap)
  useEffect(() => {
    if (!workoutId || !userId) return;
    const exerciseIds = block.groups.map(g => g.exercise.id);

    const check = async () => {
      const subsSet = new Set<string>();
      const origMap = new Map<string, string>();

      // 1. Direct subs
      const { data: directSubs } = await supabase
        .from("exercise_substitutions")
        .select("exercise_id")
        .in("exercise_id", exerciseIds);
      (directSubs || []).forEach((d: any) => subsSet.add(d.exercise_id));

      // 2. Check swap records — exercises that are replacements
      const { data: swapRecords } = await supabase
        .from("workout_exercise_swaps")
        .select("original_exercise_id, replacement_exercise_id")
        .eq("user_id", userId)
        .eq("workout_id", workoutId)
        .in("replacement_exercise_id", exerciseIds);

      if (swapRecords?.length) {
        const origIds = swapRecords.map((s: any) => s.original_exercise_id);
        const { data: origSubs } = await supabase
          .from("exercise_substitutions")
          .select("exercise_id")
          .in("exercise_id", origIds);
        const origWithSubs = new Set((origSubs || []).map((d: any) => d.exercise_id));

        for (const sr of swapRecords) {
          if (origWithSubs.has(sr.original_exercise_id)) {
            subsSet.add(sr.replacement_exercise_id);
            origMap.set(sr.replacement_exercise_id, sr.original_exercise_id);
          }
        }
      }

      setExercisesWithSubs(subsSet);
      setOriginalExerciseMap(origMap);
    };

    check();
  }, [block.groups, workoutId, userId]);

  const handleDone = async () => {
    setCompleting(true);
    await onCompleteAll();
    setCompleting(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* Instructions */}
      {firstCue && (
        <p className="font-body text-[14px] text-foreground leading-relaxed mb-4">
          {firstCue}
        </p>
      )}

      {/* Exercise list */}
      <p className="font-mono uppercase text-muted-foreground mb-2" style={{ fontSize: 9, letterSpacing: "2px" }}>
        EJERCICIOS
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {block.groups.map((group) => {
          const ex = group.exercise;
          const reps = group.sets[0]?.planned_reps;
          const cue = group.sets[0]?.coaching_cue_override;
          return (
            <div key={ex.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <button
                onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cue })}
                className="shrink-0 overflow-hidden rounded-lg"
                style={{ width: 48, height: 36 }}
              >
                <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={48} height={36} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-body text-sm font-semibold text-foreground truncate">{ex.name}</p>
                  {exercisesWithSubs.has(ex.id) && (
                    <button
                      onClick={() => setSwapTarget({
                        exerciseId: ex.id,
                        exerciseName: ex.name,
                        blockLabel: group.sets[0]?.block_label || "",
                        originalExerciseId: originalExerciseMap.get(ex.id) || null,
                      })}
                      className="shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 24, height: 24, background: "hsl(var(--border))" }}
                    >
                      <Shuffle className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              {reps && (
                <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 12 }}>
                  {formatReps(reps, cue)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {allDone ? (
        <button
          onClick={async () => { setCompleting(true); await onUncompleteAll(); setCompleting(false); }}
          disabled={saving || completing}
          className="flex items-center justify-center gap-2 py-3 w-full"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-body text-sm font-medium text-foreground">Completado</span>
        </button>
      ) : (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Pesos usados, notas..."
            className="w-full rounded-xl bg-secondary p-3 text-sm text-foreground font-body placeholder:text-muted-foreground outline-none resize-none"
            rows={2}
          />
          <button
            onClick={handleDone}
            disabled={saving || completing}
            className="press-scale mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Completado
          </button>
        </>
      )}

      {/* Swap bottom sheet for EMOM exercises */}
      {swapTarget && workoutId && userId && (
        <SwapBottomSheet
          visible={!!swapTarget}
          exerciseId={swapTarget.exerciseId}
          exerciseName={swapTarget.exerciseName}
          blockLabel={swapTarget.blockLabel}
          workoutId={workoutId}
          userId={userId}
          originalExerciseId={swapTarget.originalExerciseId}
          onClose={() => setSwapTarget(null)}
          onSwapComplete={() => {
            setSwapTarget(null);
            onSwapExercise?.();
          }}
        />
      )}
    </div>
  );
}

/* ═══════ SUPERSET ═══════ */
function SupersetContent({
  block, weightUnit, saving, getInputs, updateInput, handleToggle,
  updateCompletedWeight, updateCompletedReps, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
  workoutId, userId, onSwapExercise, localUnit, onToggleUnit,
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
}) {
  const label = block.supersetGroup?.label || "SUPERSET";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-8">
        <div className="w-[3px] flex-1 rounded-full bg-primary" />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <span className="font-mono uppercase text-primary mb-2" style={{ fontSize: 9, letterSpacing: "2px", fontWeight: 700 }}>
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
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════ STRENGTH EXERCISE CARD ═══════ */
function ExerciseCard({
  group, weightUnit, saving, getInputs, updateInput, onToggle,
  updateCompletedWeight, updateCompletedReps, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
  workoutId, userId, onSwapExercise, localUnit, onToggleUnit,
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
}) {
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
    const val = parseFloat(inputs.weight) || 0;
    setPickerInitialValue(val);
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
    <div className="rounded-2xl border border-border bg-card p-4 mb-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
          className="shrink-0 overflow-hidden rounded-lg"
          style={{ width: 64, height: 48 }}
        >
          <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={64} height={48} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-body text-[15px] font-semibold text-foreground truncate">{ex.name}</p>
            {hasSubs && (
              <button
                onClick={() => setShowSwapSheet(true)}
                className="shrink-0 flex items-center justify-center rounded-full"
                style={{ width: 26, height: 26, background: "hsl(var(--secondary))" }}
                title="Sustituir ejercicio"
              >
                <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="font-mono text-muted-foreground mt-0.5" style={{ fontSize: 11 }}>
            {formatPrescription(sets)}
          </p>
        </div>
        <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 12 }}>
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

      {cueOverride && (
        <div className="mt-2 flex items-start gap-1.5">
          <Quote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#7A8B5C" }} />
          <p className="font-body italic" style={{ fontSize: 12, color: "#7A8B5C", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {cueOverride}
          </p>
        </div>
      )}

      {/* Weight Picker */}
      <WeightPickerSheet
        visible={pickerSetId !== null}
        unit={weightUnit as "kg" | "lb"}
        initialValue={pickerInitialValue}
        onConfirm={(value) => {
          const targetSetId = pickerSetId;
          if (!targetSetId) return;
          updateInput(targetSetId, "weight", String(value));
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
              background: "rgba(199,91,57,0.08)",
              border: "1px solid rgba(199,91,57,0.15)",
              height: 20,
              width: 58,
            }}
          >
            <span
              className="font-mono flex-1 text-center transition-all"
              style={{
                fontSize: 8,
                fontWeight: localUnit === "kg" ? 700 : 400,
                color: localUnit === "kg" ? "#fff" : "#B0ACA7",
                background: localUnit === "kg" ? "#C75B39" : "transparent",
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
                color: localUnit === "lb" ? "#fff" : "#B0ACA7",
                background: localUnit === "lb" ? "#C75B39" : "transparent",
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

          return (
            <div
              key={set.id}
              className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 items-center px-1 py-1.5 rounded-lg transition-all"
              style={{
                opacity: completed ? 0.8 : isWarmup ? 0.6 : 1,
                backgroundColor: isJustDone ? "rgba(199,91,57,0.08)" : undefined,
              }}
            >
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-foreground" style={{ fontSize: 11, backgroundColor: "hsl(var(--secondary))" }}>
                  {si + 1}
                </span>
                {isWarmup && <span className="font-mono text-muted-foreground" style={{ fontSize: 8 }}>W</span>}
                {isBackoff && <span className="font-mono" style={{ fontSize: 8, color: "#C9A96E" }}>BK</span>}
              </div>

              <span className="font-mono rounded-full px-1.5 py-0.5 text-center" style={{ fontSize: 9, backgroundColor: rpeHigh ? "rgba(199,91,57,0.15)" : "rgba(136,136,136,0.1)", color: rpeHigh ? "#C75B39" : "#888" }}>
                {set.planned_rpe ? `RPE ${set.planned_rpe}` : "—"}
              </span>

              <button
                onClick={() => openWeightPicker(set)}
                className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full text-left"
                style={{ background: "hsl(var(--border))", border: "none", fontSize: 14, minHeight: 34 }}
              >
                {(() => {
                  const displayVal = inputs.weight || (set.actual_weight != null ? String(toDisplayWeight(set.actual_weight, localUnit)) : "");
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
                      {isPrFlash && <span className="ml-1 font-mono" style={{ fontSize: 9, color: "#C9A96E" }}>PR</span>}
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
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        if (item.type === 'header') {
          return (
            <div key={`h-${i}`} className="pt-3 pb-1 first:pt-0">
              <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 10, letterSpacing: "1.5px" }}>
                {item.text}
              </span>
            </div>
          );
        }
        const { group, cleanCue } = item;
        const ex = group.exercise;
        const sets = group.sets;
        return (
          <div key={ex.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cleanCue })}
                className="shrink-0 overflow-hidden rounded-lg"
                style={{ width: 48, height: 36 }}
              >
                <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={48} height={36} />
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-body text-[14px] font-medium text-foreground">{ex.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {sets[0]?.planned_reps && (
                    <span className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {formatReps(sets[0].planned_reps, cleanCue)}
                    </span>
                  )}
                  {cleanCue && (
                    <span className="font-body text-muted-foreground" style={{ fontSize: 11 }}>
                      · {cleanCue}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1 shrink-0">
                {sets.map((set) => {
                  const done = isCompleted(set);
                  return (
                    <button
                      key={set.id}
                      onClick={() => onToggle(set)}
                      disabled={saving}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all"
                      style={{
                        borderColor: done ? "hsl(var(--primary))" : "hsl(var(--border))",
                        backgroundColor: done ? "hsl(var(--primary))" : "transparent",
                      }}
                    >
                      {done && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </button>
                  );
                })}
              </div>
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
  const allDone = sets.every((s) => isCompleted(s));

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-opacity"
      style={{ opacity: allDone ? 0.6 : 1 }}
    >
      <button
        onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
        className="shrink-0 overflow-hidden rounded-lg"
        style={{ width: 36, height: 28 }}
      >
        <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={36} height={28} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] font-medium text-foreground">{ex.name}</p>
      </div>
      {cueOverride && (
        <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
          {cueOverride}
        </span>
      )}
      {sets.map((set) => {
        const done = isCompleted(set);
        return (
          <button
            key={set.id}
            onClick={() => onToggle(set)}
            disabled={saving}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all shrink-0"
            style={{
              borderColor: done ? "hsl(var(--primary))" : "hsl(var(--border))",
              backgroundColor: done ? "hsl(var(--primary))" : "transparent",
            }}
          >
            {done && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
        );
      })}
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
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
          className="shrink-0 overflow-hidden rounded-lg"
          style={{ width: 64, height: 48 }}
        >
          <ExerciseThumbnail thumbnailUrl={ex.thumbnail_url} videoUrl={ex.video_url} name={ex.name} width={64} height={48} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[15px] font-semibold text-foreground">{ex.name}</p>
        </div>
        {allDone && (
          <button
            onClick={async () => { setCompleting(true); await onUncompleteAll(); setCompleting(false); }}
            disabled={saving || completing}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shrink-0"
          >
            <Check className="h-4 w-4 text-primary-foreground" />
          </button>
        )}
      </div>

      {cueOverride && (
        <p className="mt-3 font-body text-[14px] text-foreground leading-relaxed">
          {cueOverride}
        </p>
      )}

      {!allDone && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Velocidad, inclinación, observaciones..."
            className="mt-3 w-full rounded-xl bg-secondary p-3 text-sm text-foreground font-body placeholder:text-muted-foreground outline-none resize-none"
            rows={2}
          />
          <button
            onClick={handleDone}
            disabled={saving || completing}
            className="press-scale mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Completado
          </button>
        </>
      )}
    </div>
  );
}
