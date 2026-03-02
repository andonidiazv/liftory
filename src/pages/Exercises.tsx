import { useState } from "react";
import Layout from "@/components/Layout";
import { exerciseLibrary } from "@/data/workout";
import { Search, Play, X } from "lucide-react";

const muscleFilters = ["Todos", "Pecho", "Espalda", "Piernas", "Hombros", "Core", "Bíceps", "Tríceps", "Glúteos"];

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const filtered = exerciseLibrary.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Todos" || ex.muscles.some((m) => m.includes(filter));
    return matchSearch && matchFilter;
  });

  const selected = exerciseLibrary.find((ex) => ex.id === selectedExercise);

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

        {/* Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
          {muscleFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`press-scale shrink-0 px-4 py-2 text-xs font-body font-medium transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
              style={{ borderRadius: 4 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 pb-4">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setSelectedExercise(ex.id)}
              className="press-scale overflow-hidden bg-card text-left"
              style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div
                className="flex items-center justify-center bg-secondary"
                style={{ aspectRatio: "9/10" }}
              >
                <Play className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="p-3">
                <p className="font-display text-sm font-semibold text-foreground leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  {ex.name}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ex.muscles.map((m) => (
                    <span key={m} className="pill" style={{ fontSize: 10 }}>{m}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background animate-fade-up">
          <div
            className="flex items-center justify-center bg-secondary"
            style={{ aspectRatio: "9/7" }}
          >
            <Play className="h-12 w-12 text-muted-foreground/40" />
          </div>
          <button
            onClick={() => setSelectedExercise(null)}
            className="absolute right-4 top-14 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <h2 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {selected.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.muscles.map((m) => (
                <span key={m} className="pill-primary">{m}</span>
              ))}
              <span className="pill">{selected.equipment}</span>
              <span className="pill">{selected.type}</span>
            </div>
            <div className="mt-6 text-sm text-muted-foreground font-body font-light">
              <p>Demo de video del ejercicio con instrucciones detalladas, músculos trabajados y técnica correcta.</p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
