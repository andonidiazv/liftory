import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface WorkoutExercise {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  category: string;
  movement_pattern: string;
  equipment_required: string[] | null;
  primary_muscles: string[] | null;
  default_tempo: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  coaching_cue: string | null;
  founder_notes: string | null;
}

export interface WorkoutSetData {
  id: string;
  exercise_id: string;
  set_order: number;
  set_type: string;
  planned_reps: number | null;
  planned_weight: number | null;
  planned_tempo: string | null;
  planned_rpe: number | null;
  planned_rir: number | null;
  planned_rest_seconds: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rpe: number | null;
  actual_rir: number | null;
  is_completed: boolean;
  is_pr: boolean;
  logged_at: string | null;
  exercise: WorkoutExercise | null;
}

export interface WorkoutData {
  id: string;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_completed: boolean;
  is_rest_day: boolean;
  notes: string | null;
  completed_at: string | null;
  scheduled_date: string;
}

export interface ExerciseGroup {
  exercise: WorkoutExercise;
  sets: WorkoutSetData[];
}

/** A superset group is 2-3 consecutive ExerciseGroups that share set_type 'superset' or 'backoff' */
export interface SupersetGroup {
  type: "single" | "superset" | "triset";
  label: string; // "SUPERSET", "TRISET", or empty
  groups: ExerciseGroup[];
}

