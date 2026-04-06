import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, MessageSquare, Clock, Maximize2, Minimize2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS, BLOCK_LABEL_COLORS } from "@/constants/blocks";
import type { DraftWorkout, DraftSet, DerivedBlock } from "./types";
import { BlockContainer } from "./BlockContainer";
import { AddBlockButton } from "./AddBlockButton";
import { Trash2 } from "lucide-react";

interface DayCardProps {
  workout: DraftWorkout | null;
  dayLabel: string;
  blocks: DerivedBlock[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCreateDay: () => void;
  onUpdateWorkout: (fields: Partial<DraftWorkout>) => void;
  onMoveBlock: (blockLabel: string, direction: "up" | "down") => void;
  onDeleteBlock: (blockLabel: string) => void;
  onInsertBlock: (newBlockLabel: string, afterBlockLabel: string | null) => void;
  onRenameBlock: (oldLabel: string, newLabel: string) => void;
  onAddExercise: (blockLabel: string) => void;
  onEditExercise: (set: DraftSet) => void;
  onDeleteExercise: (blockLabel: string, exerciseId: string) => void;
  onSwapExercise: (blockLabel: string, oldExerciseId: string) => void;
  emptyBlocks?: string[];
}

export function DayCard({
  workout,
  dayLabel,
  blocks,
  isExpanded = false,
  onToggleExpand,
  onCreateDay,
  onUpdateWorkout,
  onMoveBlock,
  onDeleteBlock,
  onInsertBlock,
  onRenameBlock,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onSwapExercise,
  emptyBlocks = [],
}: DayCardProps) {
  const [coachNoteOpen, setCoachNoteOpen] = useState(false);
  const [shortNoteOpen, setShortNoteOpen] = useState(false);

  // Empty day card
  if (!workout) {
    return (
      <div
        className="rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]"
        style={{ border: "2px dashed #3A3A3A" }}
      >
        <span className="font-display text-sm" style={{ color: "#8A8A8E" }}>
          {dayLabel}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateDay}
          className="font-body text-xs"
          style={{ color: "#C75B39" }}
        >
          <Plus className="w-3 h-3 mr-1" />
          Crear dia
        </Button>
      </div>
    );
  }

  const workoutTypeColor = WORKOUT_TYPE_COLORS[workout.workout_type] ?? "#8A8A8E";
  const totalSets = blocks.reduce((acc, b) => acc + b.sets.length, 0);
  const existingBlockLabels = [...blocks.map((b) => b.label), ...emptyBlocks];

