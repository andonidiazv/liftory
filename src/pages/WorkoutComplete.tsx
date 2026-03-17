import { useNavigate, useParams } from "react-router-dom";
import { useWorkoutData } from "@/hooks/useWorkoutData";
import { Trophy, TrendingUp, Clock, Dumbbell, Star, Leaf } from "lucide-react";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function WorkoutComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workout, sets, loading, weightUnit, cooldownCompleted } = useWorkoutData(id);

  const stats = useMemo(() => {
    if (!sets.length) return { totalSets: 0, volume: 0, prs: 0, avgRpe: 0, duration: "" };

    const completedSets = sets.filter((s) => s.is_completed);
    const volume = completedSets.reduce(
      (acc, s) => acc + (s.actual_weight ?? 0) * (s.actual_reps ?? 0),
      0
    );
    const prs = completedSets.filter((s) => s.is_pr).length;
    const rpes = completedSets.filter((s) => s.actual_rpe != null).map((s) => s.actual_rpe!);
    const avgRpe = rpes.length > 0 ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : "—";

    // Duration from first logged_at to completed_at
    let duration = "—";
    if (workout?.completed_at) {
      const loggedTimes = completedSets
        .filter((s) => s.logged_at)
        .map((s) => new Date(s.logged_at!).getTime());
      if (loggedTimes.length > 0) {
        const first = Math.min(...loggedTimes);
        const end = new Date(workout.completed_at).getTime();
        const diffSec = Math.floor((end - first) / 1000);
        const m = Math.floor(diffSec / 60);
        const sec = diffSec % 60;
        duration = `${m}:${sec.toString().padStart(2, "0")}`;
      }
    }

    return { totalSets: completedSets.length, volume: Math.round(volume), prs, avgRpe, duration };
  }, [sets, workout]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center px-6 pt-20">
          <Skeleton className="h-24 w-24 rounded-full bg-muted" />
          <Skeleton className="mt-8 h-8 w-48 bg-muted" />
          <Skeleton className="mt-4 h-4 w-36 bg-muted" />
          <div className="mt-10 grid w-full grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const hasPRs = stats.prs > 0;
  const motivationalMessage = hasPRs
    ? "Nuevo récord personal. No fue suerte — fue el trabajo acumulado."
    : "Sesión registrada. Eso es exactamente de lo que está hecho el progreso real.";

  return (
    <Layout>
      <div className="flex flex-col items-center px-6 pt-20 stagger-fade-in">
        {/* Celebration glow */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-primary/20 glow-primary flex items-center justify-center animate-set-complete">
            {hasPRs ? <Star className="h-10 w-10 text-gold" /> : <Trophy className="h-10 w-10 text-primary" />}
          </div>
        </div>

        <h1 className="mt-8 text-hero text-foreground text-center">
          Sesión completada
        </h1>
        <p className="mt-2 text-muted-foreground text-center font-body font-light">
          {workout?.day_label ?? "Workout"}
        </p>

        {/* Stats */}
        <div className="mt-10 grid w-full grid-cols-2 gap-3">
          {[
            { icon: Clock, label: "DURACIÓN", value: stats.duration, unit: "MIN" },
            { icon: Dumbbell, label: "SETS", value: String(stats.totalSets), unit: "COMPLETADOS" },
            { icon: TrendingUp, label: "VOLUMEN", value: stats.volume.toLocaleString(), unit: `${weightUnit.toUpperCase()} TOTAL` },
            { icon: Trophy, label: "PRs", value: String(stats.prs), unit: "RÉCORDS" },
          ].map((stat) => (
            <div key={stat.label} className="card-fbb text-center">
              <stat.icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                {stat.value}
              </p>
              <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {stat.unit}
              </p>
              <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* RPE promedio */}
        <div className="mt-4 w-full card-fbb text-center">
          <p className="text-label-tech text-muted-foreground">RPE PROMEDIO</p>
          <p className="mt-1 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
            {stats.avgRpe}
          </p>
        </div>

        {/* Motivational message */}
        <div className="mt-6 w-full card-fbb card-accent-gold bg-success/5 border border-success/20">
          <p className="font-serif italic" style={{ fontSize: 17, fontWeight: 300, color: "rgba(250,248,245,0.7)", lineHeight: 1.4 }}>
            {motivationalMessage}
          </p>
        </div>

        {/* Cool-down badge */}
        {cooldownCompleted && (
          <div className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3" style={{ backgroundColor: "hsl(var(--success) / 0.1)", border: "1px solid hsl(var(--success) / 0.25)" }}>
            <Leaf className="h-4 w-4" style={{ color: "hsl(var(--success))" }} />
            <span className="font-body text-sm font-medium" style={{ color: "hsl(var(--success))" }}>
              Cool-down completado ✓
            </span>
          </div>
        )}

        <button
          onClick={() => navigate("/home", { replace: true })}
          className="press-scale mt-8 mb-8 w-full rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground"
        >
          Volver al inicio
        </button>
      </div>
    </Layout>
  );
}
