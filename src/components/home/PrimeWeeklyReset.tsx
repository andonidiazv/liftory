import { useState, useEffect, useRef } from "react";
import { usePrimeWeeklyReset, PrevWeekMetrics } from "@/hooks/usePrimeWeeklyReset";
import { useAuth } from "@/context/AuthContext";
import { toDisplayWeight } from "@/utils/weightConversion";
import { Loader2 } from "lucide-react";

interface PrimeWeeklyResetProps {
  selectedDate: string;
}

/* ATELIER PRIME WEEKLY RESET
 * Sunday card redesign — no chrome, no chips, only hairlines + Syne + gold.
 * Visual logic:
 *  - Eyebrow mono gold "PRIME · DOMINGO"
 *  - Title Syne 300/700 split
 *  - Gold score ring (thin stroke, elegant)
 *  - Hairline rows for each metric — label · value · delta (small mono delta, no pill)
 *  - PR row as hairline aside
 *  - Italic 300 footer
 */

const GOLD = "#C4A24E";
const GREEN_MUTE = "#7A8B5C";

function AnimatedScore({ target }: { target: number }) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return <>{current}</>;
}

function Eyebrow() {
  return (
    <span
      className="font-mono uppercase"
      style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
    >
      Prime · domingo
    </span>
  );
}

function Hairline({ color = "hsl(var(--border))", width = 36 }: { color?: string; width?: number }) {
  return <div className="h-px" style={{ width, background: color }} />;
}

function Footer() {
  return (
    <p
      className="font-body italic leading-snug text-center"
      style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
    >
      Vuelve el lunes. Tu programa ya está listo.
    </p>
  );
}

