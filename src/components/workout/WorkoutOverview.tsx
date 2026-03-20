import { ChevronLeft, Check, Clock, ChevronRight } from "lucide-react";
import type { WorkoutData, ExerciseGroup, SupersetGroup } from "@/hooks/useWorkoutData";
import { useState } from "react";

/** A "block" is a visual grouping of exercises for the overview */
export interface WorkoutBlock {
  id: string;
  name: string;
  type: "mobility" | "strength" | "sculpt" | "conditioning" | "cooldown";
  formatBadge: string | null;
  exerciseNames: string[];
  totalSets: number;
  completedSets: number;
  estimatedMinutes: number;
  groups: ExerciseGroup[];
  supersetGroup?: SupersetGroup;
}

/** Color mapping by block label name */
const BLOCK_LABEL_COLORS: Record<string, string> = {
  'PRIME BLOCK': '#7A8B5C',
  'RESET & BREATHE': '#7A8B5C',
  'SPINE & HIPS': '#7A8B5C',
  'DYNAMIC FLOW': '#7A8B5C',
  'ATHLETIC INTEGRATION': '#7A8B5C',
  'POWER BLOCK': '#D45555',
  'HEAVY BLOCK — A': '#C75B39',
  'HEAVY BLOCK — B': '#C75B39',
  'BUILD BLOCK — A': '#C9A96E',
  'BUILD BLOCK — B': '#C9A96E',
  'ATHLETIC HINGE': '#D4896B',
  'ENGINE BLOCK': '#D45555',
  'RECOVERY BLOCK': '#7A8B5C',
};

/** Fallback colors by block type */
const BLOCK_TYPE_COLORS: Record<string, string> = {
  mobility: "#7A8B5C",
  cooldown: "#7A8B5C",
  strength: "#C75B39",
  sculpt: "#C9A96E",
  conditioning: "#D45555",
};

function getBlockColor(block: WorkoutBlock): string {
  return BLOCK_LABEL_COLORS[block.name] || BLOCK_TYPE_COLORS[block.type] || "#C75B39";
}

