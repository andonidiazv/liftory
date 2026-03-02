import Layout from "@/components/Layout";
import { user, weeklyVolume, personalRecords, heatmapData } from "@/data/workout";
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

const heatmapColors = [
  "bg-secondary",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
];

export default function Progress() {
  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14">
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
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(user.week / user.totalWeeks) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="mt-8">
          <h3 className="text-card-title text-foreground">Volumen semanal</h3>
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
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "hsl(240, 2%, 55%)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "hsl(40, 33%, 97%)",
                    border: "1px solid hsl(37, 12%, 89%)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} kg`, "Volumen"]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="hsl(22, 62%, 45%)"
                  strokeWidth={2.5}
                  fill="url(#volumeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Personal Records */}
        <div className="mt-8">
          <h3 className="text-card-title text-foreground">Records personales</h3>
          <div className="mt-4 space-y-3">
            {personalRecords.map((pr) => (
              <div key={pr.exercise} className="card-fbb flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10">
                  <Trophy className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-foreground" style={{ letterSpacing: "-0.02em" }}>
                    {pr.exercise}
                  </p>
                  <p className="text-xs text-muted-foreground font-body font-normal">{pr.when}</p>
                </div>
                <p className="font-mono text-lg font-medium text-foreground" style={{ letterSpacing: "0.05em" }}>
                  {pr.weight} ×{pr.reps}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="mt-8">
          <h3 className="text-card-title text-foreground">Consistencia</h3>
          <div className="mt-4 card-fbb">
            <div className="grid grid-cols-13 gap-1">
              {heatmapData.flat().map((val, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${heatmapColors[val]}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center font-body font-normal">
              Últimos 3 meses
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 mb-4 grid grid-cols-2 gap-3">
          {[
            { icon: Dumbbell, label: "Total workouts", value: user.totalWorkouts },
            { icon: Flame, label: "Racha actual", value: `${user.streak} días` },
            { icon: TrendingUp, label: "Racha más larga", value: `${user.longestStreak} días` },
            { icon: Trophy, label: "Volumen lifetime", value: `${(user.lifetimeVolume / 1000).toFixed(1)}k kg` },
          ].map((stat) => (
            <div key={stat.label} className="card-fbb">
              <stat.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-mono text-xl font-medium text-foreground" style={{ letterSpacing: "0.05em" }}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground font-body font-normal">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
