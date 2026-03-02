import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { user, todayWorkout, weekSchedule } from "@/data/workout";
import { Flame, TrendingUp, Trophy, ChevronRight, Wifi, Bell } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import TrialBanner from "@/components/home/TrialBanner";

export default function Home() {
  const navigate = useNavigate();
  const { isFreeTrial, isPremium, isExpired, daysLeftInTrial } = useAuth();

  // Redirect expired users to paywall
  useEffect(() => {
    if (isExpired()) {
      navigate("/paywall", { replace: true });
    }
  }, [isExpired, navigate]);

  const handleStartWorkout = () => {
    navigate("/briefing");
  };

  const completedDays = weekSchedule.filter((d) => d.completed).length;

  return (
    <Layout>
      <div className="px-5 pt-14 stagger-fade-in">
        {/* Header with wordmark */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="font-display"
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "hsl(var(--foreground))",
            }}
          >
            LIFTORY
          </span>
          <button className="flex h-10 w-10 items-center justify-center rounded-full">
            <Bell className="h-5 w-5" style={{ color: "#8A8A8E" }} />
          </button>
        </div>

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-hero text-foreground">Hola, {user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground font-body font-light">
              Jueves, 20 de febrero
            </p>
            <p className="mt-2 font-serif italic" style={{ fontSize: 15, fontWeight: 300, color: "rgba(138,138,142,0.65)", lineHeight: 1.3 }}>
              {["Hoy es día de construir.", "Tu cuerpo recuerda el trabajo que le das.", "Cada sesión cuenta. Cada tempo, también.", "Esto es una práctica. No un sprint."][new Date().getDay() % 4]}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-[4px] bg-primary/10 px-3 py-1.5">
            <Flame className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-medium text-primary">
              {user.streak} días
            </span>
          </div>
        </div>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Hero Workout Card */}
        <div className="mt-8 card-hero card-accent-terracotta">
          <div className="flex items-center gap-2 text-xs">
            {todayWorkout.tags.map((tag) => (
              <span key={tag} className="pill-primary">{tag}</span>
            ))}
          </div>
          <h2 className="mt-4 font-display text-[16px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
            {todayWorkout.name} — {todayWorkout.subtitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground font-body font-light">
            {todayWorkout.exercises.length} ejercicios · {todayWorkout.estimatedTime} min · Intensidad {todayWorkout.intensity.toLowerCase()}
          </p>

          {/* Whoop Recovery */}
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary p-3">
            <Wifi className="h-4 w-4 text-success" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-label-tech text-muted-foreground">Recovery</span>
                <span className="font-mono text-sm font-medium text-success" style={{ letterSpacing: "0.05em" }}>{user.recovery}%</span>
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
            className="press-scale mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
          >
            Comenzar sesión
          </button>
          <button
            onClick={() => navigate("/session")}
            className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-body font-medium text-primary"
          >
            Ver sesión completa <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Week Overview */}
        <div className="mt-8">
          <span className="eyebrow-label">SEMANA ACTUAL</span>
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
                    <span className={`text-xs font-body font-normal ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {day.day}
                    </span>
                  )}
                </div>
                <span className="text-label-tech text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground font-body font-light">
            {completedDays} de {user.daysPerWeek} workouts esta semana
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <span className="eyebrow-label">PROGRESO RÁPIDO</span>
          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {[
              { icon: TrendingUp, label: "VOLUMEN SEMANAL", value: "12,450", unit: "KG" , delta: "+8%" },
              { icon: Trophy, label: "FUERZA PECHO", value: "+12", unit: "%" , delta: "vs mes pasado" },
              { icon: Flame, label: "RACHA MÁS LARGA", value: "11", unit: "DÍAS" , delta: "record" },
            ].map((stat) => (
              <div key={stat.label} className="card-fbb min-w-[160px] flex-shrink-0">
                <stat.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {stat.unit}
                </p>
                <span className="mt-1 inline-block text-xs font-medium text-success">{stat.delta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Insight Card */}
        <div className="mt-8 mb-4 overflow-hidden rounded-xl border border-gold/30 bg-card p-5 card-accent-gold">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20">
              <span className="text-xs">✨</span>
            </div>
            <span className="text-label-tech text-gold">Nuevo insight disponible</span>
          </div>
          <p className="mt-3 font-serif italic font-light" style={{ fontSize: 15, color: "hsl(var(--foreground))", lineHeight: 1.3 }}>
            Tu espalda está progresando 2× más rápido que tu pecho. Descubre cómo equilibrar tu desarrollo...
          </p>
          <button className="press-scale mt-4 flex items-center gap-1 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5">
            <span className="text-sm font-body font-medium text-gold">Desbloquear</span>
            <span className="font-mono text-sm font-medium text-gold" style={{ letterSpacing: "0.05em" }}> — $2 USD</span>
            <ChevronRight className="h-4 w-4 text-gold" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
