import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout, sessionBlocks } from "@/data/workout";
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Zap,
  HeartPulse,
  Leaf,
  Check,
  X,
} from "lucide-react";
import Layout from "@/components/Layout";

const iconMap: Record<string, React.ElementType> = {
  Sun,
  Zap,
  HeartPulse,
  Leaf,
};

export default function SessionSummary() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromWorkout = searchParams.get("from") === "workout";
  const { startWorkout, workoutActive, completedSets, currentExerciseIndex } = useApp();

  // Default: expand strength block (or current block if from workout)
  const [expanded, setExpanded] = useState<string[]>(
    fromWorkout ? ["strength"] : ["strength"]
  );

  const toggleBlock = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    if (!workoutActive) startWorkout();
    navigate("/workout", { replace: true });
  };

  const handleClose = () => {
    if (fromWorkout) {
      navigate("/workout", { replace: true });
    } else {
      navigate("/home");
    }
  };

  // Check if exercise is completed (for strength block only)
  const isExerciseComplete = (exerciseName: string) => {
    const ex = todayWorkout.exercises.find((e) => e.name === exerciseName);
    if (!ex) return false;
    return Array.from({ length: ex.sets }, (_, i) => i).every((i) =>
      completedSets.some((c) => c.exerciseId === ex.id && c.setIndex === i)
    );
  };

  // Determine which block is "current" (simplified: strength block active during workout)
  const getCurrentBlockId = () => {
    if (!workoutActive) return null;
    return "strength"; // simplified for prototype
  };

  const currentBlockId = getCurrentBlockId();

  const Wrapper = fromWorkout ? "div" : Layout;
  const wrapperProps = fromWorkout
    ? { className: "min-h-screen bg-background" }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      <div className="animate-fade-up px-5 pt-14 pb-32">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {todayWorkout.name} — {todayWorkout.subtitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sesión completa · 55-65 min · 4 bloques
            </p>
          </div>
          {fromWorkout && (
            <button
              onClick={handleClose}
              className="press-scale flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>

        {/* Blocks */}
        <div className="mt-6 flex flex-col gap-3">
          {sessionBlocks.map((block) => {
            const Icon = iconMap[block.icon] || Zap;
            const isExpanded = expanded.includes(block.id);
            const isCurrent = currentBlockId === block.id;
            const isFuture =
              workoutActive &&
              currentBlockId &&
              sessionBlocks.findIndex((b) => b.id === currentBlockId) <
                sessionBlocks.findIndex((b) => b.id === block.id);

            return (
              <button
                key={block.id}
                onClick={() => toggleBlock(block.id)}
                className={`press-scale w-full text-left rounded-2xl bg-card transition-all duration-300 ${
                  isCurrent ? "ring-2" : ""
                } ${isFuture ? "opacity-60" : ""}`}
                style={{
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  ...(isCurrent
                    ? { borderColor: block.accentColor, ringColor: block.accentColor }
                    : {}),
                }}
              >
                <div className="flex overflow-hidden rounded-2xl">
                  {/* Accent bar */}
                  <div
                    className="w-1 shrink-0 rounded-l-2xl"
                    style={{ backgroundColor: block.accentColor }}
                  />

                  <div className="flex-1 p-4">
                    {/* Collapsed header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor: `${block.accentColor}15`,
                          }}
                        >
                          <Icon
                            className="h-4.5 w-4.5"
                            style={{ color: block.accentColor }}
                          />
                        </div>
                        <div>
                          <p className="font-display text-sm font-bold text-foreground tracking-wide">
                            {block.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {block.exercises.length} ejercicios · {block.estimatedTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.format && (
                          <span
                            className="rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider"
                            style={{
                              backgroundColor: `${block.accentColor}15`,
                              color: block.accentColor,
                            }}
                          >
                            {block.format}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 flex flex-col gap-2 animate-fade-up">
                        {block.exercises.map((ex, i) => {
                          const completed =
                            workoutActive &&
                            block.type === "strength" &&
                            isExerciseComplete(ex.name);

                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                                block.type === "cooldown"
                                  ? "bg-secondary/50"
                                  : "bg-secondary"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {workoutActive && block.type === "strength" && (
                                  <div
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                                      completed
                                        ? "bg-success"
                                        : "border border-border"
                                    }`}
                                  >
                                    {completed && (
                                      <Check className="h-3 w-3 text-success-foreground" />
                                    )}
                                  </div>
                                )}
                                <span className="text-sm font-medium text-foreground truncate">
                                  {ex.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {ex.duration ? (
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {ex.duration}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-mono text-xs text-muted-foreground">
                                      {ex.sets && `${ex.sets}×`}{ex.reps}
                                    </span>
                                    {ex.weight && (
                                      <span className="font-mono text-xs text-foreground font-medium">
                                        {ex.weight}
                                      </span>
                                    )}
                                  </>
                                )}
                                {ex.tempo && (
                                  <span className="font-mono text-[10px] text-primary">
                                    {ex.tempo}
                                  </span>
                                )}
                                {ex.rpe && (
                                  <span
                                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{
                                      backgroundColor: `${block.accentColor}15`,
                                      color: block.accentColor,
                                    }}
                                  >
                                    RPE {ex.rpe}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-4">
        <button
          onClick={handleStart}
          className="press-scale flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-bold text-primary-foreground glow-primary"
        >
          {workoutActive ? "VOLVER AL WORKOUT" : "COMENZAR SESIÓN"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </Wrapper>
  );
}
