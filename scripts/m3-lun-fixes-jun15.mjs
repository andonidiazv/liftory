/**
 * M3 LUN fixes 2026-06-15 (Andoni feedback):
 *
 * Fix A — PRIME BLOCK: agrego sub-header "Specific prep KB" al cue del KB Around the World
 *         (KB Halo queda sin prefix → se agrupa bajo el header).
 *         Aplica a templates W1-W6 LUN + las 3 instancias atleta de cada semana.
 *
 * Fix B — DENSITY BLOCK A:
 *   - W1: Commando Pull-up baja de 10 → 8 reps. Z Press queda en 8.
 *         Cue del primer Z Press: "EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando Pull-up 8. R1-3: RPE 8, R4-6: RPE 9"
 *   - W2: Z Press baja de 9 → 8, Commando baja de 10 → 8.
 *         Cue actualizado (W2 había hereditado el cue de W1 que decía 8/lado para Z Press, pero W2 había subido a 9).
 *
 * Idempotente: si ya está corregido, skip silently.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";

// ─── Resolve exercise IDs ──────────────────────────────────────────────────
async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).single();
  return data.id;
}
const ATW_ID = await exId("KB Around the World");
const Z_PRESS_ID = await exId("KB Alternating Z Press");
const COMMANDO_ID = await exId("Commando Pull-up");

console.log(`exercises resolved · ATW=${ATW_ID.slice(0,8)} Z=${Z_PRESS_ID.slice(0,8)} C=${COMMANDO_ID.slice(0,8)}`);

// ─── Find all LUN DENSITY DAY workouts (templates + athlete instances) ─────
// Templates: user_id IS NULL, mesocycle_id=M3, day_label like 'W% DENSITY DAY'
// Instances: user_id IS NOT NULL, day_label='DENSITY DAY', scheduled_date in M3 range
const { data: tplWorkouts } = await sb
  .from("workouts")
  .select("id, week_number, day_label, scheduled_date")
  .is("user_id", null)
  .eq("mesocycle_id", M3_ID)
  .like("day_label", "W% DENSITY DAY");

const { data: instWorkouts } = await sb
  .from("workouts")
  .select("id, week_number, day_label, scheduled_date, user_id")
  .not("user_id", "is", null)
  .eq("day_label", "DENSITY DAY")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

const allWorkouts = [...(tplWorkouts ?? []), ...(instWorkouts ?? [])];
console.log(`\nWorkouts a tocar: ${tplWorkouts?.length ?? 0} templates + ${instWorkouts?.length ?? 0} instancias = ${allWorkouts.length} total`);

// ─── FIX A: PRIME BLOCK · sub-header Specific prep KB ──────────────────────
// El cue actual del KB Around the World: "5 por lado · KB en cadera, alterna direcciones"
// Lo queremos: "Specific prep KB | 5 por lado · KB en cadera, alterna direcciones"
console.log("\n══ FIX A: PRIME BLOCK · Specific prep KB header ══");

const TARGET_PREFIX = "Specific prep KB | ";
let fixA = 0, skipA = 0;
for (const w of allWorkouts) {
  const { data: atwSet } = await sb
    .from("workout_sets")
    .select("id, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("exercise_id", ATW_ID)
    .eq("block_label", "PRIME BLOCK")
    .maybeSingle();
  if (!atwSet) continue;
  const cue = atwSet.coaching_cue_override || "";
  if (cue.startsWith(TARGET_PREFIX)) {
    skipA++;
    continue;
  }
  // Strip any other LABEL| prefix that might be there
  const cleaned = cue.replace(/^[^|]+\|\s*/, "");
  const newCue = TARGET_PREFIX + cleaned;
  const { error } = await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", atwSet.id);
  if (error) { console.error(`  ✗ W${w.week_number} ${w.user_id ? w.user_id.slice(0,8) : "tpl"}: ${error.message}`); continue; }
  fixA++;
}
console.log(`  ✓ fixed: ${fixA} · skip (ya correcto): ${skipA}`);

// ─── FIX B: Density Block A · W1 & W2 → Z Press 8, Commando 8 ──────────────
console.log("\n══ FIX B: Density Block A W1+W2 → 8/8 ══");

const targetWeeks = new Set([1, 2]);
let fixB_zPress = 0, fixB_commando = 0;

for (const w of allWorkouts) {
  if (!targetWeeks.has(w.week_number)) continue;

  // Density Block A sets: 6 of Z Press + 6 of Commando = 12 sets
  const { data: dbASets } = await sb
    .from("workout_sets")
    .select("id, exercise_id, planned_reps, coaching_cue_override, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "DENSITY BLOCK A")
    .order("set_order");

  if (!dbASets?.length) continue;

  for (const s of dbASets) {
    if (s.exercise_id === Z_PRESS_ID) {
      const updates = {};
      if (s.planned_reps !== 8) updates.planned_reps = 8;
      // Solo el primer Z Press tiene el cue completo; update si tiene "9/lado" o "9 por lado" o "10/lado"
      const cue = s.coaching_cue_override || "";
      if (cue && (cue.includes("9/lado") || cue.includes("9 por lado") || cue.includes("Commando Pull-up 10") || cue.includes("Commando Pull-up 8-10"))) {
        const newCue = cue
          .replace(/9\/lado/g, "8/lado")
          .replace(/9 por lado/g, "8 por lado")
          .replace(/Commando Pull-up 8-10/g, "Commando Pull-up 8")
          .replace(/Commando Pull-up 10/g, "Commando Pull-up 8")
          .replace(/10 reps/g, "8 reps");
        updates.coaching_cue_override = newCue;
      }
      if (Object.keys(updates).length) {
        const { error } = await sb.from("workout_sets").update(updates).eq("id", s.id);
        if (error) { console.error(`  ✗ Z W${w.week_number} so=${s.set_order}: ${error.message}`); continue; }
        fixB_zPress++;
      }
    }
    if (s.exercise_id === COMMANDO_ID) {
      const updates = {};
      if (s.planned_reps !== 8) updates.planned_reps = 8;
      const cue = s.coaching_cue_override || "";
      if (cue && (cue.includes("8-10") || cue.includes("10 reps") || cue.includes("Commando Pull-up 10"))) {
        updates.coaching_cue_override = cue
          .replace(/8-10/g, "8")
          .replace(/10 reps/g, "8 reps")
          .replace(/Commando Pull-up 10/g, "Commando Pull-up 8");
      }
      if (Object.keys(updates).length) {
        const { error } = await sb.from("workout_sets").update(updates).eq("id", s.id);
        if (error) { console.error(`  ✗ C W${w.week_number} so=${s.set_order}: ${error.message}`); continue; }
        fixB_commando++;
      }
    }
  }
}
console.log(`  ✓ Z Press sets updated: ${fixB_zPress}`);
console.log(`  ✓ Commando sets updated: ${fixB_commando}`);

console.log("\n✓ Todos los fixes aplicados");
