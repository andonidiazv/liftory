import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useProgressData } from "@/hooks/useProgressData";
import { toDisplayWeight } from "@/utils/weightConversion";
import { Skeleton } from "@/components/ui/skeleton";
import { getMesoForDate, MESOCYCLE_DATE_RANGES } from "@/lib/mesocycle-content";

/**
 * ATELIER PROGRESS · Phase 1.
 *
 * Minimalist replacement for the old dashboard (hero + bar chart +
 * PR cards + quick-stats grid + muscle balance bars). The pre-redesign
 * page had five sections; Andoni's feedback: "demasiada información,
 * ni yo la uso".
 *
 * This screen has three pieces, each one earning its place:
 *   1. Hero — the single emotional metric: PRs this mesocycle.
 *   2. Records — flat list of recent PRs (no cards, no padding noise).
 *   3. Quiet footer — sessions / streak / consistency in mono caps.
 *
 * Dropped: weekly volume chart (couldn't read at a glance), muscle
 * balance (target ranges weren't validated with Andoni), lifetime
 * volume (vanity metric for elite-level athletes). They live in the
 * hook output so we can resurface them later when there's clear use.
 *
 * Mesocycle scoping uses getMesoForDate / MESOCYCLE_DATE_RANGES — the
 * same source of truth the home and program archive use, so dates
 * never disagree across screens.
 */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function romanize(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 14) return "Hace 1 sem";
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `Hace ${months} mes`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fullDateToday(): string {
  const raw = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return capitalize(raw.replace(",", ""));
}

function phaseForWeekFromMeso(meso: string | null, today: string): string | null {
  // Estimate the current week within the meso (1-6) from the date,
  // then map to phase name. Mirrors the helper in Home.tsx.
  if (!meso) return null;
  const range = MESOCYCLE_DATE_RANGES[meso];
  if (!range) return null;
  const start = new Date(range.start + "T12:00:00").getTime();
  const now = new Date(today + "T12:00:00").getTime();
  const week = Math.min(6, Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24 * 7)) + 1));
  return ["BASE", "BASE +", "ACUMULACIÓN", "INTENSIFICACIÓN", "PEAK", "DELOAD"][week - 1] ?? null;
}

function ProgressSkeleton() {
  return (
    <div className="flex flex-col px-8 pt-14 pb-6" style={{ minHeight: "calc(100dvh - 76px)" }}>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-5 w-24 bg-muted" />
        <Skeleton className="h-px w-8 bg-muted" />
        <Skeleton className="h-3 w-44 bg-muted" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-3 w-32 bg-muted" />
        <Skeleton className="h-20 w-32 bg-muted rounded-md" />
        <Skeleton className="h-3 w-40 bg-muted" />
      </div>
    </div>
  );
}

