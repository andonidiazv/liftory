import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { checkMesocycleComplete, generateNextMesocycle } from "@/lib/liftoryEngine";

export interface TodayWorkout {
  id: string;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_rest_day: boolean;
  is_completed: boolean;
  exerciseCount: number;
  tags: string[];
}

export interface WeekDay {
  date: string;
  dayLabel: string; // L, M, M, J, V, S, D
  workoutLabel: string | null;
  isCompleted: boolean;
  isRestDay: boolean;
  isToday: boolean;
  hasWorkout: boolean;
}

export interface WearableInfo {
  connected: boolean;
  recovery_score: number | null;
  hrv_ms: number | null;
  sleep_score: number | null;
  sleep_duration_minutes: number | null;
}

export interface QuickStats {
  totalCompleted: number;
  monthPRs: number;
  streak: number;
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

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export function useHomeData() {
  const { user } = useAuth();
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [wearable, setWearable] = useState<WearableInfo>({ connected: false, recovery_score: null, hrv_ms: null, sleep_score: null, sleep_duration_minutes: null });
  const [quickStats, setQuickStats] = useState<QuickStats>({ totalCompleted: 0, monthPRs: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [mesocycleTransition, setMesocycleTransition] = useState<{ active: boolean; promise?: Promise<any> }>({ active: false });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check if mesocycle is complete before fetching home data
    const mcCheck = await checkMesocycleComplete(user.id);
    if (mcCheck.isComplete && mcCheck.programId) {
      const genPromise = generateNextMesocycle(user.id, mcCheck.programId);
      setMesocycleTransition({ active: true, promise: genPromise });
      setLoading(false);
      return;
    }

    const today = new Date();
    const todayStr = formatDate(today);
    const monday = getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const now = new Date();
    const firstOfMonth = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));

    // Run all queries in parallel
    const [todayRes, weekRes, wearableConnRes, statsRes, prsRes] = await Promise.all([
      // Today's workout with sets
      supabase
        .from("workouts")
        .select("id, day_label, workout_type, estimated_duration, is_rest_day, is_completed, workout_sets(exercise_id)")
        .eq("user_id", user.id)
        .eq("scheduled_date", todayStr)
        .maybeSingle(),

      // Week workouts
      supabase
        .from("workouts")
        .select("scheduled_date, is_completed, is_rest_day, day_label, workout_type")
        .eq("user_id", user.id)
        .gte("scheduled_date", formatDate(monday))
        .lte("scheduled_date", formatDate(sunday))
        .order("scheduled_date", { ascending: true }),

      // Wearable connection check
      supabase
        .from("onboarding_answers")
        .select("connected_wearable")
        .eq("user_id", user.id)
        .maybeSingle(),

      // Total completed workouts
      supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_completed", true),

      // PRs this month
      supabase
        .from("workout_sets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_pr", true)
        .gte("logged_at", firstOfMonth),
    ]);

    // Process today's workout
    if (todayRes.data) {
      const w = todayRes.data;
      const uniqueExercises = new Set((w.workout_sets as any[])?.map((s: any) => s.exercise_id) ?? []);
      const typeTag = w.workout_type.charAt(0).toUpperCase() + w.workout_type.slice(1);
      setTodayWorkout({
        id: w.id,
        day_label: w.day_label,
        workout_type: w.workout_type,
        estimated_duration: w.estimated_duration,
        is_rest_day: w.is_rest_day,
        is_completed: w.is_completed,
        exerciseCount: uniqueExercises.size,
        tags: [typeTag],
      });
    } else {
      setTodayWorkout(null);
    }

    // Process week
    const weekMap = new Map<string, any>();
    (weekRes.data ?? []).forEach((w) => weekMap.set(w.scheduled_date, w));

    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDate(d);
      const w = weekMap.get(dateStr);
      days.push({
        date: dateStr,
        dayLabel: DAY_LABELS[d.getDay()],
        workoutLabel: w?.day_label ?? null,
        isCompleted: w?.is_completed ?? false,
        isRestDay: w?.is_rest_day ?? false,
        isToday: dateStr === todayStr,
        hasWorkout: !!w,
      });
    }
    setWeekDays(days);

    // Process wearable
    const hasWearable = !!wearableConnRes.data?.connected_wearable;
    if (hasWearable) {
      const { data: wd } = await supabase
        .from("wearable_data")
        .select("recovery_score, hrv_ms, sleep_score, sleep_duration_minutes")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      setWearable({
        connected: true,
        recovery_score: wd?.recovery_score ? Number(wd.recovery_score) : null,
        hrv_ms: wd?.hrv_ms ? Number(wd.hrv_ms) : null,
        sleep_score: wd?.sleep_score ? Number(wd.sleep_score) : null,
        sleep_duration_minutes: wd?.sleep_duration_minutes ?? null,
      });
    } else {
      setWearable({ connected: false, recovery_score: null, hrv_ms: null, sleep_score: null, sleep_duration_minutes: null });
    }

    // Compute streak (consecutive completed days ending today or yesterday)
    const { data: recentWorkouts } = await supabase
      .from("workouts")
      .select("scheduled_date, is_completed")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .lte("scheduled_date", todayStr)
      .order("scheduled_date", { ascending: false })
      .limit(30);

    let streak = 0;
    if (recentWorkouts && recentWorkouts.length > 0) {
      const check = new Date(today);
      // If today's workout isn't completed, start from yesterday
      if (!recentWorkouts.find((w) => w.scheduled_date === todayStr)) {
        check.setDate(check.getDate() - 1);
      }
      const completedDates = new Set(recentWorkouts.map((w) => w.scheduled_date));
      for (let i = 0; i < 30; i++) {
        const ds = formatDate(check);
        if (completedDates.has(ds)) {
          streak++;
          check.setDate(check.getDate() - 1);
        } else {
          break;
        }
      }
    }

    setQuickStats({
      totalCompleted: statsRes.count ?? 0,
      monthPRs: prsRes.count ?? 0,
      streak,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { todayWorkout, weekDays, wearable, quickStats, loading, refetch: fetchAll };
}
