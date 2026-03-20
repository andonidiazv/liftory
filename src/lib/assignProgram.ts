import { supabase } from "@/integrations/supabase/client";

/**
 * assignProgram — Assigns a pre-loaded program template to a user.
 * Templates are programs with user_id IS NULL, created by admins.
 */
export async function assignProgram(
  userId: string,
  gender: string,
  level: string
): Promise<{ success: boolean; programId?: string; noExercises?: boolean }> {
  // 1. Determine program name
  let programName = "";
  if (gender === "male" && level === "advanced") programName = "BUILD HIM ELITE";
  if (gender === "male" && level === "intermediate") programName = "BUILD HIM FOUNDATION";
  if (gender === "female" && level === "advanced") programName = "SCULPT HER ELITE";
  if (gender === "female" && level === "intermediate") programName = "SCULPT HER FOUNDATION";

  // 2. Find template program (user_id IS NULL = global template)
  const { data: template } = await supabase
    .from("programs")
    .select("*")
    .is("user_id", null)
    .eq("name", programName)
    .single();

  if (!template) {
    // Fallback: create empty program so app doesn't crash
    const { data: program } = await supabase
      .from("programs")
      .insert({
        user_id: userId,
        name: programName,
        total_weeks: 6,
        current_week: 1,
        current_block: "accumulation",
        is_active: true,
        ai_params: { assigned_template: programName, generated_by: "manual_v1" },
      })
      .select()
      .single();

    return { success: true, programId: program?.id, noExercises: true };
  }

  // 3. Deactivate any existing active programs
  await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  // 4. Copy template program for this user
  const { data: program } = await supabase
    .from("programs")
    .insert({
      user_id: userId,
      name: template.name,
      total_weeks: template.total_weeks,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      ai_params: {
        assigned_template: programName,
        template_id: template.id,
        generated_by: "curated_v1",
      },
    })
    .select()
    .single();

  if (!program) return { success: false };

  // 5. Copy template workouts, adjusting dates to next Monday
  const { data: templateWorkouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("program_id", template.id)
    .order("scheduled_date", { ascending: true });

  if (!templateWorkouts?.length) {
    return { success: true, programId: program.id, noExercises: true };
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);

  const templateStart = new Date(templateWorkouts[0].scheduled_date);

  const workoutInserts = templateWorkouts.map((tw) => {
    const daysDiff = Math.floor(
      (new Date(tw.scheduled_date).getTime() - templateStart.getTime()) / 86400000
    );
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + daysDiff);

    return {
      program_id: program.id,
      user_id: userId,
      scheduled_date: newDate.toISOString().split("T")[0],
      week_number: tw.week_number,
      day_label: tw.day_label,
      workout_type: tw.workout_type,
      estimated_duration: tw.estimated_duration,
      is_rest_day: tw.is_rest_day,
      notes: tw.notes,
      coach_note: tw.coach_note,
      short_on_time_note: tw.short_on_time_note,
    };
  });

  const { data: createdWorkouts } = await supabase
    .from("workouts")
    .insert(workoutInserts)
    .select("id, scheduled_date");

  if (!createdWorkouts) return { success: false };

  // 6. Map old workout IDs → new, copy all workout_sets
  const dateToNewId: Record<string, string> = {};
  createdWorkouts.forEach((w) => {
    dateToNewId[w.scheduled_date] = w.id;
  });

  const oldDateToOldId: Record<string, string> = {};
  templateWorkouts.forEach((tw) => {
    const daysDiff = Math.floor(
      (new Date(tw.scheduled_date).getTime() - templateStart.getTime()) / 86400000
    );
    const nd = new Date(startDate);
    nd.setDate(startDate.getDate() + daysDiff);
    oldDateToOldId[nd.toISOString().split("T")[0]] = tw.id;
  });

  for (const dateStr of Object.keys(dateToNewId)) {
    const newWorkoutId = dateToNewId[dateStr];
    const oldWorkoutId = oldDateToOldId[dateStr];
    if (!oldWorkoutId) continue;

    const { data: tSets } = await supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_id", oldWorkoutId)
      .order("set_order");

    if (!tSets?.length) continue;

    const setInserts = tSets.map((ts) => ({
      workout_id: newWorkoutId,
      user_id: userId,
      exercise_id: ts.exercise_id,
      set_order: ts.set_order,
      set_type: ts.set_type,
      planned_reps: ts.planned_reps,
      planned_weight: null,
      planned_tempo: ts.planned_tempo,
      planned_rpe: ts.planned_rpe,
      planned_rir: null,
      planned_rest_seconds: ts.planned_rest_seconds,
      coaching_cue_override: ts.coaching_cue_override,
    }));

    await supabase.from("workout_sets").insert(setInserts);
  }

  return { success: true, programId: program.id };
}
