/**
 * Re-escribe TODOS los ejercicios M3 + coach_notes con voz LIFTORY:
 *   - Descripción: 1-2 frases (qué + por qué)
 *   - Cue: 3-5 puntos declarativos cortos
 *   - Founder notes: 1 frase punchy con opinión/regla
 *   - Coach note: max 1 párrafo
 *
 * Menos es más. Comandos directos.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const REWRITES = [
  // ─── LUN W1 DENSITY DAY ───
  {
    name: "Wall Slide",
    description: "Activación de retractores escapulares contra la pared. Despierta serrato + trapecio bajo antes de cualquier press.",
    coaching_cue: "Talones, glúteo, espalda alta y cabeza tocan la pared. Brazos en \"W\" contra la pared. Sube a \"Y\" sin perder contacto. Si pierdes contacto, baja el rango.",
    founder_notes: "Warm-up #1 para días de press. Sin esto el press se va al deltoides anterior.",
  },
  {
    name: "Band Dislocates",
    description: "Pasada de liga overhead sin doblar codos. Test honesto de movilidad de hombro.",
    coaching_cue: "Agarre ancho (más ancho = más fácil). Brazos rectos toda la rep. Liga sube y va hacia atrás en arco. Si los codos se doblan, abre el agarre.",
    founder_notes: "Si no sale con agarre estándar, ahí está tu trabajo. 15-20 reps diarias.",
  },
  {
    name: "Banded Pull-Apart",
    description: "Apertura horizontal con liga. Activa rear delt + romboides + trapecio medio.",
    coaching_cue: "Liga al frente, brazos rectos a la altura de los hombros. Abre hacia atrás. Aprieta escápulas. La liga toca el pecho. Vuelve lento.",
    founder_notes: "El primo barato del face pull. Activa rear delt sin equipo.",
  },
  {
    name: "KB Around the World",
    description: "KB rotando alrededor del cuerpo a la altura de la cadera, cambiando manos. Warm-up KB que activa core + grip.",
    coaching_cue: "KB a la altura del ombligo. Camina la KB alrededor del cuerpo cambiando manos. Cadera estable, no rotes. Alterna direcciones cada 5 reps.",
    founder_notes: "Si vas a hacer KB todo el día, esto es el saludo al sol versión KB.",
  },
  {
    name: "KB Halo",
    description: "KB en los cuernos (campana arriba) circulando alrededor de la cabeza. Movilidad de hombro + activación de upper back.",
    coaching_cue: "KB en los cuernos, campana invertida. Pásala alrededor de la cabeza pegada al cráneo. Codos altos. Alterna direcciones cada 5 reps.",
    founder_notes: "El warm-up de hombro más subestimado.",
  },
  {
    name: "KB Alternating Z Press",
    description: "Press unilateral con KB sentado en Z (piernas extendidas). Sin piernas para asistir — todo el press viene del hombro + core anti-rotación.",
    coaching_cue: "Sentado piernas rectas adelante. Espalda erguida, sin doblar lumbar. KB en rack. Press overhead controlado, baja lento. Cambia lado por rep.",
    founder_notes: "El press más honesto. Sin trampa.",
  },
  {
    name: "Commando Pull-up",
    description: "Pull-up con agarre paralelo a la barra (manos enfrentadas, una delante de la otra). Sube alternando lado de la cabeza por rep.",
    coaching_cue: "Una mano delante de la otra. Sube llevando una oreja a un lado de la barra. Baja. Sube llevando la otra oreja al otro lado. Cuerpo en hollow.",
    founder_notes: "Pull-up con sabor a calistenia. Lat unilateral + oblicuos.",
  },
  {
    name: "Bent-Over DB Rear Delt Fly",
    description: "Apertura de rear delt de pie inclinado al frente. Esencial para hombros 3D.",
    coaching_cue: "Bisagra de cadera, torso casi paralelo al piso. Codos ligeramente flexionados. Abre llevando las DBs a los lados. Pellizca romboides arriba. NO uses momentum.",
    founder_notes: "El rear delt no se construye con peso pesado — se construye con tensión limpia.",
  },
  {
    name: "Push-up Combo (Wide-Standard-Close)",
    description: "15 push-ups en 3 anchos sin descanso: 5 abiertas + 5 normales + 5 cerradas. Pecho exterior → central → tríceps.",
    coaching_cue: "5 abiertas (manos 1.5× hombros). 5 normales (manos a ancho de hombros). 5 cerradas (manos juntas, codos pegados). Sin pausar. Si fallas, baja a rodillas.",
    founder_notes: "Finisher perfecto después de DB Bench. Tres ángulos en un combo.",
  },
  {
    name: "DB Skull Crusher",
    description: "Skull crusher acostado en banco. Isolación pura de tríceps largo.",
    coaching_cue: "Acostado en banco. DBs arriba, palmas enfrentadas. Codos fijos apuntando al techo. Baja DBs hacia los lados de la cabeza (no a la frente). Estira el tríceps largo. Empuja extendiendo el codo.",
    founder_notes: "El tríceps largo responde mejor al estiramiento que a la contracción.",
  },
  {
    name: "KB Skull Crusher",
    description: "Skull crusher acostado en banco con KBs de los cuernos. Campana detrás del antebrazo cambia el momento arm — tríceps largo trabaja distinto.",
    coaching_cue: "Acostado en banco. Agarra cada KB de los cuernos, campana detrás. Codos apuntando al techo, fijos. Baja KBs hacia los lados de la cabeza. Empuja extendiendo el codo.",
    founder_notes: "Reemplazo del DB Skull Crusher. Más estímulo al tríceps largo en estiramiento.",
  },
  {
    name: "Low Plank KB Press-Drag",
    description: "Plancha baja con press unilateral + drag de KB cruzando bajo el cuerpo. Anti-rotación + skill + serrato.",
    coaching_cue: "Plancha baja sobre antebrazos. Cadera cuadrada (no abras). Mano contraria agarra la KB, press al frente extendiendo el brazo paralelo al piso. Vuelve. Arrastra la KB cruzando bajo el pecho. 10/lado.",
    founder_notes: "El reemplazo del Russian Twist. Cero rotación con peso. Cintura pequeña, core indestructible.",
  },
  // Reusados rellenados en M3 LUN
  {
    name: "Scap Push-up",
    description: "Push-up reducido al movimiento puro de escápulas. Activa serrato y trapecio bajo — los músculos olvidados del press.",
    coaching_cue: "Plancha alta, brazos rígidos. Sin doblar codo. Empuja el piso para protraer (escápulas se separan). Aprieta escápulas atrás y abajo para retraer. Cadera estable.",
    founder_notes: "Activación obligatoria antes de cualquier press.",
  },
  {
    name: "Cable Lean-Away Lateral Raise",
    description: "Lateral raise unilateral con polea baja. Tensión constante en todo el rango — superior al DB.",
    coaching_cue: "Cable bajo. Te paras al lado, agarras con la mano más alejada. Inclina torso al lado opuesto del cable. Eleva el brazo lateral hasta la altura del hombro. Baja controlado.",
    founder_notes: "El cable da tensión constante. Aísla 100% la cabeza lateral del deltoides.",
  },
  {
    name: "Doorway Pec Stretch",
    description: "Estiramiento estático de pectoral + delt anterior en marco de puerta. Recovery obligado después de press.",
    coaching_cue: "Antebrazo apoyado en el marco, codo a 90° a la altura del hombro. Pie del mismo lado adelantado. Rota el torso lejos del brazo. Siente pecho + frente del hombro.",
    founder_notes: "Sin esto los pectorales acortados jalan los hombros adelante.",
  },
  {
    name: "Hollow Body Hold",
    description: "Posición isométrica de gimnasia. Lumbar pegada al piso, brazos y piernas extendidos. Base de la calistenia avanzada.",
    coaching_cue: "Boca arriba. Brazos extendidos detrás de la cabeza, piernas extendidas. Lumbar PEGADA al piso. Si se levanta, sube las piernas. Cuello relajado. Respira.",
    founder_notes: "Lumbar pegada es no-negociable. Mejor 20s perfectos que 60s compensando.",
  },

  // ─── MIE W1 SKILL DAY ───
  {
    name: "Wrist Mobility",
    description: "Movilidad activa de muñeca: CARs + flexión/extensión cargada. Obligado antes de front rack o false grip.",
    coaching_cue: "60s mezcla: 10 CARs cada dirección. Cuadrupedia con manos al frente (flexión). Manos al revés, dedos hacia las rodillas (extensión). Si duele, baja el rango.",
    founder_notes: "Sin muñeca preparada, el front rack es un compromiso lumbar.",
  },
  {
    name: "Scap Pull",
    description: "Retracción + depresión escapular en pull-up bar. Sin doblar codos. Activa el complejo escapular antes de pulls cargados.",
    coaching_cue: "Dead hang, brazos extendidos. Sin doblar codos. Aprieta escápulas atrás y abajo — el cuerpo sube unos cm. Pausa 1s. Baja a dead hang.",
    founder_notes: "Sin activación escapular el pull se va a bíceps puro y el hombro paga.",
  },
  {
    name: "Double KB Deadlift",
    description: "Deadlift con KB en cada mano entre los pies. Prep clásica del KB Complex.",
    coaching_cue: "KBs entre los pies. Bisagra: empuja cadera atrás, agarra handles. Lat tight (axilas activas). Sube empujando el piso, KBs pegadas a las piernas. Arriba: cadera fully extended.",
    founder_notes: "Si el patrón de hinge no es limpio, el Complex se rompe en el swing.",
  },
  {
    name: "Double KB Front Rack Hold",
    description: "Isométrica con KBs en rack. Core anti-extensión + estabilidad de hombro + grip.",
    coaching_cue: "KBs en rack, campanas sobre antebrazos. Codos al frente, manos cerca de clavículas. Costillas abajo (no arquees lumbar). Respira por la nariz. Mantén 20s.",
    founder_notes: "Si no aguantas 20s en rack, no tienes base para el thruster.",
  },
  {
    name: "Double KB Strict Press",
    description: "Press overhead estricto con dos KBs desde rack. Sin trampa de piernas.",
    coaching_cue: "KBs en rack. Pies anclados, glúteo + core apretados. Presiona overhead sin piernas. Codos terminan al lado de las orejas. Baja controlado al rack.",
    founder_notes: "El press estricto enseña control. Push press es para output.",
  },
  {
    name: "Double KB Complex",
    description: "5 movimientos encadenados sin soltar las KBs: Swing → Swing Squat → High Pull → Clean → Thruster. Hombros + lats + glúteo + grip + conditioning.",
    coaching_cue: "1 rep = Swing → Swing Squat → High Pull → Clean → Thruster sin soltar. 5 reps = 1 set. KBs moderadas en W1. Si la técnica colapsa, sueltas y descansas.",
    founder_notes: "Marcus Filly puro. Si dominas este complex, dominas KB.",
  },
  {
    name: "MU Burpee",
    description: "Burpee + jump-to-bar + Muscle-Up. Skill calisténico + output máximo.",
    coaching_cue: "1 rep = burpee con pecho a piso → jump-to-bar → Muscle-Up. Si no sacas MU, escala según las regresiones (R1 Banded · R2 Jumping · R3 High Pull-up + Bar Dip · R4 Pull-up + Push-up).",
    founder_notes: "El benchmark del skill day. Mezcla output + skill con regresión accesible.",
  },
  {
    name: "Ice Cream Maker",
    description: "Skill gimnástico desde top de pull-up. Bajas controlado a horizontal con piernas extendidas (scoop motion) y subes.",
    coaching_cue: "Empiezas en chin-to-bar arriba. Bajas controlado a horizontal con cuerpo recto y piernas extendidas (scoop motion). Subes a chin-to-bar manteniendo tensión.",
    founder_notes: "Si no sacas uno limpio, regresión: hold isométrico en horizontal con piernas tucked.",
  },
  {
    name: "KB Gorilla Row",
    description: "Row alternante con dos KBs en piso entre las piernas en hinge profundo. Back density + anti-rotación extrema.",
    coaching_cue: "2 KBs en el piso entre las piernas. Hinge profundo, espalda neutral. Una mano apoyada en la KB del piso, la otra rema. Codo va al costado. Cadera no rota. Alterna brazos.",
    founder_notes: "El row más completo para back density. Si la cadera rota, perdés el ejercicio.",
  },
  {
    name: "DB High Pull + Squat Clean Complex",
    description: "Complex de 2 movimientos encadenados: DB High Pull desde hang + DB Squat Clean a rack. Traps + cadera + cuádriceps + grip en flow.",
    coaching_cue: "1 rep = 1 DB High Pull (hang → triple extensión → high pull a clavículas) + 1 DB Squat Clean (caes en squat con DBs en rack, te levantas). 6 reps consecutivas = 1 set.",
    founder_notes: "Power-based, no curl. Marcus Filly territory.",
  },
  {
    name: "DB Cross-Body Curl",
    description: "Curl llevando la DB en diagonal hacia el hombro opuesto. Carga brachialis + porción larga del bíceps con énfasis distinto.",
    coaching_cue: "Agarre neutro (palmas hacia adentro). Curl en diagonal llevando la DB hacia el hombro opuesto — cruza el pecho. Codo fijo al costado. Aprieta bíceps arriba. Baja lento. Alterna.",
    founder_notes: "La diagonal pellizca la porción larga del bíceps + brachialis.",
  },
  {
    name: "L-Sit Hold (tuck)",
    description: "Regresión del L-Sit. Cuerpo en el aire apoyado en manos, rodillas dobladas al pecho (tuck). Abs + hip flexors + estabilidad de hombro.",
    coaching_cue: "Manos a los lados (piso, parallettes o bloques). Deprime los hombros — sin encojer. Eleva el cuerpo del piso. Rodillas al pecho en tuck. Brazos rectos. 15s sin colapsar.",
    founder_notes: "Si no aguantas 15s en tuck, no estás listo para extender piernas.",
  },
  {
    name: "Wall Lat Stretch",
    description: "Estiramiento estático de lats apoyando manos en pared en hinge de cadera. Recovery clave después de lat volume + pulls.",
    coaching_cue: "De rodillas o de pie a 1m de la pared. Manos altas sobre la pared. Empuja la cadera atrás haciendo bisagra. El pecho baja. Siente desde axilas hasta cadera. 60s.",
    founder_notes: "Sin stretch de lat, al día siguiente el hombro está corto y bloqueado.",
  },
  {
    name: "Hanging Stretch",
    description: "Dead hang pasivo. La gravedad descomprime la columna y estira lats + cápsula del hombro.",
    coaching_cue: "Cuelga de la barra con agarre cómodo (al ancho de hombros o un poco más ancho). Relaja todo el cuerpo. Hombros suben hacia las orejas (pasivo). Respira. 60s.",
    founder_notes: "El recovery del skill day. Descomprime columna después de Complex + Lat Volume.",
  },
  {
    name: "Dead Hang",
    description: "Cuelga activo o pasivo desde pull-up bar. Test de grip + estabilidad escapular base.",
    coaching_cue: "Cuelga al ancho de hombros, brazos extendidos. Versión activa (warmup): escápulas atrás y abajo, no encojas. Versión pasiva (recovery): hombros suben relajados.",
    founder_notes: "Si no aguantas 20s en dead hang activo, ese es tu base.",
  },

  // ─── VIE W1 UPPER HYPERTROPHY ───
  {
    name: "Quadruped T-Spine Rotation",
    description: "Movilidad activa de columna torácica en cuadrupedia. Aísla la rotación al t-spine sin compensar con lumbar.",
    coaching_cue: "Cuadrupedia, manos bajo hombros, rodillas bajo cadera. Mano detrás de la nuca. Rota el codo apuntando al techo siguiendo con la mirada. Cadera estable. Vuelve. 8/lado.",
    founder_notes: "El mejor drill para abrir t-spine antes de press o pull pesado.",
  },
  {
    name: "Push-up to Alternating Toe Touch",
    description: "Push-up + downward dog con rotación alterna a tocar tobillo opuesto. Activa pecho, core, hamstring y t-spine.",
    coaching_cue: "Push-up completo → empuja a downward dog (cadera arriba) → con una mano cruza para tocar el tobillo OPUESTO → vuelve a plancha → push-up → alterna. 4 por lado = 8 totales.",
    founder_notes: "Despierta todo el cuerpo en menos de 1 minuto.",
  },
  {
    name: "Half-Kneeling KB Snatch + Windmill",
    description: "Snatch de KB a overhead desde media rodilla + windmill manteniendo KB arriba. Estabilidad de hombro + cadera + anti-lateral flexion.",
    coaching_cue: "Media rodilla (rodilla del lado de la KB en piso). Snatch KB del piso a overhead. KB arriba, brazo bloqueado. Inclina torso lateral hacia la rodilla en piso → mano libre toca el piso. Vuelve. 5 por lado.",
    founder_notes: "El warm-up de hombro más completo. Hybrid athlete signature.",
  },
  {
    name: "Incline DB Bench Press",
    description: "Press con DBs en banco inclinado a 30-45°. Cambia el énfasis al pec superior — el músculo más olvidado del press.",
    coaching_cue: "Banco a 30-45°. DBs bajan a la altura del pecho clavicular. Codos a 45° del torso. Empuja juntando ligeramente las DBs arriba. Escápulas retraídas.",
    founder_notes: "Pec superior bien construido = el shelf que da forma 3D al pecho.",
  },
  {
    name: "DB Rotational Lateral Raise",
    description: "Lateral raise con brazos a 90° fijos. Empieza con DBs juntas bajo el pecho, las llevas en arco a los lados de la cabeza manteniendo 90°.",
    coaching_cue: "DBs livianas. Brazos a 90° (codos fijos en ese ángulo). Manos juntas al frente bajo el pecho. Lleva las DBs en arco hacia los lados de la cabeza — los codos suben. Mantén 90° constante.",
    founder_notes: "Patrón único. Cargas livianas, foco en el patrón.",
  },
  {
    name: "Pec Deck Rear Delt Fly",
    description: "Rear delt fly en pec deck al revés (pecho pegado al respaldo). La máquina elimina compensación. Aislamiento puro.",
    coaching_cue: "Sentado al revés, pecho contra el respaldo. Agarra los handles. Codos ligeramente flexionados, fijos. Abre brazos hacia atrás. Aprieta romboides arriba. Vuelve controlado. Cero balanceo.",
    founder_notes: "La forma más limpia de cargar rear delt.",
  },
  {
    name: "EZ Bar Preacher Curl",
    description: "Curl con EZ bar en banco predicador. Carga el bíceps en posición estirada — donde la cabeza corta más responde a hipertrofia.",
    coaching_cue: "Tríceps apoyados firme en la almohadilla. Agarre EZ ancho moderado. Baja la barra a extensión casi completa (estira el bíceps). Curl arriba apretando. Cero balanceo.",
    founder_notes: "Si no entrenas el bíceps en stretch, dejas el 30% del crecimiento en la mesa.",
  },
  {
    name: "Cable Overhead Tricep Extension (rope)",
    description: "Tricep extension overhead con cable + cuerda. Estira el tríceps largo en posición elongada — donde más responde a hipertrofia.",
    coaching_cue: "De espaldas a la polea. Cuerda por encima de la cabeza, codos al frente. Codos fijos, NO se abren. Extiende los brazos al frente, manos separadas. Baja al estiramiento profundo.",
    founder_notes: "El pushdown carga la cabeza lateral. El overhead carga la larga.",
  },
  {
    name: "Weighted Dip",
    description: "Fondo en paralelas con lastre (cinturón + cadena + disco). Compound clásico pecho + tríceps + delt anterior.",
    coaching_cue: "Cinturón con lastre. Brazos extendidos en barras. Tronco ligeramente inclinado adelante para énfasis pecho. Baja hasta que hombros queden nivel con codos. Empuja apretando pecho. Codos siguen el cuerpo.",
    founder_notes: "El compound más subestimado para pecho/tríceps. Carga progresiva real.",
  },
  {
    name: "Incline Walk steady pace",
    description: "Caminata en caminadora a 12-15% incline, ritmo conversacional. Z2 cardio. Recovery cardiovascular sin saturar CNS.",
    coaching_cue: "Caminadora a 12-15% incline. Velocidad cómoda — puedes hablar pero no cantar. 15 min steady. NO te agarres del manubrio. Postura erguida.",
    founder_notes: "Z2 = el secreto silencioso de los hybrid athletes.",
  },

  // ─── SÁB W1 LOWER HYPERTROPHY ───
  {
    name: "Lateral Bound",
    description: "Salto plyo unilateral lateral. Despierta CNS unilateral antes de cargar una pierna con barra.",
    coaching_cue: "De pie en una pierna. Empuja explosivamente al lado. Aterriza en la OTRA pierna. Aterrizaje suave, pausa 1s estable. Salto al otro lado. 5 por lado alternando.",
    founder_notes: "Sin esto, tu cadera no está lista para cargar una pierna con barra.",
  },
  {
    name: "Kang Squat",
    description: "Combo squat + RDL en un solo flujo bodyweight. Graba squat y hinge en posiciones extremas.",
    coaching_cue: "(1) Baja en squat profundo. (2) Sin levantarte, extiende rodillas → quedas en RDL profundo. (3) Vuelve a squat doblando rodillas. (4) Levántate normal. 1 rep.",
    founder_notes: "El warm-up del bodybuilder antiguo. Perfecto pre-Bulgarian + RDL.",
  },
  {
    name: "Barbell Bulgarian Split Squat",
    description: "Sentadilla unilateral con barra libre sobre los hombros. Pie trasero elevado. Versión elite del Bulgarian.",
    coaching_cue: "Barra libre en back squat. Pie trasero elevado en banco. Torso ligeramente inclinado adelante. Baja hasta que el muslo de adelante quede paralelo al piso. Empuja con el pie de adelante. Si pierdes balance, baja peso.",
    founder_notes: "La barra libre añade demanda neural enorme. Construye propiocepción + fuerza unilateral real.",
  },
  {
    name: "Snatch-Grip Romanian Deadlift",
    description: "RDL con agarre snatch (muy ancho). Carga upper back + traps + lats al mismo tiempo que glute + ham.",
    coaching_cue: "Agarre snatch (manos casi en los discos). Bisagra profunda, espalda neutral, lats apretados. Baja al medio de la espinilla. Sube empujando cadera al frente, aprieta glúteo arriba.",
    founder_notes: "Carga 6 grupos musculares en un solo ejercicio. Hybrid athlete signature.",
  },
  {
    name: "DB Walking Lunges",
    description: "Walking lunges con DBs pesadas. Paso largo. Hipertrofia unilateral + balance + conditioning suave.",
    coaching_cue: "DB en cada mano, brazos colgando. Paso LARGO al frente (largo = glúteo). Baja hasta que la rodilla trasera casi toque el piso. Empuja con el pie de adelante. Alterna. 12/lado.",
    founder_notes: "Walking añade dinámico + conditioning suave. Con DBs pesadas en hipertrofia = volumen serio.",
  },
  {
    name: "Cable Pull-Through",
    description: "Hinge con cable + cuerda entre las piernas. Aísla glúteo desde ángulo horizontal — patrón del hip thrust con cable.",
    coaching_cue: "De espaldas a la polea baja. Cuerda entre las piernas, agarrada con dos manos. 2 pasos al frente para tensar. Hinge: empuja cadera atrás. Vuelve extendiendo cadera, aprieta glúteo arriba.",
    founder_notes: "Mejor que RDL para aislar glúteo. Tensión horizontal sin demandar lumbar.",
  },
  {
    name: "Standing Calf Raise pause-at-top",
    description: "Calf raise de pie con pausa de 1s arriba. La pausa carga el calf en la posición acortada — para hipertrofia real de gastrocnemius.",
    coaching_cue: "DB en cada mano (o máquina). Punta del pie en escalón, talón cuelga. Baja a estiramiento completo. Sube empujando con la planta. PAUSA 1s arriba apretando. Baja controlado.",
    founder_notes: "El calf solo crece con pausa arriba + rango completo + reps altas.",
  },
  {
    name: "Farmer Carry",
    description: "Caminata cargando DB pesada en cada mano. Grip + traps + posture + core. El pillar del hybrid athlete.",
    coaching_cue: "DB pesada en cada mano. Postura erguida — pecho arriba, hombros atrás (no encojas). Pasos a buen ritmo SIN correr. Mantén postura los 20m. Si la postura se rompe, peso muy alto.",
    founder_notes: "El carry pillar del hybrid athlete. Sin esto no eres atleta funcional, solo gymrat.",
  },
];

console.log("══ Re-escribiendo ejercicios con voz LIFTORY ══\n");
let updated = 0, skipped = 0;
for (const r of REWRITES) {
  const { data: existing } = await sb.from("exercises").select("id, description, coaching_cue, founder_notes").eq("name", r.name).maybeSingle();
  if (!existing) { console.log(`  ✗ "${r.name}" no encontrado`); continue; }
  const { error } = await sb.from("exercises").update({
    description: r.description,
    coaching_cue: r.coaching_cue,
    founder_notes: r.founder_notes,
  }).eq("id", existing.id);
  if (error) { console.error(`  ✗ "${r.name}":`, error.message); continue; }
  console.log(`  ✓ "${r.name}"`);
  updated++;
}
console.log(`\n${updated} cards actualizadas`);

// ════════════════════════════════════════════════════════════════════════════
// COACH NOTES + SHORT NOTES — re-escritos cortos
// ════════════════════════════════════════════════════════════════════════════

const COACH_NOTES = {
  // LUN DENSITY DAY
  "DENSITY DAY": {
    coach: "Density Day. EMOM 12 min (Z Press + Commando alternando) · pec superior + lateral aislado · arm block tríceps · core anti-extensión. Hombros 3D + V-taper.",
    short: "¿Sin tiempo? Density Block + Skill Push. Salta Hypertrophy. NUNCA saltes Recovery.",
  },
  // MIE SKILL DAY
  "SKILL DAY": {
    coach: "Skill Day. Double KB Complex 3×5 (Swing → Swing Squat → High Pull → Clean → Thruster). MU Burpee For Time 40 reps · cap 12 min (4 regresiones en la nota del bloque). Lat volume + Pull complex + bíceps + gymnastic core.",
    short: "¿Sin tiempo? KB Complex + MU Burpee + Lat Volume. Salta Arm + Core. NUNCA saltes Recovery.",
  },
  // VIE UPPER HYPERTROPHY
  "UPPER HYPERTROPHY": {
    coach: "Upper Hypertrophy + Strength. Incline DB Bench 4×10 + CS Row 4×10 (heavy push/pull). Shoulder 3D + Arm Superset 3 rondas. Cierre con Weighted Dip 3×6. Opcional Z2 caminadora 15 min.",
    short: "¿Sin tiempo? Heavy Push + Heavy Pull + Shoulder 3D + Arm. Salta Z2. NUNCA saltes Recovery.",
  },
  // SÁB LOWER HYPERTROPHY
  "LOWER HYPERTROPHY": {
    coach: "Lower Hypertrophy Unilateral. Barbell Bulgarian 4×8/lado (signature) + Snatch-Grip RDL 3×8. Glute volume: Walking Lunges + Pull-Through. Sled Push engine. Calf + Carry pillar.",
    short: "¿Sin tiempo? Bulgarian + Snatch-Grip + Glute Volume. Salta Sled. NUNCA saltes Carry + Recovery.",
  },
};

console.log("\n══ Re-escribiendo coach_notes ══\n");
for (const [dayLabel, notes] of Object.entries(COACH_NOTES)) {
  const { data: workouts } = await sb.from("workouts").select("id, day_label, user_id").or(`day_label.eq.${dayLabel},day_label.eq.W1 ${dayLabel}`);
  if (!workouts?.length) { console.log(`  ✗ ${dayLabel}: sin workouts`); continue; }
  for (const w of workouts) {
    await sb.from("workouts").update({
      coach_note: notes.coach,
      short_on_time_note: notes.short,
    }).eq("id", w.id);
  }
  console.log(`  ✓ ${dayLabel}: ${workouts.length} workouts`);
}

console.log("\n✓ Re-escritura LIFTORY completa");
