import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

export interface MuscleVolume {
  group: string;
  volume: number;
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
  muscleData: MuscleVolume[];
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

  // Muscle volume
  const { data: muscleSets } = await supabase
    .from("workout_sets")
    .select("actual_weight, actual_reps, exercise:exercises(primary_muscles)")
    .eq("user_id", userId)
    .eq("is_completed", true);

  const muscleMap: Record<string, number> = {};
  ((muscleSets as Array<{ actual_weight: number | null; actual_reps: number | null; exercise: { primary_muscles: string[] | null } | null }>) ?? []).forEach((s) => {
    const vol = (s.actual_weight ?? 0) * (s.actual_reps ?? 0);
    const muscles: string[] = s.exercise?.primary_muscles ?? [];
    muscles.forEach((m: string) => {
      muscleMap[m] = (muscleMap[m] ?? 0) + vol;
    });
  });

  const muscleArr = Object.entries(muscleMap)
    .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);

  const maxVol = muscleArr[0]?.volume || 1;
  const muscleData = muscleArr.map((m) => ({ ...m, volume: Math.round((m.volume / maxVol) * 100) }));

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
