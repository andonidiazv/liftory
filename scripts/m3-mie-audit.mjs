import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const MIE_DATE = "2026-06-10";

const issues = [], ok = [];
function check(cond, okMsg, errMsg) { if (cond) ok.push(okMsg); else issues.push(errMsg); }

const ALL_EXERCISES = [
  "Thoracic Extension over Foam Roller", "Wrist Mobility", "Scap Pull", "Dead Hang", "Bodyweight RDL",
  "Double KB Deadlift", "Double KB Front Rack Hold", "Double KB Strict Press", "Double KB Complex",
  "MU Burpee", "Ice Cream Maker", "KB Gorilla Row", "DB High Pull + Squat Clean Complex",
  "DB Hammer Curl", "DB Cross-Body Curl", "Hanging Knee Raise", "L-Sit Hold (tuck)",
  "Wall Lat Stretch", "Hanging Stretch",
];

const exMap = {};
for (const name of ALL_EXERCISES) {
  const { data } = await sb.from("exercises").select("id, name, name_es, category, movement_pattern, difficulty, primary_muscles, equipment_required, description, coaching_cue, founder_notes, is_active").eq("name", name).maybeSingle();
  if (!data) { issues.push(`Ejercicio NO existe: "${name}"`); continue; }
  exMap[name] = data;
  for (const f of ["name_es", "category", "movement_pattern", "difficulty", "description", "coaching_cue"]) if (!data[f]) issues.push(`"${name}": ${f} vacío`);
  if (!data.primary_muscles?.length) issues.push(`"${name}": primary_muscles vacío`);
  if (!data.equipment_required?.length) issues.push(`"${name}": equipment_required vacío`);
  if (!data.is_active) issues.push(`"${name}": inactive`);
  ok.push(`ex "${name}"`);
}

// Verify Dumbbell Hammer Curl no longer exists
const { data: oldHC } = await sb.from("exercises").select("id").eq("name", "Dumbbell Hammer Curl").maybeSingle();
if (oldHC) issues.push("Viejo nombre 'Dumbbell Hammer Curl' todavía existe"); else ok.push("rename Hammer Curl OK");

// Workouts
const { data: tpl } = await sb.from("workouts").select("*").is("user_id", null).eq("day_label", "W1 SKILL DAY").maybeSingle();
check(!!tpl, "template W1 SKILL DAY existe", "template W1 SKILL DAY no existe");
if (tpl) {
  check(tpl.scheduled_date === MIE_DATE, "template fecha correcta", `fecha=${tpl.scheduled_date}`);
  check(tpl.estimated_duration === 78, "duration=78", `duration=${tpl.estimated_duration}`);
  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido", "carga baja obligatoria"];
  for (const p of BAD) if ((tpl.coach_note||"").toLowerCase().includes(p.toLowerCase())) issues.push(`coach_note contiene "${p}"`);
}

const EXPECTED_BLOCKS = {
  "PRIME BLOCK": { count: 8, exercises: ["Thoracic Extension over Foam Roller", "Wrist Mobility", "Scap Pull", "Dead Hang", "Bodyweight RDL", "Double KB Deadlift", "Double KB Front Rack Hold", "Double KB Strict Press"], subHeaders: ["Mobility t-spine + muñeca", "Activación escapular pull + hinge", "Specific prep Double KB"] },
  "SKILL A": { count: 3, exercises: ["Double KB Complex"] },
  "SKILL B": { count: 1, exercises: ["MU Burpee"], forTime: true },
  "LAT VOLUME": { count: 6, exercises: ["Ice Cream Maker", "KB Gorilla Row"] },
  "PULL POWER": { count: 4, exercises: ["DB High Pull + Squat Clean Complex"] },
  "ARM BLOCK": { count: 6, exercises: ["DB Hammer Curl", "DB Cross-Body Curl"] },
  "CORE BLOCK": { count: 4, exercises: ["Hanging Knee Raise", "L-Sit Hold (tuck)"] },
  "RECOVERY BLOCK": { count: 2, exercises: ["Wall Lat Stretch", "Hanging Stretch"] },
};

async function auditSets(workoutId, label, expectedUserId) {
  const { data: sets } = await sb.from("workout_sets").select("*").eq("workout_id", workoutId).order("set_order");
  check(sets.length === 34, `${label}: 34 sets`, `${label}: ${sets.length} sets`);
  const byBlock = {};
  for (const s of sets) (byBlock[s.block_label] = byBlock[s.block_label] || []).push(s);

  for (const [blockName, expected] of Object.entries(EXPECTED_BLOCKS)) {
    const blockSets = byBlock[blockName] || [];
    check(blockSets.length === expected.count, `${label} ${blockName}: ${expected.count}`, `${label} ${blockName}: ${blockSets.length}`);
    const exIdsInBlock = new Set(blockSets.map(s => s.exercise_id));
    for (const exName of expected.exercises) {
      const exId = exMap[exName]?.id;
      if (!exId) continue;
      check(exIdsInBlock.has(exId), `${label} ${blockName} → "${exName}"`, `${label} ${blockName} falta "${exName}"`);
    }
    if (expected.subHeaders) {
      const headersFound = new Set();
      for (const s of blockSets) {
        const m = (s.coaching_cue_override||"").match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ\s·\-/+]+?)\s*\|/);
        if (m) headersFound.add(m[1].trim());
      }
      for (const h of expected.subHeaders) check(headersFound.has(h), `${label} ${blockName} sub-header "${h}"`, `${label} ${blockName} sub-header "${h}" FALTA`);
    }
    if (expected.forTime) {
      const fcue = blockSets[0]?.coaching_cue_override || "";
      check(fcue.startsWith("FOR TIME") || fcue.includes("FOR TIME:"), `${label} ${blockName}: cue dispara FOR TIME`, `${label} ${blockName}: cue NO dispara FOR TIME`);
      const capMatch = fcue.match(/cap\s*(\d+)\s*min/i);
      check(!!capMatch, `${label} ${blockName}: cap detectable`, `${label} ${blockName}: cap no parseable`);
    }
  }
  for (const block of Object.keys(byBlock)) if (!EXPECTED_BLOCKS[block]) issues.push(`${label}: bloque inesperado "${block}"`);

  const orders = sets.map(s => s.set_order).sort((a,b)=>a-b);
  check(new Set(orders).size === sets.length, `${label}: set_orders únicos`, `${label}: duplicados`);
  check(orders[0] === 1 && orders.at(-1) === 34, `${label}: orders 1-34`, `${label}: orders ${orders[0]}-${orders.at(-1)}`);
  const wrongUid = sets.filter(s => s.user_id !== expectedUserId).length;
  check(wrongUid === 0, `${label}: user_ids OK`, `${label}: ${wrongUid} sets con user_id incorrecto`);
}

await auditSets(tpl.id, "Template", null);
for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", MIE_DATE).maybeSingle();
  check(!!w, `${name} tiene workout`, `${name} sin workout`);
  if (w) await auditSets(w.id, name, uid);
}

console.log(`\nRESULTADO MIE W1: ${ok.length} OK · ${issues.length} ISSUES\n`);
if (issues.length === 0) console.log("✓ TODO OK"); else { for (const i of issues) console.log(`  ✗ ${i}`); process.exit(1); }
