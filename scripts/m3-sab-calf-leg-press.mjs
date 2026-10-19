/**
 * SÁB W1 · cambio Standing Calf Raise → Leg Press Calf Raise.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const SAB_DATE = "2026-06-13";

// 1. Crear Leg Press Calf Raise
console.log("══ STEP 1: Crear Leg Press Calf Raise ══\n");
let newCalfId;
{
  const { data: existing } = await sb.from("exercises").select("id").eq("name", "Leg Press Calf Raise").maybeSingle();
  if (existing) { newCalfId = existing.id; console.log("  · ya existe"); }
  else {
    const { data, error } = await sb.from("exercises").insert({
      name: "Leg Press Calf Raise",
      name_es: "Elevación de Pantorrilla en Leg Press",
      category: "accessory",
      movement_pattern: "push",
      difficulty: "beginner",
      default_tempo: "2.1.1.1",
      primary_muscles: ["gastrocnemius", "soleus"],
      equipment_required: ["leg_press_machine"],
      description: "Calf raise en leg press. Carga mucho mayor que de pie, isolación pura del gastrocnemius.",
      coaching_cue: "Sentado en leg press, peso seguro. Puntas de los pies en el borde inferior de la plataforma, talones cuelgan. Empuja con la planta a máxima contracción. PAUSA 1s arriba. Baja a estiramiento completo.",
      founder_notes: "Más carga que de pie = más estímulo. El calf crece con peso real.",
      is_active: true,
    }).select("id").single();
    if (error) { console.error(error.message); process.exit(1); }
    newCalfId = data.id;
    console.log(`  ✓ creado → ${newCalfId.slice(0,8)}`);
  }
}

// 2. Swap en sets del SÁB
console.log("\n══ STEP 2: Swap sets ══\n");
const { data: oldCalf } = await sb.from("exercises").select("id").eq("name", "Standing Calf Raise pause-at-top").single();
const OLD_ID = oldCalf.id;

async function patch(workoutId, label) {
  const { data: sets } = await sb.from("workout_sets").select("id").eq("workout_id", workoutId).eq("exercise_id", OLD_ID);
  if (!sets?.length) { console.log(`  ${label}: sin sets, skip`); return; }
  for (const s of sets) {
    await sb.from("workout_sets").update({
      exercise_id: newCalfId,
      coaching_cue_override: "PAUSA 1s arriba · baja a estiramiento completo · carga pesada honesta",
    }).eq("id", s.id);
  }
  console.log(`  ✓ ${label}: ${sets.length} sets swapeados`);
}

const { data: tpl } = await sb.from("workouts").select("id").is("user_id", null).eq("day_label", "W1 LOWER HYPERTROPHY").maybeSingle();
if (tpl) await patch(tpl.id, "Template");
for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", SAB_DATE).maybeSingle();
  if (w) await patch(w.id, name);
}

console.log("\n✓ Leg Press Calf Raise en el SÁB");
