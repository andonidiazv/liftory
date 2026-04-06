import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Shuffle } from "lucide-react";
import { SET_TYPES } from "@/constants/blocks";
import type { DraftSet } from "./types";
import { useState } from "react";

interface ExerciseEditPanelProps {
  open: boolean;
  onClose: () => void;
  exerciseGroup: {
    exerciseId: string;
    exerciseName: string;
    exerciseNameEs: string;
    sets: DraftSet[];
  } | null;
  blockLabel: string;
  availableBlocks: string[];
  onUpdateSets: (setId: string, fields: Partial<DraftSet>) => void;
  onDeleteExercise: () => void;
  onSwapExercise: () => void;
  onMoveToBlock: (targetBlock: string) => void;
}

export function ExerciseEditPanel({
  open,
  onClose,
  exerciseGroup,
  blockLabel,
  availableBlocks,
  onUpdateSets,
  onDeleteExercise,
  onSwapExercise,
  onMoveToBlock,
}: ExerciseEditPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!exerciseGroup) return null;

  const firstSet = exerciseGroup.sets[0];
  if (!firstSet) return null;

  // Update a param across ALL sets in the group
  const updateAllSets = (fields: Partial<DraftSet>) => {
    for (const s of exerciseGroup.sets) {
      onUpdateSets(s.id, fields);
    }
  };

  const inputStyle = {
    backgroundColor: "#0D0C0A",
    color: "#FAF8F5",
    borderColor: "#3A3A3A",
  };

  const otherBlocks = availableBlocks.filter((b) => b !== blockLabel);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent
        className="max-w-md"
        style={{ backgroundColor: "#1C1C1E", borderColor: "#2A2A2A" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg" style={{ color: "#FAF8F5" }}>
            {exerciseGroup.exerciseName}
          </DialogTitle>
          <p className="font-body text-xs" style={{ color: "#8A8A8E" }}>
            {exerciseGroup.exerciseNameEs}
          </p>
        </DialogHeader>

        {/* Parameters section */}
        <div className="space-y-3 mt-2">
          <h4 className="font-mono text-xs uppercase" style={{ color: "#C9A96E" }}>
            Parametros
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration (s) */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                Duracion (s)
              </Label>
              <Input
                type="number"
                value={firstSet.planned_duration_seconds ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  updateAllSets({
                    planned_duration_seconds: val,
                    ...(val ? { planned_reps: null, planned_weight: null } : {}),
                  });
                }}
                placeholder="ej. 50"
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>

            {/* Reps */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: firstSet.planned_duration_seconds ? "#3A3A3A" : "#8A8A8E" }}>
                Reps
              </Label>
              <Input
                type="number"
                value={firstSet.planned_reps ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_reps: e.target.value ? parseInt(e.target.value) : null,
                    planned_duration_seconds: null,
                  })
                }
                disabled={!!firstSet.planned_duration_seconds}
                className="font-body text-sm"
                style={{ ...inputStyle, opacity: firstSet.planned_duration_seconds ? 0.4 : 1 }}
              />
            </div>

            {/* Weight */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: firstSet.planned_duration_seconds ? "#3A3A3A" : "#8A8A8E" }}>
                Peso (kg)
              </Label>
              <Input
                type="number"
                step="0.5"
                value={firstSet.planned_weight ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_weight: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                disabled={!!firstSet.planned_duration_seconds}
                className="font-body text-sm"
                style={{ ...inputStyle, opacity: firstSet.planned_duration_seconds ? 0.4 : 1 }}
              />
            </div>

            {/* RPE */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                RPE
              </Label>
              <Input
                type="number"
                min={1}
                max={10}
                step="0.5"
                value={firstSet.planned_rpe ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_rpe: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>

            {/* RIR */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                RIR
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={firstSet.planned_rir ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_rir: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>

            {/* Tempo */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                Tempo
              </Label>
              <Input
                value={firstSet.planned_tempo ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_tempo: e.target.value || null,
                  })
                }
                placeholder="e.g. 3-1-2-0"
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>

            {/* Rest */}
            <div>
              <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                Descanso (s)
              </Label>
              <Input
                type="number"
                value={firstSet.planned_rest_seconds ?? ""}
                onChange={(e) =>
                  updateAllSets({
                    planned_rest_seconds: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Set type */}
          <div>
            <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
              Tipo de set
            </Label>
            <Select
              value={firstSet.set_type}
              onValueChange={(val) => updateAllSets({ set_type: val })}
            >
              <SelectTrigger className="font-body text-sm" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "#1C1C1E", borderColor: "#3A3A3A" }}>
                {SET_TYPES.map((st) => (
                  <SelectItem key={st} value={st} style={{ color: "#FAF8F5" }}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coaching cue */}
          <div>
            <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
              Coaching cue
            </Label>
            <Textarea
              value={firstSet.coaching_cue_override ?? ""}
              onChange={(e) =>
                updateAllSets({
                  coaching_cue_override: e.target.value || null,
                })
              }
              rows={2}
              className="font-body text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions section */}
        <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
          <div className="flex items-center gap-2 w-full">
            {/* Move to block */}
            {otherBlocks.length > 0 && (
              <Select onValueChange={(val) => onMoveToBlock(val)}>
                <SelectTrigger
                  className="flex-1 font-body text-xs"
                  style={inputStyle}
                >
                  <SelectValue placeholder="Mover a bloque..." />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "#1C1C1E", borderColor: "#3A3A3A" }}>
                  {otherBlocks.map((b) => (
                    <SelectItem key={b} value={b} style={{ color: "#FAF8F5" }}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Swap exercise */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwapExercise}
              className="font-body text-xs"
              style={{ color: "#8A8A8E" }}
            >
              <Shuffle className="w-3 h-3 mr-1" />
              Sustituir
            </Button>

            {/* Delete */}
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="font-body text-xs"
                style={{ color: "#D45555" }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Eliminar
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDeleteExercise();
                    onClose();
                  }}
                  className="font-body text-xs"
                  style={{ color: "#FAF8F5", backgroundColor: "#D45555" }}
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  className="font-body text-xs"
                  style={{ color: "#8A8A8E" }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
