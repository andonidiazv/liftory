import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Search, Play, X, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PremiumBottomSheet from "@/components/PremiumBottomSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

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
  default_tempo: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  coaching_cue: string | null;
  founder_notes: string | null;
  emotional_barrier_tag: string | null;
}

const muscleGroups: Record<string, string[]> = {
  "All": [],
  "Chest": ["pectoralis_major", "upper_pectoralis"],
  "Back": ["lats", "rhomboids", "upper_back", "teres_major"],
  "Legs": ["quadriceps", "hamstrings", "calves", "gastrocnemius", "soleus"],
  "Shoulders": ["deltoid", "deltoid_anterior", "deltoid_medial", "anterior_deltoid", "rear_deltoid"],
  "Core": ["core", "transverse_abdominis", "obliques", "serratus_anterior"],
  "Biceps": ["biceps", "biceps_brachii", "brachialis", "brachioradialis"],
  "Triceps": ["triceps", "triceps_brachii", "triceps_brachii_long_head"],
  "Glutes": ["gluteus_maximus", "gluteus_medius", "gluteus_minimus"],
};
const muscleFilterKeys = Object.keys(muscleGroups);
const difficultyFilters = ["All", "beginner", "intermediate", "advanced"];
const difficultyLabels: Record<string, string> = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" };
const difficultyColors: Record<string, string> = {
  beginner: "bg-success/20 text-success",
  intermediate: "bg-primary/20 text-primary",
  advanced: "bg-gold/20 text-gold",
};

