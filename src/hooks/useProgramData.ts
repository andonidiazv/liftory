import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ProgramData {
  id: string;
  name: string;
  total_weeks: number;
  current_week: number;
  current_block: string;
  is_active: boolean;
}

export interface ProgramWorkout {
  id: string;
  scheduled_date: string;
  week_number: number;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_completed: boolean;
  is_rest_day: boolean;
  completed_at: string | null;
  notes: string | null;
}

const BLOCK_LABELS: Record<string, string> = {
  accumulation: "BASE",
  intensification: "ACUMULACIÓN",
  peaking: "PEAK",
  deload: "DELOAD",
};

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function useProgramData() {
  const { user } = useAuth();
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgram = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: prog } = await supabase
      .from("programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!prog) {
      setProgram(null);
      setWorkouts([]);
      setLoading(false);
      return;
    }

    setProgram({
      id: prog.id,
      name: prog.name,
      total_weeks: prog.total_weeks,
      current_week: prog.current_week,
      current_block: prog.current_block,
      is_active: prog.is_active,
    });

    const { data: wks } = await supabase
      .from("workouts")
      .select("*")
      .eq("program_id", prog.id)
      .order("scheduled_date", { ascending: true });

    setWorkouts(
      ((wks as Array<{ id: string; scheduled_date: string; week_number: number; day_label: string; workout_type: string; estimated_duration: number | null; is_completed: boolean; is_rest_day: boolean; completed_at: string | null; notes: string | null }>) ?? []).map((w) => ({
        id: w.id,
        scheduled_date: w.scheduled_date,
        week_number: w.week_number,
        day_label: w.day_label,
        workout_type: w.workout_type,
        estimated_duration: w.estimated_duration,
        is_completed: w.is_completed,
        is_rest_day: w.is_rest_day,
        completed_at: w.completed_at,
        notes: w.notes,
      }))
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const getBlockLabel = (block: string) => BLOCK_LABELS[block] ?? block.toUpperCase();

  const getWeekWorkouts = (week: number) => workouts.filter((w) => w.week_number === week);

  const getWeekNumbers = () => {
    const weeks = new Set(workouts.map((w) => w.week_number));
    return Array.from(weeks).sort((a, b) => a - b);
  };

  const todayStr = formatDate(new Date());

  return { program, workouts, loading, getBlockLabel, getWeekWorkouts, getWeekNumbers, todayStr };
}
