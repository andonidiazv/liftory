/**
 * M3 MAR W1 Tempo Day — crear template + instancias para Andoni, César, Víctor.
 *
 * Pasos:
 *  1. Crear 6 ejercicios nuevos
 *  2. Renombrar 5 existentes al spec del HTML
 *  3. Crear template workout (admin)
 *  4. Crear 31 sets en template
 *  5. Crear instancia para Andoni / César / Víctor (2026-06-09)
 *  6. Replicar 31 sets en cada instancia
 *
 * Idempotente.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PROGRAM_TEMPLATE_ID = "32302803-ead8-4e08-809a-606031a7b7e0";
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
const MAR_DATE = "2026-06-09";

// ════════════════════════════════════════════════════════════════════════════
// 1. EJERCICIOS NUEVOS
// ════════════════════════════════════════════════════════════════════════════

const NEW_EXERCISES = [
  {
    name: "Squat Priming Flow", name_es: "Flow de Activación de Sentadilla",
    category: "mobility", movement_pattern: "squat", difficulty: "beginner", default_tempo: null,
    primary_muscles: ["quadriceps", "glutes", "calves"],
    equipment_required: ["bodyweight"],
    description: "Secuencia de 3 partes sin descanso: Bottom of Squat Hold 20s (rango profundo) → Squat Pulses 20s (resistencia isométrica al rango) → Squat Jumps × 5 (output reactivo). Prepara el patrón de sentadilla para tempo work.",
    coaching_cue: "Bottom of Squat Hold (20s): sentadilla profunda, talones en el piso, codos empujando rodillas hacia afuera. Squat Pulses (20s): desde el fondo, pulsos cortos 5cm arriba/abajo sin salir del rango. Squat Jumps (× 5): explotas verticalmente, aterrizas suave en sentadilla. Sin descanso entre los 3.",
    founder_notes: "El priming honesto antes de Front Squat tempo. El cuerpo necesita las 3 cualidades — rango, resistencia al rango, output — para pasar de cero a tempo eccéntrico sin lesionarse.",
  },
  {
    name: "Bodyweight RDL", name_es: "Peso Muerto Rumano con Peso Corporal",
    category: "mobility", movement_pattern: "hinge", difficulty: "beginner", default_tempo: "3.0.1.0",
    primary_muscles: ["hamstrings", "glutes", "lower_back"],
    equipment_required: ["bodyweight"],
    description: "RDL sin carga para grabar el patrón de bisagra de cadera antes de levantar pesado. Atleta de pie, brazos extendidos al frente, bisagra de cadera con rodilla ligeramente flexionada, torso baja paralelo al piso, espalda neutral.",
    coaching_cue: "De pie, pies al ancho de cadera, rodillas ligeramente flexionadas (sin bloquear). Empuja la cadera hacia atrás como si cerraras una puerta con el glúteo. El torso baja como bloque sólido — espalda neutral. Bajas hasta donde sientas estiramiento de hamstring sin perder neutralidad lumbar. Sube apretando glúteo.",
    founder_notes: "Pre-requisito para Nordic y para el día de hinges. Si no puedes hacer RDL sin peso con buena bisagra de cadera, no estás listo para ninguna versión con carga.",
  },
  {
    name: "Smith Machine Hip Thrust", name_es: "Hip Thrust en Máquina Smith",
    category: "strength", movement_pattern: "hinge", difficulty: "intermediate", default_tempo: "2.2.1.0",
    primary_muscles: ["glutes", "hamstrings"],
    equipment_required: ["smith_machine", "bench"],
    description: "Hip Thrust ejecutado en máquina Smith en lugar de barbell libre. La barra fija de la Smith elimina la inestabilidad lateral y permite cargas máximas con setup más eficiente. Idéntico patrón al BB Hip Thrust pero con riel guiado.",
    coaching_cue: "Espalda alta apoyada en banco, banca perpendicular al cuerpo. Barra de Smith sobre las crestas ilíacas (usa pad de protección). Pies al ancho de cadera, debajo de las rodillas cuando estás arriba. Empuja con los talones. Arriba: cadera fully extended, glúteo apretado, costillas abajo. Pausa 2s arriba. Baja controlado.",
    founder_notes: "El BB Hip Thrust libre requiere mucho tiempo de setup y dominar el balance lateral de la barra. Smith permite que el atleta se enfoque 100% en cargar pesado y ejecutar el patrón limpio. Signature de glute development en M3 Tempo Day.",
  },
  {
    name: "Reverse Sit Up", name_es: "Sit Up Inverso",
    category: "accessory", movement_pattern: "core", difficulty: "intermediate", default_tempo: "2.0.2.0",
    primary_muscles: ["abs", "hip_flexors", "core"],
    equipment_required: ["pull_up_bar"],
    description: "Acostado en piso, brazos extendidos overhead agarrado de un poste/soporte/barra fija. Atleta lleva rodillas al pecho y luego extiende las piernas elevando la cadera del suelo hasta full extension, solo la espalda alta en contacto con el piso. Regresa controlado a la posición inicial sin que pies o piernas toquen el piso.",
    coaching_cue: "Acostado boca arriba, brazos extendidos detrás de la cabeza agarrado firme de un poste/barra/soporte. Piernas extendidas a unos centímetros del piso. Lleva las rodillas al pecho contrayendo abs. Desde rodillas al pecho, extiende las piernas hacia arriba elevando la cadera del piso — solo la espalda alta queda apoyada. Aprieta abs en el punto más alto. Regresa controlado bajando piernas + cadera SIN que pies o piernas toquen piso entre reps.",
    founder_notes: "Core funcional con grip overhead — entrena abs + hip flexors + estabilidad escapular en un solo patrón. Reemplaza al Pallof Press en MAR Tempo Day por ser más creativo y de cuerpo entero.",
  },
  {
    name: "Weighted Lateral Plank Dinámico", name_es: "Plancha Lateral Dinámica con Peso",
    category: "accessory", movement_pattern: "core", difficulty: "advanced", default_tempo: null,
    primary_muscles: ["core", "obliques", "lats", "shoulders"],
    equipment_required: ["dumbbell"],
    description: "En plancha alta sobre dos DBs, el atleta hace un row con un brazo y termina el rep en lateral plank con el DB encima del torso. Cambia al otro lado y repite. 12 reps totales alternando lados. Combina renegade row + lateral plank loaded.",
    coaching_cue: "Plancha alta sobre dos DBs, cadera estable (no rote). Haz un row con una mano: codo va hacia el techo, DB sube al lado del torso. Termina el rep girando a lateral plank con el DB cargado encima del torso/cadera (3 puntos de apoyo: pie inferior, antebrazo del lado que sostiene el DB en el piso, otra mano arriba). Mantén lateral plank 1-2s. Regresa a plancha alta. Cambia al otro lado. 12 reps totales alternando = 6/lado.",
    founder_notes: "El upgrade del Suitcase Carry. Combina renegade row (anti-rotation dinámico) con lateral plank loaded (anti-lateral flexion isométrico) en un solo flow. Brutal para core funcional + estabilidad escapular + skill.",
  },
  {
    name: "45° Hip Extension (Glute Bias)", name_es: "Extensión de Cadera 45° (Glúteo)",
    category: "accessory", movement_pattern: "hinge", difficulty: "intermediate", default_tempo: "2.2.1.0",
    primary_muscles: ["glutes", "hamstrings"],
    equipment_required: ["hyperextension_bench"],
    description: "Ejecución como hip extension (NO spine extension) en el banco de hyperextension a 45°. Variante canónica de Brett Contreras para enfocar glúteo. Pelvis en posterior tilt, glúteo aprieta arriba, espalda neutral todo el rango. Carga con disco al pecho.",
    coaching_cue: "Banco a 45°, almohadillas debajo de la cresta ilíaca (NO sobre el muslo). Pies anchos, rotación externa ligera. Disco al pecho. Inicio: torso paralelo al piso, espalda neutral, pelvis en posterior tilt (no arqueas lumbar). Sube extendiendo cadera y apretando glúteo arriba — el cuerpo queda en línea, NO te sobre-extiendes. Pausa 2s arriba. Baja controlado.",
    founder_notes: "El reemplazo de Brett Contreras para el BB RDL pesado en días de glúteo. Más estímulo glúteo, menos demanda lumbar. Si arqueas lumbar arriba, pierdes el ejercicio — bajas el peso y entrenas el patrón.",
  },
];

console.log("══ STEP 1: Ejercicios nuevos ══\n");
const exIds = {};
for (const e of NEW_EXERCISES) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", e.name).maybeSingle();
  if (existing) { exIds[e.name] = existing.id; console.log(`  · "${e.name}" ya existe (${existing.id.slice(0,8)}), skip`); continue; }
  const { data: created, error } = await sb.from("exercises").insert({ ...e, is_active: true }).select("id").single();
  if (error) { console.error(`  ✗ ERROR "${e.name}":`, error.message); process.exit(1); }
  exIds[e.name] = created.id;
  console.log(`  ✓ creado "${e.name}" → ${created.id.slice(0,8)}`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. RENAMBRAR existentes al spec del HTML
// ════════════════════════════════════════════════════════════════════════════

console.log("\n══ STEP 2: Renombrar al spec del HTML ══\n");
const RENAMES = [
  ["90-90 Hip Switches", "90/90 Hip Switches"],
  ["World Greatest Stretch", "World's Greatest Stretch"],
  ["Pigeon Stretch", "Pigeon"],
  ["Barbell Front Squat", "Front Squat"],
  ["Assisted Nordic Curl", "Nordic Hamstring Curl assisted"],
];
for (const [oldName, newName] of RENAMES) {
  const { data: alreadyNew } = await sb.from("exercises").select("id").eq("name", newName).maybeSingle();
  if (alreadyNew) { console.log(`  · "${newName}" ya existe (skip rename)`); continue; }
  const { data: old } = await sb.from("exercises").select("id").eq("name", oldName).maybeSingle();
  if (!old) { console.log(`  · "${oldName}" no encontrado, skip`); continue; }
  const { error } = await sb.from("exercises").update({ name: newName }).eq("id", old.id);
  if (error) { console.error(`  ✗ ERROR:`, error.message); process.exit(1); }
  console.log(`  ✓ "${oldName}" → "${newName}" (${old.id.slice(0,8)})`);
}

// Get IDs for all exercises used in MAR W1
async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!data) throw new Error(`Exercise not found: ${name}`);
  return data.id;
}

const EX = {
  hipSwitches: await exId("90/90 Hip Switches"),
  wgs: await exId("World's Greatest Stretch"),
  gluteBridgeMarch: await exId("Glute Bridge March"),
  bandedLateralWalk: await exId("Banded Lateral Walk"),
  squatPrimingFlow: await exId("Squat Priming Flow"),
  bwRdl: await exId("Bodyweight RDL"),
  frontSquat: await exId("Front Squat"),
  smithHipThrust: await exId("Smith Machine Hip Thrust"),
  reverseSitUp: await exId("Reverse Sit Up"),
  lateralPlankDyn: await exId("Weighted Lateral Plank Dinámico"),
  nordic: await exId("Nordic Hamstring Curl assisted"),
  hipExt45: await exId("45° Hip Extension (Glute Bias)"),
  pigeon: await exId("Pigeon"),
  couchStretch: await exId("Couch Stretch"),
  frogStretch: await exId("Frog Stretch"),
  catCow: await exId("Cat-Cow Reach"),
};

// ════════════════════════════════════════════════════════════════════════════
// 3. TEMPLATE WORKOUT (admin)
// ════════════════════════════════════════════════════════════════════════════

console.log("\n══ STEP 3: Template workout MAR W1 ══\n");

const COACH_NOTE = "Tempo Day. Front Squat 4×10 con tempo 4-1-1-1 a 50-55% del 1RM — el tempo eccéntrico y volumen de 10 reps generan estímulo de ~70% con menos carga. Smith HT 4 × (8 + iso 10s) como signature de glúteo. Core block (Reverse Sit Up + Weighted Lateral Plank Dinámico) descarga cadera/lumbar entre cargas axiales. Nordic 3×4 después del core (CNS y hamstring relativamente frescos). 45° Hip Ext cierra accessory de glúteo. Recovery: cadera y t-spine.";
const SHORT_NOTE = "¿Apretado de tiempo? Prioridad: Front Squat tempo + Smith HT iso. Si te quedan 20 min más, mete el Core Block. Si queda menos, salta a Nordic + Recovery directo. Nunca saltes el Recovery.";

let templateWorkoutId;
{
  const { data: existing } = await sb
    .from("workouts").select("id").is("user_id", null).eq("mesocycle_id", M3_ID).eq("week_number", 1).eq("day_label", "W1 TEMPO DAY").maybeSingle();
  if (existing) { templateWorkoutId = existing.id; console.log(`  · ya existe (${templateWorkoutId.slice(0,8)}), skip`); }
  else {
    const { data: created, error } = await sb.from("workouts").insert({
      program_id: PROGRAM_TEMPLATE_ID, user_id: null, scheduled_date: MAR_DATE,
      week_number: 1, day_label: "W1 TEMPO DAY", workout_type: "strength",
      estimated_duration: 82, is_completed: false, is_rest_day: false,
      coach_note: COACH_NOTE, short_on_time_note: SHORT_NOTE, mesocycle_id: M3_ID,
    }).select("id").single();
    if (error) { console.error("  ✗ ERROR creando template:", error.message); process.exit(1); }
    templateWorkoutId = created.id;
    console.log(`  ✓ template creado → ${templateWorkoutId.slice(0,8)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 4. SETS — la receta del día
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
  // ─── PRIME BLOCK (2 rondas · 3 grupos, sub-headers via cue prefix) ───
  S("PRIME BLOCK", "hipSwitches",        "warmup", 5,  { cue: "Mobility cadera | 2 rondas · 5/lado · transición controlada entre las dos posiciones" }),
  S("PRIME BLOCK", "wgs",                "warmup", 5,  { cue: "2 rondas · 5/lado · enfatiza t-spine en el reach" }),
  S("PRIME BLOCK", "gluteBridgeMarch",   "warmup", 10, { cue: "Activación glúteo | 2 rondas · glúteo aprieta primero, no la lumbar" }),
  S("PRIME BLOCK", "bandedLateralWalk",  "warmup", 10, { cue: "2 rondas · 10/lado · liga arriba de la rodilla, paso amplio sin perder tensión" }),
  S("PRIME BLOCK", "squatPrimingFlow",   "warmup", 1,  { cue: "Specific prep squat/hinge | 2 rondas · Bottom Hold 20s → Pulses 20s → Jumps × 5 sin descanso entre" }),
  S("PRIME BLOCK", "bwRdl",              "warmup", 5,  { cue: "2 rondas · bisagra de cadera, espalda neutral, sin peso para grabar el patrón" }),

  // ─── HEAVY A · Front Squat 4×10 tempo 4-1-1-1 ───
  S("HEAVY A", "frontSquat", "working", 10, { tempo: "4-1-1-1", rpe: 7, rest: 150, cue: "Tempo 4-1-1-1 · 50-55% de tu 1RM Front Squat · velocidad de excéntrica > peso" }),
  S("HEAVY A", "frontSquat", "working", 10, { tempo: "4-1-1-1", rpe: 7, rest: 150 }),
  S("HEAVY A", "frontSquat", "working", 10, { tempo: "4-1-1-1", rpe: 7.5, rest: 150 }),
  S("HEAVY A", "frontSquat", "working", 10, { tempo: "4-1-1-1", rpe: 8, rest: 150 }),

  // ─── HEAVY B · Smith Hip Thrust 4 × (8 reps + iso 10s) ───
  S("HEAVY B", "smithHipThrust", "working", 8, { tempo: "2-2-1-0", rpe: 8, rest: 120, cue: "Pausa 2s arriba apretando glúteo en cada rep · al terminar las 8 reps mantén iso 10s arriba sin perder contracción" }),
  S("HEAVY B", "smithHipThrust", "working", 8, { tempo: "2-2-1-0", rpe: 8, rest: 120 }),
  S("HEAVY B", "smithHipThrust", "working", 8, { tempo: "2-2-1-0", rpe: 8.5, rest: 120 }),
  S("HEAVY B", "smithHipThrust", "working", 8, { tempo: "2-2-1-0", rpe: 9, rest: 120 }),

  // ─── CORE BLOCK (3 rondas superset) ───
  S("CORE BLOCK", "reverseSitUp",     "superset", 10, { rest: 0,  cue: "8-10 reps · rodillas al pecho → extiende piernas elevando cadera del piso · regreso controlado sin tocar piso" }),
  S("CORE BLOCK", "lateralPlankDyn",  "superset", 12, { rest: 60, cue: "12 reps alternando lados · row → lateral plank con DB encima 1-2s · cambia lado" }),
  S("CORE BLOCK", "reverseSitUp",     "superset", 10, { rest: 0 }),
  S("CORE BLOCK", "lateralPlankDyn",  "superset", 12, { rest: 60 }),
  S("CORE BLOCK", "reverseSitUp",     "superset", 10, { rest: 0 }),
  S("CORE BLOCK", "lateralPlankDyn",  "superset", 12, { rest: 60 }),

  // ─── TENDÓN · Nordic 3×4 ───
  S("TENDÓN BLOCK", "nordic", "working", 4, { tempo: "5-0-0-0", rest: 120, cue: "5s controlados bajando · velocidad de la excéntrica > reps · si la técnica colapsa antes de las 4, cuentas las limpias" }),
  S("TENDÓN BLOCK", "nordic", "working", 4, { tempo: "5-0-0-0", rest: 120 }),
  S("TENDÓN BLOCK", "nordic", "working", 4, { tempo: "5-0-0-0", rest: 120 }),

  // ─── POSTERIOR CHAIN · 45° Hip Ext 4×10 ───
  S("POSTERIOR CHAIN", "hipExt45", "working", 10, { tempo: "2-2-1-0", rest: 120, cue: "Pelvis en posterior tilt · glúteo aprieta arriba · espalda neutral · pausa 2s arriba · sin sobre-extender lumbar" }),
  S("POSTERIOR CHAIN", "hipExt45", "working", 10, { tempo: "2-2-1-0", rest: 120 }),
  S("POSTERIOR CHAIN", "hipExt45", "working", 10, { tempo: "2-2-1-0", rest: 120 }),
  S("POSTERIOR CHAIN", "hipExt45", "working", 10, { tempo: "2-2-1-0", rest: 120 }),

  // ─── RECOVERY BLOCK ───
  S("RECOVERY BLOCK", "pigeon",       "cooldown", 1, { duration: 60, cue: "60 segundos por lado · pierna delantera flexionada al frente, respira al estiramiento" }),
  S("RECOVERY BLOCK", "couchStretch", "cooldown", 1, { duration: 60, cue: "60 segundos por lado · pie elevado contra pared, rodilla y cadera del pie elevado en una línea" }),
  S("RECOVERY BLOCK", "frogStretch",  "cooldown", 1, { duration: 60, cue: "60 segundos · cuadrupedia con rodillas anchas, cadera hacia atrás" }),
  S("RECOVERY BLOCK", "catCow",       "cooldown", 1, { duration: 90, cue: "90 segundos · alterna gato/vaca fluido, sigue la respiración" }),
];

console.log(`\n══ STEP 4: Sets template (${SETS.length}) ══`);
{
  const { count } = await sb.from("workout_sets").select("id", { count: "exact", head: true }).eq("workout_id", templateWorkoutId);
  if (count && count > 0) console.log(`  · template ya tiene ${count} sets, skip`);
  else {
    const rows = SETS.map((s, i) => ({ workout_id: templateWorkoutId, user_id: null, set_order: i + 1, ...s }));
    const { error } = await sb.from("workout_sets").insert(rows);
    if (error) { console.error("  ✗ ERROR:", error.message); process.exit(1); }
    console.log(`  ✓ ${rows.length} sets template insertados`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 5+6. INSTANCIAS para Andoni, César, Víctor
// ════════════════════════════════════════════════════════════════════════════

async function getActiveProgramId(userId) {
  const { data } = await sb.from("programs").select("id").eq("user_id", userId).eq("is_active", true).maybeSingle();
  return data?.id;
}

async function deployToUser(userId, label) {
  console.log(`\n  ── ${label} (${userId.slice(0,8)}) ──`);
  const { data: existing } = await sb.from("workouts").select("id").eq("user_id", userId).eq("scheduled_date", MAR_DATE).maybeSingle();
  if (existing) { console.log(`    · ya tiene workout en ${MAR_DATE} (${existing.id.slice(0,8)}), skip`); return existing.id; }
  const programId = await getActiveProgramId(userId);
  if (!programId) { console.error(`    ✗ sin programa activo`); return null; }

  const { data: created, error: wErr } = await sb.from("workouts").insert({
    program_id: programId, user_id: userId, scheduled_date: MAR_DATE,
    week_number: 1, day_label: "TEMPO DAY", workout_type: "strength",
    estimated_duration: 82, is_completed: false, is_rest_day: false,
    coach_note: COACH_NOTE, short_on_time_note: SHORT_NOTE, mesocycle_id: null,
  }).select("id").single();
  if (wErr) { console.error(`    ✗ ERROR workout:`, wErr.message); return null; }
  const instanceId = created.id;
  const rows = SETS.map((s, i) => ({ workout_id: instanceId, user_id: userId, set_order: i + 1, ...s }));
  const { error: sErr } = await sb.from("workout_sets").insert(rows);
  if (sErr) { console.error(`    ✗ ERROR sets:`, sErr.message); return null; }
  console.log(`    ✓ workout ${instanceId.slice(0,8)} + ${rows.length} sets`);
  return instanceId;
}

console.log("\n══ STEPS 5+6: Instancias athlete ══");
await deployToUser(ANDONI, "Andoni");
await deployToUser(CESAR, "César");
await deployToUser(VICTOR, "Víctor");

console.log("\n✓ M3 MAR W1 TEMPO DAY creado completo");
