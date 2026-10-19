/**
 * M3 SKILL PULL · MU Burpee — convertir For Time → EMOM
 *
 * Andoni 2026-06-25 (después de que reportó "no podía repetir el For Time +
 * cue desincronizado"): el For Time no controlaba pace. EMOM forza ritmo
 * realista, da recovery entre sets, mejora trackability.
 *
 *   W1: EMOM 8 min · 3 reps/min = 24 reps
 *   W2: EMOM 8 min · 3 reps/min = 24 reps
 *   W3: EMOM 9 min · 3 reps/min = 27 reps
 *   W4: EMOM 9 min · 3 reps/min = 27 reps
 *   W5: EMOM 10 min · 3 reps/min = 30 reps
 *   W6: EMOM 7 min · 3 reps/min = 21 reps (deload)
 *
 * Cambios al set existente:
 *   - set_type: 'working' → 'emom'
 *   - planned_reps: ... → 3 (reps por minuto)
 *   - planned_duration_seconds: ... → null (EMOM parsea de cue)
 *   - coaching_cue_override: cue nuevo en formato "EMOM 60s | NR x 1V"
 *
 * Log real (actual_reps) preservado.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PRESCRIPTIONS = {
  1: { rondas: 8, reps: 3 },
  2: { rondas: 8, reps: 3 },
  3: { rondas: 9, reps: 3 },
  4: { rondas: 9, reps: 3 },
  5: { rondas: 10, reps: 3 },
  6: { rondas: 7, reps: 3 },
};

function buildCue(rondas, reps, weekNumber) {
  const total = rondas * reps;
  const isDeload = weekNumber === 6;
  const intent = isDeload
    ? "Deload: prioridad técnica, NO empujar a falla. Si el minuto se aprieta, baja a R2 sin culpa."
    : "Cada minuto inicia con la campana: 3 MU Burpees. El descanso es lo que sobra del minuto. Si fallas un minuto, anótalo — es info, no fracaso.";
  return `EMOM ${rondas * 60}s | ${rondas}R x 1V. MU Burpee — ${reps} reps por minuto. ${total} reps totales en ${rondas} min. 1 rep = burpee (pecho a piso) → jump-to-bar → Muscle-Up. Regresiones: R1 Banded MU · R2 Jumping MU · R3 High Pull-up + Burpee. ${intent}`;
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
  const cfg = PRESCRIPTIONS[w.week_number];
  if (!cfg) continue;
  const newCue = buildCue(cfg.rondas, cfg.reps, w.week_number);

  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_type, planned_reps, planned_duration_seconds, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("exercise_id", MU_BURPEE_ID);

  for (const s of sets ?? []) {
    const patch = {
      set_type: "emom",
      planned_reps: cfg.reps,
      planned_duration_seconds: null,
      planned_rest_seconds: 60,
      coaching_cue_override: newCue,
    };
    // Skip if already converted
    if (s.set_type === "emom" && s.planned_reps === cfg.reps && s.coaching_cue_override === newCue) continue;

    const { error } = await sb.from("workout_sets").update(patch).eq("id", s.id);
    if (error) { console.error(`  ✗ ${w.scheduled_date} W${w.week_number}: ${error.message}`); continue; }
    const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
      : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
      : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
      : w.user_id ? "???" : "TPL";
    console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} · EMOM ${cfg.rondas} min · ${cfg.reps} reps/min`);
    updated++;
  }
}

console.log(`\n✓ Sets convertidos a EMOM: ${updated}`);
