import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2, Plus, Pencil } from "lucide-react";
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
  onMoveExercise: (exerciseId: string, direction: "up" | "down") => void;
  onSwapExercise: (oldExerciseId: string) => void;
}

export function BlockContainer({
  block,
  isFirst,
  isLast,
  dayExpanded = false,
  onMove,
  onDelete,
  onRename,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onMoveExercise,
  onSwapExercise,
}: BlockContainerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(block.label);
  const renameRef = useRef<HTMLInputElement>(null);
  const isOpen = !collapsed;

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim().toUpperCase();
    if (trimmed && trimmed !== block.label) {
      onRename(trimmed);
    } else {
      setRenameValue(block.label);
    }
    setRenaming(false);
  };

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

          {/* Block label — inline editable */}
          {renaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value.toUpperCase())}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") { setRenameValue(block.label); setRenaming(false); }
              }}
              className="font-mono text-xs uppercase font-semibold bg-transparent outline-none border-b"
              style={{ color: block.color, borderColor: block.color, width: `${Math.max(renameValue.length, 6)}ch` }}
            />
          ) : (
            <button
              className="group/label flex items-center gap-1 font-mono text-xs uppercase font-semibold"
              style={{ color: block.color }}
              onClick={() => { setRenameValue(block.label); setRenaming(true); }}
              title="Renombrar bloque"
            >
              {block.label}
              <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/label:opacity-60 transition-opacity" />
            </button>
          )}

          <span
            className="font-mono text-[10px]"
            style={{ color: "#8A8A8E" }}
          >
            {(() => {
              const firstSet = block.sets[0];
              if (firstSet?.set_type === "emom") {
                const cue = firstSet.coaching_cue_override ?? "";
                const m = cue.match(/(\d+)\s*rounds?/i);
                const rounds = m ? parseInt(m[1], 10) : block.sets.length;
                return `${rounds} rounds`;
              }
              return `${block.sets.length} sets`;
            })()}
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
            {block.exerciseGroups.map((eg, idx) => (
              <ExerciseRow
                key={eg.exerciseId}
                exerciseGroup={eg}
                blockColor={block.color}
                expanded={dayExpanded}
                isFirst={idx === 0}
                isLast={idx === block.exerciseGroups.length - 1}
                onEdit={onEditExercise}
                onDelete={() => onDeleteExercise(eg.exerciseId)}
                onMove={(dir) => onMoveExercise(eg.exerciseId, dir)}
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
