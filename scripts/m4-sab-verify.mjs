import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CATALOG = [
  { canonical: "Serratus Wall Slide",           aliases: ["Serratus Wall Slide", "Wall Slide Serratus"] },
  { canonical: "Quadruped Scap Push-up",        aliases: ["Quadruped Scap Push-up", "Quadruped Scapular Push-up"] },
  { canonical: "Banded Face Pull",              aliases: ["Banded Face Pull"] },
  { canonical: "Banded Pull-Apart",             aliases: ["Banded Pull-Apart", "Band Pull-Apart"] },
  { canonical: "Over-Under Push-up",            aliases: ["Over-Under Push-up", "Over Under Push-up", "Over Under Fence Push-up"] },
  { canonical: "Scorpion Active Pec Stretch",   aliases: ["Scorpion Active Pec Stretch", "Scorpion Stretch", "Scorpion"] },
  { canonical: "DB Shoulder Press",             aliases: ["DB Shoulder Press", "Dumbbell Shoulder Press", "Seated DB Shoulder Press"] },
  { canonical: "Rotational Lateral Raise",      aliases: ["Rotational Lateral Raise", "Lateral Raise with Rotation", "DB Rotational Lateral Raise"] },
  { canonical: "DB Spider Curl on Bench",       aliases: ["DB Spider Curl on Bench", "Spider Curl", "DB Spider Curl"] },
  { canonical: "Cable Face Pull High to Low",   aliases: ["Cable Face Pull High to Low", "High to Low Cable Face Pull", "Cable Face Pull"] },
  { canonical: "Tricep Rope Pushdown",          aliases: ["Tricep Rope Pushdown", "Rope Tricep Pushdown", "Cable Tricep Pushdown"] },
  { canonical: "Devil Press",                   aliases: ["Devil Press", "Dumbbell Devil Press"] },
  { canonical: "Chest to Bar Burpee",           aliases: ["Chest to Bar Burpee", "C2B Burpee", "Chest to Bar Pull-up Burpee"] },
  { canonical: "V-up",                          aliases: ["V-up", "V Up", "V Ups"] },
  { canonical: "Wide Mountain Climbers",        aliases: ["Wide Mountain Climbers", "Wide Mountain Climber", "Mountain Climber Wide"] },
  { canonical: "Dead Hang",                     aliases: ["Dead Hang", "Bar Hang"] },
  { canonical: "Plate Weighted Plank",          aliases: ["Plate Weighted Plank", "Weighted Plank", "Plank with Plate"] },
  { canonical: "G2OH with Plate",               aliases: ["G2OH with Plate", "Ground to Overhead Plate", "Plate Ground to Overhead"] },
  { canonical: "Jump Rope Singles",             aliases: ["Jump Rope Singles"] },
  { canonical: "Doorway Pec Stretch",           aliases: ["Doorway Pec Stretch", "Chest Doorway Stretch", "Wall Chest Stretch"] },
  { canonical: "Overhead Tricep Stretch",       aliases: ["Overhead Tricep Stretch"] },
  { canonical: "90/90 Breathing",               aliases: ["90/90 Breathing"] },
];

const allNames = new Set();
for (const it of CATALOG) for (const a of it.aliases) allNames.add(a);
const { data: hits } = await sb.from("exercises").select("id, name, category, movement_pattern, description, coaching_cue, founder_notes").in("name", [...allNames]);
const nameToRow = new Map();
for (const h of hits ?? []) nameToRow.set(h.name, h);

console.log("═══ M4 · SÁB SHOULDERS + ARMS + ATHLETIC — verificación ═══\n");
for (const it of CATALOG) {
  let found = null;
  for (const a of it.aliases) {
    if (nameToRow.has(a)) { found = nameToRow.get(a); break; }
  }
  if (found) {
    const cardComplete = !!(found.description && found.coaching_cue && found.founder_notes);
    console.log(`  ${cardComplete ? "✓" : "⚠"} ${it.canonical.padEnd(38)} → "${found.name}"${!cardComplete ? " · CARD INCOMPLETO" : ""}`);
  } else {
    console.log(`  ✗ ${it.canonical.padEnd(38)} → MISSING`);
  }
}

// Fuzzy check for the missing ones
console.log("\n── Fuzzy names ──");
const FUZZY = {
  "Serratus Wall Slide": ["serratus", "wall slide"],
  "DB Shoulder Press": ["shoulder press", "seated dumbbell press"],
  "Rotational Lateral Raise": ["lateral raise", "rotational"],
  "DB Spider Curl on Bench": ["spider curl", "spider"],
  "Cable Face Pull High to Low": ["face pull", "high to low"],
  "Tricep Rope Pushdown": ["pushdown", "tricep"],
  "Devil Press": ["devil"],
  "Chest to Bar Burpee": ["chest to bar", "c2b", "burpee"],
  "V-up": ["v-up", "v up"],
  "Wide Mountain Climbers": ["mountain climber"],
  "Plate Weighted Plank": ["weighted plank", "plate plank"],
  "G2OH with Plate": ["g2oh", "ground to overhead", "overhead plate"],
  "Doorway Pec Stretch": ["pec stretch", "chest stretch", "doorway"],
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
