import { supabase } from "@/integrations/supabase/client";
import { generateProgram } from "@/lib/liftoryEngine";

/**
 * assignProgram — Wrapper that calls the engine with simplified defaults.
 * Will be replaced with a dedicated implementation in the next iteration.
 */
export async function assignProgram(
  userId: string,
  gender: string,
  level: string
): Promise<{ noExercises?: boolean }> {
  return generateProgram(userId, {
    experience_level: level,
    primary_goal: "hypertrophy",
    training_days: 5,
    equipment: "full_gym",
    emotional_barriers: [],
    gender,
    injuries: [],
  });
}