  return (
    <div
      className="rounded-lg"
      style={{ backgroundColor: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      {/* Top colored bar */}
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: workoutTypeColor }} />

      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
        {/* Day label (editable) */}
        <Input
          value={workout.day_label}
          onChange={(e) => onUpdateWorkout({ day_label: e.target.value })}
          className={isExpanded ? "w-48 font-display text-base" : "w-28 font-display text-sm"}
          style={{
            backgroundColor: "transparent",
            color: "#FAF8F5",
            borderColor: "#3A3A3A",
          }}
        />

        {/* Workout type */}
        <Select
          value={workout.workout_type}
          onValueChange={(val) => onUpdateWorkout({ workout_type: val })}
        >
          <SelectTrigger
            className="w-[130px] font-body text-xs"
            style={{
              backgroundColor: "#0D0C0A",
              color: "#FAF8F5",
              borderColor: "#3A3A3A",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: workoutTypeColor }}
              />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "#1C1C1E", borderColor: "#3A3A3A" }}>
            {WORKOUT_TYPES.map((wt) => (
              <SelectItem key={wt} value={wt} style={{ color: "#FAF8F5" }}>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: WORKOUT_TYPE_COLORS[wt] ?? "#8A8A8E" }}
                  />
                  {wt}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Duration */}
        <Input
          type="number"
          placeholder="min"
          value={workout.estimated_duration ?? ""}
          onChange={(e) =>
            onUpdateWorkout({
              estimated_duration: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          className="w-16 font-mono text-xs"
          style={{
            backgroundColor: "#0D0C0A",
            color: "#FAF8F5",
            borderColor: "#3A3A3A",
          }}
        />

        <div className="flex-1" />

        {/* Rest day toggle */}
        <div className="flex items-center gap-1.5">
          <Switch
            checked={workout.is_rest_day}
            onCheckedChange={(val) => onUpdateWorkout({ is_rest_day: val })}
          />
          <Label className="font-body text-xs" style={{ color: "#8A8A8E" }}>
            Descanso
          </Label>
        </div>

        {/* Expand/collapse button */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            style={{ color: "#8A8A8E" }}
            title={isExpanded ? "Vista compacta" : "Vista expandida"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Body (only if not rest day) */}
      {!workout.is_rest_day && (
        <div className={isExpanded ? "px-4 pb-4 space-y-3" : "px-3 pb-3 space-y-2"}>
          {/* Collapsible notes */}
          <div className="flex gap-2">
            <Collapsible open={coachNoteOpen} onOpenChange={setCoachNoteOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs font-body px-1.5 py-0.5 rounded"
                  style={{
                    color: workout.coach_note ? "#C9A96E" : "#8A8A8E",
                    backgroundColor: coachNoteOpen ? "#2A2A2A" : "transparent",
                  }}
                >
                  <MessageSquare className="w-3 h-3" />
                  Nota coach
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <Textarea
                  value={workout.coach_note ?? ""}
                  onChange={(e) =>
                    onUpdateWorkout({ coach_note: e.target.value || null })
                  }
                  placeholder="Nota para el coach..."
                  rows={2}
                  className="font-body text-xs"
                  style={{
                    backgroundColor: "#0D0C0A",
                    color: "#FAF8F5",
                    borderColor: "#3A3A3A",
                  }}
                />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible open={shortNoteOpen} onOpenChange={setShortNoteOpen}>
              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs font-body px-1.5 py-0.5 rounded"
                  style={{
                    color: workout.short_on_time_note ? "#C9A96E" : "#8A8A8E",
                    backgroundColor: shortNoteOpen ? "#2A2A2A" : "transparent",
                  }}
                >
                  <Clock className="w-3 h-3" />
                  Si falta tiempo
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                <Textarea
                  value={workout.short_on_time_note ?? ""}
                  onChange={(e) =>
                    onUpdateWorkout({ short_on_time_note: e.target.value || null })
                  }
                  placeholder="Instruccion si falta tiempo..."
                  rows={2}
                  className="font-body text-xs"
                  style={{
                    backgroundColor: "#0D0C0A",
                    color: "#FAF8F5",
                    borderColor: "#3A3A3A",
                  }}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
              {totalSets} sets &middot; {blocks.length} bloques
            </span>
          </div>

          {/* Add block at top */}
          <AddBlockButton
            existingBlockLabels={existingBlockLabels}
            onInsert={(label) => onInsertBlock(label, null)}
          />

          {/* Blocks */}
          {blocks.map((block, idx) => (
            <div key={block.label}>
              <BlockContainer
                block={block}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
                dayExpanded={isExpanded}
                onMove={(dir) => onMoveBlock(block.label, dir)}
                onDelete={() => onDeleteBlock(block.label)}
                onRename={(newLabel) => onRenameBlock(block.label, newLabel)}
                onAddExercise={() => onAddExercise(block.label)}
                onEditExercise={onEditExercise}
                onDeleteExercise={(exerciseId) => onDeleteExercise(block.label, exerciseId)}
                onSwapExercise={(oldExerciseId) => onSwapExercise(block.label, oldExerciseId)}
              />

              {/* Add block button between blocks */}
              <AddBlockButton
                existingBlockLabels={existingBlockLabels}
                onInsert={(label) => onInsertBlock(label, block.label)}
              />
            </div>
          ))}

          {/* Empty blocks (just inserted, no exercises yet) */}
          {emptyBlocks.map((label) => (
            <div key={label}>
              <div
                className="rounded-lg p-3 flex flex-col gap-2"
                style={{
                  border: `1px dashed ${BLOCK_LABEL_COLORS[label] ?? "#8A8A8E"}`,
                  backgroundColor: "#0D0C0A",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-display text-[11px] tracking-widest"
                    style={{ color: BLOCK_LABEL_COLORS[label] ?? "#8A8A8E" }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={() => onDeleteBlock(label)}
                    className="p-1 rounded hover:opacity-80"
                    style={{ color: "#8A8A8E" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddExercise(label)}
                  className="w-full font-body text-xs"
                  style={{ color: "#C75B39", border: "1px dashed #3A3A3A" }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar ejercicio
                </Button>
              </div>
              <AddBlockButton
                existingBlockLabels={existingBlockLabels}
                onInsert={(label2) => onInsertBlock(label2, label)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
