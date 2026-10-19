/**
 * M4 · SÁB SHOULDERS + ARMS + ATHLETIC · construye workouts W1-W6 × 4 targets.
 *
 * PRIME BLOCK (M3 style, 6 sets, block_label plano):
 *   A. Mobility hombro + serrato:  Wall Slide + Quadruped Scapular Push-up
 *   B. Activación rear delt:       Banded Face Pull + Banded Pull-Apart
 *   C. Prep push + stretch pec:    Over Under Fence Push-up + Scorpion Stretch
 * HEAVY A · DB Shoulder Press · progresión W1 4×10 → W5 4×6 con 1.5 reps
 * BUILD A · Superset · Rotational Lateral Raise + Spider Curl · 3 rondas
 * BUILD B · Superset · Cable Face Pull (high-to-low) + Tricep Rope Pushdown · 3 rondas
 * ATHLETIC INTEGRATION · For Time 20 min chipper (Devil Press / C2B Burpee /
 *   V-ups+Wide MC combo / Dead Hang / Weighted Plank)
 * RECOVERY · 3 stretches
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

const M4_SAB = ["2026-07-25","2026-08-01","2026-08-08","2026-08-15","2026-08-22","2026-08-29"];

// Resolve exercise IDs
const { data: exs } = await sb.from("exercises").select("id, name");
const EX = new Map((exs ?? []).map(e => [e.name, e.id]));
function exId(name) {
  const id = EX.get(name);
  if (!id) { console.error(`✗ EXERCISE NOT FOUND: "${name}"`); process.exit(1); }
  return id;
}

// ═══ PRIME BLOCK ═══
const PRIME = [
  { name: "Wall Slide",                    reps: 10, rest: 30, cue: "Mobility hombro + serrato | 2 rondas · 10 reps. Pegado a la pared. Foco en PROTRACCIÓN del serrato en el top (empujá los omóplatos hacia afuera al final del movimiento)." },
  { name: "Quadruped Scapular Push-up",    reps: 10, rest: 30, cue: "2 rondas · 10 reps. Cuadrupedia (no plank). Brazos rectos todo el rep. Bajás el pecho entre los hombros (retracción), empujás el piso (protracción). Solo escápulas se mueven." },
  { name: "Banded Face Pull",              reps: 10, rest: 30, cue: "Activación escapular + rear delt | 2 rondas · 10 reps. Banda a la altura de la cara. Jalá hacia los ojos, codos altos, pulgares hacia atrás en el peak." },
  { name: "Banded Pull-Apart",             reps: 10, rest: 30, cue: "2 rondas · 10 reps. Brazos rectos al frente, agarre anchura hombros. Abrí llevando la banda al pecho, aprieta escápulas hacia atrás y abajo." },
  { name: "Over Under Fence Push-up",      reps: 6,  rest: 30, cue: "Prep push + T-spine | 2 rondas · 6 reps. Push-up ancho alternando lados como si pasaras por debajo de una valla baja entre reps." },
  { name: "Scorpion Stretch",              reps: 4,  rest: 30, cue: "2 rondas · 4/lado. Boca abajo, brazos en cruz. Cruzá una pierna al lado opuesto por encima del torso. Stretch activo del pec + rotación T-spine." },
];

// ═══ HEAVY A · DB Shoulder Press · progresión ═══
const DB_PRESS = {
  1: { sets: 4, reps: 10, tempo: "2-1-1", rest: 120, rpe: 7,   tech: null },
  2: { sets: 4, reps: 10, tempo: "2-1-1", rest: 120, rpe: 7.5, tech: null },
  3: { sets: 4, reps: 8,  tempo: "2-1-1", rest: 120, rpe: 8,   tech: null },
  4: { sets: 4, reps: 6,  tempo: "2-0-X", rest: 150, rpe: 8.5, tech: "1.5 reps CADA set (1 rep completa + 1 media rep en la mitad inferior del ROM)" },
  5: { sets: 4, reps: 6,  tempo: "2-0-X", rest: 150, rpe: 9,   tech: "1.5 reps CADA set (1 rep completa + 1 media rep en la mitad inferior del ROM)" },
  6: { sets: 2, reps: 8,  tempo: "2-1-1", rest: 120, rpe: 6,   tech: null },
};

// ═══ BUILD BLOCK — A · Superset ═══
const BUILD_A = {
  latRaiseReps: 10,
  spiderReps: 10,
  restRoundSec: 90,
};

// ═══ BUILD BLOCK — B · Superset ═══
const BUILD_B = {
  facePullReps: 12,
  pushdownReps: 12,
  restRoundSec: 75,
};

// ═══ ATHLETIC INTEGRATION · Chipper ═══
const CHIPPER = {
  capMin: 20,
  devilPressReps: 10,
  c2bBurpeeReps: 8,
  vupsReps: 12,             // combo total (6 rondas × 2)
  wideMcReps: 12,           // combo total (6 rondas × 2)
  hangSec: 240,             // 4 min
  plankSec: 120,            // 2 min
  hangPenalty: 70,          // Jump Rope Singles
  plankPenalty: 15,         // G2OH con plate
};

// ═══ RECOVERY BLOCK ═══
const RECOVERY = [
  { name: "Doorway Pec Stretch",     duration: 30, cue: "Doorway Pec Stretch · 30s/lado. Brazo en marco de puerta, codo a 90°. Rotá el torso hacia el lado opuesto hasta stretch profundo del pec." },
  { name: "Overhead Tricep Stretch", duration: 30, cue: "Overhead Tricep Stretch · 30s/lado. Brazo overhead, otra mano empuja el codo hacia el centro. Estira tricep long head." },
  { name: "90/90 Breathing",         duration: 60, cue: "90/90 Breathing · 5 respiraciones (60s). Acostado boca arriba, caderas y rodillas 90° apoyadas en pared. Inhalá 4s por nariz, retené 2s, exhalá 6s por boca. Reset parasimpático del día." },
];

function buildSets(week) {
  const rows = [];
  let order = 1;

  // PRIME (6 sets)
  for (const p of PRIME) {
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

  // HEAVY A · DB Shoulder Press · N filas
  const dp = DB_PRESS[week];
  for (let i = 0; i < dp.sets; i++) {
    const isFirst = i === 0;
    const isTechWeek = !!dp.tech;
    const cueBase = `HEAVY A · DB Shoulder Press · W${week}. ${dp.reps} reps · tempo ${dp.tempo} · RPE ${dp.rpe} · rest ${Math.floor(dp.rest/60)}:${String(dp.rest%60).padStart(2,"0")}`;
    const cueTech = isTechWeek ? ` · ⚡ TÉCNICA ${dp.tech}` : "";
    const cueSetup = ". Sentado en banco vertical. DBs a los hombros con palmas al frente. Empujá overhead hasta que los DBs se junten (sin golpear). Bajá controlado a la altura de los hombros. Core apretado, sin arquear la lumbar.";
    rows.push({
      exercise_id: exId("Dumbbell Shoulder Press"),
      set_order: order++,
      set_type: "working",
      planned_reps: dp.reps,
      planned_duration_seconds: null,
      planned_rest_seconds: dp.rest,
      planned_tempo: dp.tempo,
      planned_rpe: dp.rpe,
      coaching_cue_override: isFirst ? cueBase + cueTech + cueSetup : null,
      block_label: "HEAVY BLOCK — A",
    });
  }

  // BUILD A · Superset · 3 rondas · Rotational Lateral Raise + Spider Curl
  for (let i = 0; i < 3; i++) {
    rows.push({
      exercise_id: exId("DB Rotational Lateral Raise"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD_A.latRaiseReps,
      planned_duration_seconds: null,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: i === 0
        ? `BUILD A · Superset · 3 rondas. A: DB Rotational Lateral Raise ${BUILD_A.latRaiseReps} reps (pulgar rota hacia abajo en el top para más rear delt). B: Spider Curl ${BUILD_A.spiderReps} reps (pecho apoyado, brazos verticales). Rest FULL ROUND ${BUILD_A.restRoundSec}s tras completar B.`
        : null,
      block_label: "BUILD BLOCK — A",
    });
    rows.push({
      exercise_id: exId("Spider Curl"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD_A.spiderReps,
      planned_duration_seconds: null,
      planned_rest_seconds: BUILD_A.restRoundSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "BUILD BLOCK — A",
    });
  }

  // BUILD B · Superset · 3 rondas · Cable Face Pull H2L + Tricep Rope Pushdown
  for (let i = 0; i < 3; i++) {
    rows.push({
      exercise_id: exId("Cable Face Pull"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD_B.facePullReps,
      planned_duration_seconds: null,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: i === 0
        ? `BUILD B · Superset · 3 rondas. A: Cable Face Pull HIGH-TO-LOW ${BUILD_B.facePullReps} reps (polea alta, jalá diagonal hacia el pecho/abdomen — más rear delt inferior + trap medio-bajo). B: Tricep Rope Pushdown ${BUILD_B.pushdownReps} reps. Rest FULL ROUND ${BUILD_B.restRoundSec}s tras completar B.`
        : null,
      block_label: "BUILD BLOCK — B",
    });
    rows.push({
      exercise_id: exId("Tricep Rope Pushdown"),
      set_order: order++,
      set_type: "superset",
      planned_reps: BUILD_B.pushdownReps,
      planned_duration_seconds: null,
      planned_rest_seconds: BUILD_B.restRoundSec,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: null,
      block_label: "BUILD BLOCK — B",
    });
  }

  // ATHLETIC INTEGRATION · Chipper For Time 20 min cap
  const chipperMainCue = `FOR TIME: cap ${CHIPPER.capMin} min. Chipper descendente — completá cada ejercicio en orden antes de pasar al siguiente. ${CHIPPER.devilPressReps} Devil Press → ${CHIPPER.c2bBurpeeReps} Chest to Bar Burpee → 6 combos de (2 V-ups + 2 Wide Mountain Climbers) = ${CHIPPER.vupsReps} V-ups + ${CHIPPER.wideMcReps} Wide MC totales → ${Math.floor(CHIPPER.hangSec/60)} min Dead Hang (penalty: ${CHIPPER.hangPenalty} Jump Rope Singles por cada break) → ${Math.floor(CHIPPER.plankSec/60)} min Plate Weighted Plank (penalty: ${CHIPPER.plankPenalty} G2OH con plate por cada break). Score = tiempo total. Si llegás al cap sin terminar, apuntá lo que completaste.`;

  rows.push({
    exercise_id: exId("Devil Press"),
    set_order: order++,
    set_type: "working",
    planned_reps: CHIPPER.devilPressReps,
    planned_duration_seconds: null,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: chipperMainCue,
    block_label: "ATHLETIC INTEGRATION",
  });
  rows.push({
    exercise_id: exId("Chest to Bar Burpee"),
    set_order: order++,
    set_type: "working",
    planned_reps: CHIPPER.c2bBurpeeReps,
    planned_duration_seconds: null,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: null,
    block_label: "ATHLETIC INTEGRATION",
  });
  rows.push({
    exercise_id: exId("V-ups"),
    set_order: order++,
    set_type: "working",
    planned_reps: CHIPPER.vupsReps,
    planned_duration_seconds: null,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: "En combo con Wide Mountain Climbers: 6 rondas de (2 V-ups + 2 Wide MC). Total: 12 V-ups.",
    block_label: "ATHLETIC INTEGRATION",
  });
  rows.push({
    exercise_id: exId("Wide Mountain Climbers"),
    set_order: order++,
    set_type: "working",
    planned_reps: CHIPPER.wideMcReps,
    planned_duration_seconds: null,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: "En combo con V-ups. Total: 12 Wide MC.",
    block_label: "ATHLETIC INTEGRATION",
  });
  rows.push({
    exercise_id: exId("Dead Hang"),
    set_order: order++,
    set_type: "working",
    planned_reps: null,
    planned_duration_seconds: CHIPPER.hangSec,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: `${Math.floor(CHIPPER.hangSec/60)} min de Dead Hang. Penalty por cada BREAK: ${CHIPPER.hangPenalty} Jump Rope Singles antes de poder reanudar el hang.`,
    block_label: "ATHLETIC INTEGRATION",
  });
  rows.push({
    exercise_id: exId("Weighted Plank"),
    set_order: order++,
    set_type: "working",
    planned_reps: null,
    planned_duration_seconds: CHIPPER.plankSec,
    planned_rest_seconds: null,
    planned_tempo: null,
    planned_rpe: null,
    coaching_cue_override: `${Math.floor(CHIPPER.plankSec/60)} min de Plate Weighted Plank. Penalty por cada BREAK: ${CHIPPER.plankPenalty} G2OH (Ground to Overhead) con plate antes de reanudar el plank.`,
    block_label: "ATHLETIC INTEGRATION",
  });

  // RECOVERY BLOCK
  for (const r of RECOVERY) {
    rows.push({
      exercise_id: exId(r.name),
      set_order: order++,
      set_type: "cooldown",
      planned_reps: null,
      planned_duration_seconds: r.duration,
      planned_rest_seconds: null,
      planned_tempo: null,
      planned_rpe: null,
      coaching_cue_override: r.cue,
      block_label: "RECOVERY BLOCK",
    });
  }

  return rows;
}

const COACH_NOTE = "SHOULDERS + ARMS + ATHLETIC de M4 — signature de shoulder isolation + brazo estético + chipper atlético. DB Shoulder Press progresa hasta W5 con técnica 1.5 reps (peak de estímulo). El chipper de 20 min es la 'sudada' del sábado: es intencionalmente brutal — Dead Hang 4 min y Plate Plank 2 min son tests de tenacidad, no fitness. Score honesto es mejor que score inventado.";

async function insertWorkoutAndSets(target, week) {
  const date = M4_SAB[week - 1];
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
    day_label: "SHOULDERS + ARMS + ATHLETIC",
    workout_type: "strength",
    estimated_duration: 75,
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
console.log("M4 · SÁB SHOULDERS + ARMS + ATHLETIC · build workouts");
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
