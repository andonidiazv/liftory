import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DraftProgram } from "./types";

interface ProgramMetadataEditorProps {
  program: DraftProgram;
  onUpdate: (fields: Partial<DraftProgram>) => void;
}

const BLOCK_OPTIONS = ["accumulation", "intensification", "peaking", "deload"];

export function ProgramMetadataEditor({
  program,
  onUpdate,
}: ProgramMetadataEditorProps) {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg flex-wrap"
      style={{ backgroundColor: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      {/* Program name */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Nombre
        </Label>
        <Input
          value={program.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="font-body text-sm"
          style={{
            backgroundColor: "#0D0C0A",
            color: "#FAF8F5",
            borderColor: "#3A3A3A",
          }}
        />
      </div>

      {/* Total weeks */}
      <div className="flex items-center gap-2">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Semanas
        </Label>
        <Input
          type="number"
          min={1}
          value={program.total_weeks}
          onChange={(e) => onUpdate({ total_weeks: parseInt(e.target.value) || 1 })}
          className="w-20 font-body text-sm"
          style={{
            backgroundColor: "#0D0C0A",
            color: "#FAF8F5",
            borderColor: "#3A3A3A",
          }}
        />
      </div>

      {/* Current week */}
      <div className="flex items-center gap-2">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Sem. actual
        </Label>
        <Input
          type="number"
          min={1}
          max={program.total_weeks}
          value={program.current_week}
          onChange={(e) => onUpdate({ current_week: parseInt(e.target.value) || 1 })}
          className="w-20 font-body text-sm"
          style={{
            backgroundColor: "#0D0C0A",
            color: "#FAF8F5",
            borderColor: "#3A3A3A",
          }}
        />
      </div>

      {/* Current block */}
      <div className="flex items-center gap-2">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Bloque
        </Label>
        <Select
          value={program.current_block}
          onValueChange={(val) => onUpdate({ current_block: val })}
        >
          <SelectTrigger
            className="w-[160px] font-body text-sm"
            style={{
              backgroundColor: "#0D0C0A",
              color: "#FAF8F5",
              borderColor: "#3A3A3A",
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "#1C1C1E", borderColor: "#3A3A3A" }}>
            {BLOCK_OPTIONS.map((b) => (
              <SelectItem key={b} value={b} style={{ color: "#FAF8F5" }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Is active */}
      <div className="flex items-center gap-2">
        <Switch
          checked={program.is_active}
          onCheckedChange={(val) => onUpdate({ is_active: val })}
        />
        <Label
          className="font-body text-sm"
          style={{ color: program.is_active ? "#7A8B5C" : "#8A8A8E" }}
        >
          Activo
        </Label>
      </div>
    </div>
  );
}
