import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const NAMES = [
  // PRIME
  "90/90 Hip Switches",
  "World's Greatest Stretch",
  "Glute Bridge March",
  "Banded Lateral Walk",
  "Squat Priming Flow",
  "Bodyweight RDL",
  // HEAVY A
  "Front Squat",
  // HEAVY B
  "Barbell Hip Thrust en Smith Machine",
  "Smith Machine Hip Thrust",
  "Hip Thrust",
  // CORE
  "Reverse Sit Up",
  "Weighted Lateral Plank Dinámico",
  // TENDÓN
  "Nordic Hamstring Curl assisted",
  "Nordic Hamstring Curl",
  // POSTERIOR CHAIN
  "45° Hip Extension (Glute Bias)",
  "45° Hip Extension",
  "Hip Extension",
  // RECOVERY
  "Pigeon",
  "Pigeon Pose",
  "Couch Stretch",
  "Frog Stretch",
  "Cat-Cow Reach",
  "Cat-Cow",
];

console.log("══ Inventario MAR W1 — qué existe en catálogo ══\n");
const existing = {};
for (const n of NAMES) {
  const { data: ex } = await sb.from("exercises").select("id, name, category, movement_pattern, video_url").eq("name", n).maybeSingle();
  if (ex) { existing[n] = ex; console.log(`  ✓ "${n}" → ${ex.id.slice(0,8)} | ${ex.category} | ${ex.movement_pattern} | video=${!!ex.video_url}`); }
  else console.log(`  ✗ "${n}" — falta`);
}

console.log("\n══ Fuzzy search por variantes existentes ══\n");
const fuzzy = [
  ["%squat priming%", "Squat priming"],
  ["%hip switch%", "Hip Switches"],
  ["%world%greatest%", "World's Greatest Stretch"],
  ["%glute bridge%", "Glute Bridge"],
  ["%banded lateral%", "Banded Lateral Walk"],
  ["%bodyweight rdl%", "Bodyweight RDL"],
  ["%front squat%", "Front Squat"],
  ["%hip thrust%", "Hip Thrust"],
  ["%smith%", "Smith Machine"],
  ["%reverse sit up%", "Reverse Sit Up"],
  ["%reverse sit-up%", "Reverse Sit-Up"],
  ["%lateral plank%", "Lateral Plank"],
  ["%renegade%", "Renegade"],
  ["%nordic%", "Nordic"],
  ["%hip extension%", "Hip Extension"],
  ["%hyperextension%", "Hyperextension"],
  ["%pigeon%", "Pigeon"],
  ["%couch%stretch%", "Couch Stretch"],
  ["%frog%stretch%", "Frog Stretch"],
  ["%cat.cow%", "Cat-Cow"],
];
for (const [pattern, label] of fuzzy) {
  const { data: matches } = await sb.from("exercises").select("name").ilike("name", pattern).eq("is_active", true).limit(8);
  console.log(`  ${label} (${pattern}): ${matches?.length ? matches.map(m=>'"'+m.name+'"').join(", ") : "(nada)"}`);
}
