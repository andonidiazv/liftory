import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATALOG = [
  { canonical: "Foam Roll Quads",         aliases: ["Foam Roll Quads", "Foam Rolling Quads", "SMR Quads"] },
  { canonical: "Foam Roll IT Band",       aliases: ["Foam Roll IT Band", "Foam Rolling IT Band", "SMR IT Band"] },
  { canonical: "Foam Roll Glutes",        aliases: ["Foam Roll Glutes", "Foam Rolling Glutes", "SMR Glutes"] },
  { canonical: "Foam Roll Calves",        aliases: ["Foam Roll Calves", "Foam Rolling Calves", "SMR Calves"] },
  { canonical: "Foam Roll Upper Back",    aliases: ["Foam Roll Upper Back", "Foam Rolling Upper Back", "SMR Upper Back", "Foam Roll T-spine"] },
  { canonical: "Lacrosse Ball Chest",     aliases: ["Lacrosse Ball Chest", "LAX Ball Chest", "Lacrosse Ball Pec"] },
  { canonical: "Lacrosse Ball Piriformis", aliases: ["Lacrosse Ball Piriformis", "LAX Ball Piriformis", "Lacrosse Ball Glute"] },
  { canonical: "Child's Pose",            aliases: ["Child's Pose", "Childs Pose", "Balasana"] },
  { canonical: "Pigeon Pose",             aliases: ["Pigeon Pose"] },
  { canonical: "Butterfly Pose",          aliases: ["Butterfly Pose", "Baddha Konasana", "Butterfly Stretch"] },
  { canonical: "Supine Twist",            aliases: ["Supine Twist", "Supine Spinal Twist", "Reclined Spinal Twist"] },
  { canonical: "Zone 2 Walk",             aliases: ["Zone 2 Walk", "Z2 Walk", "Incline Walk", "Zone 2 Cardio"] },
];

const allNames = new Set();
for (const it of CATALOG) for (const a of it.aliases) allNames.add(a);
const { data: hits } = await sb.from("exercises").select("id, name, category, movement_pattern, description, coaching_cue, founder_notes").in("name", [...allNames]);
const map = new Map((hits ?? []).map(h => [h.name, h]));

console.log("═══ M4 · JUE Active Recovery — verificación ═══\n");
for (const it of CATALOG) {
  let found = null;
  for (const a of it.aliases) { if (map.has(a)) { found = map.get(a); break; } }
  if (found) {
    const complete = !!(found.description && found.coaching_cue && found.founder_notes);
    console.log(`  ${complete ? "✓" : "⚠"} ${it.canonical.padEnd(28)} → "${found.name}"${!complete ? " · CARD INCOMPLETO" : ""}`);
  } else {
    console.log(`  ✗ ${it.canonical.padEnd(28)} → MISSING`);
  }
}

// Fuzzy
console.log("\n── Fuzzy ──");
const FUZZY = ["foam roll","lacrosse","piriformis","child","pigeon","butterfly","yin","supine twist","zone 2","z2","incline walk"];
for (const kw of FUZZY) {
  const { data } = await sb.from("exercises").select("name").eq("is_active", true).ilike("name", `%${kw}%`).limit(6);
  if (data?.length) {
    console.log(`\n  "${kw}":`);
    for (const d of data) console.log(`    · ${d.name}`);
  }
}
