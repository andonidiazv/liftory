import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ANDONI = "8117e549-8314-471d-87c2-c7c68cccac17";

console.log("═══ M4 · Status completo (Andoni) ═══\n");

const START = new Date("2026-07-20T00:00:00");
for (let w = 1; w <= 6; w++) {
  console.log(`\n── W${w} ──`);
  for (let d = 0; d < 7; d++) {
    const date = new Date(START);
    date.setDate(date.getDate() + (w - 1) * 7 + d);
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${day}`;
    const dowLabel = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"][date.getDay()];

    const { data: wk } = await sb.from("workouts")
      .select("day_label, is_rest_day, is_completed")
      .eq("user_id", ANDONI)
      .eq("scheduled_date", dateStr)
      .maybeSingle();

    if (!wk) {
      console.log(`  ${dowLabel} ${dateStr} — ✗ SIN WORKOUT`);
    } else {
      const flag = wk.is_completed ? "✓" : wk.is_rest_day ? "▢" : "·";
      console.log(`  ${dowLabel} ${dateStr} ${flag} ${wk.day_label}`);
    }
  }
}

// Contar totales
const { count: total } = await sb.from("workouts").select("*", { count: "exact", head: true })
  .eq("user_id", ANDONI).gte("scheduled_date", "2026-07-20").lte("scheduled_date", "2026-08-30");
console.log(`\n═══ Total workouts Andoni en M4: ${total} ═══`);
