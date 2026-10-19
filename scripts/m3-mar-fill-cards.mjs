import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const FILLS = [
  {
    name: "90/90 Hip Switches",
    description: "Movilidad de rotación de cadera. Atleta sentado en el piso con una pierna al frente flexionada en 90° (rotación externa) y la otra al lado flexionada en 90° (rotación interna). Alterna la posición girando ambas rodillas al lado opuesto sin levantar la cadera.",
    coaching_cue: "Sentado en el piso, una pierna al frente en 90° (rotación externa) y la otra al lado en 90° (rotación interna). Manos atrás para soporte. Gira ambas rodillas al lado opuesto fluidamente — la pierna que estaba al frente ahora va al lado, la del lado va al frente. Cadera baja todo el tiempo. Una transición = 1 rep.",
    founder_notes: "El warm-up de cadera más eficiente. Trabaja rotación interna y externa simultáneamente. Si la cadera te tronca o no llegas a 90°, ese es tu trabajo de movilidad de la semana.",
  },
  {
    name: "Glute Bridge March",
    description: "Glute bridge sostenido con marcha alternante de piernas. Atleta en glute bridge clásico (cadera arriba, glúteo apretado), eleva una rodilla al pecho sin perder altura de la cadera, baja, alterna.",
    coaching_cue: "Acostado boca arriba, pies cerca del glúteo, sube la cadera hasta línea cuerpo-rodilla-hombro. Glúteo apretado todo el tiempo. Eleva una rodilla al pecho — la cadera NO baja. Regresa el pie al piso, alterna. La cadera se mantiene arriba todo el set.",
    founder_notes: "Activación + estabilidad unilateral de glúteo medio. Si la cadera baja al levantar la rodilla, el glúteo del lado de apoyo está fallando — ese es el feedback honesto del ejercicio.",
  },
  {
    name: "Banded Lateral Walk",
    description: "Marcha lateral con liga de resistencia arriba de las rodillas (o tobillos). Pasos laterales manteniendo tensión constante en la liga y rodillas alineadas con los dedos del pie.",
    coaching_cue: "Liga arriba de la rodilla (más difícil) o en los tobillos (más fácil). Media sentadilla con tensión en la liga (rodillas empujan afuera). Da pasos laterales amplios sin perder la tensión — la pierna que se mueve NO se relaja. Rodillas alineadas con los pies todo el tiempo. 10 pasos a un lado, 10 al otro.",
    founder_notes: "Activación de glúteo medio antes de cualquier día de pierna o cadera. Si la rodilla colapsa hacia adentro al caminar lateral, ahí está tu déficit. Despierta el músculo correcto antes de cargar.",
  },
  {
    name: "Cat-Cow Reach",
    description: "Variante del cat-cow clásico de yoga con un reach alternante de brazo. En cuadrupedia, alterna entre gato (espalda redondeada hacia el techo) y vaca (espalda extendida con pecho abierto), añadiendo un reach del brazo opuesto en la posición de vaca.",
    coaching_cue: "Cuadrupedia, manos debajo de los hombros, rodillas debajo de la cadera. Inhala → vaca: pecho abre, mirada arriba, espalda en extensión. Extiende un brazo al frente con la palma hacia arriba — el otro hombro se mantiene fuerte. Exhala → gato: espalda redondeada al techo, mirada al ombligo, brazo regresa. Alterna lado. Fluido, sigue la respiración.",
    founder_notes: "Recovery activo de t-spine + apertura escapular. Ideal para cerrar días de carga axial pesada. Sigue la respiración — sin respirar, es solo movimiento, no recovery.",
  },
];

console.log("══ Rellenando cards reusadas MAR ══\n");
for (const fill of FILLS) {
  const { data: existing } = await sb.from("exercises").select("*").eq("name", fill.name).maybeSingle();
  if (!existing) { console.log(`  ✗ "${fill.name}" no existe`); continue; }
  const updates = {};
  if (!existing.description) updates.description = fill.description;
  if (!existing.coaching_cue) updates.coaching_cue = fill.coaching_cue;
  if (!existing.founder_notes) updates.founder_notes = fill.founder_notes;
  if (Object.keys(updates).length === 0) { console.log(`  · "${fill.name}" — sin cambios`); continue; }
  const { error } = await sb.from("exercises").update(updates).eq("id", existing.id);
  if (error) { console.log(`  ✗ "${fill.name}":`, error.message); continue; }
  console.log(`  ✓ "${fill.name}" — ${Object.keys(updates).join(", ")}`);
}
console.log("\n✓ Listo");
