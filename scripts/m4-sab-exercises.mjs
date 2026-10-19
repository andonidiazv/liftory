/**
 * M4 · SÁB SHOULDERS + ARMS + ATHLETIC · exercises.
 * Crear 2 nuevos + llenar 5 cards incompletos. Todos con card completa.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NEW = [
  {
    name: "Chest to Bar Burpee",
    name_es: "Burpee con Chest to Bar",
    description: "Combinación de burpee (pecho al piso) + salto vertical para hacer un pull-up con el pecho tocando la barra (chest-to-bar). Movimiento explosivo full-body de CrossFit — combina flexión de codos, coordinación aérea, y pull vertical bajo fatiga.",
    coaching_cue: "Empezás parado bajo la barra de pull-up. Bajás a burpee estricto: manos al piso, patada atrás, pecho toca el piso, patada adelante, arriba. En el momento de arribar de pie, saltás verticalmente y agarrás la barra en el pico del salto. Ejecutá un pull-up estricto hasta que el PECHO toque la barra (no la barbilla). Bajás controlado o soltás en el bottom, aterrizás y arrancás el próximo burpee. Cada rep = 1 burpee completo + 1 chest-to-bar.",
    founder_notes: "Uno de los movimientos más brutales del vocabulario CrossFit — cardio + pull + coordinación aérea en una rep. Ideal para chippers como el de SÁB M4 donde el objetivo es descomponer al atleta con volumen bajo pero alta demanda.",
    category: "conditioning",
    movement_pattern: "pull",
    difficulty: "advanced",
    equipment_required: ["pull_up_bar"],
    primary_muscles: ["lats", "biceps", "chest", "shoulders", "core", "quads"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Wide Mountain Climbers",
    name_es: "Mountain Climbers Anchos",
    description: "Variante de mountain climbers donde el pie aterriza afuera del hombro (stance amplio) en vez de al centro del cuerpo. Agrega estímulo a glute medio + abductores y aumenta la demanda de flexibilidad de cadera versus la versión clásica.",
    coaching_cue: "Posición de plank alto (manos bajo hombros, cuerpo en línea recta). En vez de traer la rodilla al pecho por el centro, la traés HACIA AFUERA del hombro del mismo lado — el pie aterriza afuera de la mano. Alternás piernas en ritmo rápido y continuo. Cadera baja, no levantada. Core apretado durante todo el movimiento.",
    founder_notes: "El mountain climber wide agrega dimensión lateral al drill clásico — más glute medio, más cadera, más quemazón. En chipper donde ya cansaste el core con V-ups, este cambia el plano y sigue castigando.",
    category: "conditioning",
    movement_pattern: "core",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["core", "hip_flexors", "glutes", "shoulders"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

const FILL = [
  {
    name: "Quadruped Scapular Push-up",
    description: "Scapular push-up ejecutado desde posición cuadrupedia (manos y rodillas apoyadas) en vez de plank. Aisla el movimiento escapular sin la carga de un plank completo — ideal como activación de serrato anterior y control escapular en warmup.",
    coaching_cue: "Cuadrupedia: manos directamente bajo los hombros, rodillas bajo las caderas. Sin doblar los codos, dejás que el pecho descienda entre los hombros — las escápulas se retraen (juntan hacia la columna). Empujás el piso alejando el pecho — las escápulas se protraen (separan hacia afuera y rodean las costillas). Solo movimiento escapular, brazos rectos todo el tiempo. Suave y controlado.",
    founder_notes: "Activación de serrato + protracción/retracción escapular sin el estrés del plank. En PRIME de shoulder day este drill despierta el serrato anterior que va a estabilizar el DB Shoulder Press.",
  },
  {
    name: "Over Under Fence Push-up",
    description: "Push-up dinámico donde el atleta desplaza el cuerpo lateralmente pasando 'por debajo' de una línea imaginaria (o cuerda/palo) entre reps, alternando lados. Combina push pattern con desplazamiento lateral + T-spine mobility bajo carga.",
    coaching_cue: "Posición de push-up ancha. Bajás el pecho al piso llevándolo hacia un lado (imaginate pasar por debajo de una valla baja). Del bottom, cambiás peso al otro lado y empujás para arriba desde el lado opuesto. Ese es 1 rep. Alternás lados en cada rep. El movimiento genera calor en hombros + T-spine y despierta el patrón push desde ángulos variables.",
    founder_notes: "Push-up con desplazamiento — activa escápula, mobilidad hombro, y patrón push desde múltiples ángulos. Perfecto para PRIME de shoulder day después de scap work.",
  },
  {
    name: "Dumbbell Shoulder Press",
    description: "Press de hombro vertical con dos dumbbells, sentado o de pie. Signature de fuerza de hombro — más rango completo y menos estrés en articulaciones que el press con barra, con más demanda unilateral por la libertad de las mancuernas.",
    coaching_cue: "Sentado en banco con respaldo vertical (o de pie con core apretado). DBs a la altura de los hombros con palmas hacia adelante, codos ligeramente por delante del torso, no perpendiculares. Empujás verticalmente hasta extender completamente los brazos overhead — los DBs SE JUNTAN pero no se golpean. Bajás controlado a la altura de los hombros con codos apuntando abajo, no atrás. El core apretado durante todo el rango — no arquear la lumbar. Respirá hacia arriba (exhalás) y llenás abajo (inhalás).",
    founder_notes: "El DB Shoulder Press permite rango completo sin bloquear los hombros como el BB Overhead Press. Signature de shoulder strength de M4 SÁB. La técnica 1.5 reps en W4-W5 (1 rep completa + 1 media rep en el bottom half) duplica el tiempo bajo tensión — brutal para hipertrofia.",
  },
  {
    name: "Spider Curl",
    description: "Curl de bicep sobre banco inclinado con el pecho apoyado, brazos colgando verticalmente. Aísla el bicep en máximo estiramiento — el ángulo neutraliza la contribución del hombro y elimina cualquier cheat con el torso.",
    coaching_cue: "Banco inclinado 45° con el pecho apoyado en el respaldo (mirando hacia el banco). DBs colgando verticalmente frente al pecho, brazos completamente extendidos. Sin mover los hombros, curl los DBs subiendo hasta contracción máxima del bicep. Los codos NO se mueven — quedan apuntando al piso todo el rep. Bajás con eccentric controlado hasta full stretch. Rango completo, ejecución obsesiva.",
    founder_notes: "El curl más honesto — el pecho apoyado en el banco elimina cualquier trampa. Peso moderado, control obsesivo. Signature bicep isolation de John Meadows lineage.",
  },
  {
    name: "Weighted Plank",
    description: "Plank isométrico con una plate (o disco) cargada sobre la espalda alta o lumbar. Aumenta la demanda anti-extension del core proporcional al peso agregado. Test de resistencia isométrica del core bajo carga.",
    coaching_cue: "Posición de plank alto o de antebrazos (elige el más estable para vos). Alineación: hombros/caderas/tobillos en línea recta. Un compañero (o vos mismo antes de empezar) coloca la plate sobre la espalda alta — no sobre la lumbar (evita compresión). Aguantás manteniendo la línea del cuerpo, sin dejar caer la cadera ni levantarla. Respirás normal. Si la cadera cae o se levanta = cortás la serie.",
    founder_notes: "Plank con carga — el estímulo del plank clásico se agota rápido en atletas avanzados. La plate agrega dimensión y hace del plank un ejercicio de fuerza core real. En SÁB M4 · 2 min bajo carga es un test de tenacidad.",
  },
];

console.log("═══ Creando exercises nuevos ═══\n");
for (const row of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) { console.log(`  ⏭  ${row.name} ya existe`); continue; }
  const { data: created, error } = await sb.from("exercises").insert(row).select("id").single();
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} (${created.id.slice(0,8)})`);
}

console.log("\n═══ Llenando cards incompletos ═══\n");
for (const row of FILL) {
  const { data: existing } = await sb.from("exercises").select("id, description, coaching_cue, founder_notes").eq("name", row.name).maybeSingle();
  if (!existing) { console.log(`  ⚠ ${row.name} NOT FOUND — skip`); continue; }
  const patch = {};
  if (!existing.description && row.description) patch.description = row.description;
  if (!existing.coaching_cue && row.coaching_cue) patch.coaching_cue = row.coaching_cue;
  if (!existing.founder_notes && row.founder_notes) patch.founder_notes = row.founder_notes;
  if (Object.keys(patch).length === 0) { console.log(`  ⏭  ${row.name} ya completo`); continue; }
  const { error } = await sb.from("exercises").update(patch).eq("id", existing.id);
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} · ${Object.keys(patch).join(", ")}`);
}

console.log("\n✓ Done.");
