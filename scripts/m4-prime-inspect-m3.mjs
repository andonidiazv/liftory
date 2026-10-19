/**
 * Inspect: cómo se ve el PRIME BLOCK de un workout de M3 (Andoni) vs mis M4.
 * Sale coaching_cue_override completo + block_label + set_order para comparar.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

async function dump(label, date) {
  const { data: w } = await sb.from("workouts")
    .select("id, day_label")
    .eq("user_id", ANDONI)
    .eq("scheduled_date", date)
    .maybeSingle();
  if (!w) { console.log(`${label} ${date}: NO WORKOUT`); return; }

  const { data: sets } = await sb.from("workout_sets")
    .select("set_order, block_label, coaching_cue_override, exercises:exercise_id(name)")
    .eq("workout_id", w.id)
    .ilike("block_label", "PRIME BLOCK%")
    .order("set_order", { ascending: true });

  console.log(`\n═══ ${label} · ${date} · ${w.day_label} · workout ${w.id.slice(0,8)} ═══`);
  for (const s of sets ?? []) {
    const cue = (s.coaching_cue_override ?? "").slice(0, 120).replace(/\s+/g, " ");
    console.log(`  [${s.set_order.toString().padStart(2,"0")}] block:'${s.block_label}'  ex:${s.exercises?.name?.padEnd(38)}  cue:"${cue}${cue.length >= 120 ? "..." : ""}"`);
  }
}

// M3 · Skill Pull W1 (2026-06-08 lunes)
await dump("M3 SKILL PULL W1", "2026-06-08");
// M3 · Tempo Lower W1 (2026-06-09 martes)
await dump("M3 TEMPO LOWER W1", "2026-06-09");
// M4 · Pull Day W1 (2026-07-20 hoy)
await dump("M4 PULL DAY W1", "2026-07-20");
