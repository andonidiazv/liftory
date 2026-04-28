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
  planned_duration_seconds: number | null;
  planned_rest_seconds: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rpe: number | null;
  actual_rir: number | null;
  is_completed: boolean;
  is_pr: boolean;
  logged_at: string | null;
  coaching_cue_override: string | null;
  block_label: string | null;
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
  week_number: number;
  coach_note: string | null;
  short_on_time_note: string | null;
  program_id: string;
  user_id: string | null;
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

/** Week-over-week delta for a single exercise */
export interface ExerciseDelta {
  setsDelta: number; // +1, -1, 0
  repsFrom: number | null;
  repsTo: number | null;
  rpeFrom: number | null;
  rpeTo: number | null;
  hasChange: boolean;
}

export function useWorkoutData(workoutId: string | undefined) {
  const { user, profile } = useAuth();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sets, setSets] = useState<WorkoutSetData[]>([]);
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([]);
  const [supersetGroups, setSupersetGroups] = useState<SupersetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exerciseE1RM, setExerciseE1RM] = useState<Record<string, number>>({});
  const [avgRirByExercise, setAvgRirByExercise] = useState<Record<string, number>>({});
  const [exerciseDeltas, setExerciseDeltas] = useState<Record<string, ExerciseDelta>>({});

  const weightUnit = profile?.weight_unit || "kg";

  const fetchWorkout = useCallback(async () => {
    if (!user || !workoutId) {
      setWorkout(null);
      setSets([]);
      setExerciseGroups([]);
      setExerciseE1RM({});
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
        week_number: data.week_number,
        coach_note: (data as Record<string, unknown>).coach_note as string | null ?? null,
        short_on_time_note: (data as Record<string, unknown>).short_on_time_note as string | null ?? null,
        program_id: data.program_id,
        user_id: (data as Record<string, unknown>).user_id as string | null ?? null,
      };
      setWorkout(w);

      const rawSets = ((data.workout_sets as WorkoutSetData[]) ?? []).sort(
        (a: WorkoutSetData, b: WorkoutSetData) => a.set_order - b.set_order
      ).map((s: WorkoutSetData) => ({
        ...s,
        block_label: s.block_label ?? null,
      })) as WorkoutSetData[];
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

      // Fetch historical performance and compute e1RM per exercise
      // Window: last 42 days (6 weeks) — keeps suggestions relevant to current fitness
      const exerciseIds = [...new Set(rawSets.map((s) => s.exercise_id))];
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 42);
      if (exerciseIds.length > 0) {
        const { data: pastSets } = await supabase
          .from("workout_sets")
          .select("exercise_id, actual_weight, actual_reps, actual_rir, logged_at")
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .in("exercise_id", exerciseIds)
          .not("actual_weight", "is", null)
          .gt("actual_weight", 0)
          .not("actual_reps", "is", null)
          .gt("actual_reps", 0)
          .gte("logged_at", windowStart.toISOString())
          .order("logged_at", { ascending: false });

        if (pastSets && pastSets.length > 0) {
          // Compute max e1RM per exercise (Epley formula: weight × (1 + reps / 30))
          const maxE1RM: Record<string, number> = {};
          const rirAccum: Record<string, number[]> = {};

          for (const ps of pastSets) {
            // Skip bodyweight (-1) and 0 weight sets — e1RM only valid for loaded lifts
            if ((ps.actual_weight ?? 0) <= 0) continue;
            const e1rm = ps.actual_weight * (1 + ps.actual_reps / 30);
            if (!maxE1RM[ps.exercise_id] || e1rm > maxE1RM[ps.exercise_id]) {
              maxE1RM[ps.exercise_id] = Math.round(e1rm * 10) / 10;
            }
            if (ps.actual_rir != null) {
              if (!rirAccum[ps.exercise_id]) rirAccum[ps.exercise_id] = [];
              if (rirAccum[ps.exercise_id].length < 9) {
                rirAccum[ps.exercise_id].push(ps.actual_rir);
              }
            }
          }
          setExerciseE1RM(maxE1RM);

          const avgRir: Record<string, number> = {};
          for (const [exId, rirs] of Object.entries(rirAccum)) {
            avgRir[exId] = rirs.reduce((a, b) => a + b, 0) / rirs.length;
          }
          setAvgRirByExercise(avgRir);
        } else {
          setExerciseE1RM({});
          setAvgRirByExercise({});
        }
      } else {
        setExerciseE1RM({});
        setAvgRirByExercise({});
      }

      // ── Week-over-week deltas ──
      // Fetch same day_label in same program for the previous week to compare programming changes.
      if (w.week_number > 1 && w.program_id && w.day_label) {
        const { data: prevWk } = await supabase
          .from("workouts")
          .select("id, workout_sets(exercise_id, planned_reps, planned_rpe, set_type)")
          .eq("user_id", user.id)
          .eq("program_id", w.program_id)
          .eq("day_label", w.day_label)
          .eq("week_number", w.week_number - 1)
          .maybeSingle();

        if (prevWk && Array.isArray(prevWk.workout_sets)) {
          // Group previous-week sets by exercise_id (only strength-type sets count)
          type PrevSet = { exercise_id: string; planned_reps: number | null; planned_rpe: number | null; set_type: string };
          const prevByExercise: Record<string, PrevSet[]> = {};
          for (const ps of prevWk.workout_sets as PrevSet[]) {
            if (ps.set_type === "cooldown" || ps.set_type === "warmup") continue;
            if (!prevByExercise[ps.exercise_id]) prevByExercise[ps.exercise_id] = [];
            prevByExercise[ps.exercise_id].push(ps);
          }

          // Group current sets the same way
          const currByExercise: Record<string, PrevSet[]> = {};
          for (const cs of rawSets) {
            if (cs.set_type === "cooldown" || cs.set_type === "warmup") continue;
            if (!currByExercise[cs.exercise_id]) currByExercise[cs.exercise_id] = [];
            currByExercise[cs.exercise_id].push({
              exercise_id: cs.exercise_id,
              planned_reps: cs.planned_reps,
              planned_rpe: cs.planned_rpe,
              set_type: cs.set_type,
            });
          }

          const deltas: Record<string, ExerciseDelta> = {};
          const mode = (arr: (number | null)[]): number | null => {
            const counts = new Map<number, number>();
            for (const v of arr) {
              if (v == null) continue;
              counts.set(v, (counts.get(v) || 0) + 1);
            }
            let best: number | null = null;
            let bestCount = 0;
            for (const [val, c] of counts) {
              if (c > bestCount) { best = val; bestCount = c; }
            }
            return best;
          };

          for (const exId of Object.keys(currByExercise)) {
            const curr = currByExercise[exId];
            const prev = prevByExercise[exId];
            if (!prev || prev.length === 0) continue; // no prior reference — skip

            const setsDelta = curr.length - prev.length;
            const repsFrom = mode(prev.map((s) => s.planned_reps));
            const repsTo = mode(curr.map((s) => s.planned_reps));
            const rpeFrom = mode(prev.map((s) => s.planned_rpe));
            const rpeTo = mode(curr.map((s) => s.planned_rpe));

            const repsChanged = repsFrom != null && repsTo != null && repsFrom !== repsTo;
            const rpeChanged = rpeFrom != null && rpeTo != null && rpeFrom !== rpeTo;
            const hasChange = setsDelta !== 0 || repsChanged || rpeChanged;

            if (hasChange) {
              deltas[exId] = {
                setsDelta,
                repsFrom: repsChanged ? repsFrom : null,
                repsTo: repsChanged ? repsTo : null,
                rpeFrom: rpeChanged ? rpeFrom : null,
                rpeTo: rpeChanged ? rpeTo : null,
                hasChange: true,
              };
            }
          }
          setExerciseDeltas(deltas);
        } else {
          setExerciseDeltas({});
        }
      } else {
        setExerciseDeltas({});
      }
    } catch (err) {
      // Network error or auth refresh failure — don't crash, just stop loading
      console.warn("fetchWorkout error:", err);
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
        actual_rpe: number | null;
        actual_rir: number | null;
      }
    ) => {
      setSaving(true);
      const { error } = await supabase
        .from("workout_sets")
        .update({
          actual_weight: data.actual_weight,
          actual_reps: data.actual_reps,
          actual_rpe: null,
          actual_rir: null,
          is_completed: true,
          logged_at: new Date().toISOString(),
        })
        .eq("id", setId);

      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
        setSaving(false);
        return null;
      }

      const { data: updated } = await supabase
        .from("workout_sets")
        .select("*")
        .eq("id", setId)
        .maybeSingle();

      const serverLoggedAt = updated?.logged_at ?? new Date().toISOString();

      setSets((prev) =>
        prev.map((s) =>
          s.id === setId
            ? {
                ...s,
                actual_weight: data.actual_weight,
                actual_reps: data.actual_reps,
                actual_rpe: null,
                actual_rir: null,
                is_completed: true,
                is_pr: updated?.is_pr ?? false,
                logged_at: serverLoggedAt,
              }
            : s
        )
      );

      setExerciseGroups((prev) =>
        prev.map((g) => ({
          ...g,
          sets: g.sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  actual_weight: data.actual_weight,
                  actual_reps: data.actual_reps,
                  actual_rpe: null,
                  actual_rir: null,
                  is_completed: true,
                  is_pr: updated?.is_pr ?? false,
                  logged_at: serverLoggedAt,
                }
              : s
          ),
        }))
      );

      setSaving(false);
      return updated;
    },
    [setSets, setExerciseGroups, setSaving]
  );

  const updateSetField = useCallback(
    async (
      setId: string,
      field: "actual_weight" | "actual_reps",
      value: number
    ): Promise<boolean> => {
      const { error } = await supabase
        .from("workout_sets")
        .update({ [field]: value })
        .eq("id", setId);

      if (error) {
        toast({
          title: "Error al guardar",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      // Update local state so UI stays in sync
      const updater = (s: WorkoutSetData) =>
        s.id === setId ? { ...s, [field]: value } : s;

      setSets((prev) => prev.map(updater));
      setExerciseGroups((prev) =>
        prev.map((g) => ({ ...g, sets: g.sets.map(updater) }))
      );

      return true;
    },
    [setSets, setExerciseGroups]
  );

  const finishWorkout = useCallback(
    async (notes?: string) => {
      if (!workoutId) return;
      setSaving(true);

      // Preserve original completed_at — re-completing must NOT overwrite it,
      // otherwise the duration calculation breaks (post-session logged_at
      // timestamps slip through the filter and inflate the duration).
      const alreadyCompleted = !!workout?.completed_at;
      const now = new Date().toISOString();

      const updatePayload: Record<string, unknown> = {
        is_completed: true,
        notes: notes || null,
      };
      if (!alreadyCompleted) {
        updatePayload.completed_at = now;
      }

      const { error } = await supabase
        .from("workouts")
        .update(updatePayload)
        .eq("id", workoutId);

      if (error) {
        toast({ title: "Error al finalizar", description: error.message, variant: "destructive" });
      } else {
        setWorkout((w) => (w ? { ...w, is_completed: true, completed_at: w.completed_at || now } : w));
      }
      setSaving(false);
      return !error;
    },
    [workoutId, workout?.completed_at]
  );

  // Separate cooldown sets from main exercise groups
  const cooldownGroups = exerciseGroups.filter(
    (g) => g.sets[0]?.set_type === "cooldown"
  );
  const mainExerciseGroups = exerciseGroups.filter(
    (g) => g.sets[0]?.set_type !== "cooldown"
  );

  const mainSets = sets.filter((s) => s.set_type !== "cooldown");
  const cooldownSets = sets.filter((s) => s.set_type === "cooldown");
  const allSetsCompleted = mainSets.length > 0 && mainSets.every((s) => s.is_completed);
  const cooldownCompleted = cooldownSets.length > 0 && cooldownSets.every((s) => s.is_completed);

  /** Project weight from e1RM for a given rep count using Epley inverse */
  const getProjectedWeight = useCallback(
    (exerciseId: string, reps: number): number | null => {
      const e1rm = exerciseE1RM[exerciseId];
      if (!e1rm || reps <= 0) return null;
      // Epley inverse: weight = e1RM / (1 + reps / 30)
      return Math.round((e1rm / (1 + reps / 30)) * 2) / 2; // round to nearest 0.5
    },
    [exerciseE1RM]
  );

  /** Returns suggested weight in KG (caller converts to display unit) */
  const getSuggestedWeight = useCallback(
    (exerciseId: string, plannedReps: number | null): { weightKg: number | null; hint: string | null } => {
      if (!plannedReps || plannedReps <= 0) return { weightKg: null, hint: null };

      const projectedKg = getProjectedWeight(exerciseId, plannedReps);
      if (projectedKg == null || projectedKg === 0) return { weightKg: null, hint: null };

      // RIR-based adjustment (in kg)
      const smallIncrementKg = 2.5;
      let suggestedKg = projectedKg;

      const avgRir = avgRirByExercise[exerciseId];
      let hint: string | null = null;
      if (avgRir != null) {
        if (avgRir > 3) {
          suggestedKg = projectedKg + smallIncrementKg;
          hint = "RIR alto — sube peso";
        } else if (avgRir < 1) {
          suggestedKg = projectedKg - smallIncrementKg;
          hint = "RIR bajo — baja peso";
        }
      }

      suggestedKg = Math.max(0, suggestedKg);

      return { weightKg: suggestedKg, hint };
    },
    [getProjectedWeight, avgRirByExercise]
  );

  return {
    workout,
    sets,
    exerciseGroups: mainExerciseGroups,
    supersetGroups: supersetGroups.filter(
      (sg) => !sg.groups.every((g) => g.sets[0]?.set_type === "cooldown")
    ),
    cooldownGroups,
    cooldownSets,
    cooldownCompleted,
    loading,
    saving,
    weightUnit,
    allSetsCompleted,
    completeSet,
    updateSetField,
    finishWorkout,
    refetch: fetchWorkout,
    exerciseE1RM,
    getProjectedWeight,
    getSuggestedWeight,
    exerciseDeltas,
  };
}
