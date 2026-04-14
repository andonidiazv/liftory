import { ChevronLeft, Check, Clock, ChevronRight, AlertCircle } from "lucide-react";
import type { WorkoutData, ExerciseGroup, SupersetGroup } from "@/hooks/useWorkoutData";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

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
  'HEAVY BLOCK — A': '#E63946',
  'HEAVY BLOCK — B': '#E63946',
  'BUILD BLOCK — A': '#E63946',
  'BUILD BLOCK — B': '#E63946',
  'ATHLETIC HINGE': '#D4896B',
  'ENGINE BLOCK': '#D45555',
  'RECOVERY BLOCK': '#7A8B5C',
};

/** Fallback colors by block type */
const BLOCK_TYPE_COLORS: Record<string, string> = {
  mobility: "#7A8B5C",
  cooldown: "#7A8B5C",
  strength: "#E63946",
  sculpt: "#E63946",
  conditioning: "#D45555",
};

function getBlockColor(block: WorkoutBlock): string {
  return BLOCK_LABEL_COLORS[block.name] || BLOCK_TYPE_COLORS[block.type] || "#E63946";
}

const INSTRUCTION_BLOCK_LABELS = ['ENGINE BLOCK', 'RECOVERY BLOCK', 'PRIME BLOCK', 'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION'];

function isInstructionBlock(block: WorkoutBlock): boolean {
  return INSTRUCTION_BLOCK_LABELS.includes(block.name);
}

/** Check if a block is EMOM-based (weight logged globally, not per set) */
function isEmomBlock(block: WorkoutBlock): boolean {
  return block.groups.some(g => g.sets.some(s => s.set_type === 'emom'));
}

