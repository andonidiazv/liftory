import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Search, Plus, Pencil, X, Check, Video, VideoOff,
  ChevronLeft, ChevronRight, AlertTriangle, Upload, Loader2, Image as ImageIcon,
  Copy, Download, ArrowUp, ArrowDown
} from "lucide-react";
import VideoThumbnailExtractor from "@/components/admin/VideoThumbnailExtractor";
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

type SortColumn = "name" | "category" | "difficulty" | "movement_pattern";
type SortDir = "asc" | "desc";

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
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [noVideoOnly, setNoVideoOnly] = useState(false);
  const [withVideoOnly, setWithVideoOnly] = useState(false);
  const [noSubsOnly, setNoSubsOnly] = useState(false);
  const [withSubsOnly, setWithSubsOnly] = useState(false);

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Counts
  const [activeCount, setActiveCount] = useState(0);
  const [withVideo, setWithVideo] = useState(0);
  const [withoutVideo, setWithoutVideo] = useState(0);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Subs count map & usage count map
  const [subsCountMap, setSubsCountMap] = useState<Map<string, number>>(new Map());
  const [usageCountMap, setUsageCountMap] = useState<Map<string, number>>(new Map());

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

  // Batch thumbnail generation
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: "" });
  const batchAbortRef = useRef(false);

  const batchGenerateThumbnails = useCallback(async () => {
    setBatchRunning(true);
    batchAbortRef.current = false;

    // Fetch all exercises with video but no thumbnail
    const { data: toProcess } = await supabase
      .from("exercises")
      .select("id, name, video_url")
      .not("video_url", "is", null)
      .is("thumbnail_url", null)
      .eq("is_active", true)
      .order("name");

    if (!toProcess || toProcess.length === 0) {
      toast({ title: "No hay ejercicios pendientes", description: "Todos los ejercicios con video ya tienen thumbnail." });
      setBatchRunning(false);
      return;
    }

    setBatchProgress({ current: 0, total: toProcess.length, name: "" });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      if (batchAbortRef.current) break;
      const ex = toProcess[i];
      setBatchProgress({ current: i + 1, total: toProcess.length, name: ex.name });

      try {
        // Create a hidden video element to extract a frame
        const blob: Blob = await new Promise((resolve, reject) => {
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;

          const timeout = setTimeout(() => {
            video.src = "";
            reject(new Error("timeout"));
          }, 15000);

          video.onloadedmetadata = () => {
            video.currentTime = video.duration * 0.3;
          };

          video.onseeked = () => {
            if (video.readyState < 2) return;
            clearTimeout(timeout);
            const canvas = document.createElement("canvas");
            const scale = Math.min(1, 600 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("no ctx")); return; }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (b) => {
                video.src = "";
                b ? resolve(b) : reject(new Error("toBlob failed"));
              },
              "image/jpeg",
              0.85
            );
          };

          video.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("video load error"));
          };

          video.src = ex.video_url!;
        });

        // Upload to Supabase storage
        const fileName = `${ex.id}_thumb.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("exercise-thumbnails")
          .upload(fileName, blob, { cacheControl: "3600", upsert: true, contentType: "image/jpeg" });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("exercise-thumbnails")
          .getPublicUrl(fileName);

        const url = `${urlData.publicUrl}?t=${Date.now()}`;

        // Update DB
        const { error: dbErr } = await supabase
          .from("exercises")
          .update({ thumbnail_url: url })
          .eq("id", ex.id);

        if (dbErr) throw dbErr;
        successCount++;
      } catch (err) {
        failCount++;
        // Thumbnail generation failed for this exercise
      }
    }

    toast({
      title: "Batch completado",
      description: `${successCount} thumbnails generados, ${failCount} errores.`,
    });
    setBatchRunning(false);
    fetchExercises();
    fetchCounts();
  }, []);

  /* ─── Fetch subs counts ─── */
  const fetchSubsCounts = useCallback(async () => {
    const { data } = await supabase
      .from("exercise_substitutions")
      .select("exercise_id");
    const map = new Map<string, number>();
    if (data) {
      for (const row of data) {
        map.set(row.exercise_id, (map.get(row.exercise_id) || 0) + 1);
      }
    }
    setSubsCountMap(map);
  }, []);

  /* ─── Fetch usage counts ─── */
  const fetchUsageCounts = useCallback(async () => {
    const { data } = await supabase
      .from("workout_sets")
      .select("exercise_id");
    const map = new Map<string, number>();
    if (data) {
      for (const row of data) {
        if (row.exercise_id) {
          map.set(row.exercise_id, (map.get(row.exercise_id) || 0) + 1);
        }
      }
    }
    setUsageCountMap(map);
  }, []);

  /* ─── Fetch ─── */
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("exercises")
      .select("*", { count: "exact" })
      .order(sortColumn === "movement_pattern" ? "movement_pattern" : sortColumn, { ascending: sortDir === "asc" });

    // When subs filter is active, load all exercises so client-side filter works across all
    if (noSubsOnly || withSubsOnly) {
      query = query.range(0, 999);
    } else {
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    }

    if (catFilter !== "all") query = query.eq("category", catFilter);
    if (diffFilter !== "all") query = query.eq("difficulty", diffFilter);
    if (patternFilter !== "all") query = query.eq("movement_pattern", patternFilter);
    if (muscleFilter !== "all") query = query.contains("primary_muscles", [muscleFilter]);
    if (noVideoOnly) query = query.is("video_url", null);
    if (withVideoOnly) query = query.not("video_url", "is", null).neq("video_url", "");
    if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,name_es.ilike.%${search.trim()}%`);

    const { data, count } = await query;
    setExercises((data as ExerciseRow[]) || []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, catFilter, diffFilter, patternFilter, muscleFilter, noVideoOnly, withVideoOnly, search, sortColumn, sortDir, noSubsOnly, withSubsOnly]);

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
  useEffect(() => { fetchSubsCounts(); fetchUsageCounts(); }, [fetchSubsCounts, fetchUsageCounts]);
  useEffect(() => { setPage(0); }, [catFilter, diffFilter, patternFilter, muscleFilter, noVideoOnly, withVideoOnly, search]);
  // Clear selection when page/filters change
  useEffect(() => { setSelectedIds(new Set()); }, [page, catFilter, diffFilter, patternFilter, muscleFilter, noVideoOnly, withVideoOnly, search]);

  /* ─── Client-side post-filter for subs filters ─── */
  const displayExercises = useMemo(() => {
    if (!noSubsOnly && !withSubsOnly) return exercises;
    return exercises.filter((ex) => {
      const count = subsCountMap.get(ex.id) || 0;
      if (noSubsOnly) return count === 0;
      if (withSubsOnly) return count > 0;
      return true;
    });
  }, [exercises, noSubsOnly, withSubsOnly, subsCountMap]);

  /* ─── Sort header click ─── */
  const handleSortClick = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  };

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

  const openDuplicate = (ex: ExerciseRow) => {
    const f: FormData = {
      ...ex,
      id: undefined,
      name: `Copy of ${ex.name}`,
      name_es: `Copia de ${ex.name_es}`,
    };
    // Remove the id field so it creates a new one
    delete (f as any).id;
    setForm(f);
    setOriginalForm(null);
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
          old_values: originalForm as Record<string, unknown>,
          new_values: payload as Record<string, unknown>,
        });
        toast({ title: "Ejercicio actualizado" });
      } else {
        // Insert
        const { error } = await supabase.from("exercises").insert(payload);
        if (error) throw error;
        toast({ title: "Ejercicio creado" });
      }
      setUploadProgress(100);
      setModalOpen(false);
      fetchExercises();
      fetchCounts();
      fetchSubsCounts();
      fetchUsageCounts();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
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
    });
    toast({ title: newActive ? "Ejercicio activado" : "Ejercicio desactivado" });
    setConfirmDeactivate(null);
    fetchExercises();
    fetchCounts();
  };

  /* ─── Bulk actions ─── */
  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from("exercises").update({ is_active: false }).eq("id", id);
    }
    toast({ title: `${ids.length} ejercicios desactivados` });
    setSelectedIds(new Set());
    fetchExercises();
    fetchCounts();
  };

  const handleBulkChangeDifficulty = async (newDiff: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from("exercises").update({ difficulty: newDiff }).eq("id", id);
    }
    toast({ title: `Dificultad cambiada a "${newDiff}" en ${ids.length} ejercicios` });
    setSelectedIds(new Set());
    fetchExercises();
  };

  const handleBulkChangeCategory = async (newCat: string) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await supabase.from("exercises").update({ category: newCat }).eq("id", id);
    }
    toast({ title: `Categoría cambiada a "${newCat}" en ${ids.length} ejercicios` });
    setSelectedIds(new Set());
    fetchExercises();
  };

  /* ─── Export CSV ─── */
  const handleExportCSV = () => {
    const dataToExport = selectedIds.size > 0
      ? displayExercises.filter((ex) => selectedIds.has(ex.id))
      : displayExercises;

    if (dataToExport.length === 0) {
      toast({ title: "No hay datos para exportar" });
      return;
    }

    const headers = ["name", "name_es", "category", "difficulty", "movement_pattern", "primary_muscles", "equipment_required", "video_url", "is_active"];
    const csvRows = [headers.join(",")];
    for (const ex of dataToExport) {
      const row = [
        `"${(ex.name || "").replace(/"/g, '""')}"`,
        `"${(ex.name_es || "").replace(/"/g, '""')}"`,
        ex.category,
        ex.difficulty,
        ex.movement_pattern,
        `"${(ex.primary_muscles || []).join("; ")}"`,
        `"${(ex.equipment_required || []).join("; ")}"`,
        `"${ex.video_url || ""}"`,
        ex.is_active ? "true" : "false",
      ];
      csvRows.push(row.join(","));
    }
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `liftory_exercises_${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: `CSV exportado (${dataToExport.length} ejercicios)` });
  };

  /* ─── Multi-select toggle helper ─── */
  const toggleChip = (field: "equipment_required" | "primary_muscles" | "contraindications", value: string) => {
    setForm((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  /* ─── Selection helpers ─── */
  const toggleSelectAll = () => {
    const pageIds = displayExercises.map((ex) => ex.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const tabs = ["Información", "Detalles técnicos", "Media", "Sustituciones"];

  // Pagination display
  const from = displayExercises.length > 0 ? page * PAGE_SIZE + 1 : 0;
  const to = page * PAGE_SIZE + displayExercises.length;

  /* ─── Sort header render helper ─── */
  const SortHeader = ({ col, label }: { col: SortColumn; label: string }) => (
    <th
      className="px-4 py-3 text-left text-label-tech font-normal cursor-pointer select-none"
      style={{ color: "#8A8A8E" }}
      onClick={() => handleSortClick(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortColumn === col ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3" style={{ color: "#B8622F" }} /> : <ArrowDown className="h-3 w-3" style={{ color: "#B8622F" }} />
        ) : (
          <span style={{ opacity: 0.3, fontSize: "10px" }}>▲▼</span>
        )}
      </span>
    </th>
  );

  /* ─── Substitutions state ─── */
  const [substitutions, setSubstitutions] = useState<{ id: string; substitute_exercise_id: string; priority: number; name_es: string; name: string }[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsSearch, setSubsSearch] = useState("");
  const [subsResults, setSubsResults] = useState<{ id: string; name_es: string; name: string; category: string }[]>([]);
  const [subsSearching, setSubsSearching] = useState(false);

  const fetchSubstitutions = useCallback(async (exerciseId: string) => {
    setSubsLoading(true);
    const { data } = await supabase
      .from("exercise_substitutions")
      .select("id, substitute_exercise_id, priority, exercises!exercise_substitutions_substitute_exercise_id_fkey(name_es, name)")
      .eq("exercise_id", exerciseId)
      .order("priority");
    setSubstitutions(
      (data || []).map((d: any) => ({
        id: d.id,
        substitute_exercise_id: d.substitute_exercise_id,
        priority: d.priority,
        name_es: d.exercises?.name_es || "—",
        name: d.exercises?.name || "—",
      }))
    );
    setSubsLoading(false);
  }, []);

  const searchSubstitutes = useCallback(async (q: string, exerciseId: string) => {
    if (q.trim().length < 2) { setSubsResults([]); return; }
    setSubsSearching(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name_es, name, category")
      .or(`name.ilike.%${q.trim()}%,name_es.ilike.%${q.trim()}%`)
      .neq("id", exerciseId)
      .eq("is_active", true)
      .limit(10);
    // Filter out already-added substitutes
    const existingIds = new Set(substitutions.map(s => s.substitute_exercise_id));
    setSubsResults((data || []).filter(d => !existingIds.has(d.id)));
    setSubsSearching(false);
  }, [substitutions]);

  const addSubstitution = useCallback(async (exerciseId: string, substituteId: string) => {
    const nextPriority = substitutions.length + 1;
    const { error } = await supabase
      .from("exercise_substitutions")
      .insert({ exercise_id: exerciseId, substitute_exercise_id: substituteId, priority: nextPriority });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSubsSearch("");
    setSubsResults([]);
    fetchSubstitutions(exerciseId);
    fetchSubsCounts();
  }, [substitutions, fetchSubstitutions, fetchSubsCounts]);

  const removeSubstitution = useCallback(async (subId: string, exerciseId: string) => {
    await supabase.from("exercise_substitutions").delete().eq("id", subId);
    fetchSubstitutions(exerciseId);
    fetchSubsCounts();
  }, [fetchSubstitutions, fetchSubsCounts]);

  // Load substitutions when switching to tab 3 or opening modal for an existing exercise
  useEffect(() => {
    if (activeTab === 3 && form.id) {
      fetchSubstitutions(form.id);
    }
  }, [activeTab, form.id, fetchSubstitutions]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Ejercicios</h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground" style={{ letterSpacing: "0.03em" }}>
            {activeCount} activos · {withVideo} con video · {withoutVideo} sin video
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors"
            style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={batchGenerateThumbnails}
            disabled={batchRunning}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors"
            style={{ background: "#7A8B5C", color: "#FAF8F5", opacity: batchRunning ? 0.7 : 1 }}
          >
            {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {batchRunning ? `${batchProgress.current}/${batchProgress.total}` : "Generar Thumbnails"}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium transition-colors"
            style={{ background: "#B8622F", color: "#FAF8F5" }}
          >
            <Plus className="h-4 w-4" /> Nuevo ejercicio
          </button>
        </div>
      </div>

      {/* ─── Batch Progress ─── */}
      {batchRunning && (
        <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(122,139,92,0.15)", border: "1px solid rgba(122,139,92,0.3)" }}>
          <div className="flex items-center justify-between text-sm font-body">
            <span style={{ color: "#FAF8F5" }}>
              Generando: <strong>{batchProgress.name}</strong> ({batchProgress.current}/{batchProgress.total})
            </span>
            <button
              onClick={() => { batchAbortRef.current = true; }}
              className="text-xs px-2 py-1 rounded"
              style={{ background: "rgba(250,248,245,0.1)", color: "#FAF8F5" }}
            >
              Cancelar
            </button>
          </div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(250,248,245,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                background: "#7A8B5C",
              }}
            />
          </div>
        </div>
      )}

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
        <FilterSelect value={muscleFilter} onChange={setMuscleFilter} options={MUSCLE_OPTIONS} allLabel="Músculo" />
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body" style={{ color: "#8A8A8E" }}>
          <input
            type="checkbox"
            checked={noVideoOnly}
            onChange={(e) => { setNoVideoOnly(e.target.checked); if (e.target.checked) setWithVideoOnly(false); }}
            className="rounded accent-primary"
          />
          Sin video
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body" style={{ color: "#8A8A8E" }}>
          <input
            type="checkbox"
            checked={withVideoOnly}
            onChange={(e) => { setWithVideoOnly(e.target.checked); if (e.target.checked) setNoVideoOnly(false); }}
            className="rounded accent-primary"
          />
          Con video
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body" style={{ color: "#8A8A8E" }}>
          <input
            type="checkbox"
            checked={noSubsOnly}
            onChange={(e) => { setNoSubsOnly(e.target.checked); if (e.target.checked) setWithSubsOnly(false); }}
            className="rounded accent-primary"
          />
          Sin sustituciones
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-body" style={{ color: "#8A8A8E" }}>
          <input
            type="checkbox"
            checked={withSubsOnly}
            onChange={(e) => { setWithSubsOnly(e.target.checked); if (e.target.checked) setNoSubsOnly(false); }}
            className="rounded accent-primary"
          />
          Con sustituciones
        </label>
      </div>

      {/* ─── Bulk Actions Bar ─── */}
      {selectedIds.size > 0 && (
        <div
          className="mt-4 flex flex-wrap items-center gap-3 rounded-xl px-5 py-3"
          style={{ background: "#1C1C1E", border: "1px solid rgba(184,98,47,0.3)" }}
        >
          <span className="text-sm font-body font-semibold" style={{ color: "#FAF8F5" }}>
            {selectedIds.size} seleccionados
          </span>
          <div style={{ width: "1px", height: "20px", background: "rgba(250,248,245,0.12)" }} />
          <button
            onClick={handleBulkDeactivate}
            className="rounded-lg px-3 py-1.5 text-xs font-body font-medium transition-colors"
            style={{ background: "rgba(192,57,43,0.15)", color: "#C0392B", border: "1px solid rgba(192,57,43,0.3)" }}
          >
            Desactivar
          </button>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleBulkChangeDifficulty(e.target.value); e.target.value = ""; }}
            className="rounded-lg px-3 py-1.5 text-xs font-body capitalize"
            style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
          >
            <option value="" disabled>Cambiar dificultad</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            defaultValue=""
            onChange={(e) => { if (e.target.value) handleBulkChangeCategory(e.target.value); e.target.value = ""; }}
            className="rounded-lg px-3 py-1.5 text-xs font-body capitalize"
            style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
          >
            <option value="" disabled>Cambiar categoría</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleExportCSV}
            className="rounded-lg px-3 py-1.5 text-xs font-body font-medium transition-colors"
            style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
          >
            <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" /> Exportar CSV</span>
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded-lg px-3 py-1.5 text-xs font-body font-medium transition-colors"
            style={{ background: "rgba(250,248,245,0.06)", color: "#8A8A8E" }}
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* ─── Table ─── */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={displayExercises.length > 0 && displayExercises.every((ex) => selectedIds.has(ex.id))}
                      onChange={toggleSelectAll}
                      className="rounded accent-primary"
                      style={{ accentColor: "#B8622F" }}
                    />
                  </th>
                  <SortHeader col="name" label="Name" />
                  <SortHeader col="category" label="Category" />
                  <SortHeader col="difficulty" label="Difficulty" />
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}>Muscles</th>
                  <SortHeader col="movement_pattern" label="Pattern" />
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}>SUBS</th>
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}>USOS</th>
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}>Video</th>
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}>Status</th>
                  <th className="px-4 py-3 text-left text-label-tech font-normal" style={{ color: "#8A8A8E" }}></th>
                </tr>
              </thead>
              <tbody>
                {displayExercises.map((ex) => {
                  const subsCount = subsCountMap.get(ex.id) || 0;
                  const usageCount = usageCountMap.get(ex.id) || 0;
                  return (
                    <tr
                      key={ex.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(250,248,245,0.04)",
                        background: selectedIds.has(ex.id) ? "rgba(184,98,47,0.08)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!selectedIds.has(ex.id)) e.currentTarget.style.background = "rgba(250,248,245,0.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = selectedIds.has(ex.id) ? "rgba(184,98,47,0.08)" : "transparent"; }}
                    >
                      <td className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ex.id)}
                          onChange={() => toggleSelect(ex.id)}
                          className="rounded accent-primary"
                          style={{ accentColor: "#B8622F" }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-[13px] font-body" style={{ color: "#FAF8F5" }}>{ex.name}</span>
                        {ex.name_es && ex.name_es !== ex.name && (
                          <span className="block text-[10px]" style={{ color: "#666" }}>{ex.name_es}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] capitalize" style={{ color: "#8A8A8E" }}>{ex.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: `${difficultyColors[ex.difficulty] || "#8A8A8E"}20`, color: difficultyColors[ex.difficulty] || "#8A8A8E" }}
                        >
                          {ex.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] max-w-[140px] truncate" style={{ color: "#8A8A8E" }}>
                        {ex.primary_muscles?.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] capitalize" style={{ color: "#8A8A8E" }}>{ex.movement_pattern}</td>
                      {/* SUBS column */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-mono font-bold min-w-[20px]"
                            style={{
                              background: subsCount === 0 ? "rgba(138,138,142,0.15)" : "rgba(122,139,92,0.2)",
                              color: subsCount === 0 ? "#8A8A8E" : "#7A8B5C",
                            }}
                          >
                            {subsCount}
                          </span>
                          {ex.difficulty === "advanced" && subsCount === 0 && (
                            <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#C0392B" }} />
                          )}
                        </span>
                      </td>
                      {/* USOS column */}
                      <td className="px-4 py-3">
                        <span
                          title={usageCount > 0 ? `Usado en ${usageCount} sets activos` : "Sin uso"}
                          className="text-[13px] font-mono"
                          style={{ color: usageCount > 0 ? "#FAF8F5" : "#8A8A8E", cursor: "default" }}
                        >
                          {usageCount > 0 ? usageCount : "—"}
                        </span>
                      </td>
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
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(ex)} className="rounded p-1.5 hover:bg-white/5 transition-colors" title="Editar">
                            <Pencil className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                          </button>
                          <button onClick={() => openDuplicate(ex)} className="rounded p-1.5 hover:bg-white/5 transition-colors" title="Duplicar">
                            <Copy className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                          </button>
                          <button onClick={() => setConfirmDeactivate(ex)} className="rounded p-1.5 hover:bg-white/5 transition-colors" title={ex.is_active ? "Desactivar" : "Activar"}>
                            {ex.is_active ? (
                              <X className="h-3.5 w-3.5" style={{ color: "#C0392B" }} />
                            ) : (
                              <Check className="h-3.5 w-3.5" style={{ color: "#7A8B5C" }} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayExercises.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-sm" style={{ color: "#8A8A8E" }}>No hay ejercicios con estos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-mono" style={{ color: "#8A8A8E" }}>
            Mostrando {from}-{to} de {total}
          </span>
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
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Descripción</label>
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
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Coaching cue</label>
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
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Notas del founder (privado)</label>
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
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Video (MP4, máx 50MB)</label>
                    {form.video_url && !videoFile && (
                      <div className="mt-2 rounded-lg overflow-hidden" style={{ background: "#0D0C0A" }}>
                        <video src={form.video_url} className="w-full max-h-[200px] object-contain" controls muted />
                      </div>
                    )}
                    {videoFile && (
                      <div className="mt-2 rounded-lg p-3" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-body" style={{ color: "#FAF8F5" }}>{videoFile.name}</span>
                          <span className="text-xs font-mono" style={{ color: "#8A8A8E" }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>
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

                  {/* Thumbnail extractor from video */}
                  {(videoFile || form.video_url) && (
                    <VideoThumbnailExtractor
                      videoSrc={videoFile || form.video_url}
                      currentThumbnailUrl={form.thumbnail_url}
                      exerciseId={form.id}
                      onThumbnailChange={(url) => {
                        setForm((p) => ({ ...p, thumbnail_url: url }));
                        setThumbFile(null);
                      }}
                      onThumbnailBlobChange={(blob) => {
                        if (blob) {
                          setThumbFile(new File([blob], "thumb.jpg", { type: "image/jpeg" }));
                        }
                      }}
                    />
                  )}

                  {/* Manual thumbnail upload */}
                  <div>
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Thumbnail manual (JPG/PNG, máx 2MB)</label>
                    {(form.thumbnail_url || thumbFile) && !(videoFile || form.video_url) && (
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
                      {thumbFile ? "Cambiar thumbnail" : "Seleccionar thumbnail manual"}
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
                    <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Duración del video (segundos)</label>
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

            {/* ─── Tab 3: Sustituciones ─── */}
            {activeTab === 3 && (
              <div className="space-y-4 px-6 py-4">
                {!form.id ? (
                  <p className="text-sm font-body" style={{ color: "#8A8A8E" }}>
                    Guarda el ejercicio primero para poder agregar sustituciones.
                  </p>
                ) : (
                  <>
                    {/* Search to add */}
                    <div>
                      <label className="text-label-tech" style={{ color: "#8A8A8E" }}>Agregar sustitución</label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8A8A8E" }} />
                        <input
                          value={subsSearch}
                          onChange={(e) => {
                            setSubsSearch(e.target.value);
                            searchSubstitutes(e.target.value, form.id!);
                          }}
                          placeholder="Buscar ejercicio..."
                          className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm font-body"
                          style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
                        />
                      </div>
                      {/* Search results dropdown */}
                      {subsResults.length > 0 && (
                        <div className="mt-1 rounded-lg overflow-hidden" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.12)" }}>
                          {subsResults.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => addSubstitution(form.id!, r.id)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-body transition-colors hover:bg-white/5"
                              style={{ color: "#FAF8F5" }}
                            >
                              <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: "#7A8B5C" }} />
                              <div className="flex-1 min-w-0">
                                <span className="block truncate">{r.name}</span>
                                {r.name_es && r.name_es !== r.name && (
                                  <span className="block text-[10px] truncate" style={{ color: "#666" }}>{r.name_es}</span>
                                )}
                              </div>
                              <span className="shrink-0 text-xs" style={{ color: "#8A8A8E" }}>{r.category}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Current substitutions list */}
                    <div>
                      <label className="text-label-tech" style={{ color: "#8A8A8E" }}>
                        Sustituciones configuradas ({substitutions.length})
                      </label>
                      {subsLoading ? (
                        <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: "#8A8A8E" }}>
                          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                        </div>
                      ) : substitutions.length === 0 ? (
                        <p className="mt-2 text-sm font-body" style={{ color: "#8A8A8E" }}>
                          No hay sustituciones configuradas. Busca y agrega ejercicios arriba.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {substitutions.map((sub, idx) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                              style={{ background: "rgba(250,248,245,0.04)" }}
                            >
                              <span
                                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold"
                                style={{ background: "#B8622F", color: "#FAF8F5" }}
                              >
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="block text-sm font-body truncate" style={{ color: "#FAF8F5" }}>
                                  {sub.name}
                                </span>
                                {sub.name_es && sub.name_es !== sub.name && (
                                  <span className="block text-[10px] truncate" style={{ color: "#666" }}>{sub.name_es}</span>
                                )}
                              </div>
                              <button
                                onClick={() => removeSubstitution(sub.id, form.id!)}
                                className="rounded p-1 transition-colors hover:bg-white/10"
                              >
                                <X className="h-4 w-4" style={{ color: "#8A8A8E" }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

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
              <AlertTriangle className="h-5 w-5" style={{ color: "#C9A96E" }} />
              <h3 className="font-display text-base font-semibold" style={{ color: "#FAF8F5" }}>
                {confirmDeactivate.is_active ? "Desactivar ejercicio" : "Activar ejercicio"}
              </h3>
            </div>
            <p className="text-sm font-body mb-6" style={{ color: "#8A8A8E" }}>
              {confirmDeactivate.is_active
                ? `"${confirmDeactivate.name}" dejará de aparecer en la biblioteca y la IA no lo programará.`
                : `"${confirmDeactivate.name}" volverá a estar disponible en la biblioteca.`}
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
      <label className="text-label-tech" style={{ color: "#8A8A8E" }}>{label}</label>
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
      <label className="text-label-tech" style={{ color: "#8A8A8E" }}>{label}</label>
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
      <label className="text-label-tech" style={{ color: "#8A8A8E" }}>{label}</label>
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
