/**
 * M4 exercise verification — check every canonical name we need across
 * PULL DAY + LOWER PUSH + PUSH DAY. Fuzzy-match potentially-aliased names.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Canonical names we'd LIKE to use. Verify existence + gather aliases.
const CATALOG = [
  // ── PULL DAY ──
  { canonical: "Thoracic Extension over Foam Roller", aliases: ["Thoracic Extension over Foam Roller"] },
  { canonical: "Downward Dog to Cobra", aliases: ["Downward Dog to Cobra"] },
  { canonical: "Band Pull-Apart", aliases: ["Band Pull-Apart", "Banded Pull-Apart"] },
  { canonical: "Prone Y-T-W", aliases: ["Prone Y-T-W", "Prone YTW", "Y-T-W"] },
  { canonical: "Dead Hang", aliases: ["Dead Hang", "Bar Hang"] },
  { canonical: "Cat-Cow Reach", aliases: ["Cat-Cow Reach", "Cat Cow Reach", "Cat-Cow"] },
  { canonical: "Meadows Row", aliases: ["Meadows Row", "Landmine Meadows Row"] },
  { canonical: "Weighted Chin-up", aliases: ["Weighted Chin-up", "Weighted Chin Up", "Weighted Pull-up"] },
  { canonical: "Straight-Arm Pulldown", aliases: ["Straight-Arm Pulldown", "Straight Arm Pulldown", "SA Pulldown"] },
  { canonical: "Chest-Supported SA Cable Row", aliases: ["Chest-Supported SA Cable Row", "Chest Supported Single Arm Cable Row"] },
  { canonical: "Preacher Curl", aliases: ["Preacher Curl", "Barbell Preacher Curl", "DB Preacher Curl", "EZ Bar Preacher Curl"] },
  { canonical: "Incline DB Curl", aliases: ["Incline DB Curl", "Incline Dumbbell Curl"] },
  { canonical: "Face Pull with External Rotation", aliases: ["Face Pull with External Rotation", "Cable Face Pull", "Banded Face Pull"] },
  { canonical: "Farmer Hold", aliases: ["Farmer Hold", "Farmers Hold"] },
  { canonical: "Lat Stretch Doorway", aliases: ["Lat Stretch Doorway"] },

  // ── LOWER PUSH ──
  { canonical: "Weighted Ankle Stretch", aliases: ["Weighted Ankle Stretch", "Ankle Mobility"] },
  { canonical: "Cossack Squat Flow", aliases: ["Cossack Squat Flow"] },
  { canonical: "Supine Active Hamstring Stretch", aliases: ["Supine Active Hamstring Stretch", "Active Hamstring Stretch"] },
  { canonical: "KB Squat Clean with Pause", aliases: ["KB Squat Clean with Pause", "KB Squat Clean", "Kettlebell Squat Clean"] },
  { canonical: "Alternating Spiderman Lunge", aliases: ["Alternating Spiderman Lunge", "Spiderman Lunge", "Spider Lunge"] },
  { canonical: "BB Clean + Front Squat Complex", aliases: ["BB Clean + Front Squat Complex", "Clean + Front Squat"] },
  { canonical: "B-Stance DB Goblet Squat", aliases: ["B-Stance DB Goblet Squat", "B Stance DB Goblet Squat"] },
  { canonical: "Single Leg Recoil to Shoot Through", aliases: ["Single Leg Recoil to Shoot Through", "SL Recoil to Shoot Through"] },
  { canonical: "Reverse Nordic", aliases: ["Reverse Nordic", "Reverse Nordic Curl"] },
  { canonical: "Cyclist Bodyweight Squat with Pause", aliases: ["Cyclist Bodyweight Squat with Pause", "Cyclist Squat"] },
  { canonical: "Wall Ball", aliases: ["Wall Ball", "Wall Balls"] },
  { canonical: "Couch Stretch", aliases: ["Couch Stretch"] },
  { canonical: "Legs Up the Wall", aliases: ["Legs Up the Wall", "Legs Up Wall"] },
  { canonical: "Jump Rope Singles", aliases: ["Jump Rope Singles", "Single Unders", "Jump Rope"] },

  // ── PUSH DAY ──
  { canonical: "Band Dislocates", aliases: ["Band Dislocates", "Banded Dislocates"] },
  { canonical: "Wrist Prep", aliases: ["Wrist Prep", "Wrist Mobility", "Wrist CARs"] },
  { canonical: "Scap Push-up", aliases: ["Scap Push-up", "Scapular Push-up"] },
  { canonical: "Incline BB Press", aliases: ["Incline BB Press", "Incline Barbell Press", "Incline Barbell Bench Press"] },
  { canonical: "Handstand Strict Press", aliases: ["Handstand Strict Press", "Wall Handstand Push-up", "HSPU"] },
  { canonical: "Close Grip Incline DB Press", aliases: ["Close Grip Incline DB Press", "Close Grip Incline Dumbbell Press"] },
  { canonical: "SA Cable Chest Fly", aliases: ["SA Cable Chest Fly", "Single Arm Cable Chest Fly"] },
  { canonical: "Barbell Skullcrusher (EZ)", aliases: ["Barbell Skullcrusher (EZ)", "EZ Bar Skullcrusher", "Barbell Skullcrusher", "Skullcrusher"] },
  { canonical: "SA Cable Kickback", aliases: ["SA Cable Kickback", "Single Arm Cable Tricep Kickback", "Cable Tricep Kickback"] },
  { canonical: "Ab Wheel Rollout", aliases: ["Ab Wheel Rollout"] },
  { canonical: "Overhead Tricep Stretch", aliases: ["Overhead Tricep Stretch"] },
];

const allNames = new Set();
for (const it of CATALOG) for (const a of it.aliases) allNames.add(a);
const { data: hits } = await sb.from("exercises").select("id, name, category, movement_pattern, description, coaching_cue, founder_notes").in("name", [...allNames]);
const nameToRow = new Map();
for (const h of hits ?? []) nameToRow.set(h.name, h);

console.log("═══════════════════════════════════════════════════════");
console.log("M4 EXERCISE VERIFICATION");
console.log("═══════════════════════════════════════════════════════\n");

const RESOLVED = [];
const MISSING = [];

for (const it of CATALOG) {
  let found = null;
  for (const a of it.aliases) {
    if (nameToRow.has(a)) { found = nameToRow.get(a); break; }
  }
  if (found) {
    const cardComplete = found.description && found.coaching_cue && found.founder_notes;
    RESOLVED.push({ ...it, dbName: found.name, dbId: found.id, cardComplete });
    const check = cardComplete ? "✓" : "⚠️";
    console.log(`  ${check} ${it.canonical.padEnd(42)} → "${found.name}" (${found.category}/${found.movement_pattern})${!cardComplete ? " · CARD INCOMPLETO" : ""}`);
  } else {
    MISSING.push(it);
    console.log(`  ✗ ${it.canonical.padEnd(42)} → MISSING`);
  }
}

console.log(`\n── Summary ──────────────────────────────────`);
console.log(`  Resolved (already in BD): ${RESOLVED.length}`);
console.log(`  Cards incomplete:         ${RESOLVED.filter(r => !r.cardComplete).length}`);
console.log(`  Missing (need to create): ${MISSING.length}`);
console.log();
console.log("── Missing list (for creation) ──────────────");
for (const m of MISSING) console.log(`  · ${m.canonical}`);
