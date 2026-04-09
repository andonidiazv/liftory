import { supabase } from "@/integrations/supabase/client";

/**
 * assignProgram — Assigns a pre-loaded program template to a user.
 * Templates are programs with user_id IS NULL, created by admins.
 *
 * mode:
 *   "live"   → dates aligned to the mesocycle's cycle_start_date (GO LIVE)
 *   "fresh"  → dates start from this Monday (personal calendar)
 */
export async function assignProgram(
  userId: string,
  gender: string,
  level: string,
  mode: "live" | "fresh" = "live"
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

  // 3. Fetch the live mesocycle for this program (if any)
  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select("id, cycle_start_date")
    .eq("template_program_id", template.id)
    .eq("status", "live")
    .single();

  // 4. Determine the start date for the user's workouts
  let startDate: Date;

  if (mode === "live" && mesocycle) {
    // GO LIVE: use the mesocycle's cycle_start_date
    startDate = new Date(mesocycle.cycle_start_date + "T00:00:00");
  } else {
    // FRESH: start from this Monday
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate = new Date(today);
    startDate.setDate(today.getDate() - daysSinceMonday);
  }

  // 5. Deactivate any existing active programs
  await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  // 6. Copy template program for this user
  const { data: program } = await supabase
    .from("programs")
    .insert({
      user_id: userId,
      name: template.name,
      total_weeks: template.total_weeks,
      current_week: 1,
      current_block: "accumulation",
      is_active: true,
      mesocycle_id: mesocycle?.id ?? template.mesocycle_id ?? null,
      ai_params: {
        assigned_template: programName,
        template_id: template.id,
        generated_by: "curated_v1",
        mode,
      },
    })
    .select()
    .single();

  if (!program) return { success: false };

  // 7. Copy template workouts, adjusting dates
  //    Filter by mesocycle_id so we only copy the LIVE cycle's workouts
  let workoutQuery = supabase
    .from("workouts")
    .select("*")
    .eq("program_id", template.id);

  if (mesocycle) {
    workoutQuery = workoutQuery.eq("mesocycle_id", mesocycle.id);
  }

  const { data: templateWorkouts } = await workoutQuery.order("scheduled_date", { ascending: true });

  if (!templateWorkouts?.length) {
    return { success: true, programId: program.id, noExercises: true };
  }

  const templateStart = new Date(templateWorkouts[0].scheduled_date + "T00:00:00");

  const workoutInserts = templateWorkouts.map((tw) => {
    const daysDiff = Math.floor(
      (new Date(tw.scheduled_date + "T00:00:00").getTime() - templateStart.getTime()) / 86400000
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

  // 8. Map old workout IDs → new workout IDs via date alignment
  const dateToNewId: Record<string, string> = {};
  createdWorkouts.forEach((w) => {
    dateToNewId[w.scheduled_date] = w.id;
  });

  const oldIdToNewId: Record<string, string> = {};
  templateWorkouts.forEach((tw) => {
    const daysDiff = Math.floor(
      (new Date(tw.scheduled_date + "T00:00:00").getTime() - templateStart.getTime()) / 86400000
    );
    const nd = new Date(startDate);
    nd.setDate(startDate.getDate() + daysDiff);
    const newDate = nd.toISOString().split("T")[0];
    const newId = dateToNewId[newDate];
    if (newId) oldIdToNewId[tw.id] = newId;
  });

  // 9. Fetch ALL template workout_sets in ONE batch query
  const oldWorkoutIds = Object.keys(oldIdToNewId);
  if (!oldWorkoutIds.length) return { success: true, programId: program.id };

  const { data: allTemplateSets } = await supabase
    .from("workout_sets")
    .select("*")
    .in("workout_id", oldWorkoutIds)
    .order("set_order");

  if (!allTemplateSets?.length) return { success: true, programId: program.id };

  // 10. Remap and insert ALL sets in ONE batch
  const allSetInserts = allTemplateSets.map((ts) => ({
    workout_id: oldIdToNewId[ts.workout_id],
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
    block_label: ts.block_label,
  }));

  await supabase.from("workout_sets").insert(allSetInserts);

  return { success: true, programId: program.id };
}
