import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const names = [
  "Prone Angels", "V Pike Hold", "V Pike to Alternating Crab Reach", "Dragon Flag",
  "Scap Push-up", "Wrist CARs", "Kneeling Kettlebell Hammer Curl",
  "Kneeling KB Overhead Press", "Kneeling KB Pullover", "Kneeling KB Upright Row",
  "Kneeling KB Overhead Tricep Extension", "Kneeling KB Alternating Halo",
  "Mule to Kickstand", "KB Pistol Squat",
];

// M5 date range: LUN 2026-08-31 (W1 D1) → DOM 2026-10-11 (W6 D7)
const M5_START = "2026-08-31";
const M5_END   = "2026-10-11";

// Andoni's UID (source of truth per day)
const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

for (const n of names) {
  const { data: ex } = await sb.from("exercises").select("id").eq("name", n).single();
  // Find ALL distinct (scheduled_date, day_label) where this exercise is used (Andoni)
  const { data: sets } = await sb.from("workout_sets").select("workouts!inner(scheduled_date, day_label)").eq("exercise_id", ex.id).eq("user_id", ANDONI);
  const seen = new Set();
  const usages = [];
  for (const s of sets ?? []) {
    const w = s.workouts;
    const key = `${w.scheduled_date}|${w.day_label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isM5 = w.scheduled_date >= M5_START && w.scheduled_date <= M5_END;
    const isSabGym = w.day_label === "GYMNASTICS PUSH + CALISTENIA";
    usages.push({ date: w.scheduled_date, day: w.day_label, meso: isM5 ? "M5" : "otro", extraContext: isM5 && !isSabGym });
  }
  const otherUses = usages.filter(u => u.extraContext || u.meso !== "M5");
  const status = otherUses.length > 0 ? `⚡ EN OTROS: ${otherUses.length}` : "solo SÁB gym M5";
  console.log(`\n"${n}" · ${status}`);
  for (const u of usages) {
    const isM5SabGym = u.meso === "M5" && u.day === "GYMNASTICS PUSH + CALISTENIA";
    const marker = isM5SabGym ? "  " : "★ ";
    console.log(`  ${marker}${u.date} · ${u.day} · ${u.meso}`);
  }
}
