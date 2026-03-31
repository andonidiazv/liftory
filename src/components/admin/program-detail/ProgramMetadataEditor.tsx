import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DraftProgram } from "./types";

interface Mesocycle {
  id: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  total_weeks: number;
  status: string;
}

interface ProgramMetadataEditorProps {
  program: DraftProgram;
  onUpdate: (fields: Partial<DraftProgram>) => void;
}

const BLOCK_OPTIONS = ["accumulation", "intensification", "peaking", "deload"];

function MesocycleSection({ programId, totalWeeks }: { programId: string; totalWeeks: number }) {
  const [mesocycle, setMesocycle] = useState<Mesocycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mesocycles")
        .select("id, cycle_number, cycle_start_date, cycle_end_date, total_weeks, status")
        .eq("template_program_id", programId)
        .order("cycle_number", { ascending: false })
        .limit(1)
        .single();
      setMesocycle(data);
      setLoading(false);
    })();
  }, [programId]);

  if (loading) return null;
  if (!mesocycle) return null;

  const snapToMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };

  const calcEndDate = (startStr: string, weeks: number): string => {
    const d = new Date(startStr + "T12:00:00");
    d.setDate(d.getDate() + weeks * 7 - 1);
    return d.toISOString().split("T")[0];
  };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    const monday = snapToMonday(date);
    const newStart = monday.toISOString().split("T")[0];
    const newEnd = calcEndDate(newStart, mesocycle.total_weeks);

    setSaving(true);
    const { error } = await supabase
      .from("mesocycles")
      .update({ cycle_start_date: newStart })
      .eq("id", mesocycle.id);
    setSaving(false);
    setCalendarOpen(false);

    if (error) {
      toast.error("Error al guardar fecha");
      return;
    }
    setMesocycle({ ...mesocycle, cycle_start_date: newStart, cycle_end_date: newEnd });
    toast.success(`Inicio actualizado: ${fmtDate(newStart)}`);
  };

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    live: { bg: "rgba(122,139,92,0.15)", color: "#7A8B5C", label: "LIVE" },
    draft: { bg: "rgba(201,169,110,0.15)", color: "#C9A96E", label: "DRAFT" },
    completed: { bg: "rgba(138,138,142,0.15)", color: "#8A8A8E", label: "COMPLETADO" },
  };
  const st = statusConfig[mesocycle.status] || statusConfig.draft;

  const selectedDate = new Date(mesocycle.cycle_start_date + "T12:00:00");

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg flex-wrap"
      style={{ backgroundColor: "#1C1C1E", border: "1px solid #2A2A2A" }}
    >
      {/* Cycle label + status */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs" style={{ color: "#FAF8F5" }}>
          Ciclo {mesocycle.cycle_number}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: st.bg, color: st.color }}
        >
          <Circle className="h-1.5 w-1.5 fill-current" /> {st.label}
        </span>
      </div>

      {/* Start date picker */}
      <div className="flex items-center gap-2">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Inicio
        </Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="font-body text-sm gap-2"
              style={{
                backgroundColor: "#0D0C0A",
                color: "#FAF8F5",
                borderColor: "#3A3A3A",
              }}
              disabled={saving}
            >
              <CalendarIcon className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
              {fmtDate(mesocycle.cycle_start_date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            style={{ backgroundColor: "#1C1C1E", borderColor: "#3A3A3A" }}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              defaultMonth={selectedDate}
              className="text-white"
              modifiers={{ monday: (date) => date.getDay() === 1 }}
              modifiersStyles={{ monday: { fontWeight: "bold" } }}
            />
            <p className="px-3 pb-2 text-[10px] font-mono" style={{ color: "#8A8A8E" }}>
              Se ajusta al lunes más cercano
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* End date (read-only) */}
      <div className="flex items-center gap-2">
        <Label className="font-mono text-xs whitespace-nowrap" style={{ color: "#8A8A8E" }}>
          Fin
        </Label>
        <span className="font-body text-sm" style={{ color: "#FAF8F5" }}>
          {fmtDate(mesocycle.cycle_end_date)}
        </span>
      </div>

      {/* Duration (read-only) */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs" style={{ color: "#5A5A5A" }}>
          {mesocycle.total_weeks} semanas
        </span>
      </div>
    </div>
  );
}

export function ProgramMetadataEditor({
  program,
  onUpdate,
}: ProgramMetadataEditorProps) {
  return (
    <div className="space-y-2">
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

    {/* Mesocycle section — independent from program save pipeline */}
    <MesocycleSection programId={program.id} totalWeeks={program.total_weeks} />
    </div>
  );
}
