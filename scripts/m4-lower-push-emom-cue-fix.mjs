/**
 * M4 · LOWER PUSH · HEAVY A · fix del cue del Double KB Complex para que el
 * componente EmomTimerBlock detecte correctamente las rondas y el RPE.
 *
 * Patrón parseable (verificado en EmomTimerBlock.tsx:parseEmomConfig):
 *   "EMOM 75s | 7R x 1V"                    ← rondas + ventanas
 *   "R1-2: RPE 6.5, R3-4: RPE 7..."         ← RPE curve por ronda
 *
 * Solo la primera fila del EMOM del HEAVY BLOCK — A lleva el cue completo.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Por semana: total rondas + ventana + RPE curve por rango de rondas
const WEEK_SPEC = {
  1: { rondas: 7, ventana: 75, rpeRanges: "R1-2: RPE 6.5. R3-4: RPE 7. R5-6: RPE 7.5. R7: RPE 8", note: "" },
  2: { rondas: 7, ventana: 75, rpeRanges: "R1-2: RPE 7. R3-4: RPE 7.5. R5-6: RPE 8. R7: RPE 8.5", note: "" },
  3: { rondas: 7, ventana: 75, rpeRanges: "R1-2: RPE 7.5. R3-4: RPE 8. R5-6: RPE 8.5. R7: RPE 9", note: "" },
  4: { rondas: 8, ventana: 85, rpeRanges: "R1-2: RPE 8. R3-6: RPE 8.5. R7-8: RPE 9", note: "" },
  5: { rondas: 7, ventana: 85, rpeRanges: "R1-2: RPE 8.5. R3-4: RPE 9. R5-7: RPE 9.5", note: " · Post-EMOM 3 min rest + top single Clean RPE 10" },
  6: { rondas: 5, ventana: 75, rpeRanges: "Todos a RPE 5-6", note: " · DELOAD, prioridad técnica" },
};

function buildCue(week, cfg) {
  return `EMOM ${cfg.ventana}s | ${cfg.rondas}R x 1V. Complex: 1 Double KB Clean (catch en FULL front rack) + 3 Front Squat. ${cfg.rpeRanges}. Reset 1s entre reps del FS. Si fallas ventana: NO chase peso, bajá 5%.${cfg.note}`;
}

const { data: kb } = await sb.from("exercises").select("id").eq("name", "Double KB Clean + Front Squat Complex").single();
const KB_ID = kb.id;

const { data: workouts } = await sb.from("workouts")
  .select("id, scheduled_date, user_id, week_number")
  .eq("day_label", "LOWER PUSH")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

let updated = 0;
for (const w of workouts ?? []) {
  const cfg = WEEK_SPEC[w.week_number];
  if (!cfg) continue;

  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_order, set_type, coaching_cue_override, is_completed")
    .eq("workout_id", w.id)
    .eq("exercise_id", KB_ID)
    .eq("block_label", "HEAVY BLOCK — A")
    .eq("set_type", "emom")
    .order("set_order", { ascending: true });

  if (!sets?.length) continue;
  const first = sets[0];
  if (first.is_completed) continue;  // preservar log

  const newCue = buildCue(w.week_number, cfg);
  if (first.coaching_cue_override === newCue) continue;

  const { error } = await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", first.id);
  if (error) { console.error(`  ✗ ${w.scheduled_date} W${w.week_number}: ${error.message}`); continue; }
  updated++;
}

console.log(`✓ Cues actualizados: ${updated}`);
