import { useState, useEffect, useRef } from "react";
import { usePrimeWeeklyReset, PrevWeekMetrics } from "@/hooks/usePrimeWeeklyReset";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import {
  Loader2,
  Repeat,
  Hash,
  Weight,
  Target,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface PrimeWeeklyResetProps {
  selectedDate: string;
}

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <>{current}</>;
}

const metricCards = [
  { key: "sets", icon: <Repeat className="h-4 w-4" />, label: "Sets", comparable: true },
  { key: "reps", icon: <Hash className="h-4 w-4" />, label: "Repeticiones", comparable: true },
  { key: "volume", icon: <Weight className="h-4 w-4" />, label: "Volumen (kg)", comparable: true },
  { key: "consistency", icon: <Target className="h-4 w-4" />, label: "Consistencia", comparable: true },
  { key: "streak", icon: <Flame className="h-4 w-4" />, label: "Racha", comparable: false },
] as const;

type ComparableKey = "sets" | "reps" | "volume" | "consistency";

const prevKeyMap: Record<ComparableKey, keyof PrevWeekMetrics> = {
  sets: "totalSets",
  reps: "totalReps",
  volume: "totalVolume",
  consistency: "consistency",
};

function ComparisonBadge({ current, previous }: { current: number; previous: number }) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold"
        style={{ background: "rgba(122, 139, 92, 0.15)", color: "#7A8B5C" }}>
        NUEVO
      </span>
    );
  }

  const pct = Math.round(((current - previous) / previous) * 100);

  if (pct === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold text-muted-foreground"
        style={{ background: "rgba(128, 128, 128, 0.1)" }}>
        <Minus className="h-2.5 w-2.5" /> =
      </span>
    );
  }

  const isUp = pct > 0;
  return (
    <span
      className="mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[8px] font-bold"
      style={{
        background: isUp ? `${t.success}26` : t.accentBgStrong,
        color: isUp ? t.success : t.accent,
      }}
    >
      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

/* Shared card wrapper */
function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl px-6 py-10 text-center ${className}`}
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.04)",
      }}
    >
      {children}
    </div>
  );
}

/* Eyebrow label */
function Eyebrow() {
  return (
    <p className="font-mono text-[9px] uppercase tracking-[3px] text-primary">
      PRIME WEEKLY RESET
    </p>
  );
}

/* Footer */
function Footer() {
  return (
    <p className="mt-8 font-serif text-[14px] italic text-muted-foreground text-center">
      Vuelve el lunes. Tu programa ya está listo.
    </p>
  );
}

export default function PrimeWeeklyReset({ selectedDate }: PrimeWeeklyResetProps) {
  const { metrics, loading } = usePrimeWeeklyReset(selectedDate);

  if (loading) {
    return (
      <CardShell>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardShell>
    );
  }

  if (!metrics) return null;

  // ── First week — welcome ──
  if (metrics.isFirstWeek && !metrics.hasWorkoutsThisWeek) {
    return (
      <CardShell>
        <Eyebrow />
        <h2 className="mt-5 font-display text-[22px] font-bold leading-tight text-foreground">
          Bienvenido a LIFTORY.
        </h2>
        <p className="mt-3 font-body text-[14px] leading-relaxed text-muted-foreground">
          Tu primer mesociclo empieza el lunes. Descansa, prepárate mentalmente y
          confía en el proceso.
        </p>
        <Footer />
      </CardShell>
    );
  }

  // ── No workouts this week ──
  if (!metrics.hasWorkoutsThisWeek) {
    return (
      <CardShell>
        <Eyebrow />
        <div className="mt-6">
          <span
            className="font-display font-extrabold tabular-nums"
            style={{ fontSize: 72, lineHeight: 1, color: "hsl(var(--border))" }}
          >
            0
          </span>
          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[2px] text-muted-foreground">
            PRIME SCORE
          </p>
        </div>
        <p className="mt-6 font-display text-[18px] font-semibold text-foreground">
          Esta semana fue difícil.
        </p>
        <p className="mt-1 font-body text-[14px] text-muted-foreground">
          El lunes es tuyo.
        </p>
        <Footer />
      </CardShell>
    );
  }

  // ── Full PRIME Weekly Reset with metrics ──
  const metricValues: Record<string, string> = {
    sets: String(metrics.totalSets),
    reps: String(metrics.totalReps),
    volume: metrics.totalVolume.toLocaleString("es-MX"),
    consistency: `${metrics.consistency}%`,
    streak: `${metrics.weekStreak} sem`,
  };

  // Ring constants
  const ringSize = 96;
  const strokeW = 6;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (metrics.primeScore / 100) * circumference;

  return (
    <CardShell className="px-5 py-8">
      <Eyebrow />
      <p className="mt-3 font-display text-[15px] font-semibold text-foreground text-center">
        Descansa. Lo ganaste.
      </p>

      {/* PRIME Score ring */}
      <div className="mt-6 relative" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="-rotate-90">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeW}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display font-extrabold tabular-nums"
            style={{
              fontSize: 32,
              lineHeight: 1,
              color: metrics.primeScore >= 70
                ? "hsl(var(--primary))"
                : metrics.primeScore >= 40
                ? "hsl(var(--accent))"
                : "hsl(var(--muted-foreground))",
            }}
          >
            <AnimatedScore target={metrics.primeScore} />
          </span>
        </div>
      </div>
      <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[2.5px] text-muted-foreground">
        PRIME SCORE
      </p>

      {/* Separator */}
      <div className="w-full mt-6 mb-5" style={{ height: 1, background: "hsl(var(--border))" }} />

      {/* Metric cards — top row 3, bottom row 2 centered */}
      {(() => {
        const topRow = metricCards.slice(0, 3);
        const bottomRow = metricCards.slice(3);

        const renderCard = (card: typeof metricCards[number]) => {
          const numericCurrent = card.key === "volume" ? metrics.totalVolume
            : card.key === "sets" ? metrics.totalSets
            : card.key === "reps" ? metrics.totalReps
            : card.key === "consistency" ? metrics.consistency
            : 0;

          const showComparison = card.comparable && metrics.prevWeek && !metrics.isFirstWeek;
          const prevValue = showComparison
            ? metrics.prevWeek![prevKeyMap[card.key as ComparableKey]]
            : 0;

          return (
            <div
              key={card.key}
              className="flex flex-col items-center rounded-xl px-2 py-3 text-center"
              style={{ background: "hsl(var(--secondary))" }}
            >
              <span className="text-primary">{card.icon}</span>
              <span className="mt-1.5 font-display text-[15px] font-bold tabular-nums text-foreground">
                {metricValues[card.key]}
              </span>
              <span className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              {showComparison && (
                <ComparisonBadge current={numericCurrent} previous={prevValue} />
              )}
            </div>
          );
        };

        return (
          <>
            <div className="grid w-full grid-cols-3 gap-2">
              {topRow.map(renderCard)}
            </div>
            <div className="flex w-full justify-center gap-2 mt-2">
              <div className="flex-1 max-w-[calc((100%-16px)/3)]">{renderCard(bottomRow[0])}</div>
              <div className="flex-1 max-w-[calc((100%-16px)/3)]">{renderCard(bottomRow[1])}</div>
            </div>
          </>
        );
      })()}

      {/* Best PR card */}
      {metrics.bestPR && (
        <div
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "hsl(var(--secondary))" }}
        >
          <Trophy className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
              Mejor PR
            </p>
            <p className="mt-0.5 font-display text-[14px] font-bold truncate text-foreground">
              {metrics.bestPR.exerciseName}
            </p>
          </div>
          <span className="font-display text-[18px] font-bold text-primary">
            {metrics.bestPR.weight} kg
          </span>
        </div>
      )}

      <Footer />
    </CardShell>
  );
}
