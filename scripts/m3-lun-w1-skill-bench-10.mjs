/**
 * M3 LUN W1 · Skill Push · DB Bench Press 8 → 10 reps
 *
 * Solo update sets NO completados — preserva el log real de quien ya entrenó W1.
 * Push-up Combo queda en 15 (5 wide + 5 std + 5 close, structure fija).
 *
 * Aplica a template W1 LUN + las 3 instancias atleta.
 * Idempotente: si ya está en 10, skip.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
async function exId(n) { const { data } = await sb.from("exercises").select("id").eq("name", n).single(); return data.id; }
const BENCH = await exId("Dumbbell Bench Press");

// W1 LUN workouts (template + 3 instancias)
const { data: tpl } = await sb
  .from("workouts")
  .select("id, week_number, day_label")
  .is("user_id", null)
  .eq("mesocycle_id", M3_ID)
  .like("day_label", "W1 DENSITY DAY");

const { data: inst } = await sb
  .from("workouts")
  .select("id, user_id, scheduled_date")
  .not("user_id", "is", null)
  .eq("day_label", "DENSITY DAY")
  .eq("scheduled_date", "2026-06-08");

const all = [...(tpl ?? []), ...(inst ?? [])];
console.log(`W1 LUN workouts: ${tpl?.length ?? 0} tpl + ${inst?.length ?? 0} instancias = ${all.length}`);

let updated = 0, skipped_completed = 0, skipped_already = 0;
for (const w of all) {
  const { data: sets } = await sb
    .from("workout_sets")
    .select("id, planned_reps, is_completed, user_id")
    .eq("workout_id", w.id)
    .eq("block_label", "SKILL PUSH")
    .eq("exercise_id", BENCH);
  for (const s of sets ?? []) {
    if (s.planned_reps === 10) { skipped_already++; continue; }
    if (s.is_completed) { skipped_completed++; continue; }
    const { error } = await sb.from("workout_sets").update({ planned_reps: 10 }).eq("id", s.id);
    if (error) { console.error(`✗ set ${s.id.slice(0, 8)}: ${error.message}`); continue; }
    updated++;
  }
}

console.log(`✓ Sets actualizados a 10 reps: ${updated}`);
console.log(`· Skip (ya está en 10): ${skipped_already}`);
console.log(`· Skip (set ya completado, log preserved): ${skipped_completed}`);
