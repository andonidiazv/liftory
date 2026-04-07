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
import { Trash2, Shuffle, Plus, Minus, Video, ChevronDown, ChevronRight } from "lucide-react";
import { SET_TYPES } from "@/constants/blocks";
import type { DraftSet } from "./types";
import { useState, useMemo } from "react";

/* ─── EMOM cue helpers ─── */

function parseEmomFromCue(cue: string | null): { windowSeconds: number; rounds: number; extraText: string } {
  if (!cue) return { windowSeconds: 90, rounds: 6, extraText: "" };
  const match = cue.match(/^EMOM\s+(\d+)s?\s*x\s*(\d+)\s*rounds?\.?\s*/i);
  if (!match) return { windowSeconds: 90, rounds: 6, extraText: cue };
  const windowSeconds = parseInt(match[1], 10);
  const rounds = parseInt(match[2], 10);
  const extraText = cue.slice(match[0].length).trim();
  return { windowSeconds, rounds, extraText };
}

function buildEmomCue(windowSeconds: number, rounds: number, extraText: string): string {
  const prefix = `EMOM ${windowSeconds}s x ${rounds} rounds.`;
  return extraText ? `${prefix} ${extraText}` : prefix;
}

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
  workoutId: string;
  availableBlocks: string[];
  onUpdateSets: (setId: string, fields: Partial<DraftSet>) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
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
  onAddSet,
  onRemoveSet,
  onDeleteExercise,
  onSwapExercise,
  onMoveToBlock,
}: ExerciseEditPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [perSetOpen, setPerSetOpen] = useState(false);

  const firstSet = exerciseGroup?.sets[0] ?? null;
  const isEmom = firstSet?.set_type === "emom";

  /* ─── EMOM parsed state (must be called every render — Rules of Hooks) ─── */
  const emomParsed = useMemo(
    () => (isEmom && firstSet ? parseEmomFromCue(firstSet.coaching_cue_override) : null),
    [isEmom, firstSet?.coaching_cue_override],
  );

  if (!exerciseGroup || !firstSet) return null;

  const setCount = exerciseGroup.sets.length;
  const hasVideo = !!firstSet.video_url;

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

  const updateEmomField = (field: "windowSeconds" | "rounds" | "extraText", value: number | string) => {
    if (!emomParsed) return;
    const updated = { ...emomParsed, [field]: value };
    const newCue = buildEmomCue(updated.windowSeconds, updated.rounds, updated.extraText);
    const fields: Partial<DraftSet> = { coaching_cue_override: newCue };
    if (field === "windowSeconds") {
      fields.planned_rest_seconds = value as number;
    }
    updateAllSets(fields);
  };

  // Check if sets have different values (for showing per-set indicator)
  const setsVary = exerciseGroup.sets.length > 1 && exerciseGroup.sets.some(
    (s) =>
      s.planned_reps !== firstSet.planned_reps ||
      s.planned_weight !== firstSet.planned_weight ||
      s.planned_rpe !== firstSet.planned_rpe ||
      s.planned_rir !== firstSet.planned_rir,
  );

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) { onClose(); setConfirmDelete(false); setPerSetOpen(false); } }}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#1C1C1E", borderColor: "#2A2A2A" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="font-display text-lg" style={{ color: "#FAF8F5" }}>
              {exerciseGroup.exerciseName}
            </DialogTitle>
            {hasVideo && (
              <Video className="w-4 h-4 flex-shrink-0" style={{ color: "#7A8B5C" }} />
            )}
          </div>
        </DialogHeader>

        {/* Parameters section */}
        <div className="space-y-3 mt-2">

          {/* Set type + set count row */}
          <div className="flex items-end gap-3">
            {/* Set type */}
            <div className="flex-1">
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

            {/* Set count +/- (not for EMOM — rounds are controlled separately) */}
            {!isEmom && (
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Series
                </Label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onRemoveSet}
                    disabled={setCount <= 1}
                    className="flex items-center justify-center w-8 h-9 rounded border transition-colors disabled:opacity-30"
                    style={{ backgroundColor: "#0D0C0A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="flex items-center justify-center w-10 h-9 rounded border font-mono text-sm font-semibold"
                    style={{ backgroundColor: "#0D0C0A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                  >
                    {setCount}
                  </span>
                  <button
                    onClick={onAddSet}
                    className="flex items-center justify-center w-8 h-9 rounded border transition-colors"
                    style={{ backgroundColor: "#0D0C0A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {isEmom && emomParsed ? (
            /* ═══════ EMOM-specific fields ═══════ */
            <>
              <h4 className="font-mono text-xs uppercase" style={{ color: "#C9A96E" }}>
                Configuracion EMOM
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* Window (seconds) */}
                <div>
                  <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                    Ventana EMOM (s)
                  </Label>
                  <Input
                    type="number"
                    value={emomParsed.windowSeconds}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : 60;
                      updateEmomField("windowSeconds", val);
                    }}
                    placeholder="90"
                    className="font-body text-sm"
                    style={inputStyle}
                  />
                  <span className="font-mono text-[9px] mt-0.5 block" style={{ color: "#8A8A8E" }}>
                    = {Math.floor(emomParsed.windowSeconds / 60)}:{(emomParsed.windowSeconds % 60).toString().padStart(2, "0")} por ronda
                  </span>
                </div>

                {/* Rounds */}
                <div>
                  <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                    Rondas
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={emomParsed.rounds}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value) : 1;
                      updateEmomField("rounds", val);
                    }}
                    className="font-body text-sm"
                    style={inputStyle}
                  />
                  <span className="font-mono text-[9px] mt-0.5 block" style={{ color: "#8A8A8E" }}>
                    Total: {Math.floor((emomParsed.windowSeconds * emomParsed.rounds) / 60)}:{((emomParsed.windowSeconds * emomParsed.rounds) % 60).toString().padStart(2, "0")} min
                  </span>
                </div>

                {/* Reps per exercise */}
                <div>
                  <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                    Reps por ejercicio
                  </Label>
                  <Input
                    type="number"
                    value={firstSet.planned_reps ?? ""}
                    onChange={(e) =>
                      updateAllSets({
                        planned_reps: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="font-body text-sm"
                    style={inputStyle}
                  />
                </div>

                {/* RPE (headline) */}
                <div>
                  <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                    RPE (headline)
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
              </div>

              {/* EMOM coaching cue — extra text after the auto-prefix */}
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Instrucciones adicionales
                </Label>
                <p className="font-mono text-[9px] mb-1" style={{ color: "#C9A96E" }}>
                  Prefijo auto: EMOM {emomParsed.windowSeconds}s x {emomParsed.rounds} rounds.
                </p>
                <Textarea
                  value={emomParsed.extraText}
                  onChange={(e) => updateEmomField("extraText", e.target.value)}
                  rows={3}
                  placeholder="ej. Rounds 1-2: RPE 7. Rounds 3-5: RPE 8.5. Round 6: RPE 9."
                  className="font-body text-sm"
                  style={inputStyle}
                />
              </div>
            </>
          ) : (
            /* ═══════ Standard fields (non-EMOM) ═══════ */
            <>
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

              {/* ─── Per-set editing ─── */}
              {setCount > 1 && (
                <div>
                  <button
                    onClick={() => setPerSetOpen(!perSetOpen)}
                    className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider py-1"
                    style={{ color: setsVary ? "#C9A96E" : "#8A8A8E" }}
                  >
                    {perSetOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Editar por set {setsVary && "(valores distintos)"}
                  </button>

                  {perSetOpen && (
                    <div className="mt-2 space-y-2">
                      {/* Header row */}
                      <div className="grid gap-2" style={{ gridTemplateColumns: "2rem 1fr 1fr 1fr 1fr" }}>
                        <span className="font-mono text-[9px]" style={{ color: "#5A5A5A" }}>#</span>
                        <span className="font-mono text-[9px]" style={{ color: "#5A5A5A" }}>Reps</span>
                        <span className="font-mono text-[9px]" style={{ color: "#5A5A5A" }}>Peso</span>
                        <span className="font-mono text-[9px]" style={{ color: "#5A5A5A" }}>RPE</span>
                        <span className="font-mono text-[9px]" style={{ color: "#5A5A5A" }}>RIR</span>
                      </div>

                      {exerciseGroup.sets
                        .slice()
                        .sort((a, b) => a.set_order - b.set_order)
                        .map((s, i) => (
                        <div
                          key={s.id}
                          className="grid gap-2 items-center"
                          style={{ gridTemplateColumns: "2rem 1fr 1fr 1fr 1fr" }}
                        >
                          <span className="font-mono text-xs font-semibold" style={{ color: "#8A8A8E" }}>
                            {i + 1}
                          </span>
                          <Input
                            type="number"
                            value={s.planned_reps ?? ""}
                            onChange={(e) =>
                              onUpdateSets(s.id, {
                                planned_reps: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="font-mono text-xs h-8"
                            style={inputStyle}
                          />
                          <Input
                            type="number"
                            step="0.5"
                            value={s.planned_weight ?? ""}
                            onChange={(e) =>
                              onUpdateSets(s.id, {
                                planned_weight: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="font-mono text-xs h-8"
                            style={inputStyle}
                          />
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            step="0.5"
                            value={s.planned_rpe ?? ""}
                            onChange={(e) =>
                              onUpdateSets(s.id, {
                                planned_rpe: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="font-mono text-xs h-8"
                            style={inputStyle}
                          />
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={s.planned_rir ?? ""}
                            onChange={(e) =>
                              onUpdateSets(s.id, {
                                planned_rir: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="font-mono text-xs h-8"
                            style={inputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions section */}
        <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
          <div className="flex items-center gap-2 w-full flex-wrap">
            {/* Move to block */}
            {otherBlocks.length > 0 && (
              <Select onValueChange={(val) => onMoveToBlock(val)}>
                <SelectTrigger
                  className="flex-1 font-body text-xs min-w-[120px]"
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
