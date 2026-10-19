import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Encontrar todos los EMOM sets con set_order distinto en el mismo workout+ejercicio (multi-fila)
const { data: emomSets } = await sb.from("workout_sets")
  .select("id, workout_id, exercise_id, set_order, planned_reps, planned_rpe, planned_weight, planned_duration_seconds, coaching_cue_override, block_label, exercises:exercise_id(name), workouts:workout_id(scheduled_date, day_label, week_number, user_id)")
  .eq("set_type", "emom");

const groups = new Map();
for (const s of emomSets ?? []) {
  const key = `${s.workout_id}::${s.exercise_id}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

// Multi-row groups
const multi = [...groups.entries()].filter(([, sets]) => sets.length >= 3);
console.log(`Multi-row EMOM groups (≥3 filas): ${multi.length}\n`);

// Ver los distintos date/day para entender qué mesos usan este patrón
const byDay = new Map();
for (const [key, sets] of multi) {
  const day = sets[0].workouts?.day_label;
  const date = sets[0].workouts?.scheduled_date;
  const wk = sets[0].workouts?.week_number;
  const uid = sets[0].workouts?.user_id;
  const uKey = uid ? "user" : "tpl";
  const k = `${date}·${day}·W${wk}·${uKey}·${sets[0].exercises?.name}·${sets.length}rows`;
  byDay.set(k, sets);
}
console.log("Distinct multi-row EMOM instances:\n");
for (const k of [...byDay.keys()].sort().slice(0, 10)) console.log(`  ${k}`);

// Escoger un template (user_id null) para inspeccionar en detalle
const tpl = multi.find(([, sets]) => sets[0].workouts?.user_id == null);
if (tpl) {
  const [key, sets] = tpl;
  const s0 = sets[0];
  console.log(`\n═══ DETALLE (template) ${s0.workouts?.scheduled_date} · ${s0.workouts?.day_label} · ${s0.exercises?.name} ═══`);
  console.log(`Rows: ${sets.length}\n`);
  const sorted = sets.sort((a,b) => a.set_order - b.set_order);
  for (const s of sorted) {
    const cue = (s.coaching_cue_override ?? "").slice(0, 200).replace(/\s+/g, " ");
    console.log(`  #${s.set_order}  reps:${s.planned_reps ?? "-"}  rpe:${s.planned_rpe ?? "-"}  weight:${s.planned_weight ?? "-"}  dur:${s.planned_duration_seconds ?? "-"}s  block:'${s.block_label}'`);
    console.log(`     cue: "${cue}${cue.length >= 200 ? "..." : ""}"`);
  }
}
