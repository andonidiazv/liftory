import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { user, todayWorkout, weekSchedule } from "@/data/workout";
import { Flame, TrendingUp, Trophy, ChevronRight, Wifi } from "lucide-react";
import Layout from "@/components/Layout";

export default function Home() {
  const navigate = useNavigate();
  const { startWorkout } = useApp();

  const handleStartWorkout = () => {
    startWorkout();
    navigate("/workout");
  };

  const completedDays = weekSchedule.filter((d) => d.completed).length;

  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-hero text-foreground">Hola, {user.name}</h1>
            <p className="mt-1 text-muted-foreground">
              Jueves, 20 de febrero
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-semibold text-primary">
              {user.streak} días
            </span>
          </div>
        </div>

        {/* Hero Workout Card */}
        <div className="mt-8 card-hero">
          <div className="flex items-center gap-2 text-xs">
            {todayWorkout.tags.map((tag) => (
              <span key={tag} className="pill-primary">{tag}</span>
            ))}
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            {todayWorkout.name} — {todayWorkout.subtitle}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {todayWorkout.exercises.length} ejercicios · {todayWorkout.estimatedTime} min · Intensidad {todayWorkout.intensity.toLowerCase()}
          </p>

          {/* Whoop Recovery */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <Wifi className="h-4 w-4 text-success" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Recovery</span>
                <span className="font-mono text-xs font-semibold text-success">{user.recovery}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${user.recovery}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleStartWorkout}
            className="press-scale mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-bold text-primary-foreground glow-primary"
          >
            COMENZAR WORKOUT
          </button>
        </div>

        {/* Week Overview */}
        <div className="mt-8">
          <h3 className="text-card-title text-foreground">Tu semana</h3>
          <div className="mt-4 flex items-center justify-between">
            {weekSchedule.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    day.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : day.isToday
                      ? "border-primary animate-pulse-ring"
                      : "border-border"
                  }`}
                >
                  {day.completed ? (
                    <span className="text-sm font-bold">✓</span>
                  ) : (
                    <span className={`text-xs font-medium ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day.day}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {completedDays} de {user.daysPerWeek} workouts esta semana
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <h3 className="text-card-title text-foreground">Progreso rápido</h3>
          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {[
              {
                icon: TrendingUp,
                label: "Volumen semanal",
                value: "12,450 kg",
                delta: "+8%",
              },
              {
                icon: Trophy,
                label: "Fuerza pecho",
                value: "+12%",
                delta: "vs mes pasado",
              },
              {
                icon: Flame,
                label: "Racha más larga",
                value: "11 días",
                delta: "record",
              },
            ].map((stat) => (
              <div key={stat.label} className="card-fbb min-w-[160px] flex-shrink-0">
                <stat.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-mono text-xl font-semibold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <span className="mt-1 inline-block text-xs font-medium text-success">
                  {stat.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insight Card */}
        <div className="mt-8 mb-4 overflow-hidden rounded-2xl border border-gold/30 bg-card p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-xs font-semibold text-gold">Nuevo insight disponible</span>
          </div>
          <p className="mt-3 text-sm text-foreground">
            Tu espalda está progresando 2× más rápido que tu pecho. Descubre cómo equilibrar tu desarrollo...
          </p>
          <button className="press-scale mt-4 flex items-center gap-1 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm font-semibold text-gold">
            Desbloquear — $2 USD <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
