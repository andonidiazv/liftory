import { supabase } from "@/integrations/supabase/client";

interface OnboardingAnswers {
  experience_level: string;
  primary_goal: string;
  training_days: number;
  equipment: string;
  emotional_barriers: string[];
  gender?: string | null;
}

function goalLabel(goal: string): string {
  const labels: Record<string, string> = {
    hypertrophy: "Hipertrofia",
    fat_loss: "Definición",
    performance: "Performance",
    health: "Salud",
    mobility: "Movilidad",
    event: "Evento",
  };
  return labels[goal] || goal;
}

function levelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
  };
  return labels[level] || level;
}

const SPLITS: Record<number, string[]> = {
  3: ["LIFTORY PRESS ENGINE", "LIFTORY PULL ENGINE", "LIFTORY FULL FORCE"],
  4: ["LIFTORY UPPER STRENGTH", "LIFTORY LOWER FORCE", "LIFTORY UPPER SCULPT", "LIFTORY POSTERIOR FORCE"],
  5: ["LIFTORY PULL PERFORMANCE", "LIFTORY QUAD ENGINE", "LIFTORY PRESS POWER", "LIFTORY FLOW & ENGINE", "LIFTORY POSTERIOR FORCE"],
  6: ["LIFTORY PRESS ENGINE", "LIFTORY PULL ENGINE", "LIFTORY FULL FORCE", "LIFTORY PRESS ENGINE B", "LIFTORY PULL ENGINE B", "LIFTORY FULL FORCE B"],
};

function getProgramName(answers: OnboardingAnswers): string {
  const days = answers.training_days;
  const gender = answers.gender;
  if (days === 3) return "LIFTORY FOUNDATION — 3 días";
  if (days === 5 && gender === "female") return "LIFTORY SCULPT HER™ — 5 días";
  if (days === 5) return "LIFTORY METHOD — 5 días";
  if (days === 4 && gender === "female") return "SCULPT HER™ — 4 días";
  if (days === 4) return "LIFTORY METHOD — 4 días";
  return `LIFTORY METHOD — ${days} días`;
}

/* ─── Exercise Classification ─── */

type ExRow = {
  id: string;
  category: string;
  movement_pattern: string;
  primary_muscles: string[] | null;
  equipment_required: string[] | null;
  emotional_barrier_tag: string | null;
  default_tempo: string | null;
  difficulty: string;
  [key: string]: any;
};

// Muscle groups for classification
const UPPER_PULL_MUSCLES = ["lats", "rhomboids", "upper_back", "teres_major", "rear_deltoid", "biceps", "biceps_brachii", "brachialis", "brachioradialis", "lower_trapezius"];
const UPPER_PUSH_MUSCLES = ["pectoralis_major", "upper_pectoralis", "anterior_deltoid", "deltoid", "deltoid_anterior", "deltoid_medial", "triceps", "triceps_brachii", "triceps_brachii_long_head"];
const LOWER_QUAD_MUSCLES = ["quadriceps"];
const LOWER_HIP_MUSCLES = ["gluteus_maximus", "gluteus_medius", "gluteus_minimus", "hamstrings", "adductors"];
const ISOLATION_PATTERNS = ["core"]; // exercises with core pattern that are isolation-like

function hasMuscleOverlap(muscles: string[] | null, targets: string[]): boolean {
  if (!muscles) return false;
  return muscles.some((m) => targets.includes(m));
}

function isCompound(ex: ExRow): boolean {
  const muscles = ex.primary_muscles ?? [];
  return muscles.length >= 3 || ["squat", "hinge", "push", "pull"].includes(ex.movement_pattern);
}

function isIsolation(ex: ExRow): boolean {
  const muscles = ex.primary_muscles ?? [];
  return muscles.length <= 2 && !["squat", "hinge"].includes(ex.movement_pattern);
}

interface ClassifiedExercises {
  upper_pull_compound: ExRow[];
  upper_pull_isolation: ExRow[];
  upper_push_compound: ExRow[];
  upper_push_isolation: ExRow[];
  lower_quad: ExRow[];
  lower_hip: ExRow[];
  mobility: ExRow[];
  activation: ExRow[];
  conditioning: ExRow[];
}