const INSTRUCTION_BLOCK_LABELS = ['ENGINE BLOCK', 'RECOVERY BLOCK', 'PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];

function isInstructionBlock(block: WorkoutBlock): boolean {
  return INSTRUCTION_BLOCK_LABELS.includes(block.name);
}

function getInstructionSummary(block: WorkoutBlock): string {
  const cues = block.groups
    .map(g => (g.sets[0] as any)?.coaching_cue_override)
    .filter(Boolean);
  if (cues.length > 0) return cues.join(" · ");
  return block.exerciseNames.join(" · ");
}

/** Render block name with bold main part and normal suffix */
function BlockNameDisplay({ name }: { name: string }) {
  const dashIdx = name.indexOf(' — ');
  if (dashIdx === -1) {
    return <span className="font-display text-[15px] font-bold text-foreground" style={{ letterSpacing: "-0.01em" }}>{name}</span>;
  }
  return (
    <span className="font-display text-[15px] text-foreground" style={{ letterSpacing: "-0.01em" }}>
      <span className="font-bold">{name.slice(0, dashIdx)}</span>
      <span className="font-normal">{name.slice(dashIdx)}</span>
    </span>
  );
}

function getDayName(date: string): string {
  const d = new Date(date + "T12:00:00");
  const days = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
  return days[d.getDay()] || "";
}

interface Props {
  workout: WorkoutData;
  blocks: WorkoutBlock[];
  totalSets: number;
  completedSets: number;
  programTotalWeeks: number;
  onBack: () => void;
  onBlockSelect: (block: WorkoutBlock) => void;
  onFinish: () => void;
  saving: boolean;
}

export default function WorkoutOverview({
  workout,
  blocks,
  totalSets,
  completedSets,
  programTotalWeeks,
  onBack,
  onBlockSelect,
  onFinish,
  saving,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const allDone = completedSets >= totalSets && totalSets > 0;
  const pendingSets = totalSets - completedSets;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-5 pb-4 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="press-scale flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex-1">
            <p className="font-mono uppercase text-primary" style={{ fontSize: 10, letterSpacing: "2.5px" }}>
              {getDayName(workout.scheduled_date)}
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              {workout.day_label}
            </h1>
            <p className="font-body text-muted-foreground" style={{ fontSize: 13 }}>
              ~{workout.estimated_duration ?? 60} min · Semana {workout.week_number} de {programTotalWeeks}
            </p>
          </div>
        </div>
      </div>

      {/* Coach Note */}
      {workout.coach_note && (
        <CoachNote note={workout.coach_note} shortOnTimeNote={workout.short_on_time_note} />
      )}

      {/* Blocks */}
      <div className="flex-1 px-5 pb-32">
        <div className="flex flex-col gap-3">
          {blocks.map((block) => {
            const done = block.completedSets >= block.totalSets && block.totalSets > 0;
            const color = getBlockColor(block);
            const isRecovery = block.name === 'RECOVERY BLOCK';
            return (
              <button
                key={block.id}
                onClick={() => onBlockSelect(block)}
                className="press-scale flex w-full items-stretch gap-0 text-left transition-all"
                style={{
                  borderRadius: 16,
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  opacity: done ? 0.75 : 1,
                  overflow: "hidden",
                }}
              >
                {/* Color bar */}
                <div style={{ width: 4, backgroundColor: color, flexShrink: 0 }} />
                {/* Content */}
                <div className="flex flex-1 items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BlockNameDisplay name={block.name} />
                      {block.formatBadge && (
                        <span
                          className="font-mono rounded-full px-2 py-0.5"
                          style={{ fontSize: 9, letterSpacing: "0.05em", backgroundColor: "rgba(199,91,57,0.1)", color: "#C75B39" }}
                        >
                          {block.formatBadge}
                        </span>
                      )}
                    </div>
                    {isRecovery && (
                      <p className="mt-0.5 font-mono text-muted-foreground" style={{ fontSize: 10 }}>2 rondas</p>
                    )}
                    {isInstructionBlock(block) ? (
                      <p className="mt-0.5 font-body text-muted-foreground" style={{ fontSize: 12, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {getInstructionSummary(block)}
                      </p>
                    ) : (
                      <>
                        <p className="mt-0.5 font-body text-muted-foreground truncate" style={{ fontSize: 12 }}>
                          {block.exerciseNames.join(" · ")}
                        </p>
                        <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                          {block.totalSets} sets · ~{block.estimatedMinutes} min
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {done ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <span className="font-mono text-muted-foreground" style={{ fontSize: 12 }}>
                        {block.completedSets}/{block.totalSets}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--border))" }}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-muted-foreground shrink-0" style={{ fontSize: 11 }}>
            {completedSets}/{totalSets} sets
          </span>
        </div>
        <button
          onClick={() => {
            if (!allDone && pendingSets > 0) {
              setShowConfirm(true);
            } else {
              onFinish();
            }
          }}
          disabled={saving}
          className="press-scale flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-display text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          TERMINAR SESIÓN
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-foreground">¿Seguro?</h3>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              Te faltan {pendingSets} sets por completar.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl bg-secondary py-3 font-body text-sm font-medium text-foreground"
              >
                Volver
              </button>
              <button
                onClick={() => { setShowConfirm(false); onFinish(); }}
                className="flex-1 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground"
              >
                Terminar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CoachNote({ note, shortOnTimeNote }: { note: string; shortOnTimeNote: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.length > 120;

  return (
    <div className="px-5 mb-4">
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: "rgba(199,91,57,0.06)",
          borderLeft: "3px solid #C75B39",
        }}
      >
        <p className="font-mono uppercase text-primary" style={{ fontSize: 9, letterSpacing: "2px" }}>
          NOTA DEL DÍA
        </p>
        <p
          className="mt-1 font-body text-foreground"
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: "vertical",
            overflow: expanded ? undefined : "hidden",
          }}
        >
          {note}
        </p>
        {isLong && !expanded && (
          <button onClick={() => setExpanded(true)} className="mt-1 font-body text-sm font-medium text-primary">
            Leer más
          </button>
        )}
        {shortOnTimeNote && (
          <div className="mt-2 flex items-start gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="font-body text-muted-foreground" style={{ fontSize: 12 }}>
              SHORT ON TIME: {shortOnTimeNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
