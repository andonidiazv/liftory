/**
 * M4 exercises · creación + relleno idempotente
 *
 * 17 nuevos + 5 con card incompleta.
 * Todos con card completa (name, name_es, description, coaching_cue,
 * founder_notes, category, movement_pattern, difficulty, equipment_required,
 * primary_muscles). Regla crítica.
 *
 * Idempotente: si el ejercicio ya existe con card completo, hace skip. Si
 * existe pero incompleto, hace UPDATE de los campos vacíos. Si no existe,
 * INSERT completo.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// movement_pattern must be one of: carry, core, hinge, locomotion, pull, push, rotation, squat
// category convention observed: strength / mobility / conditioning / accessory
// difficulty: beginner / intermediate / advanced / all_levels

const EXERCISES = [
  // ═══════════════════════════════════════════════════════════
  // PULL DAY
  // ═══════════════════════════════════════════════════════════
  {
    name: "Prone Y-T-W",
    name_es: "Y-T-W en Prono",
    description: "Serie de tres posiciones de brazo (Y, T, W) tumbado boca abajo, elevando los brazos contra la gravedad para activar rear delt, romboides, trapecio medio y bajo, y todo el rotator cuff. Warmup de escápula fundamental para push y pull days.",
    coaching_cue: "Boca abajo en el piso (o banco inclinado plano). Frente en el piso. Sube los brazos formando una Y (45° arriba de la cabeza, pulgares al techo), aguantá 1s, bajá. Después T (brazos en cruz a los lados, pulgares al techo). Después W (codos flexionados a 90° pegados al torso, antebrazos levantados). 5 reps de cada = 1 serie. Aprieta escápulas hacia atrás y abajo en cada posición. Cuello relajado.",
    founder_notes: "Rear delt + rotator cuff son el seguro de hombro por 10 años. Este drill es no-negociable en PRIME de cualquier push o pull day. 90 segundos de trabajo con retorno enorme en salud articular.",
    category: "mobility",
    movement_pattern: "pull",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["rear_deltoid", "rotator_cuff", "mid_trapezius", "lower_trapezius", "rhomboids"],
  },
  {
    name: "Meadows Row",
    name_es: "Meadows Row",
    description: "Row unilateral con landmine o T-bar cargada en una esquina. Signature de John Meadows — cuerpo en posición staggered, mano libre apoyada en la rodilla, jalás la barra hacia la cadera del mismo lado con foco en retracción escapular y estiramiento del lat en el bottom. El rey de la thickness de espalda.",
    coaching_cue: "Cargá una barra en landmine o esquina. Parate perpendicular a la barra, un pie adelantado (el mismo del brazo que jala), inclinado 45° desde la cadera. Mano libre apoyada en la rodilla adelantada. Agarrá el extremo cargado con agarre neutro (mano de la parte trasera). Iniciá el jalón con la ESCÁPULA (no el brazo), llevando el codo hacia atrás y hacia la cadera del mismo lado. Contactá cerca de la cintura. Descenso controlado 3s — el stretch abajo es donde crece el lat.",
    founder_notes: "El signature de PULL DAY en M4. Grosor real, no artificial. Meadows era obsesivo con el eccentric — bajá lento aunque duela. Preservá forma sobre peso siempre. Este es el ejercicio que te construye el V-taper.",
    category: "strength",
    movement_pattern: "pull",
    difficulty: "intermediate",
    equipment_required: ["barbell", "landmine"],
    primary_muscles: ["lats", "rhomboids", "mid_trapezius", "rear_deltoid", "biceps"],
  },
  {
    name: "Straight-Arm Pulldown",
    name_es: "Jalón con Brazos Rectos",
    description: "Aislamiento de lat con cable alto. Brazos rectos (codos bloqueados), el movimiento sucede en el hombro — jalás la barra o cuerda desde arriba hasta los muslos manteniendo torso vertical. Corta la contribución del bicep y aísla el lat en su plano de acción.",
    coaching_cue: "Cable en la polea alta con barra recta o cuerda. Parate 1 paso atrás, cadera ligeramente flexionada, torso 20° adelante. Agarra con manos anchura de hombros. Codos LIGERAMENTE flexionados y BLOQUEADOS ahí — no cambien de ángulo. Jala con el hombro (aducción + extensión) hasta que la barra toque los muslos. Sentí el lat comprimir. Deja que el brazo suba controlado hasta stretch total arriba. El movimiento es de HOMBRO, no de codo.",
    founder_notes: "El isolation puro del lat. Si el rowing te construye la caja, este te construye la amplitud. Los codos que se doblan durante la rep = perdiste el ejercicio. Peso ligero, control obsesivo.",
    category: "accessory",
    movement_pattern: "pull",
    difficulty: "beginner",
    equipment_required: ["cable_machine"],
    primary_muscles: ["lats", "teres_major"],
  },
  {
    name: "Chest-Supported SA Cable Row",
    name_es: "Row en Banco con Cable Unilateral",
    description: "Row unilateral con el pecho apoyado en banco inclinado 30-45° apuntando al cable. La combinación banco+cable elimina toda trampa lumbar, corrige asimetrías bilaterales, y el cable da tensión constante. Signature muy Marcus Filly / functional bodybuilding.",
    coaching_cue: "Banco inclinado 30-45° apuntando hacia el cable bajo. Pecho apoyado en el banco (talones hacia atrás para estabilidad). Agarrá el cable con la mano opuesta al lado del pecho apoyado (o unilateral straight). Codo cerca del torso, jalá con el omóplato hacia atrás. En el peak, apretá 1 segundo el mid-back. Dejá que el hombro se estire adelante en el bottom para stretch máximo del lat. Sin trampa lumbar — el pecho no despega del banco.",
    founder_notes: "Este ejercicio es la evolución del DB Row para hipertrofia. Chest apoyado = cero cheat. Cable = tensión constante. Unilateral = fix asimetrías. Todo lo que un maduro atleta necesita para volumen de espalda inteligente.",
    category: "accessory",
    movement_pattern: "pull",
    difficulty: "intermediate",
    equipment_required: ["cable_machine", "bench"],
    primary_muscles: ["lats", "rhomboids", "mid_trapezius", "rear_deltoid"],
  },

  // ═══════════════════════════════════════════════════════════
  // LOWER PUSH
  // ═══════════════════════════════════════════════════════════
  {
    name: "KB Squat Clean with Pause",
    name_es: "KB Squat Clean con Pausa",
    description: "Kettlebell squat clean con pausa de 2 segundos en el catch en full squat. Enseña el catch bajo del BB Clean con menos peso y menos riesgo articular. Combina hip hinge, extensión explosiva, y catch en front rack + squat depth.",
    coaching_cue: "KB en el piso entre los pies. Cadera atrás como si fueras a deadlift, brazo recto agarrando la KB. Explota desde la cadera + rodillas + hombros, jalando la KB hacia arriba pegado al cuerpo. Recibí la KB en el hombro (front rack) EN FULL SQUAT — no en power stance. Aguantá 2 segundos en el bottom del squat con la KB apoyada. Levantate limpio del squat. Baja la KB al piso controlado. Alternar lados o mismo lado según prescripción.",
    founder_notes: "El puente entre KB work y BB Clean. La pausa de 2s en el catch te enseña posición del squat bajo carga — que es exactamente lo que necesitas para el BB Complex. Peso ligero, pattern impecable.",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "intermediate",
    equipment_required: ["kettlebell"],
    primary_muscles: ["quads", "glutes", "hamstrings", "shoulders", "core"],
  },
  {
    name: "Alternating Spiderman Lunge",
    name_es: "Spiderman Lunge Alternado",
    description: "Lunge dinámico donde el codo del mismo lado del pie delantero busca tocar el piso al lado del pie, agregando rotación torácica y reach overhead con el brazo libre. Trabaja hip flexor stretch, T-spine mobility, glute activation, y core anti-rotation en un solo patrón.",
    coaching_cue: "Parate erguido. Da un paso amplio adelante con la pierna derecha. En el bottom del lunge, apoyá el codo derecho en el piso al lado del pie derecho (o lo más cerca posible). Rotá el torso izquierdo, alcanzá el techo con el brazo izquierdo (reach overhead). Aguantá 1s. Regresá el codo al piso, empujá con el pie delantero y volvé al centro. Alterná lado izquierdo. 8 alternating = 4 por lado.",
    founder_notes: "El mejor warmup dinámico para lower body + T-spine. Prepara cadera, tobillo, glúteo, obliquos, columna torácica — todo en un ejercicio. Después de esto tu body está listo para squat pattern serio.",
    category: "mobility",
    movement_pattern: "locomotion",
    difficulty: "beginner",
    equipment_required: ["none"],
    primary_muscles: ["hip_flexors", "glutes", "quads", "thoracic_spine", "obliques"],
  },
  {
    name: "BB Clean + Front Squat Complex",
    name_es: "Complex de Clean + Front Squat con Barra",
    description: "Complex de barra: 1 BB Clean (catch en full squat) + 3 Front Squats consecutivos, sin soltar la barra entre reps. Signature de M4 en LOWER PUSH programado en formato EMOM. Combina fuerza explosiva (Clean) con fuerza absoluta (Front Squat) bajo fatiga controlada.",
    coaching_cue: "Barra en el piso. Setup deadlift. Explota la cadera + rodillas + hombros para el Clean. Catch EN FULL SQUAT (no power) con la barra en front rack limpio: codos altos, muñecas relajadas. Sin levantarte del catch, ejecutá 3 Front Squats consecutivos con reset de 1 segundo arriba entre reps. Torso vertical siempre. Después del rep 3 del Front Squat, bajá la barra al piso controlada. Ese es 1 complex. En EMOM, comenzás cada ventana con 1 complex fresco.",
    founder_notes: "El signature más difícil de M4 · LOWER PUSH. Combina técnica olímpica (Clean) con squat pattern (Front Squat) bajo la presión temporal del EMOM. Si sacrificás forma por peso, el Clean te muerde. Elegí carga que puedas sostener con técnica limpia hasta el último minuto.",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "advanced",
    equipment_required: ["barbell"],
    primary_muscles: ["quads", "glutes", "hamstrings", "posterior_chain", "shoulders", "core"],
  },
  {
    name: "B-Stance DB Goblet Squat",
    name_es: "Goblet Squat B-Stance con DB",
    description: "Goblet squat en postura B-stance: 70% del peso en el pie delantero, 30% en el trasero (talón elevado en punta como kickstand). Convierte un squat bilateral en cuasi-unilateral — aísla el quad + glute del lado dominante con seguridad extra del segundo pie.",
    coaching_cue: "DB al pecho estilo goblet (codos altos, DB vertical). Un pie adelantado (dominante en esta serie), el otro atrás con el talón elevado y punta apoyada — 30% del peso ahí como kickstand. Bajá manteniendo torso vertical hasta paralelo o más profundo. El 70% del trabajo lo hace la pierna delantera. Sentí quad + glute del pie delantero. Empujá desde el centro del pie delantero para subir. Alterná lados por serie.",
    founder_notes: "El accessory perfecto para complementar el BB Complex. Menos técnica olímpica, más aislamiento del quad + glute unilateral. Corrige asimetrías bilaterales sin la exposición del Bulgarian.",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "intermediate",
    equipment_required: ["dumbbell"],
    primary_muscles: ["quads", "glutes", "hamstrings", "adductors"],
  },
  {
    name: "Single Leg Recoil to Shoot Through",
    name_es: "Recoil a Shoot-Through Unilateral",
    description: "Movimiento dinámico unilateral: parte en posición child's pose a una pierna con foco en flex/ext de rodilla del lado que trabaja, sigues con un shoot-through pasando la pierna trabajada por debajo del cuerpo hacia el otro lado. Trabaja control excéntrico de cuádriceps + coordinación en rango.",
    coaching_cue: "Empezá en cuadrupedia. Levantá una pierna del piso (pie flotando atrás). Baja la cadera hacia el talón del lado apoyado como un child's pose a una pierna — flexionando profundamente la rodilla de esa pierna. Sentí el stretch. Desde ahí, empujá con el pie plantado para regresar a cuadrupedia. Sin apoyar el pie que flotaba, pasalo por debajo del cuerpo (shoot through) hacia el lado opuesto, extendiendo la pierna. Regresá a la posición inicial. Ese es 1 rep. 8 por lado.",
    founder_notes: "Un movimiento raro pero brutal para el cuádriceps en short-length. Requiere control, no fuerza. El shoot-through le da un componente de coordinación que ningún otro accessory da. Complementa perfecto al Reverse Nordic (que ataca el mismo músculo en long-length).",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "advanced",
    equipment_required: ["none"],
    primary_muscles: ["quads", "hip_flexors", "core"],
  },
  {
    name: "Cyclist Bodyweight Squat with Pause",
    name_es: "Cyclist Squat Corporal con Pausa",
    description: "Squat corporal con los talones ligeramente elevados (2-5 cm, usá plates o discos) y una pausa de 2 segundos en el bottom. La elevación del talón cambia el vector de la carga del quad, aumentando su contribución. Aislamiento puro del quad sin peso externo.",
    coaching_cue: "Talones elevados 2-5 cm (plates de 5-10 lb o discos). Pies a la anchura de las caderas. Torso VERTICAL — mantené el pecho arriba como Front Squat. Bajá tan profundo como podés controlar. En el bottom, aguantá 2 segundos SIN rebotar. Empujá con el centro del pie para subir. Rango completo — la cadera debe ir bajo la rodilla. El quad debe quemar.",
    founder_notes: "El finisher perfecto del triset de LOWER PUSH. Después de haber trabajado el quad en short-length (Recoil) y long-length (Reverse Nordic), este lo aniquila en su rango medio con pausa. Ejercicio simple, dolor máximo, adaptación real.",
    category: "strength",
    movement_pattern: "squat",
    difficulty: "beginner",
    equipment_required: ["plates"],
    primary_muscles: ["quads", "glutes"],
  },
  {
    name: "Wall Ball",
    name_es: "Wall Ball",
    description: "Movimiento clásico de CrossFit: squat con una medicine ball al pecho, empujar la ball al target de la pared (~10ft para hombres) al levantarte del squat, atraparla en el descenso y encadenar en el próximo squat. Combina fuerza de piernas, coordinación, potencia y capacidad de trabajo.",
    coaching_cue: "Med ball al pecho (o DB pesado para regresión), pies anchura de caderas, ligeramente afuera. Bajá en full squat manteniendo el pecho arriba. En el bottom, empujá con las piernas + hombros para lanzar la ball al target de la pared (~10ft). La cátchala suave y usá la fuerza del rebote para el próximo squat. Ritmo continuo. Ojo: la ball tiene que TOCAR el target — si no llega, no cuenta.",
    founder_notes: "El finisher de 100 wall balls es una prueba de carácter. Si te para el break, penalty es 50 singles jump rope. Ese loop te enseña más de tu límite que cualquier PR. Elegí un peso que puedas mantener rango completo por todo el AMRAP.",
    category: "conditioning",
    movement_pattern: "squat",
    difficulty: "intermediate",
    equipment_required: ["medicine_ball"],
    primary_muscles: ["quads", "glutes", "shoulders", "core"],
  },

  // ═══════════════════════════════════════════════════════════
  // PUSH DAY
  // ═══════════════════════════════════════════════════════════
  {
    name: "Incline BB Press",
    name_es: "Press Inclinado con Barra",
    description: "Press de barra en banco inclinado a 30-45°. Signature del PUSH DAY para chest strength con énfasis en la porción clavicular alta del pectoral y hombros anteriores. Compound heavy — la base del volumen y fuerza de pecho de M4.",
    coaching_cue: "Banco inclinado 30-45° (más alto = más hombro, más bajo = más pecho). Acostado, retracción escapular fija (aprieta omóplatos hacia atrás y abajo). Agarrá la barra con las manos ligeramente más anchas que los hombros. Descolgá y llevá la barra a la altura de la clavícula alta (o horquilla esternal). Codos NO se abren a 90° — mantené ~60° del torso. Presioná pensando 'empuja el banco hacia el piso' (retracción + press). Descenso controlado 3s. Sin bounce del pecho.",
    founder_notes: "El heavy del PUSH DAY. Chest strength real, no pump superficial. Retracción escapular fija durante toda la serie o pierdes el ejercicio. Rango completo — barra toca clavícula alta, extensión sin lockout final para mantener tensión.",
    category: "strength",
    movement_pattern: "push",
    difficulty: "intermediate",
    equipment_required: ["barbell", "bench"],
    primary_muscles: ["pectorals_upper", "anterior_deltoid", "triceps"],
  },
  {
    name: "Handstand Strict Press",
    name_es: "Press Estricto en Parada de Manos",
    description: "Press estricto de hombro en handstand (o regresión pike push-up). Fuerza gimnástica pura — bodyweight es la carga, la progresión viene por regresión, tempo, y ROM. Desarrolla shoulder strength, control escapular y patrón overhead sin barra.",
    coaching_cue: "Regresiones (subí de nivel semana a semana según capacidad): R1 = Handstand estricto pegado a la pared con el pecho hacia la pared (más difícil, ROM completo). R2 = Handstand con talones apoyados en la pared (más fácil por ángulo). R3 = Pike Push-up con pies elevados en caja/banco, cadera alta. R4 = Pike Push-up en piso, cadera alta. Codos apuntando hacia adelante, no flared. Bajá controlado hasta que la cabeza toque el piso (o cerca). Presioná desde el suelo con retracción escapular activa. Cabeza pasa entre los brazos en top.",
    founder_notes: "El heavy B del PUSH DAY. Cero equipo, máxima demanda. La progresión es por regresión + tempo — cada semana buscá el rango más limpio en la regresión más difícil que puedas sostener. Skill + strength juntos.",
    category: "strength",
    movement_pattern: "push",
    difficulty: "advanced",
    equipment_required: ["wall"],
    primary_muscles: ["shoulders", "triceps", "upper_pectorals", "core"],
  },
  {
    name: "Close Grip Incline DB Press",
    name_es: "Press Inclinado con DB Agarre Cerrado",
    description: "Press inclinado con dumbbells en agarre cerrado (palmas neutras, DBs juntándose). El agarre neutro y cerrado desplaza más carga al tricep e inner chest, complementando el signature (Incline BB Press) con distinto stimulus muscular.",
    coaching_cue: "Banco 30°. DBs con palmas mirándose (agarre neutro). Codos PEGADOS al torso — NO se abren. Bajá controlado hasta que los DBs toquen los pecs (rango completo). Presioná arriba con contracción del tricep y de la porción interna del pecho. NO junto los DBs en el peak (mantiene la tensión). Descenso 2s controlado.",
    founder_notes: "El accessory perfecto post Incline BB Press. Distinto stimulus pero mismo patrón — pump inner chest + tricep sin sobrecargar el hombro anterior. Signature de bodybuilding funcional.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "intermediate",
    equipment_required: ["dumbbell", "bench"],
    primary_muscles: ["pectorals_inner", "triceps", "anterior_deltoid"],
  },
  {
    name: "SA Cable Chest Fly",
    name_es: "Apertura Unilateral con Cable",
    description: "Chest fly unilateral con cable desde arriba diagonal, cruzando el brazo por encima del cuerpo hasta la línea media. Isolación puro del pectoral con tensión constante del cable y rango completo unilateral. Corrige asimetrías bilaterales.",
    coaching_cue: "Cable desde arriba diagonal (polea alta). Un brazo a la vez. Codo LIGERAMENTE flexionado y BLOQUEADO ahí — no cambien de ángulo. Es movimiento de HOMBRO, no de codo. Saca el pecho, sentí el stretch en el pectoral del lado que trabaja. Cruzá el brazo por encima del cuerpo hasta la línea media. Aprieta 1s el chest en el peak. Controlá el regreso — no dejes que el cable te lleve.",
    founder_notes: "El isolation puro del pecho. Ideal para técnica de myo-reps o drop sets porque el aislamiento es total. Sin cheat de la mano libre = trabajo real del pectoral. Signature de John Meadows lineage.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "beginner",
    equipment_required: ["cable_machine"],
    primary_muscles: ["pectorals"],
  },
  {
    name: "Barbell Skullcrusher (EZ)",
    name_es: "Skullcrusher con Barra EZ",
    description: "Skullcrusher acostado con EZ bar (o barra recta). Aislamiento pesado de tricep con foco en la porción larga (long head). Compound isolation — permite cargar más peso que las variantes con DB o KB.",
    coaching_cue: "Acostado en banco. EZ bar tomada con agarre cerrado (palmas al techo o ligeramente inclinadas). Codos apuntando al techo — NO se abren durante la rep. Bajá la barra a la frente o justo detrás de la cabeza (rango completo = detrás para más long head). Solo mueve el codo — hombro estable. Extendé arriba sin lockout final para mantener tensión. Bajada 2s controlada.",
    founder_notes: "El tricep isolation con carga real. Los DB Skull Crushers son más suaves con el codo, pero el EZ bar te permite el peso que necesitas para hipertrofia progresiva. Cuida los codos — si duele, baja el peso, cambia al ángulo.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "intermediate",
    equipment_required: ["ez_bar", "bench"],
    primary_muscles: ["triceps"],
  },
  {
    name: "SA Cable Kickback",
    name_es: "Kickback Unilateral con Cable",
    description: "Tricep kickback unilateral con cable bajo. Isolación puro con tensión constante — el cable mantiene la carga durante todo el rango (a diferencia del DB kickback que pierde tensión arriba). Peak contraction extendido y controlado.",
    coaching_cue: "Cable en polea baja. Un pie adelantado, torso inclinado 30-45° adelante. Codo del brazo trabajando pegado al costado del torso, formando 90° al inicio (antebrazo apuntando al piso). Sin mover el codo, extendé el antebrazo hacia atrás hasta que quede recto en línea con el torso. Aprieta 1 segundo el tricep en el peak. Regresa lento. Es puramente contracción — no busques peso, busca el pump.",
    founder_notes: "El isolation puro del tricep. Ideal para drop sets porque el aislamiento total te permite ir a falla real sin comprometer articulaciones. Signature de accessory de brazo.",
    category: "accessory",
    movement_pattern: "push",
    difficulty: "beginner",
    equipment_required: ["cable_machine"],
    primary_muscles: ["triceps"],
  },
];

// ═══════════════════════════════════════════════════════════
// INCOMPLETE CARDS TO FILL (existing exercises with missing fields)
// ═══════════════════════════════════════════════════════════
const FILL_CARDS = [
  {
    name: "Band Pull-Apart",
    description: "Apertura horizontal con banda elástica a la altura del pecho. Retracción escapular pura — activa rear delt, romboides y trapecio medio. El warmup más simple y efectivo para cualquier día que involucre press o pull.",
    coaching_cue: "Banda al frente del pecho, brazos rectos, agarre anchura de hombros. Abre los brazos hacia los lados llevando la banda hacia el pecho. Aprieta las escápulas hacia atrás y abajo en el punto final. Pulgares hacia atrás en el peak (external rotation). Regresa controlado. Sin arch lumbar.",
    founder_notes: "El drill de retracción escapular universal. 2-3 rondas de 15 antes de cualquier day de bench, chin-up o overhead press. Salud del hombro se paga en centavos aquí.",
  },
  {
    name: "Incline DB Curl",
    description: "Curl de bicep con dumbbells sentado en banco inclinado 45°. Los brazos cuelgan atrás del cuerpo, dando stretch máximo al bicep long head. El curl más efectivo para desarrollar el 'outer sweep' del bicep visible por afuera.",
    coaching_cue: "Banco 45°. Sentado con espalda pegada al banco. DBs con agarre supinado (palmas al techo). Codos APUNTAN AL PISO en el bottom, no se adelantan al cuerpo. Curl arriba pero SIN adelantar el codo — mantené el hombro pasivo. Rango completo hasta contracción en el peak. Bajá 3 segundos con stretch total. El long head debe sentirse alargado.",
    founder_notes: "El signature del bicep long head. Con Preacher Curl (short head) cubren todo el músculo. Los codos que se adelantan durante la rep = perdiste el ejercicio. Peso ligero, control obsesivo.",
  },
  {
    name: "Cossack Squat Flow",
    description: "Squat lateral alternado sin peso — una pierna extendida, otra flexionada profundo, transfiriendo peso de un lado al otro en flow continuo. Movilidad activa de cadera + tobillo lateral. Warmup ideal para squat pattern.",
    coaching_cue: "Pies muy anchos (más allá de anchura de hombros). Bajá el peso hacia una pierna manteniendo el talón de esa pierna en el piso — la otra pierna se extiende completamente hacia el lado con la punta del pie hacia arriba. Torso lo más vertical posible. Sentí la apertura de cadera + tobillo del lado que trabaja. Transferí peso al otro lado sin subir del bottom. 5 por lado en flow.",
    founder_notes: "Mejor apertura de cadera que cualquier stretch pasivo. El flow constante activa el patrón squat lateral que raramente se trabaja. Prep obligatorio antes de Front Squat o Bulgarian.",
  },
  {
    name: "Jump Rope Singles",
    description: "Saltos básicos con jump rope — un salto por vuelta de la cuerda. Skill de coordinación + trabajo aeróbico + trabajo de tobillo y pantorrilla. Base para todos los patrones más avanzados de jump rope.",
    coaching_cue: "Cuerda del largo correcto (los mangos llegan a la axila con la cuerda pisada en el centro). Muñecas hacen el trabajo, no los brazos. Codos pegados al torso. Salto BAJO — solo lo suficiente para pasar la cuerda (2-3 cm del piso). Aterrizaje en la punta del pie. Ritmo constante y respiración natural. Contar reps.",
    founder_notes: "El penalty perfecto en workouts para castigar breaks. También el drill de coordinación + capacity mínimo que todo atleta debería dominar.",
  },
  {
    name: "Ab Wheel Rollout",
    description: "Rueda con manos apoyadas, empezando en cuadrupedia (o de pie para avanzados) y rodando el ab wheel hacia adelante hasta cerca de extensión total del cuerpo. Trabajo anti-extensión pesado + activación de rectus + serrato anterior.",
    coaching_cue: "Empezá en cuadrupedia con las rodillas en el piso (o parado si vas standing). Manos en el ab wheel, hombros directamente sobre las muñecas. Rueda adelante manteniendo el core APRETADO — NADA de arch lumbar. Vas tan lejos como puedas controlar de regreso. El regreso es donde se construye la fuerza — no dejes que la rueda te arrastre. Progresión: kneeling → kneeling con pausa → standing.",
    founder_notes: "El drill anti-extensión más honesto. Si tu lumbar arquea = descoloniste. Si vas a rango que no podés regresar = te estás mintiendo. Ejecución perfecta > más rango.",
  },
];

// ─── Helpers ────────────────────────────────────────────────
async function upsertNew(row) {
  const { data: existing } = await sb.from("exercises").select("id").eq("name", row.name).maybeSingle();
  if (existing) {
    console.log(`  ⏭  ${row.name} · already exists (id ${existing.id.slice(0, 8)})`);
    return { skipped: true, id: existing.id };
  }
  const payload = { ...row, is_active: true, is_draft: false };
  const { data: created, error } = await sb.from("exercises").insert(payload).select("id").single();
  if (error) { console.error(`  ✗  ${row.name} · ${error.message}`); return { error }; }
  console.log(`  ✓  ${row.name} · created (id ${created.id.slice(0, 8)})`);
  return { created: true, id: created.id };
}

async function fillCard(row) {
  const { data: existing } = await sb.from("exercises").select("id, description, coaching_cue, founder_notes").eq("name", row.name).maybeSingle();
  if (!existing) { console.log(`  ⚠  ${row.name} · NOT FOUND (skip fill)`); return; }
  const patch = {};
  if (!existing.description && row.description) patch.description = row.description;
  if (!existing.coaching_cue && row.coaching_cue) patch.coaching_cue = row.coaching_cue;
  if (!existing.founder_notes && row.founder_notes) patch.founder_notes = row.founder_notes;
  if (Object.keys(patch).length === 0) { console.log(`  ⏭  ${row.name} · already complete`); return; }
  const { error } = await sb.from("exercises").update(patch).eq("id", existing.id);
  if (error) { console.error(`  ✗  ${row.name} · ${error.message}`); return; }
  console.log(`  ✓  ${row.name} · filled: ${Object.keys(patch).join(", ")}`);
}

// ─── Run ────────────────────────────────────────────────────
console.log("═══════════════════════════════════════════════════════");
console.log("M4 · EXERCISE CARDS · create/fill");
console.log("═══════════════════════════════════════════════════════\n");

console.log("── Creating new exercises ──");
for (const row of EXERCISES) await upsertNew(row);

console.log("\n── Filling incomplete cards ──");
for (const row of FILL_CARDS) await fillCard(row);

console.log("\n✓ Done.");