type ComparableKey = "sets" | "reps" | "volume" | "consistency";
const prevKeyMap: Record<ComparableKey, keyof PrevWeekMetrics> = {
  sets: "totalSets",
  reps: "totalReps",
  volume: "totalVolume",
  consistency: "consistency",
};

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span
        className="font-mono uppercase"
        style={{ fontSize: 8, letterSpacing: "2px", color: GREEN_MUTE }}
      >
        Nuevo
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return (
      <span
        className="font-mono"
        style={{ fontSize: 9, color: "hsl(var(--muted-foreground))", opacity: 0.6 }}
      >
        =
      </span>
    );
  }
  const isUp = pct > 0;
  return (
    <span
      className="font-mono tabular-nums"
      style={{ fontSize: 9, color: isUp ? GREEN_MUTE : "hsl(var(--muted-foreground))", opacity: isUp ? 1 : 0.7 }}
    >
      {isUp ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function MetricRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-baseline justify-between py-3"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-3">
        <span
          className="font-display tabular-nums"
          style={{ fontWeight: 400, fontSize: 16, color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}
        >
          {value}
        </span>
        <span style={{ width: 38, textAlign: "right" }}>{delta}</span>
      </div>
    </div>
  );
}

export default function PrimeWeeklyReset({ selectedDate }: PrimeWeeklyResetProps) {
  const { metrics, loading } = usePrimeWeeklyReset(selectedDate);
  const { profile } = useAuth();
  const weightUnit = profile?.weight_unit || "kg";

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (!metrics) return null;

  // ── First week — welcome ──
  if (metrics.isFirstWeek && !metrics.hasWorkoutsThisWeek) {
    return (
      <div className="flex flex-col items-center gap-6 text-center w-full max-w-[320px]">
        <Eyebrow />
        <h2
          className="font-display"
          style={{ fontWeight: 300, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 0.95, color: "hsl(var(--foreground))" }}
        >
          Bienvenido a<br />
          <strong style={{ fontWeight: 700 }}>LIFTORY</strong>
        </h2>
        <Hairline color={GOLD} />
        <p
          className="font-body italic leading-snug"
          style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
        >
          Tu primer mesociclo empieza el lunes. Descansa, prepárate mentalmente y confía en el proceso.
        </p>
      </div>
    );
  }

  // ── No workouts this week ──
  if (!metrics.hasWorkoutsThisWeek) {
    return (
      <div className="flex flex-col items-center gap-6 text-center w-full max-w-[320px]">
        <Eyebrow />
        <span
          className="font-display tabular-nums"
          style={{ fontWeight: 200, fontSize: 80, lineHeight: 0.9, color: "hsl(var(--border))" }}
        >
          0
        </span>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))", marginTop: -8 }}
        >
          Prime Score
        </span>
        <Hairline color={GOLD} />
        <p
          className="font-display text-center"
          style={{ fontWeight: 300, fontSize: 24, lineHeight: 1, color: "hsl(var(--foreground))", letterSpacing: "-0.03em" }}
        >
          Esta semana fue<br /><strong style={{ fontWeight: 700 }}>difícil</strong>.
        </p>
        <p
          className="font-body italic"
          style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
        >
          El lunes es tuyo.
        </p>
        <Footer />
      </div>
    );
  }

  // ── Full PRIME Weekly Reset with metrics ──
  const displayVolume = toDisplayWeight(metrics.totalVolume, weightUnit);

  // Ring constants — thinner & more elegant
  const ringSize = 108;
  const strokeW = 1.5;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (metrics.primeScore / 100) * circumference;

  const scoreColor = metrics.primeScore >= 70 ? GOLD
    : metrics.primeScore >= 40 ? GOLD
    : "hsl(var(--muted-foreground))";

  const metricList: Array<{ label: string; value: string; deltaNode: React.ReactNode }> = [
    {
      label: "Sets",
      value: String(metrics.totalSets),
      deltaNode: metrics.prevWeek && !metrics.isFirstWeek
        ? <Delta current={metrics.totalSets} previous={metrics.prevWeek[prevKeyMap.sets]} />
        : null,
    },
    {
      label: "Repeticiones",
      value: metrics.totalReps.toLocaleString("es-MX"),
      deltaNode: metrics.prevWeek && !metrics.isFirstWeek
        ? <Delta current={metrics.totalReps} previous={metrics.prevWeek[prevKeyMap.reps]} />
        : null,
    },
    {
      label: `Volumen (${weightUnit})`,
      value: displayVolume.toLocaleString("es-MX"),
      deltaNode: metrics.prevWeek && !metrics.isFirstWeek
        ? <Delta current={displayVolume} previous={toDisplayWeight(metrics.prevWeek[prevKeyMap.volume], weightUnit)} />
        : null,
    },
    {
      label: "Consistencia",
      value: `${metrics.consistency}%`,
      deltaNode: metrics.prevWeek && !metrics.isFirstWeek
        ? <Delta current={metrics.consistency} previous={metrics.prevWeek[prevKeyMap.consistency]} />
        : null,
    },
    {
      label: "Racha",
      value: `${metrics.weekStreak} sem`,
      deltaNode: null,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-6 text-center w-full max-w-[340px]">
      <Eyebrow />

      <h2
        className="font-display text-center"
        style={{ fontWeight: 300, fontSize: 28, letterSpacing: "-0.04em", lineHeight: 0.95, color: "hsl(var(--foreground))" }}
      >
        Descansa.<br />
        <strong style={{ fontWeight: 700 }}>Lo ganaste.</strong>
      </h2>

      {/* PRIME Score ring — single gold hairline */}
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="-rotate-90">
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeW}
            opacity={0.4}
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={GOLD}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${GOLD}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="font-display tabular-nums"
            style={{ fontWeight: 300, fontSize: 44, lineHeight: 1, letterSpacing: "-0.04em", color: scoreColor }}
          >
            <AnimatedScore target={metrics.primeScore} />
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 7, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
          >
            Score
          </span>
        </div>
      </div>

      <Hairline color={GOLD} width={36} />

      {/* Metric hairline rows */}
      <div
        className="w-full"
        style={{ borderTop: "1px solid hsl(var(--border))" }}
      >
        {metricList.map((m) => (
          <MetricRow key={m.label} label={m.label} value={m.value} delta={m.deltaNode} />
        ))}
      </div>

      {/* Best PR row — hairline only, no chrome */}
      {metrics.bestPR && (
        <div className="w-full flex flex-col items-center gap-1.5 pt-2">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
          >
            Mejor PR de la semana
          </span>
          <p
            className="font-display"
            style={{ fontWeight: 600, fontSize: 18, color: "hsl(var(--foreground))", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {metrics.bestPR.exerciseName}
          </p>
          <p
            className="font-display tabular-nums"
            style={{ fontWeight: 300, fontSize: 22, color: GOLD, letterSpacing: "-0.02em" }}
          >
            {toDisplayWeight(metrics.bestPR.weight, weightUnit)}{" "}
            <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{weightUnit}</span>
          </p>
        </div>
      )}

      <Footer />
    </div>
  );
}
