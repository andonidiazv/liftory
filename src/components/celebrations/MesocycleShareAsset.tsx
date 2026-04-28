import { forwardRef } from "react";
import type { MesocycleStats, MesocycleTopPR } from "@/lib/mesocycle-stats";
import type { MesocycleClosingContent } from "@/lib/mesocycle-content";

interface Props {
  closingContent: MesocycleClosingContent;
  stats: MesocycleStats;
}

/**
 * Hidden 1080×1920 (9:16) DOM node used to render the Instagram Story share image.
 * Positioned off-screen; html2canvas captures it at native pixel size into a PNG.
 *
 * Keep typography in sync with `tailwind.config.ts` font families:
 *   - Syne (display) for LIFTORY mark, M1 seal, hero, weights, stat numbers
 *   - DM Sans (body) for exercise names
 *   - DM Mono for date ranges, labels, taglines
 */
const MesocycleShareAsset = forwardRef<HTMLDivElement, Props>(
  function MesocycleShareAsset({ closingContent, stats }, ref) {
    const startDate = formatShortDate(stats.startDate);
    const endDate = formatShortDate(stats.endDate);

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: -10_000,
          top: 0,
          width: 1080,
          height: 1920,
          background:
            "radial-gradient(ellipse 120% 70% at 50% 0%, rgba(196,162,78,0.16) 0%, transparent 60%), radial-gradient(ellipse 100% 60% at 50% 100%, rgba(196,162,78,0.08) 0%, transparent 70%), #08080A",
          color: "#FAFAF7",
          fontFamily: '"DM Sans", sans-serif',
          padding: "96px 72px 72px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 54 }}>
          <span
            style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: 66,
              letterSpacing: "-0.04em",
              color: "#C4A24E",
              lineHeight: 1,
            }}
          >
            LIFTORY
          </span>
          <span
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 22,
              color: "#8E8E96",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginTop: 18,
            }}
          >
            Move Better. Lift Stronger. Live Longer.
          </span>
        </div>

        {/* Seal */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 42 }}>
          <div
            style={{
              width: 252,
              height: 252,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 25%, rgba(196,162,78,0.42), rgba(196,162,78,0.04) 72%)",
              border: "4.5px solid rgba(196, 162, 78, 0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 150px rgba(196,162,78,0.22)",
              position: "relative",
            }}
          >
            <span
              style={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                fontSize: 84,
                color: "#C4A24E",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {stats.mesoId}
            </span>
            <span
              style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: 22,
                color: "#C4A24E",
                marginTop: 12,
                letterSpacing: "0.25em",
              }}
            >
              COMPLETADO
            </span>
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: '"DM Mono", monospace',
              fontSize: 25,
              color: "#8E8E96",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {startDate} — {endDate} · {stats.weeksCount} semanas
          </div>
        </div>

        {/* Hero */}
        <h1
          style={{
            textAlign: "center",
            margin: "18px 0 48px",
            fontFamily: '"Syne", sans-serif',
            fontWeight: 700,
            fontSize: 78,
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
            color: "#FAFAF7",
          }}
        >
          {closingContent.hero}
        </h1>

        {/* Stats 2×2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 21,
            marginBottom: 42,
          }}
        >
          <Stat num={String(stats.sessionsCompleted)} label="Sesiones" />
          <Stat num={String(stats.prCount)} suffix=" PRs" label="Records" />
          <Stat num={formatVolumeShort(stats.totalVolumeLb)} label="Movidas" />
          <Stat num={String(stats.bestStreak)} suffix=" días" label="Racha" />
        </div>

        {/* Top 3 PRs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: "auto" }}>
          {stats.topThreePRs.map((pr, i) => (
            <PRRow key={pr.exerciseName + i} pr={pr} rank={(i + 1) as 1 | 2 | 3} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            paddingTop: 36,
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span
            style={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: 33,
              letterSpacing: "-0.03em",
              color: "#C4A24E",
            }}
          >
            LIFTORY
          </span>
          <div
            style={{
              fontFamily: '"DM Mono", monospace',
              fontSize: 22,
              color: "#8E8E96",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginTop: 12,
            }}
          >
            liftory.app
          </div>
        </div>
      </div>
    );
  },
);

function Stat({ num, suffix, label }: { num: string; suffix?: string; label: string }) {
  return (
    <div
      style={{
        background: "rgba(21,21,26,0.6)",
        border: "1px solid rgba(196,162,78,0.14)",
        borderRadius: 33,
        padding: "30px 36px",
      }}
    >
      <span
        style={{
          fontFamily: '"Syne", sans-serif',
          fontWeight: 800,
          fontSize: 66,
          color: "#C4A24E",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {num}
        {suffix && (
          <small style={{ fontSize: 30, color: "#8E8E96", fontWeight: 600, letterSpacing: 0 }}>
            {suffix}
          </small>
        )}
      </span>
      <div
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: 22,
          color: "#8E8E96",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginTop: 9,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PRRow({ pr, rank }: { pr: MesocycleTopPR; rank: 1 | 2 | 3 }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const accent =
    rank === 1
      ? "rgba(196,162,78,0.35)"
      : rank === 2
        ? "rgba(160,160,168,0.25)"
        : "rgba(184,118,58,0.25)";
  const bg =
    rank === 1
      ? "linear-gradient(90deg, rgba(196,162,78,0.10), rgba(196,162,78,0.02))"
      : "rgba(21,21,26,0.55)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: bg,
        border: `1px solid ${accent}`,
        borderRadius: 33,
        padding: "24px 30px 24px 27px",
      }}
    >
      <span style={{ fontSize: 54, lineHeight: 1, flexShrink: 0 }}>{medal}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 33,
            fontWeight: 600,
            color: "#FAFAF7",
            lineHeight: 1.15,
            letterSpacing: "-0.005em",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pr.exerciseName}
        </p>
        <p
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 22,
            color: "#8E8E96",
            marginTop: 6,
            letterSpacing: "0.03em",
          }}
        >
          {pr.reps} reps ·{" "}
          {pr.estreno ? (
            <span style={{ color: "#C4A24E", fontWeight: 600, letterSpacing: "0.1em" }}>
              ESTRENO @ {pr.reps} reps
            </span>
          ) : (
            <span style={{ color: "#7A8B5C", fontWeight: 600 }}>
              +{pr.deltaLb} lb @ {pr.reps} reps
            </span>
          )}
        </p>
      </div>
      <div style={{ textAlign: "right", lineHeight: 1, flexShrink: 0 }}>
        <span
          style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: 54,
            color: "#C4A24E",
            letterSpacing: "-0.03em",
          }}
        >
          {pr.weightLb}
        </span>
        <div
          style={{
            fontFamily: '"DM Mono", monospace',
            fontSize: 19,
            color: "#8E8E96",
            fontWeight: 500,
            letterSpacing: "0.18em",
            marginTop: 6,
            textTransform: "uppercase",
          }}
        >
          lb
        </div>
      </div>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatVolumeShort(lb: number): string {
  if (lb >= 1_000_000) return `${(lb / 1_000_000).toFixed(1).replace(/\.0$/, "")}M lb`;
  if (lb >= 10_000) return `${Math.round(lb / 1000)}k lb`;
  if (lb >= 1000) return `${(lb / 1000).toFixed(1).replace(/\.0$/, "")}k lb`;
  return `${Math.round(lb)} lb`;
}

export default MesocycleShareAsset;
