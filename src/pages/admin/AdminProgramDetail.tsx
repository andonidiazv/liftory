import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, X, ChevronUp, ChevronDown, Search, Save } from "lucide-react";
import { toast } from "sonner";

const WORKOUT_TYPES = ["strength", "hypertrophy", "conditioning", "mobility", "deload", "rest"];
const SET_TYPES = ["working", "warmup", "backoff", "dropset"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface WorkoutRow {
  id: string;
  scheduled_date: string;
  week_number: number;
  day_label: string;
  workout_type: string;
  estimated_duration: number | null;
  is_rest_day: boolean;
  coach_note: string | null;
  short_on_time_note: string | null;
  user_id: string;
  program_id: string;
}

interface SetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_order: number;
  set_type: string;
  planned_reps: number | null;
  planned_rpe: number | null;
  planned_rest_seconds: number | null;
  planned_tempo: string | null;
  coaching_cue_override: string | null;
  user_id: string;
  exercise_name?: string;
}

interface ExerciseOption {
  id: string;
  name: string;
  name_es: string;
}

export default function AdminProgramDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<{ id: string; name: string; total_weeks: number; user_id: string | null; is_active: boolean } | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState("1");
  const [programName, setProgramName] = useState("");
  const [saving, setSaving] = useState(false);

  // Add exercise modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTargetWorkoutId, setAddTargetWorkoutId] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseOption | null>(null);
  const [newSetType, setNewSetType] = useState("working");
  const [newReps, setNewReps] = useState<number | "">(8);
  const [newRpe, setNewRpe] = useState<number | "">(8);
  const [newRest, setNewRest] = useState<number | "">(75);
  const [newTempo, setNewTempo] = useState("");
  const [newCue, setNewCue] = useState("");
  const [newSetCount, setNewSetCount] = useState(3);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const { data: prog } = await supabase.from("programs").select("*").eq("id", id).single();
    if (!prog) { setLoading(false); return; }
    setProgram(prog);
    setProgramName(prog.name);

    const { data: ws } = await supabase.from("workouts").select("*").eq("program_id", id).order("scheduled_date");
    setWorkouts((ws as WorkoutRow[]) ?? []);

    if (ws?.length) {
      const wIds = ws.map((w) => w.id);
      const { data: allSets } = await supabase
        .from("workout_sets")
        .select("*, exercises(name, name_es)")
        .in("workout_id", wIds)
        .order("set_order");

      setSets(
        (allSets ?? []).map((s: Record<string, unknown> & { exercises?: { name_es?: string; name?: string } }) => ({
          ...s,
          exercise_name: s.exercises?.name_es || s.exercises?.name || "?",
        }))
      );
    } else {
      setSets([]);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weekNumbers = program ? Array.from({ length: program.total_weeks }, (_, i) => i + 1) : [];

  const getWeekWorkouts = (week: number) =>
    workouts.filter((w) => w.week_number === week).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  const getWorkoutSets = (workoutId: string) =>
    sets.filter((s) => s.workout_id === workoutId).sort((a, b) => a.set_order - b.set_order);

  // Save program name
  const saveProgramName = async () => {
    if (!id || !programName.trim()) return;
    setSaving(true);
    await supabase.from("programs").update({ name: programName.trim() }).eq("id", id);
    setSaving(false);
    toast.success("Nombre guardado");
  };

  // Update workout field
  const updateWorkout = async (workoutId: string, field: string, value: string | number | boolean | null) => {
    await supabase.from("workouts").update({ [field]: value }).eq("id", workoutId);
    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? { ...w, [field]: value } : w)));
  };

  // Create workout for a day
  const createWorkoutForDay = async (week: number, dayIndex: number) => {
    if (!id || !program) return;
    // Calculate date based on a reference: week 1 day 0 = 2025-01-06 (a Monday)
    const baseDate = new Date("2025-01-06");
    baseDate.setDate(baseDate.getDate() + (week - 1) * 7 + dayIndex);
    const dateStr = baseDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("workouts")
      .insert({
        program_id: id,
        user_id: program.user_id || "00000000-0000-0000-0000-000000000000",
        scheduled_date: dateStr,
        week_number: week,
        day_label: DAY_NAMES[dayIndex],
        workout_type: "strength",
        is_rest_day: false,
      })
      .select()
      .single();

    if (error) { toast.error("Error al crear día"); return; }
    if (data) {
      setWorkouts((prev) => [...prev, data as WorkoutRow]);
      toast.success(`${DAY_NAMES[dayIndex]} creado`);
    }
  };

  // Search exercises
  const searchExercises = async (q: string) => {
    setExerciseSearch(q);
    if (q.length < 2) { setExerciseOptions([]); return; }
    const { data } = await supabase
      .from("exercises")
      .select("id, name, name_es")
      .or(`name.ilike.%${q}%,name_es.ilike.%${q}%`)
      .eq("is_active", true)
      .limit(20);
    setExerciseOptions((data as ExerciseOption[]) ?? []);
  };

  // Add sets
  const handleAddSets = async () => {
    if (!selectedExercise || !addTargetWorkoutId) return;
    const existingSets = getWorkoutSets(addTargetWorkoutId);
    const maxOrder = existingSets.length ? Math.max(...existingSets.map((s) => s.set_order)) : 0;
    const workout = workouts.find((w) => w.id === addTargetWorkoutId);

    const inserts = Array.from({ length: newSetCount }, (_, i) => ({
      workout_id: addTargetWorkoutId,
      user_id: workout?.user_id || program?.user_id || "00000000-0000-0000-0000-000000000000",
      exercise_id: selectedExercise.id,
      set_order: maxOrder + i + 1,
      set_type: newSetType,
      planned_reps: newReps || null,
      planned_rpe: newRpe || null,
      planned_rest_seconds: newRest || null,
      planned_tempo: newTempo || null,
      coaching_cue_override: newCue || null,
    }));

    const { data, error } = await supabase.from("workout_sets").insert(inserts).select("*, exercises(name, name_es)");
    if (error) { toast.error("Error al agregar sets"); return; }

    setSets((prev) => [
      ...prev,
      ...(data ?? []).map((s: Record<string, unknown> & { exercises?: { name_es?: string; name?: string } }) => ({ ...s, exercise_name: s.exercises?.name_es || s.exercises?.name || "?" })),
    ]);
    toast.success(`${newSetCount} sets agregados`);
    setAddModalOpen(false);
    setSelectedExercise(null);
    setExerciseSearch("");
    setExerciseOptions([]);
  };

  // Delete set
  const deleteSet = async (setId: string) => {
    await supabase.from("workout_sets").delete().eq("id", setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  };

  // Reorder set
  const moveSet = async (setId: string, direction: "up" | "down") => {
    const set = sets.find((s) => s.id === setId);
    if (!set) return;
    const siblings = getWorkoutSets(set.workout_id);
    const idx = siblings.findIndex((s) => s.id === setId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;

    const other = siblings[swapIdx];
    await Promise.all([
      supabase.from("workout_sets").update({ set_order: other.set_order }).eq("id", set.id),
      supabase.from("workout_sets").update({ set_order: set.set_order }).eq("id", other.id),
    ]);

    setSets((prev) =>
      prev.map((s) => {
        if (s.id === set.id) return { ...s, set_order: other.set_order };
        if (s.id === other.id) return { ...s, set_order: set.set_order };
        return s;
      })
    );
  };

  if (loading) return <p style={{ color: "#8A8A8E" }}>Cargando…</p>;
  if (!program) return <p style={{ color: "#D45555" }}>Programa no encontrado</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/programs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Input
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            className="text-xl font-display font-bold max-w-md"
            style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
          />
          <Button size="sm" onClick={saveProgramName} disabled={saving} style={{ background: "#C75B39" }}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
        <span className="text-sm font-mono" style={{ color: "#8A8A8E" }}>
          {program.total_weeks} semanas · {program.user_id ? "Usuario" : "TEMPLATE"}
        </span>
      </div>

      {/* Week tabs */}
      <Tabs value={activeWeek} onValueChange={setActiveWeek}>
        <TabsList className="mb-4" style={{ background: "#1A1A1A" }}>
          {weekNumbers.map((w) => (
            <TabsTrigger key={w} value={String(w)} className="font-mono text-xs" style={{ color: activeWeek === String(w) ? "#FAF8F5" : "#8A8A8E" }}>
              S{w}
            </TabsTrigger>
          ))}
        </TabsList>

        {weekNumbers.map((week) => (
          <TabsContent key={week} value={String(week)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {DAY_NAMES.map((dayName, dayIdx) => {
                const workout = getWeekWorkouts(week).find(
                  (w) => w.day_label === dayName || new Date(w.scheduled_date).getDay() === (dayIdx + 1) % 7
                );

                if (!workout) {
                  return (
                    <div key={dayIdx} className="rounded-xl p-4" style={{ background: "#1A1A1A", borderColor: "#2A2A2A", border: "1px dashed #3A3A3A" }}>
                      <p className="text-sm font-mono mb-2" style={{ color: "#8A8A8E" }}>{dayName}</p>
                      <Button size="sm" variant="ghost" onClick={() => createWorkoutForDay(week, dayIdx)} style={{ color: "#C75B39" }}>
                        <Plus className="h-3 w-3 mr-1" /> Crear día
                      </Button>
                    </div>
                  );
                }

                const wSets = getWorkoutSets(workout.id);

                return (
                  <div key={dayIdx} className="rounded-xl p-4 space-y-3" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                    {/* Day header */}
                    <div className="flex items-center justify-between">
                      <Input
                        value={workout.day_label}
                        onChange={(e) => updateWorkout(workout.id, "day_label", e.target.value)}
                        className="text-sm font-display font-bold w-32"
                        style={{ background: "transparent", border: "none", color: "#FAF8F5", padding: 0 }}
                      />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs" style={{ color: "#8A8A8E" }}>Descanso</Label>
                        <Switch
                          checked={workout.is_rest_day}
                          onCheckedChange={(v) => updateWorkout(workout.id, "is_rest_day", v)}
                        />
                      </div>
                    </div>

                    {!workout.is_rest_day && (
                      <>
                        <div className="flex gap-2">
                          <Select
                            value={workout.workout_type}
                            onValueChange={(v) => updateWorkout(workout.id, "workout_type", v)}
                          >
                            <SelectTrigger className="text-xs h-8" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ background: "#1C1C1E", borderColor: "#3A3A3A" }}>
                              {WORKOUT_TYPES.map((t) => (
                                <SelectItem key={t} value={t} style={{ color: "#FAF8F5" }}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={workout.estimated_duration ?? ""}
                            onChange={(e) => updateWorkout(workout.id, "estimated_duration", e.target.value ? Number(e.target.value) : null)}
                            placeholder="min"
                            className="w-16 text-xs h-8"
                            style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                          />
                        </div>

                        <Textarea
                          value={workout.coach_note ?? ""}
                          onChange={(e) => updateWorkout(workout.id, "coach_note", e.target.value || null)}
                          placeholder="Coach note…"
                          className="text-xs min-h-[40px]"
                          style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                        />
                        <Textarea
                          value={workout.short_on_time_note ?? ""}
                          onChange={(e) => updateWorkout(workout.id, "short_on_time_note", e.target.value || null)}
                          placeholder="⏱ Short on time…"
                          className="text-xs min-h-[32px]"
                          style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
                        />

                        {/* Sets */}
                        <div className="space-y-1">
                          <p className="text-xs font-mono" style={{ color: "#8A8A8E" }}>Sets ({wSets.length})</p>
                          {wSets.map((s, sIdx) => (
                            <div key={s.id} className="flex items-center gap-1 text-xs" style={{ color: "#FAF8F5" }}>
                              <span className="w-5 text-center font-mono" style={{ color: "#8A8A8E" }}>{sIdx + 1}</span>
                              <span className="flex-1 truncate">{s.exercise_name}</span>
                              <span className="font-mono" style={{ color: "#8A8A8E" }}>{s.set_type.slice(0, 4)}</span>
                              <span className="font-mono" style={{ color: "#8A8A8E" }}>{s.planned_reps ?? "-"}r</span>
                              <span className="font-mono" style={{ color: "#C75B39" }}>{s.planned_rpe ? `RPE${s.planned_rpe}` : ""}</span>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveSet(s.id, "up")} disabled={sIdx === 0}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveSet(s.id, "down")} disabled={sIdx === wSets.length - 1}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => deleteSet(s.id)}>
                                <X className="h-3 w-3" style={{ color: "#D45555" }} />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs"
                          style={{ color: "#C75B39" }}
                          onClick={() => { setAddTargetWorkoutId(workout.id); setAddModalOpen(true); }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Agregar ejercicio
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add exercise modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent style={{ background: "#1C1C1E", borderColor: "#2A2A2A" }} className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "#FAF8F5" }}>Agregar ejercicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: "#8A8A8E" }} />
              <Input
                value={exerciseSearch}
                onChange={(e) => searchExercises(e.target.value)}
                placeholder="Buscar ejercicio…"
                className="pl-8"
                style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}
              />
            </div>
            {exerciseOptions.length > 0 && !selectedExercise && (
              <div className="max-h-40 overflow-y-auto rounded-lg" style={{ background: "#2A2A2A" }}>
                {exerciseOptions.map((ex) => (
                  <button
                    key={ex.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                    style={{ color: "#FAF8F5" }}
                    onClick={() => { setSelectedExercise(ex); setExerciseSearch(ex.name_es); }}
                  >
                    {ex.name_es} <span style={{ color: "#8A8A8E" }}>({ex.name})</span>
                  </button>
                ))}
              </div>
            )}
            {selectedExercise && (
              <>
                <p className="text-sm font-medium" style={{ color: "#C75B39" }}>{selectedExercise.name_es}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>Tipo</Label>
                    <Select value={newSetType} onValueChange={setNewSetType}>
                      <SelectTrigger className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1C1C1E", borderColor: "#3A3A3A" }}>
                        {SET_TYPES.map((t) => (
                          <SelectItem key={t} value={t} style={{ color: "#FAF8F5" }}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>Sets</Label>
                    <Input type="number" value={newSetCount} onChange={(e) => setNewSetCount(Number(e.target.value))} min={1} max={10} className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>Reps</Label>
                    <Input type="number" value={newReps} onChange={(e) => setNewReps(e.target.value ? Number(e.target.value) : "")} className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>RPE</Label>
                    <Input type="number" value={newRpe} onChange={(e) => setNewRpe(e.target.value ? Number(e.target.value) : "")} step={0.5} className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>Descanso (s)</Label>
                    <Input type="number" value={newRest} onChange={(e) => setNewRest(e.target.value ? Number(e.target.value) : "")} className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#8A8A8E" }}>Tempo</Label>
                    <Input value={newTempo} onChange={(e) => setNewTempo(e.target.value)} placeholder="3-1-1-1" className="h-8 text-xs" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs" style={{ color: "#8A8A8E" }}>Coaching cue override</Label>
                  <Textarea value={newCue} onChange={(e) => setNewCue(e.target.value)} className="text-xs min-h-[40px]" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setAddModalOpen(false); setSelectedExercise(null); }} style={{ color: "#8A8A8E" }}>Cancelar</Button>
            <Button onClick={handleAddSets} disabled={!selectedExercise} style={{ background: "#C75B39" }}>Agregar {newSetCount} sets</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
