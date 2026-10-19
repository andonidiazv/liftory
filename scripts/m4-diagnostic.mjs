/**
 * M4 diagnostic — read-only snapshot of DB state before we touch anything.
 *
 * Outputs:
 *  1. mesocycles rows (id, name, cycle_number, status, dates)
 *  2. programs (template + per-user)
 *  3. Users: Andoni, César, Víctor IDs
 *  4. Last M3 workouts per user (proof of what's already there)
 *  5. Full exercise catalog by name (for gap analysis)
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log("═══════════════════════════════════════════════════════");
console.log("M4 DIAGNOSTIC · " + new Date().toISOString());
console.log("═══════════════════════════════════════════════════════\n");

// 1. Mesocycles
const { data: mesos } = await sb.from("mesocycles")
  .select("id, mesocycle_name, cycle_number, status, cycle_start_date, cycle_end_date, template_program_id")
  .order("cycle_number", { ascending: true });
console.log("── MESOCYCLES ─────────────────────────────────────");
for (const m of mesos ?? []) {
  console.log(`  ${String(m.cycle_number).padStart(2, "0")} · ${m.mesocycle_name.padEnd(24)} · ${m.status.padEnd(6)} · ${m.cycle_start_date} → ${m.cycle_end_date} · ${m.id}`);
}
console.log(`  total: ${mesos?.length ?? 0}\n`);

// 2. Programs
const { data: progs } = await sb.from("programs")
  .select("id, name, user_id, is_active, mesocycle_id")
  .order("created_at", { ascending: true });
const templates = (progs ?? []).filter(p => !p.user_id);
console.log("── PROGRAM TEMPLATES ──────────────────────────────");
for (const p of templates) {
  console.log(`  ${p.name.padEnd(24)} · ${p.id}`);
}
console.log(`  total templates: ${templates.length}\n`);

// 3. Users
console.log("── USERS OF INTEREST ──────────────────────────────");
const KNOWN = {
  Andoni: "8117e549-8314-471d-87c2-c7c68cccac17",
  Cesar: "f54d2d89-c304-419e-93d2-8a7fadfccc51",
  Victor: "3b1c600f-46ee-4332-a937-731c4445c144",
};
for (const [n, uid] of Object.entries(KNOWN)) {
  const active = (progs ?? []).filter(p => p.user_id === uid && p.is_active);
  console.log(`  ${n.padEnd(8)} · ${uid} · active programs: ${active.length}`);
  for (const p of active) console.log(`      → ${p.name} · meso: ${p.mesocycle_id}`);
}
console.log();

// 4. Last workouts per user
console.log("── LAST 3 WORKOUTS PER USER ───────────────────────");
for (const [n, uid] of Object.entries(KNOWN)) {
  const { data: wks } = await sb.from("workouts")
    .select("scheduled_date, day_label, week_number, is_completed, is_rest_day")
    .eq("user_id", uid)
    .order("scheduled_date", { ascending: false })
    .limit(3);
  console.log(`  ${n}:`);
  for (const w of wks ?? []) {
    const flag = w.is_completed ? "✓" : w.is_rest_day ? "▢" : "·";
    console.log(`      ${flag} ${w.scheduled_date} · W${w.week_number} · ${w.day_label ?? "-"}`);
  }
}
console.log();

// 5. Exercise catalog names
const { data: exs, count } = await sb.from("exercises")
  .select("name, category", { count: "exact" })
  .eq("is_active", true)
  .order("name", { ascending: true });
console.log("── EXERCISE CATALOG (active) ──────────────────────");
console.log(`  total active: ${count}`);

// Check for the ones we need for M4
const NEEDED = [
  // PRIME BLOCK
  "Thoracic Extension over Foam Roller", "Downward Dog to Cobra", "Band Dislocates",
  "Wrist Prep", "Wrist CARs", "Prone Y-T-W", "Scap Push-up",
  // HEAVY / VOLUME / TRICEP
  "Incline BB Press", "Handstand Strict Press", "Wall-facing Handstand Push-up",
  "Pike Push-up", "Close Grip Incline DB Press", "SA Cable Chest Fly",
  "Cable Chest Fly", "BB Skullcrusher", "EZ Bar Skullcrusher",
  "Barbell Skullcrusher", "SA Cable Kickback", "Cable Tricep Kickback",
  // FINISHER
  "Ab Wheel Rollout",
  // RECOVERY
  "Lat Stretch Doorway", "Overhead Tricep Stretch",
  // From MAR LOWER PUSH + LUN PULL (assumed)
  "Back Squat", "Bulgarian Split Squat", "Weighted Pull-up", "Chest Supported Row",
  "DB Row", "Barbell Row", "Face Pull",
];
const names = new Set((exs ?? []).map(e => e.name));
const missing = [];
const found = [];
for (const n of NEEDED) {
  if (names.has(n)) found.push(n);
  else missing.push(n);
}
console.log(`\n  Found (${found.length}):`);
for (const n of found) console.log(`    ✓ ${n}`);
console.log(`\n  MISSING (${missing.length}):`);
for (const n of missing) console.log(`    ✗ ${n}`);

// 6. Similar-name check to catch aliases
console.log("\n── FUZZY MATCHES ON MISSING NAMES ─────────────────");
for (const miss of missing) {
  const keywords = miss.toLowerCase().split(" ").filter(w => w.length > 2);
  const likely = (exs ?? []).filter(e => {
    const n = e.name.toLowerCase();
    return keywords.some(k => n.includes(k));
  }).slice(0, 4);
  if (likely.length) {
    console.log(`  "${miss}" →`);
    for (const l of likely) console.log(`      · ${l.name}`);
  }
}
