import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData, type WorkoutSetData, type ExerciseGroup, type SupersetGroup } from "@/hooks/useWorkoutData";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutOverview, { type WorkoutBlock } from "@/components/workout/WorkoutOverview";
import BlockDetail from "@/components/workout/BlockDetail";
import RestTimerSheet from "@/components/workout/RestTimerSheet";
import TimerBlockDetail from "@/components/workout/TimerBlockDetail";
import ExerciseVideoOverlay from "@/components/workout/ExerciseVideoOverlay";

/** Fixed block display order */
const BLOCK_ORDER = [
  'PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION',
  'POWER BLOCK', 'HEAVY BLOCK — A', 'HEAVY BLOCK — B', 'BUILD BLOCK — A', 'BUILD BLOCK — B',
  'ATHLETIC HINGE', 'ENGINE BLOCK', 'RECOVERY BLOCK',
];

/** Color mapping by block label */
const BLOCK_LABEL_COLORS: Record<string, string> = {
  'PRIME BLOCK': '#7A8B5C',
  'RESET & BREATHE': '#7A8B5C',
  'SPINE & HIPS': '#7A8B5C',
  'DYNAMIC FLOW': '#7A8B5C',
  'ATHLETIC INTEGRATION': '#7A8B5C',
  'POWER BLOCK': '#D45555',
  'HEAVY BLOCK — A': '#C75B39',
  'HEAVY BLOCK — B': '#C75B39',
  'BUILD BLOCK — A': '#C9A96E',
  'BUILD BLOCK — B': '#C9A96E',
  'ATHLETIC HINGE': '#D4896B',
  'ENGINE BLOCK': '#D45555',
  'RECOVERY BLOCK': '#7A8B5C',
};

function getBlockType(label: string): WorkoutBlock["type"] {
  if (['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'].includes(label)) return 'mobility';
  if (label === 'RECOVERY BLOCK') return 'cooldown';
  if (label.startsWith('BUILD BLOCK')) return 'sculpt';
  if (['ENGINE BLOCK'].includes(label)) return 'conditioning';
  return 'strength';
}

