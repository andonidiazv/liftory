/**
 * Sube Heavy Push y Heavy Pull de 3 → 4 sets en VIE W1 W1.
 * Inserta el 4to set en cada bloque, manteniendo continuidad de set_order.
 * Aplica a template + 3 instancias (Andoni, César, Víctor).
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const CESAR = "f54d2d89-c304-419e-93d2-8a7fadfccc51";
const VICTOR = "3b1c600f-46ee-4332-a937-731c4445c144";
const VIE_DATE = "2026-06-12";

// Get exercise IDs
const { data: ex1 } = await sb.from("exercises").select("id").eq("name", "Incline DB Bench Press").maybeSingle();
const { data: ex2 } = await sb.from("exercises").select("id").eq("name", "Chest Supported DB Row").maybeSingle();
const INCLINE_DB_BENCH = ex1.id;
const CS_ROW = ex2.id;

async function patchWorkout(workoutId, label, userId) {
  console.log(`\n── ${label} (${workoutId.slice(0,8)}) ──`);
  const { data: sets } = await sb
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("set_order");

  const heavyPush = sets.filter(s => s.block_label === "HEAVY PUSH");
  const heavyPull = sets.filter(s => s.block_label === "HEAVY PULL");
  console.log(`  HEAVY PUSH: ${heavyPush.length} sets / HEAVY PULL: ${heavyPull.length} sets`);

  if (heavyPush.length === 4 && heavyPull.length === 4) {
    console.log(`  · ya tiene 4 sets en cada uno, skip`);
    return;
  }

  // Strategy: shift everything after HEAVY PULL by +2 set_orders (one extra for Push + one for Pull)
  // Then insert one new set after each block's existing sets.
  // Two-pass to avoid unique conflicts on set_order.

  // Identify all sets that come AFTER HEAVY PULL (set_order > max of HEAVY PULL)
  const maxHeavyPull = Math.max(...heavyPull.map(s => s.set_order));
  const maxHeavyPush = Math.max(...heavyPush.map(s => s.set_order));

  // Pass 1: move all sets with so > maxHeavyPull to temp orders (10000+)
  const shifted = sets.filter(s => s.set_order > maxHeavyPull);
  for (let i = 0; i < shifted.length; i++) {
    await sb.from("workout_sets").update({ set_order: 10000 + i }).eq("id", shifted[i].id);
  }
  // Move HEAVY PULL sets between maxHeavyPush..maxHeavyPull to temp +2 each
  // Actually, simpler: shift HEAVY PULL by +1 first, then everything after by +2
  // Even simpler: build new desired set_orders
  //
  // Current: HP1 HP2 HP3 | HPull1 HPull2 HPull3 | rest...
  // Want:    HP1 HP2 HP3 HP4 | HPull1 HPull2 HPull3 HPull4 | rest+2...
  //
  // So:
  //   HEAVY PUSH 1-3 stay
  //   HEAVY PUSH new set: maxHeavyPush+1 (=HPull1's original spot)
  //   HEAVY PULL 1-3 shift +1
  //   HEAVY PULL new set: maxHeavyPull+2
  //   rest shift +2
  //
  // Pass 1 above shifted "rest" to temp. Now shift HEAVY PULL to temp too.
  for (let i = 0; i < heavyPull.length; i++) {
    await sb.from("workout_sets").update({ set_order: 20000 + i }).eq("id", heavyPull[i].id);
  }

  // Pass 2: insert new HEAVY PUSH set at maxHeavyPush + 1
  const pushTemplate = heavyPush[heavyPush.length - 1];
  await sb.from("workout_sets").insert({
    workout_id: workoutId,
    user_id: userId,
    exercise_id: INCLINE_DB_BENCH,
    block_label: "HEAVY PUSH",
    set_type: pushTemplate.set_type,
    set_order: maxHeavyPush + 1,
    planned_reps: pushTemplate.planned_reps,
    planned_weight: null,
    planned_tempo: pushTemplate.planned_tempo,
    planned_rpe: pushTemplate.planned_rpe,
    planned_rir: null,
    planned_rest_seconds: pushTemplate.planned_rest_seconds,
    planned_duration_seconds: null,
    coaching_cue_override: null,
  });

  // Pass 3: move HEAVY PULL back to maxHeavyPush+2 ... maxHeavyPush+4
  for (let i = 0; i < heavyPull.length; i++) {
    await sb.from("workout_sets").update({ set_order: maxHeavyPush + 2 + i }).eq("id", heavyPull[i].id);
  }
  // Insert new HEAVY PULL set at maxHeavyPush + 5 (after the 3 shifted HEAVY PULLs)
  const pullTemplate = heavyPull[heavyPull.length - 1];
  await sb.from("workout_sets").insert({
    workout_id: workoutId,
    user_id: userId,
    exercise_id: CS_ROW,
    block_label: "HEAVY PULL",
    set_type: pullTemplate.set_type,
    set_order: maxHeavyPush + 5,
    planned_reps: pullTemplate.planned_reps,
    planned_weight: null,
    planned_tempo: pullTemplate.planned_tempo,
    planned_rpe: pullTemplate.planned_rpe,
    planned_rir: null,
    planned_rest_seconds: pullTemplate.planned_rest_seconds,
    planned_duration_seconds: null,
    coaching_cue_override: null,
  });

  // Pass 4: move shifted sets back to their original +2 positions
  for (let i = 0; i < shifted.length; i++) {
    await sb.from("workout_sets").update({ set_order: shifted[i].set_order + 2 }).eq("id", shifted[i].id);
  }

  console.log(`  ✓ HEAVY PUSH y HEAVY PULL ahora 4 sets cada uno · total ${sets.length + 2} sets`);
}

// Find all 4 workouts
const templates = await sb.from("workouts").select("id").is("user_id", null).eq("scheduled_date", VIE_DATE);
const { data: tpl } = await sb.from("workouts").select("id").is("user_id", null).eq("day_label", "W1 UPPER HYPERTROPHY").maybeSingle();
await patchWorkout(tpl.id, "Template", null);

for (const [uid, name] of [[ANDONI, "Andoni"], [CESAR, "César"], [VICTOR, "Víctor"]]) {
  const { data: w } = await sb.from("workouts").select("id").eq("user_id", uid).eq("scheduled_date", VIE_DATE).maybeSingle();
  if (!w) { console.log(`${name}: sin workout`); continue; }
  await patchWorkout(w.id, name, uid);
}

console.log("\n✓ Heavy Push/Pull subidos a 4 sets cada uno");
