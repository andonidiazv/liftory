/**
 * Replica el workout DENSITY DAY del 2026-06-08 a César y Víctor.
 * Copia del template M3 LUN W1 (con sus 47 sets) hacia las instancias de cada uno.
 *
 * Idempotente: si el user ya tiene workout en esa fecha, no inserta.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TEMPLATE_WORKOUT_ID = "4b8ae2ba-1539-45cd-ade0-606f6b5b9062";
const M3_START = "2026-06-08";

// IDs identificados desde auth.users
const cesar = { id: "f54d2d89-cb8d-4b2e-b22c-b5edb59f06bd", display_name: "César", email: "cesar.acerosaranda@gmail.com" };
const victor = { id: "3b1c600f-ff7c-4e95-be86-f99cee98c3ca", display_name: "Víctor", email: "victor.vega.0495@gmail.com" };

// Resolvemos los IDs completos via auth.admin (para no hardcodear UUIDs truncadas)
const { data: auth } = await sb.auth.admin.listUsers();
const findUser = (emailPrefix) => auth?.users?.find(u => (u.email || "").toLowerCase().startsWith(emailPrefix));
const cesarFull = findUser("cesar.acerosaranda");
const victorFull = findUser("victor.vega.0495");
if (cesarFull) cesar.id = cesarFull.id;
if (victorFull) victor.id = victorFull.id;

console.log(`\n══ Targets ══`);
console.log(`César:  ${cesar.id} (${cesar.email})`);
console.log(`Víctor: ${victor.id} (${victor.email})`);

// Para cada uno: encontrar su program_id activo (no template)
async function getActiveProgramId(userId) {
  const { data: progs } = await sb
    .from("programs")
    .select("id, name, is_active, mesocycle_id")
    .eq("user_id", userId)
    .eq("is_active", true);
  return progs?.[0];
}

// Cargar template completo
console.log("\n══ Cargando template M3 LUN W1 ══");
const { data: template } = await sb.from("workouts").select("*").eq("id", TEMPLATE_WORKOUT_ID).maybeSingle();
const { data: templateSets } = await sb
  .from("workout_sets")
  .select("exercise_id, set_order, set_type, planned_reps, planned_weight, planned_tempo, planned_rpe, planned_rir, planned_rest_seconds, planned_duration_seconds, coaching_cue_override, block_label")
  .eq("workout_id", TEMPLATE_WORKOUT_ID)
  .order("set_order");
console.log(`  template tiene ${templateSets.length} sets`);

// Función de replicación
async function deployToUser(profile, label) {
  if (!profile) {
    console.log(`\n── ${label}: NO ENCONTRADO, skip ──`);
    return;
  }
  console.log(`\n── ${label} (${profile.id.slice(0, 8)} · ${profile.display_name}) ──`);

  // Check si ya tiene workout
  const { data: existing } = await sb
    .from("workouts")
    .select("id, day_label")
    .eq("user_id", profile.id)
    .eq("scheduled_date", M3_START)
    .maybeSingle();
  if (existing) {
    console.log(`  · ya tiene workout en ${M3_START}: "${existing.day_label}" (${existing.id.slice(0, 8)}), skip`);
    return;
  }

  // Get user's active program_id
  const prog = await getActiveProgramId(profile.id);
  if (!prog) {
    console.log(`  ⚠ no tiene programa activo, skip`);
    return;
  }
  console.log(`  program activo: ${prog.id.slice(0, 8)} · ${prog.name}`);

  // Crear el workout instance
  const { data: created, error: wErr } = await sb
    .from("workouts")
    .insert({
      program_id: prog.id,
      user_id: profile.id,
      scheduled_date: M3_START,
      week_number: 1,
      day_label: "DENSITY DAY",
      workout_type: "strength",
      estimated_duration: 78,
      is_completed: false,
      is_rest_day: false,
      coach_note: template.coach_note,
      short_on_time_note: template.short_on_time_note,
      mesocycle_id: null, // mismo patrón que las instancias de M2
    })
    .select("id")
    .single();
  if (wErr) { console.error(`  ✗ ERROR creando workout:`, wErr.message); return; }
  console.log(`  ✓ workout creado → ${created.id.slice(0, 8)}`);

  // Replicar los 47 sets
  const setRows = templateSets.map(s => ({
    workout_id: created.id,
    user_id: profile.id,
    ...s,
  }));
  const { error: sErr } = await sb.from("workout_sets").insert(setRows);
  if (sErr) { console.error(`  ✗ ERROR insertando sets:`, sErr.message); return; }
  console.log(`  ✓ ${setRows.length} sets insertados`);
}

await deployToUser(cesar, "César");
await deployToUser(victor, "Víctor");

console.log("\n✓ Listo");
