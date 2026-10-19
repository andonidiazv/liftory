/**
 * M4 · W1 status para Andoni. Muestra qué días existen, qué no, y qué está
 * completado.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";
const DAYS = [
  ["LUN", "2026-07-20"],
  ["MAR", "2026-07-21"],
  ["MIÉ", "2026-07-22"],
  ["JUE", "2026-07-23"],
  ["VIE", "2026-07-24"],
  ["SÁB", "2026-07-25"],
  ["DOM", "2026-07-26"],
];

console.log("M4 · W1 · Andoni\n");
for (const [d, date] of DAYS) {
  const { data: w } = await sb.from("workouts")
    .select("id, day_label, is_rest_day, is_completed, workout_sets(id, is_completed)")
    .eq("user_id", ANDONI)
    .eq("scheduled_date", date)
    .maybeSingle();
  if (!w) { console.log(`  ${d} ${date}: — sin workout —`); continue; }
  const sets = w.workout_sets ?? [];
  const done = sets.filter(s => s.is_completed).length;
  const status = w.is_completed ? "✓ COMPLETADO" : w.is_rest_day ? "▢ REST" : `${done}/${sets.length} sets`;
  console.log(`  ${d} ${date}: ${w.day_label.padEnd(12)} · ${status}`);
}