export function useWorkoutData(workoutId: string | undefined) {
  const { user, profile } = useAuth();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sets, setSets] = useState<WorkoutSetData[]>([]);
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [supersetGroups, setSupersetGroups] = useState<SupersetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastBestWeights, setLastBestWeights] = useState<Record<string, number>>({});

  const weightUnit = profile?.weight_unit || "kg";

  const fetchWorkout = useCallback(async () => {
    // Prevent infinite loading when route/session has no workout context yet
    if (!user || !workoutId) {
      setWorkout(null);
      setSets([]);
      setExerciseGroups([]);
      setLastBestWeights({});
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_sets (
            *,
            exercise:exercises (
              id, name, name_es, description, category, movement_pattern,
              equipment_required, primary_muscles, default_tempo,
              video_url, thumbnail_url, coaching_cue, founder_notes
            )
          )
        `)
        .eq("id", workoutId)
        .maybeSingle();

      if (error || !data) {
        setWorkout(null);
        setSets([]);
        setExerciseGroups([]);
        return;
      }

      const w: WorkoutData = {
        id: data.id,
        day_label: data.day_label,
        workout_type: data.workout_type,
        estimated_duration: data.estimated_duration,
        is_completed: data.is_completed,
        is_rest_day: data.is_rest_day,
        notes: data.notes,
        completed_at: data.completed_at,
        scheduled_date: data.scheduled_date,
      };
      setWorkout(w);

      const rawSets = ((data.workout_sets as any[]) ?? []).sort(
        (a: any, b: any) => a.set_order - b.set_order
      ) as WorkoutSetData[];
      setSets(rawSets);

      // Group by exercise_id preserving order
      const groups: ExerciseGroup[] = [];
      const seen = new Set<string>();
      for (const s of rawSets) {
        if (!seen.has(s.exercise_id) && s.exercise) {
          seen.add(s.exercise_id);
          groups.push({
            exercise: s.exercise,
            sets: rawSets.filter((x) => x.exercise_id === s.exercise_id),
          });
        }
      }
      setExerciseGroups(groups);

      // Build superset groups: consecutive exercises with set_type 'superset' or 'backoff'
      const ssGroups: SupersetGroup[] = [];
      let i = 0;
      while (i < groups.length) {
        const g = groups[i];
        const setType = g.sets[0]?.set_type;
        const isSupersetType = setType === "superset" || setType === "backoff";

        if (isSupersetType) {
          // Collect consecutive exercises with same superset-type
          const cluster: ExerciseGroup[] = [g];
          while (i + 1 < groups.length) {
            const nextType = groups[i + 1].sets[0]?.set_type;
            if (nextType === setType) {
              cluster.push(groups[++i]);
            } else {
              break;
            }
          }
          if (cluster.length >= 2) {
            ssGroups.push({
              type: cluster.length >= 3 ? "triset" : "superset",
              label: cluster.length >= 3 ? "TRI-SET" : "SUPERSET",
              groups: cluster,
            });
          } else {
            ssGroups.push({ type: "single", label: "", groups: cluster });
          }
        } else {
          ssGroups.push({ type: "single", label: "", groups: [g] });
        }
        i++;
      }
      setSupersetGroups(ssGroups);

      // Fetch last best weights for all exercises in this workout
      const exerciseIds = [...new Set(rawSets.map((s) => s.exercise_id))];
      if (exerciseIds.length > 0) {
        const { data: pastSets } = await supabase
          .from("workout_sets")
          .select("exercise_id, planned_reps, actual_weight")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .in("exercise_id", exerciseIds)
          .not("actual_weight", "is", null)
          .order("actual_weight", { ascending: false });

        if (pastSets && pastSets.length > 0) {
          const bestWeights: Record<string, number> = {};
          for (const ps of pastSets) {
            const key = `${ps.exercise_id}_${ps.planned_reps}`;
            if (!(key in bestWeights) && ps.actual_weight != null) {
              bestWeights[key] = ps.actual_weight;
            }
          }
          setLastBestWeights(bestWeights);
        } else {
          setLastBestWeights({});
        }
      } else {
        setLastBestWeights({});
      }
    } finally {
      setLoading(false);
    }
  }, [workoutId, user]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  const completeSet = useCallback(
    async (
      setId: string,
      data: {
        actual_weight: number;
        actual_reps: number;
        actual_rpe: number;
        actual_rir: number;
      }
    ) => {
      setSaving(true);
      const { error } = await supabase
        .from("workout_sets")
        .update({
          actual_weight: data.actual_weight,
          actual_reps: data.actual_reps,
          actual_rpe: data.actual_rpe,
          actual_rir: data.actual_rir,
          is_completed: true,
          logged_at: new Date().toISOString(),
        })
        .eq("id", setId);

      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
        setSaving(false);
        return null;
      }

      // Refetch the set to check is_pr
      const { data: updated } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("id", setId)
        .maybeSingle();

      // Update local state
      setSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? {
                ...s,
                actual_weight: data.actual_weight,
                actual_reps: data.actual_reps,
                actual_rpe: data.actual_rpe,
                actual_rir: data.actual_rir,
                is_completed: true,
                is_pr: updated?.is_pr ?? false,
                logged_at: new Date().toISOString(),
              }
            : s
        )
      );

      // Update exercise groups too
      setExerciseGroups((prev) =>
        prev.map((g) => ({
          ...g,
          sets: g.sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  actual_weight: data.actual_weight,
                  actual_reps: data.actual_reps,
                  actual_rpe: data.actual_rpe,
                  actual_rir: data.actual_rir,
                  is_completed: true,
                  is_pr: updated?.is_pr ?? false,
                  logged_at: new Date().toISOString(),
                }
              : s
          ),
        }))
      );

      setSaving(false);
      return updated;
    },
    []
  );

  const finishWorkout = useCallback(
    async (notes?: string) => {
      if (!workoutId) return;
      setSaving(true);
      const { error } = await supabase
        .from("workouts")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", workoutId);

      if (error) {
        toast({ title: "Error al finalizar", description: error.message, variant: "destructive" });
      } else {
        setWorkout((w) => (w ? { ...w, is_completed: true, completed_at: new Date().toISOString() } : w));
      }
      setSaving(false);
      return !error;
    },
    [workoutId]
  );

  const allSetsCompleted = sets.length > 0 && sets.every((s) => s.is_completed);

  // Helper to get last best weight for a given exercise + reps combo
  const getLastBestWeight = useCallback(
    (exerciseId: string, plannedReps: number | null): number | null => {
      const key = `${exerciseId}_${plannedReps}`;
      return lastBestWeights[key] ?? null;
    },
    [lastBestWeights]
  );

  return {
    workout,
    sets,
    exerciseGroups,
    supersetGroups,
    loading,
    saving,
    weightUnit,
    allSetsCompleted,
    completeSet,
    finishWorkout,
    refetch: fetchWorkout,
    getLastBestWeight,
  };
}
