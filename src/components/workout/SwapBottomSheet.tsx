import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import ExerciseThumbnail from "./ExerciseThumbnail";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const GOLD = "#C4A24E";
const GREEN_MUTE = "#7A8B5C";
const SHEET_BG = "#15151A";

const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  all_levels: "Todos",
};

const priorityLabels: Record<number, { label: string; sublabel: string }> = {
  0: { label: "Original", sublabel: "Volver al ejercicio del programa" },
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

  const lookupId = originalExerciseId || exerciseId;
  const isAlreadySwapped = !!originalExerciseId && originalExerciseId !== exerciseId;

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setOptions([]);
      return;
    }
    setLoading(true);

    const fetchOptions = async () => {
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
        .filter((o: SubOption) => o.id !== exerciseId);

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
        await supabase
          .from("workout_exercise_swaps")
          .delete()
          .eq("user_id", userId)
          .eq("workout_id", workoutId)
          .eq("original_exercise_id", trueOriginalId);

        toast({ title: "Ejercicio restaurado" });
      } else {
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
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />

      <div
        className="relative w-full max-w-lg"
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
          style={{
            background: SHEET_BG,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTop: "1px solid hsl(var(--border))",
            paddingLeft: 24,
            paddingRight: 24,
            paddingBottom: 32,
            paddingTop: 12,
            animation: "atelierSlideUp 0.25s ease-out",
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-0.5 w-9 rounded-full" style={{ background: "hsl(var(--muted-foreground))", opacity: 0.4 }} />

          {/* ─── CONFIRMATION VIEW ─── */}
          {selected ? (
            <div>
              <button
                onClick={() => setSelected(null)}
                className="press-scale flex items-center gap-2 mb-5"
              >
                <ArrowLeft className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
                <span
                  className="font-mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                >
                  Volver
                </span>
              </button>

              <p
                className="font-mono uppercase mb-3"
                style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
              >
                Confirmar sustitución
              </p>

              <h2
                className="font-display"
                style={{ fontWeight: 300, fontSize: 24, letterSpacing: "-0.03em", lineHeight: 1.1, color: "hsl(var(--foreground))" }}
              >
                Reemplazar <strong style={{ fontWeight: 700 }}>{exerciseName}</strong>
              </h2>
              <p
                className="font-body italic mt-2"
                style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
              >
                por:
              </p>

              {/* Selected exercise — hairline row */}
              <div
                className="flex items-center gap-4 py-4 mt-4"
                style={{
                  borderTop: "1px solid hsl(var(--border))",
                  borderBottom: "1px solid hsl(var(--border))",
                }}
              >
                <div
                  className="shrink-0 overflow-hidden"
                  style={{ width: 56, height: 42, borderRadius: 4 }}
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
                  <p
                    className="font-display"
                    style={{ fontWeight: 600, fontSize: 15, color: "hsl(var(--foreground))", lineHeight: 1.2, letterSpacing: "-0.01em", wordBreak: "break-word" }}
                  >
                    {selected.name}
                  </p>
                  {selected.name_es && selected.name_es !== selected.name && (
                    <p
                      className="font-mono mt-1"
                      style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.7, wordBreak: "break-word" }}
                    >
                      {selected.name_es}
                    </p>
                  )}
                </div>
              </div>

              {/* Atelier CTAs */}
              <div className="mt-7 flex flex-col items-center gap-4">
                <button
                  onClick={handleSwap}
                  disabled={swapping}
                  className="press-scale flex items-center gap-3 disabled:opacity-50"
                >
                  <span
                    className="font-mono uppercase"
                    style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
                  >
                    Sustituir
                  </span>
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: `1px solid ${GOLD}`,
                      boxShadow: swapping ? "none" : `0 0 24px ${GOLD}59`,
                    }}
                  >
                    {swapping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: GOLD }} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" style={{ color: GOLD }} />
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setSelected(null)}
                  disabled={swapping}
                  className="font-mono uppercase disabled:opacity-50"
                  style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* ─── OPTIONS LIST VIEW ─── */
            <div>
              <p
                className="font-mono uppercase mb-2"
                style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
              >
                Cambiar ejercicio
              </p>
              <h2
                className="font-display"
                style={{ fontWeight: 300, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1, color: "hsl(var(--foreground))" }}
              >
                <strong style={{ fontWeight: 700 }}>{exerciseName}</strong>
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: GOLD }} />
                </div>
              ) : options.length === 0 ? (
                <p
                  className="font-body italic text-center py-10"
                  style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
                >
                  No hay sustituciones disponibles para este ejercicio.
                </p>
              ) : (
                <div className="mt-5" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  {options.map((opt) => {
                    const pLabel = priorityLabels[opt.priority] || priorityLabels[1];
                    const accent = opt.priority === 0 ? GOLD
                      : opt.priority === 1 ? GOLD
                      : GREEN_MUTE;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setSelected(opt)}
                        className="press-scale flex w-full items-start gap-4 py-4 text-left"
                        style={{ borderBottom: "1px solid hsl(var(--border))" }}
                      >
                        <div
                          className="shrink-0 overflow-hidden"
                          style={{ width: 56, height: 42, borderRadius: 4 }}
                        >
                          <ExerciseThumbnail
                            thumbnailUrl={opt.thumbnail_url}
                            videoUrl={opt.video_url}
                            name={opt.name}
                            width={56}
                            height={42}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span
                            className="font-mono uppercase block"
                            style={{ fontSize: 8, letterSpacing: "2.5px", color: accent }}
                          >
                            {pLabel.label} · {pLabel.sublabel}
                          </span>
                          <p
                            className="font-display mt-1.5"
                            style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))", letterSpacing: "-0.01em", lineHeight: 1.2, wordBreak: "break-word" }}
                          >
                            {opt.name}
                          </p>
                          {opt.name_es && opt.name_es !== opt.name && (
                            <p
                              className="font-mono mt-0.5"
                              style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.7, wordBreak: "break-word" }}
                            >
                              {opt.name_es}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span
                              className="font-mono uppercase"
                              style={{ fontSize: 8, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
                            >
                              {difficultyLabels[opt.difficulty] ?? opt.difficulty}
                            </span>
                            {opt.primary_muscles.slice(0, 3).map((m) => (
                              <span
                                key={m}
                                className="font-mono uppercase"
                                style={{ fontSize: 8, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))", opacity: 0.7 }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes atelierSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
