/**
 * M4 · DOM DESCANSO · rest day placeholders W1-W6 × 4 targets.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TARGETS = [
  { name: "Andoni",   user_id: "8117e549-8314-471d-87c2-c7c68cccac17", program_id: "97d1b4a5-cf6b-4b59-b36c-d29dc5772120" },
  { name: "César",    user_id: "f54d2d89-c304-419e-93d2-8a7fadfccc51", program_id: "ccb5c861-fb6b-485b-bf54-24b4bbad9d9e" },
  { name: "Víctor",   user_id: "3b1c600f-46ee-4332-a937-731c4445c144", program_id: "de318eb0-f1f8-4111-a143-905bbf3fcb34" },
  { name: "Template", user_id: null,                                    program_id: "32302803-ead8-4e08-809a-606031a7b7e0" },
];

const M4_DOM = ["2026-07-26","2026-08-02","2026-08-09","2026-08-16","2026-08-23","2026-08-30"];

const COACH_NOTE = "Descanso completo. Sin gym, sin cardio estructurado. Comé bien, dormí 8h. Camina si querés — pero solo suave y no cuenta como entreno. El domingo es el reset semanal del CNS: si no descansás, el LUN de la próxima semana te pega el doble.";

let created = 0, skipped = 0;
for (const target of TARGETS) {
  console.log(`\n── ${target.name} ──`);
  for (let w = 1; w <= 6; w++) {
    const date = M4_DOM[w - 1];
    const existQ = sb.from("workouts").select("id").eq("scheduled_date", date).eq("program_id", target.program_id);
    if (target.user_id) existQ.eq("user_id", target.user_id); else existQ.is("user_id", null);
    const { data: existing } = await existQ.maybeSingle();
    if (existing) { console.log(`  ⏭ ${target.name.padEnd(9)} · ${date} · W${w} · already exists — skip`); skipped++; continue; }

    const workoutRow = {
      program_id: target.program_id,
      user_id: target.user_id,
      mesocycle_id: null,
      scheduled_date: date,
      week_number: w,
      day_label: "DESCANSO",
      workout_type: "rest",
      estimated_duration: null,
      is_rest_day: true,
      is_completed: false,
      coach_note: COACH_NOTE,
      short_on_time_note: null,
      notes: null,
      ai_adjustments: null,
    };
    const { error } = await sb.from("workouts").insert(workoutRow);
    if (error) { console.error(`  ✗ ${target.name} · ${date}: ${error.message}`); continue; }
    console.log(`  ✓ ${target.name.padEnd(9)} · ${date} · W${w} · rest day`);
    created++;
  }
}

console.log(`\n═══ Summary: ${created} created · ${skipped} skipped ═══`);
