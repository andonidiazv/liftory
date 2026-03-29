import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Copy, Eye, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface ProgramRow {
  id: string;
  name: string;
  total_weeks: number;
  user_id: string | null;
  created_at: string;
  workout_count: number;
  active_users: number;
}

export default function AdminPrograms() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWeeks, setNewWeeks] = useState(6);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgramRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPrograms = async () => {
    setLoading(true);

    // Only fetch templates
    const { data, error } = await supabase
      .from("programs")
      .select("id, name, total_weeks, user_id, created_at")
      .is("user_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching programs:", error);
      toast.error("Error al cargar programas");
    }

    if (!data) { setPrograms([]); setLoading(false); return; }

    // Get workout counts for templates
    const ids = data.map((p) => p.id);
    const { data: wCounts } = await supabase
      .from("workouts")
      .select("program_id")
      .in("program_id", ids);

    const countMap: Record<string, number> = {};
    (wCounts ?? []).forEach((w: { program_id: string }) => {
      countMap[w.program_id] = (countMap[w.program_id] || 0) + 1;
    });

    // Count active users per template (user copies with same name + is_active)
    const { data: userCopies } = await supabase
      .from("programs")
      .select("name, user_id, is_active")
      .not("user_id", "is", null);

    const activeUsersMap: Record<string, number> = {};
    (userCopies ?? []).forEach((uc) => {
      if (uc.is_active) {
        activeUsersMap[uc.name] = (activeUsersMap[uc.name] || 0) + 1;
      }
    });

    setPrograms(
      data.map((p) => ({
        ...p,
        workout_count: countMap[p.id] || 0,
        active_users: activeUsersMap[p.name] || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchPrograms(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("programs")
      .insert({ name: newName.trim(), total_weeks: newWeeks, user_id: null, is_active: true, current_week: 1, current_block: "accumulation" })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error("Error al crear programa"); return; }
    toast.success("Programa creado");
    setCreateOpen(false);
    setNewName("");
    setNewWeeks(6);
    if (data) navigate(`/admin/programs/${data.id}`);
  };

  const handleDuplicate = async (prog: ProgramRow) => {
    const { data: newProg, error } = await supabase
      .from("programs")
      .insert({ name: `${prog.name} (copia)`, total_weeks: prog.total_weeks, user_id: null, is_active: true, current_week: 1, current_block: "accumulation" })
      .select()
      .single();
    if (error || !newProg) { toast.error("Error al duplicar"); return; }

    const { data: ws } = await supabase.from("workouts").select("*").eq("program_id", prog.id);
    if (ws?.length) {
      for (const w of ws) {
        const { data: nw } = await supabase
          .from("workouts")
          .insert({ program_id: newProg.id, user_id: w.user_id, scheduled_date: w.scheduled_date, week_number: w.week_number, day_label: w.day_label, workout_type: w.workout_type, estimated_duration: w.estimated_duration, is_rest_day: w.is_rest_day, notes: w.notes, coach_note: w.coach_note, short_on_time_note: w.short_on_time_note })
          .select("id")
          .single();
        if (!nw) continue;
        const { data: sets } = await supabase.from("workout_sets").select("*").eq("workout_id", w.id);
        if (sets?.length) {
          await supabase.from("workout_sets").insert(
            sets.map((s) => ({ workout_id: nw.id, user_id: s.user_id, exercise_id: s.exercise_id, set_order: s.set_order, set_type: s.set_type, planned_reps: s.planned_reps, planned_weight: s.planned_weight, planned_rpe: s.planned_rpe, planned_rir: s.planned_rir, planned_rest_seconds: s.planned_rest_seconds, planned_tempo: s.planned_tempo, coaching_cue_override: s.coaching_cue_override, block_label: s.block_label }))
          );
        }
      }
    }
    toast.success("Programa duplicado");
    fetchPrograms();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { data: ws } = await supabase.from("workouts").select("id").eq("program_id", deleteTarget.id);
    if (ws?.length) {
      const wIds = ws.map((w) => w.id);
      await supabase.from("workout_sets").delete().in("workout_id", wIds);
      await supabase.from("workouts").delete().eq("program_id", deleteTarget.id);
    }
    const { error } = await supabase.from("programs").delete().eq("id", deleteTarget.id);

    setDeleting(false);
    setDeleteTarget(null);

    if (error) { toast.error("Error al eliminar programa"); return; }
    toast.success("Programa eliminado");
    fetchPrograms();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: "#FAF8F5" }}>Programas</h1>
        <Button onClick={() => setCreateOpen(true)} style={{ background: "#C75B39" }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo programa
        </Button>
      </div>

      {loading ? (
        <p style={{ color: "#8A8A8E" }}>Cargando…</p>
      ) : (
        <div className="rounded-xl border" style={{ borderColor: "#2A2A2A", background: "#1A1A1A" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "#2A2A2A" }}>
                <TableHead style={{ color: "#8A8A8E" }}>Nombre</TableHead>
                <TableHead style={{ color: "#8A8A8E" }}>Semanas</TableHead>
                <TableHead style={{ color: "#8A8A8E" }}>Workouts</TableHead>
                <TableHead style={{ color: "#8A8A8E" }}>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Atletas activos
                  </span>
                </TableHead>
                <TableHead style={{ color: "#8A8A8E" }}>Creado</TableHead>
                <TableHead style={{ color: "#8A8A8E" }}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => (
                <TableRow
                  key={p.id}
                  style={{ borderColor: "#2A2A2A", cursor: "pointer" }}
                  className="hover:bg-white/5"
                  onClick={() => navigate(`/admin/programs/${p.id}`)}
                >
                  <TableCell style={{ color: "#FAF8F5" }} className="font-display font-medium">{p.name}</TableCell>
                  <TableCell style={{ color: "#FAF8F5" }}>{p.total_weeks}</TableCell>
                  <TableCell style={{ color: "#FAF8F5" }}>{p.workout_count}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs"
                      style={{
                        background: p.active_users > 0 ? "rgba(122,139,92,0.15)" : "rgba(58,58,58,0.3)",
                        color: p.active_users > 0 ? "#7A8B5C" : "#3A3A3A",
                      }}
                    >
                      {p.active_users}
                    </span>
                  </TableCell>
                  <TableCell style={{ color: "#8A8A8E" }}>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/programs/${p.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!programs.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8" style={{ color: "#8A8A8E" }}>No hay programas</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: "#1C1C1E", borderColor: "#2A2A2A" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#FAF8F5" }}>Nuevo programa template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label style={{ color: "#8A8A8E" }}>Nombre</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="BUILD HIM ELITE" style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
            </div>
            <div>
              <Label style={{ color: "#8A8A8E" }}>Semanas</Label>
              <Input type="number" value={newWeeks} onChange={(e) => setNewWeeks(Number(e.target.value))} min={1} max={52} style={{ background: "#2A2A2A", borderColor: "#3A3A3A", color: "#FAF8F5" }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} style={{ color: "#8A8A8E" }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} style={{ background: "#C75B39" }}>{creating ? "Creando…" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ background: "#1C1C1E", borderColor: "#2A2A2A" }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#FAF8F5" }}>¿Eliminar programa?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: "#8A8A8E" }}>
              Se eliminará "{deleteTarget?.name}" y todos sus workouts y sets asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ color: "#8A8A8E", borderColor: "#2A2A2A" }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} style={{ background: "#D45555" }}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
