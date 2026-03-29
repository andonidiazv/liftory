import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { SaveScope } from "./types";

interface SaveScopeModalProps {
  open: boolean;
  onClose: () => void;
  currentWeek: number;
  totalWeeks: number;
  onSave: (scope: SaveScope) => void;
  saving: boolean;
}

type ScopeType = "current" | "forward" | "range" | "all";

export function SaveScopeModal({
  open,
  onClose,
  currentWeek,
  totalWeeks,
  onSave,
  saving,
}: SaveScopeModalProps) {
  const [selected, setSelected] = useState<ScopeType>("current");
  const [rangeFrom, setRangeFrom] = useState(currentWeek);
  const [rangeTo, setRangeTo] = useState(totalWeeks);

  const handleSave = () => {
    switch (selected) {
      case "current":
        onSave({ type: "current", week: currentWeek });
        break;
      case "forward":
        onSave({ type: "forward", fromWeek: currentWeek, toWeek: totalWeeks });
        break;
      case "range":
        onSave({ type: "range", fromWeek: rangeFrom, toWeek: rangeTo });
        break;
      case "all":
        onSave({ type: "all" });
        break;
    }
  };

  const radioStyle = (isSelected: boolean) => ({
    backgroundColor: isSelected ? "#2A2A2A" : "transparent",
    border: isSelected ? "1px solid #C75B39" : "1px solid #3A3A3A",
    color: "#FAF8F5",
  });

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
            Aplicar cambios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {/* Current week */}
          <button
            onClick={() => setSelected("current")}
            className="w-full text-left px-3 py-2.5 rounded-lg font-body text-sm transition-colors"
            style={radioStyle(selected === "current")}
          >
            Solo semana actual (S{currentWeek})
          </button>

          {/* Forward */}
          <button
            onClick={() => setSelected("forward")}
            className="w-full text-left px-3 py-2.5 rounded-lg font-body text-sm transition-colors"
            style={radioStyle(selected === "forward")}
          >
            Semana actual en adelante (S{currentWeek} &rarr; S{totalWeeks})
          </button>

          {/* Custom range */}
          <button
            onClick={() => setSelected("range")}
            className="w-full text-left px-3 py-2.5 rounded-lg font-body text-sm transition-colors"
            style={radioStyle(selected === "range")}
          >
            <span>Rango personalizado</span>
            {selected === "range" && (
              <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  De
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={totalWeeks}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(parseInt(e.target.value) || 1)}
                  className="w-16 font-mono text-sm"
                  style={inputStyle}
                />
                <Label className="font-mono text-[10px]" style={{ color: "#8A8A8E" }}>
                  A
                </Label>
                <Input
                  type="number"
                  min={rangeFrom}
                  max={totalWeeks}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(parseInt(e.target.value) || rangeFrom)}
                  className="w-16 font-mono text-sm"
                  style={inputStyle}
                />
              </div>
            )}
          </button>

          {/* All weeks */}
          <button
            onClick={() => setSelected("all")}
            className="w-full text-left px-3 py-2.5 rounded-lg font-body text-sm transition-colors"
            style={radioStyle(selected === "all")}
          >
            Todas las semanas (S1 &rarr; S{totalWeeks})
          </button>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="font-body text-sm"
            style={{ color: "#8A8A8E" }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-body text-sm"
            style={{ backgroundColor: "#C75B39", color: "#FAF8F5" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
