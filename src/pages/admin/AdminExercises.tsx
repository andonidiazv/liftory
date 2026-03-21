import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, X, Check, Video, VideoOff,
  ChevronLeft, ChevronRight, AlertTriangle, Upload, Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

/* ─── Constants ─── */
const CATEGORIES = ["strength", "olympic", "conditioning", "mobility", "accessory"];
const PATTERNS = ["squat", "hinge", "push", "pull", "carry", "rotation", "core"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced", "all_levels"];
const EQUIPMENT_OPTIONS = [
  "barbell", "dumbbell", "kettlebell", "cable", "machine", "band",
  "bodyweight", "rack", "bench", "box", "none"
];
const MUSCLE_OPTIONS = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings",
  "glutes", "calves", "core", "lats", "traps", "rhomboids", "forearms", "hip_flexors"
];
const CONTRAINDICATION_OPTIONS = [
  "lower_back", "shoulder", "knee", "wrist", "neck", "ankle", "hip"
];

const difficultyColors: Record<string, string> = {
  beginner: "#7A8B5C",
  intermediate: "#B8622F",
  advanced: "#C9A96E",
  all_levels: "#8A8A8E",
};

const PAGE_SIZE = 20;

/* ─── Types ─── */
interface ExerciseRow {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  category: string;
  movement_pattern: string;
  difficulty: string;
  equipment_required: string[] | null;
  primary_muscles: string[] | null;
  contraindications: string[] | null;
  emotional_barrier_tag: string | null;
  default_tempo: string | null;
  coaching_cue: string | null;
  founder_notes: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  video_duration_seconds: number | null;
}

type FormData = Omit<ExerciseRow, "id"> & { id?: string };

const emptyForm: FormData = {
  name: "", name_es: "", description: "", category: "strength",
  movement_pattern: "push", difficulty: "intermediate",
  equipment_required: [], primary_muscles: [], contraindications: [],
  emotional_barrier_tag: "", default_tempo: "", coaching_cue: "",
  founder_notes: "", video_url: null, thumbnail_url: null, is_active: true,
  video_duration_seconds: null,
};

