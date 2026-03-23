import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface TodayWorkout {
  id: string;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_rest_day: boolean;
  is_completed: boolean;
  exerciseCount: number;
  setCount: number;
  coach_note: string | null;
}

export interface WeekDay {
  date: string;
  dayLabel: string;
  workoutLabel: string | null;
  isCompleted: boolean;
  isRestDay: boolean;
  isToday: boolean;
  hasWorkout: boolean;
}

export interface QuickStats {
  totalCompleted: number;
  monthPRs: number;
  streak: number;
}

export interface ProgramInfo {
  id: string;
  name: string;
  total_weeks: number;
  current_week: number;
  current_block: string;
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
  const [quickStats, setQuickStats] = useState<QuickStats>({ totalCompleted: 0, monthPRs: 0, streak: 0 });
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date();
    const todayStr = formatDate(today);
    const monday = getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const firstOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));

    const [programRes, todayRes, weekRes, statsRes, prsRes] = await Promise.all([
      supabase
        .from("programs")
        .select("id, name, total_weeks, current_week, current_block")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),

      supabase
        .from("workouts")
        .select("id, day_label, workout_type, estimated_duration, is_rest_day, is_completed, coach_note, workout_sets(id, exercise_id)")
        .eq("user_id", user.id)
        .eq("scheduled_date", todayStr)
        .maybeSingle(),

      supabase
        .from("workouts")
        .select("scheduled_date, is_completed, is_rest_day, day_label, workout_type")
        .eq("user_id", user.id)
        .gte("scheduled_date", formatDate(monday))
        .lte("scheduled_date", formatDate(sunday))
        .order("scheduled_date", { ascending: true }),

      supabase
        .from("workouts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_completed", true),

      supabase
        .from("workout_sets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_pr", true)
        .gte("logged_at", firstOfMonth),
    ]);

    // Program
    if (programRes.data) {
      setProgramInfo(programRes.data as ProgramInfo);
    } else {
      setProgramInfo(null);
    }

    // Today's workout
    if (todayRes.data) {
      const w = todayRes.data;
      const sets = (w.workout_sets as Array<{ id: string; exercise_id: string }>) ?? [];
      const uniqueExercises = new Set(sets.map((s) => s.exercise_id));
      setTodayWorkout({
        id: w.id,
        day_label: w.day_label,
        workout_type: w.workout_type,
        estimated_duration: w.estimated_duration,
        is_rest_day: w.is_rest_day,
        is_completed: w.is_completed,
        exerciseCount: uniqueExercises.size,
        setCount: sets.length,
        coach_note: w.coach_note,
      });
    } else {
      setTodayWorkout(null);
    }

    // Week
    const weekMap = new Map<string, { scheduled_date: string; day_label: string; is_completed: boolean; is_rest_day: boolean; workout_type: string }>();
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

    // Streak
    const { data: recentWorkouts } = await supabase
      .from("workouts")
      .select("scheduled_date, is_completed")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .lte("scheduled_date", todayStr)
      .order("scheduled_date", { ascending: false })
      .limit(30);

    let streak = 0;
    if (recentWorkouts?.length) {
      const check = new Date(today);
      if (!recentWorkouts.find((w) => w.scheduled_date === todayStr)) {
        check.setDate(check.getDate() - 1);
      }
      const completedDates = new Set(recentWorkouts.map((w) => w.scheduled_date));
      for (let i = 0; i < 30; i++) {
        const ds = formatDate(check);
        if (completedDates.has(ds)) {
          streak++;
          check.setDate(check.getDate() - 1);
        } else break;
      }
    }

    setQuickStats({
      totalCompleted: statsRes.count ?? 0,
      monthPRs: prsRes.count ?? 0,
      streak,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { todayWorkout, weekDays, quickStats, programInfo, loading, refetch: fetchAll };
}
