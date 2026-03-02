import { useState, useMemo } from "react";
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

  const getCurrentBlockId = () => {
    if (!workoutActive) return null;
    return "strength";
  };

  const currentBlockId = getCurrentBlockId();

  const [expanded, setExpanded] = useState<string[]>(
    fromWorkout && currentBlockId ? [currentBlockId] : ["strength"]
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

  const isExerciseComplete = (exerciseName: string) => {
    const ex = todayWorkout.exercises.find((e) => e.name === exerciseName);
    if (!ex) return false;
    return Array.from({ length: ex.sets }, (_, i) => i).every((i) =>
      completedSets.some((c) => c.exerciseId === ex.id && c.setIndex === i)
    );
  };

  const isCurrentExercise = (exerciseName: string) => {
    if (!workoutActive) return false;
    const ex = todayWorkout.exercises[currentExerciseIndex];
    return ex?.name === exerciseName;
  };

  const getBlockProgress = (block: typeof sessionBlocks[0]) => {
    if (block.type !== "strength") return { completed: 0, total: block.exercises.length };
    const completed = block.exercises.filter((ex) => isExerciseComplete(ex.name)).length;
    return { completed, total: block.exercises.length };
  };

  const isBlockComplete = (block: typeof sessionBlocks[0]) => {
    const { completed, total } = getBlockProgress(block);
    return completed === total && workoutActive;
  };

  const isBlockFuture = (block: typeof sessionBlocks[0]) => {
    if (!workoutActive || !currentBlockId) return false;
    const currentIdx = sessionBlocks.findIndex((b) => b.id === currentBlockId);
    const blockIdx = sessionBlocks.findIndex((b) => b.id === block.id);
    return blockIdx > currentIdx;
  };

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
            <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {todayWorkout.name} — {todayWorkout.subtitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body font-light">
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
            const isCurrent = currentBlockId === block.id && workoutActive;
            const isFuture = isBlockFuture(block);
            const blockComplete = isBlockComplete(block);
            const { completed: blockCompletedCount, total: blockTotal } = getBlockProgress(block);

            return (
              <button
                key={block.id}
                onClick={() => toggleBlock(block.id)}
                className={`press-scale w-full text-left bg-card transition-all duration-300 ${
                  isCurrent ? "ring-2 ring-primary" : ""
                }`}
                style={{
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  opacity: isFuture && !isExpanded ? 0.6 : 1,
                }}
              >
                <div className="flex overflow-hidden" style={{ borderRadius: 12 }}>
                  {/* Accent bar */}
                  <div
                    className="w-1 shrink-0"
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
                          <div className="flex items-center gap-2">
                            <p className="font-display text-sm font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                              {block.name}
                            </p>
                            {blockComplete && (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                                <Check className="h-3 w-3 text-success-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-body font-normal">
                            {block.exercises.length} ejercicios · {block.estimatedTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.format && (
                          <span
                            className="px-2 py-1 font-mono"
                            style={{
                              backgroundColor: `${block.accentColor}15`,
                              color: block.accentColor,
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.05em",
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

                    {/* Mini progress bar */}
                    {workoutActive && block.type === "strength" && (
                      <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(blockCompletedCount / blockTotal) * 100}%`,
                            backgroundColor: blockComplete
                              ? "hsl(var(--success))"
                              : block.accentColor,
                          }}
                        />
                      </div>
                    )}

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 flex flex-col gap-2 animate-fade-up">
                        {block.exercises.map((ex, i) => {
                          const completed =
                            workoutActive &&
                            block.type === "strength" &&
                            isExerciseComplete(ex.name);
                          const current =
                            workoutActive &&
                            block.type === "strength" &&
                            isCurrentExercise(ex.name);

                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                                block.type === "cooldown"
                                  ? "bg-secondary/50"
                                  : "bg-secondary"
                              } ${current ? "border-l-[3px] border-primary" : ""}`}
                              style={{
                                opacity: completed ? 0.5 : 1,
                              }}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {workoutActive && block.type === "strength" && (
                                  <>
                                    {completed ? (
                                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                                        <Check className="h-3 w-3 text-success-foreground" />
                                      </div>
                                    ) : current ? (
                                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary animate-pulse-ring" />
                                    ) : (
                                      <div className="h-5 w-5 shrink-0 rounded-full border border-border" />
                                    )}
                                  </>
                                )}
                                <span className="text-sm font-body font-normal text-foreground truncate">
                                  {ex.name}
                                </span>
                              </div>
                              {!completed && (
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {ex.duration ? (
                                    <span className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: "0.05em" }}>
                                      {ex.duration}
                                    </span>
                                  ) : (
                                    <>
                                      <span className="font-mono text-xs text-muted-foreground" style={{ letterSpacing: "0.05em" }}>
                                        {ex.sets && `${ex.sets}×`}{ex.reps}
                                      </span>
                                      {ex.weight && (
                                        <span className="font-mono text-xs text-foreground font-medium" style={{ letterSpacing: "0.05em" }}>
                                          {ex.weight}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {ex.tempo && (
                                    <span className="font-mono text-primary" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
                                      {ex.tempo}
                                    </span>
                                  )}
                                  {ex.rpe && (
                                    <span
                                      className="px-1.5 py-0.5 font-mono"
                                      style={{
                                        backgroundColor: `${block.accentColor}15`,
                                        color: block.accentColor,
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 600,
                                      }}
                                    >
                                      RPE {ex.rpe}
                                    </span>
                                  )}
                                </div>
                              )}
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
          className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
        >
          {workoutActive ? "Volver al workout" : "Comenzar sesión"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </Wrapper>
  );
}
