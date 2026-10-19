import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. Get one full mesocycle row so we know the actual column names
const { data: mrow, error: e1 } = await sb.from("mesocycles").select("*").eq("id", "4154def5-95b0-492b-89fe-335aee1f4f9f").maybeSingle();
console.log("── FULL M3 MESOCYCLE ROW ──");
console.log(JSON.stringify(mrow, null, 2));
if (e1) console.log("ERR:", e1.message);

// 2. Get all mesocycles with *
const { data: allM } = await sb.from("mesocycles").select("*").order("cycle_number", { ascending: true });
console.log(`\n── ALL MESOCYCLES (${allM?.length ?? 0}) ──`);
for (const m of allM ?? []) console.log(`  ${m.cycle_number} · ${m.status} · start:${m.cycle_start_date ?? m.start_date} end:${m.cycle_end_date ?? m.end_date} · ${m.id}`);

// 3. Aliases check for exercises that fuzzy-matched
const ALIAS_CHECK = [
  "Barbell Back Squat", "Bulgarian Split Squat", "Wrist Mobility",
  "Chest Supported DB Row", "Dumbbell Row", "Banded Face Pull", "Cable Face Pull",
  "Barbell Bench Press", "Barbell Overhead Press", "Incline Bench Press",
  "Incline Dumbbell Press", "DB Skullcrusher", "Cable Tricep Pushdown",
];
const { data: exsB } = await sb.from("exercises").select("id, name, name_es, category, movement_pattern").in("name", ALIAS_CHECK);
console.log(`\n── ALIAS EXISTENCE CHECK (${exsB?.length ?? 0} found) ──`);
for (const e of exsB ?? []) console.log(`  ✓ ${e.name} · ${e.category}/${e.movement_pattern}`);
const foundNames = new Set((exsB ?? []).map(e => e.name));
console.log(`  Missing among aliases:`);
for (const n of ALIAS_CHECK) if (!foundNames.has(n)) console.log(`    ✗ ${n}`);

// 4. See the last M3 SKILL PULL workout so I can understand the pattern (LUN in M3 was different from LUN in M4 but I need to see workout row shape)
const { data: lastLun } = await sb.from("workouts").select("*, workout_sets(id, set_order, block_label, set_type, planned_reps, exercise_id, coaching_cue_override)").eq("user_id", "8117e549-8314-471d-87c2-c7c68cccac17").eq("scheduled_date", "2026-07-13").maybeSingle();
console.log("\n── ANDONI'S 2026-07-13 (LUN W6) WORKOUT ──");
if (lastLun) {
  console.log(`  id: ${lastLun.id}  day_label:${lastLun.day_label}  meso:${lastLun.mesocycle_id}  program:${lastLun.program_id}  week_number:${lastLun.week_number}  workout_type:${lastLun.workout_type}  is_rest_day:${lastLun.is_rest_day}  is_completed:${lastLun.is_completed}  estimated_duration:${lastLun.estimated_duration}`);
  console.log(`  sets: ${lastLun.workout_sets?.length ?? 0}`);
  const byBlock = new Map();
  for (const s of lastLun.workout_sets ?? []) {
    if (!byBlock.has(s.block_label)) byBlock.set(s.block_label, []);
    byBlock.get(s.block_label).push(s);
  }
  for (const [b, arr] of byBlock) console.log(`    ${b}: ${arr.length} sets`);
}
