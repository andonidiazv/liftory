/**
 * M3 SKILL PULL · Double KB Complex — recalibrate sets × reps
 *
 * Andoni 2026-06-25:
 *   W1: 3 × 5 · W2: 3 × 5 · W3: 4 × 5 · W4: 4 × 5 · W5: 4 × 6 · W6: 3 × 5
 *
 * Adds new sets when needed (W3, W4, W5, W6 all gain +1 set).
 * Shifts later set_orders out of the way using temp offset to avoid conflicts.
 * Log real (actual_reps) untouched on existing sets.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PRESCRIPTIONS = {
  1: { sets: 3, reps: 5 },
  2: { sets: 3, reps: 5 },
  3: { sets: 4, reps: 5 },
  4: { sets: 4, reps: 5 },
  5: { sets: 4, reps: 6 },
  6: { sets: 3, reps: 5 },
};

const COMPLEX_ID = "ffcd2d10-2bbe-4d90-8121-a0d34f8a4e72";

const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, week_number")
  .or("day_label.eq.SKILL PULL,day_label.like.W% SKILL PULL")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

let repsUpdated = 0, setsAdded = 0;

for (const w of workouts) {
  const target = PRESCRIPTIONS[w.week_number];
  if (!target) continue;
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  const { data: existing } = await sb.from("workout_sets")
    .select("*")
    .eq("workout_id", w.id)
    .eq("exercise_id", COMPLEX_ID)
    .order("set_order", { ascending: true });

  // 1. Update reps on existing sets if needed
  for (const s of existing ?? []) {
    if (s.planned_reps !== target.reps) {
      const { error } = await sb.from("workout_sets").update({ planned_reps: target.reps }).eq("id", s.id);
      if (error) console.error(`  ✗ reps ${w.scheduled_date} ${u}: ${error.message}`);
      else { console.log(`  ✓ reps ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} set ${s.set_order} · ${s.planned_reps} → ${target.reps}`); repsUpdated++; }
    }
  }

  // 2. Add new sets if needed
  const currentCount = existing?.length ?? 0;
  if (currentCount < target.sets) {
    const last = existing[existing.length - 1];
    const toAdd = target.sets - currentCount;
    const startOrder = last.set_order + 1;
    const endOrder = last.set_order + toAdd;

    // Shift later sets out of the way (temp +10000 to avoid unique conflicts)
    const { data: later } = await sb.from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .gte("set_order", startOrder)
      .order("set_order", { ascending: true });

    for (const s of later ?? []) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }

    // Insert new sets
    for (let i = 0; i < toAdd; i++) {
      const newSet = {
        workout_id: last.workout_id,
        user_id: last.user_id,
        exercise_id: last.exercise_id,
        set_order: startOrder + i,
        set_type: last.set_type,
        block_label: last.block_label,
        planned_reps: target.reps,
        planned_weight: last.planned_weight,
        planned_tempo: last.planned_tempo,
        planned_rpe: last.planned_rpe,
        planned_rir: last.planned_rir,
        planned_rest_seconds: last.planned_rest_seconds,
        planned_duration_seconds: last.planned_duration_seconds,
        coaching_cue_override: last.coaching_cue_override,
      };
      const { error } = await sb.from("workout_sets").insert(newSet);
      if (error) {
        console.error(`  ✗ insert ${w.scheduled_date} ${u}: ${error.message}`);
        // Roll back the shift
        for (const s of later ?? []) {
          await sb.from("workout_sets").update({ set_order: s.set_order }).eq("id", s.id);
        }
        continue;
      }
      setsAdded++;
    }
    console.log(`  ✓ +${toAdd} set ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} · ${currentCount} → ${target.sets} sets`);

    // Renumber bumped sets sequentially after the inserts
    let nextOrder = endOrder + 1;
    for (const s of later ?? []) {
      await sb.from("workout_sets").update({ set_order: nextOrder }).eq("id", s.id);
      nextOrder++;
    }
  }
}

console.log(`\n✓ Reps updated: ${repsUpdated}`);
console.log(`✓ Sets added: ${setsAdded}`);
