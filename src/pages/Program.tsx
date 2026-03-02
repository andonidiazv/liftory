import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import {
  Check,
  Play,
  Coffee,
  XCircle,
  Lock,
  Dumbbell,
  Clock,
  Layers,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────── */

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const GOAL_LABELS: Record<string, string> = {
  "Ganar músculo": "Hipertrofia",
  "Perder grasa": "Recomposición",
  "Mejorar rendimiento": "Rendimiento",
  "Salud general": "Salud",
  "Movilidad y flexibilidad": "Movilidad",
  "Prepararme para un evento": "Competición",
};

function buildProgramMeta(profile: any) {
  const level = LEVEL_LABELS[profile?.experience_level || "intermediate"] || "Intermedio";
  const days = profile?.training_days_per_week || 4;
  const mainGoal = profile?.goals?.[0] ? (GOAL_LABELS[profile.goals[0]] || profile.goals[0]) : "Hipertrofia";
  return {
    name: `Programa ${mainGoal} — ${level} ${days} días`,
    totalWeeks: 6,
    currentWeek: 3,
    block: "ACUMULACIÓN" as const,
    days,
  };
}

type DayStatus = "completed" | "today" | "future" | "rest" | "skipped";

interface ProgramDay {
  dayLabel: string;
  status: DayStatus;
  name?: string;
  tags?: string[];
  duration?: string;
  blocks?: number;
  volume?: string;
  actualDuration?: string;
  exercises?: string[];
}

const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SESSION_TEMPLATES = [
  { name: "Upper Pull", tags: ["Hipertrofia"], duration: "50-60 min", blocks: 4, exercises: ["Pull-up", "Barbell Row", "Face Pull", "Curl"] },
  { name: "Lower Quad", tags: ["Hipertrofia", "Tempo"], duration: "55-65 min", blocks: 4, exercises: ["Squat", "Leg Press", "Lunge", "Leg Curl"] },
  { name: "Push + Core", tags: ["Hipertrofia", "Conditioning"], duration: "55-65 min", blocks: 4, exercises: ["Bench Press", "Incline DB Press", "Cable Fly", "Shoulder Press"] },
  { name: "Upper Push", tags: ["Hipertrofia"], duration: "50-60 min", blocks: 3, exercises: ["OHP", "Lateral Raise", "Tricep Pushdown", "Face Pull"] },
  { name: "Lower Posterior", tags: ["Fuerza", "Tempo"], duration: "50-60 min", blocks: 4, exercises: ["Deadlift", "Hip Thrust", "Leg Curl", "Calf Raise"] },
  { name: "Full Body", tags: ["Hipertrofia", "Conditioning"], duration: "55-65 min", blocks: 4, exercises: ["Clean", "Push Press", "Row", "Squat"] },
];

/** Distribute N training days across 7 weekdays, returning indices of training days */
function getTrainingDayIndices(numDays: number): number[] {
  const patterns: Record<number, number[]> = {
    2: [0, 3],           // Lun, Jue
    3: [0, 2, 4],        // Lun, Mié, Vie
    4: [0, 1, 3, 4],     // Lun, Mar, Jue, Vie
    5: [0, 1, 2, 3, 4],  // Lun-Vie
    6: [0, 1, 2, 3, 4, 5], // Lun-Sáb
  };
  return patterns[numDays] || patterns[4];
}

function buildDynamicWeek(
  numDays: number,
  defaultStatus: "completed" | "future",
  currentWeekOverrides?: { todayIndex?: number; skippedIndices?: number[] }
): ProgramDay[] {
  const trainingIndices = getTrainingDayIndices(numDays);
  const templates = SESSION_TEMPLATES.slice(0, numDays);

  return DAY_LABELS.map((label, dayIdx) => {
    const sessionIdx = trainingIndices.indexOf(dayIdx);
    if (sessionIdx === -1) return { dayLabel: label, status: "rest" as DayStatus };

    const tpl = templates[sessionIdx % templates.length];
    let status: DayStatus = defaultStatus;

    if (currentWeekOverrides) {
      if (currentWeekOverrides.todayIndex === sessionIdx) status = "today";
      else if (currentWeekOverrides.skippedIndices?.includes(sessionIdx)) status = "skipped";
      else if (currentWeekOverrides.todayIndex !== undefined && sessionIdx > currentWeekOverrides.todayIndex) status = "future";
    }

    const completedData = status === "completed"
      ? { volume: `${(8000 + sessionIdx * 1200).toLocaleString("es")} kg`, actualDuration: `${50 + sessionIdx * 4} min` }
      : {};

    return { dayLabel: label, status, name: tpl.name, tags: tpl.tags, duration: tpl.duration, blocks: tpl.blocks, exercises: tpl.exercises, ...completedData };
  });
}

function buildAllWeeks(numDays: number): Record<number, ProgramDay[]> {
  return {
    1: buildDynamicWeek(numDays, "completed"),
    2: buildDynamicWeek(numDays, "completed"),
    3: buildDynamicWeek(numDays, "future", { todayIndex: Math.min(2, numDays - 1), skippedIndices: [] }),
    4: buildDynamicWeek(numDays, "future"),
    5: buildDynamicWeek(numDays, "future"),
    6: buildDynamicWeek(numDays, "future"),
  };
}

// Mark first N sessions as completed for current week
function applyCurrentWeekProgress(days: ProgramDay[], completedCount: number): ProgramDay[] {
  let seen = 0;
  return days.map((d) => {
    if (d.status === "rest") return d;
    seen++;
    if (seen <= completedCount) return { ...d, status: "completed" as DayStatus, volume: `${(8000 + seen * 1100).toLocaleString("es")} kg`, actualDuration: `${50 + seen * 4} min` };
    return d;
  });
}

const WEEK_COMPLETIONS: Record<number, boolean> = { 1: true, 2: true, 3: false, 4: false, 5: false, 6: false };

/* ── Component ─────────────────────────────────── */

export default function Program() {
  const [selectedWeek, setSelectedWeek] = useState(3);
  const { isPremium, profile } = useAuth();
  const navigate = useNavigate();
  const PROGRAM = buildProgramMeta(profile);
  const numDays = profile?.training_days_per_week || 4;
  const allWeeks = buildAllWeeks(numDays);
  const rawDays = allWeeks[selectedWeek] || [];
  // For week 3 (current), mark first 2 sessions as completed
  const days = selectedWeek === PROGRAM.currentWeek ? applyCurrentWeekProgress(rawDays, 2) : rawDays;
  const premium = isPremium();

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 stagger-fade-in">
        {/* Header */}
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "#F5F0EB" }}>
          {PROGRAM.name}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            Semana {PROGRAM.currentWeek} de {PROGRAM.totalWeeks}
          </p>
          <span
            className="rounded-full px-2.5 py-0.5 font-mono"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#C75B39", background: "rgba(199,91,57,0.15)" }}
          >
            {PROGRAM.block}
          </span>
        </div>

        {/* Week Selector */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {Array.from({ length: PROGRAM.totalWeeks }, (_, i) => i + 1).map((w) => {
            const isActive = w === selectedWeek;
            const isCurrent = w === PROGRAM.currentWeek;
            const done = WEEK_COMPLETIONS[w];
            return (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-4 py-2.5 transition-all"
                style={{
                  background: isActive ? (isCurrent ? "#C75B39" : "#1A1A1A") : "transparent",
                  border: isActive ? "none" : "1px solid #2A2A2A",
                  minWidth: 52,
                }}
              >
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: isActive ? "#fff" : done ? "#A89F95" : "#6B6360", letterSpacing: "0.05em" }}
                >
                  S{w}
                </span>
                {done && !isActive && <Check className="h-3 w-3" style={{ color: "#3CB371" }} />}
              </button>
            );
          })}
        </div>

        {/* Day Cards */}
        <div className="mt-6 space-y-3">
          {days.map((day, i) => {
            if (day.status === "rest") return <RestCard key={i} dayLabel={day.dayLabel} />;
            if (day.status === "completed") return <CompletedCard key={i} day={day} />;
            if (day.status === "skipped") return <SkippedCard key={i} day={day} />;
            if (day.status === "today") return <TodayCard key={i} day={day} onStart={() => navigate("/briefing")} />;
            // future
            return <FutureCard key={i} day={day} premium={premium} onUpgrade={() => navigate("/paywall")} />;
          })}
        </div>

        {/* Bottom info */}
        <p className="mt-8 text-center" style={{ fontSize: 11, color: "#6B6360" }}>
          Tu programa se ajusta automáticamente según tu progreso y recuperación.
        </p>
      </div>
    </Layout>
  );
}

