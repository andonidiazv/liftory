/**
 * M3 LUN · Skill Push · cap a 4 rondas (8 sets totales: 4 bench + 4 combo)
 *
 * W3 y W4 estaban en 5 rondas (10 sets) — too much. Bajar a 4.
 * Estrategia: eliminar los últimos 2 sets del bloque (set_order más altos),
 * luego decrementar set_order de los sets POSTERIORES al bloque en 2 para
 * mantener la numeración continua.
 *
 * Aplica a templates W3, W4 + las 3 instancias de cada uno.
 * Idempotente: si el bloque ya tiene ≤ 8 sets, skip.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";
const TARGET_ROUNDS = 4;       // queremos 4 rondas
const SETS_PER_ROUND = 2;      // superset 2 ejercicios
const TARGET_SETS = TARGET_ROUNDS * SETS_PER_ROUND;  // 8

// W3 + W4 LUN
const { data: tpl } = await sb
  .from("workouts")
  .select("id, week_number, day_label")
  .is("user_id", null)
  .eq("mesocycle_id", M3_ID)
  .like("day_label", "W% DENSITY DAY")
  .in("week_number", [3, 4]);

const { data: inst } = await sb
  .from("workouts")
  .select("id, week_number, day_label, scheduled_date, user_id")
  .not("user_id", "is", null)
  .eq("day_label", "DENSITY DAY")
  .in("week_number", [3, 4]);

const all = [...(tpl ?? []), ...(inst ?? [])];
console.log(`Workouts a recortar (W3 + W4): ${tpl?.length ?? 0} templates + ${inst?.length ?? 0} instancias = ${all.length}`);

let deleted = 0, renum = 0, skipped = 0;

for (const w of all) {
  const ctx = `W${w.week_number} ${w.user_id ? w.user_id.slice(0, 8) : "tpl"}`;

  // Fetch all sets of this workout, ordered
  const { data: allSets } = await sb
    .from("workout_sets")
    .select("id, set_order, block_label")
    .eq("workout_id", w.id)
    .order("set_order");

  const skill = allSets.filter(s => s.block_label === "SKILL PUSH");
  if (skill.length <= TARGET_SETS) { skipped++; continue; }

  const excess = skill.length - TARGET_SETS;  // 10 - 8 = 2
  const toDelete = skill.slice(-excess);       // últimos 2
  const minDeletedOrder = Math.min(...toDelete.map(s => s.set_order));

  // Delete the excess sets
  const { error: dErr } = await sb.from("workout_sets").delete().in("id", toDelete.map(s => s.id));
  if (dErr) { console.error(`✗ ${ctx} delete: ${dErr.message}`); continue; }
  deleted += toDelete.length;

  // Renumber sets that come AFTER the deleted range (set_order > min(deleted))
  // Process in ASCENDING order — no collision risk because we're subtracting
  // and the deleted slots are now empty.
  const after = allSets
    .filter(s => s.set_order > minDeletedOrder && !toDelete.some(d => d.id === s.id))
    .sort((a, b) => a.set_order - b.set_order);

  for (const s of after) {
    const newOrder = s.set_order - excess;
    const { error } = await sb.from("workout_sets").update({ set_order: newOrder }).eq("id", s.id);
    if (error) { console.error(`✗ ${ctx} renum set ${s.id.slice(0, 8)}: ${error.message}`); continue; }
    renum++;
  }

  console.log(`  ✓ ${ctx}: -${toDelete.length} sets, renum ${after.length}`);
}

console.log(`\n✓ Sets eliminados: ${deleted} · sets renumerados: ${renum} · workouts skipped: ${skipped}`);
