import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  setMacroGroups,
  volumeStatus,
  ALL_MACRO_GROUPS,
  SETS_PER_WEEK_MAX,
  type MacroGroup,
  type VolumeStatus,
} from "@/utils/muscleGroups";

export interface PRRecord {
  actual_weight: number;
  logged_at: string;
  exercise_name: string;
  actual_reps: number | null;
}

export interface DailyVolume {
  day: string; // "L", "M", etc.
  date: string;
  volume: number;
}

/**
 * Effective sets per muscle group over the last 7 days.
 * Replaces the old volume-based radar which was biased by muscle size.
 */
export interface MuscleSets {
  group: MacroGroup;
  sets: number; // completed working sets in past 7 days
  status: VolumeStatus; // vs target range (10-20)
  targetMin: number;
  targetMax: number;
}

export interface ProgressStats {
  totalWorkouts: number;
  streak: number;
  consistency: number; // 0-100
  lifetimeVolume: number;
}

const DAY_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ── Raw data shape from server ──
interface ProgressServerData {
  prs: PRRecord[];
  weeklyVolume: DailyVolume[];
  muscleData: MuscleSets[];
  stats: ProgressStats;
}

// ── Query function ──
async function fetchProgressData(userId: string): Promise<ProgressServerData> {
  const today = new Date();
  const todayStr = formatDate(today);
  const monday = getMonday(today);

  // Build 7-day range
  const dayDates: { date: Date; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dayDates.push({ date: d, label: DAY_SHORT[d.getDay()] });
  }

  // Parallel queries
  const [prsRes, programmedRes, completedRes, lifetimeRes, streakRes] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("actual_weight, actual_reps, logged_at, exercise:exercises(name)")
      .eq("user_id", userId)
      .eq("is_pr", true)
      .not("actual_weight", "is", null)
      .gt("actual_weight", 0)
      .order("logged_at", { ascending: false })
      .limit(10),

    supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_rest_day", false)
      .lte("scheduled_date", todayStr),

    supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", true),

    supabase
      .from("workout_sets")
      .select("actual_weight, actual_reps")
      .eq("user_id", userId)
      .eq("is_completed", true),

    supabase
      .from("workouts")
      .select("scheduled_date")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .lte("scheduled_date", todayStr)
      .order("scheduled_date", { ascending: false })
      .limit(30),
  ]);

  // PRs — deduplicate: best PR per exercise
  const rawPrs = ((prsRes.data as Array<{ actual_weight: number | null; actual_reps: number | null; logged_at: string | null; exercise: { name: string } | null }>) ?? []);
  const bestByExercise = new Map<string, typeof rawPrs[0]>();
  for (const r of rawPrs) {
    const name = r.exercise?.name ?? "Exercise";
    const existing = bestByExercise.get(name);
    if (!existing || (r.actual_weight ?? 0) > (existing.actual_weight ?? 0)) {
      bestByExercise.set(name, r);
    }
  }
  const prs: PRRecord[] = Array.from(bestByExercise.values()).map((r) => ({
    actual_weight: r.actual_weight ?? 0,
    actual_reps: r.actual_reps,
    logged_at: r.logged_at ?? "",
    exercise_name: r.exercise?.name ?? "Exercise",
  }));

  // Consistency
  const programmed = programmedRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const consistency = programmed > 0 ? Math.round((completed / programmed) * 100) : 0;

  // Lifetime volume
  const lifetimeVol = ((lifetimeRes.data as Array<{ actual_weight: number | null; actual_reps: number | null }>) ?? []).reduce(
    (acc: number, s: { actual_weight: number | null; actual_reps: number | null }) => acc + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
    0
  );

  // Streak
  let streak = 0;
  if (streakRes.data && streakRes.data.length > 0) {
    const completedDates = new Set(streakRes.data.map((w: { scheduled_date: string }) => w.scheduled_date));
    const check = new Date(today);
    if (!completedDates.has(todayStr)) check.setDate(check.getDate() - 1);
    for (let i = 0; i < 30; i++) {
      if (completedDates.has(formatDate(check))) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else break;
    }
  }

  const stats: ProgressStats = { totalWorkouts: completed, streak, consistency, lifetimeVolume: Math.round(lifetimeVol) };

  // Weekly volume
  const weekStart = formatDate(monday);
  const weekEndDate = new Date(monday);
  weekEndDate.setDate(monday.getDate() + 7);
  const weekEnd = formatDate(weekEndDate);

  const { data: weekSets } = await supabase
    .from("workout_sets")
    .select("actual_weight, actual_reps, logged_at")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .gte("logged_at", weekStart)
    .lt("logged_at", weekEnd);

  const volByDay: Record<string, number> = {};
  ((weekSets as Array<{ actual_weight: number | null; actual_reps: number | null; logged_at: string | null }>) ?? []).forEach((s) => {
    const d = s.logged_at?.split("T")[0];
    if (d) volByDay[d] = (volByDay[d] ?? 0) + (s.actual_weight ?? 0) * (s.actual_reps ?? 0);
  });

  const weeklyVolume: DailyVolume[] = dayDates.map((dd) => ({
    day: dd.label,
    date: formatDate(dd.date),
    volume: Math.round(volByDay[formatDate(dd.date)] ?? 0),
  }));

  // Muscle balance: effective sets per macro group over the past 7 days.
  // A "set" counts once per macro group — a deadlift tagged with
  // ["hamstrings", "glutes", "erector_spinae"] adds 1 set to Hamstrings,
  // Gluteos, and Lumbar. Synonyms (biceps + biceps_brachii) are
  // deduplicated so they don't double-count.
  // Excludes warmup and cooldown set types — only working volume counts.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentSets } = await supabase
    .from("workout_sets")
    .select("set_type, actual_weight, logged_at, exercise:exercises(primary_muscles)")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .gte("logged_at", sevenDaysAgo.toISOString());

  const setCounts: Record<MacroGroup, number> = ALL_MACRO_GROUPS.reduce(
    (acc, g) => ({ ...acc, [g]: 0 }),
    {} as Record<MacroGroup, number>
  );

  type RecentSet = {
    set_type: string;
    actual_weight: number | null;
    exercise: { primary_muscles: string[] | null } | null;
  };
  for (const s of (recentSets as RecentSet[] | null) ?? []) {
    // Skip warmups, cooldowns, and sets with no meaningful load (ignore 0
    // but keep the bodyweight sentinel -1)
    if (s.set_type === "warmup" || s.set_type === "cooldown") continue;
    const w = s.actual_weight;
    if (w == null || w === 0) continue;

    const macros = setMacroGroups(s.exercise?.primary_muscles ?? null);
    for (const macro of macros) {
      setCounts[macro] += 1;
    }
  }

  const muscleData: MuscleSets[] = ALL_MACRO_GROUPS.map((group) => ({
    group,
    sets: setCounts[group],
    status: volumeStatus(setCounts[group]),
    targetMin: 10,
    targetMax: SETS_PER_WEEK_MAX,
  }));

  return { prs, weeklyVolume, muscleData, stats };
}

// ══════════════════════════════════════════════════════════════
// Hook
// ══════════════════════════════════════════════════════════════
export function useProgressData() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["progress-data", user?.id],
    queryFn: () => fetchProgressData(user!.id),
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 min — progress data changes less frequently
  });

  const prs = data?.prs ?? [];
  const weeklyVolume = data?.weeklyVolume ?? [];
  const muscleData = data?.muscleData ?? [];
  const stats = useMemo(() => data?.stats ?? { totalWorkouts: 0, streak: 0, consistency: 0, lifetimeVolume: 0 }, [data]);

  return { prs, weeklyVolume, muscleData, stats, loading: isLoading };
}
