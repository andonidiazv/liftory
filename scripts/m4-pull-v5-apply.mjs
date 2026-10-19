/**
 * M4 · PULL v5 · rest updates + 2 exercise swaps:
 *
 * 1. HEAVY A · rest 2:00 todas las semanas (W4/W5 estaban en 2:30/3:00)
 * 2. HEAVY B · rest 2:00 (ya estaba)
 * 3. Straight-Arm Pulldown · rest 1:30 todas
 * 4. Chest-Supported SA Cable Row · rest 1:30 todas
 * 5. DB Preacher Curl → Single-Arm DB Preacher Curl · rest 1:30
 * 6. Incline DB Curl → Incline DB Hammer Curl · rest 1:30 entre lados (unilateral)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ Crear ejercicios nuevos ═══
const NEW = [
  {
    name: "Single-Arm DB Preacher Curl",
    name_es: "Preacher Curl Unilateral con DB",
    description: "Preacher curl ejecutado con una sola mancuerna, un brazo a la vez, sobre banco preacher (o banco inclinado alto). El aislamiento unilateral corrige asimetrías bilaterales y elimina cualquier compensación del brazo dominante.",
    coaching_cue: "Sentado o parado en banco preacher. Codo del brazo trabajando apoyado firmemente en la almohadilla, brazo colgando vertical. Curl la DB hacia el hombro con contracción máxima del bicep, bajás controlado 3s hasta full stretch (brazo casi extendido, sin bloquear). El codo NUNCA se despega de la almohadilla. Terminá las reps de un lado antes de cambiar. Rest 1:30 entre lados.",
    founder_notes: "El preacher unilateral es más honesto que el bilateral — no podés cargar 'con los dos brazos' cuando uno flaquea. Peso menor, control obsesivo, corrige asimetría bilateral que M4 va acumulando con volumen alto de bicep.",
    category: "accessory",
    movement_pattern: "pull",
    difficulty: "beginner",
    equipment_required: ["dumbbell", "preacher_bench"],
    primary_muscles: ["biceps"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Incline DB Hammer Curl",
    name_es: "Hammer Curl Inclinado con DB",
    description: "Hammer curl (agarre neutro, palmas mirándose) ejecutado sentado en banco inclinado 45°. Combina el estímulo del bicep long head del incline (brazos colgando atrás del cuerpo) con la carga del braquial y forearm del agarre neutro. Ejercicio unilateral alternado con rest entre lados.",
    coaching_cue: "Banco 45°. Sentado con espalda pegada al banco, DBs con agarre NEUTRO (palmas mirándose entre sí, pulgares arriba). Codos APUNTAN AL PISO en el bottom, no adelantados. Trabajo UNILATERAL: hacé todas las reps de un brazo, descansá 1:30, después el otro brazo. Bajá 3s hasta full stretch. El brachialis + forearm + bicep long head deben sentirse.",
    founder_notes: "El hammer curl inclinado unilateral es el combo brutal para brazo grueso — long head del bicep + brachialis + forearm en un solo drill. La unilateralidad con rest entre lados permite meterle más peso y foco que el bilateral simultáneo.",
    category: "accessory",
    movement_pattern: "pull",
    difficulty: "beginner",
    equipment_required: ["dumbbell", "bench"],
    primary_muscles: ["biceps", "brachialis", "forearms"],
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

// ═══ Resolve IDs ═══
const { data: allEx } = await sb.from("exercises").select("id, name");
const EX = new Map((allEx ?? []).map(e => [e.name, e.id]));
const function_exId = n => { const id = EX.get(n); if (!id) { console.error("NOT FOUND: "+n); process.exit(1); } return id; };
const LMR_ID  = function_exId("Landmine Meadows Row");
const LSIT_ID = function_exId("L-Sit Chin-up");
const SAP_ID  = function_exId("Straight-Arm Pulldown");
const CSR_ID  = function_exId("Chest-Supported SA Cable Row");
const DBP_ID  = function_exId("DB Preacher Curl");
const SADP_ID = function_exId("Single-Arm DB Preacher Curl");
const IDC_ID  = function_exId("Incline DB Curl");
const IDHC_ID = function_exId("Incline DB Hammer Curl");

// ═══ Fetch workouts ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, user_id, scheduled_date, week_number")
  .eq("day_label", "PULL DAY")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30")
  .order("scheduled_date", { ascending: true });

console.log(`\nPULL DAY workouts: ${workouts?.length}\n`);

let heavyARest = 0, sapRest = 0, csrRest = 0, dbpSwap = 0, idcSwap = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ─── 1. HEAVY A rest → 120s (W4 y W5 lo tenían más alto) ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("block_label", "HEAVY BLOCK — A")
      .eq("exercise_id", LMR_ID)
      .order("set_order", { ascending: true });
    for (const [i, r] of (rows ?? []).entries()) {
      // Solo el primer set tiene cue; update cue en el primer set si menciona rest ≠ 2:00
      const newCue = i === 0 && r.coaching_cue_override
        ? r.coaching_cue_override.replace(/rest \d+:\d+/g, "rest 2:00")
        : (i === 0 ? r.coaching_cue_override : null);
      await sb.from("workout_sets").update({
        planned_rest_seconds: 120,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      heavyARest++;
    }
  }

  // ─── 3. Straight-Arm Pulldown rest → 90s ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("exercise_id", SAP_ID)
      .order("set_order", { ascending: true });
    for (const [i, r] of (rows ?? []).entries()) {
      const newCue = i === 0 && r.coaching_cue_override
        ? r.coaching_cue_override.replace(/rest \d+s/g, "rest 90s").replace(/rest \d+:\d+/g, "rest 1:30")
        : (i === 0 ? r.coaching_cue_override : null);
      await sb.from("workout_sets").update({
        planned_rest_seconds: 90,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      sapRest++;
    }
  }

  // ─── 4. Chest-Supported SA Cable Row rest → 90s ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override")
      .eq("workout_id", w.id)
      .eq("exercise_id", CSR_ID)
      .order("set_order", { ascending: true });
    for (const [i, r] of (rows ?? []).entries()) {
      const newCue = i === 0 && r.coaching_cue_override
        ? r.coaching_cue_override.replace(/rest \d+s/g, "rest 90s").replace(/rest \d+:\d+/g, "rest 1:30")
        : (i === 0 ? r.coaching_cue_override : null);
      await sb.from("workout_sets").update({
        planned_rest_seconds: 90,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      csrRest++;
    }
  }

  // ─── 5. DB Preacher Curl → Single-Arm DB Preacher Curl, rest 90s ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override, planned_reps")
      .eq("workout_id", w.id)
      .eq("exercise_id", DBP_ID)
      .order("set_order", { ascending: true });
    for (const [i, r] of (rows ?? []).entries()) {
      const reps = r.planned_reps;
      const newCue = i === 0
        ? `ARM · Single-Arm DB Preacher Curl · W${w.week_number}. ${reps} reps por lado · rest 1:30 entre lados. Sentado en banco preacher. Codo del brazo trabajando en la almohadilla, brazo colgando vertical. Curl a contracción, bajá 3s a full stretch. Codo NUNCA se despega. Terminá el lado antes de cambiar.`
        : null;
      await sb.from("workout_sets").update({
        exercise_id: SADP_ID,
        planned_rest_seconds: 90,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      dbpSwap++;
    }
  }

  // ─── 6. Incline DB Curl → Incline DB Hammer Curl, rest 90s entre lados ───
  {
    const { data: rows } = await sb.from("workout_sets")
      .select("id, coaching_cue_override, planned_reps")
      .eq("workout_id", w.id)
      .eq("exercise_id", IDC_ID)
      .order("set_order", { ascending: true });
    for (const [i, r] of (rows ?? []).entries()) {
      const reps = r.planned_reps;
      const newCue = i === 0
        ? `ARM · Incline DB Hammer Curl · W${w.week_number}. ${reps} reps por brazo · rest 1:30 entre lados. Banco 45°. Espalda pegada al banco. Agarre NEUTRO (palmas mirándose). Codos apuntan al piso en el bottom. Trabajo UNILATERAL — todas las reps de un lado, descansá 1:30, después el otro. Full stretch abajo.`
        : null;
      await sb.from("workout_sets").update({
        exercise_id: IDHC_ID,
        planned_rest_seconds: 90,
        coaching_cue_override: newCue,
      }).eq("id", r.id);
      idcSwap++;
    }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: rest updates + curl swaps`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  HEAVY A rest updated:   ${heavyARest}`);
console.log(`  Straight-Arm rest:      ${sapRest}`);
console.log(`  SA Cable Row rest:      ${csrRest}`);
console.log(`  DB Preacher swap:       ${dbpSwap}`);
console.log(`  Incline Curl → Hammer:  ${idcSwap}`);
