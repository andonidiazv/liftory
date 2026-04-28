import { supabase } from "@/integrations/supabase/client";
import { getMesoForDate } from "./mesocycle-content";

export interface MesocycleTopPR {
  exerciseName: string;
  weightLb: number;
  reps: number;
  /** YYYY-MM-DD */
  loggedAt: string;
  /** Same-rep delta in lb. Mutually exclusive with `estreno`. */
  deltaLb?: number;
  /** True when this is the first time the user hit this rep count for the exercise. */
  estreno?: boolean;
}

export interface MesocycleStats {
  mesoId: string;
  startDate: string;
  endDate: string;
  weeksCount: number;
  sessionsCompleted: number;
  sessionsTotal: number;
  /** Distinct exercises with at least one PR in this meso. */
  prCount: number;
  topThreePRs: MesocycleTopPR[];
  totalVolumeLb: number;
  totalVolumeKg: number;
  bestStreak: number;
}

const KG_TO_LB = 2.20462;

/**
 * Pulls every stat shown on the MesocycleClosingCard, scoped to a single meso.
 * Generic across M1, M2, M3+ — uses `getMesoForDate` for date scoping so adding
 * a new meso to MESOCYCLE_DATE_RANGES is enough; this helper requires no edits.
 *
 * Returns null when the user has no workouts in the requested meso (e.g. a future
 * meso or a meso the athlete skipped).
 */
export async function getMesocycleStats(
  userId: string,
  mesoId: string,
): Promise<MesocycleStats | null> {
  const { data: allWorkouts } = await supabase
    .from("workouts")
    .select("scheduled_date, is_completed, is_rest_day")
    .eq("user_id", userId)
    .order("scheduled_date", { ascending: true });

  const mesoWorkouts = (allWorkouts ?? []).filter(
    (w) => getMesoForDate(w.scheduled_date) === mesoId,
  );
  if (mesoWorkouts.length === 0) return null;

  const startDate = mesoWorkouts[0].scheduled_date;
  const endDate = mesoWorkouts[mesoWorkouts.length - 1].scheduled_date;
  const endBound = `${endDate}T23:59:59`;

  const nonRest = mesoWorkouts.filter((w) => !w.is_rest_day);
  const sessionsCompleted = nonRest.filter((w) => w.is_completed).length;
  const sessionsTotal = nonRest.length;

  const [topThreePRs, prCount, totalVolumeKg] = await Promise.all([
    fetchTopThreePRs(userId, startDate, endBound),
    fetchPRCount(userId, startDate, endBound),
    fetchTotalVolumeKg(userId, startDate, endBound),
  ]);

  const weeksCount =
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (7 * 86_400_000),
    ) || 1;

  return {
    mesoId,
    startDate,
    endDate,
    weeksCount,
    sessionsCompleted,
    sessionsTotal,
    prCount,
    topThreePRs,
    totalVolumeLb: totalVolumeKg * KG_TO_LB,
    totalVolumeKg,
    bestStreak: computeBestStreak(mesoWorkouts),
  };
}

async function fetchPRCount(
  userId: string,
  startDate: string,
  endBound: string,
): Promise<number> {
  const { data } = await supabase
    .from("workout_sets")
    .select("exercise_id")
    .eq("user_id", userId)
    .eq("is_pr", true)
    .gte("logged_at", startDate)
    .lte("logged_at", endBound);
  return new Set((data ?? []).map((s) => s.exercise_id)).size;
}

async function fetchTotalVolumeKg(
  userId: string,
  startDate: string,
  endBound: string,
): Promise<number> {
  const { data } = await supabase
    .from("workout_sets")
    .select("actual_weight, actual_reps")
    .eq("user_id", userId)
    .not("actual_weight", "is", null)
    .not("actual_reps", "is", null)
    .gte("logged_at", startDate)
    .lte("logged_at", endBound);
  return (data ?? []).reduce(
    (sum, s) => sum + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
    0,
  );
}

