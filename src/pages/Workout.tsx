import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData, type WorkoutSetData, type ExerciseGroup, type SupersetGroup } from "@/hooks/useWorkoutData";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutOverview, { type WorkoutBlock } from "@/components/workout/WorkoutOverview";
import BlockDetail from "@/components/workout/BlockDetail";
import RestTimerSheet from "@/components/workout/RestTimerSheet";
import TimerBlockDetail from "@/components/workout/TimerBlockDetail";
import ExerciseVideoOverlay from "@/components/workout/ExerciseVideoOverlay";
import { BLOCK_ORDER, BLOCK_LABEL_COLORS } from "@/constants/blocks";

function getBlockType(label: string): WorkoutBlock["type"] {
  if (['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'].includes(label)) return 'mobility';
  if (label === 'RECOVERY BLOCK') return 'cooldown';
  if (label.startsWith('BUILD BLOCK')) return 'sculpt';
  if (['ENGINE BLOCK'].includes(label)) return 'conditioning';
  return 'strength';
}

/** Check if a block needs weight logging (strength/sculpt types) */
function blockNeedsWeights(block: WorkoutBlock): boolean {
  return block.type === 'strength' || block.type === 'sculpt';
}

/** Get warnings for a block: unlogged sets and missing weights */
function getBlockWarnings(block: WorkoutBlock): { unloggedSets: number; missingWeights: number } {
  let unloggedSets = 0;
  let missingWeights = 0;
  for (const g of block.groups) {
    for (const s of g.sets) {
      if (!s.is_completed) unloggedSets++;
      else if (blockNeedsWeights(block) && (s.actual_weight == null || s.actual_weight === 0)) missingWeights++;
    }
  }
  return { unloggedSets, missingWeights };
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
  const [lastVisitedBlockId, setLastVisitedBlockId] = useState<string | null>(null);
  const [detailSoftGate, setDetailSoftGate] = useState<{ currentBlock: WorkoutBlock; nextBlock: WorkoutBlock } | null>(null);
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

    // Sort block labels by minimum set_order within each block
    // This respects admin-defined ordering (editable from program editor)
    const sortedLabels = [...blockMap.keys()].sort((a, b) => {
      const minA = Math.min(...blockMap.get(a)!.map((s) => s.set_order));
      const minB = Math.min(...blockMap.get(b)!.map((s) => s.set_order));
      return minA - minB;
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
    setLastVisitedBlockId(block.id);
    const badge = block.formatBadge?.toUpperCase();
    if (badge === "AMRAP") {
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
    const activeIdx = blocks.findIndex(b => b.id === activeBlock.id);
    const nextBlock = activeIdx >= 0 && activeIdx < blocks.length - 1 ? blocks[activeIdx + 1] : null;

    return (
      <>
        <BlockDetail
          block={activeBlock}
          weightUnit={weightUnit}
          saving={saving}
          workoutId={id}
          nextBlockName={nextBlock?.name ?? null}
          onBack={() => {
            setActiveBlock(null);
            refetch();
          }}
          onCompleteSet={handleCompleteSet}
          onUncompleteSet={handleUncompleteSet}
          getSuggestedWeight={getSuggestedWeight}
          onRestStart={handleRestStart}
          onSwapExercise={() => {
            setActiveBlock(null);
            refetch();
          }}
          onNextBlock={nextBlock ? async () => {
            // Query fresh set data from DB to avoid stale activeBlock issue
            if (blockNeedsWeights(activeBlock)) {
              const setIds = activeBlock.groups.flatMap(g => g.sets.map(s => s.id));
              const { data: freshSets } = await supabase
                .from("workout_sets")
                .select("id, is_completed, actual_weight")
                .in("id", setIds);
              if (freshSets) {
                const unlogged = freshSets.filter(s => !s.is_completed).length;
                const missingW = freshSets.filter(s => s.is_completed && (s.actual_weight == null || s.actual_weight === 0)).length;
                if (unlogged > 0 || missingW > 0) {
                  // Build a patched block for the dialog message
                  const patchedBlock = {
                    ...activeBlock,
                    groups: activeBlock.groups.map(g => ({
                      ...g,
                      sets: g.sets.map(s => {
                        const fresh = freshSets.find(f => f.id === s.id);
                        return fresh ? { ...s, is_completed: fresh.is_completed, actual_weight: fresh.actual_weight } : s;
                      }),
                    })),
                  };
                  setDetailSoftGate({ currentBlock: patchedBlock, nextBlock });
                  return;
                }
              }
            }
            setLastVisitedBlockId(nextBlock.id);
            refetch().then(() => {
              const badge = nextBlock.formatBadge?.toUpperCase();
              if (badge === "AMRAP") {
                setActiveBlock(null);
                setTimerBlock(nextBlock);
              } else {
                setActiveBlock(nextBlock);
              }
            });
          } : undefined}
          onFinishWorkout={!nextBlock ? () => {
            if (completedSets < totalSets) {
              setShowFinishModal(true);
            } else {
              handleFinish();
            }
          } : undefined}
        />
        <RestTimerSheet
          durationSeconds={restTimerDuration}
          visible={restTimerVisible}
          onDismiss={() => setRestTimerVisible(false)}
        />

        {/* Finish modal inside block detail */}
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

        {/* Soft gate dialog inside block detail */}
        {detailSoftGate && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setDetailSoftGate(null)}>
            <div className="w-full max-w-lg rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Bloque incompleto</h3>
              </div>
              <p className="font-body text-sm text-muted-foreground">
                {(() => {
                  const w = getBlockWarnings(detailSoftGate.currentBlock);
                  const parts: string[] = [];
                  if (w.unloggedSets > 0) parts.push(`${w.unloggedSets} sets sin completar`);
                  if (w.missingWeights > 0) parts.push(`${w.missingWeights} sets sin peso registrado`);
                  return `Tienes ${parts.join(" y ")}. Logear tus pesos ayuda a trackear tu progreso y sugerirte cargas futuras.`;
                })()}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setDetailSoftGate(null)}
                  className="flex-1 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground"
                >
                  Completar bloque
                </button>
                <button
                  onClick={() => {
                    const next = detailSoftGate.nextBlock;
                    setDetailSoftGate(null);
                    setLastVisitedBlockId(next.id);
                    refetch().then(() => {
                      const badge = next.formatBadge?.toUpperCase();
                      if (badge === "AMRAP") {
                        setActiveBlock(null);
                        setTimerBlock(next);
                      } else {
                        setActiveBlock(next);
                      }
                    });
                  }}
                  className="flex-1 rounded-xl bg-secondary py-3 font-body text-sm font-medium text-foreground"
                >
                  Continuar así
                </button>
              </div>
            </div>
          </div>
        )}
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
        scrollToBlockId={lastVisitedBlockId}
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
