import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log("═══ M4 VERIFICATION ═══\n");

// 1. Count workouts in the M4 window by user
const USERS = {
  Andoni: "8117e549-8314-471d-87c2-c7c68cccac17",
  Cesar: "f54d2d89-c304-419e-93d2-8a7fadfccc51",
  Victor: "3b1c600f-46ee-4332-a937-731c4445c144",
};
for (const [n, uid] of Object.entries(USERS)) {
  const { count } = await sb.from("workouts").select("*", { count: "exact", head: true })
    .eq("user_id", uid).gte("scheduled_date", "2026-07-20").lte("scheduled_date", "2026-08-30");
  console.log(`  ${n}: ${count} workouts in M4 window`);
}
const { count: tplCount } = await sb.from("workouts").select("*", { count: "exact", head: true })
  .is("user_id", null).gte("scheduled_date", "2026-07-20").lte("scheduled_date", "2026-08-30");
console.log(`  Template: ${tplCount} workouts`);

// 2. Andoni's LUN W1 workout — full check
const { data: mon } = await sb.from("workouts").select("*, workout_sets(id, set_order, block_label, set_type, planned_reps, exercise_id, exercise:exercises(name))")
  .eq("user_id", USERS.Andoni).eq("scheduled_date", "2026-07-20").maybeSingle();
console.log(`\n── Andoni · 2026-07-20 (LUN W1 PULL DAY) ──`);
console.log(`  id: ${mon?.id} · day_label: ${mon?.day_label} · week: ${mon?.week_number} · sets: ${mon?.workout_sets?.length}`);
const byBlock = new Map();
for (const s of mon?.workout_sets ?? []) {
  if (!byBlock.has(s.block_label)) byBlock.set(s.block_label, []);
  byBlock.get(s.block_label).push(s);
}
for (const [b, arr] of byBlock) console.log(`    ${b}: ${arr.length} sets · e.g. "${arr[0].exercise?.name}" reps=${arr[0].planned_reps}`);

// 3. Andoni's MAR W1 LOWER PUSH
const { data: mar } = await sb.from("workouts").select("*, workout_sets(id, block_label, set_type, exercise:exercises(name))")
  .eq("user_id", USERS.Andoni).eq("scheduled_date", "2026-07-21").maybeSingle();
console.log(`\n── Andoni · 2026-07-21 (MAR W1 LOWER PUSH) ──`);
console.log(`  id: ${mar?.id} · sets: ${mar?.workout_sets?.length}`);
const byBlock2 = new Map();
for (const s of mar?.workout_sets ?? []) {
  if (!byBlock2.has(s.block_label)) byBlock2.set(s.block_label, []);
  byBlock2.get(s.block_label).push(s);
}
for (const [b, arr] of byBlock2) console.log(`    ${b}: ${arr.length} sets · e.g. "${arr[0].exercise?.name}" (${arr[0].set_type})`);

// 4. Andoni's MIÉ W5 PUSH DAY (peak week)
const { data: mie } = await sb.from("workouts").select("*, workout_sets(id, block_label, set_type, planned_reps, exercise:exercises(name))")
  .eq("user_id", USERS.Andoni).eq("scheduled_date", "2026-08-19").maybeSingle();
console.log(`\n── Andoni · 2026-08-19 (MIÉ W5 PUSH DAY - peak) ──`);
console.log(`  id: ${mie?.id} · sets: ${mie?.workout_sets?.length}`);
const byBlock3 = new Map();
for (const s of mie?.workout_sets ?? []) {
  if (!byBlock3.has(s.block_label)) byBlock3.set(s.block_label, []);
  byBlock3.get(s.block_label).push(s);
}
for (const [b, arr] of byBlock3) console.log(`    ${b}: ${arr.length} sets · e.g. "${arr[0].exercise?.name}" reps=${arr[0].planned_reps}`);

// 5. Check for null exercise_ids or other issues
const { data: bad } = await sb.from("workout_sets").select("id, workout_id").eq("user_id", USERS.Andoni).is("exercise_id", null).limit(5);
console.log(`\n  Null exercise_id sets (Andoni): ${bad?.length ?? 0}`);

// 6. total sets in M4 window
const { count: setCount } = await sb.from("workout_sets").select("workouts!inner(scheduled_date)", { count: "exact", head: true })
  .gte("workouts.scheduled_date", "2026-07-20").lte("workouts.scheduled_date", "2026-08-30");
console.log(`\n  Total sets in M4 window (all users): ${setCount}`);