function parseTempo(tempo: string | null): string {
  if (!tempo) return "";
  const parts = tempo.split(/[.\-]/);
  if (parts.length !== 4) return tempo;
  const labels = ["bajando", "abajo", "subiendo", "arriba"];
  return parts.map((p, i) => `${p}s ${labels[i]}`).join(" · ");
}

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] = useState("Todos");
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRow | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { isPremium } = useAuth();

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("exercises")
      .select("*")
      .eq("is_active", true)
      .order("name_es", { ascending: true });

    if (muscleFilter !== "Todos") {
      query = query.contains("primary_muscles", [muscleFilter]);
    }
    if (difficultyFilter !== "Todos") {
      query = query.eq("difficulty", difficultyFilter);
    }
    if (search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,name_es.ilike.%${search.trim()}%`);
    }

    const { data } = await query;
    setExercises((data as ExerciseRow[]) ?? []);
    setLoading(false);
  }, [muscleFilter, difficultyFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchExercises, 300);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  const handleFavorite = (e: React.MouseEvent, exId: string) => {
    e.stopPropagation();
    if (!isPremium()) {
      setShowUpgrade(true);
      return;
    }
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14">
        <h1 className="text-hero text-foreground">Ejercicios</h1>

        {/* Search */}
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground font-body font-light placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Muscle Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {muscleFilters.map((f) => (
            <button
              key={f}
              onClick={() => setMuscleFilter(f)}
              className={`press-scale shrink-0 px-4 py-2 text-xs font-body font-medium transition-all ${
                muscleFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
              style={{ borderRadius: 4 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Difficulty Filters */}
        <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {difficultyFilters.map((f) => (
            <button
              key={f}
              onClick={() => setDifficultyFilter(f)}
              className={`press-scale shrink-0 px-3 py-1.5 text-xs font-body font-medium transition-all ${
                difficultyFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
              style={{ borderRadius: 4 }}
            >
              {f === "Todos" ? "Nivel" : difficultyLabels[f]}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 pb-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden bg-card" style={{ borderRadius: 12 }}>
                <Skeleton className="w-full bg-muted" style={{ aspectRatio: "9/10" }} />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted" />
                </div>
              </div>
            ))
          ) : exercises.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground font-body text-sm text-center">
                {search || muscleFilter !== "Todos" || difficultyFilter !== "Todos"
                  ? "No hay ejercicios con estos filtros."
                  : "La biblioteca se está cargando. Vuelve pronto."}
              </p>
            </div>
          ) : (
            exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className="press-scale overflow-hidden bg-card text-left relative"
                style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {ex.thumbnail_url ? (
                  <img
                    src={ex.thumbnail_url}
                    alt={ex.name_es}
                    className="w-full object-cover bg-secondary"
                    style={{ aspectRatio: "9/10" }}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex items-center justify-center bg-secondary" style={{ aspectRatio: "9/10" }}>
                    <span className="font-display text-3xl font-bold text-muted-foreground/30">
                      {ex.name_es.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Favorite button */}
                <button
                  onClick={(e) => handleFavorite(e, ex.id)}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                >
                  <Heart
                    className="h-4 w-4"
                    style={{
                      color: isPremium() && favorites.has(ex.id) ? "#C75B39" : "#6B6360",
                      fill: isPremium() && favorites.has(ex.id) ? "#C75B39" : "none",
                    }}
                  />
                </button>
                <div className="p-3">
                  <p className="font-display text-sm font-semibold text-foreground leading-tight" style={{ letterSpacing: "-0.02em" }}>
                    {ex.name_es}
                  </p>
                  {/* Difficulty badge */}
                  <span className={`mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono ${difficultyColors[ex.difficulty] ?? "bg-secondary text-secondary-foreground"}`} style={{ fontSize: 9, letterSpacing: "0.05em" }}>
                    {difficultyLabels[ex.difficulty] ?? ex.difficulty}
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(ex.primary_muscles ?? []).map((m) => (
                      <span key={m} className="pill" style={{ fontSize: 10 }}>{m}</span>
                    ))}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-up overflow-y-auto">
          {/* Video / thumbnail */}
          {selectedExercise.video_url ? (
            <div className="relative w-full" style={{ aspectRatio: "9/7" }}>
              <video
                src={selectedExercise.video_url}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center bg-secondary" style={{ aspectRatio: "9/7" }}>
              {selectedExercise.thumbnail_url ? (
                <img src={selectedExercise.thumbnail_url} alt={selectedExercise.name_es} className="h-full w-full object-cover" />
              ) : (
                <Play className="h-12 w-12 text-muted-foreground/40" />
              )}
            </div>
          )}
          <button
            onClick={() => setSelectedExercise(null)}
            className="absolute right-4 top-14 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 px-5 py-5">
            <h2 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {selectedExercise.name_es}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground font-body font-light">
              {selectedExercise.name}
            </p>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded px-2 py-1 font-mono text-xs ${difficultyColors[selectedExercise.difficulty] ?? "bg-secondary text-secondary-foreground"}`}>
                {difficultyLabels[selectedExercise.difficulty] ?? selectedExercise.difficulty}
              </span>
              <span className="pill">{selectedExercise.category}</span>
              <span className="pill">{selectedExercise.movement_pattern}</span>
            </div>

            {/* Muscles */}
            {selectedExercise.primary_muscles && selectedExercise.primary_muscles.length > 0 && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Músculos</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedExercise.primary_muscles.map((m) => (
                    <span key={m} className="pill-primary">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment */}
            {selectedExercise.equipment_required && selectedExercise.equipment_required.length > 0 && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Equipo</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedExercise.equipment_required.map((e) => (
                    <span key={e} className="pill">{e}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tempo */}
            {selectedExercise.default_tempo && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Tempo</p>
                <p className="mt-1 font-mono text-lg font-medium text-primary" style={{ letterSpacing: "0.05em" }}>
                  {selectedExercise.default_tempo}
                </p>
                <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                  {parseTempo(selectedExercise.default_tempo)}
                </p>
              </div>
            )}

            {/* Description */}
            {selectedExercise.description && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Descripción</p>
                <p className="mt-2 text-sm text-muted-foreground font-body font-light leading-relaxed">
                  {selectedExercise.description}
                </p>
              </div>
            )}

            {/* Coaching cue */}
            {selectedExercise.coaching_cue && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Coaching cue</p>
                <p className="mt-2 font-serif italic text-muted-foreground" style={{ fontSize: 15, lineHeight: 1.4 }}>
                  {selectedExercise.coaching_cue}
                </p>
              </div>
            )}

            {/* Founder notes */}
            {selectedExercise.founder_notes && (
              <div className="mt-5">
                <p className="text-label-tech text-foreground">Notas del coach</p>
                <p className="mt-2 text-sm text-muted-foreground font-body font-light leading-relaxed">
                  {selectedExercise.founder_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium upgrade sheet */}
      <PremiumBottomSheet
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Guarda tus ejercicios favoritos"
        description="Con Premium puedes crear tu biblioteca personal de ejercicios favoritos."
      />
    </Layout>
  );
}
