/**
 * Auditoría completa de M3 LUN W1 Density Day.
 * Verifica: ejercicios, workout template + instancia, sets, EMOM config,
 * sub-bloques, ausencia de frases casuales, integridad referencial.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TEMPLATE_ID = "4b8ae2ba-1539-45cd-ade0-606f6b5b9062";
const ANDONI_ID = "584d19f7-719a-4b02-bf42-4e0f3dd1c66c";
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

const issues = [];
const ok = [];

function check(cond, okMsg, errMsg) {
  if (cond) ok.push(okMsg);
  else issues.push(errMsg);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. EXERCISES — los 11 nuevos + 9 reusados deben existir con nombres correctos
// ════════════════════════════════════════════════════════════════════════════

const M3_EXERCISES = [
  // Nuevos
  "Wall Slide", "Band Dislocates", "Banded Pull-Apart",
  "KB Around the World", "KB Halo",
  "KB Alternating Z Press", "Commando Pull-up",
  "Bent-Over DB Rear Delt Fly", "Push-up Combo (Wide-Standard-Close)",
  "DB Skull Crusher", "Low Plank KB Press-Drag",
  // Reusados (con los nombres ya renombrados al spec M3)
  "Scap Push-up", "Dumbbell Bench Press", "Push-up",
  "Cable Lean-Away Lateral Raise", "Tricep Rope Pushdown",
  "Doorway Pec Stretch", "Hollow Body Hold",
  "Thoracic Extension over Foam Roller", "Cross-Body Shoulder Stretch",
];

console.log("══ 1. Ejercicios ══");
const exMap = {};
for (const name of M3_EXERCISES) {
  const { data } = await sb.from("exercises")
    .select("id, name, name_es, category, movement_pattern, difficulty, default_tempo, primary_muscles, equipment_required, description, coaching_cue, founder_notes, is_active")
    .eq("name", name)
    .maybeSingle();
  if (!data) {
    issues.push(`Ejercicio NO existe: "${name}"`);
    continue;
  }
  exMap[name] = data;
  // Validate completeness
  const reqFields = ["name_es", "category", "movement_pattern", "difficulty", "description", "coaching_cue"];
  for (const f of reqFields) {
    if (!data[f]) issues.push(`"${name}": campo "${f}" vacío`);
  }
  if (!data.primary_muscles?.length) issues.push(`"${name}": primary_muscles vacío`);
  if (!data.equipment_required?.length) issues.push(`"${name}": equipment_required vacío`);
  if (!data.is_active) issues.push(`"${name}": is_active=false`);
  ok.push(`exercise "${name}" ok`);
}

// Verify renamed exercises no longer exist with old names
const REMOVED_NAMES = ["Lean Away Lateral Raise", "Cable Tricep Pushdown — Rope Attachment", "Chest Doorway Stretch"];
for (const oldName of REMOVED_NAMES) {
  const { data } = await sb.from("exercises").select("id").eq("name", oldName).maybeSingle();
  if (data) issues.push(`Nombre viejo "${oldName}" todavía existe — debió renombrarse`);
  else ok.push(`old name "${oldName}" no longer in DB ✓`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. MESOCYCLE M3
// ════════════════════════════════════════════════════════════════════════════

console.log("══ 2. Mesociclo M3 ══");
const { data: m3 } = await sb.from("mesocycles").select("*").eq("program_name", "BUILD HIM ELITE").eq("cycle_number", 3).maybeSingle();
check(!!m3, "M3 mesocycle existe", "M3 mesocycle NO existe");
if (m3) {
  check(m3.status === "draft", "M3 status=draft (no propagado)", `M3 status=${m3.status} (debería ser draft)`);
  check(m3.cycle_start_date === "2026-06-08", "M3 start=2026-06-08", `M3 start=${m3.cycle_start_date}`);
  check(m3.total_weeks === 6, "M3 total_weeks=6", `M3 total_weeks=${m3.total_weeks}`);
  check(m3.previous_cycle_id === "422affe6-4b2c-4e8d-bad7-4c96968e5e40", "M3 previous_cycle_id=M2", `M3 previous_cycle_id wrong`);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. WORKOUTS (template + instancia) — estructura, propiedades, coach_note clean
// ════════════════════════════════════════════════════════════════════════════

console.log("══ 3. Workouts ══");
async function checkWorkout(id, label, expectedUserId) {
  const { data: w } = await sb.from("workouts").select("*").eq("id", id).maybeSingle();
  check(!!w, `${label} workout existe`, `${label} workout NO existe`);
  if (!w) return null;
  check(w.scheduled_date === "2026-06-08", `${label} fecha 2026-06-08`, `${label} fecha=${w.scheduled_date}`);
  check(w.week_number === 1, `${label} week_number=1`, `${label} week_number=${w.week_number}`);
  check(w.estimated_duration === 78, `${label} duration=78`, `${label} duration=${w.estimated_duration}`);
  check(w.user_id === expectedUserId, `${label} user_id correcto`, `${label} user_id=${w.user_id} (esperado ${expectedUserId})`);
  check(!!w.coach_note, `${label} coach_note presente`, `${label} coach_note vacío`);
  // Check coach_note doesn't have casual phrases
  const cn = (w.coach_note || "").toLowerCase();
  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido"];
  for (const phrase of BAD) {
    if (cn.includes(phrase)) issues.push(`${label} coach_note contiene "${phrase}"`);
  }
  return w;
}
const tpl = await checkWorkout(TEMPLATE_ID, "Template", null);
const inst = await checkWorkout(ANDONI_ID, "Andoni instance", ANDONI);

// ════════════════════════════════════════════════════════════════════════════
// 4. SETS — auditar en ambos workouts
// ════════════════════════════════════════════════════════════════════════════

console.log("══ 4. Sets ══");

const EXPECTED_BLOCKS = {
  "PRIME BLOCK": {
    count: 6,
    exercises: ["Wall Slide", "Band Dislocates", "Scap Push-up", "Banded Pull-Apart", "KB Around the World", "KB Halo"],
    subHeaders: ["Mobility hombro", "Activación escapular", "Specific prep KB"],
  },
  "DENSITY BLOCK A": { count: 12, exercises: ["KB Alternating Z Press", "Commando Pull-up"], allEmom: true },
  "HYPERTROPHY BLOCK": { count: 6, exercises: ["Cable Lean-Away Lateral Raise", "Bent-Over DB Rear Delt Fly"] },
  "SKILL PUSH": { count: 6, exercises: ["Dumbbell Bench Press", "Push-up Combo (Wide-Standard-Close)"] },
  "ARM BLOCK": { count: 8, exercises: ["Tricep Rope Pushdown", "DB Skull Crusher"] },
  "CORE BLOCK": { count: 6, exercises: ["Hollow Body Hold", "Low Plank KB Press-Drag"] },
  "RECOVERY BLOCK": { count: 3, exercises: ["Doorway Pec Stretch", "Thoracic Extension over Foam Roller", "Cross-Body Shoulder Stretch"] },
};

async function auditSets(workoutId, label) {
  console.log(`\n  ── ${label} ──`);
  const { data: sets } = await sb
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("set_order");

  check(sets.length === 47, `${label}: 47 sets totales`, `${label}: ${sets.length} sets (esperado 47)`);

  // Block grouping
  const byBlock = {};
  for (const s of sets) {
    (byBlock[s.block_label] = byBlock[s.block_label] || []).push(s);
  }

  for (const [blockName, expected] of Object.entries(EXPECTED_BLOCKS)) {
    const blockSets = byBlock[blockName] || [];
    check(blockSets.length === expected.count,
      `${label} ${blockName}: ${expected.count} sets`,
      `${label} ${blockName}: ${blockSets.length} sets (esperado ${expected.count})`);

    // Check expected exercises present
    const exIds = new Set(blockSets.map(s => s.exercise_id));
    for (const exName of expected.exercises) {
      const exId = exMap[exName]?.id;
      if (!exId) continue; // already reported as missing
      check(exIds.has(exId),
        `${label} ${blockName} contiene "${exName}"`,
        `${label} ${blockName} NO contiene "${exName}"`);
    }

    // Sub-header checks (M3 PRIME uses "Label | cue" prefix on first set of each sub-group)
    if (expected.subHeaders) {
      const headersFound = new Set();
      for (const s of blockSets) {
        const cue = s.coaching_cue_override || "";
        const m = cue.match(/^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s·\-]+?)\s*\|/);
        if (m) headersFound.add(m[1].trim());
      }
      for (const expectedHeader of expected.subHeaders) {
        check(headersFound.has(expectedHeader),
          `${label} ${blockName} sub-header "${expectedHeader}" presente`,
          `${label} ${blockName} sub-header "${expectedHeader}" FALTA`);
      }
    }

    // EMOM-specific checks
    if (expected.allEmom) {
      const allEmom = blockSets.every(s => s.set_type === "emom");
      check(allEmom, `${label} ${blockName}: todos set_type=emom`, `${label} ${blockName}: no todos son set_type=emom`);
      const hasEmomCue = blockSets.every(s => /EMOM\s+\d+s/i.test(s.coaching_cue_override || ""));
      check(hasEmomCue, `${label} ${blockName}: cue tiene "EMOM Ns"`, `${label} ${blockName}: cue NO tiene EMOM`);
      const hasAlterna = blockSets.every(s => /Alterna:/i.test(s.coaching_cue_override || ""));
      check(hasAlterna, `${label} ${blockName}: cue tiene "Alterna:"`, `${label} ${blockName}: cue NO tiene Alterna`);
    }
  }

  // Check no orphan blocks (blocks not in EXPECTED_BLOCKS)
  for (const blockName of Object.keys(byBlock)) {
    if (!EXPECTED_BLOCKS[blockName]) issues.push(`${label}: bloque inesperado "${blockName}"`);
  }

  // Check set_order is unique and starts at 1
  const orders = sets.map(s => s.set_order).sort((a, b) => a - b);
  const uniqueOrders = new Set(orders);
  check(uniqueOrders.size === sets.length, `${label}: set_orders únicos`, `${label}: set_orders DUPLICADOS`);
  check(orders[0] === 1, `${label}: primer set_order = 1`, `${label}: primer set_order = ${orders[0]}`);
  check(orders[orders.length - 1] === 47, `${label}: último set_order = 47`, `${label}: último set_order = ${orders[orders.length - 1]}`);

  // Check user_id correctness on every set
  const expectedUserId = label.includes("Template") ? null : ANDONI;
  const wrongUserId = sets.filter(s => s.user_id !== expectedUserId);
  check(wrongUserId.length === 0, `${label}: todos los sets con user_id correcto`, `${label}: ${wrongUserId.length} sets con user_id incorrecto`);

  // Check no exercise_id is null
  const nullEx = sets.filter(s => !s.exercise_id);
  check(nullEx.length === 0, `${label}: todos los sets con exercise_id`, `${label}: ${nullEx.length} sets sin exercise_id`);

  // Check no "sin trampa" or other casual phrases in cues
  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido"];
  for (const s of sets) {
    const cue = (s.coaching_cue_override || "").toLowerCase();
    for (const phrase of BAD) {
      if (cue.includes(phrase)) issues.push(`${label} so=${s.set_order}: cue contiene "${phrase}": "${s.coaching_cue_override}"`);
    }
  }

  return { sets, byBlock };
}

const tplResult = await auditSets(TEMPLATE_ID, "Template");
const instResult = await auditSets(ANDONI_ID, "Instance");

// Verify template + instance have same structure
console.log("\n  ── Comparación template vs instance ──");
if (tplResult && instResult) {
  for (const blockName of Object.keys(EXPECTED_BLOCKS)) {
    const tplBlock = tplResult.byBlock[blockName] || [];
    const instBlock = instResult.byBlock[blockName] || [];
    check(tplBlock.length === instBlock.length,
      `Bloque "${blockName}": template y instance tienen ${tplBlock.length} sets`,
      `Bloque "${blockName}": template ${tplBlock.length} vs instance ${instBlock.length}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Verify NO other users got the M3 workout (no propagación)
// ════════════════════════════════════════════════════════════════════════════

console.log("══ 5. Aislamiento (no propagación) ══");
const { data: otherUserWorkouts } = await sb
  .from("workouts")
  .select("user_id, day_label")
  .eq("scheduled_date", "2026-06-08")
  .eq("day_label", "DENSITY DAY")
  .not("user_id", "is", null)
  .neq("user_id", ANDONI);
check(otherUserWorkouts.length === 0,
  "DENSITY DAY no se propagó a otros usuarios",
  `DENSITY DAY se propagó a ${otherUserWorkouts.length} otros usuarios`);

// ════════════════════════════════════════════════════════════════════════════
// REPORTE
// ════════════════════════════════════════════════════════════════════════════

console.log("\n\n════════════════════════════════════════════════════════════════");
console.log(`  RESULTADO: ${ok.length} OK · ${issues.length} ISSUES`);
console.log("════════════════════════════════════════════════════════════════\n");

if (issues.length === 0) {
  console.log("✓ TODO OK. Sin issues detectados.\n");
} else {
  console.log("ISSUES:");
  for (const i of issues) console.log(`  ✗ ${i}`);
  console.log();
}

process.exit(issues.length > 0 ? 1 : 0);
