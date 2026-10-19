import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";

const issues = [], ok = [];
function check(cond, okMsg, errMsg) { if (cond) ok.push(okMsg); else issues.push(errMsg); }

const NEW_EXERCISES = [
  "Quadruped T-Spine Rotation", "Push-up to Alternating Toe Touch", "Half-Kneeling KB Snatch + Windmill",
  "Incline DB Bench Press", "DB Rotational Lateral Raise", "Pec Deck Rear Delt Fly",
  "EZ Bar Preacher Curl", "Cable Overhead Tricep Extension (rope)", "Weighted Dip", "Incline Walk steady pace",
  "Lateral Bound", "Kang Squat", "Barbell Bulgarian Split Squat", "Snatch-Grip Romanian Deadlift",
  "DB Walking Lunges", "Cable Pull-Through", "Standing Calf Raise pause-at-top", "Farmer Carry",
];

for (const name of NEW_EXERCISES) {
  const { data } = await sb.from("exercises").select("id, name, name_es, category, movement_pattern, difficulty, primary_muscles, equipment_required, description, coaching_cue, founder_notes, is_active").eq("name", name).maybeSingle();
  if (!data) { issues.push(`NO existe: "${name}"`); continue; }
  for (const f of ["name_es", "category", "movement_pattern", "difficulty", "description", "coaching_cue"]) if (!data[f]) issues.push(`"${name}": ${f} vacío`);
  if (!data.primary_muscles?.length) issues.push(`"${name}": primary_muscles vacío`);
  if (!data.equipment_required?.length) issues.push(`"${name}": equipment_required vacío`);
  if (!data.is_active) issues.push(`"${name}": inactive`);
  ok.push(`ex "${name}"`);
}

const VIE_BLOCKS = {
  "PRIME BLOCK": { count: 6, subHeaders: ["Mobility t-spine", "Activación push/pull", "Dinámicos CNS"] },
  "HEAVY PUSH": { count: 3 },
  "HEAVY PULL": { count: 3 },
  "SHOULDER 3D": { count: 6 },
  "ARM SUPERSET": { count: 6 },
  "STRENGTH COMPOUND": { count: 3 },
  "OPCIONAL · Z2": { count: 1 },
  "RECOVERY BLOCK": { count: 3 },
};
const SAB_BLOCKS = {
  "PRIME BLOCK": { count: 6, subHeaders: ["Mobility cadera + tobillo", "Activación glúteo", "Dinámicos CNS"] },
  "HEAVY A": { count: 4 },
  "HEAVY B": { count: 3 },
  "GLUTE VOLUME": { count: 6 },
  "LEG ENGINE": { count: 3 },
  "CALF + CARRY": { count: 6 },
  "RECOVERY BLOCK": { count: 4 },
};

async function auditDay({ label, date, dayLabel, expectedSets, expectedBlocks, userId }) {
  console.log(`\n── ${label} ${userId ? "(athlete)" : "(template)"} ──`);
  let query = sb.from("workouts").select("*").eq("scheduled_date", date);
  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null).eq("day_label", `W1 ${dayLabel}`);
  const { data: w } = await query.maybeSingle();
  check(!!w, `${label} workout existe`, `${label} workout NO existe`);
  if (!w) return;

  const { data: sets } = await sb.from("workout_sets").select("*").eq("workout_id", w.id).order("set_order");
  check(sets.length === expectedSets, `${label}: ${expectedSets} sets`, `${label}: ${sets.length} sets (esperado ${expectedSets})`);

  const byBlock = {};
  for (const s of sets) (byBlock[s.block_label] = byBlock[s.block_label] || []).push(s);

  for (const [blockName, expected] of Object.entries(expectedBlocks)) {
    const blockSets = byBlock[blockName] || [];
    check(blockSets.length === expected.count, `${label} ${blockName}: ${expected.count}`, `${label} ${blockName}: ${blockSets.length}`);
    if (expected.subHeaders) {
      const headersFound = new Set();
      for (const s of blockSets) {
        const m = (s.coaching_cue_override||"").match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ\s·\-+/]+?)\s*\|/);
        if (m) headersFound.add(m[1].trim());
      }
      for (const h of expected.subHeaders) check(headersFound.has(h), `${label} ${blockName} sub-header "${h}"`, `${label} ${blockName} sub-header "${h}" FALTA`);
    }
  }
  for (const block of Object.keys(byBlock)) if (!expectedBlocks[block]) issues.push(`${label}: bloque inesperado "${block}"`);

  const orders = sets.map(s => s.set_order).sort((a,b) => a-b);
  check(new Set(orders).size === sets.length, `${label}: set_orders únicos`, `${label}: duplicados`);
  check(orders[0] === 1 && orders.at(-1) === expectedSets, `${label}: orders 1-${expectedSets}`, `${label}: orders ${orders[0]}-${orders.at(-1)}`);
  const wrongUid = sets.filter(s => s.user_id !== (userId || null)).length;
  check(wrongUid === 0, `${label}: user_ids OK`, `${label}: ${wrongUid} sets con user_id incorrecto`);

  const BAD = ["sin trampa", "no mames", "carajo", "pendejo", "imbecil", "puto", "estupido", "carga baja obligatoria"];
  const cn = (w.coach_note||"").toLowerCase();
  for (const p of BAD) if (cn.includes(p)) issues.push(`${label} coach_note contiene "${p}"`);
}

// VIE
await auditDay({ label: "VIE template", date: "2026-06-12", dayLabel: "UPPER HYPERTROPHY", expectedSets: 31, expectedBlocks: VIE_BLOCKS, userId: null });
for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  await auditDay({ label: `VIE ${name}`, date: "2026-06-12", dayLabel: "UPPER HYPERTROPHY", expectedSets: 31, expectedBlocks: VIE_BLOCKS, userId: uid });
}

// SAB
await auditDay({ label: "SÁB template", date: "2026-06-13", dayLabel: "LOWER HYPERTROPHY", expectedSets: 32, expectedBlocks: SAB_BLOCKS, userId: null });
for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  await auditDay({ label: `SÁB ${name}`, date: "2026-06-13", dayLabel: "LOWER HYPERTROPHY", expectedSets: 32, expectedBlocks: SAB_BLOCKS, userId: uid });
}

console.log(`\n\nRESULTADO: ${ok.length} OK · ${issues.length} ISSUES\n`);
if (issues.length === 0) console.log("✓ TODO OK");
else { for (const i of issues) console.log(`  ✗ ${i}`); process.exit(1); }
