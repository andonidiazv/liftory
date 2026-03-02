import Layout from "@/components/Layout";
import { user, weeklyVolume, personalRecords } from "@/data/workout";
import { TrendingUp, Trophy, Flame, Dumbbell } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
} from "recharts";
import PremiumGate from "@/components/PremiumGate";

// Heatmap data: 8 weeks × 7 days (Mon-Sun)
// 0 = future, 1 = rest day, 2 = skipped (should have trained), 3-6 = completed (volume intensity)
const heatmapWeeks: number[][] = [
  [4, 5, 1, 6, 3, 1, 1], // Week 1 - fully completed
  [5, 4, 1, 5, 4, 1, 1], // Week 2
  [6, 3, 1, 5, 4, 1, 1], // Week 3
  [4, 5, 1, 2, 3, 1, 1], // Week 4 - one skip
  [5, 6, 1, 4, 5, 1, 1], // Week 5
  [4, 2, 1, 5, 4, 1, 1], // Week 6 - one skip
  [5, 4, 1, 6, 0, 0, 0], // Week 7 (current) - partial
  [0, 0, 0, 0, 0, 0, 0], // Week 8 - future
];

const dayLabels = ["L", "M", "M", "J", "V", "S", "D"];

function getCellStyle(val: number): React.CSSProperties {
  if (val === 0) return { background: "#1A1A1A" };
  if (val === 1) return { background: "#2A2A2A" };
  if (val === 2) return { background: "#1A1A1A", border: "1px dashed rgba(224, 82, 82, 0.45)" };
  // Completed: terracotta with opacity based on volume intensity (3=low, 6=high)
  const opacity = 0.35 + (val - 3) * 0.22;
  return { background: `rgba(199, 91, 57, ${opacity})` };
}

export default function Progress() {
  return (
    <Layout>
      <div className="px-5 pt-14 stagger-fade-in">
        {/* Hero */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary font-display text-2xl font-bold text-primary">
            {user.name[0]}
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>
              {user.name}
            </h1>
            <p className="text-sm text-muted-foreground font-body font-light">
              Nivel: {user.level} · Semana {user.week} de {user.totalWeeks}
            </p>
            <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(user.week / user.totalWeeks) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="mt-8">
          <span className="eyebrow-label">VOLUMEN SEMANAL</span>
          <PremiumGate label="Desbloquea tendencias históricas">
            <div className="mt-4 card-fbb">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyVolume}>
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(22, 62%, 45%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(22, 62%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(37, 12%, 89%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(240, 2%, 55%)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(40, 33%, 97%)", border: "1px solid hsl(37, 12%, 89%)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volumen"]}
                  />
                  <Area type="monotone" dataKey="volume" stroke="hsl(22, 62%, 45%)" strokeWidth={2.5} fill="url(#volumeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PremiumGate>
        </div>

        {/* Personal Records */}
        <div className="mt-8">
          <span className="eyebrow-label">RECORDS PERSONALES</span>
          <div className="mt-4 space-y-3">
            {personalRecords.map((pr) => (
              <div key={pr.exercise} className="card-fbb card-accent-gold flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
                  <Trophy className="h-5 w-5 text-gold animate-pr-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>{pr.exercise}</p>
                  <p className="text-xs text-muted-foreground font-body font-normal">{pr.when}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[28px] font-medium text-foreground" style={{ letterSpacing: "0.05em", lineHeight: 1 }}>
                    {pr.weight}
                  </p>
                  <p className="font-mono text-muted-foreground" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    KG ×{pr.reps}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="mt-8">
          <span className="eyebrow-label">CONSISTENCIA</span>
          <p className="text-xs font-body" style={{ color: "#6B6360", marginTop: 2 }}>Últimas 8 semanas</p>
          <PremiumGate label="Desbloquea comparativas de consistencia">
            <div className="mt-4 card-fbb">
              <div className="flex gap-[3px]">
                {/* Day labels column */}
                <div className="flex flex-col gap-[3px] mr-1 justify-center">
                  {dayLabels.map((d, i) => (
                    <div key={i} className="font-mono" style={{ width: 14, height: 16, fontSize: 10, color: "#6B6360", display: "flex", alignItems: "center" }}>
                      {d}
                    </div>
                  ))}
                </div>
                {/* Grid: columns = weeks, rows = days */}
                {heatmapWeeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((val, di) => (
                      <div
                        key={di}
                        style={{ width: 16, height: 16, borderRadius: 3, ...getCellStyle(val) }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                {[
                  { style: { background: "rgba(199, 91, 57, 0.8)" }, label: "Completado" },
                  { style: { background: "#2A2A2A" }, label: "Descanso" },
                  { style: { background: "#1A1A1A", border: "1px dashed rgba(224, 82, 82, 0.45)" }, label: "No entrenado" },
                  { style: { background: "#1A1A1A" }, label: "Futuro" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: 2, ...item.style }} />
                    <span className="font-body" style={{ fontSize: 10, color: "#6B6360" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </PremiumGate>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 mb-4 grid grid-cols-2 gap-3">
          {[
            { icon: Dumbbell, label: "TOTAL WORKOUTS", value: user.totalWorkouts, unit: "" },
            { icon: Flame, label: "RACHA ACTUAL", value: user.streak, unit: "DÍAS" },
            { icon: TrendingUp, label: "RACHA MÁS LARGA", value: user.longestStreak, unit: "DÍAS" },
            { icon: Trophy, label: "VOLUMEN LIFETIME", value: `${(user.lifetimeVolume / 1000).toFixed(1)}k`, unit: "KG" },
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
      </div>
    </Layout>
  );
}
