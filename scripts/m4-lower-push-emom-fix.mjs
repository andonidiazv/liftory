/**
 * M4 · LOWER PUSH · HEAVY A · BB Complex EMOM · fix a multi-row.
 *
 * Antes: 1 fila con set_type='emom' → el timer muestra "1 ronda" y no hay
 * inputs para registrar peso ni RPE por ronda.
 * Ahora (patrón real de M2 Renegade Row / M1 Power Clean): N filas, una por
 * ronda, cada una con set_type='emom' + planned_rpe según curva + planned_reps=1.
 * Cue completo solo en la primera fila; el resto en null.
 *
 * En W5 hay además un top single POST-EMOM (planned_reps=1, set_type='working',
 * RPE 10).
 *
 * Preserva logs completos: si alguna fila ya está completada, la deja tal cual.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Curva de RPE por semana + top single opcional.
// Cada entrada: rondas[] con RPE por ronda, y opcional topSingle
const WEEK_SPEC = {
  1: { rondas: [6.5, 6.5, 7, 7, 7.5, 7.5, 8], ventanaSec: 75, deload: false },
  2: { rondas: [7, 7, 7.5, 7.5, 8, 8, 8.5], ventanaSec: 75, deload: false },
  3: { rondas: [7.5, 7.5, 8, 8, 8.5, 8.5, 9], ventanaSec: 75, deload: false },
  4: { rondas: [8, 8, 8.5, 8.5, 8.5, 8.5, 9, 9], ventanaSec: 85, deload: false },
  5: { rondas: [8.5, 8.5, 9, 9, 9.5, 9.5, 9.5], ventanaSec: 85, deload: false, topSingle: { rpe: 10, restBefore: 180 } },
  6: { rondas: [5, 5.5, 5.5, 6, 6], ventanaSec: 75, deload: true },
};

// Cue del complex (va solo en la primera fila)
function primaryCue(week, cfg) {
  const total = cfg.rondas.length;
  const rpeCurve = [...new Set(cfg.rondas)].join(" → ");
  const dload = cfg.deload ? " · DELOAD, prioridad técnica" : "";
  return `EMOM ${total} min · ventana ${cfg.ventanaSec}s · 1 BB Clean (catch en FULL SQUAT) + 3 Front Squat por ronda. RPE curve: ${rpeCurve}. Reset 1s entre reps del FS. Si fallas ventana: NO chase peso, bajá 5%.${dload}`;
}

const BB_COMPLEX_NAME = "BB Clean + Front Squat Complex";
const { data: exs } = await sb.from("exercises").select("id, name").eq("name", BB_COMPLEX_NAME).maybeSingle();
if (!exs) { console.error(`Exercise not found: ${BB_COMPLEX_NAME}`); process.exit(1); }
const BB_COMPLEX_ID = exs.id;

const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, scheduled_date, user_id, week_number")
  .eq("day_label", "LOWER PUSH")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`LOWER PUSH workouts a procesar: ${workouts?.length}\n`);

for (const w of workouts ?? []) {
  const cfg = WEEK_SPEC[w.week_number];
  if (!cfg) { console.log(`  ⚠ W${w.week_number} sin config, skip`); continue; }

  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // Traigo TODOS los sets del BB Complex del HEAVY BLOCK — A actuales
  const { data: existing } = await sb.from("workout_sets")
    .select("id, set_order, is_completed, actual_reps, actual_weight, actual_rpe, set_type, planned_rpe")
    .eq("workout_id", w.id)
    .eq("exercise_id", BB_COMPLEX_ID)
    .eq("block_label", "HEAVY BLOCK — A")
    .order("set_order", { ascending: true });

  const completedCount = (existing ?? []).filter(s => s.is_completed).length;
  if (completedCount > 0) {
    console.log(`  ⏭ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${completedCount} sets completados → skip (preservar log)`);
    continue;
  }

  // Ubicar el set_order base (el más bajo del EMOM existente) para insertar en el mismo lugar
  const baseSetOrder = existing?.[0]?.set_order;
  if (baseSetOrder == null) {
    console.log(`  ⚠ ${w.scheduled_date} W${w.week_number} ${u}: sin sets del BB Complex existentes → skip`);
    continue;
  }

  // Borrar los sets actuales (no completados)
  const idsToDelete = (existing ?? []).map(s => s.id);
  if (idsToDelete.length) {
    const { error } = await sb.from("workout_sets").delete().in("id", idsToDelete);
    if (error) { console.error(`  ✗ delete: ${error.message}`); continue; }
  }

  // Construir las N filas + optional top single
  const N = cfg.rondas.length;
  const rows = cfg.rondas.map((rpe, i) => ({
    workout_id: w.id,
    user_id: w.user_id,
    exercise_id: BB_COMPLEX_ID,
    set_order: baseSetOrder + i,  // ocupa el rango base..base+N-1 (asumo que hay hueco de N o más)
    set_type: "emom",
    planned_reps: 1,
    planned_weight: null,
    planned_tempo: null,
    planned_rpe: rpe,
    planned_rir: null,
    planned_rest_seconds: cfg.ventanaSec,
    planned_duration_seconds: null,
    coaching_cue_override: i === 0 ? primaryCue(w.week_number, cfg) : null,
    block_label: "HEAVY BLOCK — A",
  }));
  if (cfg.topSingle) {
    rows.push({
      workout_id: w.id,
      user_id: w.user_id,
      exercise_id: BB_COMPLEX_ID,
      set_order: baseSetOrder + N,
      set_type: "working",
      planned_reps: 1,
      planned_weight: null,
      planned_tempo: null,
      planned_rpe: cfg.topSingle.rpe,
      planned_rir: null,
      planned_rest_seconds: cfg.topSingle.restBefore,
      planned_duration_seconds: null,
      coaching_cue_override: `TOP SINGLE post-EMOM. Después del EMOM: 3 min rest completo. 1 Clean único a RPE 10 (sin Front Squat, sin drop set). Peak del meso.`,
      block_label: "HEAVY BLOCK — A",
    });
  }

  // Insertar
  const { error: eIns } = await sb.from("workout_sets").insert(rows);
  if (eIns) {
    // Puede ser conflicto de set_order si el rango ya está ocupado. Renombrar con offset y reinsertar.
    console.error(`  ✗ insert: ${eIns.message} — voy a renumberar y reintentar`);
    // Traer TODOS los sets del workout, bumpar los que estén en el rango base..base+N-1 hacia arriba
    const { data: allSets } = await sb.from("workout_sets").select("id, set_order").eq("workout_id", w.id).order("set_order", { ascending: true });
    // Bump con offset alto para evitar conflicto
    for (const s of allSets ?? []) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }
    // Renumberar 1..N, dejando huecos para nuestros nuevos
    // Truco simple: renumberar todos secuencialmente, luego insertar los nuevos al final y re-ordenar
    for (let i = 0; i < (allSets ?? []).length; i++) {
      await sb.from("workout_sets").update({ set_order: i + 1 }).eq("id", allSets[i].id);
    }
    // Insertar los nuevos empezando después del máximo actual
    const maxOrder = (allSets ?? []).length;
    for (let i = 0; i < rows.length; i++) rows[i].set_order = maxOrder + i + 1;
    const { error: e2 } = await sb.from("workout_sets").insert(rows);
    if (e2) { console.error(`  ✗ retry insert: ${e2.message}`); continue; }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${rows.length} filas (${cfg.rondas.length} EMOM${cfg.topSingle ? " + 1 top single" : ""}) · RPE ${cfg.rondas.join("/")}`);
}

console.log("\n✓ Done.");
