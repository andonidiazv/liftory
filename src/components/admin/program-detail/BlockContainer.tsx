import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DerivedBlock, DraftSet } from "./types";
import { ExerciseRow } from "./ExerciseRow";

interface BlockContainerProps {
  block: DerivedBlock;
  isFirst: boolean;
  isLast: boolean;
  dayExpanded?: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  onRename: (newLabel: string) => void;
  onAddExercise: () => void;
  onEditExercise: (set: DraftSet) => void;
  onDeleteExercise: (exerciseId: string) => void;
  onSwapExercise: (oldExerciseId: string) => void;
}

export function BlockContainer({
  block,
  isFirst,
  isLast,
  dayExpanded = false,
  onMove,
  onDelete,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onSwapExercise,
}: BlockContainerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isOpen = !collapsed;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#1C1C1E" }}>
      {/* Left color strip via border */}
      <div
        className="flex flex-col"
        style={{ borderLeft: `4px solid ${block.color}` }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5"
            style={{ color: "#8A8A8E" }}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Block label */}
          <span
            className="font-mono text-xs uppercase font-semibold"
            style={{ color: block.color }}
          >
            {block.label}
          </span>

          <span
            className="font-mono text-[10px]"
            style={{ color: "#8A8A8E" }}
          >
            {block.sets.length} sets
          </span>

          {/* Exercise count when collapsed */}
          {!isOpen && (
            <span className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
              · {block.exerciseGroups.length} ejercicios
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Move up/down */}
          <button
            onClick={() => onMove("up")}
            disabled={isFirst}
            className="p-0.5 disabled:opacity-30"
            style={{ color: "#8A8A8E" }}
            title="Mover arriba"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={isLast}
            className="p-0.5 disabled:opacity-30"
            style={{ color: "#8A8A8E" }}
            title="Mover abajo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-0.5 hover:opacity-80"
            style={{ color: "#D45555" }}
            title="Eliminar bloque"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        {isOpen && (
          <div className={dayExpanded ? "px-3 pb-3 space-y-1" : "px-2 pb-2 space-y-0.5"}>
            {block.exerciseGroups.map((eg) => (
              <ExerciseRow
                key={eg.exerciseId}
                exerciseGroup={eg}
                blockColor={block.color}
                expanded={dayExpanded}
                onEdit={onEditExercise}
                onDelete={() => onDeleteExercise(eg.exerciseId)}
                onSwap={() => onSwapExercise(eg.exerciseId)}
              />
            ))}

            {/* Add exercise button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddExercise}
              className="w-full mt-1 font-body text-xs"
              style={{ color: "#8A8A8E" }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Agregar ejercicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
