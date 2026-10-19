/**
 * M4 · VIE LOWER HINGE · construye workouts W1-W6 × 4 targets = 24 workouts.
 *
 * Estructura (Andoni's rutina, sin cambios):
 *   PRIME BLOCK (5 sets, block_label plano, M3-style)
 *     A. Movilidad cadera:  90/90 Hip Switches + Hip CARs
 *     B. Activación glute:  Banded Clamshell (bilateral en 1 set)
 *     C. Prep patrón hinge: Supine Active Hamstring Stretch + BW Sumo RDL
 *   HEAVY A · Sumo Deadlift · progresión 4×10 W1 → 4×4 W5
 *   POWER + CORE BLOCK · EMOM 8 min · American Swing 15 reps (odd) + Side Plank 40s alternando L/R (even)
 *   BUILD BLOCK · Superset · Nordic Curl 3×5 + Cable Pull-Through 3×12
 *   CORE BLOCK · Superset · KB Sit-up to Press 3×15 + 1/2 Kneeling Cable Chop 3×10/lado
 *
 * Idempotente por (target, scheduled_date).
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

// Fechas VIE M4 (viernes de cada semana). W1 VIE = 2026-07-24.
const M4_VIE = ["2026-07-24","2026-07-31","2026-08-07","2026-08-14","2026-08-21","2026-08-28"];

// Resolve exercise IDs
const { data: exs } = await sb.from("exercises").select("id, name");
const EX = new Map((exs ?? []).map(e => [e.name, e.id]));
function exId(name) {
  const id = EX.get(name);
  if (!id) { console.error(`✗ EXERCISE NOT FOUND: "${name}"`); process.exit(1); }
  return id;
}

// ═══ PRIME BLOCK · plano · 5 sets, formato M3 (1 fila por ejercicio) ═══
const PRIME_SETS = [
  { name: "90/90 Hip Switches",              reps: 5, rest: 30, cue: "Mobility cadera | 2 rondas · 5/lado. Transición controlada entre las dos posiciones." },
  { name: "Hip CARs",                        reps: 5, rest: 30, cue: "2 rondas · 5/lado. Rango completo activo de cadera en todas las direcciones." },
  { name: "Banded Clamshell",                reps: 8, rest: 30, cue: "Activación glute medio | 2 rondas · 8/lado. Cadera perpendicular al piso, aprieta glute medio en el peak." },
  { name: "Supine Active Hamstring Stretch", reps: 8, rest: 30, cue: "Prep patrón hinge | 2 rondas · 8/lado. Pierna extendida al techo con hip flexor activo, 2s hold en peak." },
  { name: "Bodyweight Sumo RDL",             reps: 8, rest: 30, cue: "2 rondas · 8. Postura sumo — cadera atrás, torso vertical. Grabá el pattern del Sumo DL." },
];

// ═══ HEAVY A · Sumo Deadlift · progresión W1-W6 ═══
// Andoni: "4 sets of 10 progressing weight throughout M4 until we get to 4 reps max on W5"
const SUMO_DL = {
  1: { sets: 4, reps: 10, tempo: "2-1-1", rest: 150, rpe: 7 },
  2: { sets: 4, reps: 10, tempo: "2-1-1", rest: 150, rpe: 7.5 },
  3: { sets: 4, reps: 8,  tempo: "2-1-1", rest: 180, rpe: 8 },
  4: { sets: 4, reps: 6,  tempo: "2-0-X", rest: 180, rpe: 8.5 },
  5: { sets: 4, reps: 4,  tempo: "2-0-X", rest: 210, rpe: 9 },
  6: { sets: 2, reps: 5,  tempo: "2-1-1", rest: 150, rpe: 6 },  // deload
};

// ═══ POWER + CORE EMOM · igual W1-W6 (Andoni no especificó progresión) ═══
// 2R x 4V (2 rondas × 4 ventanas = 8 min). Alterna: Swing, Plank L, Swing, Plank R.
const POWER_CORE = {
  windowSec: 60,
  totalRondas: 2,
  ventanasPerRonda: 4,
  swingReps: 15,
  plankSec: 40,
};

// ═══ BUILD · Superset · igual W1-W6 ═══
const BUILD = {
  nordicReps: 5,
  pullReps: 12,
  restRoundSec: 90,
};

// ═══ CORE · Superset · igual W1-W6 ═══
const CORE = {
  situpReps: 15,
  chopReps: 10,  // /lado
  restRoundSec: 75,
};

// ═══ Build sets for a given week ═══
function buildSets(week) {
  const rows = [];
  let order = 1;

  // PRIME (5 sets)
  for (const p of PRIME_SETS) {
    rows.push({
      exercise_id: exId(p.name),
      set_order: order++,
      set_type: "warmup",
      planned_reps: p.reps,
      planned_duration_seconds: null,
      planned_rest_seconds: p.rest,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: p.cue,
      block_label: "PRIME BLOCK",
    });
  }

  // HEAVY A · Sumo Deadlift · N filas
  const dl = SUMO_DL[week];
  for (let i = 0; i < dl.sets; i++) {
    rows.push({
      exercise_id: exId("Sumo Deadlift"),
      set_order: order++,
      set_type: "working",
      planned_reps: dl.reps,
      planned_duration_seconds: null,
      planned_rest_seconds: dl.rest,
      planned_tempo: dl.tempo,
      planned_rpe: dl.rpe,
      coaching_cue_override: i === 0
        ? `HEAVY A · Sumo Deadlift · W${week}. ${dl.reps} reps · tempo ${dl.tempo} · RPE ${dl.rpe} · rest ${Math.floor(dl.rest/60)}:${String(dl.rest%60).padStart(2,"0")}. Postura ancha, puntas 45° afuera. Barra sobre medio-pie. Agarre por dentro de las piernas. Torso vertical, pecho arriba. Empujá el piso con el pie plantado firme.`
        : null,
      block_label: "HEAVY BLOCK — A",
    });
  }

  // POWER + CORE BLOCK · EMOM · intercalado swing/plank
  // Sequence: Swing (min1), Plank L (min2), Swing (min3), Plank R (min4), Swing (min5), Plank L (min6), Swing (min7), Plank R (min8)
  const emomCue = `POWER + CORE · EMOM ${POWER_CORE.windowSec}s | ${POWER_CORE.totalRondas}R x ${POWER_CORE.ventanasPerRonda}V. Alterna: American KB Swing, Side Plank L, American KB Swing, Side Plank R. Odd min = ${POWER_CORE.swingReps} American KB Swings (overhead). Even min = ${POWER_CORE.plankSec}s Side Plank alternando L y R.`;
  const swingRows = [];
  const plankLRows = [];
  const plankRRows = [];
  // 4 swings, 2 plank L, 2 plank R (posiciones: min1,3,5,7 swing; min2,6 plank L; min4,8 plank R)
  for (let i = 0; i < 4; i++) {
    swingRows.push({
      exercise_id: exId("American KB Swing"),
      set_type: "emom",
      planned_reps: POWER_CORE.swingReps,
      planned_duration_seconds: null,
      planned_rest_seconds: POWER_CORE.windowSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: i === 0 ? emomCue : null,
      block_label: "POWER + CORE BLOCK",
    });
  }
  for (let i = 0; i < 2; i++) {
    plankLRows.push({
      exercise_id: exId("Side Plank"),
      set_type: "emom",
      planned_reps: null,
      planned_duration_seconds: POWER_CORE.plankSec,
      planned_rest_seconds: POWER_CORE.windowSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "POWER + CORE BLOCK",
    });
    plankRRows.push({
      exercise_id: exId("Side Plank"),
      set_type: "emom",
      planned_reps: null,
      planned_duration_seconds: POWER_CORE.plankSec,
      planned_rest_seconds: POWER_CORE.windowSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "POWER + CORE BLOCK",
    });
  }
  // Intercalar en el orden del EMOM: swing[0], plankL[0], swing[1], plankR[0], swing[2], plankL[1], swing[3], plankR[1]
  const emomOrder = [swingRows[0], plankLRows[0], swingRows[1], plankRRows[0], swingRows[2], plankLRows[1], swingRows[3], plankRRows[1]];
  for (const r of emomOrder) {
    rows.push({ ...r, set_order: order++ });
  }

  // BUILD BLOCK · Superset · Nordic + Cable Pull-Through × 3
  for (let i = 0; i < 3; i++) {
    rows.push({
      exercise_id: exId("Nordic Hamstring Curl"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD.nordicReps,
      planned_duration_seconds: null,
      planned_rest_seconds: null,  // no descanso entre A y B
      planned_tempo: "4-0-X",
      planned_rpe: null,
      coaching_cue_override: i === 0
        ? `BUILD · Superset · 3 rondas. A: Nordic Hamstring Curl ${BUILD.nordicReps} reps eccentric controlado. B: Cable Pull-Through ${BUILD.pullReps} reps. Rest FULL ROUND ${BUILD.restRoundSec}s tras completar B.`
        : null,
      block_label: "BUILD BLOCK",
    });
    rows.push({
      exercise_id: exId("Cable Pull-Through"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD.pullReps,
      planned_duration_seconds: null,
      planned_rest_seconds: BUILD.restRoundSec,
      planned_tempo: "2-1-1",
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "BUILD BLOCK",
    });
  }

  // CORE BLOCK · Superset · KB Sit-up to Press + 1/2 Kneeling Cable Chop × 3
  for (let i = 0; i < 3; i++) {
    rows.push({
      exercise_id: exId("KB Sit-up to Press"),
      set_order: order++,
      set_type: "superset",
      planned_reps: CORE.situpReps,
      planned_duration_seconds: null,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: i === 0
        ? `CORE · Superset · 3 rondas. A: KB Sit-up to Press ${CORE.situpReps} reps continuos. B: 1/2 Kneeling Cable Chop ${CORE.chopReps} reps/lado. Rest FULL ROUND ${CORE.restRoundSec}s tras completar B.`
        : null,
      block_label: "CORE BLOCK",
    });
    rows.push({
      exercise_id: exId("1/2 Kneeling Cable Chop"),
      set_order: order++,
      set_type: "superset",
      planned_reps: CORE.chopReps,
      planned_duration_seconds: null,
      planned_rest_seconds: CORE.restRoundSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "CORE BLOCK",
    });
  }

  return rows;
}

// ═══ Coach note (visible en la app) ═══
const COACH_NOTE = "LOWER HINGE de M4 — Sumo Deadlift es el signature del día. La progresión lleva de 4×10 en W1 hasta 4×4 en W5 · empujá peso semana a semana con técnica limpia. El American Swing overhead + Side Plank en EMOM es el trabajo de potencia + core anti-lateral. Nordic Curl con regresión honesta — 5 reps controladas ganan a 5 reps chapuceadas.";

// ═══ Insertion ═══
async function insertWorkoutAndSets(target, week) {
  const date = M4_VIE[week - 1];
  const existQ = sb.from("workouts").select("id").eq("scheduled_date", date).eq("program_id", target.program_id);
  if (target.user_id) existQ.eq("user_id", target.user_id); else existQ.is("user_id", null);
  const { data: existing } = await existQ.maybeSingle();
  if (existing) {
    console.log(`  ⏭ ${target.name.padEnd(9)} · ${date} · W${week} · already exists (${existing.id.slice(0,8)}) — skip`);
    return { skipped: true };
  }

  const workoutRow = {
    program_id: target.program_id,
    user_id: target.user_id,
    mesocycle_id: null,
    scheduled_date: date,
    week_number: week,
    day_label: "LOWER HINGE",
    workout_type: "strength",
    estimated_duration: 60,
    is_rest_day: false,
    is_completed: false,
    coach_note: COACH_NOTE,
    short_on_time_note: null,
    notes: null,
    ai_adjustments: null,
  };
  const { data: created, error: eW } = await sb.from("workouts").insert(workoutRow).select("id").single();
  if (eW) { console.error(`  ✗ ${target.name} · ${date}: workout ${eW.message}`); return { error: eW }; }

  const setRows = buildSets(week).map(r => ({
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
console.log("M4 · VIE LOWER HINGE · build workouts");
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
