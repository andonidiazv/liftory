/**
 * PR detection (A2 + e1RM sanity check).
 *
 * Pulled out of useWorkoutData so the sync queue can recompute is_pr after
 * replaying a queued completion. Without this, sets logged offline would
 * keep their placeholder is_pr=false even after the writes sync to Supabase
 * — because the legacy code path that did the recompute lived only in the
 * React hook, which isn't running during background sync.
 *
 * Algorithm history:
 *   v1 ("A2", 2026-05-06): "PR if actual_weight strictly > prior best at the
 *     SAME actual_reps". This had a blind spot: marking the first-ever set
 *     at a new rep range as PR even when the athlete had already lifted
 *     more weight at a higher rep range (e.g. 55lb × 6r in April → then
 *     40lb × 5r in May incorrectly flagged PR despite being weaker).
 *   v2 (current, 2026-05-08): A2 + e1RM sanity check. A set is a PR only
 *     if it BOTH (a) strictly beats the prior best at the same actual_reps,
 *     AND (b) its estimated 1-rep max (Epley: weight × (1 + reps/30)) is
 *     greater than or equal to the best prior e1RM across ALL rep ranges.
 *     This blocks "rep-range first" PRs that are objectively weaker than
 *     existing performance, while still letting genuine cross-range PRs
 *     count (e.g. 55 × 7 ≥ 55 × 6 prior best).
 *
 * Bodyweight sentinel (-1) and zero/negative weights are never PRs.
 */

import { supabase } from "@/integrations/supabase/client";

/** Epley estimated 1-rep max. */
function e1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export async function computeIsPrA2(params: {
  setId: string;
  userId: string;
  exerciseId: string;
  actualWeight: number;
  actualReps: number;
}): Promise<boolean> {
  const { setId, userId, exerciseId, actualWeight, actualReps } = params;
  if (actualWeight <= 0 || actualReps <= 0) return false;

  // (a) Strictly beats prior best at the SAME rep count.
  const { data: priorAtSameReps } = await supabase
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
  const beatsAtSameReps = !priorAtSameReps || actualWeight > priorAtSameReps.actual_weight;
  if (!beatsAtSameReps) return false;

  // (b) Sanity check: e1RM must match or exceed the best prior e1RM across
  // ALL rep ranges. Without this, a "first set at a new rep range" gets PR
  // even when the athlete has already done strictly better elsewhere.
  const { data: priorAll } = await supabase
    .from("workout_sets")
    .select("actual_weight, actual_reps")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .eq("is_completed", true)
    .neq("id", setId)
    .gt("actual_weight", 0)
    .gt("actual_reps", 0);
  if (!priorAll || priorAll.length === 0) return true; // truly first effort

  let bestPriorE1rm = 0;
  for (const p of priorAll) {
    const e = e1rm(p.actual_weight, p.actual_reps);
    if (e > bestPriorE1rm) bestPriorE1rm = e;
  }
  return e1rm(actualWeight, actualReps) >= bestPriorE1rm;
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
