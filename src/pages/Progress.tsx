import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useProgressData } from "@/hooks/useProgressData";
import { TrendingUp, Trophy, Flame, Dumbbell } from "lucide-react";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  BarChart,
  Bar,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return `hace ${Math.floor(days / 30)} mes`;
}

function ProgressSkeleton() {
  return (
    <div className="px-5 pt-14 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 bg-muted" />
          <Skeleton className="h-4 w-48 bg-muted" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function Progress() {
  const { profile } = useAuth();
  const { prs, weeklyVolume, muscleData, stats, loading } = useProgressData();

  if (loading) {
    return (
      <Layout>
        <ProgressSkeleton />
      </Layout>
    );
  }

  const displayName = profile?.full_name || "Atleta";
  const level = profile?.experience_level || "intermediate";
  const levelLabel = level === "beginner" ? "Principiante" : level === "advanced" ? "Avanzado" : "Intermedio";

  return (
    <Layout>
      <div className="px-5 pt-14 stagger-fade-in">
        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary font-display text-2xl font-bold text-primary">
            {displayName[0]?.toUpperCase() ?? "A"}
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground font-body font-light">
              Nivel: {levelLabel} · Consistencia: {stats.consistency}%
            </p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.consistency}%` }} />
            </div>
          </div>
        </div>

        {/* Weekly Volume Chart */}
        <div className="mt-8">
          <span className="eyebrow-label">VOLUMEN SEMANAL</span>
          <div>
            <div className="mt-4 card-fbb">
              {weeklyVolume.some((d) => d.volume > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyVolume}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(240, 2%, 55%)" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "hsl(40, 33%, 97%)", border: "1px solid hsl(37, 12%, 89%)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volumen"]}
                    />
                    <Bar dataKey="volume" fill="hsl(22, 62%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground font-body">Aún no hay datos de volumen esta semana.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Records */}
        <div className="mt-8">
          <span className="eyebrow-label">RECORDS PERSONALES</span>
          <div className="mt-4 space-y-3">
            {prs.length > 0 ? (
              prs.map((pr, i) => (
                <div key={i} className="card-fbb card-accent-gold flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
                    <Trophy className="h-5 w-5 text-gold animate-pr-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                      {pr.exercise_name}
                    </p>
                    <p className="text-xs text-muted-foreground font-body font-normal">
                      {pr.logged_at ? timeAgo(pr.logged_at) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                      {pr.actual_weight}
                    </p>
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      KG{pr.actual_reps ? ` ×${pr.actual_reps}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="card-fbb flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground font-body">Aún no hay PRs registrados. ¡Sigue entrenando!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: Dumbbell, label: "TOTAL WORKOUTS", value: String(stats.totalWorkouts), unit: "" },
            { icon: Flame, label: "RACHA ACTUAL", value: String(stats.streak), unit: "DÍAS" },
            { icon: TrendingUp, label: "CONSISTENCIA", value: `${stats.consistency}`, unit: "%" },
            { icon: Trophy, label: "VOLUMEN LIFETIME", value: stats.lifetimeVolume > 1000 ? `${(stats.lifetimeVolume / 1000).toFixed(1)}k` : String(stats.lifetimeVolume), unit: "KG" },
          ].map((stat) => (
            <div key={stat.label} className="card-fbb">
              <stat.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                {stat.value}
              </p>
              {stat.unit && (
                <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {stat.unit}
                </p>
              )}
              <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Radar Chart - Muscle Balance */}
        {muscleData.length > 0 && (
          <div className="mt-8 mb-4">
            <span className="eyebrow-label">BALANCE MUSCULAR</span>
            <p className="text-xs font-body" style={{ color: "#6B6360", marginTop: 2 }}>Volumen relativo por grupo muscular</p>
            <div className="mt-4 card-fbb">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={muscleData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="hsl(30, 5%, 25%)" />
                  <PolarAngleAxis dataKey="group" tick={{ fontSize: 11, fill: "#A89F95" }} />
                  <Radar name="Volumen" dataKey="volume" stroke="#C75B39" fill="#C75B39" fillOpacity={0.5} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {muscleData.slice(0, 6).map((d) => (
                  <div key={d.group} className="card-fbb flex flex-col items-center py-3">
                    <span className="font-body text-xs" style={{ color: "#A89F95" }}>{d.group}</span>
                    <span className="font-mono text-sm font-semibold mt-1 text-foreground">{d.volume}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
