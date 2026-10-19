/**
 * M3 · Agrega Jueves ACTIVE RECOVERY + Domingo DESCANSO
 *
 * Andoni 2026-06-24: El M3 nunca incluyó jueves ni domingos en la BD.
 * Diseño aprobado:
 *   - JUE: ACTIVE RECOVERY simple. Mobility flow (~10 min) + Zone 2 (25 min, W6 deload: 20 min).
 *     Flow ligeramente diferente cada semana. 6 ejercicios + 1 zone 2 = 7 sets.
 *   - DOM: DESCANSO total. is_rest_day=true, sin sets.
 *
 * Idempotente: si ya existe workout en esa fecha+user, se salta.
 * Aplica a: Andoni, César, Víctor, y template M3.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_MESO_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";

const ENTITIES = [
  { name: "Andoni", user_id: "8117e549-8314-471d-87c2-c7c68cccac17", program_id: "97d1b4a5-cf6b-4b59-b36c-d29dc5772120", mesocycle_id: null },
  { name: "César",  user_id: "f54d2d89-c304-419e-93d2-8a7fadfccc51", program_id: "ccb5c861-fb6b-485b-bf54-24b4bbad9d9e", mesocycle_id: null },
  { name: "Víctor", user_id: "3b1c600f-46ee-4332-a937-731c4445c144", program_id: "de318eb0-f1f8-4111-a143-905bbf3fcb34", mesocycle_id: null },
  { name: "Template", user_id: null, program_id: "32302803-ead8-4e08-809a-606031a7b7e0", mesocycle_id: M3_MESO_ID },
];

const WEEKS = [
  { w: 1, thu: "2026-06-11", sun: "2026-06-14" },
  { w: 2, thu: "2026-06-18", sun: "2026-06-21" },
  { w: 3, thu: "2026-06-25", sun: "2026-06-28" },
  { w: 4, thu: "2026-07-02", sun: "2026-07-05" },
  { w: 5, thu: "2026-07-09", sun: "2026-07-12" },
  { w: 6, thu: "2026-07-16", sun: "2026-07-19" },
];

const MOBILITY_FLOWS = {
  1: { dur: 35, cardio: 25, note: "Primer Active Recovery. Familiarízate con el flow. Zone 2 conversacional — debes poder hablar pero no cantar.", flow: [
    { name: "Cat-Cow Reach", reps: 8 },
    { name: "Bird Dog", reps: 6 },
    { name: "World's Greatest Stretch", reps: 5 },
    { name: "90/90 Hip Switches", reps: 8 },
    { name: "Downward Dog to Plank Flow", reps: 6 },
    { name: "Half-Kneeling Thoracic Rotation", reps: 6 },
  ]},
  2: { dur: 35, cardio: 25, note: "Descompresión de columna. Flow lento, sin rebotar. Zone 2 mismo ritmo que W1.", flow: [
    { name: "Cat-Cow Reach", reps: 8 },
    { name: "Thread the Needle", reps: 6 },
    { name: "Downward Dog to Cobra", reps: 6 },
    { name: "90/90 Hip Rotations to Pigeon", reps: 6 },
    { name: "Supine Spinal Twist", reps: 1 },
    { name: "Half-Kneeling Thoracic Rotation", reps: 6 },
  ]},
  3: { dur: 35, cardio: 25, note: "Flow más activo, animal style. Si te cansa la movilidad, vas demasiado rápido — desacelera.", flow: [
    { name: "Downward Dog to Cobra", reps: 6 },
    { name: "World's Greatest Stretch", reps: 5 },
    { name: "Hip CARs", reps: 5 },
    { name: "Downward Dog to Plank Flow", reps: 6 },
    { name: "Thread the Needle", reps: 6 },
    { name: "90/90 Hip Switches", reps: 8 },
  ]},
  4: { dur: 35, cardio: 25, note: "Foco en glúteo y cadera. Te toca después de un Density semanal — la cadera lo agradece.", flow: [
    { name: "Cat-Cow Reach", reps: 8 },
    { name: "Banded Glute Bridge", reps: 12 },
    { name: "90/90 Hip Rotations to Pigeon", reps: 6 },
    { name: "Couch Stretch", reps: 1 },
    { name: "Frog Stretch", reps: 1 },
    { name: "World's Greatest Stretch", reps: 5 },
  ]},
  5: { dur: 35, cardio: 25, note: "Mobility full body. La semana siguiente es deload — escucha al cuerpo hoy.", flow: [
    { name: "Cat-Cow Reach", reps: 8 },
    { name: "Thread the Needle", reps: 6 },
    { name: "Standing Figure 4 Stretch", reps: 1 },
    { name: "Hip CARs", reps: 5 },
    { name: "Down Dog Cobra Flow", reps: 6 },
    { name: "Half-Kneeling Thoracic Rotation", reps: 6 },
  ]},
  6: { dur: 30, cardio: 20, note: "Deload restorative. Cardio 20 min, no 25. Mañana cierras el ciclo — hoy solo recupera.", flow: [
    { name: "Supine Spinal Twist", reps: 1 },
    { name: "Child Pose", reps: 1 },
    { name: "Forward Fold", reps: 1 },
    { name: "Frog Stretch to Internal Rotation", reps: 1 },
    { name: "90/90 Hip Rotations to Pigeon", reps: 6 },
    { name: "Standing Figure 4 Stretch", reps: 1 },
  ]},
};

// Fetch all exercise IDs we need
const allExNames = new Set();
for (const w of Object.values(MOBILITY_FLOWS)) for (const e of w.flow) allExNames.add(e.name);
allExNames.add("Zone 2 Cardio");

const { data: exRows } = await sb.from("exercises").select("id, name").in("name", Array.from(allExNames));
const exMap = {};
for (const e of exRows ?? []) exMap[e.name] = e.id;

// Verify all needed exercises exist
const missing = Array.from(allExNames).filter(n => !exMap[n]);
if (missing.length) {
  console.error("Missing exercises:", missing);
  process.exit(1);
}

let createdThu = 0, createdSun = 0, skipped = 0, setsInserted = 0;

for (const entity of ENTITIES) {
  for (const { w, thu, sun } of WEEKS) {
    // ── Thursday: ACTIVE RECOVERY ──
    const thuFilter = entity.user_id
      ? sb.from("workouts").select("id").eq("user_id", entity.user_id).eq("scheduled_date", thu)
      : sb.from("workouts").select("id").is("user_id", null).eq("scheduled_date", thu).eq("program_id", entity.program_id);
    const { data: existingThu } = await thuFilter;
    if (existingThu?.length) {
      skipped++;
    } else {
      const config = MOBILITY_FLOWS[w];
      const { data: thuW, error: thuErr } = await sb.from("workouts").insert({
        user_id: entity.user_id,
        program_id: entity.program_id,
        mesocycle_id: entity.mesocycle_id,
        scheduled_date: thu,
        week_number: w,
        day_label: w === 6 ? `W${w} ACTIVE RECOVERY · DELOAD` : (entity.user_id ? "ACTIVE RECOVERY" : `W${w} ACTIVE RECOVERY`),
        workout_type: "mobility",
        estimated_duration: config.dur,
        is_rest_day: false,
        is_completed: false,
        coach_note: config.note,
      }).select("id").single();
      if (thuErr) { console.error(`  ✗ ${entity.name} JUE W${w}: ${thuErr.message}`); continue; }
      createdThu++;

      // Sets: mobility flow (warmup) + zone 2 (working)
      const sets = config.flow.map((e, i) => ({
        workout_id: thuW.id,
        user_id: entity.user_id,
        exercise_id: exMap[e.name],
        set_order: i + 1,
        set_type: "warmup",
        block_label: "MOBILITY FLOW",
        planned_reps: e.reps,
      }));
      sets.push({
        workout_id: thuW.id,
        user_id: entity.user_id,
        exercise_id: exMap["Zone 2 Cardio"],
        set_order: sets.length + 1,
        set_type: "working",
        block_label: "ZONE 2 CARDIO",
        planned_reps: null,
        coaching_cue_override: `${config.cardio} min conversacional. Modalidad libre: bike, row, incline walk. Debes poder hablar pero no cantar.`,
      });
      const { error: setsErr } = await sb.from("workout_sets").insert(sets);
      if (setsErr) console.error(`  ✗ Sets ${entity.name} JUE W${w}: ${setsErr.message}`);
      else setsInserted += sets.length;
      console.log(`  ✓ ${entity.name} JUE W${w} (${thu}) · ${sets.length} sets`);
    }

    // ── Sunday: DESCANSO ──
    const sunFilter = entity.user_id
      ? sb.from("workouts").select("id").eq("user_id", entity.user_id).eq("scheduled_date", sun)
      : sb.from("workouts").select("id").is("user_id", null).eq("scheduled_date", sun).eq("program_id", entity.program_id);
    const { data: existingSun } = await sunFilter;
    if (existingSun?.length) {
      skipped++;
    } else {
      const { error: sunErr } = await sb.from("workouts").insert({
        user_id: entity.user_id,
        program_id: entity.program_id,
        mesocycle_id: entity.mesocycle_id,
        scheduled_date: sun,
        week_number: w,
        day_label: entity.user_id ? "DESCANSO" : `W${w} DESCANSO`,
        workout_type: "rest",
        estimated_duration: null,
        is_rest_day: true,
        is_completed: false,
      });
      if (sunErr) console.error(`  ✗ ${entity.name} DOM W${w}: ${sunErr.message}`);
      else { createdSun++; console.log(`  ✓ ${entity.name} DOM W${w} (${sun}) · descanso`); }
    }
  }
}

console.log(`\n✓ Jueves Active Recovery creados: ${createdThu}`);
console.log(`✓ Domingos Descanso creados: ${createdSun}`);
console.log(`✓ Sets insertados: ${setsInserted}`);
console.log(`· Skipped (ya existían): ${skipped}`);
