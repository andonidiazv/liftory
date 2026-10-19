/**
 * M4 · SÁB · 4 fixes en un solo script (BD side):
 *
 * 1. Rename day_label: "SHOULDERS + ARMS + ATHLETIC" → "SHOULDERS + ARMS ATHLETIC"
 *    (splitDayLabel corta la última palabra → top "Shoulders + Arms", bottom "Athletic").
 *
 * 2. Crear "High-to-Low Cable Face Pull" con card completa (regla crítica).
 *
 * 3. Swap el exercise_id del BUILD BLOCK — B (Cable Face Pull → H2L variant).
 *
 * 4. Rewrite cues del Chipper Dead Hang y Weighted Plank al formato parseable
 *    "Penalty por break: X" — el badge UI (a agregar en código) va a leerlo.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ Fix 2 · Crear High-to-Low Cable Face Pull ═══
const H2L_CARD = {
  name: "High-to-Low Cable Face Pull",
  name_es: "Cable Face Pull de Alto a Bajo",
  description: "Variante del Face Pull donde el cable viene desde la polea alta y se jala en diagonal hacia el pecho/abdomen (en vez de a la altura de la cara). El ángulo descendente enfatiza el rear delt inferior + trapecio medio-bajo, complementando el Face Pull tradicional que ataca más el rear delt superior + trapecio medio-alto.",
  coaching_cue: "Cable en polea ALTA con cuerda o barra. Parate a ~1 paso de la máquina, torso ligeramente inclinado atrás. Agarrás la cuerda con las palmas mirándose hacia adentro. Jalás EN DIAGONAL hacia el pecho/parte superior del abdomen — codos altos, se abren hacia afuera al final del jalón. Pulgares rotan hacia atrás en el peak (external rotation). Sentí trapecio medio-bajo + rear delt inferior. Regreso controlado hasta stretch completo del rear delt.",
  founder_notes: "El complemento perfecto del Face Pull tradicional. El ángulo H2L pega al trap medio-bajo (crítico para postura + shoulder health) que el Face Pull horizontal no toca igual. Peso ligero-moderado, foco en calidad y peak contraction.",
  category: "accessory",
  movement_pattern: "pull",
  difficulty: "beginner",
  equipment_required: ["cable_machine"],
  primary_muscles: ["rear_deltoid", "mid_trapezius", "lower_trapezius", "rotator_cuff"],
  contraindications: [],
  is_active: true,
  is_draft: false,
};

const { data: h2lExists } = await sb.from("exercises").select("id").eq("name", H2L_CARD.name).maybeSingle();
let H2L_ID;
if (h2lExists) {
  H2L_ID = h2lExists.id;
  console.log(`⏭  ${H2L_CARD.name} ya existe`);
} else {
  const { data: created, error } = await sb.from("exercises").insert(H2L_CARD).select("id").single();
  if (error) { console.error("✗ H2L create:", error.message); process.exit(1); }
  H2L_ID = created.id;
  console.log(`✓ ${H2L_CARD.name} creado (${H2L_ID.slice(0,8)})`);
}

const { data: oldFacePull } = await sb.from("exercises").select("id").eq("name", "Cable Face Pull").single();
const OLD_FACE_ID = oldFacePull.id;

// ═══ Fix 1, 3, 4 · Update de los 24 workouts SÁB ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, user_id, scheduled_date, week_number")
  .eq("day_label", "SHOULDERS + ARMS + ATHLETIC")
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

console.log(`\nWorkouts SÁB a procesar: ${workouts?.length}\n`);

let nameUpdated = 0, swapped = 0, cuesFixed = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // Fix 1: rename day_label
  const { error: eName } = await sb.from("workouts").update({ day_label: "SHOULDERS + ARMS ATHLETIC" }).eq("id", w.id);
  if (eName) { console.error(`  ✗ rename ${w.scheduled_date}: ${eName.message}`); continue; }
  nameUpdated++;

  // Fix 3: swap Cable Face Pull → High-to-Low Cable Face Pull en BUILD BLOCK — B
  const { data: buildBSets } = await sb.from("workout_sets")
    .select("id, coaching_cue_override, is_completed")
    .eq("workout_id", w.id)
    .eq("exercise_id", OLD_FACE_ID)
    .eq("block_label", "BUILD BLOCK — B");

  for (const s of buildBSets ?? []) {
    if (s.is_completed) continue;  // preservar log
    // update exercise_id
    await sb.from("workout_sets").update({ exercise_id: H2L_ID }).eq("id", s.id);
    // update cue si tiene "Cable Face Pull HIGH-TO-LOW" a algo consistente
    if (s.coaching_cue_override) {
      const newCue = s.coaching_cue_override
        .replace(/Cable Face Pull HIGH-TO-LOW/g, "High-to-Low Cable Face Pull")
        .replace(/Cable Face Pull/g, "High-to-Low Cable Face Pull");
      if (newCue !== s.coaching_cue_override) {
        await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", s.id);
      }
    }
    swapped++;
  }

  // Fix 4: rewrite cues del Chipper para Dead Hang y Weighted Plank
  // Buscar los sets del ATHLETIC INTEGRATION block
  const { data: chipperSets } = await sb.from("workout_sets")
    .select("id, exercise_id, coaching_cue_override, is_completed, exercises:exercise_id(name)")
    .eq("workout_id", w.id)
    .eq("block_label", "ATHLETIC INTEGRATION");

  for (const s of chipperSets ?? []) {
    if (s.is_completed) continue;
    const name = s.exercises?.name;
    let newCue = null;
    if (name === "Dead Hang") {
      newCue = "4 min de Dead Hang. Si te sueltas de la barra = BREAK. Penalty por break: 70 Jump Rope Singles antes de reanudar el hang.";
    } else if (name === "Weighted Plank") {
      newCue = "2 min de Plate Weighted Plank. Si cae cadera o cortás = BREAK. Penalty por break: 15 G2OH con plate antes de reanudar el plank.";
    }
    if (newCue && s.coaching_cue_override !== newCue) {
      await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", s.id);
      cuesFixed++;
    }
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: renamed + ${buildBSets?.length ?? 0} face pull swapped + chipper cues updated`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  day_label renamed:        ${nameUpdated}`);
console.log(`  Cable Face Pull swapped:  ${swapped}`);
console.log(`  Chipper penalty cues:     ${cuesFixed}`);
