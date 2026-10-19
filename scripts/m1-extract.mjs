/**
 * M1 · extract completo · Andoni's workouts + sets + ejercicios.
 * Genera un JSON estructurado para poder construir el HTML.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
import { writeFileSync } from "fs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

// M1 date range: antes de 2026-04-27 (start de M2)
const { data: workouts } = await sb.from("workouts")
  .select("id, scheduled_date, week_number, day_label, workout_type, is_rest_day, estimated_duration, coach_note")
  .eq("user_id", ANDONI)
  .lt("scheduled_date", "2026-04-27")
  .order("scheduled_date", { ascending: true });

console.log(`M1 workouts encontrados: ${workouts?.length}\n`);

if (!workouts?.length) {
  console.log("No hay workouts M1 para Andoni. Deja checar template M1.");
  process.exit(0);
}

// Get first + last dates
console.log(`First date: ${workouts[0].scheduled_date}`);
console.log(`Last date:  ${workouts[workouts.length-1].scheduled_date}\n`);

// Distribución por week + day_label
const byWeek = new Map();
for (const w of workouts) {
  const key = `W${w.week_number}`;
  if (!byWeek.has(key)) byWeek.set(key, []);
  byWeek.get(key).push({ date: w.scheduled_date, day_label: w.day_label, workout_type: w.workout_type, is_rest_day: w.is_rest_day });
}
for (const [w, list] of byWeek) {
  console.log(`${w}: ${list.length} workouts`);
  for (const d of list) console.log(`  ${d.date} · ${d.day_label ?? "(no label)"} · ${d.workout_type}${d.is_rest_day ? " · REST" : ""}`);
}

// Sample: get sets del primer workout
const first = workouts[0];
const { data: sets } = await sb.from("workout_sets")
  .select("set_order, block_label, set_type, planned_reps, planned_weight, planned_tempo, planned_rpe, planned_rest_seconds, planned_duration_seconds, coaching_cue_override, exercises:exercise_id(id, name)")
  .eq("workout_id", first.id)
  .order("set_order", { ascending: true });

console.log(`\n═══ Muestra: ${first.day_label} · ${first.scheduled_date} · ${sets?.length} sets ═══`);
let currBlock = "";
for (const s of sets ?? []) {
  if (s.block_label !== currBlock) {
    console.log(`\n── ${s.block_label} ──`);
    currBlock = s.block_label;
  }
  const reps = s.planned_reps ? `${s.planned_reps}r` : "";
  const dur = s.planned_duration_seconds ? `${s.planned_duration_seconds}s` : "";
  const rest = s.planned_rest_seconds ? `rest${s.planned_rest_seconds}s` : "";
  const tempo = s.planned_tempo ? `t${s.planned_tempo}` : "";
  const rpe = s.planned_rpe ? `RPE${s.planned_rpe}` : "";
  console.log(`  [${s.set_order}] ${s.set_type.padEnd(9)} ${(s.exercises?.name ?? "?").padEnd(35)} ${reps.padStart(4)} ${dur.padStart(4)} ${tempo.padStart(7)} ${rpe.padStart(6)} ${rest.padStart(11)}`);
}
