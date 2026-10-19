/**
 * M4 verificación final · 168 workouts + sets por usuario + integridad.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const USERS = {
  Andoni: "8117e549-8314-471d-87c2-c7c68cccac17",
  César:  "f54d2d89-c304-419e-93d2-8a7fadfccc51",
  Víctor: "3b1c600f-46ee-4332-a937-731c4445c144",
};

const M4_START = "2026-07-20";
const M4_END   = "2026-08-30";

console.log("═══════════════════════════════════════════════════════");
console.log("M4 · Verificación end-to-end");
console.log(`Fecha: ${M4_START} → ${M4_END}`);
console.log("═══════════════════════════════════════════════════════\n");

// 1. Count workouts per user + template
console.log("── Workouts por target ──");
for (const [name, uid] of Object.entries(USERS)) {
  const { count } = await sb.from("workouts").select("*", { count: "exact", head: true })
    .eq("user_id", uid).gte("scheduled_date", M4_START).lte("scheduled_date", M4_END);
  const status = count === 42 ? "✓" : "⚠";
  console.log(`  ${status} ${name.padEnd(8)} ${count}/42`);
}
const { count: tpl } = await sb.from("workouts").select("*", { count: "exact", head: true })
  .is("user_id", null).gte("scheduled_date", M4_START).lte("scheduled_date", M4_END);
console.log(`  ${tpl === 42 ? "✓" : "⚠"} Template ${tpl}/42`);

// 2. Total sets in M4 window
console.log("\n── Sets totales ──");
const { data: workouts } = await sb.from("workouts").select("id").gte("scheduled_date", M4_START).lte("scheduled_date", M4_END);
const wids = workouts.map(w => w.id);
const { count: setCount } = await sb.from("workout_sets").select("*", { count: "exact", head: true }).in("workout_id", wids);
console.log(`  Total workouts M4: ${workouts?.length}`);
console.log(`  Total sets M4:     ${setCount}`);

// 3. Verify día labels + integridad Andoni
console.log("\n── Andoni · integridad por semana ──");
const { data: andoniWks } = await sb.from("workouts")
  .select("scheduled_date, day_label, is_rest_day, week_number, workout_sets(id)")
  .eq("user_id", USERS.Andoni).gte("scheduled_date", M4_START).lte("scheduled_date", M4_END)
  .order("scheduled_date", { ascending: true });

for (let w = 1; w <= 6; w++) {
  const weekWks = (andoniWks ?? []).filter(x => x.week_number === w);
  console.log(`  W${w}: ${weekWks.length}/7 workouts (${weekWks.filter(x => x.is_rest_day).length} rest)`);
}

// 4. Null exercise_id check
console.log("\n── Integridad de sets ──");
const { data: badSets } = await sb.from("workout_sets").select("id").in("workout_id", wids).is("exercise_id", null);
console.log(`  Sets con exercise_id null: ${badSets?.length ?? 0} (esperado: 0)`);

// 5. Exercise card completeness — todos los ejercicios referenciados en M4
const { data: distinctEx } = await sb.rpc("query_exercises_in_workouts", {}).select().limit(1);
// Fallback: query directly
const { data: allSetsEx } = await sb.from("workout_sets").select("exercise_id").in("workout_id", wids);
const uniqueExIds = [...new Set((allSetsEx ?? []).map(s => s.exercise_id).filter(Boolean))];
console.log(`  Ejercicios únicos usados en M4: ${uniqueExIds.length}`);
const { data: incompleteEx } = await sb.from("exercises").select("id, name, description, coaching_cue, founder_notes").in("id", uniqueExIds);
const missing = (incompleteEx ?? []).filter(e => !e.description || !e.coaching_cue || !e.founder_notes);
console.log(`  Ejercicios con card incompleto: ${missing.length} (esperado: 0)`);
if (missing.length) for (const m of missing) console.log(`    ⚠ ${m.name} — falta: ${[!m.description && "desc", !m.coaching_cue && "cue", !m.founder_notes && "founder"].filter(Boolean).join(", ")}`);

// 6. MESOCYCLE_DATE_RANGES check (visto en código en último push)
console.log("\n── Deploy status ──");
const { data: lastCommit } = await sb.from("workouts").select("scheduled_date").eq("user_id", USERS.Andoni).eq("day_label", "LOWER HINGE").order("scheduled_date", { ascending: false }).limit(1).maybeSingle();
console.log(`  LOWER HINGE existe: ${lastCommit ? "✓" : "✗"} (última fecha: ${lastCommit?.scheduled_date})`);
const { data: hasSAB } = await sb.from("workouts").select("id").eq("user_id", USERS.Andoni).eq("day_label", "SHOULDERS + ARMS ATHLETIC").limit(1).maybeSingle();
console.log(`  SHOULDERS + ARMS ATHLETIC existe: ${hasSAB ? "✓" : "✗"}`);
const { data: hasJUE } = await sb.from("workouts").select("id").eq("user_id", USERS.Andoni).eq("day_label", "ACTIVE RECOVERY").limit(1).maybeSingle();
console.log(`  ACTIVE RECOVERY existe: ${hasJUE ? "✓" : "✗"}`);
const { data: hasDOM } = await sb.from("workouts").select("id").eq("user_id", USERS.Andoni).eq("day_label", "DESCANSO").limit(1).maybeSingle();
console.log(`  DESCANSO existe: ${hasDOM ? "✓" : "✗"}`);
