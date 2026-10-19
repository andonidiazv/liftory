/**
 * M3 SKILL PULL · PULL POWER block — cap to 4 sets
 *
 * Andoni 2026-06-25: "5 series demasiado, acortar a 4"
 *
 * W3 + W4 tienen 5 sets. Bajar a 4.
 * Edge case: Andoni W3 completó los 5 hoy → preservar log real (skip).
 * Resto sin completar: borrar el set con set_order más alto.
 *
 * Patrón idéntico al de Hip Thrust + 45° Hip Ext de antes.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGET_SETS = 4;

const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, week_number")
  .or("day_label.eq.SKILL PULL,day_label.like.W% SKILL PULL")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

let deleted = 0, skippedAllDone = 0, alreadyAtTarget = 0, renumWorkouts = 0;

for (const w of workouts) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_order, is_completed")
    .eq("workout_id", w.id)
    .eq("block_label", "PULL POWER")
    .order("set_order", { ascending: false });

  if (!sets?.length) continue;
  if (sets.length <= TARGET_SETS) { alreadyAtTarget++; continue; }

  const excess = sets.length - TARGET_SETS;
  // Pick highest set_order NOT completed to delete
  const candidates = sets.filter(s => !s.is_completed).slice(0, excess);
  if (candidates.length < excess) {
    console.log(`  · W${w.week_number} ${u.padEnd(7)}: ${sets.length} sets all completed → skip (preserve log)`);
    skippedAllDone++;
    continue;
  }

  const toDeleteIds = candidates.map(s => s.id);
  const { error } = await sb.from("workout_sets").delete().in("id", toDeleteIds);
  if (error) { console.error(`  ✗ W${w.week_number} ${u}: ${error.message}`); continue; }
  deleted += candidates.length;
  console.log(`  ✓ W${w.week_number} ${u.padEnd(7)} · -${candidates.length} set(s)`);

  // Renumber set_orders in the workout for continuity
  const { data: remaining } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .order("set_order", { ascending: true });

  if (remaining) {
    // Two-pass: bump by +10000 to avoid uniqueness conflicts, then renumber 1..N
    for (const s of remaining) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }
    for (let i = 0; i < remaining.length; i++) {
      await sb.from("workout_sets").update({ set_order: i + 1 }).eq("id", remaining[i].id);
    }
    renumWorkouts++;
  }
}

console.log(`\n✓ Sets borrados: ${deleted}`);
console.log(`· Workouts renumerados: ${renumWorkouts}`);
console.log(`· Skipped (all completed, log preservado): ${skippedAllDone}`);
console.log(`· Skipped (ya ≤4 sets): ${alreadyAtTarget}`);
