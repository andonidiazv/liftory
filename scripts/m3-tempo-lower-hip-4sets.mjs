/**
 * M3 TEMPO LOWER · Smith Machine Hip Thrust + 45° Hip Extension → 4 sets
 *
 * Andoni 2026-06-23: "5 es mucho para el volumen total". Baja W3 + W4 de 5→4.
 *
 * Estrategia:
 *   - Templates W3+W4: borrar el set con set_order más alto (siempre safe)
 *   - Instances atleta: borrar el set NO completado con set_order más alto
 *   - Si TODOS los 5 sets están completados (Andoni W3 entrenó hoy):
 *     no tocar nada y reportar — preservar el log real.
 *
 * Después de borrar, renumerar set_orders del workout para mantener continuidad.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGET_DATES = ["2026-06-23", "2026-06-30"]; // W3, W4
const TARGET_SETS = 4;

const { data: exRows } = await sb
  .from("exercises")
  .select("id, name")
  .in("name", ["Smith Machine Hip Thrust", "45° Hip Extension (Glute Bias)"]);
const SMITH = exRows.find(e => e.name === "Smith Machine Hip Thrust").id;
const HIPEXT = exRows.find(e => e.name === "45° Hip Extension (Glute Bias)").id;
const EX_IDS = [SMITH, HIPEXT];

const { data: all } = await sb
  .from("workouts")
  .select("id, scheduled_date, user_id, day_label")
  .in("scheduled_date", TARGET_DATES)
  .or("day_label.eq.TEMPO LOWER,day_label.like.W% TEMPO LOWER");

console.log(`Workouts a procesar (W3+W4 Tempo Lower): ${all?.length ?? 0}`);

let deletedCount = 0, skippedAllDone = 0, alreadyAt4 = 0, renumWorkouts = 0;

for (const w of all ?? []) {
  const ctx = `${w.scheduled_date} ${w.user_id ? w.user_id.slice(0, 8) : "tpl"}`;
  let touchedWorkout = false;

  for (const exId of EX_IDS) {
    const exName = exId === SMITH ? "Smith HT" : "45° HipExt";

    // Get current sets for this exercise in this workout
    const { data: sets } = await sb
      .from("workout_sets")
      .select("id, set_order, is_completed")
      .eq("workout_id", w.id)
      .eq("exercise_id", exId)
      .order("set_order", { ascending: false });

    if (!sets?.length) continue;

    if (sets.length <= TARGET_SETS) {
      alreadyAt4++;
      continue;
    }

    const excess = sets.length - TARGET_SETS;

    // Find sets to delete: highest set_order, NOT completed first
    const candidates = sets.filter(s => !s.is_completed).slice(0, excess);
    if (candidates.length < excess) {
      console.log(`  · ${ctx} ${exName}: ${sets.length} sets, todos completados → skip (preservar log)`);
      skippedAllDone++;
      continue;
    }

    // Delete candidates
    const toDeleteIds = candidates.map(s => s.id);
    const { error } = await sb.from("workout_sets").delete().in("id", toDeleteIds);
    if (error) { console.error(`  ✗ ${ctx} ${exName}: ${error.message}`); continue; }
    deletedCount += candidates.length;
    console.log(`  ✓ ${ctx} ${exName}: -${candidates.length} set(s)`);
    touchedWorkout = true;
  }

  // Renumber set_orders in this workout to keep them continuous (1..N)
  if (touchedWorkout) {
    const { data: allSets } = await sb
      .from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .order("set_order", { ascending: true });
    if (allSets) {
      // First pass: bump all set_orders by 10000 to avoid unique conflicts
      for (const s of allSets) {
        await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
      }
      // Second pass: renumber 1..N
      for (let i = 0; i < allSets.length; i++) {
        await sb.from("workout_sets").update({ set_order: i + 1 }).eq("id", allSets[i].id);
      }
      renumWorkouts++;
    }
  }
}

console.log(`\n✓ Sets eliminados: ${deletedCount}`);
console.log(`· Workouts renumerados: ${renumWorkouts}`);
console.log(`· Skip (todos completados): ${skippedAllDone} (logs preservados)`);
console.log(`· Skip (ya ≤4 sets): ${alreadyAt4}`);
