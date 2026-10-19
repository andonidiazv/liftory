/**
 * M3 SKILL PULL · MU Burpee — progressive prescription
 *
 * Andoni 2026-06-25 (después de que reportó "burpees too much, 5/50 hoy"):
 *   W1: 24 reps · cap 15 min
 *   W2: 26 reps · cap 15 min
 *   W3: 28 reps · cap 15 min
 *   W4: 30 reps · cap 15 min
 *   W5: 32 reps · cap 15 min
 *   W6: 20 reps · cap 15 min (deload)
 *
 * Aplica a templates + Andoni + César + Víctor.
 * El log real (actual_reps) NO se toca — solo la prescripción.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PRESCRIPTIONS = {
  1: { reps: 24, capSec: 15 * 60 },
  2: { reps: 26, capSec: 15 * 60 },
  3: { reps: 28, capSec: 15 * 60 },
  4: { reps: 30, capSec: 15 * 60 },
  5: { reps: 32, capSec: 15 * 60 },
  6: { reps: 20, capSec: 15 * 60 },
};

// Get MU Burpee exercise id
const { data: ex } = await sb.from("exercises").select("id").eq("name", "MU Burpee").single();
if (!ex) { console.error("MU Burpee exercise not found"); process.exit(1); }
const MU_BURPEE_ID = ex.id;

// Get all SKILL PULL workouts in M3
const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, day_label, week_number")
  .or("day_label.eq.SKILL PULL,day_label.like.W% SKILL PULL")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

console.log(`Workouts a procesar: ${workouts.length}`);

let updated = 0, skipped = 0;
for (const w of workouts) {
  const cfg = PRESCRIPTIONS[w.week_number];
  if (!cfg) { console.log(`  · ${w.scheduled_date} W${w.week_number}: no prescription`); skipped++; continue; }

  const { data: sets } = await sb.from("workout_sets")
    .select("id, planned_reps, planned_duration_seconds")
    .eq("workout_id", w.id)
    .eq("exercise_id", MU_BURPEE_ID);

  if (!sets?.length) { console.log(`  · ${w.scheduled_date} W${w.week_number}: no MU Burpee set`); skipped++; continue; }

  for (const s of sets) {
    if (s.planned_reps === cfg.reps && s.planned_duration_seconds === cfg.capSec) {
      // Already at target
      continue;
    }
    const { error } = await sb.from("workout_sets")
      .update({ planned_reps: cfg.reps, planned_duration_seconds: cfg.capSec })
      .eq("id", s.id);
    if (error) { console.error(`  ✗ ${w.scheduled_date} W${w.week_number}: ${error.message}`); continue; }
    const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
      : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
      : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
      : w.user_id ? "???" : "TPL";
    console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} · ${s.planned_reps} → ${cfg.reps} reps · cap ${cfg.capSec/60} min`);
    updated++;
  }
}

console.log(`\n✓ Sets actualizados: ${updated}`);
console.log(`· Skipped: ${skipped}`);