function classifyExercises(exercises: ExRow[]): ClassifiedExercises {
  const result: ClassifiedExercises = {
    upper_pull_compound: [],
    upper_pull_isolation: [],
    upper_push_compound: [],
    upper_push_isolation: [],
    lower_quad: [],
    lower_hip: [],
    mobility: [],
    activation: [],
    conditioning: [],
  };

  for (const ex of exercises) {
    // Mobility
    if (ex.category === "mobility") {
      result.mobility.push(ex);
      continue;
    }
    // Activation / accessory
    if (ex.category === "accessory") {
      result.activation.push(ex);
      continue;
    }
    // Conditioning
    if (ex.category === "conditioning") {
      result.conditioning.push(ex);
      continue;
    }

    // Strength / Olympic — classify by muscles
    const isPull = ex.movement_pattern === "pull" || hasMuscleOverlap(ex.primary_muscles, UPPER_PULL_MUSCLES);
    const isPush = ex.movement_pattern === "push" || hasMuscleOverlap(ex.primary_muscles, UPPER_PUSH_MUSCLES);
    const isLowerQuad = ex.movement_pattern === "squat" || hasMuscleOverlap(ex.primary_muscles, LOWER_QUAD_MUSCLES);
    const isLowerHip = ex.movement_pattern === "hinge" || hasMuscleOverlap(ex.primary_muscles, LOWER_HIP_MUSCLES);

    if (isLowerQuad && !isPull && !isPush) {
      result.lower_quad.push(ex);
    } else if (isLowerHip && !isPull && !isPush) {
      result.lower_hip.push(ex);
    } else if (isPull) {
      if (isIsolation(ex)) {
        result.upper_pull_isolation.push(ex);
      } else {
        result.upper_pull_compound.push(ex);
      }
    } else if (isPush) {
      if (isIsolation(ex)) {
        result.upper_push_isolation.push(ex);
      } else {
        result.upper_push_compound.push(ex);
      }
    } else {
      // Fallback: put in activation
      result.activation.push(ex);
    }
  }

  return result;
}

/* ─── Session Exercise Selection ─── */

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

interface SessionBlock {
  exercises: ExRow[];
  setType: string;
  sets: number;
  reps: number;
  restSeconds: number;
  rpe?: number;
  rir?: number;
}

