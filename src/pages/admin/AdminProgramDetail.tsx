import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// DAY_NAMES not needed — workouts use custom day_label (e.g., "UPPER PULL", "HINGE DAY")
import { useProgramDraft } from "@/components/admin/program-detail/useProgramDraft";
import { deriveBlocks } from "@/components/admin/program-detail/types";
import type {
  DraftSet,
  DraftWorkout,
  ExerciseOption,
  SaveScope,
} from "@/components/admin/program-detail/types";
import { ProgramMetadataEditor } from "@/components/admin/program-detail/ProgramMetadataEditor";
import { DayCard } from "@/components/admin/program-detail/DayCard";
import { UnsavedChangesBanner } from "@/components/admin/program-detail/UnsavedChangesBanner";
import { SaveScopeModal } from "@/components/admin/program-detail/SaveScopeModal";
import { AddExerciseModal } from "@/components/admin/program-detail/AddExerciseModal";
import { ExerciseEditPanel } from "@/components/admin/program-detail/ExerciseEditPanel";
import { SwapExerciseModal } from "@/components/admin/program-detail/SwapExerciseModal";

/* ------------------------------------------------------------------ */
/*  Modal state types                                                  */
/* ------------------------------------------------------------------ */

interface AddExerciseTarget {
  workoutId: string;
  blockLabel: string;
}

interface EditTarget {
  set: DraftSet;
  blockLabel: string;
  workoutId: string;
}

interface SwapTarget {
  workoutId: string;
  blockLabel: string;
  exerciseId: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface MesocycleOption {
  id: string;
  cycle_number: number;
  status: string;
}

export default function AdminProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cycleParam = searchParams.get("cycle");

