/**
 * Validator · revisor automático de un plan de mesociclo según LIFTORY rules.
 *
 * Devuelve { errors: string[], warnings: string[] }. Si errors.length > 0, el
 * plan NO se aplica. Warnings se reportan pero no bloquean.
 */

import { exerciseLookup } from "./catalog.mjs";

// ─── Constants ─────────────────────────────────────────────────────────────
const VALID_BLOCK_LABELS = new Set([
  "PRIME BLOCK", "PRIME BLOCK — A", "PRIME BLOCK — B", "PRIME BLOCK — C",
  "RESET & BREATHE", "SPINE & HIPS", "DYNAMIC FLOW", "ATHLETIC INTEGRATION",
  "POWER BLOCK",
  "HEAVY BLOCK — A", "HEAVY BLOCK — B", "HEAVY BLOCK — C",
  "HEAVY A", "HEAVY B", "HEAVY C",
  "HEAVY PUSH", "HEAVY PULL",
  "BUILD BLOCK — A", "BUILD BLOCK — B", "BUILD BLOCK — C",
  "DENSITY BLOCK A", "DENSITY BLOCK B",
  "HYPERTROPHY BLOCK",
  "SKILL A", "SKILL B", "SKILL PUSH",
  "LAT VOLUME", "PULL POWER",
  "ARM BLOCK", "ARM SUPERSET",
  "SHOULDER 3D", "STRENGTH COMPOUND",
  "GLUTE VOLUME", "LEG ENGINE", "CALF + CARRY",
  "ATHLETIC HINGE", "CORE BLOCK", "CARRY BLOCK",
  "METCON BLOCK", "FINISHER BLOCK", "ENGINE BLOCK",
  "POSTERIOR CHAIN", "TENDÓN",
  "RECOVERY BLOCK",
  "OPCIONAL · Z2",
]);

const PHASE_NAMES = ["BASE", "BASE+", "ACUMULACIÓN", "INTENSIFICACIÓN", "PEAK", "DELOAD"];

const FORBIDDEN_PHRASES = [
  /\bsin trampa\b/i,
  /\bno mames\b/i,
  /\bpendejo\b/i,
  /\bcarga baja obligatoria\b/i,
  /\bestupido\b/i,
];

const HARD_BLOCK_ORDER_HEADS = ["PRIME"];  // PRIME has to be first
const RECOVERY_HEAD = "RECOVERY";          // RECOVERY has to be last

// Cintura pequeña — heavy weighted rotation
const FORBIDDEN_EXERCISES_PATTERN = [
  /russian twist/i,
  /weighted rotational med ball/i,
  /weighted twist/i,
];