async function fetchTopThreePRs(
  userId: string,
  startDate: string,
  endBound: string,
): Promise<MesocycleTopPR[]> {
  const { data: prs } = await supabase
    .from("workout_sets")
    .select(
      "exercise_id, actual_weight, actual_reps, logged_at, exercises(name)",
    )
    .eq("user_id", userId)
    .eq("is_pr", true)
    .gte("logged_at", startDate)
    .lte("logged_at", endBound)
    .order("actual_weight", { ascending: false, nullsFirst: false })
    .limit(50);

  // Dedupe by exercise — keep the heaviest PR set per exercise.
  const seen = new Set<string>();
  const top: typeof prs = [] as never;
  for (const pr of prs ?? []) {
    if (!pr.actual_weight || !pr.actual_reps) continue;
    if (seen.has(pr.exercise_id)) continue;
    seen.add(pr.exercise_id);
    (top as unknown as Array<(typeof prs)[number]>).push(pr);
    if (top.length >= 3) break;
  }

  // Compute the same-rep delta. Two-step: (1) find the earliest occurrence of the
  // top weight × top reps for this exercise, (2) find the heaviest weight at the
  // same reps logged BEFORE that. This matches the user's mental model of "what
  // was my best the moment I broke the record." Avoids two failure modes:
  //   - same-session ties at the new top → delta 0 (filtering by logged_at < PR's
  //     logged_at returns one of the other top reps).
  //   - post-PR backoff sets → delta wrong (filtering only by weight < top picks
  //     a later, lighter set as "prior").
  const results: MesocycleTopPR[] = [];
  for (const pr of top) {
    if (!pr.actual_weight || !pr.actual_reps) continue;

    const { data: firstAtTop } = await supabase
      .from("workout_sets")
      .select("logged_at")
      .eq("user_id", userId)
      .eq("exercise_id", pr.exercise_id)
      .eq("actual_reps", pr.actual_reps)
      .eq("actual_weight", pr.actual_weight)
      .not("logged_at", "is", null)
      .order("logged_at", { ascending: true })
      .limit(1);

    const recordSetAt = firstAtTop?.[0]?.logged_at ?? pr.logged_at;

    let priorBestKg: number | null = null;
    if (recordSetAt) {
      const { data: prior } = await supabase
        .from("workout_sets")
        .select("actual_weight")
        .eq("user_id", userId)
        .eq("exercise_id", pr.exercise_id)
        .eq("actual_reps", pr.actual_reps)
        .lt("logged_at", recordSetAt)
        .not("actual_weight", "is", null)
        .order("actual_weight", { ascending: false, nullsFirst: false })
        .limit(1);
      priorBestKg = prior?.[0]?.actual_weight ?? null;
    }

    const exerciseName =
      (pr.exercises as { name: string } | null)?.name ?? "Ejercicio";

    const base: MesocycleTopPR = {
      exerciseName,
      weightLb: Math.round(pr.actual_weight * KG_TO_LB),
      reps: pr.actual_reps,
      loggedAt: (pr.logged_at ?? recordSetAt ?? "").slice(0, 10),
    };

    results.push(
      priorBestKg != null
        ? { ...base, deltaLb: Math.round((pr.actual_weight - priorBestKg) * KG_TO_LB) }
        : { ...base, estreno: true },
    );
  }

  return results;
}

function computeBestStreak(
  workouts: Array<{ scheduled_date: string; is_completed: boolean | null; is_rest_day: boolean | null }>,
): number {
  // Iterate in chronological order. Skip rest days transparently — same rule as
  // the home streak counter (a planned rest day shouldn't break adherence).
  const sorted = [...workouts].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date),
  );
  let best = 0;
  let current = 0;
  for (const w of sorted) {
    if (w.is_rest_day) continue;
    if (w.is_completed) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}
