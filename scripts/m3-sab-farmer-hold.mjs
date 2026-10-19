/**
 * SÁB W1 · cambio Farmer Carry (timer + metros, confuso) → Farmer Hold 45s puro.
 * Crea Farmer Hold nuevo en catálogo y limpia Farmer Carry para que sea caminata real.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const SAB_DATE = "2026-06-13";

// 1. Crear Farmer Hold
console.log("══ STEP 1: Crear Farmer Hold ══\n");
let farmerHoldId;
{
  const { data: existing } = await sb.from("exercises").select("id").eq("name", "Farmer Hold").maybeSingle();
  if (existing) { farmerHoldId = existing.id; console.log("  · Farmer Hold ya existe"); }
  else {
    const { data, error } = await sb.from("exercises").insert({
      name: "Farmer Hold",
      name_es: "Hold del Granjero",
      category: "strength",
      movement_pattern: "carry",
      difficulty: "beginner",
      default_tempo: null,
      primary_muscles: ["grip", "traps", "core", "shoulders"],
      equipment_required: ["dumbbell"],
      description: "Hold isométrico con DB pesada en cada mano. Postura erguida estática. Construye grip + traps + posture sin caminar.",
      coaching_cue: "DB pesada en cada mano, brazos colgando. Postura erguida — pecho arriba, hombros atrás. Mantén la posición sin moverte. Si los hombros suben o te encorvas, peso muy alto.",
      founder_notes: "El hold honesto. Tu grip falla antes que tu postura.",
      is_active: true,
    }).select("id").single();
    if (error) { console.error(error.message); process.exit(1); }
    farmerHoldId = data.id;
    console.log(`  ✓ Farmer Hold creado → ${farmerHoldId.slice(0,8)}`);
  }
}

// 2. Limpiar Farmer Carry card original para que sea caminata real (sin timer)
console.log("\n══ STEP 2: Limpiar Farmer Carry card ══\n");
{
  const { error } = await sb.from("exercises").update({
    description: "Caminata cargando DB pesada en cada mano. Grip + traps + posture en movimiento. Cierre del hybrid athlete.",
    coaching_cue: "DB pesada en cada mano, brazos colgando. Postura erguida — pecho arriba, hombros atrás. Pasos a buen ritmo SIN correr. Mantén postura los 20m.",
    founder_notes: "El carry pillar del hybrid athlete. Sin esto no eres atleta funcional.",
  }).eq("name", "Farmer Carry");
  if (error) console.error(error.message);
  else console.log("  ✓ Farmer Carry card actualizada");
}

// 3. Cambiar los sets del SÁB CALF + CARRY: Farmer Carry → Farmer Hold, duration 45s
console.log("\n══ STEP 3: Swap en SÁB workouts ══\n");

const { data: farmerCarry } = await sb.from("exercises").select("id").eq("name", "Farmer Carry").single();
const FARMER_CARRY_ID = farmerCarry.id;

async function patch(workoutId, label) {
  const { data: sets } = await sb
    .from("workout_sets")
    .select("id, set_order, coaching_cue_override")
    .eq("workout_id", workoutId)
    .eq("block_label", "CALF + CARRY")
    .eq("exercise_id", FARMER_CARRY_ID);
  if (!sets?.length) { console.log(`  ${label}: sin Farmer Carry en CALF + CARRY, skip`); return; }
  for (const s of sets) {
    await sb.from("workout_sets").update({
      exercise_id: farmerHoldId,
      planned_duration_seconds: 45,
      planned_reps: 1,
      coaching_cue_override: "45s hold · DBs pesadas · postura erguida, hombros atrás · si pierdes postura, peso muy alto",
    }).eq("id", s.id);
  }
  console.log(`  ✓ ${label}: ${sets.length} sets swapeados (Carry → Hold 45s)`);
}

const { data: tpl } = await sb.from("workouts").select("id").is("user_id", null).eq("day_label", "W1 LOWER HYPERTROPHY").maybeSingle();
if (tpl) await patch(tpl.id, "Template");

for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", SAB_DATE).maybeSingle();
  if (w) await patch(w.id, name);
}

console.log("\n✓ CALF + CARRY ahora con Farmer Hold 45s");