// ─── Validator ─────────────────────────────────────────────────────────────
export async function validateMeso(plan) {
  const errors = [];
  const warnings = [];

  // Mesocycle metadata
  if (!plan.mesocycle?.name) errors.push("mesocycle.name faltante");
  if (!plan.mesocycle?.cycle_number) errors.push("mesocycle.cycle_number faltante");
  if (!plan.mesocycle?.start_date) errors.push("mesocycle.start_date faltante");
  if (![6].includes(plan.mesocycle?.total_weeks)) {
    warnings.push(`mesocycle.total_weeks = ${plan.mesocycle?.total_weeks}, esperado 6`);
  }

  // Workouts
  if (!Array.isArray(plan.workouts) || plan.workouts.length === 0) {
    errors.push("workouts array vacío");
    return { errors, warnings };
  }

  // Group by week
  const byWeek = {};
  for (const w of plan.workouts) (byWeek[w.week_number] = byWeek[w.week_number] || []).push(w);
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
  const expectedWeeks = [1, 2, 3, 4, 5, 6];
  if (JSON.stringify(weeks) !== JSON.stringify(expectedWeeks)) {
    warnings.push(`weeks presentes: [${weeks.join(",")}], esperado [1..6]`);
  }

  // Index exercises_to_create by name
  const draftNames = new Set((plan.exercises_to_create ?? []).map(e => e.name));

  // For each workout
  for (const w of plan.workouts) {
    const ctx = `W${w.week_number} ${w.day_label}`;
    if (!w.scheduled_date) errors.push(`${ctx}: scheduled_date faltante`);
    if (!w.day_label) errors.push(`${ctx}: day_label faltante`);
    if (!Array.isArray(w.blocks) || w.blocks.length === 0) {
      errors.push(`${ctx}: blocks vacío`);
      continue;
    }

    // ── Rule: PRIME first
    const firstBlock = w.blocks[0]?.label || "";
    if (!HARD_BLOCK_ORDER_HEADS.some(h => firstBlock.startsWith(h))) {
      errors.push(`${ctx}: primer bloque debe empezar con PRIME, encontré "${firstBlock}"`);
    }

    // ── Rule: RECOVERY last
    const lastBlock = w.blocks[w.blocks.length - 1]?.label || "";
    if (!lastBlock.startsWith(RECOVERY_HEAD)) {
      errors.push(`${ctx}: último bloque debe empezar con RECOVERY, encontré "${lastBlock}"`);
    }

    // ── Coach note checks
    if (w.coach_note?.length > 350) warnings.push(`${ctx}: coach_note ${w.coach_note.length} chars (recomendado ≤ 350)`);
    if (w.short_on_time_note?.length > 200) warnings.push(`${ctx}: short_on_time_note ${w.short_on_time_note.length} chars`);
    if (w.coach_note) for (const re of FORBIDDEN_PHRASES) if (re.test(w.coach_note)) errors.push(`${ctx}: coach_note contiene frase prohibida (/${re.source}/)`);

    // ── Block-level checks
    let setOrderSeen = new Set();
    let setOrderCounter = 0;
    for (const b of w.blocks) {
      const blockCtx = `${ctx} > ${b.label}`;
      if (!VALID_BLOCK_LABELS.has(b.label) && !b.label.startsWith("PRIME BLOCK —") && !b.label.startsWith("HEAVY BLOCK —") && !b.label.startsWith("BUILD BLOCK —")) {
        warnings.push(`${blockCtx}: block_label desconocido — agregar a src/constants/blocks.ts si es nuevo`);
      }
      if (!Array.isArray(b.sets) || b.sets.length === 0) {
        errors.push(`${blockCtx}: sets vacío`);
        continue;
      }

      for (const s of b.sets) {
        // Set order auto-assigned if not set
        const so = s.set_order ?? ++setOrderCounter;
        if (s.set_order && setOrderSeen.has(s.set_order)) errors.push(`${blockCtx}: set_order ${s.set_order} duplicado`);
        setOrderSeen.add(so);

        // Exercise ref
        if (!s.exercise) errors.push(`${blockCtx}: set sin exercise`);
        else {
          // Lookup in catalog OR in drafts to create
          if (!draftNames.has(s.exercise)) {
            const found = await exerciseLookup(s.exercise);
            const exact = found.find(e => e.name === s.exercise);
            if (!exact) errors.push(`${blockCtx}: ejercicio "${s.exercise}" no existe en catálogo ni se va a crear`);
          }
        }

        // Set type
        const validSetTypes = ["working", "warmup", "amrap", "emom", "interval", "backoff", "superset", "cooldown", "dropset"];
        if (s.set_type && !validSetTypes.includes(s.set_type)) {
          errors.push(`${blockCtx}: set_type "${s.set_type}" inválido`);
        }

        // Forbidden exercises (heavy rotational)
        if (s.exercise) {
          for (const re of FORBIDDEN_EXERCISES_PATTERN) {
            if (re.test(s.exercise)) errors.push(`${blockCtx}: "${s.exercise}" — cintura pequeña rule (no rotacional con peso)`);
          }
        }

        // Coaching cue length + forbidden phrases
        if (s.coaching_cue_override) {
          if (s.coaching_cue_override.length > 350) warnings.push(`${blockCtx} so=${so}: coaching_cue_override ${s.coaching_cue_override.length} chars`);
          for (const re of FORBIDDEN_PHRASES) if (re.test(s.coaching_cue_override)) errors.push(`${blockCtx} so=${so}: cue contiene frase prohibida (/${re.source}/)`);
        }
      }
    }
  }

  // ── Validate exercises_to_create voice (length caps)
  for (const e of plan.exercises_to_create ?? []) {
    const ctx = `exercises_to_create["${e.name}"]`;
    if (!e.description) errors.push(`${ctx}: description faltante`);
    else if (e.description.length > 200) errors.push(`${ctx}: description ${e.description.length} chars > 200`);
    if (!e.coaching_cue) errors.push(`${ctx}: coaching_cue faltante`);
    else if (e.coaching_cue.length > 300) errors.push(`${ctx}: coaching_cue ${e.coaching_cue.length} chars > 300`);
    if (!e.founder_notes) errors.push(`${ctx}: founder_notes faltante`);
    else if (e.founder_notes.length > 150) errors.push(`${ctx}: founder_notes ${e.founder_notes.length} chars > 150`);
    if (!Array.isArray(e.primary_muscles) || e.primary_muscles.length === 0) errors.push(`${ctx}: primary_muscles vacío`);
    if (!Array.isArray(e.equipment_required) || e.equipment_required.length === 0) errors.push(`${ctx}: equipment_required vacío`);
  }

  return { errors, warnings };
}

/**
 * Renderiza el resultado del validador como texto plano para audit.txt.
 */
export function formatAudit({ errors, warnings }) {
  const lines = [];
  lines.push(`Errors: ${errors.length}`);
  lines.push(`Warnings: ${warnings.length}`);
  lines.push("");
  if (errors.length) {
    lines.push("ERRORS (plan NO se aplica):");
    for (const e of errors) lines.push("  ✗ " + e);
    lines.push("");
  }
  if (warnings.length) {
    lines.push("WARNINGS (revisar):");
    for (const w of warnings) lines.push("  ⚠ " + w);
  }
  if (!errors.length && !warnings.length) lines.push("✓ Plan limpio — listo para aplicar.");
  return lines.join("\n");
}
