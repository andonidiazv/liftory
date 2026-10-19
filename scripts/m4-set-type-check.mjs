import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Distinct set_type values in existing data
const { data } = await sb.from("workout_sets").select("set_type").limit(5000);
const values = new Set();
for (const r of data ?? []) if (r.set_type) values.add(r.set_type);
console.log("set_type values in use:", [...values].sort());

// Distinct block_label values in a recent workout
const { data: blocks } = await sb.from("workout_sets").select("block_label").limit(5000);
const blockVals = new Map();
for (const r of blocks ?? []) if (r.block_label) blockVals.set(r.block_label, (blockVals.get(r.block_label) ?? 0) + 1);
console.log("\ntop block_label values:");
for (const [b, c] of [...blockVals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${c.toString().padStart(4)} × ${b}`);

// Workout_type values
const { data: wkts } = await sb.from("workouts").select("workout_type").limit(5000);
const wts = new Set();
for (const r of wkts ?? []) if (r.workout_type) wts.add(r.workout_type);
console.log("\nworkout_type values in use:", [...wts].sort());
