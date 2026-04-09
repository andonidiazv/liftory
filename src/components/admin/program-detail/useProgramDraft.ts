import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  DraftProgram,
  DraftWorkout,
  DraftSet,
  ExerciseOption,
  SaveScope,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Draft snapshot — the entire state we track                        */
/* ------------------------------------------------------------------ */

/** workoutId → list of block labels that were inserted but have no sets yet */
export type EmptyBlocks = Record<string, string[]>;

interface DraftState {
  program: DraftProgram | null;
  workouts: DraftWorkout[];
  sets: DraftSet[];
  emptyBlocks: EmptyBlocks;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

export function useProgramDraft(programId: string | undefined, mesocycleId?: string | null) {
  const [original, setOriginal] = useState<DraftState>({
    program: null,
    workouts: [],
    sets: [],
    emptyBlocks: {},
  });
  const [draft, setDraft] = useState<DraftState>({
    program: null,
    workouts: [],
    sets: [],
    emptyBlocks: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<DraftState[]>([]);

  /** Wrap setDraft to auto-push undo — uses functional updater to avoid stale closures */
  const setDraftWithUndo = useCallback(
    (updater: DraftState | ((prev: DraftState) => DraftState)) => {
      setDraft((prev) => {
        // Push current state to undo stack BEFORE applying the update
        setUndoStack((stack) => [...stack.slice(-29), deepClone(prev)]);
        return typeof updater === "function" ? updater(prev) : updater;
      });
    },
    [],
  );

  /* ---- Dirty check ---- */
  const hasChanges = useMemo(
    () => JSON.stringify(original) !== JSON.stringify(draft),
    [original, draft],
  );

  const canUndo = undoStack.length > 0;

  /* ---- Warn on unload ---- */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  /* ================================================================ */
  /*  FETCH                                                           */
  /* ================================================================ */

  const fetchData = useCallback(async () => {
    if (!programId) return;
    setLoading(true);

    try {
      // 1. Program
      const { data: prog, error: progErr } = await supabase
        .from("programs")
        .select("*")
        .eq("id", programId)
        .single();

      if (progErr || !prog) {
        toast.error("No se pudo cargar el programa");
        setLoading(false);
        return;
      }

      const draftProgram: DraftProgram = {
        id: prog.id,
        name: prog.name,
        total_weeks: prog.total_weeks,
        current_week: prog.current_week,
        current_block: prog.current_block,
        is_active: prog.is_active,
        user_id: prog.user_id,
        mesocycle_id: mesocycleId ?? prog.mesocycle_id ?? null,
      };

      // 2. Workouts — filter by mesocycle_id when provided
      let workoutsQuery = supabase
        .from("workouts")
        .select("*")
        .eq("program_id", programId);

      if (mesocycleId) {
        workoutsQuery = workoutsQuery.eq("mesocycle_id", mesocycleId);
      }

      const { data: ws, error: wsErr } = await workoutsQuery.order("scheduled_date");

      if (wsErr) {
        toast.error("Error al cargar workouts");
        setLoading(false);
        return;
      }

      const draftWorkouts: DraftWorkout[] = (ws ?? []).map((w) => ({
        id: w.id,
        program_id: w.program_id,
        week_number: w.week_number,
        day_label: w.day_label,
        workout_type: w.workout_type,
        estimated_duration: w.estimated_duration,
        is_rest_day: w.is_rest_day,
        is_completed: w.is_completed,
        coach_note: w.coach_note,
        short_on_time_note: w.short_on_time_note,
        user_id: w.user_id ?? "00000000-0000-0000-0000-000000000000",
        scheduled_date: w.scheduled_date,
      }));

      // 3. Sets with joined exercise names
      let draftSets: DraftSet[] = [];
      if (draftWorkouts.length > 0) {
        const wIds = draftWorkouts.map((w) => w.id);
        // Supabase default limit is 1000 rows — large programs can exceed this
        // Fetch in chunks of workout IDs to ensure we get ALL sets
        let allSets: Record<string, unknown>[] = [];
        let setsErr: unknown = null;
        const CHUNK = 6; // fetch per-week chunks to stay well under 1000 per query
        for (let i = 0; i < wIds.length; i += CHUNK) {
          const chunk = wIds.slice(i, i + CHUNK);
          const { data, error } = await supabase
            .from("workout_sets")
            .select("*, exercises(name, name_es, video_url, thumbnail_url)")
            .in("workout_id", chunk)
            .order("set_order")
            .limit(5000);
          if (error) { setsErr = error; break; }
          if (data) allSets = allSets.concat(data);
        }

        if (setsErr) {
          toast.error("Error al cargar sets");
          setLoading(false);
          return;
        }

        draftSets = (allSets ?? []).map(
          (s: Record<string, unknown> & { exercises?: { name?: string; name_es?: string; video_url?: string; thumbnail_url?: string } }) => ({
            id: s.id as string,
            workout_id: s.workout_id as string,
            exercise_id: s.exercise_id as string,
            exercise_name: (s.exercises?.name as string) ?? "?",
            exercise_name_es: (s.exercises?.name_es as string) ?? (s.exercises?.name as string) ?? "?",
            set_order: s.set_order as number,
            set_type: (s.set_type as string) ?? "working",
            block_label: (s.block_label as string) ?? "",
            planned_reps: s.planned_reps as number | null,
            planned_weight: s.planned_weight as number | null,
            planned_rpe: s.planned_rpe as number | null,
            planned_rir: s.planned_rir as number | null,
            planned_tempo: s.planned_tempo as string | null,
            planned_duration_seconds: s.planned_duration_seconds as number | null,
            planned_rest_seconds: s.planned_rest_seconds as number | null,
            coaching_cue_override: s.coaching_cue_override as string | null,
            video_url: (s.exercises?.video_url as string) ?? null,
            thumbnail_url: (s.exercises?.thumbnail_url as string) ?? null,
          }),
        );
      }

      const snapshot: DraftState = {
        program: draftProgram,
        workouts: draftWorkouts,
        sets: draftSets,
        emptyBlocks: {},
      };

      setOriginal(deepClone(snapshot));
      setDraft(deepClone(snapshot));
    } finally {
      setLoading(false);
    }
  }, [programId, mesocycleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ================================================================ */
  /*  MUTATIONS — all purely local on `draft`                         */
  /* ================================================================ */

  /* ---- Program ---- */

  const updateProgram = useCallback(
    (fields: Partial<Omit<DraftProgram, "id">>) => {
      setDraftWithUndo((prev) => ({
        ...prev,
        program: prev.program ? { ...prev.program, ...fields } : prev.program,
      }));
    },
    [],
  );

  /* ---- Workouts ---- */

  const updateWorkout = useCallback(
    (workoutId: string, fields: Partial<Omit<DraftWorkout, "id">>) => {
      setDraftWithUndo((prev) => ({
        ...prev,
        workouts: prev.workouts.map((w) =>
          w.id === workoutId ? { ...w, ...fields } : w,
        ),
      }));
    },
    [],
  );

  const createWorkoutForDay = useCallback(
    (weekNumber: number, dayLabel: string) => {
      setDraftWithUndo((prev) => {
        if (!prev.program) return prev;
        // Calculate a date (week 1 day 0 = 2025-01-06)
        const DAY_LABELS = [
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
          "Domingo",
        ];
        const dayIdx = DAY_LABELS.indexOf(dayLabel);
        const baseDate = new Date("2025-01-06");
        baseDate.setDate(
          baseDate.getDate() + (weekNumber - 1) * 7 + (dayIdx >= 0 ? dayIdx : 0),
        );
        const dateStr = baseDate.toISOString().split("T")[0];

        const newWorkout: DraftWorkout = {
          id: crypto.randomUUID(),
          _isNew: true,
          program_id: prev.program.id,
          week_number: weekNumber,
          day_label: dayLabel,
          workout_type: "strength",
          estimated_duration: null,
          is_rest_day: false,
          is_completed: false,
          coach_note: null,
          short_on_time_note: null,
          user_id:
            prev.program.user_id ?? "00000000-0000-0000-0000-000000000000",
          scheduled_date: dateStr,
        };
        return { ...prev, workouts: [...prev.workouts, newWorkout] };
      });
    },
    [],
  );

  /* ---- Blocks ---- */

  /** Helper: get sorted unique block labels for a workout */
  const _getBlockLabels = (sets: DraftSet[], workoutId: string): string[] => {
    const groups = new Map<string, number>();
    for (const s of sets) {
      if (s.workout_id !== workoutId) continue;
      const label = s.block_label || "";
      if (!groups.has(label)) {
        groups.set(label, s.set_order);
      } else {
        groups.set(label, Math.min(groups.get(label)!, s.set_order));
      }
    }
    return [...groups.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  };

  /** Reassign sequential set_order values for an entire workout's sets */
  const _resequenceWorkout = (sets: DraftSet[], workoutId: string): DraftSet[] => {
    // Gather sets for this workout, preserve current relative order
    const workoutSets = sets
      .filter((s) => s.workout_id === workoutId)
      .sort((a, b) => a.set_order - b.set_order);
    const otherSets = sets.filter((s) => s.workout_id !== workoutId);

    workoutSets.forEach((s, i) => {
      s.set_order = i + 1;
    });

    return [...otherSets, ...workoutSets];
  };

  const moveBlock = useCallback(
    (workoutId: string, blockLabel: string, direction: "up" | "down") => {
      setDraftWithUndo((prev) => {
        const labels = _getBlockLabels(prev.sets, workoutId);
        const idx = labels.indexOf(blockLabel);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (idx < 0 || swapIdx < 0 || swapIdx >= labels.length) return prev;

        const otherLabel = labels[swapIdx];

        // Swap by assigning new set_order values:
        // Give all sets in `blockLabel` the min order of `otherLabel`, and vice versa
        const otherMin = Math.min(
          ...prev.sets
            .filter((s) => s.workout_id === workoutId && s.block_label === otherLabel)
            .map((s) => s.set_order),
        );
        const thisMin = Math.min(
          ...prev.sets
            .filter((s) => s.workout_id === workoutId && s.block_label === blockLabel)
            .map((s) => s.set_order),
        );

        // Assign: the block that should come first gets lower orders
        let newSets = prev.sets.map((s) => {
          if (s.workout_id !== workoutId) return s;
          if (s.block_label === blockLabel) {
            // shift by the difference
            return { ...s, set_order: s.set_order + (otherMin - thisMin) };
          }
          if (s.block_label === otherLabel) {
            return { ...s, set_order: s.set_order + (thisMin - otherMin) };
          }
          return s;
        });

        newSets = _resequenceWorkout(newSets, workoutId);
        return { ...prev, sets: newSets };
      });
    },
    [],
  );

  const deleteBlock = useCallback(
    (workoutId: string, blockLabel: string) => {
      setDraftWithUndo((prev) => {
        let newSets = prev.sets.filter(
          (s) => !(s.workout_id === workoutId && s.block_label === blockLabel),
        );
        newSets = _resequenceWorkout(newSets, workoutId);

        // Also remove from emptyBlocks if it was an empty block
        const emptyBlocks = { ...prev.emptyBlocks };
        if (emptyBlocks[workoutId]) {
          emptyBlocks[workoutId] = emptyBlocks[workoutId].filter((b) => b !== blockLabel);
          if (emptyBlocks[workoutId].length === 0) delete emptyBlocks[workoutId];
        }

        return { ...prev, sets: newSets, emptyBlocks };
      });
    },
    [],
  );

  const insertBlock = useCallback(
    (workoutId: string, newBlockLabel: string, afterBlockLabel: string | null) => {
      setDraftWithUndo((prev) => {
        // Track the empty block so DayCard can render it
        const existing = prev.emptyBlocks[workoutId] ?? [];
        if (existing.includes(newBlockLabel)) return prev; // already tracked
        const emptyBlocks = {
          ...prev.emptyBlocks,
          [workoutId]: [...existing, newBlockLabel],
        };

        if (afterBlockLabel === null) {
          return { ...prev, emptyBlocks };
        }

        // Find the max set_order of afterBlockLabel
        const afterSets = prev.sets.filter(
          (s) => s.workout_id === workoutId && s.block_label === afterBlockLabel,
        );
        if (afterSets.length === 0) return { ...prev, emptyBlocks };

        const maxOrderAfter = Math.max(...afterSets.map((s) => s.set_order));

        // Shift everything after that up by 1 to leave conceptual room
        const newSets = prev.sets.map((s) => {
          if (s.workout_id === workoutId && s.set_order > maxOrderAfter) {
            return { ...s, set_order: s.set_order + 1 };
          }
          return s;
        });

        return { ...prev, sets: newSets, emptyBlocks };
      });
    },
    [],
  );

  const renameBlock = useCallback(
    (workoutId: string, oldLabel: string, newLabel: string) => {
      setDraftWithUndo((prev) => ({
        ...prev,
        sets: prev.sets.map((s) =>
          s.workout_id === workoutId && s.block_label === oldLabel
            ? { ...s, block_label: newLabel }
            : s,
        ),
      }));
    },
    [],
  );

  /* ---- Sets / Exercises ---- */

  const addExerciseToBlock = useCallback(
    (
      workoutId: string,
      blockLabel: string,
      exercise: ExerciseOption,
      params: {
        set_type?: string;
        planned_reps?: number | null;
        planned_weight?: number | null;
        planned_rpe?: number | null;
        planned_rir?: number | null;
        planned_tempo?: string | null;
        planned_duration_seconds?: number | null;
        planned_rest_seconds?: number | null;
        coaching_cue_override?: string | null;
      },
      count: number,
    ) => {
      setDraftWithUndo((prev) => {
        // Find the max set_order within this block (or overall workout if block is empty)
        const blockSets = prev.sets.filter(
          (s) => s.workout_id === workoutId && s.block_label === blockLabel,
        );
        const workoutSets = prev.sets.filter((s) => s.workout_id === workoutId);
        const maxOrder =
          blockSets.length > 0
            ? Math.max(...blockSets.map((s) => s.set_order))
            : workoutSets.length > 0
              ? Math.max(...workoutSets.map((s) => s.set_order))
              : 0;

        const newSets: DraftSet[] = Array.from({ length: count }, (_, i) => ({
          id: crypto.randomUUID(),
          _isNew: true,
          workout_id: workoutId,
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          exercise_name_es: exercise.name_es,
          set_order: maxOrder + i + 1,
          set_type: params.set_type ?? "working",
          block_label: blockLabel,
          planned_reps: params.planned_reps ?? null,
          planned_weight: params.planned_weight ?? null,
          planned_rpe: params.planned_rpe ?? null,
          planned_rir: params.planned_rir ?? null,
          planned_tempo: params.planned_tempo ?? null,
          planned_duration_seconds: params.planned_duration_seconds ?? null,
          planned_rest_seconds: params.planned_rest_seconds ?? null,
          coaching_cue_override: params.coaching_cue_override ?? null,
        }));

        // If the new sets were placed in the middle, shift subsequent blocks
        const setsAfter = prev.sets.filter(
          (s) =>
            s.workout_id === workoutId &&
            s.block_label !== blockLabel &&
            s.set_order > maxOrder,
        );

        let allSets = [...prev.sets, ...newSets];
        if (setsAfter.length > 0) {
          const shift = count;
          allSets = allSets.map((s) => {
            if (
              s.workout_id === workoutId &&
              s.block_label !== blockLabel &&
              s.set_order > maxOrder &&
              !newSets.includes(s)
            ) {
              return { ...s, set_order: s.set_order + shift };
            }
            return s;
          });
        }

        // Remove from emptyBlocks since it now has real sets
        const emptyBlocks = { ...prev.emptyBlocks };
        if (emptyBlocks[workoutId]) {
          emptyBlocks[workoutId] = emptyBlocks[workoutId].filter((b) => b !== blockLabel);
          if (emptyBlocks[workoutId].length === 0) delete emptyBlocks[workoutId];
        }

        return { ...prev, sets: allSets, emptyBlocks };
      });
    },
    [],
  );

  const updateSet = useCallback(
    (setId: string, fields: Partial<Omit<DraftSet, "id">>) => {
      setDraftWithUndo((prev) => ({
        ...prev,
        sets: prev.sets.map((s) => (s.id === setId ? { ...s, ...fields } : s)),
      }));
    },
    [],
  );

  const deleteExerciseFromBlock = useCallback(
    (workoutId: string, blockLabel: string, exerciseId: string) => {
      setDraftWithUndo((prev) => {
        let newSets = prev.sets.filter(
          (s) =>
            !(
              s.workout_id === workoutId &&
              s.block_label === blockLabel &&
              s.exercise_id === exerciseId
            ),
        );
        newSets = _resequenceWorkout(newSets, workoutId);
        return { ...prev, sets: newSets };
      });
    },
    [],
  );

  const swapExercise = useCallback(
    (
      workoutId: string,
      blockLabel: string,
      oldExerciseId: string,
      newExercise: ExerciseOption,
    ) => {
      setDraftWithUndo((prev) => ({
        ...prev,
        sets: prev.sets.map((s) =>
          s.workout_id === workoutId &&
          s.block_label === blockLabel &&
          s.exercise_id === oldExerciseId
            ? {
                ...s,
                exercise_id: newExercise.id,
                exercise_name: newExercise.name,
                exercise_name_es: newExercise.name_es,
              }
            : s,
        ),
      }));
    },
    [],
  );

  const moveExerciseBetweenBlocks = useCallback(
    (
      exerciseId: string,
      workoutId: string,
      fromBlock: string,
      toBlock: string,
    ) => {
      setDraftWithUndo((prev) => {
        // Find sets to move
        const toMove = prev.sets.filter(
          (s) =>
            s.workout_id === workoutId &&
            s.block_label === fromBlock &&
            s.exercise_id === exerciseId,
        );
        if (toMove.length === 0) return prev;

        // Find max order in destination block
        const destSets = prev.sets.filter(
          (s) => s.workout_id === workoutId && s.block_label === toBlock,
        );
        const maxDestOrder =
          destSets.length > 0
            ? Math.max(...destSets.map((s) => s.set_order))
            : 0;

        const movedIds = new Set(toMove.map((s) => s.id));

        let newSets = prev.sets.map((s) => {
          if (movedIds.has(s.id)) {
            const offset = s.set_order - Math.min(...toMove.map((m) => m.set_order));
            return {
              ...s,
              block_label: toBlock,
              set_order: maxDestOrder + offset + 1,
            };
          }
          return s;
        });

        newSets = _resequenceWorkout(newSets, workoutId);
        return { ...prev, sets: newSets };
      });
    },
    [],
  );

  /* ---- Add/remove sets for an exercise ---- */

  const addSetToExercise = useCallback(
    (workoutId: string, blockLabel: string, exerciseId: string) => {
      setDraftWithUndo((prev) => {
        // Find existing sets for this exercise in this block
        const exerciseSets = prev.sets
          .filter(
            (s) =>
              s.workout_id === workoutId &&
              s.block_label === blockLabel &&
              s.exercise_id === exerciseId,
          )
          .sort((a, b) => a.set_order - b.set_order);

        if (exerciseSets.length === 0) return prev;

        // Clone the last set with a new id
        const lastSet = exerciseSets[exerciseSets.length - 1];
        const newSet: DraftSet = {
          ...lastSet,
          id: crypto.randomUUID(),
          _isNew: true,
          set_order: lastSet.set_order + 1,
        };

        // Shift all sets after this exercise's position
        let newSets = prev.sets.map((s) => {
          if (s.workout_id === workoutId && s.set_order > lastSet.set_order) {
            return { ...s, set_order: s.set_order + 1 };
          }
          return s;
        });

        newSets = [...newSets, newSet];
        return { ...prev, sets: newSets };
      });
    },
    [],
  );

  const removeSetFromExercise = useCallback(
    (workoutId: string, blockLabel: string, exerciseId: string) => {
      setDraftWithUndo((prev) => {
        const exerciseSets = prev.sets
          .filter(
            (s) =>
              s.workout_id === workoutId &&
              s.block_label === blockLabel &&
              s.exercise_id === exerciseId,
          )
          .sort((a, b) => a.set_order - b.set_order);

        // Must keep at least 1 set
        if (exerciseSets.length <= 1) return prev;

        const lastSet = exerciseSets[exerciseSets.length - 1];
        let newSets = prev.sets.filter((s) => s.id !== lastSet.id);
        newSets = _resequenceWorkout(newSets, workoutId);
        return { ...prev, sets: newSets };
      });
    },
    [],
  );

  /* ---- Reorder exercises within a block ---- */

  const moveExerciseInBlock = useCallback(
    (
      workoutId: string,
      blockLabel: string,
      exerciseId: string,
      direction: "up" | "down",
    ) => {
      setDraftWithUndo((prev) => {
        // Get all sets for this block, grouped by exercise
        const blockSets = prev.sets
          .filter((s) => s.workout_id === workoutId && s.block_label === blockLabel)
          .sort((a, b) => a.set_order - b.set_order);

        // Build exercise group order
        const groupOrder: string[] = [];
        for (const s of blockSets) {
          if (!groupOrder.includes(s.exercise_id)) {
            groupOrder.push(s.exercise_id);
          }
        }

        const idx = groupOrder.indexOf(exerciseId);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (idx < 0 || swapIdx < 0 || swapIdx >= groupOrder.length) return prev;

        // Swap the two exercises by reassigning set_order
        const exA = groupOrder[idx];
        const exB = groupOrder[swapIdx];
        const setsA = blockSets.filter((s) => s.exercise_id === exA);
        const setsB = blockSets.filter((s) => s.exercise_id === exB);
        const minA = Math.min(...setsA.map((s) => s.set_order));
        const minB = Math.min(...setsB.map((s) => s.set_order));

        const newSets = prev.sets.map((s) => {
          if (s.workout_id !== workoutId || s.block_label !== blockLabel) return s;
          if (s.exercise_id === exA) {
            return { ...s, set_order: s.set_order + (minB - minA) };
          }
          if (s.exercise_id === exB) {
            return { ...s, set_order: s.set_order + (minA - minB) };
          }
          return s;
        });

        return { ...prev, sets: _resequenceWorkout(newSets, workoutId) };
      });
    },
    [],
  );

  /* ================================================================ */
  /*  PERSISTENCE                                                     */
  /* ================================================================ */

  const saveInProgressRef = useRef(false);

  const save = useCallback(
    async (scope: SaveScope) => {
      if (!draft.program) return;
      if (saveInProgressRef.current) return; // Prevent concurrent saves
      saveInProgressRef.current = true;
      setSaving(true);

      try {
        /* ----------------------------------------------------------
         *  Determine which week(s) are the "source" and which are
         *  the "targets" for propagation.
         * ---------------------------------------------------------- */
        let sourceWeek: number;
        let targetWeeks: number[] = [];

        switch (scope.type) {
          case "current":
            sourceWeek = scope.week;
            break;
          case "forward":
            sourceWeek = scope.fromWeek;
            targetWeeks = Array.from(
              { length: scope.toWeek - scope.fromWeek },
              (_, i) => scope.fromWeek + i + 1,
            );
            break;
          case "range":
            sourceWeek = scope.fromWeek;
            targetWeeks = Array.from(
              { length: scope.toWeek - scope.fromWeek },
              (_, i) => scope.fromWeek + i + 1,
            );
            break;
          case "all":
            sourceWeek = draft.workouts.length > 0
              ? Math.min(...draft.workouts.map((w) => w.week_number))
              : 1;
            {
              const maxWeek = draft.program.total_weeks;
              targetWeeks = Array.from(
                { length: maxWeek - sourceWeek },
                (_, i) => sourceWeek + i + 1,
              );
            }
            break;
        }


        /* ----------------------------------------------------------
         *  PHASE 1: Save program-level changes
         * ---------------------------------------------------------- */
        if (original.program && draft.program) {
          const progChanged =
            JSON.stringify(original.program) !== JSON.stringify(draft.program);
          if (progChanged) {
            const { error } = await supabase
              .from("programs")
              .update({
                name: draft.program.name,
                total_weeks: draft.program.total_weeks,
                current_week: draft.program.current_week,
                current_block: draft.program.current_block,
                is_active: draft.program.is_active,
              })
              .eq("id", draft.program.id);
            if (error) throw new Error(`Program update failed: ${error.message}`);
          }
        }

        /* ----------------------------------------------------------
         *  PHASE 2: Save source-week workouts & sets
         * ---------------------------------------------------------- */
        const origWorkoutsMap = new Map(
          original.workouts.map((w) => [w.id, w]),
        );
        const origSetsMap = new Map(original.sets.map((s) => [s.id, s]));

        const sourceWorkouts = draft.workouts.filter(
          (w) => w.week_number === sourceWeek,
        );
        // Track newly created workout ID mappings (draft id -> real id)
        const workoutIdMap = new Map<string, string>();


        for (const w of sourceWorkouts) {
          if (w._isNew) {
            // Insert new workout
            const { _isNew, id: draftId, ...insertData } = w;
            const { data: inserted, error } = await supabase
              .from("workouts")
              .insert(insertData)
              .select()
              .single();
            if (error) throw new Error(`Workout insert failed: ${error.message}`);
            workoutIdMap.set(draftId, inserted.id);
          } else {
            // Check if changed
            const orig = origWorkoutsMap.get(w.id);
            if (orig && JSON.stringify(orig) !== JSON.stringify(w)) {
              const { error } = await supabase
                .from("workouts")
                .update({
                  workout_type: w.workout_type,
                  estimated_duration: w.estimated_duration,
                  is_rest_day: w.is_rest_day,
                  is_completed: w.is_completed,
                  coach_note: w.coach_note,
                  short_on_time_note: w.short_on_time_note,
                  day_label: w.day_label,
                })
                .eq("id", w.id);
              if (error)
                throw new Error(`Workout update failed: ${error.message}`);
            }
            workoutIdMap.set(w.id, w.id);
          }
        }

        // Detect deleted workouts (in original source week but not in draft)
        const draftWorkoutIds = new Set(sourceWorkouts.map((w) => w.id));
        const deletedWorkouts = original.workouts.filter(
          (w) => w.week_number === sourceWeek && !draftWorkoutIds.has(w.id),
        );
        for (const w of deletedWorkouts) {
          // CASCADE on FK auto-deletes workout_sets when workout is deleted
          await supabase.from("workouts").delete().eq("id", w.id);
        }

        // Save sets for source week workouts
        for (const w of sourceWorkouts) {
          const realWorkoutId = workoutIdMap.get(w.id)!;
          const draftSetsForWorkout = draft.sets.filter(
            (s) => s.workout_id === w.id,
          );

          // Detect deleted sets
          const draftSetIds = new Set(draftSetsForWorkout.map((s) => s.id));
          const deletedSets = original.sets.filter(
            (s) => s.workout_id === w.id && !draftSetIds.has(s.id),
          );
          if (deletedSets.length > 0) {
            const { error } = await supabase
              .from("workout_sets")
              .delete()
              .in(
                "id",
                deletedSets.map((s) => s.id),
              );
            if (error) throw new Error(`Set delete failed: ${error.message}`);
          }

          // Upsert remaining sets
          for (const s of draftSetsForWorkout) {
            const dbPayload = {
              workout_id: realWorkoutId,
              exercise_id: s.exercise_id,
              set_order: s.set_order,
              set_type: s.set_type,
              block_label: s.block_label || null,
              planned_reps: s.planned_reps,
              planned_weight: s.planned_weight,
              planned_rpe: s.planned_rpe,
              planned_rir: s.planned_rir,
              planned_tempo: s.planned_tempo,
              planned_duration_seconds: s.planned_duration_seconds,
              planned_rest_seconds: s.planned_rest_seconds,
              coaching_cue_override: s.coaching_cue_override,
            };

            if (s._isNew) {
              const { error } = await supabase
                .from("workout_sets")
                .insert({ ...dbPayload, user_id: draft.program?.user_id ?? null });
              if (error) throw new Error(`Set insert failed: ${error.message}`);
            } else {
              // Check if changed
              const orig = origSetsMap.get(s.id);
              if (orig) {
                const origPayload = {
                  workout_id: orig.workout_id,
                  exercise_id: orig.exercise_id,
                  set_order: orig.set_order,
                  set_type: orig.set_type,
                  block_label: orig.block_label || null,
                  planned_reps: orig.planned_reps,
                  planned_weight: orig.planned_weight,
                  planned_rpe: orig.planned_rpe,
                  planned_rir: orig.planned_rir,
                  planned_tempo: orig.planned_tempo,
                  planned_duration_seconds: orig.planned_duration_seconds,
                  planned_rest_seconds: orig.planned_rest_seconds,
                  coaching_cue_override: orig.coaching_cue_override,
                };
                const changed = JSON.stringify(origPayload) !== JSON.stringify(dbPayload);
                if (changed) {
                  const { error } = await supabase
                    .from("workout_sets")
                    .update(dbPayload)
                    .eq("id", s.id);
                  if (error)
                    throw new Error(`Set update failed: ${error.message}`);
                }
              }
            }
          }
        }


        /* ----------------------------------------------------------
         *  PHASE 3: Propagate to target weeks within same program.
         *  Query target workouts FRESH from DB to ensure accuracy.
         * ---------------------------------------------------------- */
        if (targetWeeks.length > 0) {

          // Query ALL target week workouts fresh from DB for this program
          let targetQuery = supabase
            .from("workouts")
            .select("id, week_number, day_label, is_completed")
            .eq("program_id", draft.program!.id)
            .in("week_number", targetWeeks);

          if (mesocycleId) {
            targetQuery = targetQuery.eq("mesocycle_id", mesocycleId);
          }

          const { data: dbTargetWorkouts, error: twErr } = await targetQuery;
          if (twErr) throw new Error(`Failed to fetch target workouts: ${twErr.message}`);

          const targetWorkoutList = dbTargetWorkouts ?? [];

          for (const targetWeek of targetWeeks) {
            for (const srcWorkout of sourceWorkouts) {
              const srcSets = draft.sets.filter(
                (s) => s.workout_id === srcWorkout.id,
              );

              // Find target workout with same day_label in target week (from fresh DB data)
              const targetWorkout = targetWorkoutList.find(
                (w) =>
                  w.week_number === targetWeek &&
                  w.day_label === srcWorkout.day_label,
              );

              if (!targetWorkout) {
                // Create the missing workout in the target week
                const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                const dayIdx = DAY_LABELS.indexOf(srcWorkout.day_label);
                const baseDate = new Date("2025-01-06");
                baseDate.setDate(baseDate.getDate() + (targetWeek - 1) * 7 + (dayIdx >= 0 ? dayIdx : 0));
                const dateStr = baseDate.toISOString().split("T")[0];

                const newWorkoutData: Record<string, unknown> = {
                  program_id: draft.program!.id,
                  week_number: targetWeek,
                  day_label: srcWorkout.day_label,
                  workout_type: srcWorkout.workout_type,
                  estimated_duration: srcWorkout.estimated_duration,
                  is_rest_day: srcWorkout.is_rest_day,
                  is_completed: false,
                  coach_note: srcWorkout.coach_note,
                  short_on_time_note: srcWorkout.short_on_time_note,
                  scheduled_date: dateStr,
                  user_id: draft.program!.user_id ?? null,
                };
                if (mesocycleId) newWorkoutData.mesocycle_id = mesocycleId;

                const { data: createdWorkout, error: cwErr } = await supabase
                  .from("workouts")
                  .insert(newWorkoutData)
                  .select("id")
                  .single();

                if (cwErr) {
                  console.error("[save] Phase 3: failed to create workout:", cwErr.message);
                  continue;
                }

                // Insert cloned sets into the new workout
                if (srcSets.length > 0) {
                  const clonedSets = srcSets.map((s) => ({
                    workout_id: createdWorkout.id,
                    exercise_id: s.exercise_id,
                    set_order: s.set_order,
                    set_type: s.set_type,
                    block_label: s.block_label || null,
                    planned_reps: s.planned_reps,
                    planned_weight: s.planned_weight,
                    planned_rpe: s.planned_rpe,
                    planned_rir: s.planned_rir,
                    planned_tempo: s.planned_tempo,
                    planned_duration_seconds: s.planned_duration_seconds,
                    planned_rest_seconds: s.planned_rest_seconds,
                    coaching_cue_override: s.coaching_cue_override,
                    user_id: draft.program?.user_id ?? null,
                  }));
                  const { error: insErr } = await supabase
                    .from("workout_sets")
                    .insert(clonedSets);
                  if (insErr) throw new Error(`Phase 3 new workout sets insert failed: ${insErr.message}`);
                }
                continue;
              }

              // Skip completed workouts
              if (targetWorkout.is_completed) {
                continue;
              }

              // Update workout fields (except week_number, scheduled_date, id)
              const { error: wUpErr } = await supabase
                .from("workouts")
                .update({
                  workout_type: srcWorkout.workout_type,
                  estimated_duration: srcWorkout.estimated_duration,
                  is_rest_day: srcWorkout.is_rest_day,
                  coach_note: srcWorkout.coach_note,
                  short_on_time_note: srcWorkout.short_on_time_note,
                })
                .eq("id", targetWorkout.id);

              if (wUpErr)
                throw new Error(
                  `Propagation workout update failed: ${wUpErr.message}`,
                );

              // Delete all existing sets for the target workout
              const { error: delErr } = await supabase
                .from("workout_sets")
                .delete()
                .eq("workout_id", targetWorkout.id);
              if (delErr)
                throw new Error(
                  `Propagation set delete failed: ${delErr.message}`,
                );

              // Clone source sets into target workout
              if (srcSets.length > 0) {
                const programUserId = draft.program?.user_id ?? null;
                const clonedSets = srcSets.map((s) => ({
                  workout_id: targetWorkout.id,
                  exercise_id: s.exercise_id,
                  set_order: s.set_order,
                  set_type: s.set_type,
                  block_label: s.block_label || null,
                  planned_reps: s.planned_reps,
                  planned_weight: s.planned_weight,
                  planned_rpe: s.planned_rpe,
                  planned_rir: s.planned_rir,
                  planned_tempo: s.planned_tempo,
                  planned_duration_seconds: s.planned_duration_seconds,
                  planned_rest_seconds: s.planned_rest_seconds,
                  coaching_cue_override: s.coaching_cue_override,
                  user_id: programUserId,
                }));

                const { error: insErr } = await supabase
                  .from("workout_sets")
                  .insert(clonedSets);
                if (insErr)
                  throw new Error(
                    `Propagation set insert failed: ${insErr.message}`,
                  );
              }

            }
          }
        }


        /* ----------------------------------------------------------
         *  PHASE 4: If this is a TEMPLATE (user_id = null),
         *  propagate changes to ALL user copies of this program.
         * ---------------------------------------------------------- */
        if (!draft.program.user_id) {

          // Find all user copies of this program (same name, user_id != null)
          const { data: userCopies, error: ucErr } = await supabase
            .from("programs")
            .select("id, name, user_id")
            .eq("name", draft.program.name)
            .not("user_id", "is", null);

          if (ucErr) {
            console.error("[save] Phase 4: failed to find user copies:", ucErr.message);
          }

          if (userCopies && userCopies.length > 0) {

            // Sync the same weeks that the admin chose in the scope
            const allWeeksToSync = [sourceWeek, ...targetWeeks];

            // Fetch the FRESH template workouts from DB
            let freshQuery = supabase
              .from("workouts")
              .select("id, week_number, day_label, workout_type, estimated_duration, is_rest_day, coach_note, short_on_time_note")
              .eq("program_id", draft.program!.id)
              .in("week_number", allWeeksToSync)
              .limit(500);

            if (mesocycleId) {
              freshQuery = freshQuery.eq("mesocycle_id", mesocycleId);
            }

            const { data: freshTemplateWorkouts } = await freshQuery;

            // Fetch fresh template sets in chunks to avoid 1000-row limit
            const freshTemplateWorkoutIds = (freshTemplateWorkouts ?? []).map((w) => w.id);
            let freshTemplateSets: Record<string, unknown>[] = [];
            const SET_CHUNK = 10;
            for (let i = 0; i < freshTemplateWorkoutIds.length; i += SET_CHUNK) {
              const chunk = freshTemplateWorkoutIds.slice(i, i + SET_CHUNK);
              const { data } = await supabase
                .from("workout_sets")
                .select("workout_id, exercise_id, set_order, set_type, block_label, planned_reps, planned_weight, planned_rpe, planned_rir, planned_tempo, planned_duration_seconds, planned_rest_seconds, coaching_cue_override")
                .in("workout_id", chunk)
                .limit(5000);
              if (data) freshTemplateSets = freshTemplateSets.concat(data);
            }

            for (const userProg of userCopies) {
              // Get all workouts for this user's program in the relevant weeks
              const { data: userWorkouts } = await supabase
                .from("workouts")
                .select("id, week_number, day_label, is_completed")
                .eq("program_id", userProg.id)
                .in("week_number", allWeeksToSync)
                .limit(500);

              if (!userWorkouts) continue;

              for (const weekNum of allWeeksToSync) {
                const templateWorkouts = (freshTemplateWorkouts ?? []).filter(
                  (w) => w.week_number === weekNum,
                );

                for (const tmplWorkout of templateWorkouts) {
                  // Find matching user workout by week_number + day_label
                  const userWorkout = userWorkouts.find(
                    (uw) =>
                      uw.week_number === weekNum &&
                      uw.day_label === tmplWorkout.day_label,
                  );

                  if (!userWorkout) {
                    // Create missing workout for athlete
                    const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
                    const dayIdx = DAY_LABELS.indexOf(tmplWorkout.day_label);
                    const baseDate = new Date("2025-01-06");
                    baseDate.setDate(baseDate.getDate() + (weekNum - 1) * 7 + (dayIdx >= 0 ? dayIdx : 0));
                    const dateStr = baseDate.toISOString().split("T")[0];

                    const { data: createdUW, error: cuwErr } = await supabase
                      .from("workouts")
                      .insert({
                        program_id: userProg.id,
                        week_number: weekNum,
                        day_label: tmplWorkout.day_label,
                        workout_type: tmplWorkout.workout_type,
                        estimated_duration: tmplWorkout.estimated_duration,
                        is_rest_day: tmplWorkout.is_rest_day,
                        is_completed: false,
                        coach_note: tmplWorkout.coach_note,
                        short_on_time_note: tmplWorkout.short_on_time_note,
                        scheduled_date: dateStr,
                        user_id: userProg.user_id,
                      })
                      .select("id")
                      .single();

                    if (cuwErr || !createdUW) {
                      console.error("[save] Phase 4: failed to create user workout:", cuwErr?.message);
                      continue;
                    }

                    // Insert template sets into the new user workout
                    const templateSets = freshTemplateSets.filter(
                      (s) => (s as { workout_id: string }).workout_id === tmplWorkout.id,
                    );
                    if (templateSets.length > 0) {
                      const userSets = templateSets.map((s: Record<string, unknown>) => ({
                        workout_id: createdUW.id,
                        exercise_id: s.exercise_id,
                        set_order: s.set_order,
                        set_type: s.set_type,
                        block_label: s.block_label || null,
                        planned_reps: s.planned_reps,
                        planned_weight: s.planned_weight,
                        planned_rpe: s.planned_rpe,
                        planned_rir: s.planned_rir,
                        planned_tempo: s.planned_tempo,
                        planned_duration_seconds: s.planned_duration_seconds,
                        planned_rest_seconds: s.planned_rest_seconds,
                        coaching_cue_override: s.coaching_cue_override,
                        user_id: userProg.user_id,
                      }));
                      await supabase.from("workout_sets").insert(userSets);
                    }
                    continue;
                  }

                  // Skip completed workouts — don't overwrite user's logged data
                  if (userWorkout.is_completed) continue;

                  // Update workout fields
                  await supabase
                    .from("workouts")
                    .update({
                      workout_type: tmplWorkout.workout_type,
                      estimated_duration: tmplWorkout.estimated_duration,
                      is_rest_day: tmplWorkout.is_rest_day,
                      coach_note: tmplWorkout.coach_note,
                      short_on_time_note: tmplWorkout.short_on_time_note,
                    })
                    .eq("id", userWorkout.id);

                  // Delete existing sets for this user workout
                  await supabase
                    .from("workout_sets")
                    .delete()
                    .eq("workout_id", userWorkout.id);

                  // Get FRESH template sets for this workout
                  const templateSets = freshTemplateSets.filter(
                    (s) => (s as { workout_id: string }).workout_id === tmplWorkout.id,
                  );

                  if (templateSets.length > 0) {
                    const userSets = templateSets.map((s: Record<string, unknown>) => ({
                      workout_id: userWorkout.id,
                      exercise_id: s.exercise_id,
                      set_order: s.set_order,
                      set_type: s.set_type,
                      block_label: s.block_label || null,
                      planned_reps: s.planned_reps,
                      planned_weight: s.planned_weight,
                      planned_rpe: s.planned_rpe,
                      planned_rir: s.planned_rir,
                      planned_tempo: s.planned_tempo,
                      planned_duration_seconds: s.planned_duration_seconds,
                      planned_rest_seconds: s.planned_rest_seconds,
                      coaching_cue_override: s.coaching_cue_override,
                      user_id: userProg.user_id,
                    }));

                    const { error: insErr } = await supabase
                      .from("workout_sets")
                      .insert(userSets);
                    if (insErr) {
                      console.error("[save] Phase 4: set insert failed for user", userProg.user_id, ":", insErr.message);
                    }
                  }
                }
              }

            }
          }
        }

        toast.success("Cambios guardados");

        // Refetch everything to sync with DB
        await fetchData();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error("[save] ERROR:", msg);
        toast.error(`Error al guardar: ${msg}`);
      } finally {
        setSaving(false);
        saveInProgressRef.current = false;
      }
    },
    [draft, original, fetchData, mesocycleId],
  );

  /* ---- Undo ---- */

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setDraft(deepClone(last));
      return prev.slice(0, -1);
    });
  }, []);

  /* ---- Discard ---- */

  const discard = useCallback(() => {
    setDraft(deepClone(original));
    setUndoStack([]);
    toast.success("Cambios descartados");
  }, [original]);

  /* ================================================================ */
  /*  Return                                                          */
  /* ================================================================ */

  return {
    // State
    program: draft.program,
    workouts: draft.workouts,
    sets: draft.sets,
    emptyBlocks: draft.emptyBlocks,
    loading,
    saving,
    hasChanges,
    canUndo,

    // Program
    updateProgram,

    // Workouts
    updateWorkout,
    createWorkoutForDay,

    // Blocks
    moveBlock,
    deleteBlock,
    insertBlock,
    renameBlock,

    // Sets / Exercises
    addExerciseToBlock,
    updateSet,
    deleteExerciseFromBlock,
    swapExercise,
    moveExerciseBetweenBlocks,
    addSetToExercise,
    removeSetFromExercise,
    moveExerciseInBlock,

    // Persistence
    save,
    discard,
    undo,
    fetchData,
  };
}
