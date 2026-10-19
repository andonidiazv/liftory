/**
 * M4 · Revertir el sub-split del PRIME BLOCK.
 *
 * El script anterior (m4-prime-subdivide.mjs) cambió block_label de
 * "PRIME BLOCK" a "PRIME BLOCK — A/B/C" pensando que ese era el patrón.
 * Estaba mal — así la UI renderiza 3 bloques separados en vez de 1 bloque
 * con sub-secciones internas.
 *
 * Patrón correcto (mismo que M3): block_label = "PRIME BLOCK" plano para
 * los 12 sets, y las sub-divisiones A/B/C viven en el coaching_cue_override
 * con prefijo "PRIME · A. Movilidad. ..." — la UI los agrupa por ese cue.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, scheduled_date")
  .in("day_label", ["PULL DAY", "LOWER PUSH", "PUSH DAY"])
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

console.log(`Workouts en M4 window: ${workouts?.length}\n`);

// Batch update por workout: cambiar todos los sets con block_label like "PRIME BLOCK — %"
// de vuelta a "PRIME BLOCK".
let reverted = 0;
for (const w of workouts ?? []) {
  const { data: sets } = await sb.from("workout_sets")
    .select("id")
    .eq("workout_id", w.id)
    .like("block_label", "PRIME BLOCK — %");
  if (!sets?.length) continue;
  const ids = sets.map(s => s.id);
  const { error } = await sb.from("workout_sets")
    .update({ block_label: "PRIME BLOCK" })
    .in("id", ids);
  if (error) { console.error(`  ✗ ${w.scheduled_date} ${w.day_label}: ${error.message}`); continue; }
  reverted += ids.length;
}

console.log(`✓ Sets revertidos a "PRIME BLOCK": ${reverted}`);
