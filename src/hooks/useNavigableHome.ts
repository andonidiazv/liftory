import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface DayWorkout {
  id: string;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_rest_day: boolean;
  is_completed: boolean;
  exerciseCount: number;
  setCount: number;
  coach_note: string | null;
  scheduled_date: string;
  week_number: number;
}

export interface NavWeekDay {
  date: string;
  dayLabel: string;
  workoutLabel: string | null;
  workoutId: string | null;
  isCompleted: boolean;
  isRestDay: boolean;
  isToday: boolean;
  hasWorkout: boolean;
  isEnabled: boolean;
  workoutType: string | null;
}

export interface ProgramInfo {
  id: string;
  name: string;
  total_weeks: number;
  current_week: number;
  current_block: string;
}

export interface QuickStats {
  totalCompleted: number;
  monthPRs: number;
  streak: number;
}

export interface AllWorkoutDay {
  date: string;
  workoutId: string | null;
  isCompleted: boolean;
  isRestDay: boolean;
  workoutType: string | null;
  dayLabel: string | null;
  weekNumber: number;
}

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

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

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function useNavigableHome() {
  const { user } = useAuth();
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<AllWorkoutDay[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats>({ totalCompleted: 0, monthPRs: 0, streak: 0 });
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [viewingWeekMonday, setViewingWeekMonday] = useState<Date>(getMonday(new Date()));
  const [selectedWorkout, setSelectedWorkout] = useState<DayWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(1);

  const todayStr = formatDate(new Date());

  // Fetch program + all workouts + stats
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const today = new Date();
    const firstOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));

    const [programRes, allWorkoutsRes, statsRes, prsRes] = await Promise.all([
      supabase
        .from("programs")
        .select("id, name, total_weeks, current_week, current_block")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),

      supabase
        .from("workouts")
        .select("id, scheduled_date, day_label, workout_type, estimated_duration, is_rest_day, is_completed, coach_note, week_number, workout_sets(id, exercise_id)")
        .eq("user_id", user.id)
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

    if (programRes.data) {
      setProgramInfo(programRes.data as ProgramInfo);
    } else {
      setProgramInfo(null);
    }

    const wks = (allWorkoutsRes.data as Array<{ id: string; scheduled_date: string; is_completed: boolean; is_rest_day: boolean; workout_type: string; day_label: string; week_number: number }>) ?? [];
    const mapped: AllWorkoutDay[] = wks.map((w) => ({
      date: w.scheduled_date,
      workoutId: w.id,
      isCompleted: w.is_completed,
      isRestDay: w.is_rest_day,
      workoutType: w.workout_type,
      dayLabel: w.day_label,
      weekNumber: w.week_number,
    }));
    setAllWorkouts(mapped);

    // Determine current week from workouts near today
    if (wks.length > 0) {
      const todayWk = wks.find((w) => w.scheduled_date === formatDate(today));
      if (todayWk) {
        setCurrentWeekNumber(todayWk.week_number);
      } else {
        // Find closest workout to today
        let closest = wks[0];
        let minDist = Infinity;
        for (const w of wks) {
          const dist = Math.abs(new Date(w.scheduled_date).getTime() - today.getTime());
          if (dist < minDist) { minDist = dist; closest = w; }
        }
        setCurrentWeekNumber(closest.week_number);
      }
    }

    // Streak
    const { data: recentWorkouts } = await supabase
      .from("workouts")
      .select("scheduled_date, is_completed")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .lte("scheduled_date", formatDate(today))
      .order("scheduled_date", { ascending: false })
      .limit(30);

    let streak = 0;
    if (recentWorkouts?.length) {
      const check = new Date(today);
      if (!recentWorkouts.find((w) => w.scheduled_date === formatDate(today))) {
        check.setDate(check.getDate() - 1);
      }
      const completedDates = new Set(recentWorkouts.map((w) => w.scheduled_date));
      for (let i = 0; i < 30; i++) {
        if (completedDates.has(formatDate(check))) {
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

  // Max allowed week = currentWeekNumber + 1
  const maxAllowedWeek = useMemo(() => {
    if (!programInfo) return 999;
    return Math.min(currentWeekNumber + 1, programInfo.total_weeks);
  }, [currentWeekNumber, programInfo]);

  // Min date and max date from workouts
  const { minDate, maxDate } = useMemo(() => {
    if (allWorkouts.length === 0) return { minDate: null, maxDate: null };
    const enabledWorkouts = allWorkouts.filter(w => w.weekNumber <= maxAllowedWeek);
    if (enabledWorkouts.length === 0) return { minDate: null, maxDate: null };
    // Min = monday of week 1
    const firstDate = enabledWorkouts[0].date;
    const firstMonday = getMonday(new Date(firstDate + "T12:00:00"));
    // Max = sunday of max allowed week
    const lastDate = enabledWorkouts[enabledWorkouts.length - 1].date;
    const lastMonday = getMonday(new Date(lastDate + "T12:00:00"));
    const lastSunday = addDays(lastMonday, 6);
    return { minDate: formatDate(firstMonday), maxDate: formatDate(lastSunday) };
  }, [allWorkouts, maxAllowedWeek]);

  // Build week days for the viewing week
  const weekDays = useMemo((): NavWeekDay[] => {
    const days: NavWeekDay[] = [];
    const workoutMap = new Map<string, AllWorkoutDay>();
    allWorkouts.forEach(w => workoutMap.set(w.date, w));

    for (let i = 0; i < 7; i++) {
      const d = addDays(viewingWeekMonday, i);
      const dateStr = formatDate(d);
      const w = workoutMap.get(dateStr);
      const isEnabled = (!minDate || dateStr >= minDate) && (!maxDate || dateStr <= maxDate);
      days.push({
        date: dateStr,
        dayLabel: DAY_LABELS[d.getDay()],
        workoutLabel: w?.dayLabel ?? null,
        workoutId: w?.workoutId ?? null,
        isCompleted: w?.isCompleted ?? false,
        isRestDay: w?.isRestDay ?? false,
        isToday: dateStr === todayStr,
        hasWorkout: !!w,
        isEnabled,
        workoutType: w?.workoutType ?? null,
      });
    }
    return days;
  }, [viewingWeekMonday, allWorkouts, todayStr, minDate, maxDate]);

  // Viewing week number
  const viewingWeekNumber = useMemo(() => {
    const mondayStr = formatDate(viewingWeekMonday);
    // Find a workout in this week to get week_number
    for (const w of allWorkouts) {
      const wMonday = getMonday(new Date(w.date + "T12:00:00"));
      if (formatDate(wMonday) === mondayStr) return w.weekNumber;
    }
    return null;
  }, [viewingWeekMonday, allWorkouts]);

  // Fetch selected day's workout detail
  useEffect(() => {
    const fetchDayWorkout = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("workouts")
        .select("id, day_label, workout_type, estimated_duration, is_rest_day, is_completed, coach_note, scheduled_date, week_number, workout_sets(id, exercise_id)")
        .eq("user_id", user.id)
        .eq("scheduled_date", selectedDate)
        .maybeSingle();

      if (data) {
        const sets = (data.workout_sets as Array<{ id: string; exercise_id: string }>) ?? [];
        const uniqueExercises = new Set(sets.map((s) => s.exercise_id));
        setSelectedWorkout({
          id: data.id,
          day_label: data.day_label,
          workout_type: data.workout_type,
          estimated_duration: data.estimated_duration,
          is_rest_day: data.is_rest_day,
          is_completed: data.is_completed,
          exerciseCount: uniqueExercises.size,
          setCount: sets.length,
          coach_note: data.coach_note,
          scheduled_date: data.scheduled_date,
          week_number: data.week_number,
        });
      } else {
        setSelectedWorkout(null);
      }
    };
    fetchDayWorkout();
  }, [selectedDate, user]);

  const selectDay = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    // Navigate week bar to the week containing this date
    const d = new Date(dateStr + "T12:00:00");
    const monday = getMonday(d);
    setViewingWeekMonday(monday);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setViewingWeekMonday(prev => {
      const newMonday = addDays(prev, -7);
      const newMondayStr = formatDate(newMonday);
      if (minDate && newMondayStr < minDate) return prev;
      // Select first day of new week
      setSelectedDate(formatDate(newMonday));
      return newMonday;
    });
  }, [minDate]);

  const goToNextWeek = useCallback(() => {
    setViewingWeekMonday(prev => {
      const newMonday = addDays(prev, 7);
      const newSunday = addDays(newMonday, 6);
      if (maxDate && formatDate(newMonday) > maxDate) return prev;
      setSelectedDate(formatDate(newMonday));
      return newMonday;
    });
  }, [maxDate]);

  const canGoPrev = useMemo(() => {
    if (!minDate) return false;
    const prevMonday = addDays(viewingWeekMonday, -7);
    const prevSunday = addDays(prevMonday, 6);
    return formatDate(prevSunday) >= minDate;
  }, [viewingWeekMonday, minDate]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return false;
    const nextMonday = addDays(viewingWeekMonday, 7);
    return formatDate(nextMonday) <= maxDate;
  }, [viewingWeekMonday, maxDate]);

  return {
    programInfo,
    selectedDate,
    selectedWorkout,
    weekDays,
    viewingWeekNumber,
    currentWeekNumber,
    maxAllowedWeek,
    quickStats,
    allWorkouts,
    minDate,
    maxDate,
    loading,
    todayStr,
    selectDay,
    goToPrevWeek,
    goToNextWeek,
    canGoPrev,
    canGoNext,
    refetch: fetchAll,
  };
}
