import { useRef, useState } from "react";
import { Share2, X, ChevronRight, Loader2 } from "lucide-react";
import type { MesocycleStats, MesocycleTopPR } from "@/lib/mesocycle-stats";
import type { MesocycleClosingContent } from "@/lib/mesocycle-content";
import { shareMesocycleClosing } from "@/lib/share-mesocycle";
import MesocycleShareAsset from "./MesocycleShareAsset";

interface Props {
  closingContent: MesocycleClosingContent;
  stats: MesocycleStats;
  userName?: string;
  onContinue: () => void;
  onSkip: () => void;
}

const GOLD = "#C4A24E";
const GREEN_MUTE = "#7A8B5C";

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
      <MesocycleShareAsset ref={shareNodeRef} closingContent={closingContent} stats={stats} />

      <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-fade-in">
        <div className="mx-auto max-w-md px-7 pt-14 pb-12">
          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "3px", color: "hsl(var(--muted-foreground))" }}
            >
              <span style={{ color: GOLD }}>Paso 1 / 2</span> · Cierre {stats.mesoId}
            </div>
            <button
              onClick={onSkip}
              className="press-scale flex items-center justify-center"
              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid hsl(var(--border))" }}
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>
          </div>

          {/* Seal — gold ring (hairline) */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="relative flex flex-col items-center justify-center rounded-full"
              style={{
                width: 96, height: 96,
                border: `1px solid ${GOLD}`,
                boxShadow: `0 0 32px ${GOLD}30`,
              }}
            >
              <span
                className="font-display tabular-nums"
                style={{ fontWeight: 300, fontSize: 32, color: GOLD, letterSpacing: "-0.04em", lineHeight: 1 }}
              >
                {stats.mesoId}
              </span>
              <span
                className="font-mono uppercase mt-1.5"
                style={{ fontSize: 7, letterSpacing: "2.5px", color: GOLD }}
              >
                Completado
              </span>
            </div>
            <div
              className="mt-5 font-mono uppercase text-center"
              style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              {formatLongDate(stats.startDate)} — {formatLongDate(stats.endDate)} · {stats.weeksCount} semanas
            </div>
          </div>

          {/* Hero */}
          <div className="text-center mb-12">
            <h1
              className="font-display"
              style={{ fontWeight: 300, fontSize: 32, letterSpacing: "-0.04em", lineHeight: 1.05, color: "hsl(var(--foreground))" }}
            >
              <strong style={{ fontWeight: 700 }}>{closingContent.hero}</strong>
            </h1>
            <div className="mx-auto h-px mt-5" style={{ width: 36, background: GOLD }} />
            <p
              className="mt-5 font-body italic"
              style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}
            >
              {closingContent.heroSubline}
            </p>
          </div>

          {/* Stats — hairline rows */}
          <SectionTitle>Tus números</SectionTitle>
          <div className="mb-10" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <StatRow label="Sesiones completadas" value={String(stats.sessionsCompleted)} />
            <StatRow label="Records personales" value={`${stats.prCount} PRs`} accent={GOLD} />
            <StatRow label="Mejor racha" value={`${stats.bestStreak} días`} accent={GREEN_MUTE} />
            <StatRow label="Lb totales movidas" value={formatVolumeShort(stats.totalVolumeLb)} accent={GREEN_MUTE} />
          </div>

          {/* Top 3 PRs — hairline rows */}
          <SectionTitle>Top 3 lifts del meso</SectionTitle>
          <div className="mb-10" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {stats.topThreePRs.map((pr, i) => (
              <PRRow key={pr.exerciseName + i} pr={pr} rank={(i + 1) as 1 | 2 | 3} />
            ))}
          </div>

          {/* Achievements — hairline list */}
          <SectionTitle>Lo que lograste</SectionTitle>
          <div className="mb-10" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {achievements.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-4"
                style={{ borderBottom: "1px solid hsl(var(--border))" }}
              >
                <span className="mt-1 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <p
                  className="font-body leading-relaxed"
                  style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
                >
                  <strong style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>{a.title}</strong>{" "}
                  {a.body}
                </p>
              </div>
            ))}
          </div>

          {/* Bridge to next meso */}
          {closingContent.nextMesoName && (
            <div className="mb-10 text-center">
              <p
                className="font-mono uppercase"
                style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
              >
                Lo que sigue
              </p>
              <h2
                className="font-display mt-3"
                style={{ fontWeight: 300, fontSize: 26, letterSpacing: "-0.04em", lineHeight: 1.05, color: "hsl(var(--foreground))" }}
              >
                <strong style={{ fontWeight: 700 }}>{closingContent.nextMesoName}</strong>
              </h2>
              <div className="mx-auto h-px mt-5" style={{ width: 36, background: GOLD }} />
              {closingContent.nextMesoDescription && (
                <p
                  className="mt-5 font-body italic"
                  style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}
                >
                  {closingContent.nextMesoDescription}
                </p>
              )}
              {closingContent.nextMesoFormats?.length ? (
                <div className="flex flex-wrap justify-center gap-4 mt-5">
                  {closingContent.nextMesoFormats.map((fmt) => (
                    <span
                      key={fmt}
                      className="font-mono uppercase"
                      style={{ fontSize: 9, letterSpacing: "2px", color: GOLD }}
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* Atelier CTAs */}
          <div className="flex flex-col items-center gap-5 mt-10">
            <button
              onClick={onContinue}
              className="press-scale flex items-center gap-3"
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: 11, letterSpacing: "2.5px", color: "hsl(var(--foreground))", fontWeight: 600 }}
              >
                {closingContent.nextMesoId ? `Conocer ${closingContent.nextMesoId}` : "Continuar"}
              </span>
              <span
                className="liftory-breathe flex items-center justify-center shrink-0"
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: `1px solid ${GOLD}`,
                  boxShadow: `0 0 24px ${GOLD}40`,
                }}
              >
                <ChevronRight className="h-4 w-4" style={{ color: GOLD }} />
              </span>
            </button>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="press-scale flex items-center gap-2 disabled:opacity-60"
            >
              {sharing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
              ) : (
                <Share2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground))" }} />
              )}
              <span
                className="font-mono uppercase"
                style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
              >
                {sharing ? "Generando…" : "Compartir cierre"}
              </span>
            </button>

            <button
              onClick={onSkip}
              className="press-scale font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
            >
              Saltar al primer workout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono uppercase mb-4"
      style={{ fontSize: 9, letterSpacing: "3px", color: GOLD }}
    >
      {children}
    </p>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="flex items-baseline justify-between py-4"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <span
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
      <span
        className="font-display tabular-nums"
        style={{ fontWeight: 400, fontSize: 18, letterSpacing: "-0.02em", color: accent || "hsl(var(--foreground))" }}
      >
        {value}
      </span>
    </div>
  );
}

