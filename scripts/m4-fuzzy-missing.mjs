import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Fuzzy search for anything that MIGHT be an alias of our missing ones
const SEARCH = {
  "Meadows Row":                    ["meadows", "landmine row", "landmine one-arm"],
  "Straight-Arm Pulldown":          ["straight arm", "pullover"],
  "Chest-Supported SA Cable Row":   ["cable row"],
  "KB Squat Clean with Pause":      ["squat clean", "kettlebell clean"],
  "Alternating Spiderman Lunge":    ["spider", "spiderman"],
  "BB Clean + Front Squat Complex": ["clean", "front squat"],
  "B-Stance DB Goblet Squat":       ["goblet", "b-stance", "b stance"],
  "Single Leg Recoil to Shoot Through": ["recoil", "shoot through", "shoot-through"],
  "Reverse Nordic":                 ["nordic"],
  "Cyclist Bodyweight Squat with Pause": ["cyclist"],
  "Wall Ball":                      ["wall ball", "wall-ball"],
  "Incline BB Press":               ["incline bench", "incline barbell"],
  "Handstand Strict Press":         ["handstand", "hspu"],
  "Close Grip Incline DB Press":    ["close grip", "close-grip"],
  "SA Cable Chest Fly":             ["cable fly", "cable chest"],
  "Barbell Skullcrusher (EZ)":      ["skull", "skullcrusher", "lying tricep"],
  "SA Cable Kickback":              ["kickback", "tricep kickback"],
  "Prone Y-T-W":                    ["prone y", "prone t", "prone w", "ytw", "y t w"],
};

for (const [target, keywords] of Object.entries(SEARCH)) {
  console.log(`\n"${target}":`);
  for (const kw of keywords) {
    const { data } = await sb.from("exercises").select("name").eq("is_active", true).ilike("name", `%${kw}%`);
    for (const d of data ?? []) console.log(`  · ${d.name}`);
  }
}
