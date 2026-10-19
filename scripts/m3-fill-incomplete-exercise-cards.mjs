/**
 * M3 audit fix: fill incomplete exercise cards.
 *
 * Andoni 2026-06-25: si añado un ejercicio a la BD tiene que llevar la card
 * completa (description + coaching_cue + founder_notes + equipment).
 * Estos 15 son ejercicios usados en M3 con cards incompletas — los relleno
 * en voz Coach Adonis para que cualquier atleta los abra y entienda el qué,
 * cómo y por qué.
 *
 * Solo media (thumbnail_url + video_url) queda pendiente — esa va aparte.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ── Group 1: Missing description + coaching_cue + founder_notes (mostly) ──
const FILLS = [
  {
    name: "Chest Supported DB Row",
    description: "Remo con mancuerna sobre banco inclinado boca abajo. Aísla el dorsal y romboides eliminando trampa lumbar — el pecho queda apoyado, solo trabajan los músculos del jalón.",
    coaching_cue: "Banco inclinado 30-45°. Boca abajo con el pecho apoyado en el respaldo, mancuerna en cada mano colgando con los brazos extendidos. Codos quedan a 45° del torso (no pegados, no flared). Jala las mancuernas hacia las caderas pensando 'meto los codos hacia atrás'. Aprieta escápulas 1 segundo arriba. Baja controlado contando 2 segundos. Cuello neutro mirando hacia el banco.",
    founder_notes: "El remo más limpio para construir grosor del medio de la espalda. Sin lumbar, sin tirones — solo músculo y patrón. Si quieres una espalda 3D, este es el accesorio que no se salta.",
  },
  {
    name: "Banded Glute Bridge",
    description: "Puente de glúteo con banda mini alrededor de las rodillas. Activa glúteo medio (abducción contra la banda) mientras hace puente de cadera. Activación + fuerza en un solo movimiento.",
    coaching_cue: "Acostado boca arriba, rodillas dobladas, pies a la anchura de las caderas. Banda mini justo encima de las rodillas. Empuja las rodillas hacia afuera ABRIENDO contra la banda — siéntelo en glúteo medio. Manteniendo esa tensión lateral, sube la cadera apretando glúteos hasta línea recta hombros-rodillas. Pausa 1 segundo arriba apretando duro. Baja controlado sin dejar que las rodillas se junten. Si las rodillas se colapsan hacia adentro estás abandonando el glúteo medio.",
    founder_notes: "Doble propósito: activa cadera antes de Hip Thrust o Squat + da reps reales al glúteo medio. 2 sets de 12 antes de día de pierna = noche y día en la conexión mente-músculo.",
  },
  {
    name: "Downward Dog to Cobra",
    description: "Flow entre Downward Dog (pico cadera arriba, columna larga) y Cobra (pecho abierto, columna en extensión). Moviliza columna entera, hombros, isquios y caderas en un patrón.",
    coaching_cue: "Empieza en Downward Dog: manos y pies en el piso, cadera arriba formando V invertida, columna larga, talones empujando al piso. Ahora fluye hacia adelante: pasa a plancha y baja el pecho hasta el piso (knees-chest-chin opcional). Empuja con las manos y eleva el pecho a Cobra: caderas en el piso, brazos extendidos, hombros lejos de las orejas, mirada arriba. Reset a Downward Dog. 1 rep = ambas posiciones. Respira: inhala en Cobra, exhala en Down Dog.",
    founder_notes: "El flow más eficiente para abrir cadena anterior + alargar posterior + activar core. 5 reps lentas = mejor warm-up de tronco que cualquier mobility de aislamiento.",
  },
  {
    name: "90/90 Hip Rotations to Pigeon",
    description: "Movilidad de rotación interna y externa de cadera desde la posición 90/90 (ambas rodillas a 90°). Termina cada lado en Pigeon Pose para profundizar el estiramiento.",
    coaching_cue: "Sentado con la pierna delantera doblada al frente a 90° (rodilla + pie alineados) y la pierna trasera doblada al lado a 90°. Manos apoyadas detrás para mantener postura erguida. Rota cadera hacia el lado opuesto pasando ambas piernas al otro lado fluido — sin levantarlas del piso. Cuando llegues al lado nuevo, inclínate hacia adelante sobre la pierna delantera en Pigeon: pecho hacia el piso, respira 2-3 ciclos profundo, vuelve a sentarte. Rota al otro lado y repite Pigeon. 1 rep = ambos lados.",
    founder_notes: "El test + drill de cadera. Si esto duele o te cuesta, tu cadera está bloqueada y todos los lifts pesados sufren. 5 reps al día desbloquea más que una hora de estiramientos estáticos.",
  },
  {
    name: "Hip CARs",
    description: "Controlled Articular Rotations de cadera. Mueve la cadera por su rango completo activamente (no pasivo) para mantener salud articular y rango de movimiento. Estilo FRC (Functional Range Conditioning).",
    coaching_cue: "De pie sosteniéndote ligero a una pared o silla para balance. Levanta una rodilla al frente a 90° (cadera flexionada). Desde ahí abre la rodilla hacia el lado (abducción) sin perder la altura. Sigue rotando: ahora la rodilla apunta hacia atrás (rotación externa). Baja la pierna controlado y completa el círculo. Es 1 rep — un círculo completo. Hazlo LENTO (5-8 segundos por círculo). El tronco no se mueve — solo la cadera. 5 reps por lado en cada dirección.",
    founder_notes: "Para longevidad articular esto es no-negociable. La cadera que no se mueve activamente en todo su rango pierde rango y luego la espalda paga. 5 reps al día = cadera de 25 a los 50.",
  },
  {
    name: "Weighted Ankle Stretch",
    description: "Estiramiento profundo de dorsiflexión de tobillo añadiendo peso del cuerpo. Mejora rango para sentadilla profunda y mecánica de tobillo bajo carga.",
    coaching_cue: "Posición de lunge bajo: rodilla delantera flexionada con el pie totalmente plantado, rodilla trasera apoyada en el piso. Coloca una mancuerna o kettlebell ligera (5-10 kg) encima de la rodilla delantera, justo arriba de la rótula. Empuja la rodilla por encima de los dedos del pie manteniendo el talón pegado al piso. Vas a sentir un estiramiento intenso en el tobillo y gemelo. Mantén 30 segundos respirando profundo. Cambia de lado.",
    founder_notes: "Tobillo rígido = squat malo = compensación lumbar. Si tu sentadilla profunda no llega, este movimiento la desbloquea en 2 semanas de uso diario. Vale más que 100 calf raises.",
  },
  {
    name: "Forward Fold",
    description: "Pliegue frontal desde de pie. Estira cadena posterior completa: isquios, glúteos, gemelos y espalda baja. Recovery clave después de día de hinge o deadlift.",
    coaching_cue: "De pie con los pies a la anchura de las caderas. Bisagra desde la cadera (no encorvar la espalda) y baja el tronco hacia adelante con las rodillas LIGERAMENTE flexionadas (micro-flex, no rectas a fuerza). Deja que la cabeza cuelgue pesada — el cuello se relaja. Mantén 30-45 segundos respirando profundo. Si llegas a tocar el piso, agarra detrás de los gemelos y jala el pecho hacia las piernas suavemente.",
    founder_notes: "Reset de cadena posterior. Después de Deadlift o RDL pesado, 45 segundos aquí descompone la tensión acumulada y previene que la espalda baja se quede agarrotada al día siguiente.",
  },
  {
    name: "Overhead Tricep Stretch",
    description: "Estiramiento de la cabeza larga del tríceps llevando el brazo overhead y flexionando el codo. Crítico para movilidad de overhead press y para recuperar después de día de push.",
    coaching_cue: "De pie o sentado, columna larga. Levanta un brazo hacia arriba y flexiona el codo dejando la mano caer detrás de la cabeza (la mano toca entre los omóplatos). Con la otra mano agarra el codo del brazo estirado y jala suavemente hacia el centro (hacia la oreja opuesta) sin mover el tronco. Vas a sentir el estiramiento en el tríceps largo y el dorsal. 30 segundos por lado respirando profundo. No fuerces — estiramiento suave.",
    founder_notes: "Si tu Overhead Press se siente apretado o sospechas que tu hombro no llega bien arriba, casi siempre es tríceps + dorsal acortados. 30 segundos por lado antes de OHP cambia el movimiento.",
  },
  {
    name: "Lat Stretch Doorway",
    description: "Estiramiento de dorsal y costado usando un marco de puerta como anclaje. Abre el costado, descomprime espalda baja y mejora rango overhead.",
    coaching_cue: "Párate al lado de un marco de puerta. Sube el brazo cercano y agarra el marco a la altura de la cabeza con el pulgar apuntando hacia atrás (rotación externa de hombro). Da un paso hacia el lado contrario y deja que el peso del cuerpo cuelgue del brazo — el dorsal se estira contra el agarre. Inclínate ligeramente hacia atrás para profundizar. Respira profundo. 30 segundos por lado.",
    founder_notes: "Anti-cuerpo encorvado de oficina. Despues de un día sentado, esto reabre el costado y le da espacio a la espalda baja. Lo notas al día siguiente en cualquier OHP.",
  },
  {
    name: "Bird Dog",
    description: "Patrón anti-extensión contralateral en cuatro apoyos. Extiende brazo opuesto y pierna opuesta manteniendo el tronco perfectamente estable. Core que funciona como debe.",
    coaching_cue: "Cuatro apoyos: manos bajo los hombros, rodillas bajo las caderas, columna neutra (ni hundida ni encorvada). Imagina un vaso de agua sobre tu espalda baja — no se debe caer. Extiende el brazo derecho al frente y la pierna izquierda hacia atrás SIMULTÁNEO, lentos, hasta línea recta del talón al dedo. Pausa 1 segundo arriba — la cadera no rota, los hombros se mantienen cuadrados. Regresa controlado y cambia. 1 rep = un lado.",
  },
];

// ── Group 2: Missing equipment_required ──
const EQUIPMENT_FILLS = [
  { name: "Standing Figure 4 Stretch", equipment_required: ["none"] },
  { name: "Supine Spinal Twist", equipment_required: ["none"] },
  { name: "Half-Kneeling Thoracic Rotation", equipment_required: ["none"] },
  { name: "Downward Dog to Plank Flow", equipment_required: ["none"] },
  { name: "Zone 2 Cardio", equipment_required: ["cardio_modality"] },
];

let updated = 0, failed = 0;

console.log("Completando exercise cards…\n");
for (const fill of FILLS) {
  const patch = {
    description: fill.description,
    coaching_cue: fill.coaching_cue,
  };
  if (fill.founder_notes) patch.founder_notes = fill.founder_notes;

  const { error } = await sb.from("exercises").update(patch).eq("name", fill.name);
  if (error) { console.error(`  ✗ ${fill.name}: ${error.message}`); failed++; continue; }
  console.log(`  ✓ ${fill.name}`);
  updated++;
}

console.log("\nCompletando equipment_required…\n");
for (const fill of EQUIPMENT_FILLS) {
  const { error } = await sb.from("exercises").update({ equipment_required: fill.equipment_required }).eq("name", fill.name);
  if (error) { console.error(`  ✗ ${fill.name}: ${error.message}`); failed++; continue; }
  console.log(`  ✓ ${fill.name} → ${JSON.stringify(fill.equipment_required)}`);
  updated++;
}

console.log(`\n✓ Actualizados: ${updated}`);
if (failed) console.log(`✗ Fallaron: ${failed}`);