  /* ---- Mesocycle selector state ---- */
  const [mesocycles, setMesocycles] = useState<MesocycleOption[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(cycleParam);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("mesocycles")
        .select("id, cycle_number, status")
        .eq("template_program_id", id)
        .order("cycle_number", { ascending: true });
      if (data && data.length > 0) {
        setMesocycles(data);
        if (!cycleParam) {
          // Default: latest live, or latest overall
          const live = data.find((m) => m.status === "live");
          setActiveCycleId(live ? live.id : data[data.length - 1].id);
        }
      }
    })();
  }, [id, cycleParam]);

  const handleCycleChange = (mcId: string) => {
    setActiveCycleId(mcId);
    setSearchParams({ cycle: mcId });
  };

  /* ---- Draft hook ---- */
  const {
    program,
    workouts,
    sets,
    emptyBlocks,
    loading,
    saving,
    hasChanges,
    canUndo,
    updateProgram,
    updateWorkout,
    createWorkoutForDay,
    moveBlock,
    deleteBlock,
    insertBlock,
    renameBlock,
    addExerciseToBlock,
    updateSet,
    deleteExerciseFromBlock,
    swapExercise,
    moveExerciseBetweenBlocks,
    addSetToExercise,
    removeSetFromExercise,
    moveExerciseInBlock,
    save,
    discard,
    undo,
  } = useProgramDraft(id, activeCycleId);

  /* ---- Week tab ---- */
  const [activeWeek, setActiveWeek] = useState("1");
  const activeWeekNumber = parseInt(activeWeek, 10);

  /* ---- Expanded day view ---- */
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  /* ---- Modal state ---- */
  const [saveScopeOpen, setSaveScopeOpen] = useState(false);
  const [addExerciseTarget, setAddExerciseTarget] =
    useState<AddExerciseTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);

  /* ---- Derived data ---- */
  const weekNumbers = useMemo(
    () =>
      program
        ? Array.from({ length: program.total_weeks }, (_, i) => i + 1)
        : [],
    [program],
  );

  /** Workouts for the active week, sorted by scheduled_date */
  const weekWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.week_number === activeWeekNumber)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [workouts, activeWeekNumber],
  );

  /* ---- Derive the exercise group for ExerciseEditPanel ---- */
  const editExerciseGroup = useMemo(() => {
    if (!editTarget) return null;
    const blocks = deriveBlocks(sets, editTarget.workoutId);
    const block = blocks.find((b) => b.label === editTarget.blockLabel);
    if (!block) return null;
    const group = block.exerciseGroups.find(
      (g) => g.exerciseId === editTarget.set.exercise_id,
    );
    return group ?? null;
  }, [editTarget, sets]);

  /** Available block labels for the workout being edited (for move-to-block) */
  const editAvailableBlocks = useMemo(() => {
    if (!editTarget) return [];
    const blocks = deriveBlocks(sets, editTarget.workoutId);
    return blocks.map((b) => b.label);
  }, [editTarget, sets]);

  /** Find the exercise name for the swap modal */
  const swapCurrentName = useMemo(() => {
    if (!swapTarget) return "";
    const s = sets.find(
      (s) =>
        s.workout_id === swapTarget.workoutId &&
        s.block_label === swapTarget.blockLabel &&
        s.exercise_id === swapTarget.exerciseId,
    );
    return s?.exercise_name ?? s?.exercise_name_es ?? "";
  }, [swapTarget, sets]);

  /* ---- Callbacks ---- */

  const handleSaveBanner = useCallback(() => {
    setSaveScopeOpen(true);
  }, []);

  const handleSaveScope = useCallback(
    (scope: SaveScope) => {
      save(scope);
      setSaveScopeOpen(false);
    },
    [save],
  );

  const handleAddExerciseConfirm = useCallback(
    (
      exercise: ExerciseOption,
      params: {
        set_type: string;
        planned_reps: number | null;
        planned_rpe: number | null;
        planned_rir: number | null;
        planned_weight: number | null;
        planned_rest_seconds: number | null;
        planned_tempo: string | null;
        coaching_cue_override: string | null;
      },
      count: number,
    ) => {
      if (!addExerciseTarget) return;
      addExerciseToBlock(
        addExerciseTarget.workoutId,
        addExerciseTarget.blockLabel,
        exercise,
        params,
        count,
      );
      setAddExerciseTarget(null);
    },
    [addExerciseTarget, addExerciseToBlock],
  );

  const handleEditDelete = useCallback(() => {
    if (!editTarget) return;
    deleteExerciseFromBlock(
      editTarget.workoutId,
      editTarget.blockLabel,
      editTarget.set.exercise_id,
    );
    setEditTarget(null);
  }, [editTarget, deleteExerciseFromBlock]);

  const handleEditSwap = useCallback(() => {
    if (!editTarget) return;
    setSwapTarget({
      workoutId: editTarget.workoutId,
      blockLabel: editTarget.blockLabel,
      exerciseId: editTarget.set.exercise_id,
    });
  }, [editTarget]);

  const handleSwapConfirm = useCallback(
    (newExercise: ExerciseOption) => {
      if (!swapTarget) return;
      swapExercise(
        swapTarget.workoutId,
        swapTarget.blockLabel,
        swapTarget.exerciseId,
        newExercise,
      );
      setSwapTarget(null);
      setEditTarget(null);
    },
    [swapTarget, swapExercise],
  );

  const handleMoveToBlock = useCallback(
    (targetBlock: string) => {
      if (!editTarget) return;
      moveExerciseBetweenBlocks(
        editTarget.set.exercise_id,
        editTarget.workoutId,
        editTarget.blockLabel,
        targetBlock,
      );
      setEditTarget(null);
    },
    [editTarget, moveExerciseBetweenBlocks],
  );

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/programs")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span
            className="font-body text-lg animate-pulse"
            style={{ color: "#8A8A8E" }}
          >
            Cargando...
          </span>
        </div>
        {/* Skeleton bars */}
        <div
          className="h-14 rounded-lg animate-pulse"
          style={{ backgroundColor: "#1C1C1E" }}
        />
        <div
          className="h-10 rounded-lg animate-pulse w-1/2"
          style={{ backgroundColor: "#1C1C1E" }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg animate-pulse"
              style={{ backgroundColor: "#1C1C1E" }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="font-display text-lg" style={{ color: "#D45555" }}>
          Programa no encontrado
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/programs")}
          className="font-body"
          style={{ color: "#C75B39" }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a programas
        </Button>
      </div>
    );
  }

  /* ---- Main layout ---- */
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {/* Back button + title row */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/programs")}
          style={{ color: "#8A8A8E" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-display text-lg" style={{ color: "#FAF8F5" }}>
          {program.name}
        </h1>
        <span className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
          {program.total_weeks} semanas
          {program.user_id ? "" : " · TEMPLATE"}
        </span>
      </div>

      {/* Program metadata editor */}
      <ProgramMetadataEditor program={program} onUpdate={updateProgram} activeCycleId={activeCycleId} />

      {/* Cycle selector tabs */}
      {mesocycles.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider mr-1" style={{ color: "#5A5A5A" }}>
            Ciclo
          </span>
          {mesocycles.map((mc) => {
            const isActive = mc.id === activeCycleId;
            const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
              live: { bg: "rgba(122,139,92,0.15)", color: "#7A8B5C", label: "LIVE" },
              draft: { bg: "rgba(201,169,110,0.15)", color: "#C9A96E", label: "DRAFT" },
              completed: { bg: "rgba(138,138,142,0.15)", color: "#8A8A8E", label: "DONE" },
            };
            const st = statusConfig[mc.status] || statusConfig.draft;
            return (
              <button
                key={mc.id}
                onClick={() => handleCycleChange(mc.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-colors"
                style={{
                  backgroundColor: isActive ? "#2A2A2A" : "transparent",
                  color: isActive ? "#FAF8F5" : "#8A8A8E",
                  border: `1px solid ${isActive ? "#3A3A3A" : "transparent"}`,
                }}
              >
                Ciclo {mc.cycle_number}
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                  style={{ background: st.bg, color: st.color }}
                >
                  <Circle className="h-1 w-1 fill-current" /> {st.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Week tabs */}
      <Tabs value={activeWeek} onValueChange={setActiveWeek}>
        <TabsList
          className="flex-wrap"
          style={{ backgroundColor: "#1C1C1E", border: "1px solid #2A2A2A" }}
        >
          {weekNumbers.map((w) => (
            <TabsTrigger
              key={w}
              value={String(w)}
              className="font-mono text-xs px-3 py-1.5"
              style={{
                color: activeWeek === String(w) ? "#FAF8F5" : "#8A8A8E",
              }}
            >
              S{w}
            </TabsTrigger>
          ))}
        </TabsList>

        {weekNumbers.map((week) => {
          const ww =
            week === activeWeekNumber
              ? weekWorkouts
              : workouts
                  .filter((w) => w.week_number === week)
                  .sort((a, b) =>
                    a.scheduled_date.localeCompare(b.scheduled_date),
                  );

          return (
            <TabsContent key={week} value={String(week)} className="mt-4">
              {/* Day switcher bar when expanded */}
              {expandedWorkoutId && ww.length > 1 && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {ww.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setExpandedWorkoutId(w.id)}
                      className="px-3 py-1.5 rounded-lg font-mono text-xs transition-colors"
                      style={{
                        backgroundColor: w.id === expandedWorkoutId ? "#2A2A2A" : "transparent",
                        color: w.id === expandedWorkoutId ? "#FAF8F5" : "#8A8A8E",
                        border: `1px solid ${w.id === expandedWorkoutId ? "#3A3A3A" : "transparent"}`,
                      }}
                    >
                      {w.day_label}
                    </button>
                  ))}
                  <button
                    onClick={() => setExpandedWorkoutId(null)}
                    className="ml-auto px-3 py-1.5 rounded-lg font-mono text-xs"
                    style={{ color: "#C75B39" }}
                  >
                    Ver todos
                  </button>
                </div>
              )}

              <div className={
                expandedWorkoutId
                  ? "grid grid-cols-1 gap-4"
                  : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
              }>
                {ww
                  .filter((w) => !expandedWorkoutId || w.id === expandedWorkoutId)
                  .map((workout) => {
                  const isThisExpanded = expandedWorkoutId === workout.id;
                  const blocks =
                    week === activeWeekNumber
                      ? deriveBlocks(sets, workout.id)
                      : [];

                  return (
                    <DayCard
                      key={workout.id}
                      workout={workout}
                      dayLabel={workout.day_label}
                      blocks={blocks}
                      isExpanded={isThisExpanded}
                      onToggleExpand={() =>
                        setExpandedWorkoutId(isThisExpanded ? null : workout.id)
                      }
                      onCreateDay={() => {}}
                      onUpdateWorkout={(fields) =>
                        updateWorkout(workout.id, fields)
                      }
                      onMoveBlock={(blockLabel, direction) =>
                        moveBlock(workout.id, blockLabel, direction)
                      }
                      onDeleteBlock={(blockLabel) =>
                        deleteBlock(workout.id, blockLabel)
                      }
                      onInsertBlock={(newBlockLabel, afterBlockLabel) =>
                        insertBlock(
                          workout.id,
                          newBlockLabel,
                          afterBlockLabel,
                        )
                      }
                      onRenameBlock={(oldLabel, newLabel) =>
                        renameBlock(workout.id, oldLabel, newLabel)
                      }
                      onAddExercise={(blockLabel) =>
                        setAddExerciseTarget({
                          workoutId: workout.id,
                          blockLabel,
                        })
                      }
                      onEditExercise={(set) =>
                        setEditTarget({
                          set,
                          blockLabel: set.block_label,
                          workoutId: workout.id,
                        })
                      }
                      onDeleteExercise={(blockLabel, exerciseId) =>
                        deleteExerciseFromBlock(
                          workout.id,
                          blockLabel,
                          exerciseId,
                        )
                      }
                      onMoveExercise={(blockLabel, exerciseId, direction) =>
                        moveExerciseInBlock(workout.id, blockLabel, exerciseId, direction)
                      }
                      onSwapExercise={(blockLabel, oldExerciseId) =>
                        setSwapTarget({
                          workoutId: workout.id,
                          blockLabel,
                          exerciseId: oldExerciseId,
                        })
                      }
                      emptyBlocks={emptyBlocks[workout.id] ?? []}
                    />
                  );
                })}
                {ww.length === 0 && (
                  <div
                    className="col-span-full flex items-center justify-center py-12 rounded-xl"
                    style={{
                      background: "#1C1C1E",
                      border: "1px dashed #3A3A3A",
                    }}
                  >
                    <p
                      className="font-body text-sm"
                      style={{ color: "#8A8A8E" }}
                    >
                      No hay workouts para esta semana
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* ---- Modals ---- */}

      {/* Save scope modal */}
      <SaveScopeModal
        open={saveScopeOpen}
        onClose={() => setSaveScopeOpen(false)}
        currentWeek={activeWeekNumber}
        totalWeeks={program.total_weeks}
        onSave={handleSaveScope}
        saving={saving}
      />

      {/* Add exercise modal */}
      <AddExerciseModal
        open={addExerciseTarget !== null}
        onClose={() => setAddExerciseTarget(null)}
        blockLabel={addExerciseTarget?.blockLabel ?? ""}
        onAdd={handleAddExerciseConfirm}
      />

      {/* Exercise edit panel */}
      <ExerciseEditPanel
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        exerciseGroup={editExerciseGroup}
        blockLabel={editTarget?.blockLabel ?? ""}
        workoutId={editTarget?.workoutId ?? ""}
        availableBlocks={editAvailableBlocks}
        onUpdateSets={(setId, fields) => updateSet(setId, fields)}
        onAddSet={() => {
          if (editTarget) addSetToExercise(editTarget.workoutId, editTarget.blockLabel, editTarget.set.exercise_id);
        }}
        onRemoveSet={() => {
          if (editTarget) removeSetFromExercise(editTarget.workoutId, editTarget.blockLabel, editTarget.set.exercise_id);
        }}
        onDeleteExercise={handleEditDelete}
        onSwapExercise={handleEditSwap}
        onMoveToBlock={handleMoveToBlock}
      />

      {/* Swap exercise modal */}
      <SwapExerciseModal
        open={swapTarget !== null}
        onClose={() => setSwapTarget(null)}
        currentExerciseName={swapCurrentName}
        onSwap={handleSwapConfirm}
      />

      {/* Unsaved changes banner (fixed at bottom) */}
      <UnsavedChangesBanner
        hasChanges={hasChanges}
        canUndo={canUndo}
        onSave={handleSaveBanner}
        onDiscard={discard}
        onUndo={undo}
        saving={saving}
      />
    </div>
  );
}
