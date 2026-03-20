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

export default function Workout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    workout,
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

  // Build blocks from supersetGroups + cooldownGroups
  const blocks: WorkoutBlock[] = useMemo(() => {
    if (!exerciseGroups.length) return [];

    const result: WorkoutBlock[] = [];
    let blockIndex = 0;

    for (const sg of supersetGroups) {
      blockIndex++;
      const allSets = sg.groups.flatMap((g) => g.sets);
      const firstSetType = sg.groups[0]?.sets[0]?.set_type || "working";

      // Determine block type
      let type: WorkoutBlock["type"] = "strength";
      if (firstSetType === "cooldown") type = "cooldown";
      else if (firstSetType === "warmup" || firstSetType === "cardio") type = "mobility";
      else if (sg.type === "superset" || sg.type === "triset") type = "sculpt";
      else if (firstSetType === "emom" || firstSetType === "amrap") type = "conditioning";

      // Determine format badge
      let formatBadge: string | null = null;
      if (sg.type === "superset") formatBadge = "SUPERSET";
      else if (sg.type === "triset") formatBadge = "TRISERIE";
      if (firstSetType === "emom") formatBadge = "EMOM";
      if (firstSetType === "amrap") formatBadge = "AMRAP";

      // Determine block name from day_label structure or exercise type
      const blockLetter = String.fromCharCode(64 + blockIndex);
      let blockName = "";
      if (type === "mobility") blockName = "MOVILIDAD";
      else if (type === "conditioning") blockName = `CONDITIONING`;
      else if (type === "sculpt") blockName = `SCULPT BLOQUE ${blockLetter}`;
      else blockName = `FUERZA BLOQUE ${blockLetter}`;

      const totalSets = allSets.length;
      const completedSets = allSets.filter((s) => s.is_completed).length;
      const estMin = Math.max(1, Math.round((totalSets * 2.5) / 1)); // rough estimate

      result.push({
        id: `block-${blockIndex}`,
        name: blockName,
        type,
        formatBadge,
        exerciseNames: sg.groups.map((g) => g.exercise.name),
        totalSets,
        completedSets,
        estimatedMinutes: estMin,
        groups: sg.groups,
        supersetGroup: sg.type !== "single" ? sg : undefined,
      });
    }

    // Add cooldown as a block
    if (cooldownGroups.length > 0) {
      const allSets = cooldownGroups.flatMap((g) => g.sets);
      result.push({
        id: "block-cooldown",
        name: "COOL-DOWN",
        type: "cooldown",
        formatBadge: null,
        exerciseNames: cooldownGroups.map((g) => g.exercise.name),
        totalSets: allSets.length,
        completedSets: allSets.filter((s) => s.is_completed).length,
        estimatedMinutes: Math.round(cooldownGroups.length * 1.5),
        groups: cooldownGroups,
      });
    }

    return result;
  }, [exerciseGroups, supersetGroups, cooldownGroups]);

  const totalSets = blocks.reduce((a, b) => a + b.totalSets, 0);
  const completedSets = blocks.reduce((a, b) => a + b.completedSets, 0);

  const handleCompleteSet = useCallback(
    async (set: WorkoutSetData, data: { actual_weight: number; actual_reps: number }) => {
      const result = await completeSet(set.id, {
        actual_weight: data.actual_weight,
        actual_reps: data.actual_reps,
        actual_rpe: 0,
        actual_rir: 0,
      });
      // Refresh blocks after completion
      if (result) {
        await refetch();
      }
      return result;
    },
    [completeSet, refetch]
  );

  const handleRestStart = useCallback((seconds: number) => {
    setRestTimerDuration(seconds);
    setRestTimerVisible(true);
  }, []);

  // Handler to complete all sets in a timer block
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

  // Route block selection: EMOM/AMRAP → timer, else → detail
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

  if (!workout || exerciseGroups.length === 0) {
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
