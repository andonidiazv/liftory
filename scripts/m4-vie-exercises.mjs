/**
 * M4 · VIE LOWER HINGE · ejercicios: crear 5 nuevos + llenar 2 cards.
 * Todos con card completa (regla crítica).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NEW = [
  {
    name: "Sumo Deadlift",
    name_es: "Peso Muerto Sumo",
    description: "Deadlift con postura ancha (pies más allá de la anchura de hombros, puntas hacia afuera) y agarre por dentro de las piernas. Reduce la distancia que la barra viaja (versus convencional) y desplaza más trabajo a glúteos, aductores y quads con menor demanda de espalda baja. Signature hinge para atletas que priorizan glute + torso más vertical.",
    coaching_cue: "Pies muy anchos, puntas ligeramente afuera (45°). Barra sobre medio-pie, casi tocando las espinillas. Bajá agarrando la barra por DENTRO de las piernas, agarre a la anchura de los hombros. Cadera baja, torso lo más vertical posible (más vertical que convencional). Pecho arriba, hombros ligeramente por delante de la barra. Empujá el piso con los pies plantados FIRMES — no despegues los talones. La barra sube pegada a las espinillas → muslos. En el top, glúteo apretado sin hiperextender la lumbar. Bajá controlado la misma línea.",
    founder_notes: "El signature de VIE LOWER HINGE en M4. Sumo por preferencia: torso más vertical = menos estrés lumbar que convencional, más carga a glúteo. La curva del meso lleva de 4×10 en W1 hasta 4×4 en W5 — es progresión de intensidad pura, cargando peso cada semana. Técnica > peso siempre. Si perdés el pecho arriba, para y baja peso.",
    category: "strength",
    movement_pattern: "hinge",
    difficulty: "intermediate",
    equipment_required: ["barbell"],
    primary_muscles: ["glutes", "hamstrings", "adductors", "quads", "posterior_chain"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Bodyweight Sumo RDL",
    name_es: "Sumo RDL Corporal",
    description: "Romanian Deadlift con postura sumo (pies anchos, puntas afuera) sin peso. Warmup específico para grabar el patrón hinge en la stance del Sumo Deadlift signature del día — cadera atrás, torso vertical, hamstrings estirando.",
    coaching_cue: "Pies muy anchos, puntas 45° afuera (mismo setup que el Sumo DL). Manos deslizan por los muslos hacia las rodillas. Cadera ATRÁS (no bajás — echás la cadera hacia atrás como si cerraras una puerta con el culo). Torso vertical, pecho arriba. Bajás hasta sentir stretch en los hamstrings (no hasta tocar el piso). Empujás las caderas hacia adelante para volver arriba, apretando glúteo en el top.",
    founder_notes: "Prep hinge sin carga antes del Sumo DL pesado. 8 reps te alcanzan para grabar el pattern — no busques rango extremo, buscá calidad del hinge.",
    category: "mobility",
    movement_pattern: "hinge",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["hamstrings", "glutes", "posterior_chain"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "American KB Swing",
    name_es: "American Swing con Kettlebell",
    description: "Kettlebell swing con final overhead (KB por encima de la cabeza, brazos extendidos). Versión más demandante que el Russian swing — agrega rango completo overhead + más trabajo posterior chain + shoulder por el arco extendido. Signature ballistic hinge de CrossFit.",
    coaching_cue: "KB entre los pies, agarre bilateral (dos manos). Hinge profundo (cadera atrás, no squat), KB pasa entre las piernas. Explosión de cadera + glute — la KB no la levantás con brazos, la lanzás con la cadera. El swing sube en arco hasta que la KB queda directamente overhead con brazos extendidos y bíceps cerca de las orejas. Cadera y rodillas totalmente extendidas en el top. Bajás controlado — la KB baja + hinge atrás en el mismo tempo. Rep continua sin pausa arriba.",
    founder_notes: "El swing que pega fuerte. Overhead final = más demanda de hombro y core anti-extensión que Russian. 15 reps por minuto en un EMOM de 8 es carga alta de posterior chain + capacidad cardiovascular — este es el día que se siente 'atlético'.",
    category: "conditioning",
    movement_pattern: "hinge",
    difficulty: "intermediate",
    equipment_required: ["kettlebell"],
    primary_muscles: ["glutes", "hamstrings", "posterior_chain", "shoulders", "core"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "KB Sit-up to Press",
    name_es: "Sit-up con KB a Press",
    description: "Sit-up completo desde el piso con una kettlebell al pecho, terminando con un press overhead cuando el torso queda vertical. Combina flexión de tronco cargada con press vertical explosivo — trabajo de rectus + hip flexor + shoulder overhead en un solo movimiento.",
    coaching_cue: "Acostado boca arriba, rodillas dobladas, pies planos en el piso. KB agarrada de los cuernos, sobre el pecho. Levantás el torso con un sit-up completo controlado (no jaloneo — usá el core). Cuando el torso queda vertical (sentado), empujás la KB overhead con press directo, brazos completamente extendidos. Bajás la KB al pecho controlada y bajás con control hacia el piso hasta la posición inicial. Todo continuo, sin descanso en el top o bottom.",
    founder_notes: "Core dinámico + press overhead en un solo movimiento — economía de tiempo. Peso: KB moderada (12-16kg atleta intermedio, 20kg avanzado). Si el press cuesta más que el sit-up, bajá el peso.",
    category: "accessory",
    movement_pattern: "core",
    difficulty: "intermediate",
    equipment_required: ["kettlebell"],
    primary_muscles: ["core", "hip_flexors", "shoulders", "triceps"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "1/2 Kneeling Cable Chop",
    name_es: "Cable Chop en Half-Kneeling",
    description: "Chop diagonal con cable desde posición half-kneeling (una rodilla en piso, la otra doblada al frente). El cable resiste el movimiento rotacional del torso mientras el atleta lo lleva de arriba (esquina alta) hacia abajo del lado opuesto en un patrón diagonal. Trabaja core rotacional + estabilización de cadera.",
    coaching_cue: "Setup half-kneeling: rodilla del lado del cable en el piso, otra rodilla flexionada al frente (planta apoyada). Cadera cuadrada al frente, no rotada. Agarrás la barra o cuerda del cable desde la esquina alta con las dos manos. Iniciás el chop llevando la carga en diagonal desde arriba (lado del cable) hacia abajo del lado opuesto — el movimiento arranca en el torso, no en los brazos. Brazos rectos durante todo el arco. Regresás controlado a la posición inicial sin dejar que el cable te lleve. Cadera SIEMPRE cuadrada — no rotes las caderas.",
    founder_notes: "Chop rotacional con carga cable. Half-kneeling estabiliza la cadera y aísla el trabajo rotacional al torso.",
    category: "accessory",
    movement_pattern: "rotation",
    difficulty: "intermediate",
    equipment_required: ["cable_machine"],
    primary_muscles: ["obliques", "core", "shoulders"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

const FILL = [
  {
    name: "Banded Clamshell",
    description: "Ejercicio de activación de glute medio en decúbito lateral. Rodillas dobladas, banda alrededor de las rodillas — se separa la rodilla superior contra la resistencia de la banda mientras los pies permanecen juntos, imitando la apertura de una concha.",
    coaching_cue: "Acostado de lado con las rodillas dobladas 45° y los pies juntos. Banda arriba de las rodillas. Cadera perpendicular al piso, no rotes hacia atrás. Sin mover los pies o los hombros, abre la rodilla de arriba contra la banda. Aguantás 1s en el peak, sentí la contracción en el glute medio (parte lateral de la cadera). Regresás controlado. La cadera de abajo no se despega del piso.",
    founder_notes: "El drill más simple para activar el glute medio, estabilizador clave de cadera lateral. En PRIME de LOWER HINGE es prep de estabilización lateral antes del Sumo DL heavy.",
  },
  {
    name: "Side Plank",
    description: "Plank en decúbito lateral apoyado en un antebrazo y el lado del pie. El cuerpo forma una línea recta desde el hombro hasta los tobillos, manteniendo la cadera elevada por acción del oblicuo y el cuadrado lumbar. Anti-lateral flexion isométrico puro.",
    coaching_cue: "Acostado de lado, apoyado en el antebrazo (codo directamente debajo del hombro). Pies apilados, el de arriba sobre el de abajo. Elevás la cadera del piso hasta formar una línea recta desde el tobillo hasta el hombro. Aprietá glúteo y core para mantener la línea. La cadera NO cae — si cae, cortás la serie. Respirás normal. Cabeza neutral, cuello relajado.",
    founder_notes: "Anti-lateral flexion isométrico. En EMOM alternando con Swings, el Side Plank es el 'descanso activo' del swing — bajás la intensidad cardiovascular pero seguís cargando el core en un plano opuesto al hinge.",
  },
];

console.log("═══ Creando ejercicios nuevos ═══\n");
for (const row of NEW) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) { console.log(`  ⏭  ${row.name} ya existe`); continue; }
  const { data: created, error } = await sb.from("exercises").insert(row).select("id").single();
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} (id ${created.id.slice(0,8)})`);
}

console.log("\n═══ Llenando cards incompletos ═══\n");
for (const row of FILL) {
  const { data: existing } = await sb.from("exercises").select("id, description, coaching_cue, founder_notes").eq("name", row.name).maybeSingle();
  if (!existing) { console.log(`  ⚠ ${row.name} NOT FOUND — skip`); continue; }
  const patch = {};
  if (!existing.description) patch.description = row.description;
  if (!existing.coaching_cue) patch.coaching_cue = row.coaching_cue;
  if (!existing.founder_notes) patch.founder_notes = row.founder_notes;
  if (Object.keys(patch).length === 0) { console.log(`  ⏭  ${row.name} completo`); continue; }
  const { error } = await sb.from("exercises").update(patch).eq("id", existing.id);
  if (error) { console.error(`  ✗ ${row.name}: ${error.message}`); process.exit(1); }
  console.log(`  ✓ ${row.name} · ${Object.keys(patch).join(", ")}`);
}

console.log("\n✓ Done.");
