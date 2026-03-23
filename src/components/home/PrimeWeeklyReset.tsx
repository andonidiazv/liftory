import { useState, useEffect, useRef } from "react";
import { usePrimeWeeklyReset } from "@/hooks/usePrimeWeeklyReset";
import {
  Loader2,
  Dumbbell,
  Repeat,
  Hash,
  Weight,
  Target,
  Flame,
  Trophy,
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
  { key: "exercises", icon: <Dumbbell className="h-4 w-4" />, label: "Ejercicios" },
  { key: "sets", icon: <Repeat className="h-4 w-4" />, label: "Sets" },
  { key: "reps", icon: <Hash className="h-4 w-4" />, label: "Repeticiones" },
  { key: "volume", icon: <Weight className="h-4 w-4" />, label: "Volumen (kg)" },
  { key: "consistency", icon: <Target className="h-4 w-4" />, label: "Consistencia" },
  { key: "streak", icon: <Flame className="h-4 w-4" />, label: "Racha" },
] as const;

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
    exercises: String(metrics.distinctExercises),
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

      {/* Metric cards — 3×2 grid */}
      <div className="grid w-full grid-cols-3 gap-2">
        {metricCards.map((card) => (
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
          </div>
        ))}
      </div>

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
