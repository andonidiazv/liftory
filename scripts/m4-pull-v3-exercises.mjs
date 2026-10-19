/**
 * M4 · PULL v3 · crear/llenar exercises:
 *  · L-Sit Chin-up · llenar card
 *  · Z-Press Position Cable Face Pull · crear
 *  · SA Farmer Hold · crear
 *  · Wall Bicep Stretch · crear
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NEW = [
  {
    name: "Z-Press Position Cable Face Pull",
    name_es: "Cable Face Pull en Posición Z-Press",
    description: "Face pull ejecutado desde posición sentada en el piso con las piernas totalmente extendidas al frente (misma postura base del Z-Press). La posición bloquea la lumbar contra el piso, elimina cualquier arqueo o cheat de columna, y aísla el jalón a la espalda alta + rear delt.",
    coaching_cue: "Sentado en el piso frente al cable (polea media/alta), piernas COMPLETAMENTE extendidas al frente (posición Z-Press). Espalda erguida, torso vertical. Agarrás la cuerda con ambas manos, palmas hacia adentro. Jalás hacia la cara con codos altos, retrayendo escápulas hacia atrás y abajo. Pulgares rotan hacia atrás en el peak (external rotation). Sentí trap medio + rear delt. La lumbar NO puede arquearse porque las piernas extendidas la bloquean — así el jalón vive PURO en la espalda alta.",
    founder_notes: "El face pull más honesto. La posición Z-Press deja la lumbar fuera de la jugada — solo espalda alta trabajando. Si en el Face Pull tradicional te enganchás con las lumbares para 'ganar' rango, esta variante te quita esa opción. Peso ligero, técnica obsesiva.",
    category: "accessory",
    movement_pattern: "pull",
    difficulty: "intermediate",
    equipment_required: ["cable_machine"],
    primary_muscles: ["rear_deltoid", "mid_trapezius", "lower_trapezius", "rotator_cuff"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "SA Farmer Hold",
    name_es: "Farmer Hold Unilateral",
    description: "Farmer Hold con una sola mano (single-arm). Mantener una carga pesada colgando de un solo lado obliga al core anti-lateral flexion a trabajar intensamente para evitar que el torso se incline. Trabajo de grip + core + estabilización de cadera unilateral.",
    coaching_cue: "De pie. Agarrás una kettlebell o dumbbell pesado con UNA mano. La otra mano cuelga libre a un costado. Torso ERECTO, hombros nivelados — NO inclines el torso hacia el lado del peso. El core del lado opuesto (obliquo + cuadrado lumbar) trabaja para mantener la vertical. Cadera cuadrada, glúteo apretado. Respirá normal. Aguantás el tiempo prescrito, cambiás lado.",
    founder_notes: "El Farmer Hold clásico es bilateral y balancea el trabajo. La versión unilateral asimétrica es anti-lateral flexion PURO — no podés hacer trampa con el otro lado. Peso pesado, 35s por lado, dos series. Grip + core en un solo drill.",
    category: "accessory",
    movement_pattern: "carry",
    difficulty: "beginner",
    equipment_required: ["kettlebell"],
    primary_muscles: ["forearms", "obliques", "core", "trapezius"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
  {
    name: "Wall Bicep Stretch",
    name_es: "Estiramiento de Bicep en Pared",
    description: "Stretch pasivo del bicep + pecho anterior usando una pared. Con la palma apoyada en la pared a la altura del hombro y el brazo extendido, la rotación del torso lejos de la pared estira el bicep braquial, corachobraquial y pectoral anterior. Recovery ideal post pull day.",
    coaching_cue: "Parado al lado de una pared. Apoyás la palma de la mano en la pared a la altura del hombro, brazo COMPLETAMENTE extendido detrás de vos (dedos apuntando hacia atrás). Sin doblar el codo, rotás el torso lentamente en dirección opuesta a la pared. Sentirás stretch en el bicep + pecho anterior + hombro. Respirás y mantenés 30s por lado.",
    founder_notes: "Post-pull day el bicep queda cargado y acortado. Este stretch lo abre y estira sin equipment. 30s por lado bastan para devolver rango y bajar el tono muscular. Complementa el Lat Doorway para cerrar el PULL bien.",
    category: "mobility",
    movement_pattern: "pull",
    difficulty: "beginner",
    equipment_required: ["wall"],
    primary_muscles: ["biceps", "pectorals", "anterior_deltoid"],
    contraindications: [],
    is_active: true,
    is_draft: false,
  },
];

const FILL = [
  {
    name: "L-Sit Chin-up",
    description: "Chin-up ejecutado mientras se mantiene la posición L-sit (piernas paralelas al piso durante toda la rep). Combina fuerza de pull vertical con hold isométrico brutal del core y hip flexor. Skill + strength avanzado — cada rep vale como 2 en términos de demanda.",
    coaching_cue: "Agarre supinado (palmas hacia vos), anchura de hombros. Antes de iniciar el pull, LEVANTA las piernas rectas paralelas al piso — mantenelas ahí durante TODO el rep. Jalá con la escápula primero, no el bicep. Barbilla claramente sobre la barra. Bajás controlado sin dejar caer las piernas. Si las piernas caen = cortás la serie. Regresión: tuck L-Sit (rodillas dobladas al pecho) hasta que puedas mantener piernas rectas.",
    founder_notes: "El chin-up más honesto. El L-sit forzado bloquea cualquier trampa con la cadera + kip, y cargar el core hollow durante 5 reps es un test de composure real. Si no llegás a 5 con piernas rectas, hacelo tuck — mejor rango completo en regresión que reps cheat en 'progresión'.",
  },
];

console.log("═══ Creando exercises ═══\n");
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
  if (!existing) { console.log(`  ⚠ ${row.name} NOT FOUND`); continue; }
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
