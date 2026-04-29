import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData, type WorkoutSetData, type ExerciseGroup, type SupersetGroup } from "@/hooks/useWorkoutData";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isVipJoiner } from "@/lib/vip-emails";
import { Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WorkoutOverview, { type WorkoutBlock } from "@/components/workout/WorkoutOverview";
import BlockDetail from "@/components/workout/BlockDetail";
import RestTimerSheet from "@/components/workout/RestTimerSheet";
import TimerBlockDetail from "@/components/workout/TimerBlockDetail";
import ForTimeTimerBlock from "@/components/workout/ForTimeTimerBlock";
import DeathByTimerBlock from "@/components/workout/DeathByTimerBlock";
import ExerciseVideoOverlay from "@/components/workout/ExerciseVideoOverlay";
import BadgeQualificationToast from "@/components/workout/BadgeQualificationToast";
import MesocycleWelcomeCard from "@/components/workout/MesocycleWelcomeCard";
import { useBadgeDetection, type BadgeMatch } from "@/hooks/useBadgeDetection";
import { BLOCK_ORDER, BLOCK_LABEL_COLORS } from "@/constants/blocks";
import { unlockAudio } from "@/lib/audio";
import { M2_INTRO_CONTENT, welcomeCardSeenKey } from "@/lib/mesocycle-content";

// ─── Rest timer persistence ───
// Survives app backgrounding AND full page reloads (iOS memory eviction).
const REST_TIMER_STORAGE_KEY = "liftory-rest-timer";
type StoredRestTimer = { workoutId: string; endTime: number; duration: number };

function loadStoredRestTimer(workoutId: string): StoredRestTimer | null {
  try {
    const raw = localStorage.getItem(REST_TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredRestTimer = JSON.parse(raw);
    if (parsed.workoutId !== workoutId) return null;
    if (parsed.endTime <= Date.now()) {
      localStorage.removeItem(REST_TIMER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredRestTimer(t: StoredRestTimer): void {
  try { localStorage.setItem(REST_TIMER_STORAGE_KEY, JSON.stringify(t)); } catch {}
}

function clearStoredRestTimer(): void {
  try { localStorage.removeItem(REST_TIMER_STORAGE_KEY); } catch {}
}

function getBlockType(label: string): WorkoutBlock["type"] {
  if (['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'].includes(label)) return 'mobility';
  if (label === 'RECOVERY BLOCK') return 'cooldown';
  if (label.startsWith('BUILD BLOCK')) return 'sculpt';
  if (['ENGINE BLOCK'].includes(label)) return 'conditioning';
  return 'strength';
}

/** Check if a block is EMOM-based (time-driven, weight logged globally/per-round, not per set) */
function isEmomBlock(block: WorkoutBlock): boolean {
  return block.groups.some(g => g.sets.some(s => s.set_type === 'emom'));
}

/** Check if a block needs weight logging (strength/sculpt types).
 *  EMOM blocks are excluded because weight is logged via a global "peso de la barra"
 *  control that only persists on the primary exercise's sets (complex mode).
 *  ATHLETIC INTEGRATION is dual-purpose: warmup flow (no weights) vs sub-maximal
 *  strength like Pause Box Squat (with weights) — detected via set_type='working'. */
function blockNeedsWeights(block: WorkoutBlock): boolean {
  if (isEmomBlock(block)) return false;
  if (block.name === 'ATHLETIC INTEGRATION') {
    return block.groups.some(g => g.sets.some(s => s.set_type === 'working'));
  }
  return block.type === 'strength' || block.type === 'sculpt';
}

/** Get warnings for a block: unlogged sets and missing weights */
function getBlockWarnings(block: WorkoutBlock): { unloggedSets: number; missingWeights: number } {
  let unloggedSets = 0;
  let missingWeights = 0;
  for (const g of block.groups) {
    for (const s of g.sets) {
      if (!s.is_completed) unloggedSets++;
      else if (
        blockNeedsWeights(block) &&
        // Timed sets (planks, holds) legitimately have actual_weight=0 — skip check
        (s.planned_duration_seconds ?? 0) === 0 &&
        (s.actual_weight == null || s.actual_weight === 0)
      ) {
        missingWeights++;
      }
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
    updateSetField,
    finishWorkout,
    getSuggestedWeight,
    exerciseE1RM,
    exerciseDeltas,
    refetch,
  } = useWorkoutData(id);

  const {
    workoutActive,
    startWorkout,
    endWorkout,
  } = useApp();

  const [activeBlock, setActiveBlock] = useState<WorkoutBlock | null>(null);
  const [timerBlock, setTimerBlock] = useState<WorkoutBlock | null>(null);
  const [forTimeBlock, setForTimeBlock] = useState<WorkoutBlock | null>(null);
  const [deathByBlock, setDeathByBlock] = useState<WorkoutBlock | null>(null);
  const [lastVisitedBlockId, setLastVisitedBlockId] = useState<string | null>(null);
  const [detailSoftGate, setDetailSoftGate] = useState<{ currentBlock: WorkoutBlock; nextBlock: WorkoutBlock } | null>(null);
  const [videoOverlay, setVideoOverlay] = useState<{ name: string; videoUrl: string | null; coachingCue: string | null } | null>(null);
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(90);
  const [restTimerEndTime, setRestTimerEndTime] = useState<number | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishNotes, setFinishNotes] = useState("");
  const [programTotalWeeks, setProgramTotalWeeks] = useState(6);
  const [badgeMatch, setBadgeMatch] = useState<BadgeMatch | null>(null);
  const [showM2Welcome, setShowM2Welcome] = useState(false);
  const { checkForBadge, checkBlockForBadges } = useBadgeDetection();
  const { user } = useAuth();

  // ─── Mesocycle Welcome Card trigger ───
  // Show first time user opens an M2 workout (per-user, persisted via localStorage).
  // Detection: workout's coach_note mentions "M2" OR scheduled_date in M2 range (Apr 27 - Jun 7 2026).
  useEffect(() => {
    if (!workout) return;
    const userId = workout.user_id;
    if (!userId) return; // template workouts have user_id=null — no card

    const isM2 =
      (workout.coach_note?.includes("M2") ?? false) ||
      (workout.scheduled_date >= "2026-04-27" && workout.scheduled_date <= "2026-06-07");
    if (!isM2) return;

    try {
      const seenKey = welcomeCardSeenKey(userId, "M2");
      // VIP joiners already saw their dedicated welcome card — don't double-onboard them.
      if (isVipJoiner(user?.email)) {
        localStorage.setItem(seenKey, new Date().toISOString());
        return;
      }
      const seen = localStorage.getItem(seenKey);
      if (!seen) setShowM2Welcome(true);
    } catch { /* localStorage unavailable — skip silently */ }
  }, [workout?.id, user?.email]);

  const handleM2WelcomeDismiss = useCallback(() => {
    try {
      const userId = workout?.user_id;
      if (userId) {
        localStorage.setItem(welcomeCardSeenKey(userId, "M2"), new Date().toISOString());
      }
    } catch { /* noop */ }
    setShowM2Welcome(false);
  }, [workout?.user_id]);

  // ─── FIX 1: Refetch from DB when user returns from another app ───
  useEffect(() => {
    let lastHidden = 0;
    const handler = () => {
      if (document.visibilityState === "hidden") {
        lastHidden = Date.now();
      }
      if (document.visibilityState === "visible" && lastHidden > 0) {
        const elapsed = Date.now() - lastHidden;
        // Only refetch if user was away for at least 3 seconds (real app switch, not tab flicker)
        if (elapsed > 3000) {
          refetch()
            .then(() => {
              // After refetch, blocks will recompute via useMemo.
              // We need to update activeBlock/timerBlock with fresh data.
              // We use refs because this closure would capture stale state.
              // The blocks update happens on next render — we use a microtask to read fresh blocks.
              // This is handled automatically since blocks is derived from sets.
            })
            .catch(() => {});
        }
        lastHidden = 0;
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refetch]);

  // ─── FIX 2: Sync activeBlock/timerBlock with fresh blocks after refetch ───
  // Uses a stable data key to avoid infinite loop (only updates when set data actually changes)
  const blocksDataKey = useMemo(
    () => sets.map((s) => `${s.id}:${s.is_completed}:${s.actual_weight}:${s.actual_reps}`).join(","),
    [sets]
  );

  useEffect(() => {
    if (activeBlock) {
      const fresh = blocks.find((b) => b.id === activeBlock.id);
      if (fresh && fresh !== activeBlock) setActiveBlock(fresh);
    }
    if (forTimeBlock) {
      const fresh = blocks.find((b) => b.id === forTimeBlock.id);
      if (fresh && fresh !== forTimeBlock) setForTimeBlock(fresh);
    }
    if (deathByBlock) {
      const fresh = blocks.find((b) => b.id === deathByBlock.id);
      if (fresh && fresh !== deathByBlock) setDeathByBlock(fresh);
    }
    if (timerBlock) {
      const fresh = blocks.find((b) => b.id === timerBlock.id);
      if (fresh && fresh !== timerBlock) setTimerBlock(fresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksDataKey]);

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
        estimatedMinutes: (() => {
          if (blockSets[0]?.set_type === 'emom') {
            const cue = blockSets[0]?.coaching_cue_override || '';
            const newFmt = cue.match(/EMOM\s+(\d+)s?\s*\|\s*(\d+)R\s*x\s*(\d+)V/i);
            if (newFmt) {
              return Math.ceil((parseInt(newFmt[1]) * parseInt(newFmt[2]) * parseInt(newFmt[3])) / 60);
            }
            const legacyFmt = cue.match(/EMOM\s+(\d+)s?\s*x\s*(\d+)/i);
            if (legacyFmt) {
              return Math.ceil((parseInt(legacyFmt[1]) * parseInt(legacyFmt[2])) / 60);
            }
          }
          return Math.max(1, Math.round(totalSets * 2.5));
        })(),
        groups,
        supersetGroup,
      };
    });
  }, [sets]);

  const totalSets = blocks.reduce((a, b) => a + b.totalSets, 0);
  const completedSets = blocks.reduce((a, b) => a + b.completedSets, 0);

  const handleCompleteSet = useCallback(
    async (set: WorkoutSetData, data: { actual_weight: number; actual_reps: number }) => {
      // Unlock audio on first complete-set tap (iOS user-gesture requirement).
      // Idempotent — safe to call on every tap.
      unlockAudio();
      const result = await completeSet(set.id, {
        actual_weight: data.actual_weight,
        actual_reps: data.actual_reps,
        actual_rpe: null,
        actual_rir: null,
      });
      // Don't refetch - let optimistic UI handle it

      // Check badge qualification (fire-and-forget, doesn't block UI)
      if (result && set.exercise) {
        checkForBadge(set.exercise.name, data.actual_weight, data.actual_reps).then((match) => {
          if (match) setBadgeMatch(match);
        });
      }

      return result;
    },
    [completeSet, checkForBadge]
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
    // Unlock audio on this synchronous user-gesture path so countdown beeps work on iOS
    unlockAudio();
    // Parent OWNS the endTime from the very first render so any remount
    // (e.g. refetch-triggered loading=true after user returns from background)
    // resumes the same timer instead of starting a fresh one.
    const endTime = Date.now() + seconds * 1000;
    setRestTimerDuration(seconds);
    setRestTimerEndTime(endTime);
    setRestTimerVisible(true);
    if (id) saveStoredRestTimer({ workoutId: id, endTime, duration: seconds });
  }, [id]);

  // Called by RestTimerSheet when the timer is (re)started or extended (+15s)
  // so the parent + localStorage stay in sync with the absolute end time.
  const handleRestTimerStart = useCallback((endTime: number) => {
    setRestTimerEndTime(endTime);
    if (!id) return;
    saveStoredRestTimer({ workoutId: id, endTime, duration: restTimerDuration });
  }, [id, restTimerDuration]);

  const handleRestTimerDismiss = useCallback(() => {
    setRestTimerVisible(false);
    setRestTimerEndTime(null);
    clearStoredRestTimer();
  }, []);

  // ─── Restore rest timer after page reload (iOS memory eviction) ───
  useEffect(() => {
    if (!id) return;
    const stored = loadStoredRestTimer(id);
    if (stored) {
      const remainingMs = stored.endTime - Date.now();
      const remainingSecs = Math.max(1, Math.ceil(remainingMs / 1000));
      setRestTimerDuration(remainingSecs);
      setRestTimerEndTime(stored.endTime);
      setRestTimerVisible(true);
    }
  }, [id]);

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
    // Detect metcon formats by coaching_cue prefix — must come BEFORE AMRAP check
    const firstCue = (block.groups[0]?.sets[0]?.coaching_cue_override ?? "").toUpperCase();
    if (firstCue.startsWith("DEATH BY") || firstCue.includes("DEATH BY:")) {
      setDeathByBlock(block);
    } else if (firstCue.startsWith("FOR TIME") || firstCue.includes("FOR TIME:")) {
      setForTimeBlock(block);
    } else if (badge === "AMRAP") {
      setTimerBlock(block);
    } else {
      setActiveBlock(block);
    }

    // Proactive badge detection: only for blocks that could have badges (strength/sculpt)
    const blockType = getBlockType(block.name);
    if (blockType === 'strength' || blockType === 'sculpt') {
      checkBlockForBadges(block.groups, exerciseE1RM).then((match) => {
        if (match) setBadgeMatch(match);
      });
    }
  }, [checkBlockForBadges, exerciseE1RM]);

  const handleFinish = async () => {
    const ok = await finishWorkout(finishNotes);
    if (ok) {
      endWorkout();
      navigate(`/workout-complete/${id}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background px-5 pt-14">
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
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5">
        <p className="text-muted-foreground font-body">No se encontró este workout.</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-primary font-body font-medium">
          Volver al inicio
        </button>
      </div>
    );
  }

  // ─── LEVEL 2: For Time block (metcons For Time) ───
  if (forTimeBlock) {
    return (
      <>
        <ForTimeTimerBlock
          block={forTimeBlock}
          onBack={() => { setForTimeBlock(null); refetch(); }}
          onCompleteBlock={(elapsedSec) => handleCompleteTimerBlock(forTimeBlock, elapsedSec)}
          onOpenVideo={(v) => setVideoOverlay(v)}
        />
        <ExerciseVideoOverlay
          videoUrl={videoOverlay?.videoUrl ?? null}
          exerciseName={videoOverlay?.name ?? ""}
          coachingCue={videoOverlay?.coachingCue ?? null}
          visible={!!videoOverlay}
          onClose={() => setVideoOverlay(null)}
        />
        <BadgeQualificationToast match={badgeMatch} onDismiss={() => setBadgeMatch(null)} />
      </>
    );
  }

  // ─── LEVEL 2: Death By block (metcon EMOM progresivo) ───
  if (deathByBlock) {
    return (
      <>
        <DeathByTimerBlock
          block={deathByBlock}
          onBack={() => { setDeathByBlock(null); refetch(); }}
          onCompleteBlock={(minutes) => handleCompleteTimerBlock(deathByBlock, minutes)}
          onOpenVideo={(v) => setVideoOverlay(v)}
        />
        <ExerciseVideoOverlay
          videoUrl={videoOverlay?.videoUrl ?? null}
          exerciseName={videoOverlay?.name ?? ""}
          coachingCue={videoOverlay?.coachingCue ?? null}
          visible={!!videoOverlay}
          onClose={() => setVideoOverlay(null)}
        />
        <BadgeQualificationToast match={badgeMatch} onDismiss={() => setBadgeMatch(null)} />
      </>
    );
  }

  // ─── LEVEL 2: Timer block (AMRAP) ───
  if (timerBlock) {
    const timerIdx = blocks.findIndex(b => b.id === timerBlock.id);
    const timerNextBlock = timerIdx >= 0 && timerIdx < blocks.length - 1 ? blocks[timerIdx + 1] : null;
    return (
      <>
        <TimerBlockDetail
          block={timerBlock}
          onBack={() => { setTimerBlock(null); refetch(); }}
          onCompleteBlock={(rounds) => handleCompleteTimerBlock(timerBlock, rounds)}
          onOpenVideo={(v) => setVideoOverlay(v)}
          nextBlockName={timerNextBlock?.name ?? null}
          onNextBlock={timerNextBlock ? () => {
            setLastVisitedBlockId(timerNextBlock.id);
            refetch().then(() => {
              setTimerBlock(null);
              // Use handleBlockSelect to properly route to the correct timer/detail view
              handleBlockSelect(timerNextBlock);
            });
          } : undefined}
        />
        <ExerciseVideoOverlay
          videoUrl={videoOverlay?.videoUrl ?? null}
          exerciseName={videoOverlay?.name ?? ""}
          coachingCue={videoOverlay?.coachingCue ?? null}
          visible={!!videoOverlay}
          onClose={() => setVideoOverlay(null)}
        />
        <BadgeQualificationToast match={badgeMatch} onDismiss={() => setBadgeMatch(null)} />
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
          exerciseDeltas={exerciseDeltas}
          onBack={() => {
            setActiveBlock(null);
            refetch();
          }}
          onCompleteSet={handleCompleteSet}
          onUncompleteSet={handleUncompleteSet}
          onUpdateSetField={updateSetField}
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
                .select("id, is_completed, actual_weight, planned_duration_seconds")
                .in("id", setIds);
              if (freshSets) {
                const unlogged = freshSets.filter(s => !s.is_completed).length;
                const missingW = freshSets.filter(s =>
                  s.is_completed &&
                  // Timed sets (planks, holds) legitimately have actual_weight=0 — skip check
                  (s.planned_duration_seconds ?? 0) === 0 &&
                  (s.actual_weight == null || s.actual_weight === 0)
                ).length;
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
              const nextCue = (nextBlock.groups[0]?.sets[0]?.coaching_cue_override ?? "").toUpperCase();
              setActiveBlock(null);
              if (nextCue.startsWith("DEATH BY") || nextCue.includes("DEATH BY:")) {
                setDeathByBlock(nextBlock);
              } else if (nextCue.startsWith("FOR TIME") || nextCue.includes("FOR TIME:")) {
                setForTimeBlock(nextBlock);
              } else if (badge === "AMRAP") {
                setTimerBlock(nextBlock);
              } else {
                setActiveBlock(nextBlock);
              }
              // Proactive badge detection for next block
              checkBlockForBadges(nextBlock.groups, exerciseE1RM).then((match) => {
                if (match) setBadgeMatch(match);
              });
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
          initialEndTime={restTimerEndTime}
          onTimerStart={handleRestTimerStart}
          onDismiss={handleRestTimerDismiss}
        />
        <BadgeQualificationToast match={badgeMatch} onDismiss={() => setBadgeMatch(null)} />

        {/* Finish modal inside block detail */}
        {showFinishModal && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setShowFinishModal(false)}>
            <div className="w-full max-w-lg rounded-t-2xl p-6" style={{ background: "#2A2A2E", borderTop: "2px solid hsl(43,50%,54%)" }} onClick={(e) => e.stopPropagation()}>
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
            <div className="w-full max-w-lg rounded-t-2xl p-6" style={{ background: "#2A2A2E", borderTop: "2px solid hsl(43,50%,54%)" }} onClick={(e) => e.stopPropagation()}>
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
                      const nextCue = (next.groups[0]?.sets[0]?.coaching_cue_override ?? "").toUpperCase();
                      setActiveBlock(null);
                      if (nextCue.startsWith("DEATH BY") || nextCue.includes("DEATH BY:")) {
                        setDeathByBlock(next);
                      } else if (nextCue.startsWith("FOR TIME") || nextCue.includes("FOR TIME:")) {
                        setForTimeBlock(next);
                      } else if (badge === "AMRAP") {
                        setTimerBlock(next);
                      } else {
                        setActiveBlock(next);
                      }
                      // Proactive badge detection for next block
                      checkBlockForBadges(next.groups, exerciseE1RM).then((m) => {
                        if (m) setBadgeMatch(m);
                      });
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
      {/* Mesocycle Welcome Card — shown once per user per mesocycle */}
      {showM2Welcome && (
        <MesocycleWelcomeCard
          content={M2_INTRO_CONTENT}
          onContinue={handleM2WelcomeDismiss}
          onSkip={handleM2WelcomeDismiss}
        />
      )}

      <WorkoutOverview
        workout={workout}
        blocks={blocks}
        totalSets={totalSets}
        completedSets={completedSets}
        programTotalWeeks={programTotalWeeks}
        scrollToBlockId={lastVisitedBlockId}
        exerciseDeltas={exerciseDeltas}
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

      {/* Rest timer at overview level (survives page reload) */}
      <RestTimerSheet
        durationSeconds={restTimerDuration}
        visible={restTimerVisible}
        initialEndTime={restTimerEndTime}
        onTimerStart={handleRestTimerStart}
        onDismiss={handleRestTimerDismiss}
      />

      {/* Finish modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setShowFinishModal(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-6" style={{ background: "#2A2A2E", borderTop: "2px solid hsl(43,50%,54%)" }} onClick={(e) => e.stopPropagation()}>
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