/** Check if a strength block has sets completed but missing weight data */
function getBlockWarnings(block: WorkoutBlock): { unloggedSets: number; missingWeights: number } {
  let unloggedSets = 0;
  let missingWeights = 0;
  // EMOM blocks use global "peso de la barra" only persisted on the primary exercise.
  // Skip missing-weight checks to avoid false warnings on complex EMOM blocks (POWER BLOCK, etc.)
  const isStrength = !isInstructionBlock(block) && !isEmomBlock(block);
  for (const g of block.groups) {
    for (const s of g.sets) {
      if (!s.is_completed) unloggedSets++;
      else if (isStrength && (s.actual_weight == null || s.actual_weight === 0)) missingWeights++;
    }
  }
  return { unloggedSets, missingWeights };
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
  scrollToBlockId?: string | null;
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
  scrollToBlockId,
  onBack,
  onBlockSelect,
  onFinish,
  saving,
}: Props) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [showConfirm, setShowConfirm] = useState(false);
  const [softGateBlockId, setSoftGateBlockId] = useState<string | null>(null);
  const [softGateNextBlock, setSoftGateNextBlock] = useState<WorkoutBlock | null>(null);
  const allDone = completedSets >= totalSets && totalSets > 0;
  const pendingSets = totalSets - completedSets;
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});

  // Find the first incomplete block index
  const firstPendingIdx = useMemo(() => {
    return blocks.findIndex(b => b.completedSets < b.totalSets || b.totalSets === 0);
  }, [blocks]);

  // Scroll to last visited block on mount
  useEffect(() => {
    if (scrollToBlockId && blockRefs.current[scrollToBlockId]) {
      requestAnimationFrame(() => {
        blockRefs.current[scrollToBlockId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [scrollToBlockId]);

  // Soft gate: when navigating to any block, check if there's an earlier strength block
  // (including the one right before) with unlogged sets or missing weights
  const handleBlockNavigate = (targetBlock: WorkoutBlock, fromBlockId?: string) => {
    const targetIdx = blocks.findIndex(b => b.id === targetBlock.id);
    // Look from the start up to (but not including) the target for any strength block with issues
    for (let i = 0; i < targetIdx; i++) {
      const prevBlock = blocks[i];
      const prevDone = prevBlock.completedSets >= prevBlock.totalSets && prevBlock.totalSets > 0;
      if (prevDone) {
        // Even if "done" (all sets marked complete), check if weights are missing
        const isStrength = !isInstructionBlock(prevBlock);
        if (isStrength) {
          const warnings = getBlockWarnings(prevBlock);
          if (warnings.missingWeights > 0) {
            setSoftGateBlockId(prevBlock.id);
            setSoftGateNextBlock(targetBlock);
            return;
          }
        }
        continue;
      }
      const isStrength = !isInstructionBlock(prevBlock);
      if (!isStrength) continue; // mobility/cooldown, skip
      const warnings = getBlockWarnings(prevBlock);
      if (warnings.unloggedSets > 0 || warnings.missingWeights > 0) {
        setSoftGateBlockId(prevBlock.id);
        setSoftGateNextBlock(targetBlock);
        return;
      }
    }
    // Also check the "from" block (the one we're leaving) if provided
    if (fromBlockId) {
      const fromBlock = blocks.find(b => b.id === fromBlockId);
      if (fromBlock && !isInstructionBlock(fromBlock)) {
        const warnings = getBlockWarnings(fromBlock);
        if (warnings.unloggedSets > 0 || warnings.missingWeights > 0) {
          setSoftGateBlockId(fromBlock.id);
          setSoftGateNextBlock(targetBlock);
          return;
        }
      }
    }
    onBlockSelect(targetBlock);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
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

      {/* Coach Note — with dynamic phase context */}
      {workout.coach_note && (
        <CoachNote note={workout.coach_note} shortOnTimeNote={workout.short_on_time_note} weekNumber={workout.week_number} totalWeeks={programTotalWeeks} />
      )}

      {/* Blocks */}
      <div className="flex-1 px-5 pb-32">
        <div className="flex flex-col gap-3">
          {blocks.map((block, blockIdx) => {
            const done = block.completedSets >= block.totalSets && block.totalSets > 0;
            const color = getBlockColor(block);
            const isRecovery = block.name === 'RECOVERY BLOCK';
            const isActive = blockIdx === firstPendingIdx;
            const nextBlock = blockIdx < blocks.length - 1 ? blocks[blockIdx + 1] : null;

            // Completed block — compact view
            if (done) {
              return (
                <div key={block.id} ref={(el) => { blockRefs.current[block.id] = el; }}>
                  <button
                    onClick={() => onBlockSelect(block)}
                    className="flex w-full items-center gap-3 text-left rounded-xl px-4 py-3 transition-all"
                    style={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      opacity: 0.7,
                    }}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <BlockNameDisplay name={block.name} />
                    <span className="ml-auto font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                      {block.completedSets}/{block.totalSets}
                    </span>
                  </button>
                  {/* "Next block" button after last completed block before the active one */}
                  {nextBlock && blockIdx === firstPendingIdx - 1 && (
                    <button
                      onClick={() => handleBlockNavigate(nextBlock)}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-display text-[13px] font-semibold transition-colors"
                      style={{ background: t.accentBg, color: t.accent }}
                    >
                      Siguiente bloque <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            }

            // Active block — with breathing glow
            return (
              <button
                key={block.id}
                ref={(el) => { blockRefs.current[block.id] = el; }}
                onClick={() => handleBlockNavigate(block)}
                className={`press-scale flex w-full items-stretch gap-0 text-left transition-all ${isActive ? "block-breathing" : ""}`}
                style={{
                  borderRadius: 16,
                  border: isActive ? `1.5px solid ${t.accent}66` : `1px solid ${t.border}`,
                  backgroundColor: isActive ? t.accentBg : t.card,
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
                          style={{ fontSize: 9, letterSpacing: "0.05em", backgroundColor: t.border, color: t.text }}
                        >
                          {block.formatBadge}
                        </span>
                      )}
                      {isActive && (
                        <span
                          className="font-mono rounded-full px-2 py-0.5"
                          style={{ fontSize: 8, letterSpacing: "0.1em", backgroundColor: t.accentBgStrong, color: t.accent, fontWeight: 700 }}
                        >
                          SIGUIENTE
                        </span>
                      )}
                    </div>
                    {isRecovery && (
                      <p className="mt-0.5 font-mono text-muted-foreground" style={{ fontSize: 10 }}>2 rondas</p>
                    )}
                    <p className="mt-0.5 font-body text-muted-foreground truncate" style={{ fontSize: 12 }}>
                      {block.exerciseNames.join(" · ")}
                    </p>
                    {!isInstructionBlock(block) && (
                      <p className="mt-1 font-mono text-muted-foreground" style={{ fontSize: 11 }}>
                        {block.totalSets} sets · ~{block.estimatedMinutes} min
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-muted-foreground" style={{ fontSize: 12 }}>
                      {block.completedSets}/{block.totalSets}
                    </span>
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
          className={`press-scale flex w-full items-center justify-center gap-2 rounded-xl py-4 font-display text-[15px] font-semibold text-primary-foreground disabled:opacity-50 ${allDone ? "block-breathing" : ""}`}
          style={{ backgroundColor: "hsl(var(--primary))" }}
        >
          TERMINAR SESIÓN
        </button>
      </div>

      {/* Soft gate dialog */}
      {softGateBlockId && softGateNextBlock && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => { setSoftGateBlockId(null); setSoftGateNextBlock(null); }}>
          <div className="w-full max-w-lg rounded-t-2xl p-6" style={{ background: "#2A2A2E", borderTop: `2px solid ${t.accent}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold text-foreground">Bloque incompleto</h3>
            </div>
            <p className="font-body text-sm text-muted-foreground">
              {(() => {
                const b = blocks.find(b => b.id === softGateBlockId);
                if (!b) return "";
                const w = getBlockWarnings(b);
                const parts: string[] = [];
                if (w.unloggedSets > 0) parts.push(`${w.unloggedSets} sets sin completar`);
                if (w.missingWeights > 0) parts.push(`${w.missingWeights} sets sin peso registrado`);
                return `Tienes ${parts.join(" y ")}. Logear tus pesos ayuda a trackear tu progreso y sugerirte cargas futuras.`;
              })()}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  const b = blocks.find(b => b.id === softGateBlockId);
                  setSoftGateBlockId(null);
                  setSoftGateNextBlock(null);
                  if (b) onBlockSelect(b);
                }}
                className="flex-1 rounded-xl bg-primary py-3 font-body text-sm font-medium text-primary-foreground"
              >
                Completar bloque
              </button>
              <button
                onClick={() => {
                  const next = softGateNextBlock;
                  setSoftGateBlockId(null);
                  setSoftGateNextBlock(null);
                  if (next) onBlockSelect(next);
                }}
                className="flex-1 rounded-xl bg-secondary py-3 font-body text-sm font-medium text-foreground"
              >
                Continuar así
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm finish dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60" onClick={() => setShowConfirm(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-6" style={{ background: "#2A2A2E", borderTop: `2px solid ${t.accent}` }} onClick={(e) => e.stopPropagation()}>
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

      {/* Breathing animation */}
      <style>{`
        @keyframes blockBreathe {
          0%, 100% { box-shadow: 0 4px 16px 0 rgba(0,0,0,0.15); }
          50% { box-shadow: 0 10px 40px 8px rgba(0,0,0,0.4); }
        }
        .block-breathing {
          animation: blockBreathe 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ── Phase context for coach notes ──
const PHASE_CONFIG: Record<number, { label: string; prefix: string }> = {
  1: { label: "BASE", prefix: "Semana base." },
  2: { label: "BASE +", prefix: "Semana base+." },
  3: { label: "ACUMULACIÓN", prefix: "Semana de acumulación." },
  4: { label: "INTENSIFICACIÓN", prefix: "Semana de intensificación." },
  5: { label: "PEAK", prefix: "Semana peak." },
  6: { label: "DELOAD", prefix: "Semana deload." },
};

// Patterns to strip from hardcoded coach_notes (case-insensitive)
const PHASE_STRIP_PATTERNS = [
  /^semana\s+(base\+?|de\s+acumulaci[oó]n|de\s+intensificaci[oó]n|peak|deload|de\s+recuperaci[oó]n)[.,:;\s—\-]*/i,
  /^fase\s+(base|acumulaci[oó]n|intensificaci[oó]n|peak|deload)[.,:;\s—\-]*/i,
];

function cleanCoachNote(raw: string, weekNumber: number, totalWeeks: number): string {
  // 1. Strip any existing phase prefix from the hardcoded note
  let cleaned = raw.trim();
  for (const pattern of PHASE_STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  // 2. Get the correct phase for this week
  const phase = PHASE_CONFIG[weekNumber] || PHASE_CONFIG[Math.min(weekNumber, 6)];
  if (!phase) return cleaned;

  // 3. Prepend correct phase context
  if (cleaned) {
    // Capitalize first letter of remaining text
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return `${phase.prefix} ${cleaned}`;
  }

  return phase.prefix;
}

function CoachNote({ note, shortOnTimeNote, weekNumber, totalWeeks }: { note: string; shortOnTimeNote: string | null; weekNumber: number; totalWeeks: number }) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [expanded, setExpanded] = useState(false);
  const [showShortNote, setShowShortNote] = useState(false);
  const displayNote = cleanCoachNote(note, weekNumber, totalWeeks);
  const isLong = displayNote.length > 120;

  return (
    <div className="px-5 mb-4 space-y-3">
      <div
        className="rounded-2xl p-4"
        style={{
          backgroundColor: t.accentBg,
          borderLeft: `3px solid ${t.accent}`,
        }}
      >
        <p className="font-mono uppercase text-primary" style={{ fontSize: 9, letterSpacing: "2px" }}>
          NOTA DEL COACH
        </p>
        <p
          className="mt-1.5 font-serif italic text-foreground"
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            fontWeight: 300,
            display: "-webkit-box",
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: "vertical",
            overflow: expanded ? undefined : "hidden",
          }}
        >
          {displayNote}
        </p>
        {isLong && !expanded && (
          <button onClick={() => setExpanded(true)} className="mt-1 font-body text-sm font-medium text-primary">
            Leer más
          </button>
        )}
      </div>

      {/* Short on time pill */}
      {shortOnTimeNote && !showShortNote && (
        <button
          onClick={() => setShowShortNote(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors"
          style={{ background: t.accentBg, border: `1px solid ${t.accentBgStrong}` }}
        >
          <Clock className="h-3.5 w-3.5" style={{ color: t.accent }} />
          <span className="font-body text-[12px] font-medium" style={{ color: t.accent }}>
            ¿Poco tiempo?
          </span>
        </button>
      )}
      {shortOnTimeNote && showShortNote && (
        <div
          className="rounded-xl p-3"
          style={{ background: t.accentBg, border: `1px solid ${t.accentBgStrong}` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: t.accent }} />
              <p className="font-body text-[12px] text-foreground leading-relaxed">
                {shortOnTimeNote}
              </p>
            </div>
            <button
              onClick={() => setShowShortNote(false)}
              className="shrink-0 p-0.5 rounded-full"
            >
              <span className="text-muted-foreground text-xs">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
