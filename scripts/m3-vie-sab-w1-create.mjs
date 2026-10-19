/**
 * M3 VIE W1 (Upper Hypertrophy) + SÁB W1 (Lower Hypertrophy Unilateral).
 * Idempotente. Crea 18 ejercicios nuevos + 2 templates + 6 instancias.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0";
const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const VIE_DATE = "2026-06-12";
const SAB_DATE = "2026-06-13";

// ════════════════════════════════════════════════════════════════════════════
// 1. EJERCICIOS NUEVOS (18)
// ════════════════════════════════════════════════════════════════════════════

const NEW_EXERCISES = [
  // ─── VIE (10) ───
  {
    name: "Quadruped T-Spine Rotation", name_es: "Rotación Torácica en Cuadrupedia",
    category: "mobility", movement_pattern: "rotation", difficulty: "beginner", default_tempo: "2.1.1.0",
    primary_muscles: ["thoracic_spine", "obliques"],
    equipment_required: ["bodyweight"],
    description: "Movilidad activa de columna torácica desde cuadrupedia. Atleta apoya manos y rodillas, mano detrás de la nuca, rota el codo apuntando hacia el techo. Aísla la rotación al t-spine sin compensar con lumbar.",
    coaching_cue: "Cuadrupedia, manos bajo hombros, rodillas bajo cadera. Una mano detrás de la nuca. Rota el codo apuntando hacia el techo siguiendo con la mirada. Cadera estable (no rotes la pelvis). Vuelve controlado. 8 reps cada lado.",
    founder_notes: "El mejor drill para abrir t-spine antes de press o pull pesado. La rotación que NO obtienes en silla, foam roller solo no lo logra.",
  },
  {
    name: "Push-up to Alternating Toe Touch", name_es: "Flexión + Toque de Pie Alterno",
    category: "mobility", movement_pattern: "push", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["chest", "core", "hamstrings", "shoulders"],
    equipment_required: ["bodyweight"],
    description: "Combo dinámico de flexión + downward dog con rotación alterna para tocar el tobillo opuesto. Activa pecho, core, hamstring y t-spine en un solo flujo.",
    coaching_cue: "Push-up completo → empuja a downward dog (cadera arriba) → con una mano cruza para tocar el tobillo OPUESTO (rotación) → vuelve a plancha → push-up → alterna lado. 8 reps totales (4 por lado).",
    founder_notes: "Activa todo el cuerpo en menos de 1 minuto. Perfecto pre-upper body day porque despierta cadera + t-spine + cintura escapular al mismo tiempo.",
  },
  {
    name: "Half-Kneeling KB Snatch + Windmill", name_es: "Snatch + Windmill con KB en Media Rodilla",
    category: "mobility", movement_pattern: "push", difficulty: "advanced", default_tempo: null,
    primary_muscles: ["shoulders", "core", "obliques", "hip_flexors"],
    equipment_required: ["kettlebell"],
    description: "Combo: desde media rodilla, snatch de KB a posición overhead, después windmill bajando lateral con KB arriba. Trabaja estabilidad de hombro overhead + movilidad de cadera + anti-lateral flexion.",
    coaching_cue: "Media rodilla (rodilla del lado de la KB en piso). Snatch la KB del piso a overhead en un movimiento (no curl). Mantén KB overhead, brazo bloqueado. Inclina torso lateral hacia la rodilla en piso → mano libre baja a tocar el piso (windmill). Vuelve. 5 reps por lado.",
    founder_notes: "El warm-up de hombro más completo. Despierta estabilidad de hombro overhead + cadera + oblicuos. Hybrid athlete signature.",
  },
  {
    name: "Incline DB Bench Press", name_es: "Press Inclinado con Mancuerna",
    category: "strength", movement_pattern: "push", difficulty: "all_levels", default_tempo: "2.1.1.0",
    primary_muscles: ["pectoralis_major_clavicular", "anterior_deltoid", "triceps"],
    equipment_required: ["dumbbell", "bench"],
    description: "Press con mancuerna en banco inclinado a 30-45°. El ángulo cambia el énfasis al pec superior (fibras claviculares) — el músculo más olvidado del press tradicional.",
    coaching_cue: "Banco a 30-45° (no más alto o el hombro hace todo el trabajo). DBs bajan a la altura del pecho clavicular (no a la base del pecho). Codos a 45° del torso. Empuja juntando ligeramente las DBs arriba sin chocar. Escápulas retraídas todo el movimiento.",
    founder_notes: "Pec superior bien construido = ese 'shelf' superior que da forma 3D al pecho. La mayoría solo hace bench plano. El incline DB es no-negociable para hipertrofia de pec completo.",
  },
  {
    name: "DB Rotational Lateral Raise", name_es: "Elevación Lateral Rotacional con Mancuerna",
    category: "strength", movement_pattern: "push", difficulty: "intermediate", default_tempo: "2.0.2.0",
    primary_muscles: ["lateral_deltoid", "rotator_cuff"],
    equipment_required: ["dumbbell"],
    description: "Variante única de lateral raise con patrón rotacional. Atleta mantiene codos doblados a 90° fijos durante todo el movimiento. Empieza con DBs juntas a la altura inferior del pecho y las lleva en un solo movimiento a los lados de la cabeza, manteniendo brazos a 90°.",
    coaching_cue: "DBs livianas. De pie, brazos doblados a 90° (codos fijos en ese ángulo TODO el movimiento). Posición inicial: manos juntas al frente a la altura inferior del pecho, DBs apuntando al frente. En un solo movimiento, lleva las DBs en arco hacia los lados de la cabeza — los codos suben y se abren, las DBs terminan al lado de las orejas, brazos siguen a 90°. Baja controlado al inicio. Mantén 90° constante.",
    founder_notes: "Patrón único — combina rotación externa + lateral raise + carga del delt lateral en posición funcional. Construye delt lateral con un estímulo distinto al lateral raise estándar y al lean-away. Cargas livianas, foco en el patrón.",
  },
  {
    name: "Pec Deck Rear Delt Fly", name_es: "Apertura Posterior en Pec Deck",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.2.1",
    primary_muscles: ["posterior_deltoid", "rhomboids", "mid_trapezius"],
    equipment_required: ["pec_deck_machine"],
    description: "Rear delt fly en máquina pec deck usada al revés (pecho pegado al respaldo). La máquina elimina la compensación del cuerpo y permite carga pesada con tensión constante. Aislamiento puro de rear delt.",
    coaching_cue: "Sentado al revés en la pec deck (pecho pegado al respaldo, no la espalda). Agarra los handles. Codos ligeramente flexionados, fijos. Abre los brazos hacia atrás llevando los handles a tus lados — aprieta romboides arriba. Vuelve controlado contra la resistencia. Cero balanceo del torso.",
    founder_notes: "La forma más limpia de cargar rear delt — la máquina elimina la trampa que generamos en bent-over flies. Tensión constante en todo el rango.",
  },
  {
    name: "EZ Bar Preacher Curl", name_es: "Curl en Banco Predicador con Barra EZ",
    category: "accessory", movement_pattern: "pull", difficulty: "beginner", default_tempo: "2.0.2.1",
    primary_muscles: ["biceps_brachii_short_head", "brachialis"],
    equipment_required: ["ez_bar", "preacher_bench"],
    description: "Curl con barra EZ en banco predicador (banco con almohadilla inclinada que apoya los tríceps). El banco fija los brazos eliminando el momentum del torso y carga el bíceps en posición estirada — donde la cabeza corta del bíceps más responde a estímulo hipertrófico.",
    coaching_cue: "Banco predicador, tríceps apoyados firme en la almohadilla. Agarre EZ ancho moderado (palmas semi-supinadas para proteger muñeca). Baja la barra controlado hasta extensión casi completa (estira el bíceps). Curl hasta arriba apretando bíceps. Cero balanceo del torso o de los hombros.",
    founder_notes: "El curl que carga la cabeza corta del bíceps en estiramiento. Si no entrenas el bíceps en stretch, dejas el 30% del crecimiento en la mesa.",
  },
  {
    name: "Cable Overhead Tricep Extension (rope)", name_es: "Extensión de Tríceps Overhead con Cable y Cuerda",
    category: "accessory", movement_pattern: "push", difficulty: "intermediate", default_tempo: "2.0.2.0",
    primary_muscles: ["triceps_long_head"],
    equipment_required: ["cable_machine", "rope_attachment"],
    description: "Extensión de tríceps con cable overhead usando cuerda. Atleta de espaldas a la polea baja, cuerda jalada por encima de la cabeza, codos apuntando al frente. Estira el tríceps largo en posición elongada — donde más responde a tensión hipertrófica (Maeo et al. 2022).",
    coaching_cue: "Cable bajo, cuerda enganchada. De espaldas a la polea. Toma la cuerda y llévala por encima de la cabeza con los codos apuntando al frente, brazos doblados detrás del cráneo. Codos fijos, NO se abren. Extiende los brazos al frente — la cuerda termina arriba al frente, manos separadas. Aprieta el tríceps. Baja controlado al estiramiento profundo del tríceps largo.",
    founder_notes: "El tríceps largo se hipertrofia mejor en posición elongada (overhead). Si solo haces pushdown (codo al lado), trabajas la cabeza lateral pero dejas la larga subdesarrollada. Este ejercicio cierra ese hueco.",
  },
  {
    name: "Weighted Dip", name_es: "Fondo con Lastre",
    category: "strength", movement_pattern: "push", difficulty: "intermediate", default_tempo: "2.0.1.0",
    primary_muscles: ["chest_lower", "triceps", "anterior_deltoid"],
    equipment_required: ["dip_bars", "weight_belt"],
    description: "Fondo en barras paralelas con peso adicional vía cinturón de dip + cadena + disco/KB. Compound clásico de pecho + tríceps + hombro front. Con tronco ligeramente inclinado adelante hay énfasis en pecho; vertical hay énfasis en tríceps.",
    coaching_cue: "Cinturón de dip con cadena + lastre (disco o KB). En barras paralelas, brazos extendidos. Tronco ligeramente inclinado adelante para énfasis pecho (no totalmente vertical). Baja controlado hasta que los hombros queden nivelados con los codos (no más abajo — protege el hombro). Empuja arriba apretando pecho + tríceps. Codos siguen el cuerpo, no se abren.",
    founder_notes: "El compound más subestimado para pecho/tríceps. Con lastre, carga progresiva real. Pasa de 0 → 20+ kg colgando en pocos meses. Si tu Weighted Dip de 6 reps no sube, tu pecho/tríceps tampoco.",
  },
  {
    name: "Incline Walk steady pace", name_es: "Caminata Inclinada Ritmo Constante",
    category: "conditioning", movement_pattern: "locomotion", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["heart", "glutes", "calves"],
    equipment_required: ["treadmill"],
    description: "Caminata en caminadora con incline 12-15%, ritmo conversacional. Z2 cardio (HR 130-145). Construye motor cardiovascular base sin agredir CNS ni articulaciones. Recovery activa.",
    coaching_cue: "Caminadora a 12-15% incline. Velocidad cómoda — debes poder hablar pero no cantar. 15 min steady. NO te agarres del manubrio (caminas con tus piernas). Postura erguida, pecho arriba. Si tu HR pasa 145, baja velocidad. Si está por debajo de 125, sube velocidad o incline.",
    founder_notes: "Z2 cardio = el secreto silencioso de los hybrid athletes. Construye base aeróbica sin saturar CNS. 15 min después de upper day = recovery cardiovascular real. Opcional en W1 — incorporarlo es lo que diferencia.",
  },
  // ─── SÁB (8) ───
  {
    name: "Lateral Bound", name_es: "Salto Lateral Unilateral",
    category: "strength", movement_pattern: "squat", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["glutes", "quads", "adductors", "hamstrings"],
    equipment_required: ["bodyweight"],
    description: "Salto plyo unilateral lateral. Atleta empuja desde una pierna lateralmente y aterriza en la pierna opuesta manteniendo estabilidad. Desarrolla potencia unilateral + estabilidad de cadera + reactividad para deportes y patrones unilaterales pesados.",
    coaching_cue: "De pie en una pierna. Empuja explosivamente hacia el lado, vuelas en el aire y aterrizas en la OTRA pierna. Aterrizaje suave (amortigua con cadera + rodilla), pausa 1s estable. Salto al otro lado. 5 reps por lado alternando.",
    founder_notes: "El plyo unilateral que despierta CNS para Bulgarian Split Squat o cualquier día unilateral pesado. Sin esto, tu cadera no está lista para cargar con barra en una pierna.",
  },
  {
    name: "Kang Squat", name_es: "Kang Squat",
    category: "mobility", movement_pattern: "squat", difficulty: "intermediate", default_tempo: null,
    primary_muscles: ["glutes", "hamstrings", "lower_back", "quads"],
    equipment_required: ["bodyweight"],
    description: "Combo de squat + Romanian deadlift en un solo flujo. Atleta baja en squat, mantiene posición y se levanta a RDL (extiende rodillas, queda en hinge), después vuelve a squat y se para. Patrón compuesto que graba squat y hinge sin carga.",
    coaching_cue: "De pie, bodyweight. (1) Baja en squat profundo. (2) Sin levantarte, extiende las rodillas → quedas en posición de RDL profundo (cadera arriba, espalda paralela, piernas casi rectas). (3) Vuelve a bajar a squat doblando rodillas. (4) Levántate normal del squat. Eso es 1 rep. 6 reps controladas.",
    founder_notes: "El warm-up del bodybuilder antiguo. Graba squat + hinge + cadera + espalda en posiciones extremas. Perfecto pre-Bulgarian + RDL.",
  },
  {
    name: "Barbell Bulgarian Split Squat", name_es: "Sentadilla Búlgara con Barra",
    category: "strength", movement_pattern: "squat", difficulty: "advanced", default_tempo: "2.1.1.0",
    primary_muscles: ["quads", "glute_max", "glute_medius", "hamstrings"],
    equipment_required: ["barbell", "bench"],
    description: "Sentadilla unilateral con barra libre sobre los hombros (back squat position), pie trasero elevado en banco. La carga con barra libre desafía estabilidad + balance al máximo, además de cargar más peso que la versión con DBs.",
    coaching_cue: "Barra libre sobre los hombros (back squat position, no front). Pie trasero elevado en banco o caja. Pie de adelante un paso largo del banco. Torso ligeramente inclinado adelante. Baja controlada hasta que el muslo de adelante quede paralelo al piso (o cerca). Empuja el piso con el pie de adelante. Si pierdes balance, baja peso o usa landmine como sustituto.",
    founder_notes: "Versión elite del Bulgarian. La estabilidad con barra libre añade demanda neural enorme — construye glute medio + propriocepción + fuerza unilateral real. El día que cargas tu Bulgarian con barra al 50% de tu back squat, eres otro atleta.",
  },
  {
    name: "Snatch-Grip Romanian Deadlift", name_es: "Peso Muerto Rumano con Agarre Snatch",
    category: "strength", movement_pattern: "hinge", difficulty: "intermediate", default_tempo: "3.0.1.0",
    primary_muscles: ["glutes", "hamstrings", "upper_back", "traps", "lats", "grip"],
    equipment_required: ["barbell"],
    description: "RDL con agarre snatch (muy ancho, manos casi en los discos). El agarre ancho carga upper back + traps + lats al mismo tiempo que glute + ham. Hybrid athlete signature.",
    coaching_cue: "Agarre snatch (ancho, manos casi en los discos). Bisagra de cadera profunda, espalda neutral, lats apretados (axilas activas). Baja la barra controlado hasta el medio de la espinilla (estiramiento del ham). Sube empujando la cadera al frente, apretando glúteo arriba. El agarre ancho jala los hombros hacia adelante — resiste con upper back fuerte.",
    founder_notes: "Carga 6 grupos musculares en un solo ejercicio. Grip se desarrolla por necesidad. Marcus Filly territory. Si dominas Snatch-Grip RDL pesado, los pulls de la barra de cualquier estilo te salen.",
  },
  {
    name: "DB Walking Lunges", name_es: "Desplantes Caminando con Mancuerna",
    category: "strength", movement_pattern: "squat", difficulty: "all_levels", default_tempo: "2.0.1.0",
    primary_muscles: ["quads", "glute_max", "hamstrings", "core"],
    equipment_required: ["dumbbell"],
    description: "Walking lunges con DB pesadas en cada mano. Atleta camina dando pasos largos en lunge alterno, bajando rodilla trasera casi al piso. Combina hipertrofia unilateral + balance + conditioning.",
    coaching_cue: "DB en cada mano, brazos colgando. Paso LARGO hacia adelante (no corto — paso largo enfatiza glúteo, paso corto enfatiza quad). Baja hasta que la rodilla trasera casi toque el piso. Empuja con el pie de adelante para levantarte y dar el siguiente paso. Alterna piernas. 12 reps por lado = 24 totales.",
    founder_notes: "El compound unilateral más versátil. Walking (no static) añade un componente dinámico y conditioning suave. Con DBs pesadas en hipertrofia rep range = volumen serio.",
  },
  {
    name: "Cable Pull-Through", name_es: "Pull-Through con Cable",
    category: "accessory", movement_pattern: "hinge", difficulty: "beginner", default_tempo: "2.0.2.0",
    primary_muscles: ["glutes", "hamstrings"],
    equipment_required: ["cable_machine", "rope_attachment"],
    description: "Hinge con cable bajo + cuerda pasando entre las piernas. Atleta de espaldas a la polea, baja en hinge profundo con la cuerda entre las piernas y se levanta extendiendo cadera. Aísla glúteo desde ángulo horizontal — patrón del hip thrust pero con cable.",
    coaching_cue: "Cable bajo con cuerda. De espaldas a la polea, cuerda pasando entre las piernas y agarrada con las dos manos. Da 2 pasos al frente para tensar el cable. Hinge: empuja la cadera hacia atrás (la cuerda jala hacia la polea), espalda neutral. Vuelve extendiendo cadera al frente apretando glúteo arriba. NO es squat — es hinge puro.",
    founder_notes: "Mejor que el RDL para aislar glúteo solo. La tensión horizontal del cable carga glúteo en hip extension sin demandar lumbar. Perfecto cierre de glute volume.",
  },
  {
    name: "Standing Calf Raise pause-at-top", name_es: "Elevación de Pantorrilla de Pie con Pausa",
    category: "accessory", movement_pattern: "push", difficulty: "beginner", default_tempo: "2.1.1.1",
    primary_muscles: ["gastrocnemius", "soleus"],
    equipment_required: ["dumbbell"],
    description: "Calf raise de pie con pausa de 1s arriba en cada rep. La pausa carga el calf en la posición acortada que es donde más responde a contracción. Para hipertrofia de gastrocnemius real.",
    coaching_cue: "De pie con DB en cada mano (o en máquina). Punta de los pies en un escalón o disco, talones colgando. Baja controlado hasta estiramiento completo del calf. Sube empujando con la planta del pie hasta máxima contracción. <strong>Pausa 1 segundo arriba apretando el calf</strong>. Baja controlado. Repite.",
    founder_notes: "El calf SOLO crece con pausa arriba + rango completo + reps altas. Sin pausa, ROM corto = calf flaco. 15 reps con pausa = receta hipertrófica honesta.",
  },
  {
    name: "Farmer Carry", name_es: "Caminata del Granjero",
    category: "strength", movement_pattern: "carry", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["grip", "traps", "core", "shoulders", "glutes"],
    equipment_required: ["dumbbell"],
    description: "Caminata cargando una DB o KB pesada en cada mano. Construye grip + traps + estabilidad de hombro + core + glúteo. El cierre clásico del hybrid athlete.",
    coaching_cue: "DB pesada en cada mano (o KB), brazos colgando. Postura erguida — pecho arriba, hombros atrás (no encojas). Pasos a buen ritmo SIN correr. Camina los 20m manteniendo postura. Si la postura se rompe (hombros suben, te encorvas), peso muy alto.",
    founder_notes: "El carry pillar del hybrid athlete — grip + posture + indestructibility. Más allá de músculo, construye 'estar listo para cualquier cosa'. Si no haces carry pesado regularmente, no eres atleta funcional, solo gymrat.",
  },
];

console.log("══ STEP 1: Ejercicios nuevos ══\n");
for (const e of NEW_EXERCISES) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", e.name).maybeSingle();
  if (existing) { console.log(`  · "${e.name}" ya existe, skip`); continue; }
  const { error } = await sb.from("exercises").insert({ ...e, is_active: true });
  if (error) { console.error(`  ✗ ERROR "${e.name}":`, error.message); process.exit(1); }
  console.log(`  ✓ "${e.name}"`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. RESOLVER IDS
// ════════════════════════════════════════════════════════════════════════════

async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!data) throw new Error(`Exercise not found: ${name}`);
  return data.id;
}

// All ex IDs we need
const EX = {
  // VIE
  thoracicFoam: await exId("Thoracic Extension over Foam Roller"),
  qpTSpineRot: await exId("Quadruped T-Spine Rotation"),
  pushupToeTouch: await exId("Push-up to Alternating Toe Touch"),
  bandedFacePull: await exId("Banded Face Pull"),
  bearCrab: await exId("Bear to Low Crab Transition"),
  kbSnatchWindmill: await exId("Half-Kneeling KB Snatch + Windmill"),
  inclineDbBench: await exId("Incline DB Bench Press"),
  csRow: await exId("Chest Supported DB Row"),
  rotLateralRaise: await exId("DB Rotational Lateral Raise"),
  pecDeckRear: await exId("Pec Deck Rear Delt Fly"),
  preacherCurl: await exId("EZ Bar Preacher Curl"),
  cableOhTri: await exId("Cable Overhead Tricep Extension (rope)"),
  weightedDip: await exId("Weighted Dip"),
  inclineWalk: await exId("Incline Walk steady pace"),
  scorpion: await exId("Scorpion Stretch"),
  latDoorway: await exId("Lat Stretch Doorway"),
  ohTriStretch: await exId("Overhead Tricep Stretch"),
  // SAB
  hip90: await exId("90/90 Hip Switches"),
  ankleStretch: await exId("Weighted Ankle Stretch"),
  gluteBridgeMarch: await exId("Glute Bridge March"),
  bandedLateralWalk: await exId("Banded Lateral Walk"),
  lateralBound: await exId("Lateral Bound"),
  kangSquat: await exId("Kang Squat"),
  barbellBulgarian: await exId("Barbell Bulgarian Split Squat"),
  sgRdl: await exId("Snatch-Grip Romanian Deadlift"),
  dbWalkingLunges: await exId("DB Walking Lunges"),
  cablePullThrough: await exId("Cable Pull-Through"),
  sledPush: await exId("Sled Push"),
  calfRaise: await exId("Standing Calf Raise pause-at-top"),
  farmerCarry: await exId("Farmer Carry"),
  pigeon: await exId("Pigeon"),
  couch: await exId("Couch Stretch"),
  frog: await exId("Frog Stretch"),
  catCow: await exId("Cat-Cow Reach"),
};

// ════════════════════════════════════════════════════════════════════════════
// 3. SETS HELPERS
// ════════════════════════════════════════════════════════════════════════════

function S(block_label, exKey, set_type, planned_reps, opts = {}) {
  return {
    exercise_id: EX[exKey],
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

// ════════════════════════════════════════════════════════════════════════════
// 4. VIE W1 — Upper Hypertrophy + Strength
// ════════════════════════════════════════════════════════════════════════════

const VIE_COACH_NOTE = "Upper Hypertrophy + Strength. Foco: pecho superior, back density, hombro 3D, brazos en stretch, dip pesado. Incline DB Bench 3×10 + Chest-Supported Row 3×10 (heavies en 3 sets en W1 BASE, sube a 4 en W2). Shoulder 3D: Rotational Lateral Raise + Pec Deck Rear Delt 3 rondas. Arm: Preacher + Cable Overhead Tricep 3 rondas (par en stretch). Cierre: Weighted Dip 3×6 — establecer base. Opcional Z2 caminadora 15 min. Recovery: Scorpion + Lat Doorway + Overhead Tricep.";
const VIE_SHORT_NOTE = "¿Apretado de tiempo? Prioridad: Heavy Push + Heavy Pull + Shoulder 3D + Arm Superset. Si te quedan 10 min, mete el Weighted Dip. Salta el Z2. Nunca saltes Recovery.";

const VIE_SETS = [
  // PRIME (6 sets, 2 rondas)
  S("PRIME BLOCK", "thoracicFoam",     "warmup", 10, { cue: "Mobility t-spine | 2 rondas · foam roller bajo escápulas, brazos detrás" }),
  S("PRIME BLOCK", "qpTSpineRot",      "warmup", 8,  { cue: "2 rondas · 8 por lado · cuadrupedia, mano a la nuca, codo rota al techo" }),
  S("PRIME BLOCK", "pushupToeTouch",   "warmup", 8,  { cue: "Activación push/pull | 2 rondas · push-up → toca tobillo opuesto cruzando" }),
  S("PRIME BLOCK", "bandedFacePull",   "warmup", 15, { cue: "2 rondas · liga a la altura de la cara, aperturas con rotación externa al final" }),
  S("PRIME BLOCK", "bearCrab",         "warmup", 6,  { cue: "Dinámicos CNS | 2 rondas · Beast → Crab → vuelve · controla cadera" }),
  S("PRIME BLOCK", "kbSnatchWindmill", "warmup", 5,  { cue: "2 rondas · 5 por lado · KB snatch a overhead → windmill manteniendo KB arriba" }),
  // HEAVY PUSH (3 sets)
  S("HEAVY PUSH", "inclineDbBench", "working", 10, { tempo: "2-1-1-0", rpe: 7.5, rest: 90, cue: "Banco 30-45° · DBs bajan a pecho clavicular · codos a 45° · W1 BASE técnica primero" }),
  S("HEAVY PUSH", "inclineDbBench", "working", 10, { tempo: "2-1-1-0", rpe: 7.5, rest: 90 }),
  S("HEAVY PUSH", "inclineDbBench", "working", 10, { tempo: "2-1-1-0", rpe: 8, rest: 90 }),
  // HEAVY PULL (3 sets)
  S("HEAVY PULL", "csRow", "working", 10, { rpe: 8, rest: 90, cue: "Pecho apoyado en banco 30° · codo va al costado (no al techo) · aprieta romboides arriba" }),
  S("HEAVY PULL", "csRow", "working", 10, { rpe: 8, rest: 90 }),
  S("HEAVY PULL", "csRow", "working", 10, { rpe: 8, rest: 90 }),
  // SHOULDER 3D superset (6 sets, 3 rondas)
  S("SHOULDER 3D", "rotLateralRaise", "superset", 12, { rest: 0,  cue: "DBs livianas · brazos a 90° fijos · juntas bajo pecho → arco a los lados de la cabeza manteniendo 90°" }),
  S("SHOULDER 3D", "pecDeckRear",     "superset", 12, { rest: 60, cue: "Pec deck al revés · pecho contra respaldo · aperturas hacia atrás apretando romboides" }),
  S("SHOULDER 3D", "rotLateralRaise", "superset", 12, { rest: 0 }),
  S("SHOULDER 3D", "pecDeckRear",     "superset", 12, { rest: 60 }),
  S("SHOULDER 3D", "rotLateralRaise", "superset", 12, { rest: 0 }),
  S("SHOULDER 3D", "pecDeckRear",     "superset", 12, { rest: 60 }),
  // ARM SUPERSET (6 sets, 3 rondas)
  S("ARM SUPERSET", "preacherCurl", "superset", 10, { rest: 0,  cue: "Banco predicador · tríceps apoyados · agarre EZ ancho moderado · estiramiento profundo abajo" }),
  S("ARM SUPERSET", "cableOhTri",   "superset", 12, { rest: 75, cue: "Cable bajo + cuerda · de espaldas a polea · cuerda overhead · codos al frente · estira tríceps largo abajo" }),
  S("ARM SUPERSET", "preacherCurl", "superset", 10, { rest: 0 }),
  S("ARM SUPERSET", "cableOhTri",   "superset", 12, { rest: 75 }),
  S("ARM SUPERSET", "preacherCurl", "superset", 10, { rest: 0 }),
  S("ARM SUPERSET", "cableOhTri",   "superset", 12, { rest: 75 }),
  // STRENGTH COMPOUND (3 sets)
  S("STRENGTH COMPOUND", "weightedDip", "working", 6, { rpe: 8, rest: 120, cue: "Cinturón de dip + lastre · tronco ligeramente inclinado adelante para pecho · baja hasta hombros nivel codos · W1 BASE establece base" }),
  S("STRENGTH COMPOUND", "weightedDip", "working", 6, { rpe: 8, rest: 120 }),
  S("STRENGTH COMPOUND", "weightedDip", "working", 6, { rpe: 8, rest: 120 }),
  // OPCIONAL Z2 (1 set)
  S("OPCIONAL · Z2", "inclineWalk", "working", 1, { duration: 900, cue: "OPCIONAL · 15 min · caminadora 12-15% incline · HR 130-145 · ritmo conversacional · si no tienes tiempo salta sin culpa" }),
  // RECOVERY (3 sets)
  S("RECOVERY BLOCK", "scorpion",     "cooldown", 1, { duration: 60, cue: "60s por lado · pierna cruza al lado opuesto, hombro pegado al piso" }),
  S("RECOVERY BLOCK", "latDoorway",   "cooldown", 1, { duration: 60, cue: "60s por lado · mano alta en el marco, cadera atrás, estira axila a cadera" }),
  S("RECOVERY BLOCK", "ohTriStretch", "cooldown", 1, { duration: 45, cue: "45s por lado · brazo overhead, codo apunta al techo, otra mano jala codo" }),
];

// ════════════════════════════════════════════════════════════════════════════
// 5. SÁB W1 — Lower Hypertrophy Unilateral + Engine + Carry
// ════════════════════════════════════════════════════════════════════════════

const SAB_COACH_NOTE = "Lower Hypertrophy Unilateral + Engine + Carry. Barbell Bulgarian Split Squat 4×8/lado como signature del día (barra libre — primera curva de aprendizaje). Snatch-Grip RDL 3×8 — hybrid signature (upper back + glute + ham + grip). Glute Volume: DB Walking Lunges + Cable Pull-Through 3 rondas. Leg Engine: Sled Push 3×25m (CERO eccentric, recovery friendly). Calf entra primera vez: Standing Calf Raise pause + Farmer Carry 3 rondas (pillar carry). Recovery: Pigeon + Couch + Frog + Cat-Cow.";
const SAB_SHORT_NOTE = "¿Apretado de tiempo? Prioridad: Bulgarian + Snatch-Grip + Glute Volume. Si te quedan 15 min, mete Sled Push. Salta Calf+Carry y Recovery NO. Carry y stretch son no-negociables.";

const SAB_SETS = [
  // PRIME (6 sets, 2 rondas)
  S("PRIME BLOCK", "hip90",              "warmup", 5,  { cue: "Mobility cadera + tobillo | 2 rondas · 5 por lado · rotación interna/externa de cadera, sentado en piso" }),
  S("PRIME BLOCK", "ankleStretch",       "warmup", 1,  { duration: 60, cue: "60s por lado · hold en stretch position de dorsiflexión, no CARs · abre tobillo para sentadilla profunda" }),
  S("PRIME BLOCK", "gluteBridgeMarch",   "warmup", 10, { cue: "Activación glúteo | 2 rondas · puente arriba, alterna piernas marchando" }),
  S("PRIME BLOCK", "bandedLateralWalk",  "warmup", 10, { cue: "2 rondas · 10 por lado · paso corto, liga en tobillos o rodillas, mantén tensión" }),
  S("PRIME BLOCK", "lateralBound",       "warmup", 5,  { cue: "Dinámicos CNS | 2 rondas · 5 por lado · empuja explosivo de una pierna, aterriza en la otra, estable 1s" }),
  S("PRIME BLOCK", "kangSquat",          "warmup", 6,  { cue: "2 rondas · bodyweight · baja squat → extiende rodillas a RDL profundo → vuelve squat → up" }),
  // HEAVY A · Barbell Bulgarian Split Squat (4 sets × 8/lado)
  S("HEAVY A", "barbellBulgarian", "working", 8, { tempo: "2-1-1-0", rpe: 7.5, rest: 180, cue: "8 por lado · barra libre en back squat · pie trasero elevado en banco · torso ligeramente inclinado adelante · W1 BASE carga conservadora, balance es la curva de aprendizaje" }),
  S("HEAVY A", "barbellBulgarian", "working", 8, { tempo: "2-1-1-0", rpe: 7.5, rest: 180 }),
  S("HEAVY A", "barbellBulgarian", "working", 8, { tempo: "2-1-1-0", rpe: 8, rest: 180 }),
  S("HEAVY A", "barbellBulgarian", "working", 8, { tempo: "2-1-1-0", rpe: 8, rest: 180 }),
  // HEAVY B · Snatch-Grip RDL (3 sets)
  S("HEAVY B", "sgRdl", "working", 8, { tempo: "3-0-1-0", rpe: 7.5, rest: 120, cue: "Agarre snatch ancho (manos casi en discos) · bisagra profunda · lats apretados · barra baja al medio espinilla · sube apretando glúteo arriba" }),
  S("HEAVY B", "sgRdl", "working", 8, { tempo: "3-0-1-0", rpe: 7.5, rest: 120 }),
  S("HEAVY B", "sgRdl", "working", 8, { tempo: "3-0-1-0", rpe: 8, rest: 120 }),
  // GLUTE VOLUME superset (6 sets, 3 rondas)
  S("GLUTE VOLUME", "dbWalkingLunges",  "superset", 12, { rest: 0,  cue: "12 por lado · 24 totales · DB pesada en cada mano · PASO LARGO (énfasis glúteo) · rodilla trasera casi toca piso" }),
  S("GLUTE VOLUME", "cablePullThrough", "superset", 12, { rest: 90, cue: "Cable bajo + cuerda · de espaldas a polea · cuerda entre las piernas · hinge profundo, vuelve apretando glúteo arriba" }),
  S("GLUTE VOLUME", "dbWalkingLunges",  "superset", 12, { rest: 0 }),
  S("GLUTE VOLUME", "cablePullThrough", "superset", 12, { rest: 90 }),
  S("GLUTE VOLUME", "dbWalkingLunges",  "superset", 12, { rest: 0 }),
  S("GLUTE VOLUME", "cablePullThrough", "superset", 12, { rest: 90 }),
  // LEG ENGINE · Sled Push (3 sets)
  S("LEG ENGINE", "sledPush", "working", 1, { rest: 90, cue: "25m pesado · sled cargado · mango bajo · empuja con triple extensión + paso explosivo · cero eccentric, recovery friendly" }),
  S("LEG ENGINE", "sledPush", "working", 1, { rest: 90 }),
  S("LEG ENGINE", "sledPush", "working", 1, { rest: 90 }),
  // CALF + CARRY superset (6 sets, 3 rondas)
  S("CALF + CARRY", "calfRaise",   "superset", 15, { rest: 0,  cue: "DB en cada mano · punta en escalón, talones cuelgan · pausa 1s arriba apretando · ROM completo" }),
  S("CALF + CARRY", "farmerCarry", "superset", 1,  { rest: 60, duration: 30, cue: "20m heavy · DBs pesadas (o KBs) · postura erguida, pecho arriba, hombros atrás · grip firme, NO correr" }),
  S("CALF + CARRY", "calfRaise",   "superset", 15, { rest: 0 }),
  S("CALF + CARRY", "farmerCarry", "superset", 1,  { rest: 60, duration: 30 }),
  S("CALF + CARRY", "calfRaise",   "superset", 15, { rest: 0 }),
  S("CALF + CARRY", "farmerCarry", "superset", 1,  { rest: 60, duration: 30 }),
  // RECOVERY (4 sets)
  S("RECOVERY BLOCK", "pigeon",  "cooldown", 1, { duration: 90, cue: "90s por lado · pierna doblada al frente, otra extendida atrás · pecho avanza" }),
  S("RECOVERY BLOCK", "couch",   "cooldown", 1, { duration: 90, cue: "90s por lado · pie atrás en pared, otra rodilla doblada al frente · estira psoas + quad" }),
  S("RECOVERY BLOCK", "frog",    "cooldown", 1, { duration: 90, cue: "90s · rodillas anchas, cadera atrás, antebrazos en piso · estira adductores" }),
  S("RECOVERY BLOCK", "catCow",  "cooldown", 1, { duration: 90, cue: "90s · alterna lento entre flexión (cat) y extensión (cow) · respira con cada transición" }),
];

// ════════════════════════════════════════════════════════════════════════════
// 6. CREATE WORKOUTS
// ════════════════════════════════════════════════════════════════════════════

async function getActiveProgramId(userId) {
  const { data } = await sb.from("programs").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
  return data?.id;
}

async function createDay({ label, date, dayLabel, coachNote, shortNote, sets, duration }) {
  console.log(`\n══ ${label} (${date}) ══\n`);

  // Template
  const { data: existing } = await sb.from("workouts").select("id").is("user_id", null).eq("mesocycle_id", M3_ID).eq("week_number", 1).eq("day_label", `W1 ${dayLabel}`).maybeSingle();
  let templateId;
  if (existing) { templateId = existing.id; console.log(`  · template ya existe`); }
  else {
    const { data: w, error } = await sb.from("workouts").insert({
      program_id: PROGRAM_TEMPLATE_ID, user_id: null, scheduled_date: date,
      week_number: 1, day_label: `W1 ${dayLabel}`, workout_type: "strength",
      estimated_duration: duration, is_completed: false, is_rest_day: false,
      coach_note: coachNote, short_on_time_note: shortNote, mesocycle_id: M3_ID,
    }).select("id").single();
    if (error) { console.error(error.message); process.exit(1); }
    templateId = w.id;
    console.log(`  ✓ template → ${templateId.slice(0,8)}`);
  }

  // Template sets
  const { count: tplCount } = await sb.from("workout_sets").select("id", { count: "exact", head: true }).eq("workout_id", templateId);
  if (tplCount && tplCount > 0) console.log(`  · template sets ya existen (${tplCount})`);
  else {
    const rows = sets.map((s, i) => ({ workout_id: templateId, user_id: null, set_order: i + 1, ...s }));
    const { error } = await sb.from("workout_sets").insert(rows);
    if (error) { console.error(error.message); process.exit(1); }
    console.log(`  ✓ ${rows.length} sets template`);
  }

  // Instancias
  for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
    const { data: existInst } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", date).maybeSingle();
    if (existInst) { console.log(`    · ${name} ya tiene workout`); continue; }
    const programId = await getActiveProgramId(uid);
    if (!programId) { console.error(`    ✗ ${name} sin programa activo`); continue; }
    const { data: w, error: e1 } = await sb.from("workouts").insert({
      program_id: programId, user_id: uid, scheduled_date: date,
      week_number: 1, day_label: dayLabel, workout_type: "strength",
      estimated_duration: duration, is_completed: false, is_rest_day: false,
      coach_note: coachNote, short_on_time_note: shortNote, mesocycle_id: null,
    }).select("id").single();
    if (e1) { console.error(`    ✗ ${name}:`, e1.message); continue; }
    const rows = sets.map((s, i) => ({ workout_id: w.id, user_id: uid, set_order: i + 1, ...s }));
    const { error: e2 } = await sb.from("workout_sets").insert(rows);
    if (e2) { console.error(`    ✗ ${name} sets:`, e2.message); continue; }
    console.log(`    ✓ ${name} → ${w.id.slice(0, 8)} + ${rows.length} sets`);
  }
}

await createDay({
  label: "VIE W1 · Upper Hypertrophy + Strength",
  date: VIE_DATE,
  dayLabel: "UPPER HYPERTROPHY",
  coachNote: VIE_COACH_NOTE,
  shortNote: VIE_SHORT_NOTE,
  sets: VIE_SETS,
  duration: 72,
});

await createDay({
  label: "SÁB W1 · Lower Hypertrophy Unilateral + Engine + Carry",
  date: SAB_DATE,
  dayLabel: "LOWER HYPERTROPHY",
  coachNote: SAB_COACH_NOTE,
  shortNote: SAB_SHORT_NOTE,
  sets: SAB_SETS,
  duration: 85,
});

console.log("\n✓ VIE + SÁB W1 creados");
