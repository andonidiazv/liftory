/**
 * Rellena description + coaching_cue + (donde aplique) equipment_required +
 * founder_notes en los 5 ejercicios reusados que estaban con campos vacíos.
 * NO toca los workouts — solo los rows del catálogo.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const FILLS = [
  {
    name: "Scap Push-up",
    description: "Push-up reducido al movimiento puro de las escápulas. Atleta en posición de plancha alta, brazos extendidos y rígidos. Solo se mueve la cintura escapular: protracción (escápulas se separan) → retracción (escápulas se juntan). Cero flexión de codo. Activa serrato anterior y trapecio bajo — los músculos olvidados detrás del press.",
    coaching_cue: "Plancha alta con brazos completamente extendidos. Sin doblar codo. Empuja el piso para protraer (escápulas se separan, espalda alta se redondea ligeramente). Después aprieta las escápulas hacia atrás y abajo (retracción) sin perder la línea del cuerpo. Cadera estable, core activado.",
    founder_notes: "Activación obligatoria antes de cualquier press. El serrato es el que pone la escápula en la posición correcta para no quemar el hombro. Si haces Scap Push-up bien, el press después se siente más fuerte y limpio.",
  },
  {
    name: "Cable Lean-Away Lateral Raise",
    description: "Elevación lateral unilateral con polea baja. Atleta se aleja del cable, agarra con la mano más alejada de la torre, eleva el brazo hasta la altura del hombro. La inclinación del torso cambia el ángulo de tensión sobre el deltoide lateral — la polea da tensión constante en todo el rango (a diferencia del DB que pierde tensión arriba).",
    coaching_cue: "Cable bajo. Te paras al lado de la torre, con el cable cruzando frente a tu cuerpo. Agarras con la mano más alejada. Inclinas el torso ligeramente hacia el lado opuesto del cable. Eleva el brazo lateralmente hasta la altura del hombro, palma abajo. Pausa arriba. Baja controlado contra la resistencia.",
    founder_notes: "La versión en polea es superior a la mancuerna para hipertrofia del deltoide lateral — tensión constante en todo el rango y resistencia perpendicular al músculo. Por eso la usamos en M3 LUN como hipertrofia de hombros 3D.",
  },
  {
    name: "Tricep Rope Pushdown",
    description: "Extensión de tríceps en polea alta usando cuerda doble. La cuerda permite separar las manos al final del movimiento, añadiendo ROM extra y contracción pico superior en la cabeza lateral. Versión más completa del pushdown clásico.",
    coaching_cue: "Cuerda enganchada al cable alto. Agarre neutro (palmas enfrentadas). Codos pegados al torso — no se abren. Empuja hacia abajo, y AL TERMINAR el movimiento SEPARA LAS MANOS hacia los lados — eso es lo que añade activación. Si no separas, te pierdes la mitad del ejercicio.",
    founder_notes: "La variante con más activación muscular de tricep pushdown. La apertura al final es lo que hace la diferencia. Si no separas las manos, es un pushdown mediocre.",
  },
  {
    name: "Doorway Pec Stretch",
    description: "Estiramiento estático del pectoral mayor + delt anterior. Atleta se para en el marco de una puerta, antebrazo apoyado contra el marco, rota el cuerpo lejos. Esencial para deshacer la postura cerrada que generan los días de press y el desk life.",
    coaching_cue: "Antebrazo apoyado contra el marco con el codo a 90° y a la altura del hombro. Pie del mismo lado adelantado. Rota el torso suavemente lejos del brazo. Siente estiramiento en el pecho y el frente del hombro — no en el codo. Mantén relajado, no fuerces.",
    founder_notes: "Recovery obligado después de cualquier día de press. Sin esto, los pectorales acortados jalan los hombros hacia adelante y el press de la próxima sesión se va al deltoide anterior.",
  },
  {
    name: "Hollow Body Hold",
    description: "Posición isométrica de gimnasia. Atleta acostado boca arriba, lumbar pegada al piso, brazos extendidos arriba de la cabeza, piernas extendidas a unos centímetros del piso. Cuerpo en forma de plátano invertido. Base de toda la calistenia avanzada — sin hollow, no hay handstand, no hay muscle-up.",
    coaching_cue: "Boca arriba. Brazos extendidos detrás de la cabeza, piernas extendidas. Lumbar PEGADA al piso (esa es la prueba) — si la lumbar se levanta, sube las piernas hasta que vuelva a tocar. Cuello relajado, mirada arriba. Respira normal.",
    founder_notes: "El core funcional empieza aquí. La lumbar pegada al piso es no-negociable — si se levanta, el ejercicio se va al psoas y se pierde el trabajo abdominal. Mejor 20 segundos perfectos que 60 segundos compensando.",
  },
  {
    name: "Cross-Body Shoulder Stretch",
    equipment_required: [], // bodyweight, no equipment
  },
];

console.log("══ Rellenando cards reusadas que estaban vacías ══\n");

for (const fill of FILLS) {
  const { data: existing } = await sb.from("exercises").select("*").eq("name", fill.name).maybeSingle();
  if (!existing) {
    console.log(`  ✗ "${fill.name}" no encontrado, skip`);
    continue;
  }
  const updates = {};
  if (fill.description !== undefined && !existing.description) updates.description = fill.description;
  if (fill.coaching_cue !== undefined && !existing.coaching_cue) updates.coaching_cue = fill.coaching_cue;
  if (fill.founder_notes !== undefined && !existing.founder_notes) updates.founder_notes = fill.founder_notes;
  if (fill.equipment_required !== undefined && (!existing.equipment_required || existing.equipment_required.length === 0)) {
    updates.equipment_required = fill.equipment_required;
  }

  if (Object.keys(updates).length === 0) {
    console.log(`  · "${fill.name}" — sin cambios necesarios`);
    continue;
  }

  const { error } = await sb.from("exercises").update(updates).eq("id", existing.id);
  if (error) {
    console.log(`  ✗ ERROR en "${fill.name}":`, error.message);
    continue;
  }
  console.log(`  ✓ "${fill.name}" — actualizado: ${Object.keys(updates).join(", ")}`);
}

console.log("\n✓ Listo");
