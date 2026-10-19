/**
 * M4 · JUE ACTIVE RECOVERY · construye workouts W1-W6 × 4 targets.
 *
 * RESET & BREATHE (SMR) · 7 sets
 *   Foam Roll: Quads, IT Band, Glutes, Calves, Upper Back
 *   Lacrosse Ball: Pec, Piriformis
 * SPINE & HIPS (Yin flow) · 4 posturas
 *   Child Pose, Pigeon Pose, Butterfly Pose, Supine Spinal Twist
 * OPCIONAL · Z2 · 20 min
 *   Zone 2 Cardio (walk / bike / row)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGETS = [
  { name: "Andoni",   user_id: "8117e549-8314-471d-87c2-c7c68cccac17", program_id: "97d1b4a5-cf6b-4b59-b36c-d29dc5772120" },
  { name: "César",    user_id: "f54d2d89-c304-419e-93d2-8a7fadfccc51", program_id: "ccb5c861-fb6b-485b-bf54-24b4bbad9d9e" },
  { name: "Víctor",   user_id: "3b1c600f-46ee-4332-a937-731c4445c144", program_id: "de318eb0-f1f8-4111-a143-905bbf3fcb34" },
  { name: "Template", user_id: null,                                    program_id: "32302803-ead8-4e08-809a-606031a7b7e0" },
];

const M4_JUE = ["2026-07-23","2026-07-30","2026-08-06","2026-08-13","2026-08-20","2026-08-27"];

const { data: exs } = await sb.from("exercises").select("id, name");
const EX = new Map((exs ?? []).map(e => [e.name, e.id]));
function exId(name) {
  const id = EX.get(name);
  if (!id) { console.error(`✗ EXERCISE NOT FOUND: "${name}"`); process.exit(1); }
  return id;
}

// ═══ RESET & BREATHE · SMR ═══
const SMR = [
  { name: "Foam Roll Quads",         duration: 60, cue: "SMR foam roll | 60s por pierna. Rollea de cadera a rodilla. Pausa 3 respiraciones en zonas tensas. Movimiento lento." },
  { name: "Foam Roll IT Band",       duration: 60, cue: "60s por lado. Acostado de lado sobre el roller, de cadera a rodilla. Duele — es normal, mantené 3-4 respiraciones en trigger points." },
  { name: "Foam Roll Glutes",        duration: 60, cue: "60s por glúteo. Sentado en el roller, pierna cruzada del lado que trabajás. Explorá rango." },
  { name: "Foam Roll Calves",        duration: 60, cue: "60s por pantorrilla. Pierna sobre el roller, cruzada la otra encima para más peso. De rodilla a tobillo." },
  { name: "Foam Roll Upper Back",    duration: 60, cue: "60s. Roller perpendicular a la columna, entre las escápulas. Manos detrás de la cabeza, extendé el pecho al techo. NO rueles sobre la lumbar." },
  { name: "Lacrosse Ball Pec",       duration: 45, cue: "Lacrosse ball | 45s por lado. Pelota contra la pared, sobre el pectoral (arriba de la axila). Presión sostenida, pausa en trigger points." },
  { name: "Lacrosse Ball Piriformis", duration: 45, cue: "45s por lado. Sentado en el piso con la pelota bajo el glúteo profundo (detrás de cabeza del fémur). Tobillo cruzado sobre rodilla opuesta. Compresión pasiva — no ruedes." },
];

// ═══ SPINE & HIPS · Yin flow ═══
const YIN = [
  { name: "Child Pose",           duration: 60, cue: "Yin | 60s. Rodillas separadas, glúteos a los talones, torso al frente, brazos extendidos. Respirá profundo, relajá el spine." },
  { name: "Pigeon Pose",          duration: 60, cue: "60s por lado. Rodilla adelantada bajo el torso, pierna trasera extendida atrás. Bajá el torso sobre la pierna delantera. Stretch profundo glute + hip." },
  { name: "Butterfly Pose",       duration: 90, cue: "90s. Sentado, plantas de los pies juntas, rodillas caen al piso por gravedad. NO fuerces las rodillas — dejá que el peso trabaje. Respirá." },
  { name: "Supine Spinal Twist",  duration: 60, cue: "60s por lado. Acostado boca arriba, cruza una rodilla al lado opuesto, brazos en cruz. Mirá al brazo opuesto. Twist pasivo del spine." },
];

// ═══ OPCIONAL · Z2 ═══
const Z2 = [
  { name: "Zone 2 Cardio", duration: 20 * 60, cue: "OPCIONAL · 20 min. Bici, caminata inclinada o remo suave. HR objetivo 120-140. Si podés hablar en frases completas, estás en Z2. Acelera la recuperación real bombeando sangre a los tejidos." },
];

function buildSets() {
  const rows = [];
  let order = 1;
  for (const s of SMR) {
    rows.push({
      exercise_id: exId(s.name),
      set_order: order++,
      set_type: "warmup",
      planned_reps: null,
      planned_duration_seconds: s.duration,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: s.cue,
      block_label: "RESET & BREATHE",
    });
  }
  for (const y of YIN) {
    rows.push({
      exercise_id: exId(y.name),
      set_order: order++,
      set_type: "warmup",
      planned_reps: null,
      planned_duration_seconds: y.duration,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: y.cue,
      block_label: "SPINE & HIPS",
    });
  }
  for (const z of Z2) {
    rows.push({
      exercise_id: exId(z.name),
      set_order: order++,
      set_type: "cooldown",
      planned_reps: null,
      planned_duration_seconds: z.duration,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: z.cue,
      block_label: "OPCIONAL · Z2",
    });
  }
  return rows;
}

const COACH_NOTE = "JUE Active Recovery — SMR (foam roll + lacrosse ball) + Yin flow ligero + Z2 opcional. El reset entre 3 días heavy (LUN-MIÉ) y los 2 pesados que vienen (VIE Sumo DL + SÁB Athletic). El Yin es súper leve — mantené las posturas por tiempo, respirá, sin forzar. La Z2 de 20 min es opcional pero es la que acelera la recuperación real bombeando sangre a los tejidos que rompiste.";

async function insertWorkoutAndSets(target, week) {
  const date = M4_JUE[week - 1];
  const existQ = sb.from("workouts").select("id").eq("scheduled_date", date).eq("program_id", target.program_id);
  if (target.user_id) existQ.eq("user_id", target.user_id); else existQ.is("user_id", null);
  const { data: existing } = await existQ.maybeSingle();
  if (existing) {
    console.log(`  ⏭ ${target.name.padEnd(9)} · ${date} · W${week} · already exists — skip`);
    return { skipped: true };
  }

  const workoutRow = {
    program_id: target.program_id,
    user_id: target.user_id,
    mesocycle_id: null,
    scheduled_date: date,
    week_number: week,
    day_label: "ACTIVE RECOVERY",
    workout_type: "mobility",
    estimated_duration: 45,
    is_rest_day: false,
    is_completed: false,
    coach_note: COACH_NOTE,
    short_on_time_note: "Sin tiempo: solo SMR (7 min) + Yin ligero (5 min). Skip la Z2.",
    notes: null,
    ai_adjustments: null,
  };
  const { data: created, error: eW } = await sb.from("workouts").insert(workoutRow).select("id").single();
  if (eW) { console.error(`  ✗ ${target.name} · ${date}: workout ${eW.message}`); return { error: eW }; }

  const setRows = buildSets().map(r => ({
    workout_id: created.id,
    user_id: target.user_id,
    exercise_id: r.exercise_id,
    set_order: r.set_order,
    set_type: r.set_type,
    planned_reps: r.planned_reps,
    planned_weight: null,
    planned_tempo: r.planned_tempo,
    planned_rpe: r.planned_rpe,
    planned_rir: null,
    planned_rest_seconds: r.planned_rest_seconds,
    planned_duration_seconds: r.planned_duration_seconds,
    coaching_cue_override: r.coaching_cue_override,
    block_label: r.block_label,
  }));

  const { error: eS } = await sb.from("workout_sets").insert(setRows);
  if (eS) { console.error(`  ✗ ${target.name} · ${date}: sets ${eS.message}`); return { error: eS }; }
  console.log(`  ✓ ${target.name.padEnd(9)} · ${date} · W${week} · ${setRows.length} sets`);
  return { created: true };
}

console.log("═══════════════════════════════════════════════════════");
console.log("M4 · JUE ACTIVE RECOVERY · build workouts");
console.log("═══════════════════════════════════════════════════════\n");

let created = 0, skipped = 0, errored = 0;
for (const target of TARGETS) {
  console.log(`\n── ${target.name} ──`);
  for (let week = 1; week <= 6; week++) {
    const res = await insertWorkoutAndSets(target, week);
    if (res.created) created++;
    else if (res.skipped) skipped++;
    else if (res.error) errored++;
  }
}

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`Summary: ${created} created · ${skipped} skipped · ${errored} errored`);
console.log(`═══════════════════════════════════════════════════════`);
