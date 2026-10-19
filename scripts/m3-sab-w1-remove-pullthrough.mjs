/**
 * SÁB W1 · quitar Cable Pull-Through del GLUTE VOLUME.
 * Walking Lunges queda solo (3 sets working en lugar de superset).
 * Aplica a template + 3 instancias.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const SAB_DATE = "2026-06-13";

const { data: pullThrough } = await sb.from("exercises").select("id").eq("name", "Cable Pull-Through").single();
const PULL_THROUGH_ID = pullThrough.id;
const { data: walkingLunges } = await sb.from("exercises").select("id").eq("name", "DB Walking Lunges").single();
const WALKING_LUNGES_ID = walkingLunges.id;

async function patch(workoutId, label) {
  console.log(`\n── ${label} (${workoutId.slice(0,8)}) ──`);
  const { data: sets } = await sb.from("workout_sets").select("*").eq("workout_id", workoutId).order("set_order");
  const pullSets = sets.filter(s => s.block_label === "GLUTE VOLUME" && s.exercise_id === PULL_THROUGH_ID);
  if (pullSets.length === 0) { console.log("  · sin Pull-Through, skip"); return; }

  // 1. Borrar los 3 sets de Pull-Through
  const pullIds = pullSets.map(s => s.id);
  const { error: delErr } = await sb.from("workout_sets").delete().in("id", pullIds);
  if (delErr) { console.error("  ✗ delete:", delErr.message); return; }
  console.log(`  ✓ ${pullIds.length} sets de Cable Pull-Through eliminados`);

  // 2. Cambiar set_type de Walking Lunges a "working" + ajustar rest a 90s entre sets
  const walkingSets = sets.filter(s => s.block_label === "GLUTE VOLUME" && s.exercise_id === WALKING_LUNGES_ID);
  for (const ws of walkingSets) {
    await sb.from("workout_sets").update({
      set_type: "working",
      planned_rest_seconds: 90,
    }).eq("id", ws.id);
  }
  console.log(`  ✓ ${walkingSets.length} Walking Lunges sets → working, rest 90s`);

  // 3. Re-shift set_orders después del GLUTE VOLUME. Necesitamos compactar:
  //    - Mantenemos set_orders de Walking Lunges como están (3 sets en GLUTE VOLUME)
  //    - Todo lo posterior shifts -3
  const maxWalking = Math.max(...walkingSets.map(s => s.set_order));
  const after = sets.filter(s => s.set_order > maxWalking && s.block_label !== "GLUTE VOLUME");
  // Two-pass to avoid uniqueness conflict
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: 10000 + i }).eq("id", after[i].id);
  }
  for (let i = 0; i < after.length; i++) {
    await sb.from("workout_sets").update({ set_order: after[i].set_order - 3 }).eq("id", after[i].id);
  }
  console.log(`  ✓ ${after.length} sets posteriores re-shifteados -3`);

  // Verify final
  const { data: final } = await sb.from("workout_sets").select("block_label").eq("workout_id", workoutId);
  const glute = final.filter(s => s.block_label === "GLUTE VOLUME");
  console.log(`  GLUTE VOLUME final: ${glute.length} sets`);
}

// Template
const { data: tpl } = await sb.from("workouts").select("id").is("user_id", null).eq("day_label", "W1 LOWER HYPERTROPHY").maybeSingle();
if (tpl) await patch(tpl.id, "Template");

for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", SAB_DATE).maybeSingle();
  if (!w) { console.log(`${name}: sin workout`); continue; }
  await patch(w.id, name);
}

console.log("\n✓ DB Walking Lunges queda solo");
