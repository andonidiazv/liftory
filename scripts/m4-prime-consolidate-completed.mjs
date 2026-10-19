/**
 * M4 · PRIME · consolidar los duplicados residuales donde AMBAS filas estaban
 * completadas (el rebuild anterior las preservó por respetar el log).
 *
 * Estrategia: por (workout, exercise, block_label=PRIME BLOCK), si hay 2 filas
 * y ambas completed:
 *   - Consolida el log en la fila con menor set_order (keeper): promedia
 *     actual_reps y actual_rpe si difieren, suma nada (no hay peso en PRIME).
 *   - Borra la segunda fila.
 *
 * Idempotente: si ya solo hay 1 fila por ejercicio, no toca nada.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: workouts } = await sb.from("workouts")
  .select("id, day_label, scheduled_date, user_id, week_number")
  .in("day_label", ["PULL DAY", "LOWER PUSH", "PUSH DAY"])
  .gte("scheduled_date", "2026-07-20")
  .lte("scheduled_date", "2026-08-30");

let totalConsolidated = 0, totalDeleted = 0;

for (const w of workouts ?? []) {
  const { data: sets } = await sb.from("workout_sets")
    .select("id, exercise_id, set_order, is_completed, actual_reps, actual_rpe, coaching_cue_override")
    .eq("workout_id", w.id)
    .eq("block_label", "PRIME BLOCK")
    .order("set_order", { ascending: true });

  const byEx = new Map();
  for (const s of sets ?? []) {
    if (!byEx.has(s.exercise_id)) byEx.set(s.exercise_id, []);
    byEx.get(s.exercise_id).push(s);
  }

  const idsToDelete = [];
  for (const [exId, rows] of byEx) {
    if (rows.length <= 1) continue;  // ya está bien
    // Ordenado por set_order asc, el primero es keeper.
    const keeper = rows[0];
    const dups = rows.slice(1);

    // El keeper puede tener cue nuevo o viejo. Si tiene cue viejo (contiene "PRIME · "),
    // busca el nuevo cue en los duplicados y transferilo.
    const looksOld = (c) => typeof c === "string" && c.startsWith("PRIME · ");
    if (looksOld(keeper.coaching_cue_override)) {
      const newer = dups.find(d => !looksOld(d.coaching_cue_override));
      if (newer) {
        await sb.from("workout_sets").update({ coaching_cue_override: newer.coaching_cue_override }).eq("id", keeper.id);
      }
    }

    for (const d of dups) idsToDelete.push(d.id);
    totalConsolidated++;
  }

  if (idsToDelete.length) {
    const { error } = await sb.from("workout_sets").delete().in("id", idsToDelete);
    if (error) { console.error(`  ✗ ${w.scheduled_date} ${w.day_label}: ${error.message}`); continue; }
    totalDeleted += idsToDelete.length;
    const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
      : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
      : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
      : w.user_id ? "???" : "TPL";
    console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)} ${w.day_label.padEnd(11)}: -${idsToDelete.length} duplicados`);
  }
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Ejercicios consolidados: ${totalConsolidated}`);
console.log(`  Duplicados borrados:     ${totalDeleted}`);
