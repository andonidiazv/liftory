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
  expanded?: boolean;
  onEdit: (set: DraftSet) => void;
  onDelete: () => void;
  onSwap: () => void;
}

export function ExerciseRow({
  exerciseGroup,
  blockColor,
  expanded = false,
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
    interval: "INT",
    backoff: "BO",
    superset: "SS",
    cooldown: "CD",
    dropset: "DS",
  };

  if (expanded) {
    // ---- EXPANDED MODE: full-width, two-line layout ----
    return (
      <div
        className="group rounded-lg px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
        style={{ backgroundColor: "rgba(26,26,26,0.5)" }}
        onClick={() => onEdit(firstSet)}
      >
        {/* Row 1: Name + actions */}
        <div className="flex items-start gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
            style={{ backgroundColor: blockColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-body text-sm font-medium leading-tight"
                style={{ color: "#FAF8F5" }}
              >
                {exerciseGroup.exerciseName}
              </span>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onSwap(); }}
                  className="p-1 rounded hover:bg-white/10"
                  style={{ color: "#8A8A8E" }}
                  title="Sustituir ejercicio"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1 rounded hover:bg-white/10"
                  style={{ color: "#D45555" }}
                  title="Eliminar ejercicio"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Spanish name — only for non-EMOM */}
            {firstSet.set_type !== "emom" && exerciseGroup.exerciseNameEs && (
              <span
                className="font-body text-xs block mt-0.5"
                style={{ color: "#8A8A8E" }}
              >
                {exerciseGroup.exerciseNameEs}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Params */}
        <div className="flex items-center gap-3 mt-2 ml-5 flex-wrap">
          {/* Sets × Reps or Duration */}
          <span className="font-mono text-xs" style={{ color: "#C9A96E" }}>
            {firstSet.set_type === "emom"
              ? `${firstSet.planned_reps ?? "—"} reps`
              : firstSet.planned_duration_seconds
                ? `${setCount} × ${firstSet.planned_duration_seconds}s`
                : `${setCount} × ${firstSet.planned_reps ?? "—"}`}
          </span>

          {/* Weight */}
          {firstSet.planned_weight != null && !firstSet.planned_duration_seconds && (
            <span className="font-mono text-xs" style={{ color: "#FAF8F5" }}>
              {firstSet.planned_weight}kg
            </span>
          )}

          {/* Set type badge */}
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "#2A2A2A", color: "#8A8A8E" }}
          >
            {setTypeAbbr[firstSet.set_type] ?? firstSet.set_type}
          </span>

          {/* RPE */}
          {firstSet.planned_rpe != null && (
            <span className="font-mono text-xs" style={{ color: "#C75B39" }}>
              RPE {firstSet.planned_rpe}
            </span>
          )}

          {/* RIR */}
          {firstSet.planned_rir != null && (
            <span className="font-mono text-xs" style={{ color: "#7A8B5C" }}>
              RIR {firstSet.planned_rir}
            </span>
          )}

          {/* Tempo */}
          {firstSet.planned_tempo && (
            <span className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
              {firstSet.planned_tempo}
            </span>
          )}

          {/* Rest — hide for EMOM since planned_rest_seconds = window time */}
          {firstSet.set_type !== "emom" && firstSet.planned_rest_seconds != null && firstSet.planned_rest_seconds > 0 && (
            <span className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
              {firstSet.planned_rest_seconds}s rest
            </span>
          )}
        </div>
      </div>
    );
  }

  // ---- COMPACT MODE: single-line layout (original) ----
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
        className="font-body text-xs min-w-0"
        style={{ color: "#FAF8F5", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={exerciseGroup.exerciseName}
      >
        {exerciseGroup.exerciseName}
      </span>

      {/* Set count × Reps or Duration */}
      <span className="font-mono text-xs flex-shrink-0" style={{ color: "#C9A96E" }}>
        {firstSet.set_type === "emom"
          ? `${firstSet.planned_reps ?? "—"}r`
          : firstSet.planned_duration_seconds
            ? `${setCount}× ${firstSet.planned_duration_seconds}s`
            : `${setCount}×`}
      </span>

      {/* Reps (only for rep-based, non-EMOM) */}
      {firstSet.set_type !== "emom" && !firstSet.planned_duration_seconds && firstSet.planned_reps != null && (
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

      {/* Rest — hide for EMOM since planned_rest_seconds = window time */}
      {firstSet.set_type !== "emom" && firstSet.planned_rest_seconds != null && firstSet.planned_rest_seconds > 0 && (
        <span className="font-mono text-xs flex-shrink-0" style={{ color: "#8A8A8E" }}>
          {firstSet.planned_rest_seconds}s
        </span>
      )}

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto">
        <button
          onClick={(e) => { e.stopPropagation(); onSwap(); }}
          className="p-0.5 rounded hover:opacity-80"
          style={{ color: "#8A8A8E" }}
          title="Sustituir ejercicio"
        >
          <Shuffle className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
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
