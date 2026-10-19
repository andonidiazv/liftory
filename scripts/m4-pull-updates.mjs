/**
 * M4 · PULL DAY · dos cambios:
 *
 * 1. PRIME sub-C: Cat-Cow Reach → L-Sit Hang Hold · 20s
 *    (patrón grip + hollow: Dead Hang + L-Sit son el par perfecto).
 *
 * 2. HEAVY A: Meadows Row → Landmine Meadows Row · nueva curva
 *    - 4 series desde W1 hasta W5 · 2 series W6 deload
 *    - Reps mínimo 8 (nunca menos)
 *    - W4: ⚡ drop set doble última serie
 *    - W5: ⚡ rest-pause última serie
 *
 * Sigue la regla: la PRESCRIPCIÓN cambia para todos (incluidos sets ya
 * completados). El log real (actual_*) queda intacto.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Rename Meadows Row → Landmine Meadows Row ═══
const { data: meadowsExists } = await sb.from("exercises").select("id, name").eq("name", "Meadows Row").maybeSingle();
if (meadowsExists) {
  const { error } = await sb.from("exercises").update({
    name: "Landmine Meadows Row",
    name_es: "Landmine Meadows Row",
  }).eq("id", meadowsExists.id);
  if (error) { console.error("✗ rename:", error.message); process.exit(1); }
  console.log("✓ Meadows Row → Landmine Meadows Row");
}
const { data: lmrow } = await sb.from("exercises").select("id").eq("name", "Landmine Meadows Row").single();
const LMROW_ID = lmrow.id;

// ═══ 2. Get L-Sit Hang Hold ID + Cat-Cow Reach ID ═══
const { data: lsit } = await sb.from("exercises").select("id").eq("name", "L-Sit Hang Hold").single();
const LSIT_ID = lsit.id;
const { data: catcow } = await sb.from("exercises").select("id").eq("name", "Cat-Cow Reach").single();
const CATCOW_ID = catcow.id;

console.log(`  L-Sit Hang Hold: ${LSIT_ID.slice(0,8)}`);
console.log(`  Cat-Cow Reach:   ${CATCOW_ID.slice(0,8)}`);

// ═══ 3. Nueva curva HEAVY A ═══
const HEAVY_A = {
  1: { sets: 4, reps: 10, tempo: "3-1-1", rest: 120, rpe: 7,   tech: null },
  2: { sets: 4, reps: 10, tempo: "3-1-1", rest: 120, rpe: 7.5, tech: null },
  3: { sets: 4, reps: 10, tempo: "2-1-1", rest: 120, rpe: 8,   tech: null },
  4: { sets: 4, reps: 8,  tempo: "2-0-X", rest: 150, rpe: 8.5, tech: "Drop set doble última serie: falla → -25% → falla → -25% → falla" },
  5: { sets: 4, reps: 8,  tempo: "2-0-X", rest: 180, rpe: 9,   tech: "Rest-pause última serie: RIR 1, descanso 15s, seguí a failure, descanso 15s, seguí a failure" },
  6: { sets: 2, reps: 10, tempo: "3-1-1", rest: 120, rpe: 6,   tech: null },
};

function buildHeavyACue(week, cfg, isFirstRow) {
  if (!isFirstRow) return null;
  const restLabel = `${Math.floor(cfg.rest/60)}:${String(cfg.rest%60).padStart(2,"0")}`;
  const techLabel = cfg.tech ? ` · ⚡ ${cfg.tech}` : "";
  return `HEAVY A · Landmine Meadows Row · W${week}. ${cfg.reps} reps/lado · tempo ${cfg.tempo} · RPE ${cfg.rpe} · rest ${restLabel}${techLabel}. Landmine cargada. Un pie adelantado, cadera flexionada 45°. Codo cerca del torso, jalá con la ESCÁPULA primero. Descenso ${cfg.tempo[0]}s controlado — el stretch abajo es donde crece el lat.`;
}

// ═══ 4. Get all PULL DAY workouts ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, user_id, scheduled_date, week_number")
  .eq("day_label", "PULL DAY")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`\nPULL DAY workouts a procesar: ${workouts?.length}\n`);

let primeSwapped = 0, heavyUpdated = 0, heavyInserted = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ─── FIX 1: PRIME sub-C swap Cat-Cow → L-Sit Hang Hold ───
  const { data: catcowSets } = await sb.from("workout_sets")
    .select("id")
    .eq("workout_id", w.id)
    .eq("block_label", "PRIME BLOCK")
    .eq("exercise_id", CATCOW_ID);

  for (const s of catcowSets ?? []) {
    const { error } = await sb.from("workout_sets").update({
      exercise_id: LSIT_ID,
      planned_reps: null,
      planned_duration_seconds: 20,
      coaching_cue_override: "2 rondas · 20s hold. Colgado de la barra, elevá las piernas al frente hasta paralelas al piso (o tuck si no llegás — rodillas al pecho). Aguantá 20s. Hollow body + grip.",
    }).eq("id", s.id);
    if (error) { console.error(`  ✗ PRIME swap ${w.scheduled_date}: ${error.message}`); continue; }
    primeSwapped++;
  }

  // ─── FIX 2: HEAVY A rebuild según nueva curva ───
  const cfg = HEAVY_A[w.week_number];
  const targetSets = cfg.sets;

  // Get existing HEAVY A rows (siempre Landmine Meadows Row después del rename)
  const { data: existingRows } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "HEAVY BLOCK — A")
    .eq("exercise_id", LMROW_ID)
    .order("set_order", { ascending: true });

  const currentCount = existingRows?.length ?? 0;

  // 4a. Update existing rows con nueva prescripción
  for (let i = 0; i < currentCount; i++) {
    const row = existingRows[i];
    const isFirst = i === 0;
    const { error } = await sb.from("workout_sets").update({
      planned_reps: cfg.reps,
      planned_tempo: cfg.tempo,
      planned_rpe: cfg.rpe,
      planned_rest_seconds: cfg.rest,
      coaching_cue_override: buildHeavyACue(w.week_number, cfg, isFirst),
    }).eq("id", row.id);
    if (error) { console.error(`  ✗ HEAVY A update ${w.scheduled_date}: ${error.message}`); continue; }
    heavyUpdated++;
  }

  // 4b. Si target > current, agregar filas nuevas
  const needToAdd = targetSets - currentCount;
  if (needToAdd > 0) {
    // Ubicación: al final del HEAVY A (justo antes del siguiente bloque)
    const maxHeavyOrder = existingRows.length ? existingRows[existingRows.length - 1].set_order : null;
    if (maxHeavyOrder == null) {
      console.log(`  ⚠ ${w.scheduled_date} W${w.week_number} ${u}: no HEAVY A found (raro), skip insert`);
      continue;
    }

    // Two-pass: bump todos los sets con set_order > maxHeavyOrder por +10000
    const { data: laterSets } = await sb.from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .gt("set_order", maxHeavyOrder)
      .order("set_order", { ascending: true });

    for (const s of laterSets ?? []) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }

    // Insert filas nuevas HEAVY A
    const newRows = [];
    for (let i = 0; i < needToAdd; i++) {
      newRows.push({
        workout_id: w.id,
        user_id: w.user_id,
        exercise_id: LMROW_ID,
        set_order: maxHeavyOrder + 1 + i,
        set_type: "working",
        planned_reps: cfg.reps,
        planned_weight: null,
        planned_tempo: cfg.tempo,
        planned_rpe: cfg.rpe,
        planned_rir: null,
        planned_rest_seconds: cfg.rest,
        planned_duration_seconds: null,
        coaching_cue_override: null,  // solo el primer set (i=0 arriba) lleva el cue
        block_label: "HEAVY BLOCK — A",
      });
    }
    const { error: eIns } = await sb.from("workout_sets").insert(newRows);
    if (eIns) { console.error(`  ✗ HEAVY A insert ${w.scheduled_date}: ${eIns.message}`); continue; }
    heavyInserted += needToAdd;

    // Renumerar los bumped: bajar de +10000 al valor correcto secuencial
    const { data: bumpedSets } = await sb.from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .gt("set_order", 5000)  // los bumped tienen +10000
      .order("set_order", { ascending: true });

    let nextOrder = maxHeavyOrder + 1 + needToAdd;
    for (const s of bumpedSets ?? []) {
      await sb.from("workout_sets").update({ set_order: nextOrder }).eq("id", s.id);
      nextOrder++;
    }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: PRIME swap + HEAVY A ${currentCount}→${targetSets} sets`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  PRIME Cat-Cow → L-Sit: ${primeSwapped}`);
console.log(`  HEAVY A prescription updated: ${heavyUpdated}`);
console.log(`  HEAVY A rows inserted:        ${heavyInserted}`);
