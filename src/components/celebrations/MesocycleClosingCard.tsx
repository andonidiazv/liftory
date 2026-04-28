import { useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import type { MesocycleStats, MesocycleTopPR } from "@/lib/mesocycle-stats";
import type { MesocycleClosingContent } from "@/lib/mesocycle-content";
import { shareMesocycleClosing } from "@/lib/share-mesocycle";
import MesocycleShareAsset from "./MesocycleShareAsset";

interface Props {
  closingContent: MesocycleClosingContent;
  stats: MesocycleStats;
  /** Display name used inside the share-sheet "X cerró M1" text. */
  userName?: string;
  /** Called when the user taps the primary CTA ("Conocer M2" or similar). */
  onContinue: () => void;
  /** Called when the user dismisses without continuing to next-meso content. */
  onSkip: () => void;
}

const KG_TO_LB = 2.20462;
void KG_TO_LB; // referenced indirectly via stats (kept for clarity)

export default function MesocycleClosingCard({
  closingContent,
  stats,
  userName,
  onContinue,
  onSkip,
}: Props) {
  const shareNodeRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!shareNodeRef.current || sharing) return;
    setSharing(true);
    try {
      await shareMesocycleClosing(shareNodeRef.current, {
        mesoId: stats.mesoId,
        userName,
      });
    } finally {
      setSharing(false);
    }
  };

  // Substitute {prCount} / {bestStreak} placeholders in achievement copy.
  const achievements = closingContent.achievements.map((a) => ({
    title: a.title
      .replace("{prCount}", String(stats.prCount))
      .replace("{bestStreak}", String(stats.bestStreak)),
    body: a.body
      .replace("{prCount}", String(stats.prCount))
      .replace("{bestStreak}", String(stats.bestStreak)),
  }));

  return (
    <>
      {/* Hidden 1080×1920 share asset — captured by html2canvas on share */}
      <MesocycleShareAsset ref={shareNodeRef} closingContent={closingContent} stats={stats} />

      <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-fade-in">
        <div className="mx-auto max-w-md px-5 pt-14 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-7">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
              <span className="text-primary">PASO 1 / 2</span> · CIERRE {stats.mesoId}
            </div>
            <button
              onClick={onSkip}
              className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Seal */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, rgba(196,162,78,0.30), rgba(196,162,78,0.05) 70%)",
                border: "1px solid rgba(196,162,78,0.25)",
                boxShadow: "0 0 60px rgba(196,162,78,0.18)",
              }}
            >
              <span
                className="font-display text-[30px] font-[800] text-primary"
                style={{ letterSpacing: "-0.04em", lineHeight: 1 }}
              >
                {stats.mesoId}
              </span>
              <span className="mt-1 font-mono text-[8px] tracking-[2px] text-primary">
                COMPLETADO
              </span>
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">
              {formatLongDate(stats.startDate)} — {formatLongDate(stats.endDate)} · {stats.weeksCount}{" "}
              semanas
            </div>
          </div>

          {/* Hero */}
          <div className="text-center mb-10">
            <h1
              className="font-display text-[30px] font-bold leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {closingContent.hero}
            </h1>
            <p className="mt-3 font-body text-[14px] text-muted-foreground">
              {closingContent.heroSubline}
            </p>
          </div>

          {/* Stats grid */}
          <SectionTitle>Tus números</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 mb-9">
            <StatCard num={String(stats.sessionsCompleted)} label="Sesiones completadas" />
            <StatCard num={String(stats.prCount)} suffix=" PRs" label="Records personales" />
            <StatCard
              num={String(stats.bestStreak)}
              suffix=" días"
              label="Mejor racha"
              tone="sage"
            />
            <StatCard num={formatVolumeShort(stats.totalVolumeLb)} label="Lb totales movidas" tone="sage" />
          </div>

          {/* Top 3 PRs */}
          <SectionTitle>Top 3 lifts del meso</SectionTitle>
          <div className="flex flex-col gap-2 mb-9">
            {stats.topThreePRs.map((pr, i) => (
              <PRRow key={pr.exerciseName + i} pr={pr} rank={(i + 1) as 1 | 2 | 3} />
            ))}
          </div>

          {/* Achievements */}
          <SectionTitle>Lo que lograste</SectionTitle>
          <div className="bg-card border border-border rounded-2xl px-4 py-1 mb-9">
            {achievements.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-3"
                style={{ borderBottom: i < achievements.length - 1 ? "1px solid #1c1c22" : "none" }}
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <p className="text-[13px] leading-relaxed">
                  <strong className="text-foreground">{a.title}</strong>{" "}
                  <span className="text-muted-foreground">{a.body}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Bridge to next meso */}
          {closingContent.nextMesoName && (
            <div
              className="rounded-2xl p-5 mb-6 relative"
              style={{
                background: "linear-gradient(135deg, hsl(var(--card)), rgba(196,162,78,0.04))",
                border: "1px solid rgba(196,162,78,0.25)",
              }}
            >
              <div className="absolute left-5 -top-px w-8 h-px bg-primary" />
              <div className="font-mono text-[10px] uppercase tracking-[2px] text-primary mb-2">
                Lo que sigue
              </div>
              <h2
                className="font-display text-[22px] font-bold leading-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {closingContent.nextMesoName}
              </h2>
              {closingContent.nextMesoDescription && (
                <p className="mt-2 font-body text-[13px] text-muted-foreground leading-relaxed">
                  {closingContent.nextMesoDescription}
                </p>
              )}
              {closingContent.nextMesoFormats?.length ? (
                <div className="flex flex-wrap gap-1.5 mt-3.5">
                  {closingContent.nextMesoFormats.map((fmt) => (
                    <span
                      key={fmt}
                      className="font-mono text-[9px] tracking-[1px] uppercase rounded-full px-2 py-1 text-primary"
                      style={{ border: "1px solid rgba(196,162,78,0.25)" }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* CTAs */}
          <button
            onClick={onContinue}
            className="press-scale w-full rounded-xl bg-primary py-4 font-display text-[15px] font-semibold text-primary-foreground mb-3"
            style={{ letterSpacing: "-0.01em" }}
          >
            {closingContent.nextMesoId ? `Conocer ${closingContent.nextMesoId} →` : "Continuar →"}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="press-scale w-full rounded-xl py-3.5 font-display text-[13px] font-semibold text-primary mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ border: "1px solid rgba(196,162,78,0.35)" }}
          >
            <Share2 className="h-4 w-4" />
            {sharing ? "Generando imagen…" : `Compartir mi cierre de ${stats.mesoId}`}
          </button>
          <button
            onClick={onSkip}
            className="press-scale w-full rounded-xl bg-card py-3.5 font-body text-[13px] text-muted-foreground border border-border"
          >
            Saltar al primer workout
          </button>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[2px] text-primary mb-3.5">
      {children}
    </div>
  );
}

function StatCard({
  num,
  suffix,
  label,
  tone = "gold",
}: {
  num: string;
  suffix?: string;
  label: string;
  tone?: "gold" | "sage";
}) {
  const numColor = tone === "sage" ? "#7A8B5C" : "hsl(var(--primary))";
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div
        className="font-display font-[800]"
        style={{ fontSize: 26, letterSpacing: "-0.02em", lineHeight: 1, color: numColor }}
      >
        {num}
        {suffix && (
          <small className="text-[14px] text-muted-foreground font-semibold">{suffix}</small>
        )}
      </div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PRRow({ pr, rank }: { pr: MesocycleTopPR; rank: 1 | 2 | 3 }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  const accentColor =
    rank === 1 ? "#C4A24E" : rank === 2 ? "#A0A0A8" : "#B8763A";
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3.5 px-4 relative overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
      />
      <span className="text-[26px] leading-none shrink-0 drop-shadow-md">{medal}</span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[14px] font-semibold text-foreground leading-tight truncate">
          {pr.exerciseName}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground mt-1">
          {pr.reps} reps ·{" "}
          {pr.estreno ? (
            <span className="text-primary font-semibold tracking-[0.5px]">
              ESTRENO @ {pr.reps} reps
            </span>
          ) : (
            <span style={{ color: "#7A8B5C" }} className="font-semibold">
              +{pr.deltaLb} lb @ {pr.reps} reps
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-display font-[800]"
          style={{ fontSize: 20, color: accentColor, letterSpacing: "-0.02em", lineHeight: 1 }}
        >
          {pr.weightLb}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted-foreground">
          lb
        </div>
      </div>
    </div>
  );
}

function formatLongDate(iso: string): string {
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatVolumeShort(lb: number): string {
  if (lb >= 1_000_000) return `${(lb / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (lb >= 10_000) return `${Math.round(lb / 1000)}k`;
  if (lb >= 1000) return `${(lb / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(lb)}`;
}
