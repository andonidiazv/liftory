/**
 * M4 · LOWER PUSH · HEAVY A · swap BB → Double KB Clean + Front Squat Complex.
 *
 * 1. Crear "Double KB Clean + Front Squat Complex" en el catálogo con card
 *    completo (regla crítica).
 * 2. Cambiar el exercise_id de todos los sets EMOM del HEAVY BLOCK — A de
 *    LOWER PUSH en M4 al nuevo ID.
 * 3. Actualizar el coaching_cue_override de la primera fila de cada workout
 *    (la que lleva el cue completo) para reflejar el cambio.
 * 4. Preservar sets completados: si Andoni ya hizo el EMOM con la barra hoy,
 *    no toco esos sets.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Crear nuevo ejercicio con card completo ═══
const NEW_EX = {
  name: "Double KB Clean + Front Squat Complex",
  name_es: "Complex Double KB · Clean + Front Squat",
  description: "Complex de doble kettlebell: 1 Double KB Clean (catch en full front rack) + 3 Front Squats consecutivos sin soltar las kettlebells. Programado en formato EMOM. Reemplaza el complex con barra por la versión con dos KB — reduce el estrés lumbar del catch de la barra y agrega demanda estabilizadora core + antebrazo al front rack unilateral doble.",
  coaching_cue: "Dos KB en el piso a los costados de los pies (setup deadlift ancho). Setup: caderas atrás, columna neutra, KB agarradas con las palmas mirándose. Explosión desde cadera + rodillas + hombros para el Clean — pasás las KB pegadas al cuerpo. Catch EN FULL FRONT RACK: KB apoyadas en el pecho/hombro, codos altos, palmas mirándose. Sin levantarte del catch (o desde arriba), ejecutá 3 Front Squats consecutivos con reset de 1 segundo arriba entre reps. Torso vertical, KB estables en el rack. Bajá controlado hasta paralelo o más profundo. Después del rep 3, bajá las KB al piso controladas — no las tires. Ese es 1 complex por ronda.",
  founder_notes: "El signature de M4 LOWER PUSH. Reemplaza el BB Clean + FS por la versión doble KB — es más gentil con la lumbar (el catch de KB es mucho más forgiving que el de la barra) pero exige más estabilización unilateral del core y front rack sostenido bajo carga. Ideal para atleta que quiere el estímulo neurológico del complex olímpico sin exponer la columna a un catch pesado. Elegí carga que puedas sostener con técnica limpia todo el EMOM.",
  category: "strength",
  movement_pattern: "squat",
  difficulty: "advanced",
  equipment_required: ["kettlebell"],
  primary_muscles: ["quads", "glutes", "hamstrings", "shoulders", "core", "forearms"],
  contraindications: [],
  is_active: true,
  is_draft: false,
};

// Verificar si ya existe (idempotencia)
const { data: existing } = await sb.from("exercises").select("id").eq("name", NEW_EX.name).maybeSingle();
let NEW_ID;
if (existing) {
  NEW_ID = existing.id;
  console.log(`⏭  Ejercicio ya existe: ${NEW_EX.name} (id ${NEW_ID.slice(0,8)})`);
} else {
  const { data: created, error } = await sb.from("exercises").insert(NEW_EX).select("id").single();
  if (error) { console.error(`✗ Crear ejercicio: ${error.message}`); process.exit(1); }
  NEW_ID = created.id;
  console.log(`✓ Ejercicio creado: ${NEW_EX.name} (id ${NEW_ID.slice(0,8)})`);
}

// ═══ 2. Encontrar el BB Complex old ═══
const { data: old } = await sb.from("exercises").select("id").eq("name", "BB Clean + Front Squat Complex").single();
if (!old) { console.error("BB Clean + Front Squat Complex not found"); process.exit(1); }
const OLD_ID = old.id;

// ═══ 3. Swap en todos los workouts M4 · LOWER PUSH ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, scheduled_date, user_id, week_number")
  .eq("day_label", "LOWER PUSH")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`\nLOWER PUSH workouts a procesar: ${workouts?.length}\n`);

let swapped = 0, cuesUpdated = 0, preserved = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  const { data: sets } = await sb.from("workout_sets")
    .select("id, set_order, is_completed, coaching_cue_override, planned_rpe")
    .eq("workout_id", w.id)
    .eq("exercise_id", OLD_ID)
    .eq("block_label", "HEAVY BLOCK — A")
    .order("set_order", { ascending: true });

  if (!sets?.length) continue;

  const completedCount = sets.filter(s => s.is_completed).length;
  if (completedCount > 0) {
    console.log(`  ⏭ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${completedCount} sets completados con la barra → skip (preservar log)`);
    preserved += completedCount;
    continue;
  }

  // Cambiar exercise_id de todos los sets del EMOM (y el top single en W5)
  const ids = sets.map(s => s.id);
  const { error: eEx } = await sb.from("workout_sets").update({ exercise_id: NEW_ID }).in("id", ids);
  if (eEx) { console.error(`  ✗ ${w.scheduled_date} exercise_id: ${eEx.message}`); continue; }
  swapped += ids.length;

  // Actualizar el cue de la primera fila (la que lleva el cue completo)
  const first = sets[0];
  if (first.coaching_cue_override) {
    const newCue = first.coaching_cue_override
      .replace(/\bBB Clean\b/g, "Double KB Clean")
      .replace(/\bbarra\b/gi, "kettlebells")
      .replace(/\bBB Complex\b/g, "Double KB Complex");
    if (newCue !== first.coaching_cue_override) {
      await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", first.id);
      cuesUpdated++;
    }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${ids.length} sets swapped a Double KB Complex`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Sets swapped:            ${swapped}`);
console.log(`  Cues actualizados:       ${cuesUpdated}`);
console.log(`  Sets preservados (log):  ${preserved}`);
