import { useState, useEffect } from "react";
import { Shuffle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SwapBottomSheet from "./SwapBottomSheet";

interface SwapButtonProps {
  exerciseId: string;
  exerciseName: string;
  blockLabel: string;
  workoutId?: string;
  userId?: string;
  onSwapComplete?: () => void;
  size?: number;
}

/**
 * Self-contained swap control: resolves whether this exercise can be swapped,
 * renders the button only when it can, and owns its bottom sheet.
 *
 * Lives apart from ExerciseCard so timer-driven blocks (EMOM, Tabata, cardio)
 * and cue-only blocks (mobility, cooldown) can offer the same control without
 * rendering a strength card.
 */
export default function SwapButton({
  exerciseId,
  exerciseName,
  blockLabel,
  workoutId,
  userId,
  onSwapComplete,
  size = 22,
}: SwapButtonProps) {
  const [open, setOpen] = useState(false);
  const [hasSubs, setHasSubs] = useState(false);
  const [originalExerciseId, setOriginalExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (!workoutId || !userId || !exerciseId) return;
    let cancelled = false;

    const check = async () => {
      // A swap record must win over direct subs. If the athlete already swapped
      // down and the replacement carries its own regressions, checking direct
      // subs first would strand them with no way back up to the original.
      const { data: swapRecord } = await supabase
        .from("workout_exercise_swaps")
        .select("original_exercise_id")
        .eq("user_id", userId)
        .eq("workout_id", workoutId)
        .eq("replacement_exercise_id", exerciseId)
        .eq("block_label", blockLabel)
        .maybeSingle();

      if (cancelled) return;

      if (swapRecord) {
        setHasSubs(true);
        setOriginalExerciseId(swapRecord.original_exercise_id);
        return;
      }

      const { count } = await supabase
        .from("exercise_substitutions")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", exerciseId);

      if (cancelled) return;
      setHasSubs((count ?? 0) > 0);
      setOriginalExerciseId(null);
    };

    check();
    return () => { cancelled = true; };
  }, [exerciseId, workoutId, userId, blockLabel]);

  if (!hasSubs || !workoutId || !userId) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{ width: size, height: size, border: "1px solid hsl(var(--border))" }}
        title="Sustituir ejercicio"
        aria-label={`Sustituir ejercicio · ${exerciseName}`}
      >
        <Shuffle className="h-3 w-3 text-muted-foreground" />
      </button>

      <SwapBottomSheet
        visible={open}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        blockLabel={blockLabel}
        workoutId={workoutId}
        userId={userId}
        originalExerciseId={originalExerciseId}
        onClose={() => setOpen(false)}
        onSwapComplete={() => onSwapComplete?.()}
      />
    </>
  );
}
