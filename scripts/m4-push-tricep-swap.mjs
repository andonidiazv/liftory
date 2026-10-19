/**
 * M4 · PUSH DAY · TRICEP BLOCK · 2 swaps + reps constantes:
 *  · Barbell Skullcrusher (EZ) → KB Crush Grip Skullcrusher · 15 reps
 *  · SA Cable Kickback → Bench Supported DB Incline Kickback · 15 reps
 *  · Rest 2:00 todas las semanas
 *  · Sin técnicas de intensidad (straight sets)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ Crear 2 exercises nuevos ═══
const NEW = [
  {
    name: "KB Crush Grip Skullcrusher",
    name_es: "Skullcrusher con KB en Crush Grip",
    description: "Skullcrusher acostado con una kettlebell agarrada por los cuernos con las dos manos apretándose (crush grip). El agarre 'aplastando' la KB aumenta la demanda al pecho y core anti-extension, mientras que la distribución del peso de la KB cambia el ángulo del tricep versus una barra o dumbbells.",
    coaching_cue: "Acostado en banco. Agarrás la KB por los cuernos con AMBAS manos, palmas apretándose entre sí (crush grip — como si aplastaras la KB con las manos). Levantás la KB con brazos rectos sobre la cabeza. Codos APUNTANDO AL TECHO — no se abren durante la rep. Sin mover el codo, flexionás los antebrazos y bajás la KB detrás de la cabeza en rango COMPLETO. Solo mueve el codo — hombro estable. Extendé arriba sin lockout final para mantener tensión. Crush grip mantenido todo el rep.",
    founder_notes: "El crush grip agrega demanda al pecho (isometric hold apretando la KB) y estabiliza el core. La KB baja detrás de la cabeza — más long head del tricep que un skullcrusher normal. 15 reps constantes con este drill = pump enfocado en tricep + demanda de estabilización de todo el upper body.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "intermediate",
    equipment_required: ["kettlebell", "bench"],
    primary_muscles: ["triceps", "chest", "core"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Bench Supported DB Incline Kickback",
    name_es: "Kickback con DB Apoyado en Banco Inclinado",
    description: "Tricep kickback unilateral con dumbbell, ejecutado desde posición boca abajo sobre banco inclinado (pecho apoyado en el banco, otra mano libre). El apoyo del pecho bloquea toda posibilidad de trampa con el hombro o el torso — aísla el tricep en rango controlado con cero cheat.",
    coaching_cue: "Banco inclinado 30-45°. Boca abajo con el pecho apoyado firme en el banco. Una mano libre agarrando el DB. El brazo trabajando: codo cerca del torso, a la altura del hombro, antebrazo colgando vertical (90°). Sin mover el codo NI el hombro, extendé el antebrazo hacia atrás hasta que el brazo quede COMPLETAMENTE recto en línea con el torso. Aprieta 1s el tricep en el peak. Regresá LENTO. Terminá el brazo antes de cambiar. Zero swing, zero cheat.",
    founder_notes: "El chest-supported kickback es 10× más honesto que la versión standing. Cero swing, cero cheat con torso. Peso menor pero contracción máxima. 15 reps con este approach son quemazón brutal del tricep. Signature isolation post-heavy pressing.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "beginner",
    equipment_required: ["dumbbell", "bench"],
    primary_muscles: ["triceps"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

for (const row of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) { console.log(`⏭  ${row.name} ya existe`); continue; }
  const { data: created, error } = await sb.from("exercises").insert(row).select("id").single();
  if (error) { console.error(`✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`✓ ${row.name} (${created.id.slice(0,8)})`);
}

// ═══ IDs ═══
const { data: allEx } = await sb.from("exercises").select("id, name");
const EX = new Map((allEx ?? []).map(e => [e.name, e.id]));
const OLD_SC = EX.get("Barbell Skullcrusher (EZ)");
const NEW_SC = EX.get("KB Crush Grip Skullcrusher");
const OLD_KB = EX.get("SA Cable Kickback");
const NEW_KB = EX.get("Bench Supported DB Incline Kickback");

// ═══ Update sets ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, week_number, scheduled_date, user_id")
  .eq("day_label", "PUSH DAY")
  .gte("scheduled_date", "2026-07-20").lte("scheduled_date", "2026-08-30");

console.log(`\nPUSH DAY workouts: ${workouts?.length}\n`);

let scSwaps = 0, kbSwaps = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ─── Swap Skullcrusher ───
  const { data: scRows } = await sb.from("workout_sets")
    .select("id, set_order").eq("workout_id", w.id).eq("exercise_id", OLD_SC).eq("block_label", "ARM BLOCK — A")
    .order("set_order", { ascending: true });
  for (const [i, r] of (scRows ?? []).entries()) {
    const isFirst = i === 0;
    const cue = isFirst
      ? `ARM A · SUPERSET (A). KB Crush Grip Skullcrusher · W${w.week_number}. 15 reps · rest FULL ROUND 2:00 (después de completar B). KB agarrada por los cuernos con AMBAS manos apretándose (crush grip). Codos apuntando al techo, NO se abren. Bajá detrás de la cabeza rango completo. Solo el codo se mueve.`
      : null;
    await sb.from("workout_sets").update({
      exercise_id: NEW_SC,
      planned_reps: 15,
      planned_tempo: "2-1-1",
      planned_rpe: null,
      planned_rest_seconds: 120,
      coaching_cue_override: cue,
    }).eq("id", r.id);
    scSwaps++;
  }

  // ─── Swap Kickback ───
  const { data: kbRows } = await sb.from("workout_sets")
    .select("id, set_order").eq("workout_id", w.id).eq("exercise_id", OLD_KB).eq("block_label", "ARM BLOCK — A")
    .order("set_order", { ascending: true });
  for (const [i, r] of (kbRows ?? []).entries()) {
    const isFirst = i === 0;
    const cue = isFirst
      ? `ARM A · SUPERSET (B). Bench Supported DB Incline Kickback · W${w.week_number}. 15 reps por brazo · después de A sin descanso · rest FULL ROUND 2:00. Banco 30-45°. Pecho apoyado en banco boca abajo. Codo a la altura del hombro, antebrazo vertical. Extendé sin mover codo ni hombro. Aprieta 1s peak. Zero cheat.`
      : null;
    await sb.from("workout_sets").update({
      exercise_id: NEW_KB,
      planned_reps: 15,
      planned_tempo: "2-1-1",
      planned_rpe: null,
      planned_rest_seconds: 120,
      coaching_cue_override: cue,
    }).eq("id", r.id);
    kbSwaps++;
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: ${(scRows?.length ?? 0) + (kbRows?.length ?? 0)} sets swapped`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Skullcrusher swaps: ${scSwaps}`);
console.log(`  Kickback swaps:     ${kbSwaps}`);
