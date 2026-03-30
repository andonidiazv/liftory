import { useState, useEffect, useCallback } from "react";
import { Loader2, X, ChevronRight, ArrowLeft } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all_levels: "Todos",
};
const difficultyColors: Record<string, string> = {
  beginner: "bg-[#7A8B5C]/20 text-[#7A8B5C]",
  intermediate: "bg-[#C9A96E]/20 text-[#C9A96E]",
  advanced: "bg-[#C75B39]/20 text-[#C75B39]",
  all_levels: "bg-secondary text-muted-foreground",
};
const priorityLabels: Record<number, { label: string; sublabel: string; color?: string }> = {
  0: { label: "Original", sublabel: "Volver al ejercicio del programa", color: "#C9A96E" },
  1: { label: "Opción 1", sublabel: "Regresión más cercana" },
  2: { label: "Opción 2", sublabel: "Alternativa más accesible" },
};

interface SubOption {
  id: string;
  name: string;
  name_es: string;
  thumbnail_url: string | null;
  video_url: string | null;
  difficulty: string;
  primary_muscles: string[];
  priority: number;
}

interface SwapBottomSheetProps {
  visible: boolean;
  exerciseId: string;
  exerciseName: string;
  blockLabel: string;
  workoutId: string;
  userId: string;
  /** The original template exercise ID (if user already swapped) */
  originalExerciseId?: string | null;
  onClose: () => void;
  onSwapComplete: () => void;
}

