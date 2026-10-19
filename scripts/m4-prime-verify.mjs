import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: workouts } = await sb.from("workouts")
  .select("id")
  .in("day_label", ["PULL DAY", "LOWER PUSH", "PUSH DAY"])
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

const ids = workouts.map(w => w.id);
const { data: sets } = await sb.from("workout_sets").select("block_label").in("workout_id", ids).ilike("block_label", "PRIME BLOCK%");
const counts = {};
for (const s of sets ?? []) counts[s.block_label] = (counts[s.block_label]??0)+1;
console.log("PRIME distinct labels en M4:");
for (const [k,v] of Object.entries(counts).sort()) console.log(`  '${k}': ${v}`);
