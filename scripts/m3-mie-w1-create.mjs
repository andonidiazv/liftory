/**
 * M3 MIE W1 Skill Day — crear template + instancias para Andoni, César, Víctor.
 *
 *  1. Crear 14 ejercicios nuevos
 *  2. Renombrar 1 al spec del HTML (Dumbbell → DB Hammer Curl)
 *  3. Template workout (admin)
 *  4. 34 sets template
 *  5. Instancias para Andoni / César / Víctor (2026-06-10)
 *
 * Idempotente.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0";
const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
const MIE_DATE = "2026-06-10";
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";

// ════════════════════════════════════════════════════════════════════════════
// 1. EJERCICIOS NUEVOS (14)
// ════════════════════════════════════════════════════════════════════════════

const NEW_EXERCISES = [
  {
    name: "Wrist Mobility", name_es: "Movilidad de Muñeca",
    category: "mobility", movement_pattern: "push", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["wrist_flexors", "wrist_extensors", "forearm"],
    equipment_required: ["bodyweight"],
    description: "Secuencia de movilidad activa de muñeca: CARs (controlled articular rotations), flexión y extensión cargada con peso corporal en cuadrupedia, y rotaciones de antebrazo. Prep obligado antes de cualquier día con front rack, false grip, o trabajo de hand-balancing.",
    coaching_cue: "60s de mezcla: 10 CARs en cada dirección (círculos amplios y controlados) → cuadrupedia con manos al frente, peso suave sobre los talones de la mano (flexión) → manos al revés (extensión, dedos hacia rodillas). Si duele, achicas el rango. No fuerces.",
    founder_notes: "El warm-up que el 90% de los atletas se salta. Sin muñeca preparada, el front rack del KB Complex es un compromiso lumbar.",
  },
  {
    name: "Scap Pull", name_es: "Tracción Escapular",
    category: "mobility", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.1.1.0",
    primary_muscles: ["lower_trapezius", "rhomboids", "lats"],
    equipment_required: ["pull_up_bar"],
    description: "Movimiento puro de retracción y depresión escapular en pull-up bar. Atleta colgado en dead hang, sin doblar codos, solo aprieta escápulas hacia atrás y abajo elevando el cuerpo unos centímetros. Activa el complejo escapular antes de pulls cargados.",
    coaching_cue: "Colgado en dead hang, brazos extendidos. Sin doblar codos. Aprieta escápulas hacia atrás y abajo (como si quisieras meter los omóplatos en los bolsillos traseros) — el cuerpo sube ligeramente. Pausa 1s arriba. Baja controlado a dead hang completo. Repite.",
    founder_notes: "Despierta el trapecio bajo y romboides — los músculos que activan PRIMERO en un pull bien ejecutado. Si no activas escápula antes, el pull se va a bíceps puro y el hombro paga.",
  },
  {
    name: "Double KB Deadlift", name_es: "Peso Muerto con Dos KB",
    category: "strength", movement_pattern: "hinge", difficulty: "beginner", default_tempo: "2.0.2.0",
    primary_muscles: ["glutes", "hamstrings", "lower_back", "grip"],
    equipment_required: ["kettlebell"],
    description: "Deadlift con una KB en cada mano, KBs entre los pies o ligeramente al frente. Bisagra de cadera con espalda neutral, KBs suben pegadas al cuerpo. Prep clásica del KB Complex.",
    coaching_cue: "KBs en el piso entre los pies. Pies al ancho de cadera. Bisagra: empuja la cadera atrás, agarra los handles. Lat tight (apretás las axilas). Subes empujando el piso con los pies, KBs pegadas a las piernas. Arriba: cadera fully extended, glúteo apretado.",
    founder_notes: "El patrón de bisagra con dos KBs. Si esto no es limpio, el Complex se rompe en el swing.",
  },
  {
    name: "Double KB Front Rack Hold", name_es: "Sostenida en Rack con Dos KB",
    category: "strength", movement_pattern: "core", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["core", "shoulders", "upper_back"],
    equipment_required: ["kettlebell"],
    description: "Sostenida isométrica con dos KB en posición de rack (campanas apoyadas sobre los antebrazos, codos al frente, manos cerca de las clavículas). Trabaja core anti-extensión + estabilidad de hombro + grip.",
    coaching_cue: "KBs en rack: campanas apoyadas sobre antebrazos, codos al frente, manos cerca de clavículas. Costillas abajo (no arquees lumbar). Core firme, respiración por la nariz. Mantén la posición sin perder el rack. 20s.",
    founder_notes: "Si no aguantas 20s en rack, no tienes base para el thruster del Complex. Diagnóstico honesto del core + estabilidad escapular.",
  },
  {
    name: "Double KB Strict Press", name_es: "Press Estricto con Dos KB",
    category: "strength", movement_pattern: "push", difficulty: "intermediate", default_tempo: "2.0.1.0",
    primary_muscles: ["shoulders", "triceps", "upper_back"],
    equipment_required: ["kettlebell"],
    description: "Press overhead estricto con dos KBs desde posición de rack. Sin trampa de piernas (no push press). Costillas abajo, glúteo apretado, core firme todo el rango.",
    coaching_cue: "KBs en rack. Pies anclados al piso, glúteo + core apretados. Presiona overhead sin ayuda de piernas (estricto). Codos terminan al lado de las orejas. Baja controlado al rack. Si tu lumbar se arquea, baja la carga o salta este accessory.",
    founder_notes: "El press estricto enseña control. El push press es para output. En W1 BASE, todo estricto.",
  },
  {
    name: "Double KB Complex", name_es: "Complex con Dos KB",
    category: "strength", movement_pattern: "push", difficulty: "advanced", default_tempo: null,
    primary_muscles: ["shoulders", "lats", "glutes", "core", "grip"],
    equipment_required: ["kettlebell"],
    description: "Complex de 5 movimientos encadenados sin soltar las KBs: 1) Double KB Swing → 2) Double KB Swing Squat (catch en squat al peak) → 3) Double KB High Pull → 4) Double KB Clean → 5) Double KB Thruster. Eso es 1 rep. Construye hombros + lats + glúteo + grip + conditioning simultáneo.",
    coaching_cue: "1 rep del complex = los 5 movimientos encadenados sin soltar las KBs: Swing → Swing Squat → High Pull → Clean → Thruster. Hacés 5 reps consecutivas = 1 set. KBs moderadas en W1 (técnica primero). Si la técnica colapsa, soltás y descansas — no terminas la rep si rompió la forma.",
    founder_notes: "Signature del Skill Day. Mezcla power, strength y conditioning en un solo flow. Marcus Filly puro. Si dominás este complex, dominás KB.",
  },
  {
    name: "MU Burpee", name_es: "Burpee con Muscle-Up",
    category: "strength", movement_pattern: "pull", difficulty: "advanced", default_tempo: null,
    primary_muscles: ["lats", "chest", "core", "shoulders", "triceps"],
    equipment_required: ["pull_up_bar"],
    description: "Combo de burpee + muscle-up encadenado. 1 rep = burpee completo (pecho a piso + jump up) + jump-to-bar + Muscle-Up. Para For Time o EMOM en Skill Day. Tiene 4 regresiones según el nivel del atleta.",
    coaching_cue: "1 rep = burpee con pecho a piso → push back to stand con jump → jump-to-bar (agarras la barra) → Muscle-Up. Repite. Si todavía no sacas MU limpio, escala según las regresiones de la nota del bloque (R1: Banded MU · R2: Jumping MU · R3: High Pull-up + Bar Dip · R4: Pull-up + Push-up).",
    founder_notes: "El benchmark del skill day. Mezcla output máximo + skill calisténico. Con regresión accesible para que todo atleta entrene este día sin saltarse el bloque.",
  },
  {
    name: "Ice Cream Maker", name_es: "Ice Cream Maker",
    category: "accessory", movement_pattern: "pull", difficulty: "advanced", default_tempo: "2.0.2.0",
    primary_muscles: ["lats", "core", "abs", "shoulders"],
    equipment_required: ["pull_up_bar"],
    description: "Movimiento gimnástico desde top de pull-up. Atleta en chin sobre la barra (chest-to-bar) baja controlado el cuerpo desde vertical a horizontal con las piernas extendidas (motion de scooper de helado) y sube de vuelta a chin sobre la barra. Lats brutal + control de core gimnástico.",
    coaching_cue: "Empezás en chin sobre la barra (chest-to-bar arriba). Bajás controlado a una posición horizontal con cuerpo recto y piernas extendidas — el cuerpo describe un arco hacia adelante como si scoopearas helado. Subís de vuelta a chest-to-bar manteniendo la tensión del cuerpo. 12 reps = 1 set.",
    founder_notes: "Skill gimnástico avanzado. Si no podés sacar uno limpio, regresión: hold isométrico en horizontal con piernas tucked. Mejor 5 reps perfectas que 12 sloppy.",
  },
  {
    name: "KB Gorilla Row", name_es: "Gorilla Row con Kettlebell",
    category: "strength", movement_pattern: "pull", difficulty: "intermediate", default_tempo: "2.0.1.0",
    primary_muscles: ["lats", "rhomboids", "rear_delts", "core"],
    equipment_required: ["kettlebell"],
    description: "Row alternante con dos KBs en piso entre las piernas, posición de hinge profunda mantenida. Una mano hace row mientras la otra apoyada en la KB del piso (3 puntos de apoyo). Back density + anti-rotación extrema porque el core resiste la rotación del lado que rema.",
    coaching_cue: "Dos KBs en el piso entre las piernas. Hinge profundo, espalda neutral, una mano apoyada firme en la KB del piso. Con la otra mano hacés row de la otra KB — codo va alto al lado del costado, no al techo. Anti-rotación: la cadera no rota. Alternás brazos. 20 reps totales = 10/lado alternando.",
    founder_notes: "El row más completo para back density. La posición de hinge profunda + 3 puntos de apoyo + anti-rotación hace que el lat trabaje más que cualquier row tradicional. Si la cadera rota, perdés el ejercicio.",
  },
  {
    name: "DB High Pull + Squat Clean Complex", name_es: "Complex DB High Pull + Squat Clean",
    category: "strength", movement_pattern: "pull", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["upper_traps", "rear_delts", "quads", "glutes", "grip"],
    equipment_required: ["dumbbell"],
    description: "Complex de 2 movimientos encadenados con dos DBs sin soltar: 1) DB High Pull desde hang (triple extensión explosiva → high pull a clavículas con codos altos) + 2) DB Squat Clean (rebote a squat catch con DBs en rack position, te levantas). Eso es 1 rep. Trabaja traps + rear delt + cadera + cuádriceps + grip en un solo flow power-based.",
    coaching_cue: "1 rep = 1 DB High Pull + 1 DB Squat Clean encadenados sin soltar. (1) High Pull: DBs en hang, triple extensión explosiva (cadera→rodilla→tobillo), tirás los DBs a clavículas con codos altos. (2) Squat Clean: desde arriba del high pull, te dejás caer en squat con los DBs en rack position, te levantás. Power-based, no curl. 6 reps consecutivas = 1 set.",
    founder_notes: "El complex que conecta el upper pull explosivo con el squat dinámico. Marcus Filly territory — hipertrofia funcional + output power.",
  },
  {
    name: "DB Cross-Body Curl", name_es: "Curl Cruzado con Mancuerna",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.2.0",
    primary_muscles: ["biceps_brachii", "brachialis", "forearm"],
    equipment_required: ["dumbbell"],
    description: "Curl con mancuerna llevando la palma cruzando el cuerpo hacia el hombro opuesto (en lugar de subir vertical). Cambia el plano del curl: trabaja brachialis + porción larga del bíceps con énfasis distinto al curl tradicional.",
    coaching_cue: "DB en una mano, palma hacia adentro (agarre neutro). Curl llevando el DB en diagonal hacia el hombro opuesto — el DB cruza tu pecho. Codo se mantiene cerca del costado. Apretás el bíceps arriba. Baja controlado. Alterná brazos. 8 reps por lado.",
    founder_notes: "El curl que pellizca la porción larga del bíceps + brachialis. La diagonal de movimiento es lo que cambia el estímulo vs hammer curl o supinated curl.",
  },
  {
    name: "L-Sit Hold (tuck)", name_es: "L-Sit Tuck Hold",
    category: "accessory", movement_pattern: "core", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["abs", "hip_flexors", "shoulders", "triceps"],
    equipment_required: ["bodyweight"],
    description: "Regresión del L-Sit clásico. Atleta apoya las manos en piso o paralelas, eleva el cuerpo del suelo y mantiene las rodillas dobladas al pecho (tuck). Hombros deprimidos, brazos rectos. Construye fuerza estática de abs + hip flexors + estabilidad de hombro.",
    coaching_cue: "Sentado con manos a los lados (en piso o sobre paralelas/parallettes/dos bloques). Deprime los hombros (saca cabeza del cuello, no encojas hombros). Eleva el cuerpo del piso, lleva rodillas al pecho en tuck. Brazos rectos. Mantén 15s sin colapsar hombros.",
    founder_notes: "El primer paso al L-Sit completo. Si no aguantas 15s en tuck, no estás listo para extender piernas. Mejor 15s perfectos que 30s con hombros colapsados.",
  },
  {
    name: "Wall Lat Stretch", name_es: "Estiramiento de Lat en Pared",
    category: "mobility", movement_pattern: "pull", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["lats", "shoulders"],
    equipment_required: ["wall"],
    description: "Estiramiento estático de lats apoyando manos en pared. Atleta de rodillas o de pie, manos altas en la pared, lleva el pecho hacia el piso/pared inferior haciendo bisagra de cadera. Estira lats + abre hombros.",
    coaching_cue: "De rodillas o de pie a 1m de la pared. Manos altas sobre la pared, brazos extendidos. Empuja la cadera hacia atrás haciendo bisagra, el pecho baja hacia el piso. Siente estiramiento desde axilas hasta cadera (lats + dorsal). Mantén 60s. Respira.",
    founder_notes: "Recovery clave después del Lat Volume Block + KB Complex. Si te saltás el stretch de lat, al día siguiente el hombro está corto y bloqueado.",
  },
  {
    name: "Hanging Stretch", name_es: "Estiramiento Colgado",
    category: "mobility", movement_pattern: "pull", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["lats", "shoulders", "spine"],
    equipment_required: ["pull_up_bar"],
    description: "Dead hang pasivo desde la pull-up bar. Atleta cuelga relajado (no activo), deja que la gravedad descomprima la columna y estire lats + cápsula del hombro. Recovery clásico de gimnasia.",
    coaching_cue: "Cuelga de la barra con agarre cómodo (a hombros o ligeramente más ancho). Relaja todo el cuerpo — hombros suben hacia las orejas (pasivo, sin activar). Deja que la gravedad descomprima la columna. Respira. 60s.",
    founder_notes: "El recovery del skill day. Descomprime columna después de Complex + Lat Volume + Pull Power. Si no tienes pull-up bar, salta este (no hay sustituto útil).",
  },
];

console.log("══ STEP 1: Ejercicios nuevos ══\n");
for (const e of NEW_EXERCISES) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", e.name).maybeSingle();
  if (existing) { console.log(`  · "${e.name}" ya existe, skip`); continue; }
  const { error } = await sb.from("exercises").insert({ ...e, is_active: true });
  if (error) { console.error(`  ✗ ERROR "${e.name}":`, error.message); process.exit(1); }
  console.log(`  ✓ creado "${e.name}"`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. RENAMBRAR Dumbbell Hammer Curl → DB Hammer Curl
// ════════════════════════════════════════════════════════════════════════════

console.log("\n══ STEP 2: Renombrar al spec ══\n");
const RENAMES = [["Dumbbell Hammer Curl", "DB Hammer Curl"]];
for (const [oldN, newN] of RENAMES) {
  const { data: alreadyNew } = await sb.from("exercises").select("id").eq("name", newN).maybeSingle();
  if (alreadyNew) { console.log(`  · "${newN}" ya existe`); continue; }
  const { data: old } = await sb.from("exercises").select("id").eq("name", oldN).maybeSingle();
  if (!old) { console.log(`  · "${oldN}" no encontrado`); continue; }
  const { error } = await sb.from("exercises").update({ name: newN }).eq("id", old.id);
  if (error) { console.error(`  ✗ ERROR:`, error.message); process.exit(1); }
  console.log(`  ✓ "${oldN}" → "${newN}"`);
}

// Get all IDs
async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!data) throw new Error(`Exercise not found: ${name}`);
  return data.id;
}

const EX = {
  thoracicFoam: await exId("Thoracic Extension over Foam Roller"),
  wristMobility: await exId("Wrist Mobility"),
  scapPull: await exId("Scap Pull"),
  deadHang: await exId("Dead Hang"),
  bwRdl: await exId("Bodyweight RDL"),
  dblKbDl: await exId("Double KB Deadlift"),
  dblKbFrontRack: await exId("Double KB Front Rack Hold"),
  dblKbStrictPress: await exId("Double KB Strict Press"),
  dblKbComplex: await exId("Double KB Complex"),
  muBurpee: await exId("MU Burpee"),
  iceCream: await exId("Ice Cream Maker"),
  gorillaRow: await exId("KB Gorilla Row"),
  highPullComplex: await exId("DB High Pull + Squat Clean Complex"),
  hammerCurl: await exId("DB Hammer Curl"),
  crossCurl: await exId("DB Cross-Body Curl"),
  hangingKnee: await exId("Hanging Knee Raise"),
  lSitTuck: await exId("L-Sit Hold (tuck)"),
  wallLat: await exId("Wall Lat Stretch"),
  hangingStretch: await exId("Hanging Stretch"),
};

// ════════════════════════════════════════════════════════════════════════════
// 3. TEMPLATE WORKOUT
// ════════════════════════════════════════════════════════════════════════════

console.log("\n══ STEP 3: Template MIE W1 ══\n");

const COACH_NOTE = "Skill Day. Double KB Complex 3×5 (Swing→Swing Squat→High Pull→Clean→Thruster encadenados) — KBs moderadas en W1, técnica primero. MU Burpee For Time 40 reps cap 12 min — 4 regresiones disponibles en la card del bloque para todo nivel. Lat Volume 3 series (Ice Cream Maker 12 + KB Gorilla Row 20). Pull Power Complex (1 DB High Pull + 1 DB Squat Clean) × 6 × 4 sets. Arm Block bíceps. Core gimnástico 2 sets. Recovery: lats + hanging.";
const SHORT_NOTE = "¿Apretado de tiempo? Prioridad: Double KB Complex + MU Burpee For Time + Lat Volume. Si te quedan 15 min más, mete Pull Power Complex. Salta Arm Block y Core. Nunca saltes el Recovery.";

let templateWorkoutId;
{
  const { data: existing } = await sb.from("workouts").select("id").is("user_id", null).eq("mesocycle_id", M3_ID).eq("week_number", 1).eq("day_label", "W1 SKILL DAY").maybeSingle();
  if (existing) { templateWorkoutId = existing.id; console.log(`  · template ya existe, skip`); }
  else {
    const { data: created, error } = await sb.from("workouts").insert({
      program_id: PROGRAM_TEMPLATE_ID, user_id: null, scheduled_date: MIE_DATE,
      week_number: 1, day_label: "W1 SKILL DAY", workout_type: "strength",
      estimated_duration: 78, is_completed: false, is_rest_day: false,
      coach_note: COACH_NOTE, short_on_time_note: SHORT_NOTE, mesocycle_id: M3_ID,
    }).select("id").single();
    if (error) { console.error(error.message); process.exit(1); }
    templateWorkoutId = created.id;
    console.log(`  ✓ template → ${templateWorkoutId.slice(0,8)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. SETS
// ════════════════════════════════════════════════════════════════════════════

function S(block_label, exName, set_type, planned_reps, opts = {}) {
  return {
    exercise_id: EX[exName],
    block_label, set_type, planned_reps,
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
  // ─── PRIME BLOCK (8 sets, 3 sub-grupos) ───
  S("PRIME BLOCK", "thoracicFoam",     "warmup", 10, { cue: "Mobility t-spine + muñeca | 2 rondas · foam roller bajo escápulas, brazos detrás" }),
  S("PRIME BLOCK", "wristMobility",    "warmup", 1,  { duration: 60, cue: "60s · CARs + flexión/extensión en cuadrupedia" }),
  S("PRIME BLOCK", "scapPull",         "warmup", 10, { cue: "Activación escapular pull + hinge | 2 rondas · solo escápulas, codos rectos" }),
  S("PRIME BLOCK", "deadHang",         "warmup", 1,  { duration: 20, cue: "20s · agarre firme, cuerpo relajado, hombros activos" }),
  S("PRIME BLOCK", "bwRdl",            "warmup", 8,  { cue: "2 rondas · bisagra de cadera, espalda neutral" }),
  S("PRIME BLOCK", "dblKbDl",          "warmup", 5,  { cue: "Specific prep Double KB | 2 rondas · técnica primero, KBs livianas" }),
  S("PRIME BLOCK", "dblKbFrontRack",   "warmup", 1,  { duration: 20, cue: "20s · KBs en rack, costillas abajo, core firme" }),
  S("PRIME BLOCK", "dblKbStrictPress", "warmup", 3,  { cue: "2 rondas · press estricto, sin trampa de cadera" }),

  // ─── SKILL A · Double KB Complex 3×5 ───
  S("SKILL A", "dblKbComplex", "working", 5, { rest: 180, cue: "1 rep = Swing → Swing Squat → High Pull → Clean → Thruster encadenados sin soltar las KBs. 5 reps = 1 set. KBs moderadas en W1, técnica primero." }),
  S("SKILL A", "dblKbComplex", "working", 5, { rest: 180 }),
  S("SKILL A", "dblKbComplex", "working", 5, { rest: 180 }),

  // ─── SKILL B · MU Burpee For Time 40 reps cap 12 min ───
  S("SKILL B", "muBurpee", "working", 40, { duration: 720, cue: "FOR TIME · cap 12 min · 40 MU Burpees. 1 rep = burpee (pecho a piso) → jump-to-bar → Muscle-Up. Regresiones (elige por nivel): R1 Banded MU · R2 Jumping MU · R3 High Pull-up + Bar Dip · R4 Pull-up + Push-up." }),

  // ─── LAT VOLUME · superset 3 rondas ───
  S("LAT VOLUME", "iceCream",   "superset", 12, { rest: 0,  cue: "12 reps · chest-to-bar arriba → bajas controlado a horizontal (scoop) → subes de vuelta" }),
  S("LAT VOLUME", "gorillaRow", "superset", 10, { rest: 90, cue: "20 totales (10/lado alternando) · hinge profundo, KBs en piso, row con mano apoyada en otra KB · cadera no rota" }),
  S("LAT VOLUME", "iceCream",   "superset", 12, { rest: 0 }),
  S("LAT VOLUME", "gorillaRow", "superset", 10, { rest: 90 }),
  S("LAT VOLUME", "iceCream",   "superset", 12, { rest: 0 }),
  S("LAT VOLUME", "gorillaRow", "superset", 10, { rest: 90 }),

  // ─── PULL POWER · DB Complex 4×6 ───
  S("PULL POWER", "highPullComplex", "working", 6, { rpe: 7.5, rest: 75, cue: "1 rep = 1 DB High Pull (hang → triple extensión explosiva → high pull a clavículas) + 1 DB Squat Clean (caes en squat con DBs en rack, te levantás). 6 reps consecutivas = 1 set. Power-based, no curl." }),
  S("PULL POWER", "highPullComplex", "working", 6, { rpe: 7.5, rest: 75 }),
  S("PULL POWER", "highPullComplex", "working", 6, { rpe: 8, rest: 75 }),
  S("PULL POWER", "highPullComplex", "working", 6, { rpe: 8, rest: 75 }),

  // ─── ARM BLOCK · bíceps superset 3 rondas ───
  S("ARM BLOCK", "hammerCurl", "superset", 10, { rest: 0,  cue: "Codo fijo · agarre neutro · sin trampa de cadera" }),
  S("ARM BLOCK", "crossCurl",  "superset", 8,  { rest: 60, cue: "8 por lado · DB cruza el pecho hacia el hombro opuesto" }),
  S("ARM BLOCK", "hammerCurl", "superset", 10, { rest: 0 }),
  S("ARM BLOCK", "crossCurl",  "superset", 8,  { rest: 60 }),
  S("ARM BLOCK", "hammerCurl", "superset", 10, { rest: 0 }),
  S("ARM BLOCK", "crossCurl",  "superset", 8,  { rest: 60 }),

  // ─── CORE BLOCK · 2 rondas (W1 BASE) ───
  S("CORE BLOCK", "hangingKnee", "working", 8, { rest: 0,  cue: "Cuelgas, rodillas al pecho controlado, sin balancearte" }),
  S("CORE BLOCK", "lSitTuck",    "working", 1, { duration: 15, rest: 60, cue: "15s · tuck con hombros deprimidos (no encogidos) · brazos rectos" }),
  S("CORE BLOCK", "hangingKnee", "working", 8, { rest: 0 }),
  S("CORE BLOCK", "lSitTuck",    "working", 1, { duration: 15, rest: 60 }),

  // ─── RECOVERY BLOCK ───
  S("RECOVERY BLOCK", "wallLat",        "cooldown", 1, { duration: 60, cue: "60s · de rodillas a 1m de la pared, manos altas, cadera atrás · siente estiramiento desde axilas a cadera" }),
  S("RECOVERY BLOCK", "hangingStretch", "cooldown", 1, { duration: 60, cue: "60s · dead hang pasivo, relajado, deja que la gravedad descomprima" }),
];

console.log(`\n══ STEP 4: ${SETS.length} sets template ══`);
{
  const { count } = await sb.from("workout_sets").select("id", { count: "exact", head: true }).eq("workout_id", templateWorkoutId);
  if (count && count > 0) console.log(`  · template ya tiene ${count} sets, skip`);
  else {
    const rows = SETS.map((s, i) => ({ workout_id: templateWorkoutId, user_id: null, set_order: i + 1, ...s }));
    const { error } = await sb.from("workout_sets").insert(rows);
    if (error) { console.error(error.message); process.exit(1); }
    console.log(`  ✓ ${rows.length} sets`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5. INSTANCIAS
// ════════════════════════════════════════════════════════════════════════════

async function getActiveProgramId(userId) {
  const { data } = await sb.from("programs").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
  return data?.id;
}

async function deploy(userId, label) {
  console.log(`\n  ── ${label} ──`);
  const { data: existing } = await sb.from("workouts").select("id").eq("user_id", userId).eq("scheduled_date", MIE_DATE).maybeSingle();
  if (existing) { console.log(`    · ya existe, skip`); return; }
  const programId = await getActiveProgramId(userId);
  if (!programId) { console.error(`    ✗ sin programa`); return; }
  const { data: w, error: e1 } = await sb.from("workouts").insert({
    program_id: programId, user_id: userId, scheduled_date: MIE_DATE,
    week_number: 1, day_label: "SKILL DAY", workout_type: "strength",
    estimated_duration: 78, is_completed: false, is_rest_day: false,
    coach_note: COACH_NOTE, short_on_time_note: SHORT_NOTE, mesocycle_id: null,
  }).select("id").single();
  if (e1) { console.error(e1.message); return; }
  const rows = SETS.map((s, i) => ({ workout_id: w.id, user_id: userId, set_order: i + 1, ...s }));
  const { error: e2 } = await sb.from("workout_sets").insert(rows);
  if (e2) { console.error(e2.message); return; }
  console.log(`    ✓ ${w.id.slice(0,8)} + ${rows.length} sets`);
}

console.log("\n══ STEP 5: Instancias ══");
await deploy(ANDONI, "Andoni");
await deploy(CESAR, "César");
await deploy(VICTOR, "Víctor");

console.log("\n✓ M3 MIE W1 SKILL DAY completo");