export default function SwapBottomSheet({
  visible,
  exerciseId,
  exerciseName,
  blockLabel,
  workoutId,
  userId,
  originalExerciseId,
  onClose,
  onSwapComplete,
}: SwapBottomSheetProps) {
  const [options, setOptions] = useState<SubOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SubOption | null>(null);
  const [swapping, setSwapping] = useState(false);

  // The exercise whose substitutions we look up — always the original template exercise
  const lookupId = originalExerciseId || exerciseId;
  const isAlreadySwapped = !!originalExerciseId && originalExerciseId !== exerciseId;

  // Fetch substitution options when sheet opens
  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setOptions([]);
      return;
    }
    setLoading(true);

    const fetchOptions = async () => {
      // 1. Fetch subs from the ORIGINAL exercise (always)
      const { data: subsData } = await supabase
        .from("exercise_substitutions")
        .select(
          "substitute_exercise_id, priority, exercises!exercise_substitutions_substitute_exercise_id_fkey(id, name, name_es, thumbnail_url, video_url, difficulty, primary_muscles)"
        )
        .eq("exercise_id", lookupId)
        .order("priority")
        .limit(3);

      const subs: SubOption[] = (subsData || [])
        .map((d: any) => ({
          id: d.exercises?.id,
          name: d.exercises?.name || "",
          name_es: d.exercises?.name_es || "",
          thumbnail_url: d.exercises?.thumbnail_url,
          video_url: d.exercises?.video_url,
          difficulty: d.exercises?.difficulty || "intermediate",
          primary_muscles: d.exercises?.primary_muscles || [],
          priority: d.priority,
        }))
        .filter((o: SubOption) => o.id)
        // Don't show the currently active exercise as an option
        .filter((o: SubOption) => o.id !== exerciseId);

      // 2. If user already swapped, add "Volver al original" as priority 0
      if (isAlreadySwapped) {
        const { data: origEx } = await supabase
          .from("exercises")
          .select("id, name, name_es, thumbnail_url, video_url, difficulty, primary_muscles")
          .eq("id", originalExerciseId)
          .single();

        if (origEx) {
          subs.unshift({
            id: origEx.id,
            name: origEx.name,
            name_es: origEx.name_es || "",
            thumbnail_url: origEx.thumbnail_url,
            video_url: origEx.video_url,
            difficulty: origEx.difficulty || "advanced",
            primary_muscles: origEx.primary_muscles || [],
            priority: 0,
          });
        }
      }

      setOptions(subs);
      setLoading(false);
    };

    fetchOptions();
  }, [visible, exerciseId, lookupId, isAlreadySwapped, originalExerciseId]);

  const handleSwap = useCallback(async () => {
    if (!selected) return;
    setSwapping(true);
    try {
      // Update the actual workout sets
      const { error: setErr } = await supabase
        .from("workout_sets")
        .update({ exercise_id: selected.id })
        .eq("workout_id", workoutId)
        .eq("exercise_id", exerciseId)
        .eq("block_label", blockLabel);

      if (setErr) throw setErr;

      const trueOriginalId = originalExerciseId || exerciseId;
      const isRestoringOriginal = selected.id === trueOriginalId;

      if (isRestoringOriginal) {
        // User is going back to original — remove swap record
        await supabase
          .from("workout_exercise_swaps")
          .delete()
          .eq("user_id", userId)
          .eq("workout_id", workoutId)
          .eq("original_exercise_id", trueOriginalId);

        toast({ title: "Ejercicio restaurado" });
      } else {
        // Save/update swap record (always track from original)
        await supabase.from("workout_exercise_swaps").upsert(
          {
            user_id: userId,
            workout_id: workoutId,
            original_exercise_id: trueOriginalId,
            replacement_exercise_id: selected.id,
            block_label: blockLabel,
          },
          { onConflict: "user_id,workout_id,original_exercise_id" }
        );

        toast({ title: "Ejercicio sustituido" });
      }

      onClose();
      onSwapComplete();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSwapping(false);
    }
  }, [selected, workoutId, exerciseId, blockLabel, userId, originalExerciseId, onClose, onSwapComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          const startY = e.touches[0].clientY;
          const handleMove = (ev: TouchEvent) => {
            if (ev.touches[0].clientY - startY > 80) {
              onClose();
              document.removeEventListener("touchmove", handleMove);
            }
          };
          document.addEventListener("touchmove", handleMove, { passive: true });
          document.addEventListener(
            "touchend",
            () => document.removeEventListener("touchmove", handleMove),
            { once: true }
          );
        }}
      >
        <div
          className="rounded-t-2xl px-5 pb-8 pt-3"
          style={{
            backgroundColor: "hsl(var(--card))",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

          {/* ─── CONFIRMATION VIEW ─── */}
          {selected ? (
            <div className="animate-fade-up">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-muted-foreground mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-body text-sm">Volver</span>
              </button>

              <p className="font-display text-lg font-semibold text-foreground">
                Confirmar sustitución
              </p>
              <p className="mt-1 text-sm text-muted-foreground font-body">
                ¿Sustituir{" "}
                <span className="text-foreground font-medium">{exerciseName}</span>{" "}
                por:
              </p>

              {/* Selected exercise card */}
              <div
                className="mt-4 flex items-center gap-3 rounded-xl p-3"
                style={{ background: "hsl(var(--secondary))" }}
              >
                <div
                  className="shrink-0 overflow-hidden rounded-lg"
                  style={{ width: 56, height: 42 }}
                >
                  <ExerciseThumbnail
                    thumbnailUrl={selected.thumbnail_url}
                    videoUrl={selected.video_url}
                    name={selected.name}
                    width={56}
                    height={42}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[15px] font-semibold text-foreground truncate">
                    {selected.name}
                  </p>
                  <p className="font-body text-xs text-muted-foreground truncate">
                    {selected.name_es}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="flex-1 rounded-xl py-3 font-body text-sm font-medium text-foreground"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSwap}
                  disabled={swapping}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-body text-sm font-medium text-primary-foreground disabled:opacity-50"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  {swapping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Sustituir
                </button>
              </div>
            </div>
          ) : (
            /* ─── OPTIONS LIST VIEW ─── */
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-lg font-semibold text-foreground">
                  Cambiar ejercicio
                </p>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Reemplazar{" "}
                <span className="text-foreground font-medium">{exerciseName}</span>
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : options.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body py-8 text-center">
                  No hay sustituciones disponibles para este ejercicio.
                </p>
              ) : (
                <div className="space-y-3">
                  {options.map((opt) => {
                    const pLabel =
                      priorityLabels[opt.priority] || priorityLabels[1];
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelected(opt)}
                        className="flex w-full items-start gap-3 rounded-xl p-3 transition-all press-scale text-left"
                        style={{ background: "hsl(var(--secondary))" }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="shrink-0 overflow-hidden rounded-lg"
                          style={{ width: 56, height: 42 }}
                        >
                          <ExerciseThumbnail
                            thumbnailUrl={opt.thumbnail_url}
                            videoUrl={opt.video_url}
                            name={opt.name}
                            width={56}
                            height={42}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Priority label */}
                          <span
                            className="font-mono uppercase mb-1 block"
                            style={{
                              fontSize: 9,
                              letterSpacing: "1.5px",
                              color: pLabel.color || (opt.priority === 1 ? "#C9A96E" : "#7A8B5C"),
                            }}
                          >
                            {pLabel.label} — {pLabel.sublabel}
                          </span>

                          {/* Name */}
                          <p className="font-body text-[14px] font-semibold text-foreground truncate">
                            {opt.name}
                          </p>
                          <p className="font-body text-xs text-muted-foreground truncate">
                            {opt.name_es}
                          </p>

                          {/* Badges row */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {/* Difficulty */}
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono ${
                                difficultyColors[opt.difficulty] ??
                                "bg-secondary text-muted-foreground"
                              }`}
                              style={{ fontSize: 9, letterSpacing: "0.03em" }}
                            >
                              {difficultyLabels[opt.difficulty] ?? opt.difficulty}
                            </span>
                            {/* Muscles (max 3) */}
                            {opt.primary_muscles.slice(0, 3).map((m) => (
                              <span
                                key={m}
                                className="rounded px-1.5 py-0.5 font-mono text-muted-foreground"
                                style={{
                                  fontSize: 9,
                                  background: "hsl(var(--border))",
                                }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