function getSessionBlocks(
  label: string,
  classified: ClassifiedExercises,
  gender: string | null
): SessionBlock[] {
  const blocks: SessionBlock[] = [];

  // Determine session type from label
  const sessionKey = label.replace("LIFTORY ", "").replace(" B", "");

  const isFlowEngine = sessionKey === "FLOW & ENGINE";
  const isPull = sessionKey.includes("PULL");
  const isPress = sessionKey.includes("PRESS");
  const isQuad = sessionKey.includes("QUAD") || sessionKey === "LOWER FORCE";
  const isPosterior = sessionKey.includes("POSTERIOR");
  const isFullForce = sessionKey.includes("FULL FORCE");
  const isUpper = sessionKey.includes("UPPER") && !isPull && !isPress;

  // ─── Block 1: Mobility (warmup) — session-relevant ───
  // Filter mobility/activation exercises relevant to the session
  let warmupPool: ExRow[] = [];
  if (isPull) {
    // Scapular / upper back mobility
    warmupPool = [...classified.mobility, ...classified.activation].filter(
      (e) => hasMuscleOverlap(e.primary_muscles, UPPER_PULL_MUSCLES) || e.movement_pattern === "pull" || e.category === "mobility"
    );
  } else if (isPress) {
    // Shoulder / chest mobility
    warmupPool = [...classified.mobility, ...classified.activation].filter(
      (e) => hasMuscleOverlap(e.primary_muscles, UPPER_PUSH_MUSCLES) || e.movement_pattern === "push" || e.category === "mobility"
    );
  } else if (isQuad) {
    // Hip / knee / ankle mobility
    warmupPool = [...classified.mobility, ...classified.activation].filter(
      (e) => hasMuscleOverlap(e.primary_muscles, [...LOWER_QUAD_MUSCLES, ...LOWER_HIP_MUSCLES]) || e.movement_pattern === "squat" || e.category === "mobility"
    );
  } else if (isPosterior) {
    // Hip hinge / hamstring mobility
    warmupPool = [...classified.mobility, ...classified.activation].filter(
      (e) => hasMuscleOverlap(e.primary_muscles, LOWER_HIP_MUSCLES) || e.movement_pattern === "hinge" || e.category === "mobility"
    );
  } else {
    warmupPool = [...classified.mobility, ...classified.activation];
  }
  if (warmupPool.length < 2) warmupPool = [...classified.mobility, ...classified.activation];

  blocks.push({
    exercises: pickRandom(warmupPool, 2 + Math.floor(Math.random() * 2)),
    setType: "warmup",
    sets: 1,
    reps: 10,
    restSeconds: 30,
    rpe: 4,
    rir: 6,
  });

  // ─── FLOW & ENGINE: only mobility + conditioning ───
  if (isFlowEngine) {
    blocks.push({
      exercises: pickRandom(classified.mobility, 3),
      setType: "warmup",
      sets: 2,
      reps: 8,
      restSeconds: 45,
      rpe: 5,
      rir: 5,
    });
    blocks.push({
      exercises: pickRandom(classified.conditioning, 2),
      setType: "emom",
      sets: 3,
      reps: 10,
      restSeconds: 45,
      rpe: 7,
      rir: 3,
    });
    return blocks;
  }

  // ─── Determine pools STRICTLY by session type ───
  let strengthAPool: ExRow[] = [];
  let strengthBPool: ExRow[] = [];
  let sculptPool: ExRow[] = [];

  if (isPull) {
    // PULL ENGINE / PULL PERFORMANCE: ONLY pull exercises
    strengthAPool = classified.upper_pull_compound;
    strengthBPool = classified.upper_pull_compound;
    sculptPool = classified.upper_pull_isolation;
  } else if (isPress) {
    // PRESS ENGINE / PRESS POWER: ONLY push exercises
    strengthAPool = classified.upper_push_compound;
    strengthBPool = classified.upper_push_compound;
    sculptPool = classified.upper_push_isolation;
  } else if (isQuad) {
    // QUAD ENGINE / LOWER FORCE: ONLY quad-dominant lower body
    strengthAPool = classified.lower_quad;
    strengthBPool = classified.lower_quad;
    sculptPool = classified.lower_quad.filter(isIsolation);
    if (sculptPool.length === 0) sculptPool = classified.lower_quad;
  } else if (isPosterior) {
    // POSTERIOR FORCE: ONLY hip-hinge / glute / hamstring
    strengthAPool = classified.lower_hip;
    strengthBPool = classified.lower_hip;
    sculptPool = classified.lower_hip.filter(isIsolation);
    if (sculptPool.length === 0) sculptPool = classified.lower_hip;
  } else if (isFullForce) {
    // FULL FORCE: big compound movements — one upper, one lower
    strengthAPool = [...classified.lower_quad, ...classified.lower_hip]; // heavy squat/deadlift
    strengthBPool = [...classified.upper_push_compound, ...classified.upper_pull_compound]; // heavy press/row
    sculptPool = [...classified.upper_push_isolation, ...classified.upper_pull_isolation];
  } else if (isUpper) {
    // UPPER STRENGTH / UPPER SCULPT: upper body only (push + pull)
    strengthAPool = [...classified.upper_push_compound, ...classified.upper_pull_compound];
    strengthBPool = [...classified.upper_push_compound, ...classified.upper_pull_compound];
    sculptPool = [...classified.upper_push_isolation, ...classified.upper_pull_isolation];
  } else {
    // Fallback: use push + pull for upper sessions
    strengthAPool = [...classified.upper_push_compound, ...classified.upper_pull_compound];
    strengthBPool = [...classified.upper_push_compound, ...classified.upper_pull_compound];
    sculptPool = [...classified.upper_push_isolation, ...classified.upper_pull_isolation];
  }

  // Gender bias: add extra sets for specific blocks
  let genderBiasCategory: "lower_hip" | "upper_push" | null = null;
  if (gender === "female") genderBiasCategory = "lower_hip";
  if (gender === "male") genderBiasCategory = "upper_push";

  // ─── Block 2: FUERZA A (1 compound, 4 working sets × 6 reps) ───
  const strengthAExercises = pickRandom(strengthAPool, 1);
  const strengthASets = 4 + (genderBiasCategory === "upper_push" && isPress ? 1 : 0) + (genderBiasCategory === "lower_hip" && isPosterior ? 1 : 0);
  blocks.push({
    exercises: strengthAExercises,
    setType: "working",
    sets: strengthASets,
    reps: 6,
    restSeconds: 90,
    rpe: 8,
    rir: 2,
  });

  // ─── Block 3: FUERZA B (1 compound/unilateral, 3 working sets × 8 reps) ───
  const usedIds = new Set(strengthAExercises.map((e) => e.id));
  const strengthBFiltered = strengthBPool.filter((e) => !usedIds.has(e.id));
  const strengthBExercises = pickRandom(strengthBFiltered.length > 0 ? strengthBFiltered : strengthBPool, 1);
  blocks.push({
    exercises: strengthBExercises,
    setType: "working",
    sets: 3,
    reps: 8,
    restSeconds: 75,
    rpe: 7,
    rir: 3,
  });

  // ─── Block 4: SCULPT (2 isolation, 3 sets each — superset) ───
  const allUsedIds = new Set([...usedIds, ...strengthBExercises.map((e) => e.id)]);
  const sculptFiltered = sculptPool.filter((e) => !allUsedIds.has(e.id));
  const sculptExercises = pickRandom(sculptFiltered.length >= 2 ? sculptFiltered : sculptPool, 2);
  const sculptSets = 3 + (genderBiasCategory === "upper_push" && isPress ? 1 : 0) + (genderBiasCategory === "lower_hip" && isPosterior ? 1 : 0);
  blocks.push({
    exercises: sculptExercises,
    setType: "backoff",
    sets: sculptSets,
    reps: 12,
    restSeconds: 60,
    rpe: 7,
    rir: 2,
  });

  // ─── Block 5: FINISHER (1-2 conditioning/athletic, EMOM) ───
  const finisherPool = [...classified.conditioning, ...classified.activation.filter((e) => e.category === "olympic" || e.movement_pattern === "carry")];
  const finisherExercises = pickRandom(finisherPool.length > 0 ? finisherPool : classified.conditioning, 1 + Math.floor(Math.random() * 2));
  if (finisherExercises.length > 0) {
    blocks.push({
      exercises: finisherExercises,
      setType: "emom",
      sets: 2,
      reps: 10,
      restSeconds: 45,
      rpe: 8,
      rir: 2,
    });
  }

  return blocks;
}

