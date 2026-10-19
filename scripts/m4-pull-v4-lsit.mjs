/**
 * M4 · PULL v4 · L-Sit Chin-up progresión + coaching_cue ROM completo.
 *
 * Nueva curva:
 *   W1-W3: 4 × 6-8 reps (planned_reps: 6, 7, 8 progresivo dentro del rango)
 *   W4-W5: 4 × 8-10 reps (planned_reps: 8, 10)
 *   W6: 2 × 6 reps (deload)
 *
 * coaching_cue del ejercicio actualizado con énfasis en ROM COMPLETO:
 *   - Bottom: extensión total de codo + hombro
 *   - Top: barbilla al nivel de la barra
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Update coaching_cue del ejercicio ═══
const NEW_CUE = "Agarre supinado (palmas hacia vos), anchura de hombros. Antes de iniciar el pull, LEVANTA las piernas rectas paralelas al piso — mantenelas ahí durante TODO el rep. **ROM COMPLETO es NO-NEGOCIABLE**: en el bottom, extensión TOTAL de codo Y hombro (brazos completamente estirados, escápulas relajadas, sin colgar como muerto pero con full extension). Arriba, la BARBILLA tiene que llegar AL NIVEL de la barra (no solo la frente o la nariz — barbilla clara). Jalá con la escápula primero, no el bicep. Bajás controlado sin dejar caer las piernas. Si las piernas caen = cortás la serie. Regresión: tuck L-Sit (rodillas dobladas al pecho) hasta que puedas mantener piernas rectas.";

const { data: lsit } = await sb.from("exercises").select("id").eq("name", "L-Sit Chin-up").single();
const { error: eCue } = await sb.from("exercises").update({ coaching_cue: NEW_CUE }).eq("id", lsit.id);
if (eCue) { console.error("✗ update cue:", eCue.message); process.exit(1); }
console.log("✓ L-Sit Chin-up coaching_cue actualizado (ROM completo énfasis)");

// ═══ 2. Nueva curva HEAVY B ═══
const HEAVY_B = {
  1: { sets: 4, reps: 6,  range: "6-8",  tempo: "2-1-1", rest: 120, rpe: 7 },
  2: { sets: 4, reps: 7,  range: "6-8",  tempo: "2-1-1", rest: 120, rpe: 7.5 },
  3: { sets: 4, reps: 8,  range: "6-8",  tempo: "2-1-1", rest: 120, rpe: 8 },
  4: { sets: 4, reps: 8,  range: "8-10", tempo: "2-1-X", rest: 120, rpe: 8.5 },
  5: { sets: 4, reps: 10, range: "8-10", tempo: "3-1-X", rest: 120, rpe: 9 },
  6: { sets: 2, reps: 6,  range: "6",    tempo: "2-1-1", rest: 120, rpe: 6 },
};

function buildCue(week, cfg, isFirst) {
  if (!isFirst) return null;
  const dload = week === 6 ? " · DELOAD" : "";
  return `HEAVY B · L-Sit Chin-up · W${week}${dload}. ${cfg.range} reps · tempo ${cfg.tempo} · RPE ${cfg.rpe} · rest 2:00. ROM COMPLETO: brazos totalmente estirados abajo, barbilla al nivel de la barra arriba. Piernas rectas paralelas al piso — si caen, cortás la serie. Regresión: tuck L-Sit.`;
}

// ═══ 3. Update sets ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, user_id, scheduled_date, week_number")
  .eq("day_label", "PULL DAY")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

const LSIT_ID = lsit.id;
let updated = 0;

for (const w of workouts ?? []) {
  const cfg = HEAVY_B[w.week_number];
  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "HEAVY BLOCK — A")
    .eq("exercise_id", LSIT_ID)
    .order("set_order", { ascending: true });

  // Nota: L-Sit Chin-up también podría estar en HEAVY BLOCK — B (el HEAVY B del PULL DAY)
  // Deja buscar en ambos
  const { data: setsB } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "HEAVY BLOCK — B")
    .eq("exercise_id", LSIT_ID)
    .order("set_order", { ascending: true });

  const allSets = [...(sets ?? []), ...(setsB ?? [])].sort((a, b) => a.set_order - b.set_order);
  for (let i = 0; i < allSets.length; i++) {
    const row = allSets[i];
    const isFirst = i === 0;
    const { error } = await sb.from("workout_sets").update({
      planned_reps: cfg.reps,
      planned_tempo: cfg.tempo,
      planned_rpe: cfg.rpe,
      planned_rest_seconds: cfg.rest,
      coaching_cue_override: buildCue(w.week_number, cfg, isFirst),
    }).eq("id", row.id);
    if (error) { console.error(`  ✗ ${w.scheduled_date}: ${error.message}`); continue; }
    updated++;
  }

  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";
  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${allSets.length} sets · ${cfg.range} reps · RPE ${cfg.rpe}`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Coaching_cue del ejercicio: actualizado (ROM completo)`);
console.log(`  Sets updated: ${updated}`);
