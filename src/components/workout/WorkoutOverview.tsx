import { ChevronLeft, Check, Clock, ChevronRight, AlertCircle } from "lucide-react";
import type { WorkoutData, ExerciseGroup, SupersetGroup, ExerciseDelta } from "@/hooks/useWorkoutData";
import { useState, useEffect, useRef, useMemo } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";
import { BLOCK_LABEL_COLORS } from "@/constants/blocks";
import ExpandableNote from "./ExpandableNote";

/**
 * ATELIER WORKOUT OVERVIEW · Phase 2.
 *
 * Atelier-voice rebuild of the workout overview. Functionality is 1:1
 * with the previous version — every dialog, soft-gate check, navigation
 * path, and badge detection logic is preserved. Only the visible
 * surface changes:
 *   - Header: small LIFTORY watermark + back arrow
 *   - Hero: day title centered (Tempo / Lower split typography)
 *   - Coach note: quiet italic paragraph, no card chrome
 *   - Blocks: numbered hairline rows (01, 02, …) with a gold marker
 *     for the next-up block and muted opacity on completed ones
 *   - Footer: minimal progress hairline + Terminar Sesión button
 */

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

/** Fallback colors by block type — kept for future use even if the row UI
 *  no longer surfaces them as left borders. */
const BLOCK_TYPE_COLORS: Record<string, string> = {
  mobility: "#7A8B5C",
  cooldown: "#7A8B5C",
  strength: "#C4A24E",
  sculpt: "#C4A24E",
  conditioning: "#D45555",
};

function getBlockColor(block: WorkoutBlock): string {
  return BLOCK_LABEL_COLORS[block.name] || BLOCK_TYPE_COLORS[block.type] || "#C4A24E";
}

const INSTRUCTION_BLOCK_LABELS = [
  'ENGINE BLOCK', 'RECOVERY BLOCK',
  'PRIME BLOCK', 'PRIME BLOCK — A', 'PRIME BLOCK — B', 'PRIME BLOCK — C',
  'RESET & BREATHE', 'SPINE & HIPS', 'DYNAMIC FLOW', 'ATHLETIC INTEGRATION',
  'OPCIONAL · Z2',
];

function isInstructionBlock(block: WorkoutBlock): boolean {
  // ATHLETIC INTEGRATION is dual-purpose: instruction-style for warmup flows (M1),
  // strength-style for sub-maximal work like Pause Box Squat (M2+). When the block
  // contains 'working' sets, treat it as a strength block (warnings + tracking).
  if (block.name === 'ATHLETIC INTEGRATION') {
    const hasWorking = block.groups.some(g => g.sets.some(s => s.set_type === 'working'));
    if (hasWorking) return false;
  }
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
      else if (
        isStrength &&
        // Timed sets (planks, holds) legitimately have actual_weight=0 — skip check
        (s.planned_duration_seconds ?? 0) === 0 &&
        (s.actual_weight == null || s.actual_weight === 0)
      ) {
        missingWeights++;
      }
    }
  }
  return { unloggedSets, missingWeights };
}

