import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, Check, Dumbbell, Loader2, Quote, Trophy } from "lucide-react";
import type { WorkoutBlock } from "./WorkoutOverview";
import ExerciseVideoOverlay from "./ExerciseVideoOverlay";
import type { WorkoutSetData, ExerciseGroup } from "@/hooks/useWorkoutData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Block types by render mode */
const CARDIO_BLOCKS = ['ENGINE BLOCK'];
const MOBILITY_BLOCKS = ['PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];
const COOLDOWN_BLOCKS = ['RECOVERY BLOCK'];

type BlockMode = 'strength' | 'mobility' | 'cooldown' | 'cardio';

function getBlockMode(label: string): BlockMode {
  if (CARDIO_BLOCKS.includes(label)) return 'cardio';
  if (COOLDOWN_BLOCKS.includes(label)) return 'cooldown';
  if (MOBILITY_BLOCKS.includes(label)) return 'mobility';
  return 'strength';
}

/** Render block name with bold main part and normal suffix */
function BlockNameDisplay({ name, className: cls }: { name: string; className?: string }) {
  const dashIdx = name.indexOf(' — ');
  if (dashIdx === -1) {
    return <span className={cls}>{name}</span>;
  }
  return (
    <span className={cls}>
      <span className="font-bold">{name.slice(0, dashIdx)}</span>
      <span className="font-normal">{name.slice(dashIdx)}</span>
    </span>
  );
}

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
  onUncompleteSet: (setId: string) => Promise<boolean>;
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
  onUncompleteSet,
  getSuggestedWeight,
  onRestStart,
}: Props) {
  const [setInputs, setSetInputs] = useState<Record<string, SetInputs>>({});
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [videoOverlay, setVideoOverlay] = useState<{ name: string; videoUrl: string | null; coachingCue: string | null } | null>(null);

  // Optimistic completed state — initialized from DB data
  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of block.groups) {
      for (const s of g.sets) {
        if (s.is_completed) initial.add(s.id);
      }
    }
    return initial;
  });

  const blockMode = getBlockMode(block.name);

  const getInputs = useCallback(
    (set: WorkoutSetData): SetInputs => {
      if (setInputs[set.id]) return setInputs[set.id];
      const suggestion = getSuggestedWeight(set.exercise_id, set.planned_reps);
      return {
        weight: set.actual_weight != null ? String(set.actual_weight) : set.planned_weight ? String(set.planned_weight) : suggestion.weight != null ? String(suggestion.weight) : "",
        reps: set.actual_reps != null ? String(set.actual_reps) : String(set.planned_reps ?? ""),
      };
    },
    [setInputs, getSuggestedWeight]
  );

  const updateInput = (setId: string, field: keyof SetInputs, value: string) => {
    const existing = setInputs[setId] || { weight: "", reps: "" };
    setSetInputs((prev) => ({ ...prev, [setId]: { ...existing, [field]: value } }));
  };

  // Update weight in DB for already-completed set
  const updateCompletedWeight = useCallback(async (setId: string, newWeight: string) => {
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;
    await supabase.from("workout_sets").update({ actual_weight: w }).eq("id", setId);
  }, []);

  const handleComplete = async (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    const inputs = getInputs(set);

    // Optimistic: mark as completed immediately
    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
    setJustCompleted(set.id);
    setTimeout(() => setJustCompleted(null), 1500);

    // Start rest timer optimistically
    const shouldRest = block.supersetGroup ? isLastInSuperset : true;
    if (shouldRest && set.planned_rest_seconds) {
      onRestStart(set.planned_rest_seconds);
    }

    const result = await onCompleteSet(set, {
      actual_weight: parseFloat(inputs.weight) || 0,
      actual_reps: parseInt(inputs.reps) || 0,
    });

    if (!result) {
      // Revert optimistic update
      setOptimisticCompleted((prev) => {
        const next = new Set(prev);
        next.delete(set.id);
        return next;
      });
      toast({ title: "Error al guardar", description: "Intenta de nuevo", variant: "destructive" });
      return;
    }

    if (result.is_pr) {
      setPrFlash(set.id);
      setTimeout(() => setPrFlash(null), 2000);
    }
  };

  const handleUncomplete = async (set: WorkoutSetData) => {
    // Optimistic: remove from completed
    setOptimisticCompleted((prev) => {
      const next = new Set(prev);
      next.delete(set.id);
      return next;
    });

    const ok = await onUncompleteSet(set.id);
    if (!ok) {
      // Revert
      setOptimisticCompleted((prev) => new Set(prev).add(set.id));
      toast({ title: "Error al desmarcar", variant: "destructive" });
    }
  };

  const handleToggleSet = (set: WorkoutSetData, groupIndex: number, isLastInSuperset: boolean) => {
    if (optimisticCompleted.has(set.id)) {
      handleUncomplete(set);
    } else {
      handleComplete(set, groupIndex, isLastInSuperset);
    }
  };

  const isCompleted = (set: WorkoutSetData) => optimisticCompleted.has(set.id);

  const isSupersetBlock = block.supersetGroup && block.supersetGroup.type !== "single";
  const restInfo = block.groups[0]?.sets[0]?.planned_rest_seconds;
  const restDisplay = restInfo
    ? restInfo >= 60
      ? `Descanso ${Math.floor(restInfo / 60)}:${(restInfo % 60).toString().padStart(2, "0")}`
      : `Descanso ${restInfo}s`
    : null;

  const isRecovery = block.name === 'RECOVERY BLOCK';

  return (
    <div className="flex min-h-screen flex-col bg-background animate-slide-in-right">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <BlockNameDisplay
              name={block.name}
              className="font-display text-xl font-bold text-foreground"
            />
            <p className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
              {blockMode === 'strength' && (
                <>{block.totalSets} sets{restDisplay ? ` · ${restDisplay}` : ""}{block.formatBadge ? ` · ${block.formatBadge}` : ""}</>
              )}
              {blockMode === 'mobility' && <>{block.groups.length} ejercicios · 2-3 rondas</>}
              {blockMode === 'cooldown' && <>{block.groups.length} estiramientos · 2 rondas</>}
              {blockMode === 'cardio' && <>Cardio</>}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-8">
        {blockMode === 'cardio' ? (
          <div className="flex flex-col gap-4">
            {block.groups.map((group) => (
              <CardioCard
                key={group.exercise.id}
                group={group}
                saving={saving}
                isCompleted={isCompleted}
                onCompleteAll={async () => {
                  for (const set of group.sets) {
                    if (!isCompleted(set)) {
                      setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                      await onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 });
                    }
                  }
                }}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        ) : blockMode === 'mobility' ? (
          <div className="flex flex-col gap-3">
            {block.groups.map((group) => (
              <MobilityCard
                key={group.exercise.id}
                group={group}
                saving={saving}
                isCompleted={isCompleted}
                onToggle={(set) => {
                  if (optimisticCompleted.has(set.id)) {
                    handleUncomplete(set);
                  } else {
                    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                    setJustCompleted(set.id);
                    setTimeout(() => setJustCompleted(null), 1500);
                    onCompleteSet(set, { actual_weight: 0, actual_reps: set.planned_reps || 1 }).then((result) => {
                      if (!result) {
                        setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
                        toast({ title: "Error", variant: "destructive" });
                      }
                    });
                  }
                }}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        ) : blockMode === 'cooldown' ? (
          <div className="flex flex-col gap-2">
            {block.groups.map((group) => (
              <CooldownCard
                key={group.exercise.id}
                group={group}
                saving={saving}
                isCompleted={isCompleted}
                onToggle={(set) => {
                  if (optimisticCompleted.has(set.id)) {
                    handleUncomplete(set);
                  } else {
                    setOptimisticCompleted((prev) => new Set(prev).add(set.id));
                    onCompleteSet(set, { actual_weight: 0, actual_reps: 1 }).then((result) => {
                      if (!result) {
                        setOptimisticCompleted((prev) => { const n = new Set(prev); n.delete(set.id); return n; });
                        toast({ title: "Error", variant: "destructive" });
                      }
                    });
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
            handleToggle={handleToggleSet}
            updateCompletedWeight={updateCompletedWeight}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            isCompleted={isCompleted}
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
                onToggle={(set) => handleToggleSet(set, gi, true)}
                updateCompletedWeight={updateCompletedWeight}
                getSuggestedWeight={getSuggestedWeight}
                prFlash={prFlash}
                justCompleted={justCompleted}
                isCompleted={isCompleted}
                onOpenVideo={(v) => setVideoOverlay(v)}
              />
            ))}
          </div>
        )}
      </div>

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

/* ═══════ SUPERSET ═══════ */
function SupersetContent({
  block, weightUnit, saving, getInputs, updateInput, handleToggle,
  updateCompletedWeight, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
}: {
  block: WorkoutBlock; weightUnit: string; saving: boolean;
  getInputs: (s: WorkoutSetData) => SetInputs;
  updateInput: (id: string, f: keyof SetInputs, v: string) => void;
  handleToggle: (s: WorkoutSetData, gi: number, last: boolean) => void;
  updateCompletedWeight: (id: string, w: string) => void;
  getSuggestedWeight: (eid: string, reps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null; justCompleted: string | null;
  isCompleted: (s: WorkoutSetData) => boolean;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const label = block.supersetGroup?.label || "SUPERSET";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-8">
        <div className="w-[3px] flex-1 rounded-full bg-primary" />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <span className="font-mono uppercase text-primary mb-2" style={{ fontSize: 9, letterSpacing: "2px", fontWeight: 700 }}>
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
            onToggle={(set) => handleToggle(set, gi, gi === block.groups.length - 1)}
            updateCompletedWeight={updateCompletedWeight}
            getSuggestedWeight={getSuggestedWeight}
            prFlash={prFlash}
            justCompleted={justCompleted}
            isCompleted={isCompleted}
            onOpenVideo={onOpenVideo}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════ STRENGTH EXERCISE CARD ═══════ */
function ExerciseCard({
  group, weightUnit, saving, getInputs, updateInput, onToggle,
  updateCompletedWeight, getSuggestedWeight, prFlash, justCompleted, isCompleted, onOpenVideo,
}: {
  group: ExerciseGroup; weightUnit: string; saving: boolean;
  getInputs: (s: WorkoutSetData) => SetInputs;
  updateInput: (id: string, f: keyof SetInputs, v: string) => void;
  onToggle: (s: WorkoutSetData) => void;
  updateCompletedWeight: (id: string, w: string) => void;
  getSuggestedWeight: (eid: string, reps: number | null) => { weight: number | null; hint: string | null };
  prFlash: string | null; justCompleted: string | null;
  isCompleted: (s: WorkoutSetData) => boolean;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const ex = group.exercise;
  const sets = group.sets;
  const completedCount = sets.filter((s) => isCompleted(s)).length;

  // Only show coaching_cue_override, never exercise.coaching_cue
  const cueOverride = (sets[0] as any)?.coaching_cue_override;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
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

      {cueOverride && (
        <div className="mt-2 flex items-start gap-1.5">
          <Quote className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "#7A8B5C" }} />
          <p className="font-body italic" style={{ fontSize: 12, color: "#7A8B5C", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {cueOverride}
          </p>
        </div>
      )}

      {/* Set table */}
      <div className="mt-3">
        <div className="grid grid-cols-[28px_48px_72px_52px_28px] gap-2 px-1 mb-1.5">
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>SET</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>RPE</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>PESO</span>
          <span className="font-mono uppercase text-muted-foreground" style={{ fontSize: 9 }}>REPS</span>
          <span className="font-mono uppercase text-muted-foreground text-center" style={{ fontSize: 9 }}>✓</span>
        </div>

        {sets.map((set, si) => {
          const completed = isCompleted(set);
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
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full font-mono text-foreground" style={{ fontSize: 11, backgroundColor: "hsl(var(--secondary))" }}>
                  {si + 1}
                </span>
                {isWarmup && <span className="font-mono text-muted-foreground" style={{ fontSize: 8 }}>W</span>}
                {isBackoff && <span className="font-mono" style={{ fontSize: 8, color: "#C9A96E" }}>BK</span>}
              </div>

              <span className="font-mono rounded-full px-1.5 py-0.5 text-center" style={{ fontSize: 9, backgroundColor: rpeHigh ? "rgba(199,91,57,0.15)" : "rgba(136,136,136,0.1)", color: rpeHigh ? "#C75B39" : "#888" }}>
                {set.planned_rpe ? `RPE ${set.planned_rpe}` : "—"}
              </span>

              {/* Weight input — always editable */}
              <input
                type="number"
                step={0.5}
                value={completed ? (set.actual_weight != null ? String(set.actual_weight) : inputs.weight) : inputs.weight}
                onChange={(e) => {
                  updateInput(set.id, "weight", e.target.value);
                  if (completed) updateCompletedWeight(set.id, e.target.value);
                }}
                placeholder={weightUnit}
                className="font-mono text-sm text-foreground rounded-lg px-2 py-1.5 w-full outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: "hsl(var(--border))", border: "none", fontSize: 14 }}
              />

              {/* Reps */}
              {completed ? (
                <span className="font-mono text-sm text-foreground" style={{ letterSpacing: "0.03em" }}>
                  {set.actual_reps ?? inputs.reps}
                  {isPrFlash && <span className="ml-1 font-mono" style={{ fontSize: 9, color: "#C9A96E" }}>PR</span>}
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

              {/* Check button — toggle */}
              <button
                onClick={() => onToggle(set)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all mx-auto"
                style={{
                  borderColor: completed ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: completed ? "hsl(var(--primary))" : "transparent",
                }}
              >
                {completed ? (
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

/* ═══════ MOBILITY CARD ═══════ */
function MobilityCard({
  group, saving, isCompleted, onToggle, onOpenVideo,
}: {
  group: ExerciseGroup; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onToggle: (s: WorkoutSetData) => void;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const ex = group.exercise;
  const sets = group.sets;
  const cueOverride = (sets[0] as any)?.coaching_cue_override;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
          className="shrink-0 overflow-hidden rounded-lg"
          style={{ width: 48, height: 36 }}
        >
          {ex.thumbnail_url ? (
            <img src={ex.thumbnail_url} alt={ex.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-body text-[14px] font-medium text-foreground">{ex.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {sets[0]?.planned_reps && (
              <span className="font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                {sets[0].planned_reps} reps
              </span>
            )}
            {cueOverride && (
              <span className="font-body text-muted-foreground" style={{ fontSize: 11 }}>
                · {cueOverride}
              </span>
            )}
          </div>
        </div>

        {/* Per-set checkmarks — toggleable */}
        <div className="flex gap-1 shrink-0">
          {sets.map((set) => {
            const done = isCompleted(set);
            return (
              <button
                key={set.id}
                onClick={() => onToggle(set)}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all"
                style={{
                  borderColor: done ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: done ? "hsl(var(--primary))" : "transparent",
                }}
              >
                {done && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════ COOLDOWN CARD ═══════ */
function CooldownCard({
  group, saving, isCompleted, onToggle, onOpenVideo,
}: {
  group: ExerciseGroup; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onToggle: (s: WorkoutSetData) => void;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const ex = group.exercise;
  const sets = group.sets;
  const cueOverride = (sets[0] as any)?.coaching_cue_override;
  const allDone = sets.every((s) => isCompleted(s));

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-opacity"
      style={{ opacity: allDone ? 0.6 : 1 }}
    >
      <button
        onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
        className="shrink-0"
      >
        <Dumbbell className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] font-medium text-foreground">{ex.name}</p>
      </div>
      {cueOverride && (
        <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
          {cueOverride}
        </span>
      )}
      {sets.map((set) => {
        const done = isCompleted(set);
        return (
          <button
            key={set.id}
            onClick={() => onToggle(set)}
            disabled={saving}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all shrink-0"
            style={{
              borderColor: done ? "hsl(var(--primary))" : "hsl(var(--border))",
              backgroundColor: done ? "hsl(var(--primary))" : "transparent",
            }}
          >
            {done && <Check className="h-3 w-3 text-primary-foreground" />}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════ CARDIO CARD ═══════ */
function CardioCard({
  group, saving, isCompleted, onCompleteAll, onOpenVideo,
}: {
  group: ExerciseGroup; saving: boolean;
  isCompleted: (s: WorkoutSetData) => boolean;
  onCompleteAll: () => Promise<void>;
  onOpenVideo: (v: { name: string; videoUrl: string | null; coachingCue: string | null }) => void;
}) {
  const [notes, setNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const ex = group.exercise;
  const sets = group.sets;
  const allDone = sets.every((s) => isCompleted(s));
  const cueOverride = (sets[0] as any)?.coaching_cue_override;

  const handleDone = async () => {
    setCompleting(true);
    await onCompleteAll();
    setCompleting(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onOpenVideo({ name: ex.name, videoUrl: ex.video_url, coachingCue: cueOverride })}
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
        </div>
        {allDone && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary shrink-0">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>

      {cueOverride && (
        <p className="mt-3 font-body text-[14px] text-foreground leading-relaxed">
          {cueOverride}
        </p>
      )}

      {!allDone && (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Velocidad, inclinación, observaciones..."
            className="mt-3 w-full rounded-xl bg-secondary p-3 text-sm text-foreground font-body placeholder:text-muted-foreground outline-none resize-none"
            rows={2}
          />
          <button
            onClick={handleDone}
            disabled={saving || completing}
            className="press-scale mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Completado
          </button>
        </>
      )}
    </div>
  );
}
