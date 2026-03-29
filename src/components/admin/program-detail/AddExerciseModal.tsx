import { useState, useEffect } from "react";
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
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SET_TYPES } from "@/constants/blocks";
import type { ExerciseOption } from "./types";

interface AddExerciseModalProps {
  open: boolean;
  onClose: () => void;
  blockLabel: string;
  onAdd: (
    exercise: ExerciseOption,
    params: {
      set_type: string;
      planned_reps: number | null;
      planned_rpe: number | null;
      planned_rir: number | null;
      planned_weight: number | null;
      planned_rest_seconds: number | null;
      planned_tempo: string | null;
      coaching_cue_override: string | null;
    },
    count: number
  ) => void;
}

export function AddExerciseModal({
  open,
  onClose,
  blockLabel,
  onAdd,
}: AddExerciseModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ExerciseOption | null>(null);

  // Params form
  const [setType, setSetType] = useState("working");
  const [setCount, setSetCount] = useState(3);
  const [reps, setReps] = useState<string>("");
  const [rpe, setRpe] = useState<string>("");
  const [rir, setRir] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [rest, setRest] = useState<string>("");
  const [tempo, setTempo] = useState("");
  const [cue, setCue] = useState("");

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setSetType("working");
      setSetCount(3);
      setReps("");
      setRpe("");
      setRir("");
      setWeight("");
      setRest("");
      setTempo("");
      setCue("");
    }
  }, [open]);

  // Search exercises
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("exercises")
        .select("id, name, name_es")
        .or(`name.ilike.%${query}%,name_es.ilike.%${query}%`)
        .limit(20);
      setResults(
        (data ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          name_es: d.name_es ?? d.name,
        }))
      );
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = () => {
    if (!selected) return;
    onAdd(
      selected,
      {
        set_type: setType,
        planned_reps: reps ? parseInt(reps) : null,
        planned_rpe: rpe ? parseFloat(rpe) : null,
        planned_rir: rir ? parseInt(rir) : null,
        planned_weight: weight ? parseFloat(weight) : null,
        planned_rest_seconds: rest ? parseInt(rest) : null,
        planned_tempo: tempo || null,
        coaching_cue_override: cue || null,
      },
      setCount
    );
    onClose();
  };

  const inputStyle = {
    backgroundColor: "#0D0C0A",
    color: "#FAF8F5",
    borderColor: "#3A3A3A",
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent
        className="max-w-md"
        style={{ backgroundColor: "#1C1C1E", borderColor: "#2A2A2A" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg" style={{ color: "#FAF8F5" }}>
            Agregar ejercicio
          </DialogTitle>
          <p className="font-mono text-xs" style={{ color: "#8A8A8E" }}>
            {blockLabel}
          </p>
        </DialogHeader>

        {!selected ? (
          /* Search phase */
          <div className="space-y-2 mt-2">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "#8A8A8E" }}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar ejercicio..."
                className="pl-8 font-body text-sm"
                style={inputStyle}
                autoFocus
              />
            </div>

            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8A8A8E" }} />
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {results.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelected(ex)}
                  className="w-full text-left px-3 py-2 rounded transition-colors hover:opacity-80"
                  style={{ color: "#FAF8F5" }}
                >
                  <span className="font-body text-sm block">{ex.name}</span>
                  <span className="font-body text-xs block" style={{ color: "#8A8A8E" }}>
                    {ex.name_es}
                  </span>
                </button>
              ))}
              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-center py-4 font-body text-sm" style={{ color: "#8A8A8E" }}>
                  Sin resultados
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Params phase */
          <div className="space-y-3 mt-2">
            <div
              className="px-3 py-2 rounded"
              style={{ backgroundColor: "#0D0C0A" }}
            >
              <span className="font-body text-sm" style={{ color: "#FAF8F5" }}>
                {selected.name}
              </span>
              <span className="font-body text-xs block" style={{ color: "#8A8A8E" }}>
                {selected.name_es}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="font-body text-xs mt-1"
                style={{ color: "#C75B39" }}
              >
                Cambiar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Set type */}
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Tipo
                </Label>
                <Select value={setType} onValueChange={setSetType}>
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

              {/* Set count */}
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Sets
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={setCount}
                  onChange={(e) => setSetCount(parseInt(e.target.value) || 1)}
                  className="font-body text-sm"
                  style={inputStyle}
                />
              </div>

              {/* Reps */}
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Reps
                </Label>
                <Input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="font-body text-sm"
                  style={inputStyle}
                />
              </div>

              {/* Weight */}
              <div>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  Peso (kg)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="font-body text-sm"
                  style={inputStyle}
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
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
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
                  value={rir}
                  onChange={(e) => setRir(e.target.value)}
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
                  value={rest}
                  onChange={(e) => setRest(e.target.value)}
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
                  value={tempo}
                  onChange={(e) => setTempo(e.target.value)}
                  placeholder="3-1-2-0"
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
                value={cue}
                onChange={(e) => setCue(e.target.value)}
                rows={2}
                className="font-body text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {selected && (
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="font-body text-sm"
              style={{ color: "#8A8A8E" }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              className="font-body text-sm"
              style={{ backgroundColor: "#C75B39", color: "#FAF8F5" }}
            >
              Agregar {setCount} sets
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
