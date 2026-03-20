import { useState, useCallback } from "react";
import { ChevronLeft, Check, Dumbbell, Loader2, Quote, Trophy } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import ExerciseVideoOverlay from "./ExerciseVideoOverlay";
import type { WorkoutSetData, ExerciseGroup } from "@/hooks/useWorkoutData";

/** Block labels that use instruction mode (no weight/reps inputs) */
const INSTRUCTION_BLOCKS = ['CARDIO', 'COOLDOWN', 'MOVILIDAD', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];

interface SetInputs {
  weight: string;
  reps: string;
}

interface Props {
  block: WorkoutBlock;
  weightUnit: string;
  saving: boolean;
  onBack: () => void;
  onCompleteSet: (set: WorkoutSetData, data: { actual_weight: number; actual_reps: number }) => Promise<any>;
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weight: number | null; hint: string | null };
  onRestStart: (seconds: number) => void;
}

function formatPrescription(sets: WorkoutSetData[]): string {
  const first = sets[0];
  if (!first) return "";
  const parts: string[] = [];
  parts.push(`${sets.length} × ${first.planned_reps ?? "?"} reps`);
  if (first.planned_tempo) parts.push(`Tempo ${first.planned_tempo}`);
  if (first.planned_rest_seconds) {
    const s = first.planned_rest_seconds;
    parts.push(`Descanso ${s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` : `${s}s`}`);
  }
  return parts.join(" · ");
}

export default function BlockDetail({
  block,
  weightUnit,
  saving,
  onBack,
  onCompleteSet,
  getSuggestedWeight,
  onRestStart,
}: Props) {
  const [setInputs, setSetInputs] = useState<Record<string, SetInputs>>({});
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [videoOverlay, setVideoOverlay] = useState<{ name: string; videoUrl: string | null; coachingCue: string | null } | null>(null);

  const getInputs = useCallback(
    (set: WorkoutSetData): SetInputs => {
      if (setInputs[set.id]) return setInputs[set.id];
      const suggestion = getSuggestedWeight(set.exercise_id, set.planned_reps);
      return {
        weight: set.planned_weight ? String(set.planned_weight) : suggestion.weight != null ? String(suggestion.weight) : "",
        reps: String(set.planned_reps ?? ""),
      };
    },
    [setInputs, getSuggestedWeight]
  );

  const updateInput = (setId: string, field: keyof SetInputs, value: string) => {
    const existing = setInputs[setId] || { weight: "", reps: "" };
    setSetInputs((prev) => ({ ...prev, [setId]: { ...existing, [field]: value } }));
  };

  const handleComplete = async (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    const inputs = getInputs(set);
    const result = await onCompleteSet(set, {
      actual_weight: parseFloat(inputs.weight) || 0,
      actual_reps: parseInt(inputs.reps) || 0,
    });

    if (!result) return;

    // Check PR
    if (result.is_pr) {
      setPrFlash(set.id);
      setTimeout(() => setPrFlash(null), 2000);
    }

    setJustCompleted(set.id);
    setTimeout(() => setJustCompleted(null), 1500);

    // Start rest timer if appropriate
    // For supersets: only after last exercise in the round
    const shouldRest = block.supersetGroup ? isLastInSuperset : true;
    if (shouldRest && set.planned_rest_seconds) {
      onRestStart(set.planned_rest_seconds);
    }
  };

  const isSupersetBlock = block.supersetGroup && block.supersetGroup.type !== "single";
  const restInfo = block.groups[0]?.sets[0]?.planned_rest_seconds;
  const restDisplay = restInfo
    ? restInfo >= 60
      ? `Descanso ${Math.floor(restInfo / 60)}:${(restInfo % 60).toString().padStart(2, "0")}`
      : `Descanso ${restInfo}s`
    : null;
  const isInstructionBlock = INSTRUCTION_BLOCKS.includes(block.name);

  return (
    <div className="flex min-h-screen flex-col bg-background animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              {block.name}
            </h1>
            <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
              {block.totalSets} sets{restDisplay ? ` · ${restDisplay}` : ""}
              {block.formatBadge ? ` · ${block.formatBadge}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {isInstructionBlock ? (
          <div className="flex flex-col gap-4">
            {block.groups.map((group) => (
              <InstructionCard
                key={group.exercise.id}
                group={group}
                saving={saving}
                onCompleteAll={async () => {
                  for (const set of group.sets) {
                    if (!set.is_completed) {
                      await onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 });
                    }
                  }
                }}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        ) : isSupersetBlock ? (
          <SupersetContent
            block={block}
            weightUnit={weightUnit}
            saving={saving}
            getInputs={getInputs}
            updateInput={updateInput}
            handleComplete={handleComplete}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            onOpenVideo={(v) => setVideoOverlay(v)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {block.groups.map((group, gi) => (
              <ExerciseCard
                key={group.exercise.id}
                group={group}
                weightUnit={weightUnit}
                saving={saving}
                getInputs={getInputs}
                updateInput={updateInput}
                onComplete={(set) => handleComplete(set, gi, true)}
                getSuggestedWeight={getSuggestedWeight}
                prFlash={prFlash}
                justCompleted={justCompleted}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video overlay */}
      <ExerciseVideoOverlay
        videoUrl={videoOverlay?.videoUrl ?? null}
        exerciseName={videoOverlay?.name ?? ""}
        coachingCue={videoOverlay?.coachingCue ?? null}
        visible={!!videoOverlay}
        onClose={() => setVideoOverlay(null)}
      />
    </div>
  );
}

function SupersetContent({
  block,
  weightUnit,
  saving,
  getInputs,
  updateInput,
  handleComplete,
  getSuggestedWeight,
  prFlash,
  justCompleted,
  onOpenVideo,
}: {
  block: WorkoutBlock;
  weightUnit: string;
  saving: boolean;
  getInputs: (set: WorkoutSetData) => SetInputs;
  updateInput: (setId: string, field: keyof SetInputs, value: string) => void;
  handleComplete: (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => void;
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null;
  justCompleted: string | null;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const label = block.supersetGroup?.label || "SUPERSET";
  return (
    <div className="flex gap-3">
      {/* Terracotta connector bar */}
      <div className="flex flex-col items-center pt-8">
        <div className="w-[3px] flex-1 rounded-full bg-primary" />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <span
          className="font-mono uppercase text-primary mb-2"
          style={{ fontSize: 9, letterSpacing: "2px", fontWeight: 700 }}
        >
          {label}
        </span>
        {block.groups.map((group, gi) => (
          <ExerciseCard
            key={group.exercise.id}
            group={group}
            weightUnit={weightUnit}
            saving={saving}
            getInputs={getInputs}
            updateInput={updateInput}
            onComplete={(set) => handleComplete(set, gi, gi === block.groups.length - 1)}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            onOpenVideo={onOpenVideo}
          />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  group,
  weightUnit,
  saving,
  getInputs,
  updateInput,
  onComplete,
  getSuggestedWeight,
  prFlash,
  justCompleted,
  onOpenVideo,
}: {
  group: ExerciseGroup;
  weightUnit: string;
  saving: boolean;
  getInputs: (set: WorkoutSetData) => SetInputs;
  updateInput: (setId: string, field: keyof SetInputs, value: string) => void;
  onComplete: (set: WorkoutSetData) => void;
  getSuggestedWeight: (exerciseId: string, plannedReps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null;
  justCompleted: string | null;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const ex = group.exercise;
  const sets = group.sets;
  const completedCount = sets.filter((s) => s.is_completed).length;

  // Get coaching cue: override from first set takes priority
  const cueOverride = (sets[0] as any)?.coaching_cue_override;
  const coachingCue = cueOverride || ex.coaching_cue;

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 mb-3"
    >
      {/* Exercise header */}
      <div className="flex items-start gap-3">
        {/* Thumbnail - tappable for video */}
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue })}
          className="shrink-0 overflow-hidden rounded-lg"
          style={{ width: 64, height: 48 }}
        >
          {ex.thumbnail_url ? (
            <img src={ex.thumbnail_url} alt={ex.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-body text-[15px] font-semibold text-foreground">{ex.name}</p>
          <p className="font-mono text-muted-foreground mt-0.5" style={{ fontSize: 11 }}>
            {formatPrescription(sets)}
          </p>
        </div>

        <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 12 }}>
          {completedCount}/{sets.length}
        </span>
      </div>

      {/* Coaching cue */}
      {coachingCue && (
        <div className="mt-2 flex items-start gap-1.5">
          <Quote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#7A8B5C" }} />
          <p
            className="font-body italic"
            style={{
              fontSize: 12,
              color: "#7A8B5C",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {coachingCue}
          </p>
        </div>
      )}

      {/* Set table */}
      <div className="mt-3">
        {/* Header */}
        <div className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 px-1 mb-1.5">
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>SET</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>RPE</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>PESO</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>REPS</span>
          <span className="font-mono uppercase text-muted-foreground text-center" style={{ fontSize: 9 }}>✓</span>
        </div>

        {sets.map((set, si) => {
          const completed = set.is_completed;
          const inputs = getInputs(set);
          const isWarmup = set.set_type === "warmup";
          const isBackoff = set.set_type === "backoff";
          const isPrFlash = prFlash === set.id;
          const isJustDone = justCompleted === set.id;
          const rpeHigh = (set.planned_rpe ?? 0) >= 9;

          return (
            <div
              key={set.id}
              className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 items-center px-1 py-1.5 rounded-lg transition-all"
              style={{
                opacity: completed ? 0.8 : isWarmup ? 0.6 : 1,
                backgroundColor: isJustDone ? "rgba(199,91,57,0.08)" : undefined,
              }}
            >
              {/* Set number */}
              <div className="flex items-center gap-1">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-foreground"
                  style={{ fontSize: 11, backgroundColor: "hsl(var(--secondary))" }}
                >
                  {si + 1}
                </span>
                {isWarmup && (
                  <span className="font-mono text-muted-foreground" style={{ fontSize: 8 }}>W</span>
                )}
                {isBackoff && (
                  <span className="font-mono" style={{ fontSize: 8, color: "#C9A96E" }}>BK</span>
                )}
              </div>

              {/* RPE badge (read-only) */}
              <span
                className="font-mono rounded-full px-1.5 py-0.5 text-center"
                style={{
                  fontSize: 9,
                  backgroundColor: rpeHigh ? "rgba(199,91,57,0.15)" : "rgba(136,136,136,0.1)",
                  color: rpeHigh ? "#C75B39" : "#888",
                }}
              >
                {set.planned_rpe ? `RPE ${set.planned_rpe}` : "—"}
              </span>

              {/* Weight input */}
              {completed ? (
                <span className="font-mono text-sm text-foreground" style={{ letterSpacing: "0.03em" }}>
                  {set.actual_weight ?? inputs.weight} {weightUnit}
                  {isPrFlash && (
                    <span className="ml-1 font-mono" style={{ fontSize: 9, color: "#C9A96E" }}>PR 🏆</span>
                  )}
                </span>
              ) : (
                <input
                  type="number"
                  step={0.5}
                  value={inputs.weight}
                  onChange={(e) => updateInput(set.id, "weight", e.target.value)}
                  placeholder={weightUnit}
                  className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: "hsl(var(--border))", border: "none", fontSize: 14 }}
                />
              )}

              {/* Reps input */}
              {completed ? (
                <span className="font-mono text-sm text-foreground" style={{ letterSpacing: "0.03em" }}>
                  {set.actual_reps ?? inputs.reps}
                </span>
              ) : (
                <input
                  type="number"
                  step={1}
                  value={inputs.reps}
                  onChange={(e) => updateInput(set.id, "reps", e.target.value)}
                  placeholder={String(set.planned_reps ?? "")}
                  className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: "hsl(var(--border))", border: "none", fontSize: 14 }}
                />
              )}

              {/* Check button */}
              <button
                onClick={() => { if (!completed) onComplete(set); }}
                disabled={completed || saving}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all mx-auto"
                style={{
                  borderColor: completed ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: completed ? "hsl(var(--primary))" : "transparent",
                }}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : completed ? (
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
