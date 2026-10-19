/**
 * M3 JUE Active Recovery · prepend SOFT TISSUE / SMR block
 *
 * Andoni 2026-06-25: añadir bloque de foam roll + lacrosse ball al inicio
 * del Active Recovery. 5 ejercicios, ~6-8 min. Convención wellness: soft
 * tissue → mobility → cardio.
 *
 * Variación semanal:
 *   W1 Base · W2 Posterior · W3 Anterior (hoy) · W4 Hip · W5 Full body · W6 Deload
 *
 * Idempotente: si ya existe un set con block_label "SOFT TISSUE / SMR" en el
 * workout, se salta. Si no, crea los 8 ejercicios nuevos (si no existen ya)
 * y prepende 5 sets al inicio renumerando set_order.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ENTITIES = [
  { name: "Andoni", user_id: "8117e549-8314-471d-87c2-c7c68cccac17" },
  { name: "César",  user_id: "f54d2d89-c304-419e-93d2-8a7fadfccc51" },
  { name: "Víctor", user_id: "3b1c600f-46ee-4332-a937-731c4445c144" },
  { name: "Template", user_id: null },
];

const WEEKS = [
  { w: 1, date: "2026-06-11" },
  { w: 2, date: "2026-06-18" },
  { w: 3, date: "2026-06-25" },
  { w: 4, date: "2026-07-02" },
  { w: 5, date: "2026-07-09" },
  { w: 6, date: "2026-07-16" },
];

// ── New exercises to create (if not present) ─────────────────────────
const NEW_EXERCISES = [
  {
    name: "Foam Roll Quads",
    name_es: "Foam Roll de Cuádriceps",
    description: "Liberación miofascial de cuádriceps con foam roller. Boca abajo apoyado en codos, roller bajo los cuádriceps, rueda lento desde cadera hasta encima de la rodilla.",
    movement_pattern: "squat",
    equipment_required: ["foam_roller"],
    primary_muscles: ["quadriceps"],
    coaching_cue: "Boca abajo, apoyado en codos. Foam roller bajo el cuádriceps. Rueda lento (5-10s por pasada) desde la cadera hasta justo encima de la rodilla. Si encuentras un punto doloroso, párate ahí 5-10 segundos respirando hasta que ceda. 30 segundos por pierna. NO ruedes sobre la rodilla.",
    founder_notes: "Brutal después de Density Push o cualquier día de squat. Disuelve tensión en 60 segundos.",
  },
  {
    name: "Foam Roll Glutes",
    name_es: "Foam Roll de Glúteos",
    description: "Liberación de glúteo medio y piriforme con foam roller. Sentado sobre el roller, una pierna cruzada sobre la otra para aislar el glúteo.",
    movement_pattern: "rotation",
    equipment_required: ["foam_roller"],
    primary_muscles: ["glute_max", "glute_med", "piriformis"],
    coaching_cue: "Sentado sobre el foam roller con manos apoyadas atrás. Cruza el tobillo derecho sobre la rodilla izquierda. Inclínate ligero hacia la derecha — el roller queda bajo el glúteo derecho. Rueda lento explorando glúteo medio y piriforme. 30 segundos por lado.",
    founder_notes: "Cura ciática moderada y desbloquea cadera. Esencial post-day de hinge.",
  },
  {
    name: "Foam Roll Calves",
    name_es: "Foam Roll de Gemelos",
    description: "Liberación de gemelos con foam roller. Sentado en el piso, roller bajo el gemelo, apoyado en manos para regular presión.",
    movement_pattern: "locomotion",
    equipment_required: ["foam_roller"],
    primary_muscles: ["gastrocnemius", "soleus"],
    coaching_cue: "Sentado en el piso con piernas extendidas, foam roller bajo el gemelo. Apóyate en las manos detrás y levanta la cadera del piso. Rueda lento desde el talón hasta justo debajo de la rodilla. Para más presión cruza la otra pierna encima. 30 segundos por lado.",
    founder_notes: "Indispensable si corres o haces cardio frecuente. Previene fascitis plantar.",
  },
  {
    name: "Foam Roll Lats",
    name_es: "Foam Roll de Dorsales",
    description: "Liberación de dorsales y zona axilar con foam roller. De lado, brazo extendido por encima de la cabeza, roller bajo la axila.",
    movement_pattern: "pull",
    equipment_required: ["foam_roller"],
    primary_muscles: ["latissimus_dorsi", "teres_major"],
    coaching_cue: "Acostado de lado, brazo extendido sobre la cabeza. Foam roller perpendicular bajo la axila, en la línea del dorsal. Rueda lento hacia abajo siguiendo el músculo hasta la zona media del costado. 30 segundos por lado. Respira profundo.",
    founder_notes: "Desbloquea la flexión de hombro. Crítico antes de cualquier overhead.",
  },
  {
    name: "Foam Roll IT Band",
    name_es: "Foam Roll de Banda Iliotibial",
    description: "Liberación de banda iliotibial (lado externo del muslo) con foam roller. De lado, apoyado en codo, roller bajo el muslo externo.",
    movement_pattern: "squat",
    equipment_required: ["foam_roller"],
    primary_muscles: ["it_band", "tensor_fasciae_latae"],
    coaching_cue: "Acostado de lado, apoyado en codo. Foam roller bajo el muslo externo (banda IT), pierna de arriba cruzada al piso para regular presión. Rueda lento desde justo debajo de la cadera hasta justo encima de la rodilla. Intenso — respira y presiona solo lo que toleres. 30 segundos por lado.",
    founder_notes: "Si tienes dolor en la rodilla externa al correr, esto es lo primero.",
  },
  {
    name: "Lacrosse Ball Plantar Fascia",
    name_es: "Lacrosse Ball en Planta del Pie",
    description: "Liberación de fascia plantar con pelota de lacrosse. Sentado o de pie, pisa la pelota y rueda lento por la planta del pie.",
    movement_pattern: "locomotion",
    equipment_required: ["lacrosse_ball"],
    primary_muscles: ["plantar_fascia"],
    coaching_cue: "Sentado o de pie apoyado en una pared, pisa la pelota de lacrosse con la planta del pie. Rueda lento desde el talón hasta los metatarsos explorando puntos sensibles. Presión la que toleres — más es mejor pero no debe doler agudo. 30 segundos por pie.",
    founder_notes: "Cambia todo el día — planta del pie suelta = cadera y zona lumbar sueltas.",
  },
  {
    name: "Lacrosse Ball Pec",
    name_es: "Lacrosse Ball en Pectoral",
    description: "Liberación de pectoral con pelota de lacrosse contra la pared. De pie frente a una pared, pelota entre pecho superior y pared.",
    movement_pattern: "push",
    equipment_required: ["lacrosse_ball"],
    primary_muscles: ["pec_minor", "pec_major"],
    coaching_cue: "De pie frente a una pared. Coloca la pelota entre el pectoral superior (justo debajo de la clavícula, cerca del hombro) y la pared. Presiona suave y mueve el brazo en círculos para que la pelota explore el pectoral. 30 segundos por lado. Abre el pecho después estirando.",
    founder_notes: "Anti-hombros caídos. Después de horas frente a la compu, esto los recoloca.",
  },
  {
    name: "Lacrosse Ball Upper Trap",
    name_es: "Lacrosse Ball en Trapecio Superior",
    description: "Liberación de trapecio superior con pelota de lacrosse contra la pared. De espaldas a la pared, pelota entre trapecio y pared.",
    movement_pattern: "pull",
    equipment_required: ["lacrosse_ball"],
    primary_muscles: ["upper_trapezius", "levator_scapulae"],
    coaching_cue: "De espaldas a una pared. Coloca la pelota entre el trapecio superior (entre el cuello y el hombro) y la pared. Presiona apoyando el peso del cuerpo. Mueve el brazo del mismo lado en círculos para profundizar. 30 segundos por lado. Si encuentras un punto doloroso, párate y respira hasta que ceda.",
    founder_notes: "El nudo crónico de la oficina. Esto lo deshace en 90 segundos por lado.",
  },
];

// ── Weekly SMR flows (5 exercises each) ──────────────────────────────
const SMR_FLOWS = {
  1: { note: "Base SMR. Conoce tu cuerpo — donde encuentres tensión, párate y respira.", flow: [
    { name: "Foam Roll Quads", reps: 1 },
    { name: "Thoracic Extension over Foam Roller", reps: 1 },
    { name: "Foam Roll Glutes", reps: 1 },
    { name: "Lacrosse Ball Plantar Fascia", reps: 1 },
    { name: "Lacrosse Ball Pec", reps: 1 },
  ]},
  2: { note: "Foco cadena posterior. Gemelos + glúteos + trapecio = anti-jornada-de-pie.", flow: [
    { name: "Foam Roll Calves", reps: 1 },
    { name: "Thoracic Extension over Foam Roller", reps: 1 },
    { name: "Foam Roll Glutes", reps: 1 },
    { name: "Lacrosse Ball Plantar Fascia", reps: 1 },
    { name: "Lacrosse Ball Upper Trap", reps: 1 },
  ]},
  3: { note: "Foco cadena anterior. Cuádriceps + IT band + pectoral = anti-day-de-squat.", flow: [
    { name: "Foam Roll Quads", reps: 1 },
    { name: "Foam Roll IT Band", reps: 1 },
    { name: "Lacrosse Ball Pec", reps: 1 },
    { name: "Foam Roll Lats", reps: 1 },
    { name: "Lacrosse Ball Plantar Fascia", reps: 1 },
  ]},
  4: { note: "Foco cadera. Liberación profunda — la cadera lo agradece después de Density Push.", flow: [
    { name: "Foam Roll Quads", reps: 1 },
    { name: "Foam Roll Glutes", reps: 1 },
    { name: "Elevated Piriformis Stretch", reps: 1 },
    { name: "Foam Roll IT Band", reps: 1 },
    { name: "Lacrosse Ball Pec", reps: 1 },
  ]},
  5: { note: "Full body sweep. Toca cada cadena para llegar limpio al deload.", flow: [
    { name: "Foam Roll Calves", reps: 1 },
    { name: "Foam Roll Lats", reps: 1 },
    { name: "Thoracic Extension over Foam Roller", reps: 1 },
    { name: "Lacrosse Ball Upper Trap", reps: 1 },
    { name: "Lacrosse Ball Plantar Fascia", reps: 1 },
  ]},
  6: { note: "Deload restorative. Suave, sin buscar puntos dolorosos — recuperar, no perseguir tensión.", flow: [
    { name: "Foam Roll Glutes", reps: 1 },
    { name: "Foam Roll Lats", reps: 1 },
    { name: "Thoracic Extension over Foam Roller", reps: 1 },
    { name: "Lacrosse Ball Pec", reps: 1 },
    { name: "Elevated Piriformis Stretch", reps: 1 },
  ]},
};

// ── Create missing exercises ────────────────────────────────────────
const exerciseMap = {};
console.log("Creating missing exercises…");
for (const ex of NEW_EXERCISES) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", ex.name).maybeSingle();
  if (existing?.id) {
    exerciseMap[ex.name] = existing.id;
    console.log(`  · ${ex.name} already exists`);
    continue;
  }
  const { data: created, error } = await sb.from("exercises").insert({
    name: ex.name,
    name_es: ex.name_es,
    description: ex.description,
    category: "mobility",
    movement_pattern: ex.movement_pattern,
    difficulty: "beginner",
    equipment_required: ex.equipment_required,
    primary_muscles: ex.primary_muscles,
    contraindications: [],
    coaching_cue: ex.coaching_cue,
    founder_notes: ex.founder_notes,
    is_active: true,
    is_draft: false,
  }).select("id").single();
  if (error) { console.error(`  ✗ ${ex.name}: ${error.message}`); continue; }
  exerciseMap[ex.name] = created.id;
  console.log(`  ✓ ${ex.name}`);
}

// Resolve existing exercise IDs
const allNames = new Set();
for (const w of Object.values(SMR_FLOWS)) for (const e of w.flow) allNames.add(e.name);
const { data: allExs } = await sb.from("exercises").select("id, name").in("name", Array.from(allNames));
for (const e of allExs ?? []) exerciseMap[e.name] = e.id;

const missing = Array.from(allNames).filter(n => !exerciseMap[n]);
if (missing.length) {
  console.error("Missing exercises after creation:", missing);
  process.exit(1);
}

// ── Insert SMR block at start of each Thursday ──────────────────────
let inserted = 0, skipped = 0, renumWorkouts = 0;

console.log("\nProcessing workouts…");
for (const entity of ENTITIES) {
  for (const { w, date } of WEEKS) {
    const filter = entity.user_id
      ? sb.from("workouts").select("id, day_label").eq("user_id", entity.user_id).eq("scheduled_date", date)
      : sb.from("workouts").select("id, day_label").is("user_id", null).eq("scheduled_date", date);
    const { data: workouts } = await filter;
    const wk = workouts?.find(w => /ACTIVE RECOVERY/i.test(w.day_label));
    if (!wk) { console.log(`  · ${entity.name} W${w}: no Active Recovery workout`); skipped++; continue; }

    // Check if SMR block already present (idempotency)
    const { data: existingSmr } = await sb
      .from("workout_sets")
      .select("id")
      .eq("workout_id", wk.id)
      .eq("block_label", "SOFT TISSUE / SMR")
      .limit(1);
    if (existingSmr?.length) {
      skipped++;
      continue;
    }

    const cfg = SMR_FLOWS[w];

    // Bump existing set_orders by 100 to make room
    const { data: existingSets } = await sb
      .from("workout_sets")
      .select("id, set_order")
      .eq("workout_id", wk.id)
      .order("set_order", { ascending: true });

    for (const s of existingSets ?? []) {
      await sb.from("workout_sets").update({ set_order: s.set_order + 100 }).eq("id", s.id);
    }

    // Insert SMR sets at positions 1..5
    const smrSets = cfg.flow.map((e, i) => ({
      workout_id: wk.id,
      user_id: entity.user_id,
      exercise_id: exerciseMap[e.name],
      set_order: i + 1,
      set_type: "warmup",
      block_label: "SOFT TISSUE / SMR",
      planned_reps: e.reps,
    }));
    const { error: insErr } = await sb.from("workout_sets").insert(smrSets);
    if (insErr) {
      console.error(`  ✗ ${entity.name} W${w} sets: ${insErr.message}`);
      // Roll back set_order bump
      for (const s of existingSets ?? []) {
        await sb.from("workout_sets").update({ set_order: s.set_order }).eq("id", s.id);
      }
      continue;
    }
    inserted += smrSets.length;

    // Renumber existing sets to follow continuously after SMR (positions 6..N)
    let nextOrder = 6;
    for (const s of existingSets ?? []) {
      await sb.from("workout_sets").update({ set_order: nextOrder }).eq("id", s.id);
      nextOrder++;
    }
    renumWorkouts++;

    // Update coach_note prefix with SMR note
    const { data: current } = await sb.from("workouts").select("coach_note, estimated_duration").eq("id", wk.id).single();
    const existingNote = current?.coach_note ?? "";
    const newNote = `SMR (~7 min): ${cfg.note}\n\n${existingNote}`.trim();
    const newDuration = (current?.estimated_duration ?? 35) + 8;
    await sb.from("workouts").update({ coach_note: newNote, estimated_duration: newDuration }).eq("id", wk.id);

    console.log(`  ✓ ${entity.name} W${w} (${date}) · +${smrSets.length} SMR sets`);
  }
}

console.log(`\n✓ Sets insertados: ${inserted}`);
console.log(`✓ Workouts actualizados: ${renumWorkouts}`);
console.log(`· Skipped: ${skipped}`);
