/**
 * M3 SKILL PULL · MU Burpee — update coach cues to match new prescription
 *
 * Failed to do this earlier when I bumped the reps/cap. The cue is what the
 * athlete reads — if it says "50 MU Burpees · cap 12 min" but the timer is
 * configured to 28 reps / 15 min, the data conflicts with what they see.
 *
 * Aplicado a templates + Andoni + César + Víctor.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PRESCRIPTIONS = {
  1: 24, 2: 26, 3: 28, 4: 30, 5: 32, 6: 20,
};

function buildCue(reps, weekNumber) {
  const isDeload = weekNumber === 6;
  const base = `FOR TIME · cap 15 min · ${reps} MU Burpees. 1 rep = burpee (pecho a piso) → jump-to-bar → Muscle-Up. Regresiones (elige por nivel): R1 Banded MU · R2 Jumping MU · R3 High Pull-up + Burpee.`;
  const intent = isDeload
    ? " Deload: prioridad técnica, NO empujar a falla. Termina con energía."
    : ` Objetivo: ritmo sostenible, ${(reps / 15).toFixed(1)} reps/min promedio. Si tu pulso explota, baja a R2 sin culpa.`;
  return base + intent;
}

const { data: ex } = await sb.from("exercises").select("id").eq("name", "MU Burpee").single();
if (!ex) { console.error("MU Burpee not found"); process.exit(1); }
const MU_BURPEE_ID = ex.id;

const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, week_number")
  .or("day_label.eq.SKILL PULL,day_label.like.W% SKILL PULL")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

let updated = 0;
for (const w of workouts) {
  const reps = PRESCRIPTIONS[w.week_number];
  if (!reps) continue;
  const newCue = buildCue(reps, w.week_number);

  const { data: sets } = await sb.from("workout_sets")
    .select("id, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("exercise_id", MU_BURPEE_ID);

  for (const s of sets ?? []) {
    if (s.coaching_cue_override === newCue) continue;
    const { error } = await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", s.id);
    if (error) console.error(`  ✗ ${w.scheduled_date} W${w.week_number}: ${error.message}`);
    else { console.log(`  ✓ ${w.scheduled_date} W${w.week_number} · cue updated (${reps} reps)`); updated++; }
  }
}

console.log(`\n✓ Cues updated: ${updated}`);