export default function Workout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    workout,
    sets,
    exerciseGroups,
    supersetGroups,
    cooldownGroups,
    loading,
    saving,
    weightUnit,
    allSetsCompleted,
    completeSet,
    finishWorkout,
    getSuggestedWeight,
    refetch,
  } = useWorkoutData(id);

  const {
    workoutActive,
    startWorkout,
    endWorkout,
  } = useApp();

  const [activeBlock, setActiveBlock] = useState<WorkoutBlock | null>(null);
  const [timerBlock, setTimerBlock] = useState<WorkoutBlock | null>(null);
  const [videoOverlay, setVideoOverlay] = useState<{ name: string; videoUrl: string | null; coachingCue: string | null } | null>(null);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState("");
  const [programTotalWeeks, setProgramTotalWeeks] = useState(6);

  // Fetch program total weeks
  useEffect(() => {
    if (!workout) return;
    supabase
      .from("programs")
      .select("total_weeks")
      .eq("id", workout.program_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProgramTotalWeeks(data.total_weeks);
      });
  }, [workout?.program_id]);

  // Start workout timer on mount
  useEffect(() => {
    if (!workoutActive && workout && !workout.is_completed) {
      startWorkout();
    }
  }, [workout, workoutActive, startWorkout]);

  // Build blocks from block_label grouping
  const blocks: WorkoutBlock[] = useMemo(() => {
    if (!sets.length) return [];

    const allSets = sets;

    // Group sets by block_label
    const blockMap = new Map<string, WorkoutSetData[]>();
    for (const s of allSets) {
      const label = s.block_label || 'GENERAL';
      if (!blockMap.has(label)) blockMap.set(label, []);
      blockMap.get(label)!.push(s);
    }

    // Sort block labels by BLOCK_ORDER
    const sortedLabels = [...blockMap.keys()].sort((a, b) => {
      const ia = BLOCK_ORDER.indexOf(a);
      const ib = BLOCK_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sortedLabels.map((label) => {
      const blockSets = blockMap.get(label)!;

      // Group by exercise within block, preserving set_order
      const groups: ExerciseGroup[] = [];
      const seen = new Map<string, ExerciseGroup>();
      for (const s of blockSets) {
        if (!s.exercise) continue;
        if (!seen.has(s.exercise_id)) {
          const group: ExerciseGroup = {
            exercise: s.exercise,
            sets: blockSets.filter((x) => x.exercise_id === s.exercise_id),
          };
          seen.set(s.exercise_id, group);
          groups.push(group);
        }
      }

      // Detect superset within this block
      const hasSuperset = groups.length >= 2 && blockSets.some((s) => s.set_type === 'superset');
      let formatBadge: string | null = null;
      let supersetGroup: SupersetGroup | undefined;

      if (hasSuperset) {
        formatBadge = groups.length >= 3 ? 'TRISERIE' : 'SUPERSET';
        supersetGroup = {
          type: groups.length >= 3 ? 'triset' : 'superset',
          label: formatBadge,
          groups,
        };
      }
      if (blockSets[0]?.set_type === 'emom') formatBadge = 'EMOM';
      if (blockSets[0]?.set_type === 'amrap') formatBadge = 'AMRAP';

      const type = getBlockType(label);
      const totalSets = blockSets.length;
      const completedSets = blockSets.filter((s) => s.is_completed).length;

      return {
        id: `block-${label}`,
        name: label,
        type,
        formatBadge,
        exerciseNames: groups.map((g) => g.exercise.name),
        totalSets,
        completedSets,
        estimatedMinutes: Math.max(1, Math.round(totalSets * 2.5)),
        groups,
        supersetGroup,
      };
    });
  }, [sets]);

  const totalSets = blocks.reduce((a, b) => a + b.totalSets, 0);
  const completedSets = blocks.reduce((a, b) => a + b.completedSets, 0);

  const handleCompleteSet = useCallback(
    async (set: WorkoutSetData, data: { actual_weight: number; actual_reps: number }) => {
      const result = await completeSet(set.id, {
        actual_weight: data.actual_weight,
        actual_reps: data.actual_reps,
        actual_rpe: null,
        actual_rir: null,
      });
      // Don't refetch - let optimistic UI handle it
      return result;
    },
    [completeSet]
  );

  const handleUncompleteSet = useCallback(
    async (setId: string) => {
      const { error } = await supabase
        .from("workout_sets")
        .update({ is_completed: false, actual_weight: null, actual_reps: null, actual_rpe: null, actual_rir: null, logged_at: null })
        .eq("id", setId);
      return !error;
    },
    []
  );

  const handleRestStart = useCallback((seconds: number) => {
    setRestTimerDuration(seconds);
    setRestTimerVisible(true);
  }, []);

  const handleCompleteTimerBlock = useCallback(async (block: WorkoutBlock, rounds: number) => {
    for (const group of block.groups) {
      for (const set of group.sets) {
        if (!set.is_completed) {
          await completeSet(set.id, { actual_weight: 0, actual_reps: rounds, actual_rpe: null, actual_rir: null });
        }
      }
    }
    await refetch();
  }, [completeSet, refetch]);

  const handleBlockSelect = useCallback((block: WorkoutBlock) => {
    const badge = block.formatBadge?.toUpperCase();
    if (badge === "EMOM" || badge === "AMRAP") {
      setTimerBlock(block);
    } else {
      setActiveBlock(block);
    }
  }, []);

  const handleFinish = async () => {
    const ok = await finishWorkout(finishNotes);
    if (ok) {
      endWorkout();
      navigate(`/workout-complete/${id}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background px-5 pt-14">
        <Skeleton className="h-6 w-48 bg-muted" />
        <Skeleton className="mt-4 h-4 w-32 bg-muted" />
        <Skeleton className="mt-8 h-32 w-full rounded-xl bg-muted" />
        <Skeleton className="mt-3 h-32 w-full rounded-xl bg-muted" />
        <Skeleton className="mt-3 h-32 w-full rounded-xl bg-muted" />
      </div>
    );
  }

  if (!workout || sets.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <p className="text-muted-foreground font-body">No se encontró este workout.</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-body font-medium">
          Volver al inicio
        </button>
      </div>
    );
  }

  // ─── LEVEL 2: Timer block ───
  if (timerBlock) {
    return (
      <>
        <TimerBlockDetail
          block={timerBlock}
          onBack={() => { setTimerBlock(null); refetch(); }}
          onCompleteBlock={(rounds) => handleCompleteTimerBlock(timerBlock, rounds)}
          onOpenVideo={(v) => setVideoOverlay(v)}
        />
        <ExerciseVideoOverlay
          videoUrl={videoOverlay?.videoUrl ?? null}
          exerciseName={videoOverlay?.name ?? ""}
          coachingCue={videoOverlay?.coachingCue ?? null}
          visible={!!videoOverlay}
          onClose={() => setVideoOverlay(null)}
        />
      </>
    );
  }

  // ─── LEVEL 2: Block detail ───
  if (activeBlock) {
    return (
      <>
        <BlockDetail
          block={activeBlock}
          weightUnit={weightUnit}
          saving={saving}
          onBack={() => {
            setActiveBlock(null);
            refetch();
          }}
          onCompleteSet={handleCompleteSet}
          onUncompleteSet={handleUncompleteSet}
          getSuggestedWeight={getSuggestedWeight}
          onRestStart={handleRestStart}
        />
        <RestTimerSheet
          durationSeconds={restTimerDuration}
          visible={restTimerVisible}
          onDismiss={() => setRestTimerVisible(false)}
        />
      </>
    );
  }

  // ─── LEVEL 1: Overview ───
  return (
    <>
      <WorkoutOverview
        workout={workout}
        blocks={blocks}
        totalSets={totalSets}
        completedSets={completedSets}
        programTotalWeeks={programTotalWeeks}
        onBack={() => navigate("/home")}
        onBlockSelect={handleBlockSelect}
        onFinish={() => {
          if (completedSets < totalSets) {
            setShowFinishModal(true);
          } else {
            handleFinish();
          }
        }}
        saving={saving}
      />

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setShowFinishModal(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-foreground">Finalizar sesión</h3>
            <textarea
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder="Notas de la sesión (opcional)..."
              className="mt-4 w-full rounded-xl bg-secondary p-4 text-sm text-foreground font-body placeholder:text-muted-foreground outline-none resize-none"
              rows={3}
            />
            <button
              onClick={handleFinish}
              disabled={saving}
              className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Finalizar workout
            </button>
          </div>
        </div>
      )}
    </>
  );
}
