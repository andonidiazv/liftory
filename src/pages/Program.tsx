import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useProgramData } from "@/hooks/useProgramData";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import MesocycleManual from "@/components/program/MesocycleManual";
import { M2_MANUAL_CONTENT } from "@/lib/mesocycle-content";

/**
 * MESOCICLO ARCHIVE · Atelier journey screen 03.
 *
 * "Tu camino" — the full BUILD HIM ELITE arc as chapters (I, II, III, IV…).
 * Each card shows roman numeral · name · dates · session count progress ·
 * status. Active card highlighted with a gold border-top; completed cards
 * fade. Future cards lock until their start date.
 *
 * Design source: public/home-redesign-atelier-journey.html (screen 03).
 */

interface MesocycleRow {
  id: string;
  program_name: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  status: string;
  total_weeks: number;
}

interface CycleCardData {
  cycleNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  sessionsCompleted: number;
  sessionsTotal: number;
  state: "done" | "active" | "upcoming" | "locked";
  hasManual: boolean;
}

/** Editorial names per cycle per program. Falls back to a generic name when
 *  not registered (so M4+ keep working before we name them). */
const CYCLE_NAMES: Record<string, Record<number, string>> = {
  "BUILD HIM ELITE": {
    1: "KB Foundation",
    2: "Hybrid Push",
    3: "Hybrid Discovery",
    4: "Peak Strength",
    5: "Power Phase",
    6: "Mastery",
  },
  "SCULPT HER ELITE": {
    1: "Foundation",
    2: "Sculpt",
    3: "Tone",
    4: "Peak",
    5: "Form",
    6: "Mastery",
  },
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
function romanize(n: number) { return ROMAN[n - 1] ?? String(n); }

function formatRange(start: string, end: string) {
  const fmt = (s: string) =>
    new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
  return `${fmt(start)} — ${fmt(end)}`;
}

function ProgramSkeleton() {
  return (
    <div className="px-7 pt-14 pb-8 space-y-6">
      <Skeleton className="h-3 w-24 bg-muted" />
      <Skeleton className="h-10 w-48 bg-muted" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-t border-border pt-4 space-y-2">
          <Skeleton className="h-6 w-12 bg-muted" />
          <Skeleton className="h-4 w-44 bg-muted" />
          <Skeleton className="h-3 w-36 bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function Program() {
  const navigate = useNavigate();
  const { program, workouts, loading } = useProgramData();
  const [manualMeso, setManualMeso] = useState<string | null>(null);

  // Fetch ALL mesocycles for this program (M1, M2, M3, …) so we can show the
  // full chapter list. We don't gate on user_id because mesocycles are global
  // templates shared across athletes.
  const { data: mesos, isLoading: mesosLoading } = useQuery({
    queryKey: ["program-mesos", program?.name],
    queryFn: async (): Promise<MesocycleRow[]> => {
      if (!program?.name) return [];
      const { data } = await supabase
        .from("mesocycles")
        .select("id, program_name, cycle_number, cycle_start_date, cycle_end_date, status, total_weeks")
        .eq("program_name", program.name)
        .order("cycle_number", { ascending: true });
      return (data as MesocycleRow[]) ?? [];
    },
    enabled: !!program?.name,
  });

  if (loading || mesosLoading) return <Layout><ProgramSkeleton /></Layout>;

  if (!program) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center px-5 pt-32">
          <p className="text-muted-foreground font-body text-center">
            Aún no tienes un programa activo.
          </p>
          <button
            onClick={() => navigate("/onboarding")}
            className="mt-6 rounded-xl bg-primary px-8 py-3 font-body text-sm font-medium text-primary-foreground"
          >
            Completar onboarding
          </button>
        </div>
      </Layout>
    );
  }

  // Build the archive: for each mesocycle, compute state + session counts
  // from the user's actual workouts (date-bounded). PR counts could be added
  // later but they require a separate workout_sets query — out of scope for
  // Phase 1.
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const namesForProgram = CYCLE_NAMES[program.name] ?? {};

  const archive: CycleCardData[] = (mesos ?? []).map((m) => {
    const inRange = workouts.filter(
      (w) =>
        w.scheduled_date >= m.cycle_start_date &&
        w.scheduled_date <= m.cycle_end_date
    );
    const sessionsTotal = inRange.filter(
      (w) => !w.is_rest_day && w.workout_type === "strength"
    ).length;
    const sessionsCompleted = inRange.filter(
      (w) => !w.is_rest_day && w.workout_type === "strength" && w.is_completed
    ).length;

    let state: CycleCardData["state"];
    if (today > m.cycle_end_date) state = "done";
    else if (today >= m.cycle_start_date && today <= m.cycle_end_date) state = "active";
    else if (m.status === "live") state = "upcoming";
    else state = "locked";

    const meso = `M${m.cycle_number}`;
    const hasManual = meso === "M2"; // only M2 has manual content for now

    return {
      cycleNumber: m.cycle_number,
      name: namesForProgram[m.cycle_number] ?? `Mesociclo ${m.cycle_number}`,
      startDate: m.cycle_start_date,
      endDate: m.cycle_end_date,
      sessionsCompleted,
      sessionsTotal,
      state,
      hasManual,
    };
  });

  // Title split for editorial layout: program name on two lines when possible.
  const titleParts = program.name.trim().split(/\s+/);
  const titleTop = titleParts.length > 1 ? titleParts.slice(0, -1).join(" ") : titleParts[0];
  const titleBottom = titleParts.length > 1 ? titleParts[titleParts.length - 1] : null;

  return (
    <Layout>
      <div className="flex flex-col px-7 pt-14 pb-24" style={{ minHeight: "calc(100dvh - 78px)" }}>
        {/* Top bar: back + LIFTORY mark */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/home")}
            className="font-mono uppercase flex items-center gap-2"
            style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
          >
            <span style={{ color: "#C4A24E", fontSize: 14, lineHeight: 1 }}>←</span> Volver
          </button>
          <span
            className="font-display font-bold uppercase"
            style={{ fontSize: 13, letterSpacing: "0.02em", color: "#C4A24E" }}
          >
            LIFTORY
          </span>
        </div>

        {/* Title */}
        <div className="mb-9">
          <p
            className="font-mono uppercase mb-2"
            style={{ fontSize: 10, letterSpacing: "3px", color: "#C4A24E" }}
          >
            Tu camino
          </p>
          <h1
            className="font-display"
            style={{ fontWeight: 300, fontSize: 38, letterSpacing: "-0.04em", lineHeight: 1, color: "hsl(var(--foreground))" }}
          >
            {titleTop}
            {titleBottom && <><br /><strong style={{ fontWeight: 700 }}>{titleBottom}</strong></>}
          </h1>
        </div>

        {/* Archive list */}
        <div className="flex flex-col">
          {archive.length === 0 ? (
            <p
              className="text-center font-body italic mt-10"
              style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}
            >
              Tu programa aún no tiene mesociclos publicados.
            </p>
          ) : (
            archive.map((m) => (
              <CycleCard
                key={m.cycleNumber}
                meso={m}
                onOpenManual={m.hasManual ? () => setManualMeso(`M${m.cycleNumber}`) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {manualMeso === "M2" && (
        <MesocycleManual
          content={M2_MANUAL_CONTENT}
          onClose={() => setManualMeso(null)}
        />
      )}
    </Layout>
  );
}

function CycleCard({
  meso, onOpenManual,
}: { meso: CycleCardData; onOpenManual?: () => void }) {
  const isActive = meso.state === "active";
  const isLocked = meso.state === "locked";
  const statusText =
    meso.state === "done" ? "Completado"
    : meso.state === "active" ? "● Activo"
    : meso.state === "upcoming" ? `Inicia ${meso.startDate.slice(5)}`
    : "Próximamente";

  return (
    <div
      className="relative py-5"
      style={{
        borderTop: `1px solid ${isActive ? "#C4A24E" : "hsl(var(--border))"}`,
        opacity: isLocked ? 0.5 : 1,
      }}
    >
      {/* Row 1: roman numeral + status */}
      <div className="flex justify-between items-baseline mb-1.5">
        <span
          className="font-display font-bold"
          style={{
            fontSize: 26,
            letterSpacing: "-0.03em",
            color: isActive ? "#C4A24E" : "hsl(var(--foreground))",
            lineHeight: 1,
          }}
        >
          {romanize(meso.cycleNumber)}.
        </span>
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 8,
            letterSpacing: "2px",
            color: isActive ? "#C4A24E" : isLocked ? "hsl(var(--muted-foreground)/0.6)" : "hsl(var(--muted-foreground))",
          }}
        >
          {statusText}
        </span>
      </div>

      {/* Row 2: editorial name */}
      <p
        className="font-body font-medium mb-1"
        style={{
          fontSize: 14,
          letterSpacing: "-0.005em",
          color: "hsl(var(--foreground))",
        }}
      >
        {meso.name}
      </p>

      {/* Row 3: dates + session count */}
      <p
        className="font-mono uppercase"
        style={{ fontSize: 9, letterSpacing: "1px", color: "hsl(var(--muted-foreground))" }}
      >
        {formatRange(meso.startDate, meso.endDate)}
        {meso.sessionsTotal > 0 && (
          <> · <span style={{ color: "hsl(var(--foreground))" }}>{meso.sessionsCompleted}/{meso.sessionsTotal}</span></>
        )}
      </p>

      {/* Manual entry — small ghost button only on active meso when available */}
      {isActive && onOpenManual && (
        <button
          onClick={onOpenManual}
          className="press-scale mt-3 flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            background: "rgba(196,162,78,0.08)",
            border: "1px solid rgba(196,162,78,0.2)",
          }}
        >
          <BookOpen className="h-3 w-3" style={{ color: "#C4A24E" }} />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "2px", color: "#C4A24E" }}
          >
            Manual
          </span>
        </button>
      )}

      {/* Active marker — small horizontal rule at right edge */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 18,
            height: 1,
            background: "#C4A24E",
          }}
        />
      )}
    </div>
  );
}