/* ─── Main Generator ─── */

export async function generateMockProgram(
  userId: string,
  answers: OnboardingAnswers
): Promise<{ success: boolean; noExercises?: boolean }> {
  // 1. Get exercises
  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("is_active", true);

  if (!exercises || exercises.length === 0) {
    await supabase.from("programs").insert({
      user_id: userId,
      name: getProgramName(answers),
      total_weeks: answers.experience_level === "beginner" ? 8 : 6,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        experience_level: answers.experience_level,
        primary_goal: answers.primary_goal,
        training_days: answers.training_days,
        equipment: answers.equipment,
        gender: answers.gender || null,
        generated_by: "mock_v1",
        needs_regeneration: true,
      },
    });
    return { success: true, noExercises: true };
  }

  // 2. Filter by equipment and emotional barriers
  const availableExercises = exercises.filter((e) => {
    const eq = e.equipment_required as string[] | null;
    if (!eq) return true;
    if (answers.equipment === "home_none")
      return eq.some((x) => ["none", "bodyweight"].includes(x));
    if (answers.equipment === "home_dumbbells")
      return eq.some((x) => ["dumbbell", "none", "bodyweight"].includes(x));
    return true;
  }).filter((e) => {
    if (answers.emotional_barriers.length > 0 && e.emotional_barrier_tag) {
      return !answers.emotional_barriers.includes(e.emotional_barrier_tag);
    }
    return true;
  }) as ExRow[];

  // 3. Classify exercises
  const classified = classifyExercises(availableExercises);

  // 4. Create program
  const totalWeeks = answers.experience_level === "beginner" ? 8 : 6;
  const daysPerWeek = answers.training_days;

  const { data: program, error: pErr } = await supabase
    .from("programs")
    .insert({
      user_id: userId,
      name: getProgramName(answers),
      total_weeks: totalWeeks,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        experience_level: answers.experience_level,
        primary_goal: answers.primary_goal,
        training_days: answers.training_days,
        equipment: answers.equipment,
        gender: answers.gender || null,
        generated_by: "mock_v1",
      },
    })
    .select()
    .single();

  if (pErr || !program) return { success: false };

  const split = SPLITS[daysPerWeek] || SPLITS[4];
  const daysToGenerate = 14;
  const startDate = new Date();
  const gender = answers.gender || null;

  // Batch all inserts
  const workoutInserts: any[] = [];
  const setInserts: any[] = [];

  let weeklyCount = 0;
  let dayIndex = 0;

  for (let d = 0; d < daysToGenerate; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    const isRestDay = dayOfWeek === 0 || weeklyCount >= daysPerWeek;

    if (isRestDay) {
      workoutInserts.push({
        _dayIndex: d,
        _isRest: true,
        data: {
          program_id: program.id,
          user_id: userId,
          scheduled_date: dateStr,
          week_number: Math.ceil((d + 1) / 7),
          day_label: "Recovery",
          workout_type: "rest",
          is_rest_day: true,
        },
      });
    } else {
      const label = split[dayIndex % split.length];
      const tempId = `temp_${d}`;
      workoutInserts.push({
        _dayIndex: d,
        _isRest: false,
        _tempId: tempId,
        data: {
          program_id: program.id,
          user_id: userId,
          scheduled_date: dateStr,
          week_number: Math.ceil((d + 1) / 7),
          day_label: label,
          workout_type: "hypertrophy",
          estimated_duration: 55 + Math.floor(Math.random() * 20),
          is_rest_day: false,
        },
      });

      // Generate blocks for this session
      const blocks = getSessionBlocks(label, classified, gender);

      let setOrder = 1;
      for (const block of blocks) {
        for (const exercise of block.exercises) {
          for (let s = 0; s < block.sets; s++) {
            setInserts.push({
              _tempId: tempId,
              data: {
                user_id: userId,
                exercise_id: exercise.id,
                set_order: setOrder++,
                set_type: block.setType,
                planned_reps: block.reps,
                planned_weight: 0,
                planned_tempo: exercise.default_tempo || (block.setType === "warmup" ? "2.0.1.0" : "3.1.1.0"),
                planned_rpe: block.rpe ?? 7,
                planned_rir: block.rir ?? 3,
                planned_rest_seconds: block.restSeconds,
              },
            });
          }
        }
      }

      dayIndex++;
      weeklyCount++;
    }

    if (dayOfWeek === 0) weeklyCount = 0;
  }

  // Insert all workouts in bulk
  const { data: createdWorkouts, error: wErr } = await supabase
    .from("workouts")
    .insert(workoutInserts.map((w) => w.data))
    .select("id, scheduled_date");

  if (wErr || !createdWorkouts) return { success: false };

  const dateToWorkoutId = new Map<string, string>();
  createdWorkouts.forEach((w) => {
    dateToWorkoutId.set(w.scheduled_date, w.id);
  });

  const dateByTemp = new Map<string, string>();
  workoutInserts
    .filter((w) => !w._isRest)
    .forEach((w) => {
      dateByTemp.set(w._tempId, w.data.scheduled_date);
    });

  const finalSets = setInserts
    .map((s) => {
      const date = dateByTemp.get(s._tempId);
      if (!date) return null;
      const workoutId = dateToWorkoutId.get(date);
      if (!workoutId) return null;
      return { ...s.data, workout_id: workoutId };
    })
    .filter(Boolean);

  if (finalSets.length > 0) {
    await supabase.from("workout_sets").insert(finalSets as any[]);
  }

  return { success: true, noExercises: false };
}
