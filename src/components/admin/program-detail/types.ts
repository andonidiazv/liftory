import { BLOCK_LABEL_COLORS, BLOCK_ORDER } from "@/constants/blocks";

/* ------------------------------------------------------------------ */
/*  Draft interfaces — mutable working copies of DB rows              */
/* ------------------------------------------------------------------ */

export interface DraftProgram {
  id: string;
  name: string;
  total_weeks: number;
  current_week: number;
  current_block: string;
  is_active: boolean;
  user_id: string | null;
}

export interface DraftWorkout {
  id: string;
  _isNew?: boolean;
  program_id: string;
  week_number: number;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_rest_day: boolean;
  is_completed: boolean;
  coach_note: string | null;
  short_on_time_note: string | null;
  user_id: string;
  scheduled_date: string;
}

export interface DraftSet {
  id: string;
  _isNew?: boolean;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_name_es: string;
  set_order: number;
  set_type: string;
  block_label: string;
  planned_reps: number | null;
  planned_weight: number | null;
  planned_rpe: number | null;
  planned_rir: number | null;
  planned_tempo: string | null;
  planned_rest_seconds: number | null;
  coaching_cue_override: string | null;
}

/* ------------------------------------------------------------------ */
/*  Derived block — computed from sets for display purposes           */
/* ------------------------------------------------------------------ */

export interface DerivedBlock {
  label: string;
  color: string;
  sets: DraftSet[];
  minOrder: number;
  exerciseGroups: {
    exerciseId: string;
    exerciseName: string;
    exerciseNameEs: string;
    sets: DraftSet[];
  }[];
}

/* ------------------------------------------------------------------ */
/*  Exercise picker option                                            */
/* ------------------------------------------------------------------ */

export interface ExerciseOption {
  id: string;
  name: string;
  name_es: string;
}

/* ------------------------------------------------------------------ */
/*  Save scope — determines which weeks are affected by a save        */
/* ------------------------------------------------------------------ */

export type SaveScope =
  | { type: "current"; week: number }
  | { type: "forward"; fromWeek: number; toWeek: number }
  | { type: "range"; fromWeek: number; toWeek: number }
  | { type: "all" };

/* ------------------------------------------------------------------ */
/*  Helper: derive blocks from a flat list of sets for one workout    */
/* ------------------------------------------------------------------ */

const DEFAULT_BLOCK_COLOR = "#8A8A8E";

export function deriveBlocks(sets: DraftSet[], workoutId: string): DerivedBlock[] {
  const filtered = sets
    .filter((s) => s.workout_id === workoutId)
    .sort((a, b) => a.set_order - b.set_order);

  // Group by block_label preserving encounter order
  const blockMap = new Map<string, DraftSet[]>();
  for (const s of filtered) {
    const label = s.block_label || "UNASSIGNED";
    if (!blockMap.has(label)) {
      blockMap.set(label, []);
    }
    blockMap.get(label)!.push(s);
  }

  const blocks: DerivedBlock[] = [];

  for (const [label, blockSets] of blockMap) {
    const minOrder = Math.min(...blockSets.map((s) => s.set_order));

    // Build exercise groups preserving encounter order within the block
    const groupMap = new Map<string, DraftSet[]>();
    const groupOrder: string[] = [];
    for (const s of blockSets) {
      if (!groupMap.has(s.exercise_id)) {
        groupMap.set(s.exercise_id, []);
        groupOrder.push(s.exercise_id);
      }
      groupMap.get(s.exercise_id)!.push(s);
    }

    const exerciseGroups = groupOrder.map((exId) => {
      const exSets = groupMap.get(exId)!;
      return {
        exerciseId: exId,
        exerciseName: exSets[0].exercise_name,
        exerciseNameEs: exSets[0].exercise_name_es,
        sets: exSets,
      };
    });

    blocks.push({
      label,
      color: BLOCK_LABEL_COLORS[label] ?? DEFAULT_BLOCK_COLOR,
      sets: blockSets,
      minOrder,
      exerciseGroups,
    });
  }

  // Sort blocks using BLOCK_ORDER (same as athlete view) — mirrors the athlete experience
  blocks.sort((a, b) => {
    const idxA = BLOCK_ORDER.indexOf(a.label);
    const idxB = BLOCK_ORDER.indexOf(b.label);
    // Known blocks go first in BLOCK_ORDER sequence; unknown blocks go to the end sorted by minOrder
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.minOrder - b.minOrder;
  });

  return blocks;
}
