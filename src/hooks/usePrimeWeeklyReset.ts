import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface PrevWeekMetrics {
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  consistency: number;
}

export interface WeeklyMetrics {
  distinctExercises: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number; // kg
  consistency: number; // 0-100%
  bestPR: { exerciseName: string; weight: number } | null;
  weekStreak: number; // consecutive weeks
  primeScore: number; // 0-100
  hasWorkoutsThisWeek: boolean;
  isFirstWeek: boolean;
  prevWeek: PrevWeekMetrics | null;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function usePrimeWeeklyReset(selectedDate: string) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async (signal: { cancelled: boolean }) => {
    if (!user) return;
    setLoading(true);

    try {
    const selected = new Date(selectedDate + "T12:00:00");
    const monday = getMonday(selected);
    const sunday = addDays(monday, 6);
    const mondayStr = formatDate(monday);
    const sundayStr = formatDate(sunday);

    // Previous week range
    const prevMonday = addDays(monday, -7);
    const prevSunday = addDays(prevMonday, 6);
    const prevMondayStr = formatDate(prevMonday);
    const prevSundayStr = formatDate(prevSunday);

    // 1. Get this week's workouts
    const { data: weekWorkouts } = await supabase
      .from("workouts")
      .select("id, is_completed, is_rest_day")
      .eq("user_id", user.id)
      .gte("scheduled_date", mondayStr)
      .lte("scheduled_date", sundayStr);

    const workouts = weekWorkouts ?? [];
    const scheduledNonRest = workouts.filter((w) => !w.is_rest_day);
    const completedNonRest = scheduledNonRest.filter((w) => w.is_completed);
    const completedIds = completedNonRest.map((w) => w.id);

    // 2. Get this week's completed workout sets
    let sets: Array<{ exercise_id: string; actual_reps: number | null; actual_weight: number | null; is_pr: boolean }> = [];
    if (completedIds.length > 0) {
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("exercise_id, actual_reps, actual_weight, is_pr")
        .eq("user_id", user.id)
        .in("workout_id", completedIds)
        .eq("is_completed", true);
      sets = setsData ?? [];
    }

    // 3. Get previous week's metrics for comparison
    let prevVolume = 0;
    let prevWeekData: PrevWeekMetrics | null = null;

    const { data: prevAllWorkouts } = await supabase
      .from("workouts")
      .select("id, is_completed, is_rest_day")
      .eq("user_id", user.id)
      .gte("scheduled_date", prevMondayStr)
      .lte("scheduled_date", prevSundayStr);

    if (prevAllWorkouts && prevAllWorkouts.length > 0) {
      const prevScheduledNonRest = prevAllWorkouts.filter((w) => !w.is_rest_day);
      const prevCompletedNonRest = prevScheduledNonRest.filter((w) => w.is_completed);
      const prevIds = prevCompletedNonRest.map((w) => w.id);

      let prevTotalSets = 0;
      let prevTotalReps = 0;

      if (prevIds.length > 0) {
        const { data: prevSets } = await supabase
          .from("workout_sets")
          .select("actual_reps, actual_weight")
          .eq("user_id", user.id)
          .in("workout_id", prevIds)
          .eq("is_completed", true);
        if (prevSets) {
          prevTotalSets = prevSets.length;
          prevTotalReps = prevSets.reduce((sum, s) => sum + (s.actual_reps ?? 0), 0);
          prevVolume = prevSets.reduce(
            (sum, s) => sum + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
            0
          );
        }
      }

      const prevConsistency = prevScheduledNonRest.length > 0
        ? Math.round((prevCompletedNonRest.length / prevScheduledNonRest.length) * 100)
        : 0;

      prevWeekData = {
        totalSets: prevTotalSets,
        totalReps: prevTotalReps,
        totalVolume: Math.round(prevVolume),
        consistency: prevConsistency,
      };
    }

    // 4. Best PR exercise name
    let bestPR: { exerciseName: string; weight: number } | null = null;
    const prSets = sets.filter((s) => s.is_pr && s.actual_weight > 0);
    if (prSets.length > 0) {
      const best = prSets.reduce((a, b) =>
        (b.actual_weight ?? 0) > (a.actual_weight ?? 0) ? b : a
      );
      const { data: exercise } = await supabase
        .from("exercises")
        .select("name_es, name")
        .eq("id", best.exercise_id)
        .maybeSingle();
      bestPR = {
        exerciseName: exercise?.name || exercise?.name_es || "Ejercicio",
        weight: best.actual_weight,
      };
    }

    // If no PR sets, find best weight this week
    if (!bestPR && sets.length > 0) {
      const heaviest = sets.reduce((a, b) =>
        (b.actual_weight ?? 0) > (a.actual_weight ?? 0) ? b : a
      );
      if (heaviest.actual_weight > 0) {
        const { data: exercise } = await supabase
          .from("exercises")
          .select("name_es, name")
          .eq("id", heaviest.exercise_id)
          .maybeSingle();
        bestPR = {
          exerciseName: exercise?.name || exercise?.name_es || "Ejercicio",
          weight: heaviest.actual_weight,
        };
      }
    }

    // 5. Week streak (consecutive weeks with at least 1 completed workout)
    let weekStreak = 0;
    const { data: allCompletedWorkouts } = await supabase
      .from("workouts")
      .select("scheduled_date")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .lte("scheduled_date", sundayStr)
      .order("scheduled_date", { ascending: false });

    if (allCompletedWorkouts && allCompletedWorkouts.length > 0) {
      // Group completed workouts by week (Monday-based)
      const weekSet = new Set<string>();
      for (const w of allCompletedWorkouts) {
        const wMon = getMonday(new Date(w.scheduled_date + "T12:00:00"));
        weekSet.add(formatDate(wMon));
      }

      // Count consecutive weeks backwards from current week
      let checkWeek = new Date(monday);
      for (let i = 0; i < 52; i++) {
        if (weekSet.has(formatDate(checkWeek))) {
          weekStreak++;
          checkWeek = addDays(checkWeek, -7);
        } else {
          break;
        }
      }
    }

    // 6. Check if first week (no history before this week)
    const { count: historicalCount } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .lt("scheduled_date", mondayStr);

    const isFirstWeek = (historicalCount ?? 0) === 0;

    if (signal.cancelled) return;

    // Calculate metrics
    const distinctExercises = new Set(sets.map((s) => s.exercise_id)).size;
    const totalSets = sets.length;
    const totalReps = sets.reduce((sum, s) => sum + (s.actual_reps ?? 0), 0);
    const totalVolume = sets.reduce(
      (sum, s) => sum + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
      0
    );
    const consistency =
      scheduledNonRest.length > 0
        ? Math.round((completedNonRest.length / scheduledNonRest.length) * 100)
        : 0;

    // PRIME Score calculation (max 100)
    // 1. Consistency (40 pts)
    const consistencyPts = (consistency / 100) * 40;

    // 2. Volume improvement (20 pts)
    let volumePts = 0;
    if (prevVolume === 0 && totalVolume > 0) {
      volumePts = 20; // First week with volume = full points
    } else if (prevVolume > 0) {
      const ratio = totalVolume / prevVolume;
      volumePts = Math.min(ratio, 1) * 20; // Cap at 20
    }

    // 3. PR bonus (20 pts)
    const hasPR = prSets.length > 0;
    const prPts = hasPR ? 20 : 0;

    // 4. Streak (20 pts) - logarithmic scale, max at 8+
    const streakPts =
      weekStreak === 0 ? 0 : Math.min((Math.log2(weekStreak + 1) / Math.log2(9)) * 20, 20);

    const primeScore = Math.round(consistencyPts + volumePts + prPts + streakPts);

    setMetrics({
      distinctExercises,
      totalSets,
      totalReps,
      totalVolume: Math.round(totalVolume),
      consistency,
      bestPR,
      weekStreak,
      primeScore,
      hasWorkoutsThisWeek: completedNonRest.length > 0,
      isFirstWeek,
      prevWeek: prevWeekData,
    });
    } catch (err) {
      // Silently handle — metrics will stay null and UI shows loading/empty state
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    const signal = { cancelled: false };
    fetchMetrics(signal);
    return () => { signal.cancelled = true; };
  }, [fetchMetrics]);

  return { metrics, loading };
}
