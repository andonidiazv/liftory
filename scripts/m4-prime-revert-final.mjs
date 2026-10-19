/**
 * Termino el revert: 12 sets residuales del PRIME que aún tienen "— A/B/C".
 * Match con LIKE explícito que cubre variantes de guión.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Traigo ids con block_label que empieza con "PRIME BLOCK " (nota el espacio) — cubre
// tanto em-dash como cualquier otro sufijo.
const { data: workouts } = await sb.from("workouts")
  .select("id")
  .in("day_label", ["PULL DAY", "LOWER PUSH", "PUSH DAY"])
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");
const wids = workouts.map(w => w.id);

const { data: leftover } = await sb.from("workout_sets")
  .select("id, block_label, workout_id")
  .in("workout_id", wids)
  .neq("block_label", "PRIME BLOCK")
  .ilike("block_label", "PRIME BLOCK%");

console.log(`Sets residuales: ${leftover?.length}`);
for (const s of leftover ?? []) console.log(`  · ${s.block_label} (workout ${s.workout_id.slice(0,8)})`);

if (leftover?.length) {
  const ids = leftover.map(s => s.id);
  const { error } = await sb.from("workout_sets")
    .update({ block_label: "PRIME BLOCK" })
    .in("id", ids);
  if (error) { console.error("✗ update:", error.message); process.exit(1); }
  console.log(`\n✓ ${ids.length} sets → "PRIME BLOCK"`);
}

// Verificación final
const { data: check } = await sb.from("workout_sets").select("block_label").in("workout_id", wids).ilike("block_label", "PRIME BLOCK%");
const counts = {};
for (const s of check ?? []) counts[s.block_label] = (counts[s.block_label]??0)+1;
console.log("\nEstado final:");
for (const [k,v] of Object.entries(counts).sort()) console.log(`  '${k}': ${v}`);
