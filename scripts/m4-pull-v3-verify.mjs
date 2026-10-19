import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATALOG = [
  { canonical: "L-Chin-up",                         aliases: ["L-Chin-up", "L Chin-up", "L-Chinup", "L Sit Chin-up"] },
  { canonical: "L-Sit Chin-up",                     aliases: ["L-Sit Chin-up"] },
  { canonical: "Z-Press Position Cable Face Pull",  aliases: ["Z-Press Position Cable Face Pull", "Seated Straight Leg Cable Face Pull", "Seated Cable Face Pull"] },
  { canonical: "SA Farmer Hold",                    aliases: ["SA Farmer Hold", "Single Arm Farmer Hold", "Single-Arm Farmer Hold", "Farmer Hold Single Arm"] },
  { canonical: "Wall Bicep Stretch",                aliases: ["Wall Bicep Stretch", "Wall Biceps Stretch", "Bicep Wall Stretch"] },
];

const allNames = new Set();
for (const it of CATALOG) for (const a of it.aliases) allNames.add(a);
const { data: hits } = await sb.from("exercises").select("id, name, description, coaching_cue, founder_notes").in("name", [...allNames]);
const map = new Map((hits ?? []).map(h => [h.name, h]));

console.log("═══ PULL v3 · verificación ═══\n");
for (const it of CATALOG) {
  let found = null;
  for (const a of it.aliases) { if (map.has(a)) { found = map.get(a); break; } }
  if (found) {
    const c = !!(found.description && found.coaching_cue && found.founder_notes);
    console.log(`  ${c?"✓":"⚠"} ${it.canonical.padEnd(38)} → "${found.name}"${c?"":" · INCOMPLETO"}`);
  } else {
    console.log(`  ✗ ${it.canonical.padEnd(38)} → MISSING`);
  }
}

// Fuzzy
console.log("\n── Fuzzy ──");
const KWS = ["l-chin","l chin","l-sit","l sit","farmer","bicep stretch","seated face","face pull"];
for (const kw of KWS) {
  const { data } = await sb.from("exercises").select("name").eq("is_active", true).ilike("name", `%${kw}%`).limit(6);
  if (data?.length) {
    console.log(`\n  "${kw}":`);
    for (const d of data) console.log(`    · ${d.name}`);
  }
}
