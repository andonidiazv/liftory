/**
 * M4 workouts + sets — construye LUN PULL DAY, MAR LOWER PUSH, MIÉ PUSH DAY
 * para 6 semanas × 4 targets (Andoni, César, Víctor, template).
 *
 * Total: 72 workouts + ~1500 sets.
 *
 * Idempotente por (target, scheduled_date) — si ya existe workout ese día, skip
 * completo. Para re-run: borrar workout_sets primero + workout, luego correr.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══════════════════════════════════════════════════════════════════
// Targets
// ═══════════════════════════════════════════════════════════════════
const TARGETS = [
  { name: "Andoni", user_id: "8117e549-8314-471d-87c2-c7c68cccac17", program_id: "97d1b4a5-cf6b-4b59-b36c-d29dc5772120" },
  { name: "César",  user_id: "f54d2d89-c304-419e-93d2-8a7fadfccc51", program_id: "ccb5c861-fb6b-485b-bf54-24b4bbad9d9e" },
  { name: "Víctor", user_id: "3b1c600f-46ee-4332-a937-731c4445c144", program_id: "de318eb0-f1f8-4111-a143-905bbf3fcb34" },
  { name: "Template", user_id: null,                                  program_id: "32302803-ead8-4e08-809a-606031a7b7e0" },
];

// ═══════════════════════════════════════════════════════════════════
// Dates: M4 W1 Mon = 2026-07-20
// ═══════════════════════════════════════════════════════════════════
const M4_W1_MONDAY = new Date("2026-07-20T00:00:00");
function dateFor(week, dayOffset) {
  const d = new Date(M4_W1_MONDAY);
  d.setDate(d.getDate() + (week - 1) * 7 + dayOffset);
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ═══════════════════════════════════════════════════════════════════
// Resolve exercise names → IDs
// ═══════════════════════════════════════════════════════════════════
async function resolveExercises() {
  const { data } = await sb.from("exercises").select("id, name");
  const map = new Map();
  for (const d of data ?? []) map.set(d.name, d.id);
  return map;
}
const EX = await resolveExercises();
function exId(name) {
  const id = EX.get(name);
  if (!id) { console.error(`  ✗ EXERCISE NOT FOUND: "${name}"`); process.exit(1); }
  return id;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers to build set specs
// ═══════════════════════════════════════════════════════════════════
function set(block, exName, opts = {}) {
  return {
    block,
    exercise_id: exId(exName),
    set_type: opts.type ?? "working",
    planned_reps: opts.reps ?? null,
    planned_duration_seconds: opts.duration ?? null,
    planned_rest_seconds: opts.rest ?? null,
    planned_tempo: opts.tempo ?? null,
    planned_rpe: opts.rpe ?? null,
    coaching_cue_override: opts.cue ?? null,
  };
}
function repeat(n, fn) { return Array.from({ length: n }, (_, i) => fn(i + 1)); }

// ═══════════════════════════════════════════════════════════════════
// PULL DAY (Monday, dayOffset=0)
// ═══════════════════════════════════════════════════════════════════
const PULL_PRIME = [
  // A. Movilidad
  ...repeat(2, () => set("PRIME BLOCK", "Thoracic Extension over Foam Roller", { type: "warmup", duration: 30, rest: 30, cue: "PRIME · A. Movilidad. Roller bajo escápulas, dedos entrelazados detrás de la cabeza, deja caer el pecho. T-spine free para el reach del row." })),
  ...repeat(2, () => set("PRIME BLOCK", "Downward Dog to Cobra", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · A. Movilidad. Flow: hombros abren en cobra, cadena posterior estira en dog. Fluido, no forzado." })),
  // B. Activación
  ...repeat(2, () => set("PRIME BLOCK", "Band Pull-Apart", { type: "warmup", reps: 12, rest: 30, cue: "PRIME · B. Activación. Aprieta escápulas hacia atrás y abajo. Pulgares al techo en el peak." })),
  ...repeat(2, () => set("PRIME BLOCK", "Prone Y-T-W", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · B. Activación. Prone. 5 reps de cada posición: Y, T, W. Rear delt + rotator cuff activation." })),
  // C. Entreno de Patrón
  ...repeat(2, () => set("PRIME BLOCK", "Dead Hang", { type: "warmup", duration: 25, rest: 30, cue: "PRIME · C. Patrón. Colgado, hombros activos (no colapsados). Grip + shoulder decompression pre-chin-up." })),
  ...repeat(2, () => set("PRIME BLOCK", "Cat-Cow Reach", { type: "warmup", reps: 6, rest: 30, cue: "PRIME · C. Patrón. T-spine bajo control antes del row heavy." })),
];

function pullHeavyA(week) {
  const spec = { 1: [3, 10, "3-1-1", 120, 7], 2: [3, 10, "3-1-1", 120, 7.5], 3: [4, 8, "2-1-1", 120, 8], 4: [4, 6, "2-0-X", 150, 8.5], 5: [4, 5, "2-0-X", 180, 9], 6: [2, 8, "3-1-1", 120, 6] }[week];
  const [sets, reps, tempo, rest, rpe] = spec;
  return repeat(sets, () => set("HEAVY BLOCK — A", "Meadows Row", {
    type: "working", reps, tempo, rest, rpe,
    cue: `HEAVY A · Meadows Row · W${week}. ${reps} reps/lado · tempo ${tempo} · RPE ${rpe} · rest ${rest}s. Landmine cargada. Pie del lado que jala adelantado. Codo cerca del torso, jalá con la ESCÁPULA primero. Descenso ${tempo[0]}s controlado — el stretch abajo es donde crece el lat.`,
  }));
}

function pullHeavyB(week) {
  const spec = { 1: [3, 6, "2-1-X", 120, "+10lb"], 2: [3, 6, "2-1-X", 120, "+15-20lb"], 3: [4, 6, "2-0-X", 150, "+25lb"], 4: [4, 5, "2-0-X", 150, "+35lb"], 5: [4, 4, "2-0-X", 180, "+40-50lb"], 6: [2, 5, "2-1-X", 120, "BW o +10lb"] }[week];
  const [sets, reps, tempo, rest, weightNote] = spec;
  return repeat(sets, () => set("HEAVY BLOCK — B", "Weighted Pull-up", {
    type: "working", reps, tempo, rest,
    cue: `HEAVY B · Weighted Chin-up · W${week}. ${reps} reps · tempo ${tempo} · rest ${rest}s · peso extra ${weightNote}. Grip supinado, hombros anchos. Iniciá con lat, no con bicep. Barbilla claramente sobre la barra. Bajá controlado.`,
  }));
}

function pullVolume(week) {
  // Straight-Arm Pulldown ×3
  const strapSpec = { 1: [12, "3-0-1", 60, null], 2: [12, "3-0-1", 60, null], 3: [12, "3-0-1", 60, "Myo-reps última serie: 12 reps a RIR 1, descanso 10s, minisets de 3 hasta failure"], 4: [10, "3-0-1", 75, "Myo-reps última serie"], 5: [10, "3-1-1", 90, null], 6: [12, "3-0-1", 60, null] }[week];
  const [rp, tp, rst, tech] = strapSpec;
  const sap = repeat(3, () => set("BUILD BLOCK — A", "Straight-Arm Pulldown", {
    type: "working", reps: rp, tempo: tp, rest: rst,
    cue: `BUILD A · Straight-Arm Pulldown · W${week}. ${rp} reps · tempo ${tp} · rest ${rst}s${tech ? ` · ⚡ ${tech}` : ""}. Codos LIGERAMENTE flexionados y BLOQUEADOS. El movimiento es de HOMBRO, no de codo. Sentí el lat estirándose arriba, comprimirse en el bottom.`,
  }));

  // Chest-Supported SA Cable Row ×3
  const rowSpec = { 1: [12, "2-1-1", 75, null], 2: [12, "2-1-1", 75, null], 3: [12, "2-1-1", 90, "Rest-pause última serie: RIR 1, descanso 15s, seguir a failure, descanso 15s, seguir a failure"], 4: [10, "2-1-1", 90, "Rest-pause última serie"], 5: [10, "2-1-1", 120, null], 6: [12, "2-1-1", 75, null] }[week];
  const [rp2, tp2, rst2, tech2] = rowSpec;
  const row = repeat(3, () => set("BUILD BLOCK — B", "Chest-Supported SA Cable Row", {
    type: "working", reps: rp2, tempo: tp2, rest: rst2,
    cue: `BUILD B · Chest-Supported SA Cable Row · W${week}. ${rp2} reps/lado · tempo ${tp2} · rest ${rst2}s${tech2 ? ` · ⚡ ${tech2}` : ""}. Banco 30-45°. Pecho apoyado, pie adelantado para estabilidad. Codo cerca del torso, jalá con el omóplato. En el peak apretá 1s el mid-back. Sin trampa lumbar.`,
  }));

  return [...sap, ...row];
}

function pullArm(week) {
  // Preacher Curl ×3
  const preSpec = { 1: [10, 60, null], 2: [10, 60, "Drop set doble última serie: falla → -25% → falla → -25% → falla"], 3: [10, 60, null], 4: [10, 60, "Drop set doble última serie"], 5: [8, 90, null], 6: [12, 60, null] }[week];
  const [pr, prt, ptech] = preSpec;
  const pre = repeat(3, () => set("ARM BLOCK — A", "DB Preacher Curl", {
    type: "working", reps: pr, rest: prt,
    cue: `ARM A · Preacher Curl · W${week}. ${pr} reps · rest ${prt}s${ptech ? ` · ⚡ ${ptech}` : ""}. Codos anclados en la almohadilla, NUNCA se elevan. Bajá 3s contando. Pause 1s en el bottom.`,
  }));

  // Incline DB Curl ×3
  const incSpec = { 1: [12, "3-1-1", 60, null], 2: [12, "3-1-1", 60, null], 3: [12, "3-0-1", 60, "1.5 reps última serie: rep completa + medio arriba + completa = 1 rep, total 8"], 4: [10, "3-1-1", 75, "1.5 reps última serie"], 5: [8, "3-1-1", 75, null], 6: [12, "3-0-1", 60, null] }[week];
  const [ir, it, irt, itech] = incSpec;
  const inc = repeat(3, () => set("ARM BLOCK — B", "Incline DB Curl", {
    type: "working", reps: ir, tempo: it, rest: irt,
    cue: `ARM B · Incline DB Curl · W${week}. ${ir} reps · tempo ${it} · rest ${irt}s${itech ? ` · ⚡ ${itech}` : ""}. Banco 45°. Codos APUNTAN AL PISO en el bottom, no adelantados. Rango completo hasta stretch máximo del long head.`,
  }));

  return [...pre, ...inc];
}

const PULL_FINISHER = [
  ...repeat(2, () => set("FINISHER BLOCK", "Cable Face Pull", { type: "working", reps: 15, rest: 45, cue: "FINISHER · Face Pull con External Rotation · 2×15 · rest 45s. Cable a la altura de la cara. Jalá hacia los ojos, codos altos. Rota los antebrazos hacia arriba en el final (pulgares hacia atrás). Rear delt + rotator cuff prehab." })),
  ...repeat(2, () => set("FINISHER BLOCK", "Farmer Hold", { type: "working", duration: 35, rest: 60, cue: "FINISHER · Farmer Hold · 2 × 30-45s · rest 60s. Pesado — no camines. Solo aguantá. Escápulas neutras, core apretado." })),
];

const PULL_RECOVERY = [
  set("RECOVERY BLOCK", "Thoracic Extension over Foam Roller", { type: "cooldown", duration: 45, cue: "RECOVERY. Roller bajo escápulas, brazos detrás de la cabeza, dejá caer el pecho. Libera T-spine." }),
  set("RECOVERY BLOCK", "Lat Stretch Doorway", { type: "cooldown", duration: 30, cue: "RECOVERY. Brazo en marco de puerta, pulgar atrás, incliná al lado opuesto. 30s por lado." }),
];

function pullDaySets(week) {
  return [
    ...PULL_PRIME,
    ...pullHeavyA(week),
    ...pullHeavyB(week),
    ...pullVolume(week),
    ...pullArm(week),
    ...PULL_FINISHER,
    ...PULL_RECOVERY,
  ];
}

const PULL_COACH_NOTE = "Pull day de M4 no es 'jalar pesos'. Es construir grosor + amplitud + brazo con intención. Meadows Row es el rey del meso: forma perfecta > peso. Los drop sets del Preacher solo en semanas de intensificación — no las regales. El Face Pull es no-negociable: rear delt + rotator cuff = seguro de tu hombro por 10 años.";

// ═══════════════════════════════════════════════════════════════════
// LOWER PUSH (Tuesday, dayOffset=1)
// ═══════════════════════════════════════════════════════════════════
const LP_PRIME = [
  // A. Movilidad
  ...repeat(2, () => set("PRIME BLOCK", "Weighted Ankle Stretch", { type: "warmup", duration: 30, rest: 30, cue: "PRIME · A. Movilidad. Rodilla sobre dedos, talón pegado. Depth para Front Squat y catch del Clean." })),
  ...repeat(2, () => set("PRIME BLOCK", "Thoracic Extension over Foam Roller", { type: "warmup", duration: 30, rest: 30, cue: "PRIME · A. Movilidad. Roller bajo escápulas. Front rack limpio para el complex." })),
  // B. Prep Específica
  ...repeat(2, () => set("PRIME BLOCK", "Cossack Squat Flow", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · B. Prep. Cossack Squat Flow · 5/lado. Peso en un pie, otro extendido lateral. Rango completo. Apertura activa cadera + tobillo lateral." })),
  ...repeat(2, () => set("PRIME BLOCK", "Supine Active Hamstring Stretch", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · B. Prep. Supine Active Hamstring Stretch · 5/lado (2s hold en peak). Boca arriba, pierna extendida al techo con hip flexor activo. Hamstring stretch + control neuromuscular." })),
  // C. Activación + Patrón
  ...repeat(2, () => set("PRIME BLOCK", "KB Squat Clean with Pause", { type: "warmup", reps: 5, rest: 45, cue: "PRIME · C. Patrón. KB Squat Clean con Pausa · 5 (2s pause en catch bottom). Recibí la KB en front rack EN FULL SQUAT. Aguantá 2s. Prep directa del BB Clean." })),
  ...repeat(2, () => set("PRIME BLOCK", "Alternating Spiderman Lunge", { type: "warmup", reps: 4, rest: 30, cue: "PRIME · C. Patrón. Alternating Spiderman Lunge · 4/lado (8 alternating). Lunge amplio, codo mismo lado toca el piso al lado del pie delantero. Rotá torso opuesto, reach overhead con brazo libre." })),
];

function lpHeavyA(week) {
  // BB Complex EMOM · 1 Clean + 3 Front Squat
  const spec = {
    1: { emom: 7, window: 75, rpe: "6.5 → 7 → 7.5 → 8", note: "" },
    2: { emom: 7, window: 75, rpe: "7 → 7.5 → 8 → 8.5", note: "+peso vs W1" },
    3: { emom: 7, window: 75, rpe: "7.5 → 8 → 8.5 → 9", note: "" },
    4: { emom: 8, window: 85, rpe: "8 → 8.5 → 8.5 → 9", note: "" },
    5: { emom: 7, window: 85, rpe: "8.5 → 9 → 9.5 (min 7)", note: "· 3 min rest · TOP SINGLE Clean RPE 10" },
    6: { emom: 5, window: 75, rpe: "5-6 constante", note: "DELOAD" },
  }[week];
  const emomSet = set("HEAVY BLOCK — A", "BB Clean + Front Squat Complex", {
    type: "emom", planned_reps: null, reps: 1, rest: 60,
    cue: `HEAVY A · BB Complex EMOM · W${week} ${spec.note ? "· " + spec.note : ""}. EMOM ${spec.emom} min · ventana ${spec.window}s. Cada ventana: 1 BB Clean (catch en FULL SQUAT) + 3 Front Squat. Reset 1s arriba entre reps. RPE curve: ${spec.rpe}. Si fallas ventana, NO chase peso — bajá 5%.`,
  });
  // Copy for the EMOM: model as N rows (one per round) so the UI shows a set list, OR a single row with description.
  // Following M3 EMOM pattern (single set with cue). Use 1 row + set_type=emom.
  const rows = [emomSet];
  if (week === 5) {
    rows.push(set("HEAVY BLOCK — A", "BB Clean + Front Squat Complex", {
      type: "working", reps: 1, rest: 180,
      cue: "HEAVY A · TOP SINGLE (post-EMOM). Después del EMOM: 3 minutos de rest completo. 1 set adicional: 1 Clean único a RPE 10 (sin Front Squat, sin drop set). Es el top single Clean puro que consolida la fuerza del meso.",
    }));
  }
  return rows;
}

function lpHeavyB(week) {
  const spec = { 1: [3, 8, "3-1-1", 90], 2: [3, 8, "3-1-1", 90], 3: [3, 8, "2-1-1", 90], 4: [3, 6, "2-1-1", 120], 5: [3, 5, "2-1-1", 120], 6: [2, 8, "3-1-1", 90] }[week];
  const [sets, reps, tempo, rest] = spec;
  return repeat(sets, () => set("HEAVY BLOCK — B", "B-Stance DB Goblet Squat", {
    type: "working", reps, tempo, rest,
    cue: `HEAVY B · B-Stance DB Goblet Squat · W${week}. ${reps} reps/lado · tempo ${tempo} · rest ${rest}s. DB al pecho estilo goblet. Un pie adelantado (70% peso), otro atrás con talón elevado como kickstand (30%). Torso vertical. Sentí quad + glute del pie delantero. Alterná lados por serie.`,
  }));
}

function lpVolume(week) {
  // Triset For Time · 3 rounds · cap 12 min · rest 90s entre rounds
  const note = week === 6 ? " · DELOAD: solo 2 rounds, ritmo suave" : "";
  return [
    set("BUILD BLOCK — A", "Single Leg Recoil to Shoot Through", {
      type: "working", reps: 8, rest: 90,
      cue: `BUILD · Triset For Time · 3 rounds · cap 12 min · rest 90s entre rounds${note}. Ejercicio 1: SL Recoil to Shoot Through · 8/lado. Cadena: cuadrupedia → child pose a una pierna → recoil → shoot through lateral → repetir.`,
    }),
    set("BUILD BLOCK — A", "Bodyweight Reverse Nordic", {
      type: "working", reps: 8, rest: 90,
      cue: `BUILD · Triset For Time. Ejercicio 2: Bodyweight Reverse Nordic · 6-8 reps. Rodillas en piso, torso atrás con extensión de cadera. Quad long-length tension.`,
    }),
    set("BUILD BLOCK — A", "Cyclist Bodyweight Squat with Pause", {
      type: "working", reps: 12, rest: 90,
      cue: `BUILD · Triset For Time. Ejercicio 3: Cyclist BW Squat con Pausa · 12 reps. Talones elevados 2-5cm, torso vertical. 2s pause en el bottom. Quad annihilation.`,
    }),
  ];
}

function lpFinisher(week) {
  const target = week === 6 ? 50 : 100;
  return [set("FINISHER BLOCK", "Wall Ball", {
    type: "amrap", reps: target, duration: 15 * 60,
    cue: `FINISHER · ${target} Wall Balls · cap 15 min. Wall Ball a target (~10ft). Cada BREAK = penalty 50 Jump Rope Singles antes de reanudar. Ritmo continuo. Full squat cada rep. Hip drive brutal para lanzar la ball al target.`,
  })];
}

const LP_RECOVERY = [
  set("RECOVERY BLOCK", "Couch Stretch", { type: "cooldown", duration: 45, cue: "RECOVERY. Rodilla al piso, pie en banco, cadera adelante. Estira flexor de cadera post-squat. 45s/lado." }),
  set("RECOVERY BLOCK", "Weighted Ankle Stretch", { type: "cooldown", duration: 30, cue: "RECOVERY. Deshace la rigidez del tobillo post-squat pesado. 30s/lado." }),
  set("RECOVERY BLOCK", "Legs Up the Wall", { type: "cooldown", duration: 60, cue: "RECOVERY. Piernas contra la pared, cadera al piso. 60s. Baja la HR + activa el nervio vago." }),
];

function lowerPushSets(week) {
  return [
    ...LP_PRIME,
    ...lpHeavyA(week),
    ...lpHeavyB(week),
    ...lpVolume(week),
    ...lpFinisher(week),
    ...LP_RECOVERY,
  ];
}

const LP_COACH_NOTE = "Lower Push de M4: el BB Complex es el patrón que se paga todo el meso. Full catch en squat, reset entre reps del FS. RPE curve inteligente — no vayas rojo antes del min 7. El triset For Time es quad annihilation limpio. Wall Balls: si te para el break, aceptá el penalty. Ese loop te enseña más de tu límite que cualquier PR.";

// ═══════════════════════════════════════════════════════════════════
// PUSH DAY (Wednesday, dayOffset=2)
// ═══════════════════════════════════════════════════════════════════
const PD_PRIME = [
  // A. Movilidad
  ...repeat(2, () => set("PRIME BLOCK", "Thoracic Extension over Foam Roller", { type: "warmup", duration: 30, rest: 30, cue: "PRIME · A. Movilidad. Roller bajo escápulas. Arch limpio para Incline + posición receive de OHP/HSP." })),
  ...repeat(2, () => set("PRIME BLOCK", "Downward Dog to Cobra", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · A. Movilidad. Shoulder + spine flow." })),
  // B. Prep Específica
  ...repeat(2, () => set("PRIME BLOCK", "Band Dislocates", { type: "warmup", reps: 8, rest: 30, cue: "PRIME · B. Prep. Band Dislocates · 8 reps. Brazos rectos, agarre ancho. Lleva la banda arriba y hacia atrás. Flexión + extensión de hombro completa." })),
  ...repeat(2, () => set("PRIME BLOCK", "Wrist Mobility", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · B. Prep. Wrist Prep · 5 c/u. Flex/ext + rotaciones. Muñeca lista para BB bench + HSP." })),
  // C. Activación + Patrón
  ...repeat(2, () => set("PRIME BLOCK", "Prone Y-T-W", { type: "warmup", reps: 5, rest: 30, cue: "PRIME · C. Activación. Prone Y-T-W · 5 de cada. Rear delt + rotator cuff prep (crítico pre-press)." })),
  ...repeat(2, () => set("PRIME BLOCK", "Scap Push-up", { type: "warmup", reps: 8, rest: 30, cue: "PRIME · C. Patrón. Scap Push-up · 8 reps. Control escapular + patrón push." })),
];

function pdHeavyA(week) {
  const spec = { 1: [4, 6, "3-1-1", 120, 7], 2: [4, 6, "3-1-1", 120, 7.5], 3: [5, 5, "2-1-1", 120, 8], 4: [5, 5, "2-0-X", 150, 8.5], 5: [5, 3, "2-0-X", 180, 9], 6: [2, 5, "3-1-1", 120, 6] }[week];
  const [sets, reps, tempo, rest, rpe] = spec;
  return repeat(sets, () => set("HEAVY BLOCK — A", "Incline BB Press", {
    type: "working", reps, tempo, rest, rpe,
    cue: `HEAVY A · Incline BB Press · W${week}. ${reps} reps · tempo ${tempo} · RPE ${rpe} · rest ${rest}s. Banco 30-45°. Barra a clavícula alta. Codos 60° del torso. Presioná "empuja el banco al piso" (retracción + press). Descenso ${tempo[0]}s controlado.`,
  }));
}

function pdHeavyB(week) {
  const spec = { 1: [3, 5, "2-1-1", 120], 2: [3, 5, "3-1-1", 120], 3: [3, 5, "3-1-X", 120], 4: [4, 4, "3-1-X", 150], 5: [4, 3, "2-1-X", 150], 6: [2, 5, "2-1-1", 120] }[week];
  const [sets, reps, tempo, rest] = spec;
  return repeat(sets, () => set("HEAVY BLOCK — B", "Handstand Strict Press", {
    type: "working", reps, tempo, rest,
    cue: `HEAVY B · Handstand Strict Press · W${week}. ${reps} reps · tempo ${tempo} · rest ${rest}s. Regresiones: R1 Wall HSP chest-to-wall (más difícil) · R2 Wall HSP heels-to-wall · R3 Feet-elevated Pike Push-up · R4 Floor Pike Push-up. Elegí el nivel más difícil que puedas sostener con forma limpia. Cabeza pasa entre los brazos en top. Bajá lento, empujá desde el suelo.`,
  }));
}

function pdVolume(week) {
  // Superset: Close Grip Incline DB Press + SA Cable Chest Fly · 3 supersets · rest 90-120s full round
  const spec = {
    1: { aReps: 10, bReps: 12, rest: 90, aTech: null, bTech: null },
    2: { aReps: 10, bReps: 12, rest: 90, aTech: null, bTech: null },
    3: { aReps: 12, bReps: 12, rest: 90, aTech: null, bTech: "Myo-reps última fly: 12 reps RIR 1, descanso 10s, minisets de 3 hasta failure" },
    4: { aReps: 10, bReps: 15, rest: 90, aTech: null, bTech: "Drop set doble última fly: falla → -25% → falla → -25% → falla" },
    5: { aReps: 8, bReps: 10, rest: 120, aTech: null, bTech: null },
    6: { aReps: 10, bReps: 12, rest: 90, aTech: null, bTech: null },
  }[week];
  // Alternating A, B, A, B, A, B
  const rows = [];
  for (let i = 0; i < 3; i++) {
    rows.push(set("BUILD BLOCK — A", "Close Grip Incline DB Press", {
      type: "superset", reps: spec.aReps, tempo: "2-1-1", rest: spec.rest,
      cue: `BUILD A · SUPERSET (A). Close Grip Incline DB Press · W${week} · superset ${i + 1}/3. ${spec.aReps} reps · rest FULL ROUND ${spec.rest}s (después de completar B). Banco 30°. DBs con palmas neutras. Codos pegados al torso. Rango completo. NO junto los DBs en el peak.`,
    }));
    rows.push(set("BUILD BLOCK — A", "SA Cable Chest Fly", {
      type: "superset", reps: spec.bReps, tempo: "2-0-1", rest: spec.rest,
      cue: `BUILD A · SUPERSET (B). SA Cable Chest Fly · W${week} · superset ${i + 1}/3. ${spec.bReps} reps/lado · después de A, sin descanso · rest FULL ROUND ${spec.rest}s${i === 2 && spec.bTech ? ` · ⚡ ${spec.bTech}` : ""}. Un brazo a la vez, codo bloqueado. Movimiento de HOMBRO. Cruzá al centro. Aprieta 1s.`,
    }));
  }
  return rows;
}

function pdTricep(week) {
  // Superset: BB Skullcrusher + SA Cable Kickback · 3 supersets · rest 75-90s full round
  const spec = {
    1: { aReps: 10, bReps: 12, rest: 75, aTech: null, bTech: null },
    2: { aReps: 10, bReps: 12, rest: 75, aTech: null, bTech: "Drop set doble última kickback" },
    3: { aReps: 12, bReps: 15, rest: 75, aTech: null, bTech: null },
    4: { aReps: 10, bReps: 12, rest: 75, aTech: null, bTech: "Drop set doble última kickback" },
    5: { aReps: 8, bReps: 10, rest: 90, aTech: null, bTech: null },
    6: { aReps: 10, bReps: 12, rest: 75, aTech: null, bTech: null },
  }[week];
  const rows = [];
  for (let i = 0; i < 3; i++) {
    rows.push(set("ARM BLOCK — A", "Barbell Skullcrusher (EZ)", {
      type: "superset", reps: spec.aReps, tempo: "2-1-1", rest: spec.rest,
      cue: `ARM A · SUPERSET (A). BB Skullcrusher (EZ) · W${week} · superset ${i + 1}/3. ${spec.aReps} reps · rest FULL ROUND ${spec.rest}s. Codos apuntando al techo, NO se abren. Bajá a frente/detrás de cabeza. Solo mueve el codo — hombro estable.`,
    }));
    rows.push(set("ARM BLOCK — A", "SA Cable Kickback", {
      type: "superset", reps: spec.bReps, tempo: "2-1-1", rest: spec.rest,
      cue: `ARM A · SUPERSET (B). SA Cable Kickback · W${week} · superset ${i + 1}/3. ${spec.bReps} reps/lado · después de A sin descanso · rest FULL ROUND ${spec.rest}s${i === 2 && spec.bTech ? ` · ⚡ ${spec.bTech}` : ""}. Codo anclado al costado. Sin mover codo, extendé antebrazo hasta recto. Aprieta 1s. Peak contraction.`,
    }));
  }
  return rows;
}

function pdFinisher(week) {
  const spec = { 1: [2, 10, null], 2: [2, 10, null], 3: [2, 12, "pausa 1s en max reach"], 4: [2, 10, "standing rollout si podés (si no, kneeling 3-1-1)"], 5: [2, 8, "standing o kneeling con weighted vest"], 6: [2, 10, "kneeling standard (deload)"] }[week];
  const [sets, reps, note] = spec;
  return repeat(sets, () => set("FINISHER BLOCK", "Ab Wheel Rollout", {
    type: "working", reps, rest: 90,
    cue: `FINISHER · Ab Wheel Rollout · W${week}. ${reps} reps · rest 90s${note ? ` · ${note}` : ""}. Kneeling standard (o standing en semanas avanzadas). Core APRETADO — sin arch lumbar. Rueda hasta rango que podés regresar. El regreso construye la fuerza.`,
  }));
}

const PD_RECOVERY = [
  set("RECOVERY BLOCK", "Lat Stretch Doorway", { type: "cooldown", duration: 30, cue: "RECOVERY. Brazo en marco de puerta, pulgar atrás, incliná al lado opuesto. Abre chest a través del hombro. 30s/lado." }),
  set("RECOVERY BLOCK", "Overhead Tricep Stretch", { type: "cooldown", duration: 30, cue: "RECOVERY. Brazo overhead, otra mano empuja el codo hacia el centro. Estira tricep long head. 30s/lado." }),
];

function pushDaySets(week) {
  return [
    ...PD_PRIME,
    ...pdHeavyA(week),
    ...pdHeavyB(week),
    ...pdVolume(week),
    ...pdTricep(week),
    ...pdFinisher(week),
    ...PD_RECOVERY,
  ];
}

const PD_COACH_NOTE = "Push day de M4: Incline BB Press es chest strength puro — retracción escapular fija durante toda la serie. HSP con la regresión más honesta (no la más presumible) construye hombro real. Los supersets del volume + tricep block son donde vive el pump — respetá el rest de round, no lo cortes. Ab Wheel: rango que podés regresar, no rango que te tira.";

// ═══════════════════════════════════════════════════════════════════
// Days config
// ═══════════════════════════════════════════════════════════════════
const DAYS = [
  { label: "PULL DAY",   offset: 0, workout_type: "strength", duration: 70, coach: PULL_COACH_NOTE, buildSets: pullDaySets },
  { label: "LOWER PUSH", offset: 1, workout_type: "strength", duration: 70, coach: LP_COACH_NOTE,   buildSets: lowerPushSets },
  { label: "PUSH DAY",   offset: 2, workout_type: "strength", duration: 70, coach: PD_COACH_NOTE,   buildSets: pushDaySets },
];

// ═══════════════════════════════════════════════════════════════════
// Insertion
// ═══════════════════════════════════════════════════════════════════
async function insertWorkoutAndSets(target, week, day) {
  const date = dateFor(week, day.offset);
  // Idempotency: check existing workout for this target+date
  const existQ = sb.from("workouts").select("id").eq("scheduled_date", date).eq("program_id", target.program_id);
  if (target.user_id) existQ.eq("user_id", target.user_id); else existQ.is("user_id", null);
  const { data: existing } = await existQ.maybeSingle();
  if (existing) {
    console.log(`  ⏭  ${target.name.padEnd(9)} · ${date} · W${week} · ${day.label.padEnd(11)} · already exists (${existing.id.slice(0, 8)}) — skip`);
    return { skipped: true };
  }

  const workoutRow = {
    program_id: target.program_id,
    user_id: target.user_id,
    mesocycle_id: null,
    scheduled_date: date,
    week_number: week,
    day_label: day.label,
    workout_type: day.workout_type,
    estimated_duration: day.duration,
    is_rest_day: false,
    is_completed: false,
    coach_note: day.coach,
    short_on_time_note: null,
    notes: null,
    ai_adjustments: null,
  };
  const { data: created, error: eW } = await sb.from("workouts").insert(workoutRow).select("id").single();
  if (eW) { console.error(`  ✗ ${target.name} · ${date} · W${week} · workout: ${eW.message}`); return { error: eW }; }

  const specs = day.buildSets(week);
  const setRows = specs.map((s, i) => ({
    workout_id: created.id,
    user_id: target.user_id,
    exercise_id: s.exercise_id,
    set_order: i + 1,
    set_type: s.set_type,
    planned_reps: s.planned_reps,
    planned_weight: null,
    planned_tempo: s.planned_tempo,
    planned_rpe: s.planned_rpe,
    planned_rir: null,
    planned_rest_seconds: s.planned_rest_seconds,
    planned_duration_seconds: s.planned_duration_seconds,
    coaching_cue_override: s.coaching_cue_override,
    block_label: s.block,
  }));

  const { error: eS } = await sb.from("workout_sets").insert(setRows);
  if (eS) { console.error(`  ✗ ${target.name} · ${date} · W${week} · sets: ${eS.message}`); return { error: eS }; }
  console.log(`  ✓ ${target.name.padEnd(9)} · ${date} · W${week} · ${day.label.padEnd(11)} · ${setRows.length} sets`);
  return { created: true };
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════
console.log("═══════════════════════════════════════════════════════");
console.log("M4 · Building workouts + sets");
console.log("═══════════════════════════════════════════════════════\n");

let created = 0, skipped = 0, errored = 0;
for (const target of TARGETS) {
  console.log(`\n── ${target.name} ─────────────────────`);
  for (let week = 1; week <= 6; week++) {
    for (const day of DAYS) {
      const res = await insertWorkoutAndSets(target, week, day);
      if (res.created) created++;
      else if (res.skipped) skipped++;
      else if (res.error) errored++;
    }
  }
}

console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`Summary: ${created} created · ${skipped} skipped · ${errored} errored`);
console.log(`═══════════════════════════════════════════════════════`);
