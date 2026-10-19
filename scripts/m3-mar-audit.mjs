/**
 * Auditoría completa M3 MAR W1 Tempo Day.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const MAR_DATE = "2026-06-09";

const issues = [], ok = [];
function check(cond, okMsg, errMsg) { if (cond) ok.push(okMsg); else issues.push(errMsg); }

// 1) Catálogo: todos los ejercicios usados están completos
const ALL_EXERCISES = [
  // nuevos
  "Squat Priming Flow", "Bodyweight RDL", "Smith Machine Hip Thrust",
  "Reverse Sit Up", "Weighted Lateral Plank Dinámico", "45° Hip Extension (Glute Bias)",
  // renombrados
  "90/90 Hip Switches", "World's Greatest Stretch", "Pigeon",
  "Front Squat", "Nordic Hamstring Curl assisted",
  // reusados sin rename
  "Glute Bridge March", "Banded Lateral Walk",
  "Couch Stretch", "Frog Stretch", "Cat-Cow Reach",
];

const exMap = {};
for (const name of ALL_EXERCISES) {
  const { data } = await sb.from("exercises")
    .select("id, name, name_es, category, movement_pattern, difficulty, primary_muscles, equipment_required, description, coaching_cue, founder_notes, is_active")
    .eq("name", name).maybeSingle();
  if (!data) { issues.push(`Ejercicio NO existe: "${name}"`); continue; }
  exMap[name] = data;
  const req = ["name_es", "category", "movement_pattern", "difficulty", "description", "coaching_cue"];
  for (const f of req) if (!data[f]) issues.push(`"${name}": ${f} vacío`);
  if (!data.primary_muscles?.length) issues.push(`"${name}": primary_muscles vacío`);
  if (!data.equipment_required?.length) issues.push(`"${name}": equipment_required vacío`);
  if (!data.is_active) issues.push(`"${name}": inactive`);
  ok.push(`exercise "${name}" ok`);
}

// Verify renamed exercises don't exist with old names
const REMOVED = ["90-90 Hip Switches", "World Greatest Stretch", "Pigeon Stretch", "Barbell Front Squat", "Assisted Nordic Curl"];
for (const oldName of REMOVED) {
  const { data } = await sb.from("exercises").select("id").eq("name", oldName).maybeSingle();
  if (data) issues.push(`Nombre viejo "${oldName}" todavía existe`);
  else ok.push(`old "${oldName}" gone ✓`);
}

// 2) Mesocycle
const { data: m3 } = await sb.from("mesocycles").select("id").eq("program_name", "BUILD HIM ELITE").eq("cycle_number", 3).maybeSingle();
check(!!m3, "M3 existe", "M3 no existe");

// 3) Workouts
const { data: tpl } = await sb.from("workouts").select("*").is("user_id", null).eq("day_label", "W1 TEMPO DAY").maybeSingle();
check(!!tpl, "template W1 TEMPO DAY existe", "template W1 TEMPO DAY no existe");
if (tpl) {
  check(tpl.scheduled_date === MAR_DATE, "template fecha correcta", `template fecha=${tpl.scheduled_date}`);
  check(tpl.estimated_duration === 82, "template duration=82", `template duration=${tpl.estimated_duration}`);
  check(tpl.mesocycle_id === m3.id, "template mesocycle_id apunta a M3", `template mesocycle_id wrong`);
  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido", "carga baja obligatoria", "carga BAJA"];
  for (const phrase of BAD) if ((tpl.coach_note||"").toLowerCase().includes(phrase.toLowerCase())) issues.push(`template coach_note contiene "${phrase}"`);
}

const EXPECTED_BLOCKS = {
  "PRIME BLOCK": { count: 6, exercises: ["90/90 Hip Switches", "World's Greatest Stretch", "Glute Bridge March", "Banded Lateral Walk", "Squat Priming Flow", "Bodyweight RDL"], subHeaders: ["Mobility cadera", "Activación glúteo", "Movement pattern prep"] },
  "HEAVY A": { count: 4, exercises: ["Front Squat"] },
  "HEAVY B": { count: 4, exercises: ["Smith Machine Hip Thrust"] },
  "CORE BLOCK": { count: 6, exercises: ["Reverse Sit Up", "Weighted Lateral Plank Dinámico"] },
  "TENDÓN BLOCK": { count: 3, exercises: ["Nordic Hamstring Curl assisted"] },
  "POSTERIOR CHAIN": { count: 4, exercises: ["45° Hip Extension (Glute Bias)"] },
  "RECOVERY BLOCK": { count: 4, exercises: ["Pigeon", "Couch Stretch", "Frog Stretch", "Cat-Cow Reach"] },
};

async function auditSets(workoutId, label, expectedUserId) {
  const { data: sets } = await sb.from("workout_sets").select("*").eq("workout_id", workoutId).order("set_order");
  check(sets.length === 31, `${label}: 31 sets`, `${label}: ${sets.length} sets`);

  const byBlock = {};
  for (const s of sets) (byBlock[s.block_label] = byBlock[s.block_label] || []).push(s);

  for (const [blockName, expected] of Object.entries(EXPECTED_BLOCKS)) {
    const blockSets = byBlock[blockName] || [];
    check(blockSets.length === expected.count, `${label} ${blockName}: ${expected.count}`, `${label} ${blockName}: ${blockSets.length} (esperaba ${expected.count})`);
    const exIdsInBlock = new Set(blockSets.map(s => s.exercise_id));
    for (const exName of expected.exercises) {
      const exId = exMap[exName]?.id;
      if (!exId) continue;
      check(exIdsInBlock.has(exId), `${label} ${blockName} contiene "${exName}"`, `${label} ${blockName} falta "${exName}"`);
    }
    if (expected.subHeaders) {
      const headersFound = new Set();
      for (const s of blockSets) {
        const m = (s.coaching_cue_override||"").match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ\s·\-/]+?)\s*\|/);
        if (m) headersFound.add(m[1].trim());
      }
      for (const expectedH of expected.subHeaders) {
        check(headersFound.has(expectedH), `${label} ${blockName} sub-header "${expectedH}"`, `${label} ${blockName} sub-header "${expectedH}" FALTA`);
      }
    }
  }
  for (const block of Object.keys(byBlock)) if (!EXPECTED_BLOCKS[block]) issues.push(`${label}: bloque inesperado "${block}"`);

  const orders = sets.map(s => s.set_order).sort((a,b) => a-b);
  check(new Set(orders).size === sets.length, `${label}: set_orders únicos`, `${label}: set_orders duplicados`);
  check(orders[0] === 1 && orders.at(-1) === 31, `${label}: set_orders 1-31`, `${label}: set_orders ${orders[0]}-${orders.at(-1)}`);
  const wrongUid = sets.filter(s => s.user_id !== expectedUserId).length;
  check(wrongUid === 0, `${label}: user_id correcto`, `${label}: ${wrongUid} sets con user_id incorrecto`);
  const nullEx = sets.filter(s => !s.exercise_id).length;
  check(nullEx === 0, `${label}: todos con exercise_id`, `${label}: ${nullEx} sin exercise_id`);

  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido", "carga baja obligatoria"];
  for (const s of sets) {
    const cue = (s.coaching_cue_override||"").toLowerCase();
    for (const p of BAD) if (cue.includes(p.toLowerCase())) issues.push(`${label} so=${s.set_order}: cue contiene "${p}"`);
  }
}

await auditSets(tpl.id, "Template", null);
for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", MAR_DATE).maybeSingle();
  check(!!w, `${name} tiene workout`, `${name} sin workout en ${MAR_DATE}`);
  if (w) await auditSets(w.id, name, uid);
}

console.log("\n════════════════════════════════════════════════════════════════");
console.log(`  RESULTADO MAR W1: ${ok.length} OK · ${issues.length} ISSUES`);
console.log("════════════════════════════════════════════════════════════════\n");
if (issues.length === 0) console.log("✓ TODO OK\n");
else { console.log("ISSUES:"); for (const i of issues) console.log(`  ✗ ${i}`); console.log(); process.exit(1); }
