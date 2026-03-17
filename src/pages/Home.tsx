import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Flame, TrendingUp, Trophy, ChevronRight, Wifi, Bell } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useHomeData } from "@/hooks/useHomeData";
import TrialBanner from "@/components/home/TrialBanner";
import PremiumBottomSheet from "@/components/PremiumBottomSheet";
import MesocycleTransitionScreen from "@/components/home/MesocycleTransitionScreen";
import { Skeleton } from "@/components/ui/skeleton";

function HomeSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 bg-muted" />
        <Skeleton className="h-10 w-10 rounded-full bg-muted" />
      </div>
      <div>
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="mt-2 h-4 w-36 bg-muted" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl bg-muted" />
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-full bg-muted" />
        ))}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-40 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, isFreeTrial, isPremium, isExpired, daysLeftInTrial } = useAuth();
  const { todayWorkout, weekDays, wearable, quickStats, loading, mesocycleTransition } = useHomeData();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const displayName = profile?.full_name || "Atleta";
  const daysPerWeek = profile?.training_days_per_week || 4;

  useEffect(() => {
    if (isExpired()) {
      navigate("/paywall", { replace: true });
    }
  }, [isExpired, navigate]);

  const handleStartWorkout = () => {
    if (todayWorkout) {
      navigate(`/briefing?workoutId=${todayWorkout.id}`);
    } else {
      navigate("/briefing");
    }
  };

  const handleDayTap = (day: typeof weekDays[number]) => {
    if (day.isCompleted || day.isToday) return;
    if (!isPremium()) {
      setShowUpgrade(true);
    }
  };

  const completedDays = weekDays.filter((d) => d.isCompleted).length;

  if (loading) {
    return (
      <Layout>
        <HomeSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-5 pt-14 stagger-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
            LIFTORY
          </span>
          <button className="flex h-10 w-10 items-center justify-center rounded-full">
            <Bell className="h-5 w-5" style={{ color: "#6B6360" }} />
          </button>
        </div>

        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-hero text-foreground">Hola, {displayName.split(" ")[0]}</h1>
            <p className="mt-1 text-sm text-muted-foreground font-body font-light">
              {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="mt-2 font-serif italic" style={{ fontSize: 15, fontWeight: 300, color: "rgba(138,138,142,0.65)", lineHeight: 1.3 }}>
              {["Hoy es día de construir.", "Tu cuerpo recuerda el trabajo que le das.", "Cada sesión cuenta. Cada tempo, también.", "Esto es una práctica. No un sprint."][new Date().getDay() % 4]}
            </p>
          </div>
          {quickStats.streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-[4px] bg-primary/10 px-3 py-1.5">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-medium text-primary">
                {quickStats.streak} días
              </span>
            </div>
          )}
        </div>

        {/* Trial Banner */}
        <TrialBanner />

        {/* Hero Workout Card */}
        <div className="mt-8 card-hero card-accent-terracotta">
          {todayWorkout ? (
            todayWorkout.is_rest_day ? (
              /* Rest day card */
              <>
                <div className="flex items-center gap-2 text-xs">
                  <span className="pill-primary">Descanso</span>
                </div>
                <h2 className="mt-4 font-display text-[16px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  Día de recuperación
                </h2>
                <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                  Tu cuerpo construye músculo mientras descansa. Aprovecha para estirarte y dormir bien.
                </p>
                {/* Recovery indicator */}
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Wifi className="h-4 w-4 text-success" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-label-tech text-muted-foreground">Recovery</span>
                      <span className="font-mono text-sm font-medium text-success" style={{ letterSpacing: "0.05em" }}>
                        {wearable.connected && wearable.recovery_score != null ? `${wearable.recovery_score}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${wearable.recovery_score ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Active workout card */
              <>
                <div className="flex items-center gap-2 text-xs">
                  {todayWorkout.tags.map((tag) => (
                    <span key={tag} className="pill-primary">{tag}</span>
                  ))}
                  {todayWorkout.is_completed && <span className="pill-primary">✓ Completado</span>}
                </div>
                <h2 className="mt-4 font-display text-[16px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                  {todayWorkout.day_label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                  {todayWorkout.exerciseCount} ejercicios · {todayWorkout.estimated_duration ?? "—"} min
                </p>

                {/* Recovery indicator */}
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-secondary p-3">
                  <Wifi className="h-4 w-4 text-success" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-label-tech text-muted-foreground">Recovery</span>
                      <span className="font-mono text-sm font-medium text-success" style={{ letterSpacing: "0.05em" }}>
                        {wearable.connected && wearable.recovery_score != null ? `${wearable.recovery_score}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-success transition-all" style={{ width: `${wearable.recovery_score ?? 0}%` }} />
                    </div>
                  </div>
                </div>

                {!todayWorkout.is_completed && (
                  <button
                    onClick={handleStartWorkout}
                    className="press-scale mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
                  >
                    Comenzar sesión
                  </button>
                )}
                <button
                  onClick={() => navigate(`/session?workoutId=${todayWorkout.id}`)}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-body font-medium text-primary"
                >
                  Ver sesión completa <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )
          ) : (
            /* No workout / no program */
            <>
              <h2 className="mt-2 font-display text-[16px] font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                Sin workout programado
              </h2>
              <p className="mt-1 text-sm text-muted-foreground font-body font-light">
                Tu programa aún no ha sido generado. Completa el onboarding para recibir tu primer plan.
              </p>
              <button
                onClick={() => navigate("/onboarding")}
                className="press-scale mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-body text-[15px] font-medium text-primary-foreground glow-primary"
              >
                Completar onboarding
              </button>
            </>
          )}
        </div>

        {/* Week Overview */}
        <div className="mt-8">
          <span className="eyebrow-label">SEMANA ACTUAL</span>
          <div className="mt-4 flex items-center justify-between">
            {weekDays.length > 0
              ? weekDays.map((day, i) => (
                  <button key={i} onClick={() => handleDayTap(day)} className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        day.isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : day.isToday
                          ? "border-primary animate-pulse-ring"
                          : day.isRestDay
                          ? "border-border bg-secondary"
                          : "border-border"
                      }`}
                    >
                      {day.isCompleted ? (
                        <span className="text-sm font-bold">✓</span>
                      ) : day.isRestDay ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={`text-xs font-body font-normal ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {day.dayLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-label-tech text-muted-foreground">{day.dayLabel}</span>
                    {day.workoutLabel && (
                      <span className="text-xs text-muted-foreground font-body" style={{ fontSize: 9 }}>
                        {day.workoutLabel}
                      </span>
                    )}
                  </button>
                ))
              : /* Empty week - show placeholders */
                ["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border">
                      <span className="text-xs text-muted-foreground">{d}</span>
                    </div>
                    <span className="text-label-tech text-muted-foreground">{d}</span>
                  </div>
                ))}
          </div>
          <p className="mt-3 text-center text-sm text-muted-foreground font-body font-light">
            {completedDays} de {daysPerWeek} workouts esta semana
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <span className="eyebrow-label">PROGRESO RÁPIDO</span>
          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            {[
              { icon: TrendingUp, label: "COMPLETADOS", value: String(quickStats.totalCompleted), unit: "TOTAL", delta: "" },
              { icon: Trophy, label: "PRs ESTE MES", value: String(quickStats.monthPRs), unit: "PRs", delta: "" },
              { icon: Flame, label: "RACHA", value: String(quickStats.streak), unit: "DÍAS", delta: "" },
            ].map((stat) => (
              <div key={stat.label} className="card-fbb min-w-[160px] flex-shrink-0">
                <stat.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {stat.unit}
                </p>
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

      <PremiumBottomSheet
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Previsualiza tu semana completa"
        description="Con Premium puedes ver el detalle de cada día de entrenamiento y planificar tu semana."
      />
    </Layout>
  );
}
