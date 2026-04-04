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
  short_on_time_note: string | null;
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export interface NextCycleInfo {
  cycleNumber: number;
  mesocycleId: string;
  templateProgramId: string;
  startDate: string;
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
  const [nextCycleInfo, setNextCycleInfo] = useState<NextCycleInfo | null>(null);
  const [dismissedCycleId, setDismissedCycleId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const todayStr = formatDate(new Date());

  // Fetch program + all workouts + stats
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
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

    // --- Detect if a new cycle is available ---
    if (programRes.data && wks.length > 0) {
      const prog = programRes.data as ProgramInfo & { mesocycle_id?: string; ai_params?: { template_id?: string } };
      const lastWorkoutDate = wks[wks.length - 1].scheduled_date;
      const todayDate = formatDate(today);

      // Only check if all workouts are in the past or today is past the last workout
      if (lastWorkoutDate < todayDate && prog.mesocycle_id) {
        // Find the template program by name (user_id IS NULL)
        const { data: template } = await supabase
          .from("programs")
          .select("id")
          .is("user_id", null)
          .eq("name", prog.name)
          .single();

        if (template) {
          // Check if there's a LIVE mesocycle with a higher cycle_number
          const { data: currentMc } = await supabase
            .from("mesocycles")
            .select("cycle_number")
            .eq("id", prog.mesocycle_id)
            .single();

          if (currentMc) {
            const { data: newerCycle } = await supabase
              .from("mesocycles")
              .select("id, cycle_number, cycle_start_date")
              .eq("template_program_id", template.id)
              .eq("status", "live")
              .gt("cycle_number", currentMc.cycle_number)
              .order("cycle_number", { ascending: true })
              .limit(1)
              .single();

            if (newerCycle) {
              setNextCycleInfo({
                cycleNumber: newerCycle.cycle_number,
                mesocycleId: newerCycle.id,
                templateProgramId: template.id,
                startDate: newerCycle.cycle_start_date,
              });
            } else {
              setNextCycleInfo(null);
            }
          }
        }
      } else {
        setNextCycleInfo(null);
      }
    }
    } catch {
      // Network error — UI stays in loading state briefly, then recovers on retry
    } finally {
      setLoading(false);
    }
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
    let cancelled = false;
    const fetchDayWorkout = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("workouts")
          .select("id, day_label, workout_type, estimated_duration, is_rest_day, is_completed, coach_note, short_on_time_note, scheduled_date, week_number, workout_sets(id, exercise_id)")
          .eq("user_id", user.id)
          .eq("scheduled_date", selectedDate)
          .maybeSingle();

        if (cancelled) return;

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
            short_on_time_note: data.short_on_time_note,
            scheduled_date: data.scheduled_date,
            week_number: data.week_number,
          });
        } else {
          setSelectedWorkout(null);
        }
      } catch {
        // Network error — don't update state if cancelled
      }
    };
    fetchDayWorkout();
    return () => { cancelled = true; };
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

  // Transition to a new cycle
  const transitionToCycle = useCallback(async () => {
    if (!user || !nextCycleInfo || !programInfo) return;
    setTransitioning(true);

    try {
      // 1. Fetch template workouts for the new cycle
      const { data: templateWorkouts } = await supabase
        .from("workouts")
        .select("*")
        .eq("program_id", nextCycleInfo.templateProgramId)
        .eq("mesocycle_id", nextCycleInfo.mesocycleId)
        .order("scheduled_date", { ascending: true });

      if (!templateWorkouts?.length) {
        setTransitioning(false);
        return;
      }

      // 2. Deactivate current program
      await supabase
        .from("programs")
        .update({ is_active: false })
        .eq("id", programInfo.id);

      // 3. Create new program copy for the user
      const { data: template } = await supabase
        .from("programs")
        .select("*")
        .eq("id", nextCycleInfo.templateProgramId)
        .single();

      if (!template) { setTransitioning(false); return; }

      const { data: newProgram } = await supabase
        .from("programs")
        .insert({
          user_id: user.id,
          name: template.name,
          total_weeks: template.total_weeks,
          current_week: 1,
          current_block: "accumulation",
          is_active: true,
          mesocycle_id: nextCycleInfo.mesocycleId,
          ai_params: {
            assigned_template: template.name,
            template_id: nextCycleInfo.templateProgramId,
            generated_by: "cycle_transition",
            previous_program_id: programInfo.id,
          },
        })
        .select()
        .single();

      if (!newProgram) { setTransitioning(false); return; }

      // 4. Clone workouts with dates from the new cycle
      const templateStart = new Date(templateWorkouts[0].scheduled_date + "T00:00:00");

      const workoutInserts = templateWorkouts.map((tw) => {
        const daysDiff = Math.floor(
          (new Date(tw.scheduled_date + "T00:00:00").getTime() - templateStart.getTime()) / 86400000
        );
        const cycleStart = new Date(nextCycleInfo.startDate + "T00:00:00");
        const newDate = new Date(cycleStart);
        newDate.setDate(cycleStart.getDate() + daysDiff);

        return {
          program_id: newProgram.id,
          user_id: user.id,
          mesocycle_id: nextCycleInfo.mesocycleId,
          scheduled_date: formatDate(newDate),
          week_number: tw.week_number,
          day_label: tw.day_label,
          workout_type: tw.workout_type,
          estimated_duration: tw.estimated_duration,
          is_rest_day: tw.is_rest_day,
          notes: tw.notes,
          coach_note: tw.coach_note,
          short_on_time_note: tw.short_on_time_note,
        };
      });

      const { data: createdWorkouts } = await supabase
        .from("workouts")
        .insert(workoutInserts)
        .select("id, scheduled_date");

      if (!createdWorkouts) { setTransitioning(false); return; }

      // 5. Clone workout_sets
      const dateToNewId: Record<string, string> = {};
      createdWorkouts.forEach((w) => { dateToNewId[w.scheduled_date] = w.id; });

      const dateToOldId: Record<string, string> = {};
      templateWorkouts.forEach((tw) => {
        const daysDiff = Math.floor(
          (new Date(tw.scheduled_date + "T00:00:00").getTime() - templateStart.getTime()) / 86400000
        );
        const cycleStart = new Date(nextCycleInfo.startDate + "T00:00:00");
        const nd = new Date(cycleStart);
        nd.setDate(cycleStart.getDate() + daysDiff);
        dateToOldId[formatDate(nd)] = tw.id;
      });

      for (const dateStr of Object.keys(dateToNewId)) {
        const newWorkoutId = dateToNewId[dateStr];
        const oldWorkoutId = dateToOldId[dateStr];
        if (!oldWorkoutId) continue;

        const { data: tSets } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("workout_id", oldWorkoutId)
          .order("set_order");

        if (!tSets?.length) continue;

        await supabase.from("workout_sets").insert(
          tSets.map((ts) => ({
            workout_id: newWorkoutId,
            user_id: user.id,
            exercise_id: ts.exercise_id,
            set_order: ts.set_order,
            set_type: ts.set_type,
            planned_reps: ts.planned_reps,
            planned_weight: null,
            planned_tempo: ts.planned_tempo,
            planned_rpe: ts.planned_rpe,
            planned_rir: null,
            planned_rest_seconds: ts.planned_rest_seconds,
            coaching_cue_override: ts.coaching_cue_override,
            block_label: ts.block_label,
          }))
        );
      }

      // 6. Refresh everything
      setNextCycleInfo(null);
      await fetchAll();
      // Reset view to today
      const today = new Date();
      setSelectedDate(formatDate(today));
      setViewingWeekMonday(getMonday(today));
    } catch (err) {
      // Cycle transition failed — silent
    } finally {
      setTransitioning(false);
    }
  }, [user, nextCycleInfo, programInfo, fetchAll]);

  const dismissCycle = useCallback(() => {
    if (nextCycleInfo) {
      setDismissedCycleId(nextCycleInfo.mesocycleId);
    }
  }, [nextCycleInfo]);

  // Only show next cycle prompt if not dismissed this session
  const showNextCyclePrompt = nextCycleInfo && nextCycleInfo.mesocycleId !== dismissedCycleId;

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
    // Cycle transition
    showNextCyclePrompt,
    nextCycleInfo,
    transitionToCycle,
    dismissCycle,
    transitioning,
  };
}