export default function Progress() {
  const { profile } = useAuth();
  const { prs, stats, loading } = useProgressData();
  const weightUnit = profile?.weight_unit || "kg";

  if (loading) {
    return <Layout><ProgressSkeleton /></Layout>;
  }

  const firstName = (profile?.full_name || "Atleta").split(" ")[0];
  const today = new Date().toLocaleDateString("en-CA");
  const currentMeso = getMesoForDate(today);
  const phase = phaseForWeekFromMeso(currentMeso, today);

  // PRs scoped to current mesocycle for the hero count.
  // The displayed list still uses the full recent set so the screen
  // isn't blank for athletes between cycles.
  const mesoRange = currentMeso ? MESOCYCLE_DATE_RANGES[currentMeso] : null;
  const mesoPRs = mesoRange
    ? prs.filter(pr => pr.logged_at >= mesoRange.start && pr.logged_at <= mesoRange.end + "T23:59:59")
    : prs;

  const recentPRs = prs.slice(0, 7); // hook already orders by logged_at DESC + limit 10

  return (
    <Layout>
      <div className="flex flex-col px-8 pt-14 pb-6" style={{ minHeight: "calc(100dvh - 76px)" }}>
        {/* Top mark — same composition as Home for consistency */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <span
            className="font-display font-bold uppercase"
            style={{
              fontSize: 22,
              letterSpacing: "-0.03em",
              color: "#C4A24E",
              lineHeight: 1,
              textShadow: "0 0 28px rgba(196,162,78,0.3)",
            }}
          >
            LIFTORY
          </span>
          <div style={{ width: 32, height: 1, background: "#C4A24E", opacity: 0.45 }} />
          <p
            className="font-body italic"
            style={{
              fontWeight: 300,
              fontSize: 12,
              letterSpacing: "0.01em",
              color: "hsl(var(--muted-foreground))",
              lineHeight: 1,
            }}
          >
            {fullDateToday()} · {firstName}
          </p>
        </div>

        {/* Hero — meso context + the single emotional metric: PRs */}
        <div className="flex flex-col items-center gap-3 mb-12">
          {currentMeso && (
            <p
              className="font-mono uppercase"
              style={{ fontSize: 10, letterSpacing: "3px", color: "#C4A24E" }}
            >
              M {romanize(parseInt(currentMeso.replace(/\D/g, ""), 10))}{phase ? ` · ${phase}` : ""}
            </p>
          )}
          <p
            className="font-display font-bold tabular-nums"
            style={{
              fontSize: 88,
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
              color: "hsl(var(--foreground))",
            }}
          >
            {mesoPRs.length}
          </p>
          <p
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
          >
            {mesoPRs.length === 1 ? "Record personal" : "Records personales"}
          </p>
        </div>

        {/* Recent records — flat list, no card chrome */}
        <div className="mb-12">
          <p
            className="font-mono uppercase mb-4"
            style={{ fontSize: 10, letterSpacing: "3px", color: "hsl(var(--muted-foreground))" }}
          >
            Recientes
          </p>
          {recentPRs.length === 0 ? (
            <p
              className="font-body italic text-center py-6"
              style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))" }}
            >
              Tu primer PR está esperando.
            </p>
          ) : (
            <div className="flex flex-col">
              {recentPRs.map((pr, i) => {
                const w = toDisplayWeight(pr.actual_weight, weightUnit);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3"
                    style={{ borderTop: i === 0 ? "1px solid hsl(var(--border))" : "1px solid hsl(var(--border))" }}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p
                        className="font-body font-medium"
                        style={{
                          fontSize: 14,
                          letterSpacing: "-0.005em",
                          color: "hsl(var(--foreground))",
                          wordBreak: "break-word",
                          lineHeight: 1.2,
                        }}
                      >
                        {pr.exercise_name}
                      </p>
                      <p
                        className="font-mono uppercase mt-1"
                        style={{ fontSize: 9, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
                      >
                        {pr.logged_at ? timeAgo(pr.logged_at) : "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className="font-display font-bold tabular-nums"
                        style={{
                          fontSize: 22,
                          letterSpacing: "-0.02em",
                          color: "hsl(var(--foreground))",
                          lineHeight: 1,
                        }}
                      >
                        {w}
                      </span>
                      <span
                        className="font-mono uppercase ml-1.5"
                        style={{ fontSize: 9, letterSpacing: "1.5px", color: "hsl(var(--muted-foreground))" }}
                      >
                        {weightUnit}
                        {pr.actual_reps ? ` · ${pr.actual_reps}r` : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quiet footer — three numbers in mono caps */}
        <div
          className="mt-auto flex items-center justify-center gap-5 pt-6"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          <FooterStat value={String(stats.totalWorkouts)} label="sesiones" />
          <FooterDot />
          <FooterStat value={String(stats.streak)} label="racha" />
          <FooterDot />
          <FooterStat value={`${stats.consistency}%`} label="consist." />
        </div>
      </div>
    </Layout>
  );
}

function FooterStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-display font-bold tabular-nums"
        style={{ fontSize: 16, letterSpacing: "-0.02em", color: "hsl(var(--foreground))", lineHeight: 1 }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: 8, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
    </div>
  );
}

function FooterDot() {
  return <span style={{ width: 3, height: 3, borderRadius: 999, background: "hsl(var(--border))" }} />;
}