/* ── Sub-components ────────────────────────────── */

function RestCard({ dayLabel }: { dayLabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#1A1A1A" }}>
      <Coffee className="h-4 w-4 text-muted-foreground" />
      <div>
        <span className="font-body text-sm font-medium text-muted-foreground">{dayLabel}</span>
        <span className="ml-2 font-body text-xs text-muted-foreground">Día de recuperación</span>
      </div>
    </div>
  );
}

function CompletedCard({ day }: { day: ProgramDay }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid rgba(60,179,113,0.2)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>{day.dayLabel} — {day.name}</p>
          <div className="mt-1.5 flex gap-1.5">
            {day.tags?.map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, letterSpacing: "0.05em", color: "#A89F95", background: "rgba(168,159,149,0.1)" }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(60,179,113,0.15)" }}>
          <Check className="h-4 w-4" style={{ color: "#3CB371" }} />
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <span className="font-mono text-xs" style={{ color: "#A89F95" }}>{day.volume}</span>
        <span className="font-mono text-xs" style={{ color: "#A89F95" }}>{day.actualDuration}</span>
      </div>
    </div>
  );
}

function SkippedCard({ day }: { day: ProgramDay }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid rgba(224,82,82,0.25)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>{day.dayLabel} — {day.name}</p>
          <div className="mt-1.5 flex gap-1.5">
            {day.tags?.map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, letterSpacing: "0.05em", color: "#A89F95", background: "rgba(168,159,149,0.1)" }}>{t}</span>
            ))}
          </div>
        </div>
        <XCircle className="h-5 w-5" style={{ color: "#E05252" }} />
      </div>
      <p className="mt-2 font-body text-xs" style={{ color: "#E05252" }}>No completado</p>
    </div>
  );
}

