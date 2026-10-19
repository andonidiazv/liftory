/**
 * M4 · PRIME BLOCK · reconstruir con el patrón real de M3.
 *
 * Antes: 12 sets (cada ejercicio duplicado por ronda) con cue prefijeado
 *   "PRIME · A. Movilidad. ..." en cada uno.
 * Ahora (patrón M3):
 *   - 6 sets (uno por ejercicio)
 *   - El primer ejercicio de cada sub-grupo lleva el HEADING en el cue:
 *       "Mobility hombro + T-spine | 2 rondas · <cue corto>"
 *   - Los siguientes ejercicios del mismo sub-grupo solo llevan:
 *       "2 rondas · <cue corto>"
 *   - `block_label` sigue plano: "PRIME BLOCK"
 *
 * Preserva sets completados: si un ejercicio tiene ambas filas con
 * is_completed=false, borra una y actualiza la restante. Si alguna está
 * completada, la deja como está y actualiza el cue.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ Sub-grupos por día + cues cortos por ejercicio ═══
// Cada entrada = [headingSubgrupo, [ejercicio, cueCorto], [ejercicio, cueCorto]]
const PRIME_BY_DAY = {
  "PULL DAY": [
    ["Mobility hombro + T-spine", [
      ["Thoracic Extension over Foam Roller", "roller bajo escápulas, deja caer el pecho, dedos entrelazados detrás de la cabeza"],
      ["Downward Dog to Cobra", "5 reps · flow hombros abren en cobra, cadena posterior estira en dog"],
    ]],
    ["Activación escapular + rear delt", [
      ["Band Pull-Apart", "12 reps · aprieta escápulas hacia atrás y abajo, pulgares al techo"],
      ["Prone Y-T-W", "5 reps por posición · rear delt + rotator cuff activation"],
    ]],
    ["Patrón grip + hollow", [
      ["Dead Hang", "25s · hombros activos, no colapsados · grip + decompresión pre-chin-up"],
      ["Cat-Cow Reach", "6 reps · T-spine bajo control antes del row heavy"],
    ]],
  ],
  "LOWER PUSH": [
    ["Mobility tobillo + T-spine", [
      ["Weighted Ankle Stretch", "30s/lado · rodilla sobre dedos, talón pegado · depth para Front Squat y catch del Clean"],
      ["Thoracic Extension over Foam Roller", "30s · roller bajo escápulas · front rack limpio para el complex"],
    ]],
    ["Prep cadera + active hamstring", [
      ["Cossack Squat Flow", "5/lado · peso en un pie, otro extendido lateral · apertura activa cadera + tobillo"],
      ["Supine Active Hamstring Stretch", "5/lado · 2s hold en peak · hamstring stretch + control neuromuscular"],
    ]],
    ["Activación + patrón squat", [
      ["KB Squat Clean with Pause", "5 reps · 2s pause en catch bottom · prep directa del BB Clean"],
      ["Alternating Spiderman Lunge", "4/lado (8 alternating) · codo mismo lado al piso · reach overhead brazo libre"],
    ]],
  ],
  "PUSH DAY": [
    ["Mobility hombro + T-spine", [
      ["Thoracic Extension over Foam Roller", "30s · arch limpio para Incline + posición receive de OHP/HSP"],
      ["Downward Dog to Cobra", "5 reps · shoulder + spine flow"],
    ]],
    ["Prep hombro + muñeca", [
      ["Band Dislocates", "8 reps · brazos rectos, agarre ancho · flexión + extensión completa"],
      ["Wrist Mobility", "5 c/u · flex/ext + rotaciones · muñeca lista para BB bench + HSP"],
    ]],
    ["Activación + patrón push", [
      ["Prone Y-T-W", "5 de cada · rear delt + rotator cuff prep (crítico pre-press)"],
      ["Scap Push-up", "8 reps · control escapular + patrón push"],
    ]],
  ],
};

// Resolver exercise ids
const { data: exs } = await sb.from("exercises").select("id, name");
const NAME_TO_ID = new Map((exs ?? []).map(e => [e.name, e.id]));

const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, scheduled_date, user_id, week_number")
  .in("day_label", Object.keys(PRIME_BY_DAY))
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`Workouts a procesar: ${workouts?.length}\n`);

let totalRemoved = 0, totalUpdated = 0, totalCompletedKept = 0;

for (const w of workouts ?? []) {
  const spec = PRIME_BY_DAY[w.day_label];
  if (!spec) continue;

  // Traigo TODOS los sets del PRIME de este workout, ordenados
  const { data: primeSets } = await sb.from("workout_sets")
    .select("id, exercise_id, coaching_cue_override, is_completed, set_order")
    .eq("workout_id", w.id)
    .eq("block_label", "PRIME BLOCK")
    .order("set_order", { ascending: true });

  // Agrupar por exercise_id
  const byEx = new Map();
  for (const s of primeSets ?? []) {
    if (!byEx.has(s.exercise_id)) byEx.set(s.exercise_id, []);
    byEx.get(s.exercise_id).push(s);
  }

  // Para cada ejercicio en el spec del día, aplicar el fix
  const cueBySetId = new Map();  // set_id → nuevo cue
  const idsToDelete = [];

  for (const [heading, exercises] of spec) {
    for (let idxInSubgroup = 0; idxInSubgroup < exercises.length; idxInSubgroup++) {
      const [exName, cueCorto] = exercises[idxInSubgroup];
      const exId = NAME_TO_ID.get(exName);
      if (!exId) { console.log(`  ⚠ ${w.scheduled_date} ${w.day_label}: ejercicio "${exName}" no encontrado`); continue; }
      const rows = byEx.get(exId) ?? [];
      if (rows.length === 0) continue;

      // Construir el cue nuevo
      const isFirstOfSubgroup = idxInSubgroup === 0;
      const nuevoCue = isFirstOfSubgroup
        ? `${heading} | 2 rondas · ${cueCorto}`
        : `2 rondas · ${cueCorto}`;

      // Si al menos una fila está completada, actualiza esa. Sino, la primera.
      const completedRows = rows.filter(r => r.is_completed);
      const keeperRow = completedRows[0] ?? rows[0];
      cueBySetId.set(keeperRow.id, nuevoCue);

      // Las demás filas del mismo ejercicio: si NO están completadas, borrar. Si sí, dejar.
      for (const r of rows) {
        if (r.id === keeperRow.id) continue;
        if (r.is_completed) {
          totalCompletedKept++;
          continue;  // preservamos log
        }
        idsToDelete.push(r.id);
      }
    }
  }

  // Borrar los duplicados no completados
  if (idsToDelete.length) {
    const { error } = await sb.from("workout_sets").delete().in("id", idsToDelete);
    if (error) { console.error(`  ✗ ${w.scheduled_date} ${w.day_label} delete: ${error.message}`); continue; }
    totalRemoved += idsToDelete.length;
  }

  // Actualizar los cues (uno por uno para no perder precisión)
  for (const [setId, nuevoCue] of cueBySetId) {
    const { error } = await sb.from("workout_sets").update({ coaching_cue_override: nuevoCue }).eq("id", setId);
    if (error) { console.error(`  ✗ ${w.scheduled_date} ${w.day_label} update cue: ${error.message}`); continue; }
    totalUpdated++;
  }

  // Renumberar set_order del workout entero (dos pasadas con offset para no chocar el unique)
  const { data: allSets } = await sb.from("workout_sets")
    .select("id, set_order")
    .eq("workout_id", w.id)
    .order("set_order", { ascending: true });
  if (allSets?.length) {
    for (const s of allSets) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 10000 }).eq("id", s.id);
    }
    for (let i = 0; i < allSets.length; i++) {
      await sb.from("workout_sets").update({ set_order: i + 1 }).eq("id", allSets[i].id);
    }
  }

  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";
  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} ${w.day_label.padEnd(11)} · -${idsToDelete.length} sets · cues updated`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Sets borrados (duplicados no completados): ${totalRemoved}`);
console.log(`  Sets con cue actualizado:                  ${totalUpdated}`);
console.log(`  Sets completados preservados:              ${totalCompletedKept}`);
