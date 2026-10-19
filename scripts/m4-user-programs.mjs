import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const USERS = {
  Andoni: "8117e549-8314-471d-87c2-c7c68cccac17",
  Cesar: "f54d2d89-c304-419e-93d2-8a7fadfccc51",
  Victor: "3b1c600f-46ee-4332-a937-731c4445c144",
};

const { data: progs } = await sb.from("programs")
  .select("id, name, user_id, is_active, total_weeks, current_week")
  .in("user_id", Object.values(USERS));

for (const [name, uid] of Object.entries(USERS)) {
  const p = (progs ?? []).find(pr => pr.user_id === uid && pr.is_active);
  console.log(`${name}: ${p ? p.id : "NO ACTIVE PROGRAM"} · total_weeks: ${p?.total_weeks} · current_week: ${p?.current_week}`);
}

// Also template id
const { data: tpl } = await sb.from("programs").select("id, total_weeks").is("user_id", null).eq("name", "BUILD HIM ELITE").maybeSingle();
console.log(`Template BUILD HIM ELITE: ${tpl?.id} · total_weeks: ${tpl?.total_weeks}`);

// Sample a M3 workout+sets to see the exact schema
const { data: sample } = await sb.from("workouts").select("*").eq("user_id", USERS.Andoni).eq("scheduled_date", "2026-07-13").limit(1).maybeSingle();
console.log("\nSample workout schema keys:", sample ? Object.keys(sample).join(", ") : "none");

const { data: sampleSet } = await sb.from("workout_sets").select("*").eq("workout_id", sample?.id).limit(1).maybeSingle();
console.log("Sample workout_set schema keys:", sampleSet ? Object.keys(sampleSet).join(", ") : "none");
