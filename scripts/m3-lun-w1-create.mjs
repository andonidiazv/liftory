/**
 * M3 LUN W1 Density Day — creación end-to-end.
 *
 * Crea:
 *  1. 11 ejercicios nuevos en el catálogo
 *  2. Mesociclo M3 BUILD HIM ELITE (status=draft, 2026-06-08 → 2026-07-19)
 *  3. Template workout LUN W1 Density Day (user_id=null) — admin view
 *  4. 47 template sets
 *  5. Instancia para Andoni (user_id=ANDONI) — athlete view, scheduled 2026-06-08
 *  6. 47 sets para Andoni
 *
 * Idempotente: si algo ya existe, hace skip y loggea.
 * NO propaga a otros usuarios (M3 queda draft).
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0"; // BUILD HIM ELITE template
const ANDONI_PROGRAM_ID = "97d1b4a5-cf6b-4b59-b36c-d29dc5772120"; // Andoni personal program

// ════════════════════════════════════════════════════════════════════════════
// 1. EJERCICIOS NUEVOS
// ════════════════════════════════════════════════════════════════════════════

const NEW_EXERCISES = [
  {
    name: "Wall Slide", name_es: "Deslizamiento en Pared",
    category: "mobility", movement_pattern: "push", difficulty: "beginner", default_tempo: "2.1.2.0",
    primary_muscles: ["lower_trapezius", "serratus_anterior", "rear_deltoid"],
    equipment_required: ["wall"],
    description: "Activación de retractores escapulares contra la pared. Atleta de pie pegado a la pared (talones, glúteos, espalda alta y cabeza tocan), brazos en \"W\" pegados a la pared, sube a \"Y\" sin perder contacto.",
    coaching_cue: "Pegado a la pared como si fueras tabla. Codos y muñecas tocan la pared todo el tiempo. Sube los brazos despacio en \"W → Y\" sin arquear lumbar. Si pierdes contacto, baja el rango. Mejor pequeño y limpio que grande y compensado.",
    founder_notes: "El warm-up #1 para días de press. Despierta serrato y trapecio bajo — sin esto el press se va al deltoides anterior y el hombro paga.",
  },
  {
    name: "Band Dislocates", name_es: "Dislocados con Liga",
    category: "mobility", movement_pattern: "push", difficulty: "beginner", default_tempo: "2.0.2.0",
    primary_muscles: ["rotator_cuff", "rear_deltoid", "thoracic_spine"],
    equipment_required: ["resistance_band"],
    description: "Pasada de liga de adelante hacia atrás por encima de la cabeza sin doblar codos. Mobilidad de cintura escapular en máximo rango.",
    coaching_cue: "Agarra la liga ancho (más ancho = más fácil). Brazos rectos todo el tiempo. Lleva la liga arriba y hacia atrás como si dibujaras un arco grande. Si los codos se doblan, abre el agarre. No fuerces — el rango llega solo.",
    founder_notes: "El test honesto de movilidad de hombro. Si no puedes hacerlo con agarre estándar, ahí está tu trabajo. 15-20 reps diarias mueven la aguja en semanas.",
  },
  {
    name: "Banded Pull-Apart", name_es: "Aperturas con Liga",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.1.1",
    primary_muscles: ["rear_deltoid", "rhomboids", "mid_trapezius"],
    equipment_required: ["resistance_band"],
    description: "Apertura horizontal con liga a la altura del pecho. Activa rear delt + romboides + trapecio medio.",
    coaching_cue: "Liga al frente, brazos rectos a la altura de los hombros. Abre llevando los brazos hacia atrás y los lados al mismo tiempo. Aprieta las escápulas en el punto final. Liga toca el pecho. Vuelve lento.",
    founder_notes: "El primo barato del face pull. Activa rear delt sin equipo. Ideal en prime block como complemento del dislocate.",
  },
  {
    name: "KB Around the World", name_es: "KB Alrededor del Mundo",
    category: "mobility", movement_pattern: "core", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["core", "shoulders", "obliques"],
    equipment_required: ["kettlebell"],
    description: "KB rotando alrededor del cuerpo a la altura de la cadera, agarrando con cambio de manos en cada cuarto de vuelta. Warm-up de KB clásico que activa core, hombros y patrón de agarre.",
    coaching_cue: "KB a la altura del ombligo, brazos rectos. Camina la KB alrededor del cuerpo cambiando manos por delante y por detrás. Cadera estable, no rotes. 5 vueltas a cada dirección.",
    founder_notes: "Despierta el agarre + activa core sin esfuerzo. Si vas a hacer KB todo el día, esto es el saludo al sol versión KB.",
  },
  {
    name: "KB Halo", name_es: "Halo con KB",
    category: "mobility", movement_pattern: "core", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["shoulders", "upper_back", "core"],
    equipment_required: ["kettlebell"],
    description: "KB agarrada de los cuernos (campana hacia arriba) circulando alrededor de la cabeza. Movilidad de hombro + activación de upper back. Distinto al \"Curl to Halo\" — aquí solo es el círculo.",
    coaching_cue: "Agarra la KB de los cuernos, campana invertida. Pasa la KB alrededor de la cabeza pegado lo más posible al cráneo. Codos altos. No empujes la cabeza hacia adelante. Alterna direcciones cada 5 reps.",
    founder_notes: "El warm-up de hombro más subestimado. Si lo haces lento y pegado a la cabeza, despierta todo el complejo escapular sin estresar nada.",
  },
  {
    name: "KB Alternating Z Press", name_es: "Z Press Alternante con KB",
    category: "strength", movement_pattern: "push", difficulty: "advanced", default_tempo: "2.0.1.0",
    primary_muscles: ["shoulders", "triceps", "core", "upper_back"],
    equipment_required: ["kettlebell"],
    description: "Sentado en el piso con piernas extendidas adelante (posición Z), presiona una KB en rack alternando lado por lado. Sin piernas para asistir, todo el press viene del hombro + core anti-rotación.",
    coaching_cue: "Siéntate piernas rectas adelante, espalda erguida (sin doblar lumbar). Una KB en rack a la altura del hombro, la otra en piso/lado. Presiona overhead controlada, baja lenta. Cambia lado por rep. Si la lumbar se redondea, ese es el límite del día.",
    founder_notes: "El press más honesto. Sin piernas, sin trampa. Mejora hombro estable + core funcional simultáneamente. En EMOM con Commando Pull-up es la receta de density M3 LUN.",
  },
  {
    name: "Commando Pull-up", name_es: "Dominada Commando",
    category: "strength", movement_pattern: "pull", difficulty: "advanced", default_tempo: "2.0.1.0",
    primary_muscles: ["lats", "biceps", "core", "obliques"],
    equipment_required: ["pull_up_bar"],
    description: "Pull-up con agarre paralelo a la barra (manos enfrentadas, una delante de la otra). Atleta sube alternando el lado de la cabeza por rep. Trabaja lat unilateral + oblicuos.",
    coaching_cue: "Una mano delante de la otra agarrando la barra. Sube llevando una oreja a un lado de la barra, baja, sube llevando la otra oreja al otro lado. Cuerpo en hollow. Si no puedes tocar la barra con el hombro, escala con banda.",
    founder_notes: "Pull-up con sabor a calistenia. Construye lat + abs oblicuos en un solo movimiento. EMOM con Z Press es alternancia push/pull pura.",
  },
  {
    name: "Bent-Over DB Rear Delt Fly", name_es: "Apertura Posterior Inclinada con Mancuerna",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.1.1",
    primary_muscles: ["rear_deltoid", "rhomboids", "mid_trapezius"],
    equipment_required: ["dumbbell"],
    description: "Apertura de rear delt de pie inclinado al frente. Diferente al chest-supported porque obliga al core a estabilizar la posición. Esencial para hombros 3D.",
    coaching_cue: "Inclínate al frente con bisagra de cadera, torso casi paralelo al piso, lumbar neutral. Mancuernas colgando, codos ligeramente flexionados. Abre llevando las mancuernas a los lados — pellizca los romboides arriba. NO uses momentum. Lento abajo.",
    founder_notes: "El rear delt no se construye con peso pesado — se construye con tensión limpia. Si tu cuello hace fuerza, bajas el peso.",
  },
  {
    name: "Push-up Combo (Wide-Standard-Close)", name_es: "Combo de Lagartija (Abierta-Normal-Cerrada)",
    category: "strength", movement_pattern: "push", difficulty: "intermediate", default_tempo: "2.0.1.0",
    primary_muscles: ["pectoralis_major", "anterior_deltoid", "triceps", "core"],
    equipment_required: ["bodyweight"],
    description: "15 lagartijas seguidas en tres anchos: 5 abiertas (manos más anchas que hombros), 5 normales (manos a la altura del hombro), 5 cerradas (manos juntas). Sin descanso entre anchos. Variación del ancho cambia el énfasis: pecho exterior → pecho central → tríceps.",
    coaching_cue: "5 abiertas — manos 1.5× ancho de hombros, pecho a piso. 5 normales — manos al ancho de hombros, codos a 45°. 5 cerradas — manos juntas formando triángulo, codos pegados al torso. Sin pausar. Si fallas, baja de rodillas.",
    founder_notes: "Finisher perfecto después de DB Bench. Quema el pecho y tríceps en tres ángulos. Se hace después de cada serie de bench en M3 LUN.",
  },
  {
    name: "DB Skull Crusher", name_es: "Skull Crusher con Mancuerna",
    category: "strength", movement_pattern: "push", difficulty: "intermediate", default_tempo: "3.0.1.0",
    primary_muscles: ["triceps_brachii"],
    equipment_required: ["dumbbell", "bench"],
    description: "Acostado en banco, mancuernas extendidas verticalmente. Bajas las mancuernas hacia los lados de la cabeza flexionando codos, mantienes brazo vertical. Isolación pura de tríceps.",
    coaching_cue: "Acostado en banco plano, mancuernas extendidas arriba, palmas enfrentadas. Codos fijos apuntando al techo. Baja las mancuernas hacia los lados de la cabeza (no a la frente), siente estiramiento en el tríceps largo. Empuja extendiendo solo el codo. Brazo no se mueve.",
    founder_notes: "El skull crusher clásico. La cabeza larga del tríceps responde mejor al estiramiento que a la contracción — por eso bajamos a los lados de la cabeza, no a la frente.",
  },
  {
    name: "Low Plank KB Press-Drag", name_es: "Plancha Baja con Arrastre y Press de KB",
    category: "accessory", movement_pattern: "core", difficulty: "advanced", default_tempo: null,
    primary_muscles: ["core", "obliques", "shoulders", "serratus_anterior"],
    equipment_required: ["kettlebell"],
    description: "En plancha baja sobre antebrazos, KB al lado de un brazo. Atleta agarra la KB con la mano libre, hace un press unilateral hacia adelante (extendiendo el brazo), regresa, arrastra la KB cruzando bajo el cuerpo al otro lado, cambia. Combina anti-rotación + press unilateral + drag pattern.",
    coaching_cue: "Plancha baja sobre antebrazos, cadera cuadrada al piso (no abras). KB al lado de un codo. Con la mano contraria, agarra la KB y haz un press al frente extendiendo el brazo paralelo al piso. Regresa, y arrastra la KB cruzando bajo el pecho al otro lado. Cuenta 10/lado = 20 reps totales por set.",
    founder_notes: "El reemplazo del Russian Twist. Cero rotación con peso (que ensancha la cintura), todo anti-rotación + skill. Cintura pequeña, core indestructible.",
  },
];

console.log("════════════════════════════════════════════════════════════════");
console.log("  M3 LUN W1 Density Day — creación end-to-end");
console.log("════════════════════════════════════════════════════════════════\n");

// Step 1: Create exercises
console.log("STEP 1: Catálogo de ejercicios\n");
const exerciseIds = {}; // name → id

for (const e of NEW_EXERCISES) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", e.name).maybeSingle();
  if (existing) {
    console.log(`  · "${e.name}" ya existe (${existing.id.slice(0, 8)}), skip`);
    exerciseIds[e.name] = existing.id;
    continue;
  }
  const { data: created, error } = await sb
    .from("exercises")
    .insert({
      name: e.name,
      name_es: e.name_es,
      category: e.category,
      movement_pattern: e.movement_pattern,
      difficulty: e.difficulty,
      default_tempo: e.default_tempo,
      primary_muscles: e.primary_muscles,
      equipment_required: e.equipment_required,
      description: e.description,
      coaching_cue: e.coaching_cue,
      founder_notes: e.founder_notes,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`  ✗ ERROR creando "${e.name}":`, error.message);
    process.exit(1);
  }
  console.log(`  ✓ creado "${e.name}" → ${created.id.slice(0, 8)}`);
  exerciseIds[e.name] = created.id;
}

// Get IDs of reused exercises
const REUSED = {
  "Scap Push-up": null,
  "Dumbbell Bench Press": null,
  "Lean Away Lateral Raise": null,
  "Cable Tricep Pushdown — Rope Attachment": null,
  "Chest Doorway Stretch": null,
  "Hollow Body Hold": null,
  "Thoracic Extension over Foam Roller": null,
  "Cross-Body Shoulder Stretch": null,
};
for (const name of Object.keys(REUSED)) {
  const { data: ex } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!ex) {
    console.error(`  ✗ ERROR: ejercicio reusado "${name}" no encontrado`);
    process.exit(1);
  }
  REUSED[name] = ex.id;
  exerciseIds[name] = ex.id;
}
console.log(`\n  Total ejercicios mapeados: ${Object.keys(exerciseIds).length}\n`);

// ════════════════════════════════════════════════════════════════════════════
// 2. MESOCICLO M3
// ════════════════════════════════════════════════════════════════════════════

console.log("STEP 2: Mesociclo M3\n");

const M3_START = "2026-06-08";
const M3_END = "2026-07-19"; // 6 weeks = 42 days, 2026-06-08 + 41 days = 2026-07-19
const M2_ID = "422affe6-4b2c-4e8d-bad7-4c96968e5e40";

let m3Id;
{
  const { data: existing } = await sb
    .from("mesocycles")
    .select("id")
    .eq("program_name", "BUILD HIM ELITE")
    .eq("cycle_number", 3)
    .maybeSingle();
  if (existing) {
    console.log(`  · M3 ya existe (${existing.id.slice(0, 8)}), skip`);
    m3Id = existing.id;
  } else {
    const { data: created, error } = await sb
      .from("mesocycles")
      .insert({
        program_name: "BUILD HIM ELITE",
        cycle_number: 3,
        cycle_start_date: M3_START,
        // cycle_end_date es columna generada (no se inserta)
        total_weeks: 6,
        status: "draft",
        template_program_id: PROGRAM_TEMPLATE_ID,
        previous_cycle_id: M2_ID,
      })
      .select("id")
      .single();
    if (error) {
      console.error("  ✗ ERROR creando M3:", error.message);
      process.exit(1);
    }
    m3Id = created.id;
    console.log(`  ✓ M3 creado → ${m3Id.slice(0, 8)} | ${M3_START} → ${M3_END} | draft`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 3. TEMPLATE WORKOUT (admin view)
// ════════════════════════════════════════════════════════════════════════════

console.log("\nSTEP 3: Template workout LUN W1 Density Day (admin)\n");

const COACH_NOTE = "Density Day. EMOM 12 min de KB Z Press (8/lado) + Commando Pull-up (8-10) alternando minuto a minuto. Después: hipertrofia limpia de delt lateral + posterior con polea. Skill Push: DB Bench 3×8 con push-up combo (5 wide + 5 standard + 5 close) sin rest después de cada serie, rest 2 min entre rondas. Arm block sube a 4 sets (tríceps focus). Core: anti-extension + loaded press-drag. Recovery: pec + t-spine + rear shoulder.";
const SHORT_NOTE = "¿Apretado de tiempo? Prioridad: Density Block (EMOM 12') + Skill Push (3×8 + combo). Si te quedan 15 min, mete el Arm Block. Salta Hypertrophy si tienes que. Nunca saltes el Recovery.";

let templateWorkoutId;
{
  const { data: existing } = await sb
    .from("workouts")
    .select("id")
    .is("user_id", null)
    .eq("mesocycle_id", m3Id)
    .eq("week_number", 1)
    .eq("day_label", "W1 DENSITY DAY")
    .maybeSingle();
  if (existing) {
    console.log(`  · Template LUN W1 ya existe (${existing.id.slice(0, 8)}), skip`);
    templateWorkoutId = existing.id;
  } else {
    const { data: created, error } = await sb
      .from("workouts")
      .insert({
        program_id: PROGRAM_TEMPLATE_ID,
        user_id: null,
        scheduled_date: M3_START,
        week_number: 1,
        day_label: "W1 DENSITY DAY",
        workout_type: "strength",
        estimated_duration: 78,
        is_completed: false,
        is_rest_day: false,
        coach_note: COACH_NOTE,
        short_on_time_note: SHORT_NOTE,
        mesocycle_id: m3Id,
      })
      .select("id")
      .single();
    if (error) {
      console.error("  ✗ ERROR creando template workout:", error.message);
      process.exit(1);
    }
    templateWorkoutId = created.id;
    console.log(`  ✓ Template creado → ${templateWorkoutId.slice(0, 8)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. TEMPLATE SETS — la receta del día
// ════════════════════════════════════════════════════════════════════════════

console.log("\nSTEP 4: Template sets\n");

// Helper to build a set object
function S(block_label, exName, set_type, planned_reps, opts = {}) {
  return {
    exercise_id: exerciseIds[exName],
    block_label,
    set_type,
    planned_reps,
    planned_weight: opts.weight ?? null,
    planned_tempo: opts.tempo ?? null,
    planned_rpe: opts.rpe ?? null,
    planned_rir: opts.rir ?? null,
    planned_rest_seconds: opts.rest ?? 0,
    planned_duration_seconds: opts.duration ?? null,
    coaching_cue_override: opts.cue ?? null,
  };
}

const SETS = [
  // ─── PRIME BLOCK (warmup, 2 rondas) ──────────────────────────────
  S("PRIME BLOCK", "Wall Slide", "warmup", 8, { cue: "2 rondas · pegado a la pared, sin perder contacto" }),
  S("PRIME BLOCK", "Band Dislocates", "warmup", 10, { cue: "2 rondas · brazos rectos, no doblar codos" }),
  S("PRIME BLOCK", "Scap Push-up", "warmup", 10, { cue: "2 rondas · solo movimiento de escápulas" }),
  S("PRIME BLOCK", "Banded Pull-Apart", "warmup", 15, { cue: "2 rondas · liga toca el pecho arriba" }),
  S("PRIME BLOCK", "KB Around the World", "warmup", 5, { cue: "5 por lado · KB en cadera, alterna direcciones" }),
  S("PRIME BLOCK", "KB Halo", "warmup", 5, { cue: "5 por lado · KB pegada a la cabeza, codos altos" }),

  // ─── DENSITY BLOCK A (EMOM 12 min, alterna por minuto) ───────────
  // 6 sets de cada uno, intercalados
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0, cue: "EMOM 12' · Min 1, 3, 5, 7, 9, 11 · 8 por lado · piernas Z, sin trampa" }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0, cue: "EMOM 12' · Min 2, 4, 6, 8, 10, 12 · 8-10 reps · alterna lado de la cabeza" }),
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0 }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0 }),
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0 }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0 }),
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0 }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0 }),
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0 }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0 }),
  S("DENSITY BLOCK A", "KB Alternating Z Press", "working", 8, { rest: 0 }),
  S("DENSITY BLOCK A", "Commando Pull-up", "working", 10, { rest: 0 }),

  // ─── HYPERTROPHY BLOCK (3 rondas superset, rest 60s) ─────────────
  S("HYPERTROPHY BLOCK", "Lean Away Lateral Raise", "superset", 10, { rest: 0, cue: "Unilateral · cable bajo · 10 por lado · tensión constante" }),
  S("HYPERTROPHY BLOCK", "Bent-Over DB Rear Delt Fly", "superset", 12, { rest: 60, cue: "Torso paralelo al piso · pellizca romboides arriba" }),
  S("HYPERTROPHY BLOCK", "Lean Away Lateral Raise", "superset", 10, { rest: 0 }),
  S("HYPERTROPHY BLOCK", "Bent-Over DB Rear Delt Fly", "superset", 12, { rest: 60 }),
  S("HYPERTROPHY BLOCK", "Lean Away Lateral Raise", "superset", 10, { rest: 0 }),
  S("HYPERTROPHY BLOCK", "Bent-Over DB Rear Delt Fly", "superset", 12, { rest: 60 }),

  // ─── SKILL PUSH (3 sets, push-up combo después de cada bench, rest 120s) ─
  S("SKILL PUSH", "Dumbbell Bench Press", "superset", 8, { tempo: "2-1-1-0", rest: 0, rpe: 8, cue: "Tempo 2-1-1 · pausa abajo · luego SIN REST push-up combo" }),
  S("SKILL PUSH", "Push-up Combo (Wide-Standard-Close)", "superset", 15, { rest: 120, cue: "5 wide + 5 standard + 5 close · sin pausar · luego 2 min rest" }),
  S("SKILL PUSH", "Dumbbell Bench Press", "superset", 8, { tempo: "2-1-1-0", rest: 0, rpe: 9 }),
  S("SKILL PUSH", "Push-up Combo (Wide-Standard-Close)", "superset", 15, { rest: 120 }),
  S("SKILL PUSH", "Dumbbell Bench Press", "superset", 8, { tempo: "2-1-1-0", rest: 0, rpe: 9 }),
  S("SKILL PUSH", "Push-up Combo (Wide-Standard-Close)", "superset", 15, { rest: 120 }),

  // ─── ARM BLOCK (4 rondas superset, rest 60s) ─────────────────────
  S("ARM BLOCK", "Cable Tricep Pushdown — Rope Attachment", "superset", 12, { rest: 0, rpe: 8, cue: "Rope · SEPARA las manos al final del rango (clave)" }),
  S("ARM BLOCK", "DB Skull Crusher", "superset", 10, { rest: 60, rpe: 8, cue: "Baja a los lados de la cabeza, no a la frente · estira el tríceps largo" }),
  S("ARM BLOCK", "Cable Tricep Pushdown — Rope Attachment", "superset", 12, { rest: 0, rpe: 9 }),
  S("ARM BLOCK", "DB Skull Crusher", "superset", 10, { rest: 60, rpe: 9 }),
  S("ARM BLOCK", "Cable Tricep Pushdown — Rope Attachment", "superset", 12, { rest: 0, rpe: 9 }),
  S("ARM BLOCK", "DB Skull Crusher", "superset", 10, { rest: 60, rpe: 9 }),
  S("ARM BLOCK", "Cable Tricep Pushdown — Rope Attachment", "superset", 12, { rest: 0, rpe: 9 }),
  S("ARM BLOCK", "DB Skull Crusher", "superset", 10, { rest: 60, rpe: 9 }),

  // ─── CORE BLOCK (3 rondas, hollow + press-drag) ───────────────────
  S("CORE BLOCK", "Hollow Body Hold", "working", 1, { duration: 30, rest: 0, cue: "30 segundos · arms overhead, low back glued" }),
  S("CORE BLOCK", "Low Plank KB Press-Drag", "working", 10, { rest: 30, cue: "10 por lado · cadera cuadrada · press → drag bajo el pecho" }),
  S("CORE BLOCK", "Hollow Body Hold", "working", 1, { duration: 30, rest: 0 }),
  S("CORE BLOCK", "Low Plank KB Press-Drag", "working", 10, { rest: 30 }),
  S("CORE BLOCK", "Hollow Body Hold", "working", 1, { duration: 30, rest: 0 }),
  S("CORE BLOCK", "Low Plank KB Press-Drag", "working", 10, { rest: 30 }),

  // ─── RECOVERY BLOCK (cooldown) ────────────────────────────────────
  S("RECOVERY BLOCK", "Chest Doorway Stretch", "cooldown", 1, { duration: 90, cue: "90 segundos · brazo en 90°, gira el pecho lejos" }),
  S("RECOVERY BLOCK", "Thoracic Extension over Foam Roller", "cooldown", 1, { duration: 90, cue: "90 segundos · foam roller bajo escápulas, brazos detrás" }),
  S("RECOVERY BLOCK", "Cross-Body Shoulder Stretch", "cooldown", 1, { duration: 60, cue: "60 segundos por lado · jala el codo hacia el pecho" }),
];

console.log(`  Total sets a crear: ${SETS.length}`);

// Check if template already has sets
{
  const { count } = await sb
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", templateWorkoutId);
  if (count && count > 0) {
    console.log(`  · Template ya tiene ${count} sets, skip inserción`);
  } else {
    const rows = SETS.map((s, i) => ({
      workout_id: templateWorkoutId,
      user_id: null,
      set_order: i + 1,
      ...s,
    }));
    const { error } = await sb.from("workout_sets").insert(rows);
    if (error) {
      console.error("  ✗ ERROR insertando template sets:", error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${rows.length} sets template insertados`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. ATHLETE INSTANCE (Andoni)
// ════════════════════════════════════════════════════════════════════════════

console.log("\nSTEP 5: Instancia de Andoni (athlete view)\n");

let andoniWorkoutId;
{
  const { data: existing } = await sb
    .from("workouts")
    .select("id")
    .eq("user_id", ANDONI)
    .eq("scheduled_date", M3_START)
    .maybeSingle();
  if (existing) {
    console.log(`  · Andoni ya tiene workout en ${M3_START} (${existing.id.slice(0, 8)}), skip`);
    andoniWorkoutId = existing.id;
  } else {
    const { data: created, error } = await sb
      .from("workouts")
      .insert({
        program_id: ANDONI_PROGRAM_ID,
        user_id: ANDONI,
        scheduled_date: M3_START,
        week_number: 1,
        day_label: "DENSITY DAY",
        workout_type: "strength",
        estimated_duration: 78,
        is_completed: false,
        is_rest_day: false,
        coach_note: COACH_NOTE,
        short_on_time_note: SHORT_NOTE,
        mesocycle_id: null, // mismo patrón que las instancias de M2
      })
      .select("id")
      .single();
    if (error) {
      console.error("  ✗ ERROR creando workout de Andoni:", error.message);
      process.exit(1);
    }
    andoniWorkoutId = created.id;
    console.log(`  ✓ Workout de Andoni creado → ${andoniWorkoutId.slice(0, 8)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 6. ATHLETE SETS (Andoni)
// ════════════════════════════════════════════════════════════════════════════

console.log("\nSTEP 6: Sets de Andoni\n");

{
  const { count } = await sb
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("workout_id", andoniWorkoutId);
  if (count && count > 0) {
    console.log(`  · Andoni ya tiene ${count} sets, skip inserción`);
  } else {
    const rows = SETS.map((s, i) => ({
      workout_id: andoniWorkoutId,
      user_id: ANDONI,
      set_order: i + 1,
      ...s,
    }));
    const { error } = await sb.from("workout_sets").insert(rows);
    if (error) {
      console.error("  ✗ ERROR insertando sets de Andoni:", error.message);
      process.exit(1);
    }
    console.log(`  ✓ ${rows.length} sets de Andoni insertados`);
  }
}

console.log("\n════════════════════════════════════════════════════════════════");
console.log("  ✓ M3 LUN W1 Density Day creado completo");
console.log(`  · M3 mesocycle: ${m3Id}`);
console.log(`  · Template workout: ${templateWorkoutId}`);
console.log(`  · Andoni workout: ${andoniWorkoutId}`);
console.log("════════════════════════════════════════════════════════════════");
