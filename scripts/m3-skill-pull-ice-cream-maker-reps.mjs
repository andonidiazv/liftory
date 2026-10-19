/**
 * M3 SKILL PULL · Ice Cream Maker — recalibrar reps por semana
 *
 * Andoni 2026-06-25: "demasiadas, bajemos a:"
 *   W1: 8 · W2: 8 · W3: 10 · W4: 10 · W5: 10 · W6: 8
 *
 * Solo cambia planned_reps. Sets por workout se quedan igual. Log real
 * (actual_reps) no se toca.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PRESCRIPTIONS = { 1: 8, 2: 8, 3: 10, 4: 10, 5: 10, 6: 8 };

const { data: ex } = await sb.from("exercises").select("id").eq("name", "Ice Cream Maker").single();
if (!ex) { console.error("Ice Cream Maker not found"); process.exit(1); }
const ICE_CREAM_ID = ex.id;

const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, week_number")
  .or("day_label.eq.SKILL PULL,day_label.like.W% SKILL PULL")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

let updated = 0, unchanged = 0;
for (const w of workouts) {
  const target = PRESCRIPTIONS[w.week_number];
  if (!target) continue;

  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_order, planned_reps")
    .eq("workout_id", w.id)
    .eq("exercise_id", ICE_CREAM_ID);

  for (const s of sets ?? []) {
    if (s.planned_reps === target) { unchanged++; continue; }
    const { error } = await sb.from("workout_sets").update({ planned_reps: target }).eq("id", s.id);
    if (error) { console.error(`  ✗ ${w.scheduled_date} W${w.week_number} set ${s.set_order}: ${error.message}`); continue; }
    const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
      : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
      : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
      : w.user_id ? "???" : "TPL";
    console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} set ${s.set_order} · ${s.planned_reps} → ${target}`);
    updated++;
  }
}

console.log(`\n✓ Sets actualizados: ${updated}`);
console.log(`· Sin cambio (ya target): ${unchanged}`);
