/**
 * M3 LUN · Density Block A · normalizar a 6 reps Z Press / 8 reps Commando
 *
 * Aplica a templates W1-W5 + las 3 instancias de atleta de cada semana.
 * NO toca W6 (DELOAD tiene estructura distinta: 4R x 2V · 60% carga).
 *
 * Update del primer set's coaching_cue_override:
 *   "EMOM 60s | 6R x 2V. Alterna: KB Z Press 6/lado, Commando Pull-up 8. R1-3: RPE 8, R4-6: RPE 9"
 *
 * Idempotente: si ya está en 6/8 con cue match, skip.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";

async function exId(name) { const { data } = await sb.from("exercises").select("id").eq("name", name).single(); return data.id; }
const Z = await exId("KB Alternating Z Press");
const C = await exId("Commando Pull-up");

// All LUN DENSITY DAY workouts (templates + atletas), W1-W5 only
const { data: tpl } = await sb
  .from("workouts")
  .select("id, week_number, day_label")
  .is("user_id", null)
  .eq("mesocycle_id", M3_ID)
  .like("day_label", "W% DENSITY DAY")
  .in("week_number", [1, 2, 3, 4, 5]);

const { data: inst } = await sb
  .from("workouts")
  .select("id, week_number, day_label, scheduled_date, user_id")
  .not("user_id", "is", null)
  .eq("day_label", "DENSITY DAY")
  .in("week_number", [1, 2, 3, 4, 5])
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

const all = [...(tpl ?? []), ...(inst ?? [])];
console.log(`Workouts a normalizar (W1-W5): ${tpl?.length ?? 0} templates + ${inst?.length ?? 0} instancias = ${all.length}`);

let zUpdated = 0, cUpdated = 0, cueUpdated = 0;

for (const w of all) {
  const { data: sets } = await sb
    .from("workout_sets")
    .select("id, exercise_id, planned_reps, coaching_cue_override, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "DENSITY BLOCK A")
    .order("set_order");

  if (!sets?.length) continue;

  // Find first Z Press set (cue lives there)
  const firstZ = sets.find(s => s.exercise_id === Z);

  for (const s of sets) {
    if (s.exercise_id === Z) {
      const updates = {};
      if (s.planned_reps !== 6) updates.planned_reps = 6;
      // Cue: only on the first Z set (others are blank or repeat)
      if (s.id === firstZ?.id) {
        const newCue = "EMOM 60s | 6R x 2V. Alterna: KB Z Press 6/lado, Commando Pull-up 8. R1-3: RPE 8, R4-6: RPE 9";
        // For W5 we keep the TEST cue if it exists
        const isTest = (s.coaching_cue_override || "").startsWith("TEST");
        const target = isTest
          ? "TEST · EMOM 60s | 6R x 2V · MAX REPS por minuto · alterna Z Press 6/lado y Commando 8 · KB top peso · scoring por reps totales"
          : newCue;
        if (s.coaching_cue_override !== target) {
          updates.coaching_cue_override = target;
          cueUpdated++;
        }
      }
      if (Object.keys(updates).length) {
        const { error } = await sb.from("workout_sets").update(updates).eq("id", s.id);
        if (error) { console.error(`✗ Z W${w.week_number} so=${s.set_order}: ${error.message}`); continue; }
        zUpdated++;
      }
    }
    if (s.exercise_id === C) {
      if (s.planned_reps !== 8) {
        const { error } = await sb.from("workout_sets").update({ planned_reps: 8 }).eq("id", s.id);
        if (error) { console.error(`✗ C W${w.week_number} so=${s.set_order}: ${error.message}`); continue; }
        cUpdated++;
      }
    }
  }
}

console.log(`✓ Z Press sets updated to 6 reps: ${zUpdated}`);
console.log(`✓ Commando sets updated to 8 reps: ${cUpdated}`);
console.log(`✓ Cues updated: ${cueUpdated}`);
console.log(`\nNote: W6 DELOAD NO se tocó (estructura distinta: 4R x 2V · 60% carga). Si querés también, decime.`);