function PRRow({ pr, rank }: { pr: MesocycleTopPR; rank: 1 | 2 | 3 }) {
  const accentColor =
    rank === 1 ? GOLD : rank === 2 ? "#A0A0A8" : "#B8763A";
  return (
    <div
      className="flex items-center gap-4 py-4"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <span
        className="font-display tabular-nums shrink-0"
        style={{ fontWeight: 300, fontSize: 28, color: accentColor, letterSpacing: "-0.04em", width: 28 }}
      >
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="font-display"
          style={{ fontWeight: 600, fontSize: 14, color: "hsl(var(--foreground))", lineHeight: 1.2, letterSpacing: "-0.01em", wordBreak: "break-word" }}
        >
          {pr.exerciseName}
        </p>
        <p
          className="font-mono uppercase mt-1.5"
          style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
        >
          {pr.reps} reps ·{" "}
          {pr.estreno ? (
            <span style={{ color: GOLD, fontWeight: 600 }}>
              Estreno
            </span>
          ) : (
            <span style={{ color: GREEN_MUTE, fontWeight: 600 }}>
              +{pr.deltaLb} lb
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-display tabular-nums"
          style={{ fontWeight: 400, fontSize: 22, color: accentColor, letterSpacing: "-0.03em", lineHeight: 1 }}
        >
          {pr.weightLb}
        </div>
        <div
          className="mt-1 font-mono uppercase"
          style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
        >
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
