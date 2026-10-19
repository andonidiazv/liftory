/**
 * M4 · VIE LOWER HINGE · dos fixes en un solo script:
 *
 * 1. EMOM cue mal parseable ("2R x 4V") → cambiar a "8R x 1V" para que la UI
 *    muestre 8 rondas de 1 min cada una (patrón alterna cycla los 4 items
 *    Swing/Plank L/Swing/Plank R hasta llenar las 8 ventanas).
 *
 * 2. Falta RECOVERY BLOCK — 3 ejercicios cooldown post hinge heavy:
 *      · Couch Stretch    (hip flexor stretch)
 *      · Pigeon Pose      (glute + hip capsule)
 *      · 90/90 Breathing  (spine reset + parasympathetic)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Crear/llenar exercises del RECOVERY ═══

const PIGEON_CARD = {
  name: "Pigeon Pose",
  name_es: "Postura de la Paloma",
  description: "Stretch pasivo profundo de glúteo, rotador externo de cadera y cápsula de cadera. La pierna adelantada queda flexionada bajo el torso (tibia perpendicular o angulada), la pierna trasera extendida detrás. Ideal como recovery post-hinge o squat pesado.",
  coaching_cue: "Desde cuadrupedia, lleva una rodilla al frente y colócala detrás de la muñeca del mismo lado — el pie queda cerca de la mano opuesta (tibia angulada). Extiende la pierna trasera completamente, empeine apoyado. Baja el torso hacia adelante sobre la pierna delantera hasta sentir stretch profundo en el glute + cadera lateral. Cadera cuadrada al frente, no rotada. Respira profundo 4-5 veces. Cambia de lado.",
  founder_notes: "El opener de cadera más honesto después de un día de hinge pesado. 45 segundos por lado deshacen lo que 4 series de Sumo DL bloquearon.",
  category: "mobility",
  movement_pattern: "hinge",
  difficulty: "beginner",
  equipment_required: ["none"],
  primary_muscles: ["glutes", "hip_rotators", "hip_flexors"],
  contraindications: [],
  is_active: true,
  is_draft: false,
};

const { data: pigeonExists } = await sb.from("exercises").select("id").eq("name", "Pigeon Pose").maybeSingle();
let PIGEON_ID;
if (pigeonExists) {
  PIGEON_ID = pigeonExists.id;
  console.log("⏭  Pigeon Pose ya existe");
} else {
  const { data: created, error } = await sb.from("exercises").insert(PIGEON_CARD).select("id").single();
  if (error) { console.error("✗ Pigeon Pose:", error.message); process.exit(1); }
  PIGEON_ID = created.id;
  console.log(`✓ Pigeon Pose creado (id ${PIGEON_ID.slice(0,8)})`);
}

// Fill 90/90 Breathing card
const { data: breathing } = await sb.from("exercises").select("id, description, coaching_cue, founder_notes").eq("name", "90/90 Breathing").maybeSingle();
if (breathing) {
  const patch = {};
  if (!breathing.description) patch.description = "Ejercicio de respiración diafragmática desde posición 90/90 supina — caderas y rodillas dobladas a 90°, pies apoyados en pared o silla. Combina reset de la columna lumbar con activación parasympática vía respiración profunda diafragmática. Recovery estándar post-CNS-heavy.";
  if (!breathing.coaching_cue) patch.coaching_cue = "Acostado boca arriba, caderas y rodillas a 90°, pantorrillas apoyadas en pared, silla o banco. Lumbar totalmente pegada al piso — sin hueco. Manos sobre el ombligo. Inhalás 4 segundos por la nariz, dejás que la panza se infle (no el pecho). Retenés 2 segundos. Exhalás 6 segundos por la boca, panza cae. 5 respiraciones completas.";
  if (!breathing.founder_notes) patch.founder_notes = "El reset del CNS después de heavy CNS work. Baja HR, activa el nervio vago, cierra el switch simpático. 60 segundos ganan más recovery que 10 min de estiramientos pasivos.";
  if (Object.keys(patch).length) {
    const { error } = await sb.from("exercises").update(patch).eq("id", breathing.id);
    if (error) { console.error("✗ 90/90 Breathing:", error.message); process.exit(1); }
    console.log(`✓ 90/90 Breathing card llenada (${Object.keys(patch).join(", ")})`);
  } else {
    console.log("⏭  90/90 Breathing ya completo");
  }
}
const BREATHING_ID = breathing.id;

const { data: couch } = await sb.from("exercises").select("id").eq("name", "Couch Stretch").single();
const COUCH_ID = couch.id;

// ═══ 2. Encontrar los 24 workouts VIE + arreglar EMOM cue + insertar RECOVERY ═══

const { data: workouts } = await sb.from("workouts")
  .select("id, user_id, scheduled_date, week_number")
  .eq("day_label", "LOWER HINGE")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`\nVIE workouts a procesar: ${workouts?.length}\n`);

const { data: swingEx } = await sb.from("exercises").select("id").eq("name", "American KB Swing").single();
const SWING_ID = swingEx.id;

const NEW_EMOM_CUE = "POWER + CORE · EMOM 60s | 8R x 1V. Alterna: American KB Swing, Side Plank L, American KB Swing, Side Plank R. Min impar = 15 American KB Swings (overhead). Min par = 40s Side Plank alternando L y R. 8 minutos totales, 8 rondas.";

let emomUpdated = 0, recoveryInserted = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // Fix EMOM cue — solo la primera fila del swing (que lleva el cue completo)
  const { data: swingSets } = await sb.from("workout_sets")
    .select("id, set_order, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("exercise_id", SWING_ID)
    .eq("block_label", "POWER + CORE BLOCK")
    .order("set_order", { ascending: true });

  if (swingSets?.length) {
    const first = swingSets[0];
    if (first.coaching_cue_override !== NEW_EMOM_CUE) {
      const { error } = await sb.from("workout_sets").update({ coaching_cue_override: NEW_EMOM_CUE }).eq("id", first.id);
      if (error) { console.error(`  ✗ EMOM cue ${w.scheduled_date}: ${error.message}`); continue; }
      emomUpdated++;
    }
  }

  // Insert RECOVERY BLOCK · 3 sets al final del workout
  // Get max set_order actual
  const { data: allSets } = await sb.from("workout_sets")
    .select("set_order")
    .eq("workout_id", w.id)
    .order("set_order", { ascending: false })
    .limit(1);
  const nextOrder = (allSets?.[0]?.set_order ?? 0) + 1;

  // Check si ya existe RECOVERY BLOCK — idempotencia
  const { data: existingRecovery } = await sb.from("workout_sets")
    .select("id")
    .eq("workout_id", w.id)
    .eq("block_label", "RECOVERY BLOCK");
  if (existingRecovery?.length) {
    console.log(`  ⏭ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: RECOVERY ya existe (${existingRecovery.length} sets), skip`);
    continue;
  }

  const recoveryRows = [
    {
      workout_id: w.id, user_id: w.user_id,
      exercise_id: COUCH_ID,
      set_order: nextOrder,
      set_type: "cooldown",
      planned_reps: null,
      planned_weight: null,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: null,
      planned_duration_seconds: 45,
      coaching_cue_override: "Couch Stretch · 45s/lado. Rodilla al piso, empeine apoyado en pared/banco, otra pierna al frente. Empujá la cadera adelante hasta stretch en flexor de cadera + quad. Respirá.",
      block_label: "RECOVERY BLOCK",
    },
    {
      workout_id: w.id, user_id: w.user_id,
      exercise_id: PIGEON_ID,
      set_order: nextOrder + 1,
      set_type: "cooldown",
      planned_reps: null,
      planned_weight: null,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: null,
      planned_duration_seconds: 45,
      coaching_cue_override: "Pigeon Pose · 45s/lado. Rodilla adelantada bajo el torso, pierna trasera extendida. Bajá el torso sobre la pierna delantera para stretch profundo de glute + cápsula de cadera.",
      block_label: "RECOVERY BLOCK",
    },
    {
      workout_id: w.id, user_id: w.user_id,
      exercise_id: BREATHING_ID,
      set_order: nextOrder + 2,
      set_type: "cooldown",
      planned_reps: null,
      planned_weight: null,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: null,
      planned_duration_seconds: 60,
      coaching_cue_override: "90/90 Breathing · 5 respiraciones. Acostado boca arriba, caderas y rodillas a 90° apoyadas en pared. Lumbar pegada al piso. Inhalá 4s por la nariz, retené 2s, exhalá 6s por la boca. Cierre parasimpático del día.",
      block_label: "RECOVERY BLOCK",
    },
  ];

  const { error: eIns } = await sb.from("workout_sets").insert(recoveryRows);
  if (eIns) { console.error(`  ✗ RECOVERY ${w.scheduled_date}: ${eIns.message}`); continue; }
  recoveryInserted += 3;
  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: EMOM cue fixed + 3 RECOVERY sets`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  EMOM cues fixed:              ${emomUpdated}`);
console.log(`  RECOVERY sets insertados:     ${recoveryInserted}`);
