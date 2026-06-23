/**
 * M3 · rename day_labels to [Modality] [Region/Movement] pattern
 *
 * Andoni's request (2026-06-23): the "Day" suffix is too vague — the names
 * should obviously communicate which body region is being worked.
 *
 *   DENSITY DAY        → DENSITY PUSH         (LUN · upper push EMOM)
 *   TEMPO DAY          → TEMPO LOWER          (MAR · lower tempo)
 *   SKILL DAY          → SKILL PULL           (MIE · upper pull skill work)
 *   UPPER HYPERTROPHY  → HYPERTROPHY UPPER    (VIE)
 *   LOWER HYPERTROPHY  → HYPERTROPHY LOWER    (SAB)
 *
 * Applies to:
 *   - All M3 templates (W1-W6, user_id IS NULL)
 *   - All M3 instances for Andoni / César / Víctor (date in 2026-06-08 .. 2026-07-19)
 *
 * Idempotent: skips rows already on the new label.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const M3_ID = "cdafa5e0-3843-4e00-b6e3-e5cabae953f5";

// Map old fragment → new fragment. The script preserves any "Wn " prefix
// on template labels (e.g. "W3 DENSITY DAY" → "W3 DENSITY PUSH").
const RENAMES = [
  { from: "DENSITY DAY", to: "DENSITY PUSH" },
  { from: "TEMPO DAY", to: "TEMPO LOWER" },
  { from: "SKILL DAY", to: "SKILL PULL" },
  { from: "UPPER HYPERTROPHY", to: "HYPERTROPHY UPPER" },
  { from: "LOWER HYPERTROPHY", to: "HYPERTROPHY LOWER" },
];

function rename(label) {
  for (const { from, to } of RENAMES) {
    if (label.includes(from)) return label.replace(from, to);
  }
  return null; // no match → skip
}

// Templates
const { data: tpl } = await sb
  .from("workouts")
  .select("id, day_label")
  .is("user_id", null)
  .eq("mesocycle_id", M3_ID);

let tplUpdated = 0, tplSkipped = 0;
for (const w of tpl ?? []) {
  const newLabel = rename(w.day_label);
  if (!newLabel || newLabel === w.day_label) { tplSkipped++; continue; }
  const { error } = await sb.from("workouts").update({ day_label: newLabel }).eq("id", w.id);
  if (error) { console.error(`✗ tpl ${w.id.slice(0,8)} (${w.day_label}): ${error.message}`); continue; }
  tplUpdated++;
}
console.log(`Templates: ${tplUpdated} renamed, ${tplSkipped} skipped`);

// Instances — Andoni, César, Víctor in M3 date range
const { data: inst } = await sb
  .from("workouts")
  .select("id, day_label")
  .not("user_id", "is", null)
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

let instUpdated = 0, instSkipped = 0;
for (const w of inst ?? []) {
  const newLabel = rename(w.day_label);
  if (!newLabel || newLabel === w.day_label) { instSkipped++; continue; }
  const { error } = await sb.from("workouts").update({ day_label: newLabel }).eq("id", w.id);
  if (error) { console.error(`✗ inst ${w.id.slice(0,8)} (${w.day_label}): ${error.message}`); continue; }
  instUpdated++;
}
console.log(`Instances: ${instUpdated} renamed, ${instSkipped} skipped`);

console.log(`\n✓ Total: ${tplUpdated + instUpdated} workouts renamed`);
