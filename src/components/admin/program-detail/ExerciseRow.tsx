import { Shuffle, X } from "lucide-react";
import type { DraftSet } from "./types";

interface ExerciseRowProps {
  exerciseGroup: {
    exerciseId: string;
    exerciseName: string;
    exerciseNameEs: string;
    sets: DraftSet[];
  };
  blockColor: string;
  onEdit: (set: DraftSet) => void;
  onDelete: () => void;
  onSwap: () => void;
}

export function ExerciseRow({
  exerciseGroup,
  blockColor,
  onEdit,
  onDelete,
  onSwap,
}: ExerciseRowProps) {
  const firstSet = exerciseGroup.sets[0];
  if (!firstSet) return null;

  const setCount = exerciseGroup.sets.length;

  const setTypeAbbr: Record<string, string> = {
    working: "WRK",
    warmup: "WU",
    amrap: "AMRAP",
    emom: "EMOM",
    backoff: "BO",
    superset: "SS",
    cooldown: "CD",
    dropset: "DS",
  };

  return (
    <div
      className="group flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition-colors hover:opacity-90"
      style={{ backgroundColor: "transparent" }}
      onClick={() => onEdit(firstSet)}
    >
      {/* Colored dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: blockColor }}
      />

      {/* Exercise name */}
      <span
        className="font-body text-sm truncate flex-1 min-w-0"
        style={{ color: "#FAF8F5" }}
        title={exerciseGroup.exerciseName}
      >
        {exerciseGroup.exerciseName}
      </span>

      {/* Set count */}
      <span className="font-mono text-xs flex-shrink-0" style={{ color: "#C9A96E" }}>
        {setCount}&times;
      </span>

      {/* Reps */}
      {firstSet.planned_reps != null && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#FAF8F5" }}>
          {firstSet.planned_reps}r
        </span>
      )}

      {/* Set type badge */}
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ backgroundColor: "#2A2A2A", color: "#8A8A8E" }}
      >
        {setTypeAbbr[firstSet.set_type] ?? firstSet.set_type}
      </span>

      {/* RPE / RIR */}
      {firstSet.planned_rpe != null && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#C75B39" }}>
          RPE {firstSet.planned_rpe}
        </span>
      )}
      {firstSet.planned_rir != null && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#7A8B5C" }}>
          RIR {firstSet.planned_rir}
        </span>
      )}

      {/* Tempo */}
      {firstSet.planned_tempo && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#8A8A8E" }}>
          {firstSet.planned_tempo}
        </span>
      )}

      {/* Rest */}
      {firstSet.planned_rest_seconds != null && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#8A8A8E" }}>
          {firstSet.planned_rest_seconds}s
        </span>
      )}

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwap();
          }}
          className="p-0.5 rounded hover:opacity-80"
          style={{ color: "#8A8A8E" }}
          title="Sustituir ejercicio"
        >
          <Shuffle className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-0.5 rounded hover:opacity-80"
          style={{ color: "#D45555" }}
          title="Eliminar ejercicio"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
