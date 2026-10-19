/**
 * M4 · PULL v3 · 3 cambios a los 24 workouts PULL DAY:
 *
 * 1. HEAVY B: Weighted Pull-up → L-Sit Chin-up · 4 series desde W1 · rest 2:00
 * 2. FINISHER: Cable Face Pull → Z-Press Position Cable Face Pull
 *              Farmer Hold → SA Farmer Hold · 35s
 * 3. RECOVERY: agregar 3er stretch (Wall Bicep Stretch · 30s)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Resolve IDs
const { data: allEx } = await sb.from("exercises").select("id, name");
const EX = new Map((allEx ?? []).map(e => [e.name, e.id]));
function exId(n) {
  const id = EX.get(n);
  if (!id) { console.error(`✗ NOT FOUND: ${n}`); process.exit(1); }
  return id;
}
const WPU_ID  = exId("Weighted Pull-up");
const LSIT_ID = exId("L-Sit Chin-up");
const CFP_ID  = exId("Cable Face Pull");
const ZFP_ID  = exId("Z-Press Position Cable Face Pull");
const FH_ID   = exId("Farmer Hold");
const SAFH_ID = exId("SA Farmer Hold");
const WBS_ID  = exId("Wall Bicep Stretch");

// Nueva curva HEAVY B (L-Sit Chin-up)
const HEAVY_B = {
  1: { sets: 4, reps: 5, tempo: "2-1-1", rest: 120, rpe: 7,   tech: null },
  2: { sets: 4, reps: 5, tempo: "2-1-1", rest: 120, rpe: 7.5, tech: null },
  3: { sets: 4, reps: 6, tempo: "2-1-1", rest: 120, rpe: 8,   tech: null },
  4: { sets: 4, reps: 6, tempo: "2-1-X", rest: 120, rpe: 8.5, tech: null },
  5: { sets: 4, reps: 5, tempo: "3-1-X", rest: 120, rpe: 9,   tech: null },
  6: { sets: 2, reps: 5, tempo: "2-1-1", rest: 120, rpe: 6,   tech: null },
};

function buildHeavyBCue(week, cfg, isFirstRow) {
  if (!isFirstRow) return null;
  const restLabel = `${Math.floor(cfg.rest/60)}:${String(cfg.rest%60).padStart(2,"0")}`;
  const techLabel = cfg.tech ? ` · ⚡ ${cfg.tech}` : "";
  return `HEAVY B · L-Sit Chin-up · W${week}. ${cfg.reps} reps · tempo ${cfg.tempo} · RPE ${cfg.rpe} · rest ${restLabel}${techLabel}. Agarre supinado, anchura de hombros. Levantá las piernas rectas paralelas al piso ANTES de iniciar el pull — mantenelas ahí toda la rep. Jalá con la escápula primero, barbilla clara sobre la barra. Si las piernas caen = cortás la serie. Regresión: tuck L-Sit (rodillas al pecho).`;
}

const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, user_id, scheduled_date, week_number")
  .eq("day_label", "PULL DAY")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`PULL DAY workouts: ${workouts?.length}\n`);

let hbUpdated = 0, hbInserted = 0, finUpdated = 0, recInserted = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ═══ FIX 1: HEAVY BLOCK — B ═══
  const cfgB = HEAVY_B[w.week_number];
  const { data: existingB } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "HEAVY BLOCK — B")
    .order("set_order", { ascending: true });

  const currentB = existingB?.length ?? 0;

  // Update existing rows: swap exercise_id + prescripción
  for (let i = 0; i < currentB; i++) {
    const row = existingB[i];
    const isFirst = i === 0;
    const { error } = await sb.from("workout_sets").update({
      exercise_id: LSIT_ID,
      planned_reps: cfgB.reps,
      planned_tempo: cfgB.tempo,
      planned_rpe: cfgB.rpe,
      planned_rest_seconds: cfgB.rest,
      coaching_cue_override: buildHeavyBCue(w.week_number, cfgB, isFirst),
    }).eq("id", row.id);
    if (error) { console.error(`  ✗ HEAVY B update: ${error.message}`); continue; }
    hbUpdated++;
  }

  // Si target > current, insertar filas nuevas al final del HEAVY B
  const needToAddB = cfgB.sets - currentB;
  if (needToAddB > 0) {
    const maxOrder = existingB[existingB.length - 1].set_order;
    // Bump later sets con +10000
    const { data: laterSets } = await sb.from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .gt("set_order", maxOrder)
      .order("set_order", { ascending: true });
    for (const s of laterSets ?? []) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }
    // Insert new rows
    const newRows = [];
    for (let i = 0; i < needToAddB; i++) {
      newRows.push({
        workout_id: w.id, user_id: w.user_id,
        exercise_id: LSIT_ID,
        set_order: maxOrder + 1 + i,
        set_type: "working",
        planned_reps: cfgB.reps,
        planned_weight: null,
        planned_tempo: cfgB.tempo,
        planned_rpe: cfgB.rpe,
        planned_rir: null,
        planned_rest_seconds: cfgB.rest,
        planned_duration_seconds: null,
        coaching_cue_override: null,
        block_label: "HEAVY BLOCK — B",
      });
    }
    const { error: eIns } = await sb.from("workout_sets").insert(newRows);
    if (eIns) { console.error(`  ✗ HEAVY B insert: ${eIns.message}`); continue; }
    hbInserted += needToAddB;
    // Renumberar los bumped
    const { data: bumpedSets } = await sb.from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", w.id)
      .gt("set_order", 5000)
      .order("set_order", { ascending: true });
    let nextOrder = maxOrder + 1 + needToAddB;
    for (const s of bumpedSets ?? []) {
      await sb.from("workout_sets").update({ set_order: nextOrder }).eq("id", s.id);
      nextOrder++;
    }
  }

  // ═══ FIX 2: FINISHER BLOCK — swap Face Pull + Farmer Hold ═══
  const { data: finSets } = await sb.from("workout_sets")
    .select("id, exercise_id, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "FINISHER BLOCK")
    .order("set_order", { ascending: true });

  for (const s of finSets ?? []) {
    if (s.exercise_id === CFP_ID) {
      // Swap Cable Face Pull → Z-Press Position Cable Face Pull
      const isFirst = finSets.filter(x => x.exercise_id === CFP_ID)[0].id === s.id;
      const { error } = await sb.from("workout_sets").update({
        exercise_id: ZFP_ID,
        coaching_cue_override: isFirst
          ? "FINISHER · Z-Press Position Cable Face Pull · 2×15 · rest 45s. Sentado en el piso frente al cable, piernas COMPLETAMENTE extendidas al frente (posición Z-Press). Torso vertical. Jalá cuerda hacia la cara, codos altos, pulgares hacia atrás en el peak. La lumbar queda bloqueada — zero cheat, jalón puro con espalda alta."
          : null,
      }).eq("id", s.id);
      if (!error) finUpdated++;
    } else if (s.exercise_id === FH_ID) {
      // Swap Farmer Hold → SA Farmer Hold · 35s
      const isFirst = finSets.filter(x => x.exercise_id === FH_ID)[0].id === s.id;
      const { error } = await sb.from("workout_sets").update({
        exercise_id: SAFH_ID,
        planned_duration_seconds: 35,
        coaching_cue_override: isFirst
          ? "FINISHER · SA Farmer Hold · 2 × 35s por lado · rest 60s. KB o DB pesado en UNA mano, la otra libre. Torso ERECTO, hombros nivelados. NO inclines el torso al lado del peso — el core del lado opuesto trabaja anti-lateral flexion. Cambiá lado en la siguiente serie."
          : null,
      }).eq("id", s.id);
      if (!error) finUpdated++;
    }
  }

  // ═══ FIX 3: RECOVERY BLOCK — agregar Wall Bicep Stretch ═══
  // Check si ya existe (idempotencia)
  const { data: existingWBS } = await sb.from("workout_sets")
    .select("id")
    .eq("workout_id", w.id)
    .eq("block_label", "RECOVERY BLOCK")
    .eq("exercise_id", WBS_ID);

  if (!existingWBS?.length) {
    // Get max set_order del workout para insertar al final
    const { data: maxOrderRow } = await sb.from("workout_sets")
      .select("set_order")
      .eq("workout_id", w.id)
      .order("set_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxOrderRow?.set_order ?? 0) + 1;

    const { error } = await sb.from("workout_sets").insert({
      workout_id: w.id, user_id: w.user_id,
      exercise_id: WBS_ID,
      set_order: nextOrder,
      set_type: "cooldown",
      planned_reps: null,
      planned_weight: null,
      planned_tempo: null,
      planned_rpe: null,
      planned_rir: null,
      planned_rest_seconds: null,
      planned_duration_seconds: 30,
      coaching_cue_override: "Wall Bicep Stretch · 30s/lado. Palma en la pared a la altura del hombro, brazo COMPLETAMENTE extendido detrás. Rotá el torso lejos de la pared hasta stretch en bicep + pecho anterior.",
      block_label: "RECOVERY BLOCK",
    });
    if (!error) recInserted++;
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: HEAVY B ${currentB}→${cfgB.sets} · FINISHER swap · RECOVERY +1`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  HEAVY B updated:     ${hbUpdated}`);
console.log(`  HEAVY B inserted:    ${hbInserted}`);
console.log(`  FINISHER swapped:    ${finUpdated}`);
console.log(`  RECOVERY inserted:   ${recInserted}`);
