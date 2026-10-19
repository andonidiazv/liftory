import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATALOG = [
  { canonical: "90/90 Hip Switches", aliases: ["90/90 Hip Switches", "90/90 Switches"] },
  { canonical: "Hip CARs", aliases: ["Hip CARs", "Hip Circles"] },
  { canonical: "Banded Clam Shell", aliases: ["Banded Clam Shell", "Banded Clamshell", "Clamshell"] },
  { canonical: "Supine Active Hamstring Stretch", aliases: ["Supine Active Hamstring Stretch", "Active Hamstring Stretch"] },
  { canonical: "BW Sumo RDL", aliases: ["BW Sumo RDL", "Bodyweight Sumo RDL", "Sumo RDL"] },
  { canonical: "Sumo Deadlift", aliases: ["Sumo Deadlift", "Barbell Sumo Deadlift"] },
  { canonical: "American KB Swing", aliases: ["American KB Swing", "American Swing", "American Kettlebell Swing", "KB Swing American"] },
  { canonical: "Side Plank", aliases: ["Side Plank"] },
  { canonical: "Nordic Hamstring Curl", aliases: ["Nordic Hamstring Curl", "Nordic Curl"] },
  { canonical: "Cable Pull-Through", aliases: ["Cable Pull-Through", "Cable Pull Through", "Pull-Through"] },
  { canonical: "KB Sit-up to Press", aliases: ["KB Sit-up to Press", "KB Sit Up to Press", "Kettlebell Sit-up to Press"] },
  { canonical: "1/2 Kneeling Cable Chop", aliases: ["1/2 Kneeling Cable Chop", "Half Kneeling Cable Chop", "Cable Chop", "Kneeling Cable Chop"] },
];

const allNames = new Set();
for (const it of CATALOG) for (const a of it.aliases) allNames.add(a);
const { data: hits } = await sb.from("exercises").select("id, name, category, movement_pattern, description, coaching_cue, founder_notes").in("name", [...allNames]);
const nameToRow = new Map();
for (const h of hits ?? []) nameToRow.set(h.name, h);

console.log("═══ M4 · VIE LOWER HINGE — verificación ═══\n");
for (const it of CATALOG) {
  let found = null;
  for (const a of it.aliases) {
    if (nameToRow.has(a)) { found = nameToRow.get(a); break; }
  }
  if (found) {
    const cardComplete = !!(found.description && found.coaching_cue && found.founder_notes);
    console.log(`  ${cardComplete ? "✓" : "⚠"} ${it.canonical.padEnd(38)} → "${found.name}" (${found.category}/${found.movement_pattern})${!cardComplete ? " · CARD INCOMPLETO" : ""}`);
  } else {
    console.log(`  ✗ ${it.canonical.padEnd(38)} → MISSING`);
  }
}

// Fuzzy search para los missing
console.log("\n── Fuzzy check nombres cercanos ──");
const FUZZY = {
  "American KB Swing": ["swing"],
  "Side Plank": ["side plank"],
  "Cable Pull-Through": ["pull-through", "pull through", "pullthrough"],
  "KB Sit-up to Press": ["sit up to press", "sit-up press", "kb sit"],
  "1/2 Kneeling Cable Chop": ["chop", "kneeling cable"],
  "Banded Clam Shell": ["clam", "clamshell"],
  "90/90 Hip Switches": ["90/90", "hip switch"],
  "Hip CARs": ["hip cars", "hip circle"],
  "BW Sumo RDL": ["sumo rdl", "bodyweight sumo"],
};
for (const [target, keywords] of Object.entries(FUZZY)) {
  const found = new Set();
  for (const kw of keywords) {
    const { data } = await sb.from("exercises").select("name").eq("is_active", true).ilike("name", `%${kw}%`).limit(5);
    for (const d of data ?? []) found.add(d.name);
  }
  if (found.size) {
    console.log(`\n  "${target}":`);
    for (const n of found) console.log(`    · ${n}`);
  }
}