/** Render block name with bold main part and normal suffix */
function BlockNameDisplay({ name }: { name: string }) {
  const dashIdx = name.indexOf(' — ');
  if (dashIdx === -1) {
    return (
      <span
        className="font-display text-foreground"
        style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}
      >
        {name}
      </span>
    );
  }
  return (
    <span className="font-display text-foreground" style={{ fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
      <span style={{ fontWeight: 700 }}>{name.slice(0, dashIdx)}</span>
      <span style={{ fontWeight: 400 }}>{name.slice(dashIdx)}</span>
    </span>
  );
}

/** Atelier hero title split: "TEMPO LOWER" → top="Tempo" + bottom="Lower" */
function splitDayLabel(label: string): { top: string; bottom: string | null } {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return { top: cap(parts[0]), bottom: null };
  return {
    top: parts.slice(0, -1).map(cap).join(" "),
    bottom: cap(parts[parts.length - 1]),
  };
}

interface Props {
  workout: WorkoutData;
  blocks: WorkoutBlock[];
  totalSets: number;
  completedSets: number;
  programTotalWeeks: number;
  scrollToBlockId?: string | null;
  exerciseDeltas?: Record<string, ExerciseDelta>;
  onBack: () => void;
  onBlockSelect: (block: WorkoutBlock) => void;
  onFinish: () => void;
  saving: boolean;
}

/** Aggregate deltas across all exercises in a block into short chip labels */
function getBlockDeltaChips(block: WorkoutBlock, deltas: Record<string, ExerciseDelta>): string[] {
  const chips: string[] = [];
  let setsDelta = 0;
  const repsChanges: Array<{ from: number; to: number }> = [];
  const rpeChanges: Array<{ from: number; to: number }> = [];

  for (const g of block.groups) {
    const d = deltas[g.exercise.id];
    if (!d) continue;
    setsDelta += d.setsDelta;
    if (d.repsFrom != null && d.repsTo != null) repsChanges.push({ from: d.repsFrom, to: d.repsTo });
    if (d.rpeFrom != null && d.rpeTo != null) rpeChanges.push({ from: d.rpeFrom, to: d.rpeTo });
  }

  if (setsDelta !== 0) chips.push(`${setsDelta > 0 ? "+" : ""}${setsDelta} set${Math.abs(setsDelta) !== 1 ? "s" : ""}`);
  if (repsChanges.length > 0) {
    const from = repsChanges[0].from;
    const to = repsChanges[0].to;
    const uniform = repsChanges.every((c) => c.from === from && c.to === to);
    chips.push(uniform ? `${from}→${to} reps` : `reps cambiaron`);
  }
  if (rpeChanges.length > 0) {
    const from = rpeChanges[0].from;
    const to = rpeChanges[0].to;
    const uniform = rpeChanges.every((c) => c.from === from && c.to === to);
    chips.push(uniform ? `RPE ${from}→${to}` : `RPE cambio`);
  }

  return chips;
}

export default function WorkoutOverview({
  workout,
  blocks,
  totalSets,
  completedSets,
  programTotalWeeks: _programTotalWeeks,
  scrollToBlockId,
  exerciseDeltas,
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
    for (let i = 0; i < targetIdx; i++) {
      const prevBlock = blocks[i];
      const prevDone = prevBlock.completedSets >= prevBlock.totalSets && prevBlock.totalSets > 0;
      if (prevDone) {
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
      if (!isStrength) continue;
      const warnings = getBlockWarnings(prevBlock);
      if (warnings.unloggedSets > 0 || warnings.missingWeights > 0) {
        setSoftGateBlockId(prevBlock.id);
        setSoftGateNextBlock(targetBlock);
        return;
      }
    }
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

  const { top: titleTop, bottom: titleBottom } = splitDayLabel(workout.day_label);
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header — back arrow + LIFTORY watermark, mirror of home top */}
      <div
        className="sticky top-0 z-40 px-6 pt-14 pb-4"
        style={{ background: "rgba(13,13,15,0.92)", backdropFilter: "blur(20px)" }}
      >
        <div className="relative flex items-center justify-center">
          <button
            onClick={onBack}
            className="press-scale absolute left-0 flex h-9 items-center justify-center px-1"
            aria-label="Volver"
          >
            <ChevronLeft className="h-5 w-5" style={{ color: "#C4A24E" }} />
          </button>
          <span
            className="font-display uppercase"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "-0.04em",
              color: "#C4A24E",
              lineHeight: 1,
              textShadow: "0 0 14px rgba(196,162,78,0.28)",
            }}
          >
            LIFTORY
          </span>
        </div>
      </div>

      {/* Hero — day title centered. Same split styling as home so the screens
          read as siblings. Big top margin to clear the sticky header. */}
      <div className="px-6 mt-14 mb-10 text-center">
        <h1
          className="font-display"
          style={{
            letterSpacing: "-0.05em",
            lineHeight: 0.88,
            color: "hsl(var(--foreground))",
          }}
        >
          <span className="block" style={{ fontWeight: 300, fontSize: 48 }}>
            {titleTop}
          </span>
          {titleBottom && (
            <span
              className="block"
              style={{ fontWeight: 700, fontSize: 30, marginTop: 4 }}
            >
              {titleBottom}
            </span>
          )}
        </h1>
        <p
          className="mt-4 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
        >
          ~{workout.estimated_duration ?? 60} MIN · {totalSets} SETS · {blocks.length} BLOQUES
        </p>
      </div>

      {/* Coach Note — collapsed pill by default, expands inline on tap */}
      {workout.coach_note && (
        <CoachNote
          note={workout.coach_note}
          shortOnTimeNote={workout.short_on_time_note}
          weekNumber={workout.week_number}
          totalWeeks={_programTotalWeeks}
        />
      )}

      {/* small breathing space between coach pill and the blocks list */}
      <div className="h-6" />

      {/* Blocks — numbered hairline rows */}
      <div className="flex-1 px-6 pb-36">
        <div className="flex flex-col">
          {blocks.map((block, blockIdx) => {
            const done = block.completedSets >= block.totalSets && block.totalSets > 0;
            const isMobility = isInstructionBlock(block) || block.type === "cooldown";
            const isActive = blockIdx === firstPendingIdx;
            const orderLabel = String(blockIdx + 1).padStart(2, "0");
            const chips = exerciseDeltas && !isMobility ? getBlockDeltaChips(block, exerciseDeltas) : [];

            return (
              <button
                key={block.id}
                ref={(el) => { blockRefs.current[block.id] = el; }}
                onClick={() => handleBlockNavigate(block)}
                className="press-scale flex w-full items-center py-5 text-left"
                style={{
                  borderTop: blockIdx === 0 ? "1px solid hsl(var(--border))" : "none",
                  borderBottom: "1px solid hsl(var(--border))",
                  opacity: done ? 0.45 : 1,
                }}
              >
                {/* Number + active marker */}
                <div className="flex flex-col items-start mr-5 shrink-0" style={{ width: 28 }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "1.5px",
                      color: isActive ? "#C4A24E" : "hsl(var(--muted-foreground))",
                      fontWeight: 500,
                    }}
                  >
                    {orderLabel}
                  </span>
                  <div
                    style={{
                      width: isActive ? 18 : 12,
                      height: 2,
                      background: isActive ? "#C4A24E" : "hsl(var(--border))",
                      marginTop: 6,
                      boxShadow: isActive ? "0 0 10px rgba(196,162,78,0.55)" : "none",
                      transition: "all 0.3s ease",
                    }}
                  />
                </div>

                {/* Just the block name. Details (exercises, sets, deltas, format)
                    live inside the block detail view. */}
                <div className="flex-1 min-w-0 mr-3">
                  <BlockNameDisplay name={block.name} />
                </div>

                {/* Done check or chevron. No fraction — the athlete sees that
                    inside the block. */}
                <div className="shrink-0">
                  {done ? (
                    <Check className="h-4 w-4" style={{ color: "#C4A24E" }} strokeWidth={2.5} />
                  ) : (
                    <ChevronRight
                      className="h-4 w-4"
                      style={{ color: isActive ? "#C4A24E" : "hsl(var(--muted-foreground))" }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer — minimal progress + Terminar Sesión */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-6 pt-3 pb-6"
        style={{
          background: "rgba(13,13,15,0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
          >
            {completedSets} / {totalSets} sets
          </span>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
          >
            {progressPct}%
          </span>
        </div>
        <div className="relative h-px w-full mb-4" style={{ background: "hsl(var(--border))" }}>
          <div
            className="absolute top-0 left-0 h-px transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: "#C4A24E",
              boxShadow: progressPct > 0 ? "0 0 8px rgba(196,162,78,0.4)" : "none",
            }}
          />
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
          className="press-scale w-full font-display font-bold uppercase disabled:opacity-50 transition-colors"
          style={{
            background: allDone ? "#C4A24E" : "transparent",
            color: allDone ? "#0D0D0F" : "hsl(var(--foreground))",
            border: allDone ? "none" : "1px solid hsl(var(--border))",
            fontSize: 13,
            letterSpacing: "0.12em",
            padding: "16px 0",
            borderRadius: 14,
            boxShadow: allDone ? "0 16px 36px -12px rgba(196,162,78,0.45)" : "none",
          }}
        >
          Terminar sesión
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

const PHASE_STRIP_PATTERNS = [
  /^semana\s+(base\+?|de\s+acumulaci[oó]n|de\s+intensificaci[oó]n|peak|deload|de\s+recuperaci[oó]n)[.,:;\s—\-]*/i,
  /^fase\s+(base|acumulaci[oó]n|intensificaci[oó]n|peak|deload)[.,:;\s—\-]*/i,
];

function cleanCoachNote(raw: string, weekNumber: number, _totalWeeks: number): string {
  let cleaned = raw.trim();
  for (const pattern of PHASE_STRIP_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }
  const phase = PHASE_CONFIG[weekNumber] || PHASE_CONFIG[Math.min(weekNumber, 6)];
  if (!phase) return cleaned;
  if (cleaned) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return `${phase.prefix} ${cleaned}`;
  }
  return phase.prefix;
}

/**
 * Atelier-quiet coach note. Collapsed by default — shows only a small
 * pill "Notas del coach" that expands inline on tap. The short-on-time
 * note gets its own pill next to it.
 */
function CoachNote({
  note, shortOnTimeNote, weekNumber, totalWeeks,
}: {
  note: string; shortOnTimeNote: string | null; weekNumber: number; totalWeeks: number;
}) {
  const [showNote, setShowNote] = useState(false);
  const [showShortNote, setShowShortNote] = useState(false);
  const displayNote = cleanCoachNote(note, weekNumber, totalWeeks);

  const pillStyle: React.CSSProperties = {
    border: "1px solid rgba(196,162,78,0.25)",
    borderRadius: 999,
    padding: "5px 12px",
  };

  return (
    <div className="px-6 flex justify-center">
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => setShowNote(v => !v)}
          className="press-scale inline-flex items-center gap-1.5"
          style={pillStyle}
          aria-expanded={showNote}
        >
          <span
            className="font-mono uppercase"
            style={{ fontSize: 9, letterSpacing: "2px", color: "#C4A24E" }}
          >
            Notas del coach
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#C4A24E",
              transform: showNote ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              display: "inline-block",
            }}
          >
            ›
          </span>
        </button>
        {shortOnTimeNote && (
          <button
            onClick={() => setShowShortNote(v => !v)}
            className="press-scale inline-flex items-center gap-1.5"
            style={pillStyle}
            aria-expanded={showShortNote}
          >
            <Clock className="h-3 w-3" style={{ color: "#C4A24E" }} />
            <span
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "2px", color: "#C4A24E" }}
            >
              ¿Sin tiempo?
            </span>
          </button>
        )}
      </div>

      {/* Expanded panel — full-width below the pills */}
      {(showNote || showShortNote) && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] px-6 pt-5 pb-10 rounded-t-3xl"
          style={{
            background: "#15151A",
            borderTop: "1px solid hsl(var(--border))",
            boxShadow: "0 -16px 36px rgba(0,0,0,0.4)",
            animation: "fadeInUp 0.25s ease-out",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p
              className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "2.5px", color: "#C4A24E" }}
            >
              {showShortNote && !showNote ? "Sin tiempo" : "Coach"}
            </p>
            <button
              onClick={() => { setShowNote(false); setShowShortNote(false); }}
              className="text-muted-foreground"
              style={{ fontSize: 16 }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {showNote && (
            <ExpandableNote
              text={displayNote}
              clampLines={20}
              className="font-body text-foreground/85"
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                fontWeight: 300,
                fontStyle: "italic",
              }}
            />
          )}
          {showShortNote && shortOnTimeNote && (
            <p
              className="font-body italic text-foreground/85"
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                fontWeight: 300,
                marginTop: showNote ? 16 : 0,
              }}
            >
              {shortOnTimeNote}
            </p>
          )}
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
