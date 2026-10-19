/**
 * Inspect: cómo M2/M3 modelaron EMOMs con peso (rondas registrables).
 * Busco cualquier set_type='emom' y muestro el patrón por workout.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Todos los EMOMs en workouts anteriores a M4 (2026-07-20).
const { data: emomSets } = await sb.from("workout_sets")
  .select("id, workout_id, exercise_id, set_order, planned_reps, planned_rpe, planned_weight, planned_duration_seconds, coaching_cue_override, block_label, exercises:exercise_id(name), workouts:workout_id(scheduled_date, day_label)")
  .eq("set_type", "emom")
  .limit(200);

// Agrupar por workout_id + exercise_id para ver cuántas filas por EMOM
const groups = new Map();
for (const s of emomSets ?? []) {
  const key = `${s.workout_id}::${s.exercise_id}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(s);
}

console.log(`Total EMOM sets: ${emomSets?.length}\n`);
console.log(`Distinct (workout, ejercicio) combinations: ${groups.size}\n`);
console.log("Ejemplos (primeros 8 grupos):\n");
let i = 0;
for (const [key, sets] of groups) {
  if (i++ >= 8) break;
  const s0 = sets[0];
  const date = s0.workouts?.scheduled_date;
  const day = s0.workouts?.day_label;
  const ex = s0.exercises?.name;
  const cueSnippet = (s0.coaching_cue_override ?? "").slice(0, 100).replace(/\s+/g, " ");
  console.log(`── ${date} ${day} · ${ex} · ${sets.length} row(s) · block:${s0.block_label}`);
  for (const s of sets.sort((a,b)=>a.set_order-b.set_order)) {
    console.log(`   #${s.set_order} reps:${s.planned_reps} rpe:${s.planned_rpe} weight:${s.planned_weight} dur:${s.planned_duration_seconds}s`);
  }
  console.log(`   cue: "${cueSnippet}${cueSnippet.length>=100?"...":""}"\n`);
}
