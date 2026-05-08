/**
 * PR detection (A2 algorithm).
 *
 * Pulled out of useWorkoutData so the sync queue can recompute is_pr after
 * replaying a queued completion. Without this, sets logged offline would
 * keep their placeholder is_pr=false even after the writes sync to Supabase
 * — because the legacy code path that did the recompute lived only in the
 * React hook, which isn't running during background sync.
 *
 * A2 definition: a completed set is a PR if its actual_weight is strictly
 * greater than the prior best weight at the SAME actual_reps for the same
 * (user, exercise), excluding the current set. First-ever set at a given
 * rep range counts as a PR (establishes the baseline). Bodyweight (-1) and
 * zero/negative weights are never PRs.
 */

import { supabase } from "@/integrations/supabase/client";

export async function computeIsPrA2(params: {
  setId: string;
  userId: string;
  exerciseId: string;
  actualWeight: number;
  actualReps: number;
}): Promise<boolean> {
  const { setId, userId, exerciseId, actualWeight, actualReps } = params;
  if (actualWeight <= 0 || actualReps <= 0) return false;
  const { data: prior } = await supabase
    .from("workout_sets")
    .select("actual_weight")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("actual_reps", actualReps)
    .eq("is_completed", true)
    .neq("id", setId)
    .gt("actual_weight", 0)
    .order("actual_weight", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!prior) return true;
  return actualWeight > prior.actual_weight;
}

/**
 * Recompute is_pr for a single set and write the result if it changed.
 * Called by the sync queue after replaying an offline completion.
 */
export async function recomputeIsPrForSet(setId: string): Promise<void> {
  const { data: row } = await supabase
    .from("workout_sets")
    .select("user_id, exercise_id, actual_weight, actual_reps, is_completed, is_pr")
    .eq("id", setId)
    .maybeSingle();
  if (!row || !row.is_completed) return;

  let target = false;
  if ((row.actual_weight ?? 0) > 0 && (row.actual_reps ?? 0) > 0) {
    target = await computeIsPrA2({
      setId,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      actualWeight: row.actual_weight,
      actualReps: row.actual_reps,
    });
  }
  if (target === (row.is_pr ?? false)) return;
  await supabase.from("workout_sets").update({ is_pr: target }).eq("id", setId);
}
