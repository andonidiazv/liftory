import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NAMES = [
  "Thoracic Extension Foam", "Thoracic Extension over Foam Roller",
  "Wrist Mobility", "Scap Pull", "Dead Hang", "Bodyweight RDL",
  "Double KB Deadlift", "Double KB Front Rack Hold", "Double KB Strict Press",
  "Double KB Complex", "MU Burpee", "Muscle-Up Burpee",
  "Ice Cream Maker", "Ice Cream Makers",
  "KB Gorilla Row", "Gorilla Row",
  "DB High Pull + DB Squat Clean Complex", "DB High Pull", "DB Squat Clean",
  "DB Hammer Curl", "Hammer Curl",
  "DB Cross-Body Curl", "Cross-Body Curl",
  "Hanging Knee Raise", "L-Sit Hold (tuck)", "L-Sit Hold", "Tuck L-Sit Hold",
  "Wall Lat Stretch", "Hanging Stretch",
];

for (const n of NAMES) {
  const { data: ex } = await sb.from("exercises").select("id, name").eq("name", n).maybeSingle();
  if (ex) console.log(`  ✓ "${n}" → ${ex.id.slice(0,8)}`);
  else console.log(`  ✗ "${n}"`);
}

console.log("\n══ fuzzy ══");
const patterns = [
  ["%thoracic%foam%", "Thoracic foam"],
  ["%wrist%", "Wrist"],
  ["%scap pull%", "Scap Pull"],
  ["%dead hang%", "Dead Hang"],
  ["%double kb%", "Double KB"],
  ["%muscle.up%", "Muscle-Up"],
  ["%burpee%", "Burpee"],
  ["%ice cream%", "Ice Cream"],
  ["%gorilla%", "Gorilla"],
  ["%high pull%", "High Pull"],
  ["%squat clean%", "Squat Clean"],
  ["%hammer curl%", "Hammer Curl"],
  ["%cross.body%curl%", "Cross-Body Curl"],
  ["%hanging knee%", "Hanging Knee"],
  ["%l.sit%", "L-Sit"],
  ["%wall lat%", "Wall Lat"],
  ["%hanging stretch%", "Hanging Stretch"],
];
for (const [p, l] of patterns) {
  const { data } = await sb.from("exercises").select("name").ilike("name", p).eq("is_active", true).limit(10);
  console.log(`  ${l} (${p}): ${data?.length ? data.map(d=>'"'+d.name+'"').join(", ") : "(nada)"}`);
}