export default function AdminExercises() {
  const { user: adminUser } = useAuth();
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [diffFilter, setDiffFilter] = useState("all");
  const [patternFilter, setPatternFilter] = useState("all");
  const [noVideoOnly, setNoVideoOnly] = useState(false);

  // Counts
  const [activeCount, setActiveCount] = useState(0);
  const [withVideo, setWithVideo] = useState(0);
  const [withoutVideo, setWithoutVideo] = useState(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [originalForm, setOriginalForm] = useState<FormData | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);

  // File uploads
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Confirm deactivate
  const [confirmDeactivate, setConfirmDeactivate] = useState<ExerciseRow | null>(null);

  /* ─── Fetch ─── */
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("exercises")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (catFilter !== "all") query = query.eq("category", catFilter);
    if (diffFilter !== "all") query = query.eq("difficulty", diffFilter);
    if (patternFilter !== "all") query = query.eq("movement_pattern", patternFilter);
    if (noVideoOnly) query = query.is("video_url", null);
    if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,name_es.ilike.%${search.trim()}%`);

    const { data, count } = await query;
    setExercises((data as ExerciseRow[]) || []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, catFilter, diffFilter, patternFilter, noVideoOnly, search]);

  const fetchCounts = useCallback(async () => {
    const [activeRes, videoRes, noVideoRes] = await Promise.all([
      supabase.from("exercises").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("exercises").select("*", { count: "exact", head: true }).eq("is_active", true).not("video_url", "is", null),
      supabase.from("exercises").select("*", { count: "exact", head: true }).eq("is_active", true).is("video_url", null),
    ]);
    setActiveCount(activeRes.count ?? 0);
    setWithVideo(videoRes.count ?? 0);
    setWithoutVideo(noVideoRes.count ?? 0);
  }, []);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(0); }, [catFilter, diffFilter, patternFilter, noVideoOnly, search]);

  /* ─── Modal helpers ─── */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setOriginalForm(null);
    setVideoFile(null);
    setThumbFile(null);
    setActiveTab(0);
    setUploadProgress(null);
    setModalOpen(true);
  };

  const openEdit = (ex: ExerciseRow) => {
    const f: FormData = { ...ex };
    setForm(f);
    setOriginalForm({ ...f });
    setVideoFile(null);
    setThumbFile(null);
    setActiveTab(0);
    setUploadProgress(null);
    setModalOpen(true);
  };

  /* ─── Slug helper ─── */
  const toSlug = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!form.name.trim() || !form.name_es.trim()) {
      toast({ title: "Error", description: "Nombre en inglés y español son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = toSlug(form.name);
    let videoUrl = form.video_url;
    let thumbUrl = form.thumbnail_url;

    try {
      // Upload video if selected
      if (videoFile) {
        setUploadProgress(10);
        const { error: vErr } = await supabase.storage
          .from("exercise-videos")
          .upload(`${slug}/demo.mp4`, videoFile, {
            cacheControl: "3600", upsert: true, contentType: "video/mp4",
          });
        if (vErr) throw new Error(`Video upload failed: ${vErr.message}`);
        setUploadProgress(70);
        const { data: vd } = supabase.storage.from("exercise-videos").getPublicUrl(`${slug}/demo.mp4`);
        videoUrl = vd.publicUrl;
      }

      // Upload thumbnail if selected
      if (thumbFile) {
        setUploadProgress((p) => (p ?? 70) + 10);
        const ext = thumbFile.name.split(".").pop() || "jpg";
        const { error: tErr } = await supabase.storage
          .from("exercise-videos")
          .upload(`${slug}/thumbnail.${ext}`, thumbFile, {
            cacheControl: "3600", upsert: true, contentType: thumbFile.type,
          });
        if (tErr) throw new Error(`Thumbnail upload failed: ${tErr.message}`);
        const { data: td } = supabase.storage.from("exercise-videos").getPublicUrl(`${slug}/thumbnail.${ext}`);
        thumbUrl = td.publicUrl;
      }
      setUploadProgress(90);

      const payload = {
        name: form.name, name_es: form.name_es, description: form.description || null,
        category: form.category, movement_pattern: form.movement_pattern, difficulty: form.difficulty,
        equipment_required: form.equipment_required || [],
        primary_muscles: form.primary_muscles || [],
        contraindications: form.contraindications || [],
        emotional_barrier_tag: form.emotional_barrier_tag || null,
        default_tempo: form.default_tempo || null,
        coaching_cue: form.coaching_cue || null,
        founder_notes: form.founder_notes || null,
        video_url: videoUrl, thumbnail_url: thumbUrl,
        video_duration_seconds: form.video_duration_seconds,
        is_active: form.is_active,
      };

      if (form.id) {
        // Update
        const { error } = await supabase.from("exercises").update(payload).eq("id", form.id);
        if (error) throw error;
        // Audit
        await supabase.from("audit_log").insert({
          admin_user_id: adminUser!.id,
          action_type: "content_updated",
          target_table: "exercises",
          target_id: form.id,
          old_values: originalForm as any,
          new_values: payload as any,
        } as any);
        toast({ title: "Ejercicio actualizado" });
      } else {
        // Insert
        const { error } = await supabase.from("exercises").insert(payload as any);
        if (error) throw error;
        toast({ title: "Ejercicio creado" });
      }
      setUploadProgress(100);
      setModalOpen(false);
      fetchExercises();
      fetchCounts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  /* ─── Deactivate ─── */
  const handleDeactivate = async (ex: ExerciseRow) => {
    const newActive = !ex.is_active;
    await supabase.from("exercises").update({ is_active: newActive }).eq("id", ex.id);
    await supabase.from("audit_log").insert({
      admin_user_id: adminUser!.id,
      action_type: newActive ? "content_activated" : "content_deactivated",
      target_table: "exercises",
      target_id: ex.id,
      old_values: { is_active: ex.is_active },
      new_values: { is_active: newActive },
    } as any);
    toast({ title: newActive ? "Ejercicio activado" : "Ejercicio desactivado" });
    setConfirmDeactivate(null);
    fetchExercises();
    fetchCounts();
  };

  /* ─── Multi-select toggle helper ─── */
  const toggleChip = (field: "equipment_required" | "primary_muscles" | "contraindications", value: string) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const tabs = ["Información", "Detalles técnicos", "Media"];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Ejercicios</h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground" style={{ letterSpacing: "0.03em" }}>
            {activeCount} activos · {withVideo} con video · {withoutVideo} sin video
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors"
          style={{ background: "#B8622F", color: "#FAF8F5" }}
        >
          <Plus className="h-4 w-4" /> Nuevo ejercicio
        </button>
      </div>

      {/* ─── Filters ─── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm font-body"
            style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
          />
        </div>
        <FilterSelect value={catFilter} onChange={setCatFilter} options={CATEGORIES} allLabel="Categoría" />
        <FilterSelect value={diffFilter} onChange={setDiffFilter} options={DIFFICULTIES} allLabel="Dificultad" />
        <FilterSelect value={patternFilter} onChange={setPatternFilter} options={PATTERNS} allLabel="Patrón" />
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body text-muted-foreground">
          <input
            type="checkbox"
            checked={noVideoOnly}
            onChange={(e) => setNoVideoOnly(e.target.checked)}
            className="rounded accent-primary"
          />
          Solo sin video
        </label>
      </div>

      {/* ─── Table ─── */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                {["Name", "Category", "Difficulty", "Muscles", "Pattern", "Video", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-label-tech text-muted-foreground font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exercises.map((ex) => (
                <tr
                  key={ex.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid rgba(250,248,245,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3 text-[13px] font-body" style={{ color: "#FAF8F5" }}>{ex.name}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground capitalize">{ex.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${difficultyColors[ex.difficulty] || "#8A8A8E"}20`, color: difficultyColors[ex.difficulty] || "#8A8A8E" }}
                    >
                      {ex.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground max-w-[140px] truncate">
                    {ex.primary_muscles?.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground capitalize">{ex.movement_pattern}</td>
                  <td className="px-4 py-3">
                    {ex.video_url ? (
                      <Video className="h-4 w-4" style={{ color: "#7A8B5C" }} />
                    ) : (
                      <VideoOff className="h-4 w-4" style={{ color: "#C0392B" }} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: ex.is_active ? "rgba(122,139,92,0.15)" : "rgba(138,138,142,0.15)",
                        color: ex.is_active ? "#7A8B5C" : "#8A8A8E",
                      }}
                    >
                      {ex.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(ex)} className="rounded p-1.5 hover:bg-white/5 transition-colors">
                        <Pencil className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                      </button>
                      <button onClick={() => setConfirmDeactivate(ex)} className="rounded p-1.5 hover:bg-white/5 transition-colors">
                        {ex.is_active ? (
                          <X className="h-3.5 w-3.5" style={{ color: "#C0392B" }} />
                        ) : (
                          <Check className="h-3.5 w-3.5" style={{ color: "#7A8B5C" }} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {exercises.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay ejercicios con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg p-2 disabled:opacity-30" style={{ background: "#1C1C1E" }}>
              <ChevronLeft className="h-4 w-4" style={{ color: "#FAF8F5" }} />
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg p-2 disabled:opacity-30" style={{ background: "#1C1C1E" }}>
              <ChevronRight className="h-4 w-4" style={{ color: "#FAF8F5" }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-xl"
            style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "#1C1C1E", borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
              <h2 className="font-display text-lg font-semibold" style={{ color: "#FAF8F5" }}>
                {form.id ? "Editar ejercicio" : "Nuevo ejercicio"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-white/5"><X className="h-5 w-5" style={{ color: "#8A8A8E" }} /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: "rgba(250,248,245,0.06)" }}>
              {tabs.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(i)}
                  className="px-5 py-3 text-sm font-body transition-colors"
                  style={{
                    color: activeTab === i ? "#FAF8F5" : "#8A8A8E",
                    borderBottom: activeTab === i ? "2px solid #B8622F" : "2px solid transparent",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-6 py-5 space-y-4">
              {activeTab === 0 && (
                <>
                  <FormField label="Nombre en inglés *" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
                  <FormField label="Nombre en español *" value={form.name_es} onChange={(v) => setForm((p) => ({ ...p, name_es: v }))} />
                  <div>
                    <label className="text-label-tech text-muted-foreground">Descripción</label>
                    <textarea
                      value={form.description || ""}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body resize-none"
                      style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <SelectField label="Categoría" value={form.category} options={CATEGORIES} onChange={(v) => setForm((p) => ({ ...p, category: v }))} />
                    <SelectField label="Patrón" value={form.movement_pattern} options={PATTERNS} onChange={(v) => setForm((p) => ({ ...p, movement_pattern: v }))} />
                    <SelectField label="Dificultad" value={form.difficulty} options={DIFFICULTIES} onChange={(v) => setForm((p) => ({ ...p, difficulty: v }))} />
                  </div>
                </>
              )}

              {activeTab === 1 && (
                <>
                  <ChipSelect label="Equipo requerido" options={EQUIPMENT_OPTIONS} selected={form.equipment_required || []} onToggle={(v) => toggleChip("equipment_required", v)} />
                  <ChipSelect label="Músculos principales" options={MUSCLE_OPTIONS} selected={form.primary_muscles || []} onToggle={(v) => toggleChip("primary_muscles", v)} />
                  <ChipSelect label="Contraindicaciones" options={CONTRAINDICATION_OPTIONS} selected={form.contraindications || []} onToggle={(v) => toggleChip("contraindications", v)} />
                  <FormField label="Etiqueta de barrera emocional" value={form.emotional_barrier_tag || ""} onChange={(v) => setForm((p) => ({ ...p, emotional_barrier_tag: v }))} placeholder="Ej: fear_of_failure" />
                  <FormField label="Tempo base" value={form.default_tempo || ""} onChange={(v) => setForm((p) => ({ ...p, default_tempo: v }))} placeholder="3.1.1.0" />
                  <div>
                    <label className="text-label-tech text-muted-foreground">Coaching cue</label>
                    <textarea
                      value={form.coaching_cue || ""}
                      onChange={(e) => setForm((p) => ({ ...p, coaching_cue: e.target.value }))}
                      rows={2}
                      placeholder="Frase corta de coaching durante el set"
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body resize-none"
                      style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label className="text-label-tech text-muted-foreground">Notas del founder (privado)</label>
                    <textarea
                      value={form.founder_notes || ""}
                      onChange={(e) => setForm((p) => ({ ...p, founder_notes: e.target.value }))}
                      rows={3}
                      placeholder="Notas solo visibles en Admin..."
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body resize-none"
                      style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
                    />
                  </div>
                </>
              )}

              {activeTab === 2 && (
                <>
                  {/* Video upload */}
                  <div>
                    <label className="text-label-tech text-muted-foreground">Video (MP4, máx 50MB)</label>
                    {form.video_url && !videoFile && (
                      <div className="mt-2 rounded-lg overflow-hidden" style={{ background: "#0D0C0A" }}>
                        <video src={form.video_url} className="w-full max-h-[200px] object-contain" controls muted />
                      </div>
                    )}
                    {videoFile && (
                      <div className="mt-2 rounded-lg p-3" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-body" style={{ color: "#FAF8F5" }}>{videoFile.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                        <video src={URL.createObjectURL(videoFile)} className="mt-2 w-full max-h-[200px] object-contain rounded" controls muted />
                      </div>
                    )}
                    <label
                      className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body transition-colors"
                      style={{ background: "rgba(250,248,245,0.04)", color: "#8A8A8E" }}
                    >
                      <Upload className="h-4 w-4" />
                      {videoFile ? "Cambiar video" : "Seleccionar video"}
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-m4v,video/webm,.mov,.mp4,.m4v,.webm"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.size > 50 * 1024 * 1024) {
                            toast({ title: "Error", description: "El video no puede superar 50MB.", variant: "destructive" });
                            return;
                          }
                          setVideoFile(f || null);
                        }}
                      />
                    </label>
                  </div>

                  {/* Thumbnail upload */}
                  <div>
                    <label className="text-label-tech text-muted-foreground">Thumbnail (JPG/PNG, máx 2MB)</label>
                    {(form.thumbnail_url || thumbFile) && (
                      <div className="mt-2">
                        <img
                          src={thumbFile ? URL.createObjectURL(thumbFile) : form.thumbnail_url!}
                          alt="Thumbnail"
                          className="h-32 w-auto rounded-lg object-cover"
                        />
                      </div>
                    )}
                    <label
                      className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body transition-colors"
                      style={{ background: "rgba(250,248,245,0.04)", color: "#8A8A8E" }}
                    >
                      <Upload className="h-4 w-4" />
                      {thumbFile ? "Cambiar thumbnail" : "Seleccionar thumbnail"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.size > 2 * 1024 * 1024) {
                            toast({ title: "Error", description: "La imagen no puede superar 2MB.", variant: "destructive" });
                            return;
                          }
                          setThumbFile(f || null);
                        }}
                      />
                    </label>
                  </div>

                  {/* Video duration */}
                  <div>
                    <label className="text-label-tech text-muted-foreground">Duración del video (segundos)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.video_duration_seconds ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, video_duration_seconds: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="Ej: 45"
                      className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body"
                      style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="px-6 pb-2">
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(250,248,245,0.06)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: "#B8622F" }} />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4" style={{ background: "#1C1C1E", borderTop: "1px solid rgba(250,248,245,0.06)" }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors"
                style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-body font-medium transition-colors"
                style={{ background: "#B8622F", color: "#FAF8F5", opacity: saving ? 0.7 : 1 }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Guardando..." : "Guardar ejercicio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Deactivate Modal ─── */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[380px] rounded-xl p-6" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h3 className="font-display text-base font-semibold" style={{ color: "#FAF8F5" }}>
                {confirmDeactivate.is_active ? "Desactivar ejercicio" : "Activar ejercicio"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground font-body mb-6">
              {confirmDeactivate.is_active
                ? `"${confirmDeactivate.name_es}" dejará de aparecer en la biblioteca y la IA no lo programará.`
                : `"${confirmDeactivate.name_es}" volverá a estar disponible en la biblioteca.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium"
                style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeactivate(confirmDeactivate)}
                className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium"
                style={{ background: confirmDeactivate.is_active ? "#C0392B" : "#7A8B5C", color: "#FAF8F5" }}
              >
                {confirmDeactivate.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable sub-components ─── */
function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-label-tech text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body"
        style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
      />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-label-tech text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body capitalize"
        style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterSelect({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: string[]; allLabel: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-3 py-2.5 text-sm font-body capitalize"
      style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ChipSelect({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div>
      <label className="text-label-tech text-muted-foreground">{label}</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className="rounded-md px-2.5 py-1 text-xs font-body transition-colors"
              style={{
                background: active ? "rgba(184,98,47,0.15)" : "rgba(250,248,245,0.04)",
                color: active ? "#B8622F" : "#8A8A8E",
                border: active ? "1px solid rgba(184,98,47,0.3)" : "1px solid rgba(250,248,245,0.06)",
              }}
            >
              {o.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
