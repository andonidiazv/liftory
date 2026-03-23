import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const selected = new Date(selectedDate + "T12:00:00");
    const monday = getMonday(selected);
    const saturday = addDays(monday, 5);
    const mondayStr = formatDate(monday);
    const saturdayStr = formatDate(saturday);

    // Previous week range
    const prevMonday = addDays(monday, -7);
    const prevSaturday = addDays(prevMonday, 5);
    const prevMondayStr = formatDate(prevMonday);
    const prevSaturdayStr = formatDate(prevSaturday);

    // 1. Get this week's workouts
    const { data: weekWorkouts } = await supabase
      .from("workouts")
      .select("id, is_completed, is_rest_day")
      .eq("user_id", user.id)
      .gte("scheduled_date", mondayStr)
      .lte("scheduled_date", saturdayStr);

    const workouts = weekWorkouts ?? [];
    const scheduledNonRest = workouts.filter((w) => !w.is_rest_day);
    const completedNonRest = scheduledNonRest.filter((w) => w.is_completed);
    const completedIds = completedNonRest.map((w) => w.id);

    // 2. Get this week's completed workout sets
    let sets: any[] = [];
    if (completedIds.length > 0) {
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("exercise_id, reps_actual, weight_actual, is_pr")
        .eq("user_id", user.id)
        .in("workout_id", completedIds)
        .eq("is_completed", true);
      sets = setsData ?? [];
    }

    // 3. Get previous week's volume for comparison
    let prevVolume = 0;
    const { data: prevWorkouts } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .eq("is_rest_day", false)
      .gte("scheduled_date", prevMondayStr)
      .lte("scheduled_date", prevSaturdayStr);

    if (prevWorkouts && prevWorkouts.length > 0) {
      const prevIds = prevWorkouts.map((w) => w.id);
      const { data: prevSets } = await supabase
        .from("workout_sets")
        .select("reps_actual, weight_actual")
        .eq("user_id", user.id)
        .in("workout_id", prevIds)
        .eq("is_completed", true);
      if (prevSets) {
        prevVolume = prevSets.reduce(
          (sum, s) => sum + (s.weight_actual ?? 0) * (s.reps_actual ?? 0),
          0
        );
      }
    }

    // 4. Best PR exercise name
    let bestPR: { exerciseName: string; weight: number } | null = null;
    const prSets = sets.filter((s) => s.is_pr && s.weight_actual > 0);
    if (prSets.length > 0) {
      const best = prSets.reduce((a, b) =>
        (b.weight_actual ?? 0) > (a.weight_actual ?? 0) ? b : a
      );
      const { data: exercise } = await supabase
        .from("exercises")
        .select("name_es, name")
        .eq("id", best.exercise_id)
        .maybeSingle();
      bestPR = {
        exerciseName: exercise?.name_es || exercise?.name || "Ejercicio",
        weight: best.weight_actual,
      };
    }

    // If no PR sets, find best weight this week
    if (!bestPR && sets.length > 0) {
      const heaviest = sets.reduce((a, b) =>
        (b.weight_actual ?? 0) > (a.weight_actual ?? 0) ? b : a
      );
      if (heaviest.weight_actual > 0) {
        const { data: exercise } = await supabase
          .from("exercises")
          .select("name_es, name")
          .eq("id", heaviest.exercise_id)
          .maybeSingle();
        bestPR = {
          exerciseName: exercise?.name_es || exercise?.name || "Ejercicio",
          weight: heaviest.weight_actual,
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
      .lte("scheduled_date", saturdayStr)
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

    // Calculate metrics
    const distinctExercises = new Set(sets.map((s) => s.exercise_id)).size;
    const totalSets = sets.length;
    const totalReps = sets.reduce((sum, s) => sum + (s.reps_actual ?? 0), 0);
    const totalVolume = sets.reduce(
      (sum, s) => sum + (s.weight_actual ?? 0) * (s.reps_actual ?? 0),
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
    });

    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading };
}
