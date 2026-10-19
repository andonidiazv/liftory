import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

const { data: w } = await sb.from("workouts").select("id, day_label, week_number, estimated_duration, coach_note").eq("user_id", ANDONI).eq("scheduled_date", "2026-07-24").maybeSingle();
console.log(`Andoni · 2026-07-24 (VIE W1) · ${w?.day_label} · duration ${w?.estimated_duration}min`);
console.log(`Coach note: "${(w?.coach_note ?? "").slice(0, 100)}..."\n`);

const { data: sets } = await sb.from("workout_sets")
  .select("set_order, block_label, set_type, planned_reps, planned_duration_seconds, planned_rest_seconds, planned_rpe, planned_tempo, coaching_cue_override, exercises:exercise_id(name)")
  .eq("workout_id", w.id)
  .order("set_order", { ascending: true });

let lastBlock = "";
for (const s of sets ?? []) {
  if (s.block_label !== lastBlock) {
    console.log(`\n── ${s.block_label} ──`);
    lastBlock = s.block_label;
  }
  const cue = (s.coaching_cue_override ?? "").slice(0, 90).replace(/\s+/g, " ");
  const cueDisplay = cue ? `"${cue}${cue.length >= 90 ? "..." : ""}"` : "(null)";
  const rpe = s.planned_rpe != null ? `RPE${s.planned_rpe}` : "";
  const tempo = s.planned_tempo ? `t${s.planned_tempo}` : "";
  const reps = s.planned_reps != null ? `${s.planned_reps}r` : "";
  const dur = s.planned_duration_seconds != null ? `${s.planned_duration_seconds}s` : "";
  const rest = s.planned_rest_seconds != null ? `rest${s.planned_rest_seconds}s` : "";
  console.log(`  [${String(s.set_order).padStart(2,"0")}] ${s.set_type.padEnd(9)} ${(s.exercises?.name ?? "?").padEnd(34)} ${reps.padStart(4)} ${dur.padStart(4)} ${tempo.padStart(6)} ${rpe.padStart(5)} ${rest.padStart(9)}  ${cueDisplay}`);
}

// Distinct block_labels
const blocks = new Set(sets.map(s => s.block_label));
console.log(`\nDistinct block_labels: ${[...blocks].join(", ")}`);
