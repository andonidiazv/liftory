import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout } from "@/data/workout";
import { Trophy, TrendingUp, Clock, Dumbbell } from "lucide-react";
import Layout from "@/components/Layout";

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const { workoutElapsed, completedSets } = useApp();

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Layout>
      <div className="flex flex-col items-center px-6 pt-20 animate-fade-up">
        {/* Celebration glow */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-primary/20 glow-primary flex items-center justify-center">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h1 className="mt-8 text-hero text-foreground text-center">
          Sesión completada
        </h1>
        <p className="mt-2 text-muted-foreground text-center font-body font-light">
          {todayWorkout.name} — {todayWorkout.subtitle}
        </p>

        {/* Stats */}
        <div className="mt-10 grid w-full grid-cols-2 gap-3">
          {[
            { icon: Clock, label: "Duración", value: formatTime(workoutElapsed || 2340) },
            { icon: Dumbbell, label: "Sets completados", value: `${completedSets.length}` },
            { icon: TrendingUp, label: "Volumen total", value: "3,420 kg" },
            { icon: Trophy, label: "Ejercicios", value: `${todayWorkout.exercises.length}` },
          ].map((stat) => (
            <div key={stat.label} className="card-fbb text-center">
              <stat.icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2 font-mono text-2xl font-medium text-foreground" style={{ letterSpacing: "0.05em" }}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground font-body font-normal">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Insight — Cormorant Garamond */}
        <div className="mt-6 w-full card-fbb bg-success/5 border border-success/20">
          <p className="font-serif" style={{ fontSize: 17, fontWeight: 400, color: "rgba(250,248,245,0.7)", lineHeight: 1.4 }}>
            Sesión registrada. Eso es exactamente de lo que está hecho el progreso real.
          </p>
        </div>

        <button
          onClick={() => navigate("/home", { replace: true })}
          className="press-scale mt-8 w-full rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground"
        >
          Volver al inicio
        </button>
      </div>
    </Layout>
  );
}