function TodayCard({ day, onStart }: { day: ProgramDay; onStart: () => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1.5px solid #C75B39" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-bold" style={{ color: "#F5F0EB" }}>{day.dayLabel} — {day.name}</p>
          <div className="mt-1.5 flex gap-1.5">
            {day.tags?.map((t) => (
              <span key={t} className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em", color: "#C75B39", background: "rgba(199,91,57,0.12)" }}>{t}</span>
            ))}
          </div>
        </div>
        <span className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#fff", background: "#C75B39" }}>HOY</span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1 font-mono text-xs"><Clock className="h-3 w-3" />{day.duration}</span>
        <span className="flex items-center gap-1 font-mono text-xs"><Layers className="h-3 w-3" />{day.blocks} bloques</span>
      </div>
      {day.exercises && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {day.exercises.map((e) => (
            <span key={e} className="rounded-full px-2 py-0.5 font-body text-xs" style={{ color: "#A89F95", background: "rgba(168,159,149,0.08)" }}>{e}</span>
          ))}
        </div>
      )}
      <button
        onClick={onStart}
        className="press-scale mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-body text-sm font-bold text-foreground glow-primary"
        style={{ background: "#C75B39" }}
      >
        <Play className="h-4 w-4 fill-current" /> COMENZAR
      </button>
    </div>
  );
}

function FutureCard({ day, premium, onUpgrade }: { day: ProgramDay; premium: boolean; onUpgrade: () => void }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
      <p className="font-display text-sm font-semibold" style={{ color: "#F5F0EB" }}>{day.dayLabel} — {day.name}</p>
      <div className="mt-1.5 flex gap-1.5">
        {day.tags?.map((t) => (
          <span key={t} className="rounded-full px-2 py-0.5 font-mono" style={{ fontSize: 9, letterSpacing: "0.05em", color: "#A89F95", background: "rgba(168,159,149,0.1)" }}>{t}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1 font-mono text-xs"><Clock className="h-3 w-3" />{day.duration}</span>
        <span className="flex items-center gap-1 font-mono text-xs"><Layers className="h-3 w-3" />{day.blocks} bloques</span>
      </div>
      {premium && day.exercises ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {day.exercises.map((e) => (
            <span key={e} className="rounded-full px-2 py-0.5 font-body text-xs" style={{ color: "#A89F95", background: "rgba(168,159,149,0.08)" }}>{e}</span>
          ))}
        </div>
      ) : !premium ? (
        <button onClick={onUpgrade} className="mt-3 flex items-center gap-1.5 font-body text-xs" style={{ color: "#6B6360" }}>
          <Lock className="h-3 w-3" /> Desbloquea con Premium
        </button>
      ) : null}
    </div>
  );
}
