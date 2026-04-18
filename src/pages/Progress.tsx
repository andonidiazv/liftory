import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useProgressData } from "@/hooks/useProgressData";
import { toDisplayWeight } from "@/utils/weightConversion";
import { TrendingUp, Trophy, Flame, Dumbbell, AlertTriangle, Check } from "lucide-react";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

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
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const weightUnit = profile?.weight_unit || "kg";

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
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.muted }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, fontSize: 12, color: t.text }}
                      formatter={(value: number) => [`${toDisplayWeight(value, weightUnit).toLocaleString()} ${weightUnit}`, "Volumen"]}
                    />
                    <Bar dataKey="volume" fill={t.accent} radius={[4, 4, 0, 0]} />
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
                      {toDisplayWeight(pr.actual_weight, weightUnit)}
                    </p>
                    <p className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      {weightUnit.toUpperCase()}{pr.actual_reps ? ` ×${pr.actual_reps}` : ""}
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
            { icon: Trophy, label: "VOLUMEN LIFETIME", value: (() => { const v = toDisplayWeight(stats.lifetimeVolume, weightUnit); return v > 1000 ? `${(v / 1000).toFixed(1)}k` : String(v); })(), unit: weightUnit.toUpperCase() },
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

        {/* Muscle Balance — effective sets per week */}
        {muscleData.length > 0 && (
          <div className="mt-8 mb-4">
            <span className="eyebrow-label">BALANCE MUSCULAR</span>
            <p className="text-xs font-body" style={{ color: t.muted, marginTop: 2 }}>
              Sets efectivos últimos 7 días · meta 10-20 por grupo
            </p>
            <div className="mt-4 card-fbb space-y-3">
              {muscleData.map((m) => {
                // Status → accent color
                const statusColor =
                  m.status === "in_range" ? "#7A8B5C" :   // sage (on target)
                  m.status === "high" ? t.accent :         // gold (junk volume risk)
                  m.status === "low" ? "#D4896B" :         // amber (under target)
                  t.subtle;                                 // gray (none)

                // Bar width: fill up to target max; clamp 0-100%
                const pct = Math.min(100, Math.round((m.sets / m.targetMax) * 100));
                const badgeText =
                  m.status === "none" ? "Sin trabajar" :
                  m.status === "low" ? "Bajo" :
                  m.status === "in_range" ? "En rango" :
                  "Alto volumen";

                return (
                  <div key={m.group} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[14px] font-semibold text-foreground">
                          {m.group}
                        </span>
                        {m.status === "low" && m.sets > 0 && (
                          <AlertTriangle className="h-3 w-3" style={{ color: "#D4896B" }} />
                        )}
                        {m.status === "in_range" && (
                          <Check className="h-3 w-3" style={{ color: "#7A8B5C" }} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono tabular-nums"
                          style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}
                        >
                          {m.sets} {m.sets === 1 ? "set" : "sets"}
                        </span>
                        <span
                          className="font-mono uppercase"
                          style={{ fontSize: 9, letterSpacing: "0.08em", color: t.muted }}
                        >
                          {badgeText}
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full overflow-hidden relative"
                      style={{ background: t.border }}
                    >
                      {/* Target range markers (min–max) */}
                      <div
                        className="absolute top-0 h-full"
                        style={{
                          left: `${(m.targetMin / m.targetMax) * 100}%`,
                          width: `${100 - (m.targetMin / m.targetMax) * 100}%`,
                          background: "rgba(122,139,92,0.10)",
                        }}
                      />
                      {/* Current fill */}
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: statusColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] font-body" style={{ color: t.muted, lineHeight: 1.4 }}>
              Sets efectivos = sets working/backoff completados con carga. La meta de 10-20 sets por semana se basa en evidencia de hipertrofia (Schoenfeld et al.).
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
