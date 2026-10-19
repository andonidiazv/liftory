/**
 * PRIME BLOCK — A/B/C → un solo "PRIME BLOCK" con sub-grupos visualmente
 * separados dentro de la card.
 *
 * 1. Revertir block_label de los 6 sets PRIME a "PRIME BLOCK"
 * 2. Marcar el primer set de cada sub-grupo con prefix "Label | …" para que
 *    MobilityContent renderice un sub-header (Mobility hombro / Activación
 *    escapular / Specific prep KB)
 *
 * Aplica a template + instancia de Andoni.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TEMPLATE_ID = "4b8ae2ba-1539-45cd-ade0-606f6b5b9062";
const ANDONI_ID = "584d19f7-719a-4b02-bf42-4e0f3dd1c66c";

// Mapeo: nombre del ejercicio → cue final.
// La primera de cada sub-grupo trae el "Label |" prefix, las demás solo el cue.
const NEW_PRIME_CUES = {
  "Wall Slide": "Mobility hombro | 2 rondas · pegado a la pared, sin perder contacto",
  "Band Dislocates": "2 rondas · brazos rectos, no doblar codos",
  "Scap Push-up": "Activación escapular | 2 rondas · solo movimiento de escápulas",
  "Banded Pull-Apart": "2 rondas · liga toca el pecho arriba",
  "KB Around the World": "Specific prep KB | 5 por lado · KB en cadera, alterna direcciones",
  "KB Halo": "5 por lado · KB pegada a la cabeza, codos altos",
};

async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!data) throw new Error(`Exercise not found: ${name}`);
  return data.id;
}

const EX_ID_TO_NAME = {};
for (const name of Object.keys(NEW_PRIME_CUES)) {
  EX_ID_TO_NAME[await exId(name)] = name;
}

console.log("══ Merge PRIME — A/B/C → single PRIME BLOCK ══\n");

async function mergeWorkoutPrime(workoutId, label) {
  console.log(`── ${label} (${workoutId.slice(0, 8)}) ──`);

  const { data: primeSets } = await sb
    .from("workout_sets")
    .select("id, set_order, block_label, exercise_id, coaching_cue_override")
    .eq("workout_id", workoutId)
    .like("block_label", "PRIME BLOCK%")
    .order("set_order");

  console.log(`  encontrados ${primeSets.length} sets PRIME (con sub-labels)`);

  let updated = 0;
  for (const s of primeSets) {
    const exName = EX_ID_TO_NAME[s.exercise_id];
    if (!exName) {
      console.log(`  ⚠ exercise_id ${s.exercise_id.slice(0, 8)} no esperado en PRIME (set so=${s.set_order})`);
      continue;
    }
    const newCue = NEW_PRIME_CUES[exName];
    const updates = {};
    if (s.block_label !== "PRIME BLOCK") updates.block_label = "PRIME BLOCK";
    if (s.coaching_cue_override !== newCue) updates.coaching_cue_override = newCue;
    if (Object.keys(updates).length === 0) continue;
    const { error } = await sb.from("workout_sets").update(updates).eq("id", s.id);
    if (error) { console.error(`  ✗ ERROR so=${s.set_order}:`, error.message); process.exit(1); }
    updated++;
  }
  console.log(`  ✓ ${updated} sets actualizados (label + cue)`);
}

await mergeWorkoutPrime(TEMPLATE_ID, "Template");
await mergeWorkoutPrime(ANDONI_ID, "Andoni instance");

console.log("\n✓ PRIME ahora es 1 card con 3 sub-headers internos");
