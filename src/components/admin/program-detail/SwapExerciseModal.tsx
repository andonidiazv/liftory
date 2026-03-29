import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ExerciseOption } from "./types";

interface SwapExerciseModalProps {
  open: boolean;
  onClose: () => void;
  currentExerciseName: string;
  onSwap: (newExercise: ExerciseOption) => void;
}

export function SwapExerciseModal({
  open,
  onClose,
  currentExerciseName,
  onSwap,
}: SwapExerciseModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExerciseOption[]>([]);
  const [searching, setSearching] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
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

  const handleSelect = (ex: ExerciseOption) => {
    onSwap(ex);
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
        className="max-w-sm"
        style={{ backgroundColor: "#1C1C1E", borderColor: "#2A2A2A" }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg" style={{ color: "#FAF8F5" }}>
            Sustituir ejercicio
          </DialogTitle>
          <p className="font-body text-xs" style={{ color: "#8A8A8E" }}>
            Actual: {currentExerciseName}
          </p>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#8A8A8E" }}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nuevo ejercicio..."
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
                onClick={() => handleSelect(ex)}
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
      </DialogContent>
    </Dialog>
  );
}
