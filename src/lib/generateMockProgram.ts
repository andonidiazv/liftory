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
    // Create program stub flagged for regeneration
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

  // 2. Create program
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

  // Filter exercises by equipment
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
  });

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

    // Sunday always rest, or if we've hit the weekly limit
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

      // Select exercises for this workout
      const numExercises = 4 + Math.floor(Math.random() * 3);
      const selected = [...availableExercises]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(numExercises, availableExercises.length));

      let setOrder = 1;
      for (const exercise of selected) {
        const isCompound = exercise.category !== "conditioning" && exercise.category !== "mobility";
        // Warmup set
        if (isCompound) {
          setInserts.push({
            _tempId: tempId,
            data: {
              user_id: userId,
              exercise_id: exercise.id,
              set_order: setOrder++,
              set_type: "warmup",
              planned_reps: 10,
              planned_weight: 20,
              planned_tempo: exercise.default_tempo || "2.0.1.0",
              planned_rpe: 5,
              planned_rir: 5,
              planned_rest_seconds: 60,
            },
          });
        }
        // Working sets
        const numSets = exercise.category === "conditioning" ? 1 : 3 + Math.floor(Math.random() * 2);
        for (let s = 0; s < numSets; s++) {
          setInserts.push({
            _tempId: tempId,
            data: {
              user_id: userId,
              exercise_id: exercise.id,
              set_order: setOrder++,
              set_type: exercise.category === "conditioning" ? "emom" : "working",
              planned_reps: 8 + Math.floor(Math.random() * 5),
              planned_weight: 30 + Math.floor(Math.random() * 40),
              planned_tempo: exercise.default_tempo || "3.1.1.0",
              planned_rpe: 7 + Math.floor(Math.random() * 2),
              planned_rir: 2 + Math.floor(Math.random() * 2),
              planned_rest_seconds: [90, 120, 150][Math.floor(Math.random() * 3)],
            },
          });
        }
      }

      dayIndex++;
      weeklyCount++;
    }

    // Reset weekly counter on Sunday
    if (dayOfWeek === 0) weeklyCount = 0;
  }

  // Insert all workouts in bulk
  const { data: createdWorkouts, error: wErr } = await supabase
    .from("workouts")
    .insert(workoutInserts.map((w) => w.data))
    .select("id, scheduled_date");

  if (wErr || !createdWorkouts) return { success: false };

  // Map scheduled_date back to tempId for set association
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

  // Build final set inserts with real workout_ids
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
