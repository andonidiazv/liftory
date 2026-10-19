/**
 * M4 · LOWER PUSH · BUILD BLOCK — A · 2 cambios:
 *
 * 1. Rename "Single Leg Recoil to Shoot Through" → "Recoil to Shoot Through"
 *    + update coaching_cue del ejercicio para el nuevo movimiento
 *    (child pose bilateral → shoot through unilateral alternando).
 *
 * 2. Bodyweight Reverse Nordic · nueva progresión reps:
 *    W1-W3 = 10 · W4 = 12 · W5 = 15 · W6 = 6 (deload)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";
const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ═══ 1. Rename + update card del Recoil ═══
const { data: recoil } = await sb.from("exercises").select("id").eq("name", "Single Leg Recoil to Shoot Through").single();
const RECOIL_ID = recoil.id;

const NEW_RECOIL_CARD = {
  name: "Recoil to Shoot Through",
  name_es: "Recoil a Shoot-Through",
  description: "Movimiento dinámico de recuperación cuadricipal + coordinación. Empezás en cuadrupedia bajando a child's pose bilateral (ambas rodillas dobladas hacia los talones), y desde ahí pasás UNA pierna por debajo del cuerpo (shoot through) hacia el lado opuesto, alternando piernas cada rep.",
  coaching_cue: "Empezá en cuadrupedia (manos y rodillas apoyadas). Baja la cadera hacia los talones — child's pose bilateral (AMBAS rodillas dobladas apoyadas, glúteos a los talones). Sentí el stretch del cuádriceps. Desde ahí, empujá con AMBOS pies para regresar a cuadrupedia. Sin apoyar el pie, pasá UNA pierna por debajo del cuerpo (shoot through) hacia el lado opuesto extendiendo la pierna. Regresá a cuadrupedia. Ese es 1 rep. ALTERNÁ la pierna del shoot through en cada rep — si esta pasás la derecha, la siguiente pasás la izquierda. 8 reps por lado.",
  founder_notes: "El recoil ahora es bilateral (child pose ambas rodillas), y la coordinación viene del shoot through unilateral alternando lados. Combina stretch simétrico del cuádriceps con coordinación cruzada y estabilidad de core. Prep + accessory en un solo drill.",
};

const { error: eCard } = await sb.from("exercises").update(NEW_RECOIL_CARD).eq("id", RECOIL_ID);
if (eCard) { console.error("✗ card update:", eCard.message); process.exit(1); }
console.log("✓ Single Leg Recoil to Shoot Through → Recoil to Shoot Through (card updated)");

// ═══ 2. Nordic reps progresión ═══
const NORDIC_REPS = { 1: 10, 2: 10, 3: 10, 4: 12, 5: 15, 6: 6 };
const { data: nordic } = await sb.from("exercises").select("id").eq("name", "Bodyweight Reverse Nordic").single();
const NORDIC_ID = nordic.id;

// ═══ 3. Update sets en LOWER PUSH ═══
const { data: workouts } = await sb.from("workouts")
  .select("id, week_number, scheduled_date, user_id")
  .eq("day_label", "LOWER PUSH")
  .gte("scheduled_date", "2026-07-20").lte("scheduled_date", "2026-08-30");

console.log(`\nLOWER PUSH workouts: ${workouts?.length}\n`);

let recoilSets = 0, nordicSets = 0, recoilCues = 0;

for (const w of workouts ?? []) {
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";

  // ─── Recoil cue del set (primer ejercicio del triset · lleva el cue del triset completo) ───
  const { data: recoilRows } = await sb.from("workout_sets")
    .select("id, coaching_cue_override")
    .eq("workout_id", w.id).eq("exercise_id", RECOIL_ID).eq("block_label", "BUILD BLOCK — A");
  for (const r of recoilRows ?? []) {
    const cue = r.coaching_cue_override;
    if (cue) {
      const newCue = cue
        .replace(/SL Recoil to Shoot Through/g, "Recoil to Shoot Through")
        .replace(/Single Leg Recoil to Shoot Through/g, "Recoil to Shoot Through")
        .replace(/child pose a una pierna/gi, "child pose bilateral (ambas rodillas)")
        .replace(/8\/lado/g, "8 por lado (alternando)");
      if (newCue !== cue) {
        await sb.from("workout_sets").update({ coaching_cue_override: newCue }).eq("id", r.id);
        recoilCues++;
      }
    }
    // planned_reps mantiene 8, no cambia
    recoilSets++;
  }

  // ─── Nordic reps por semana ───
  const nordicReps = NORDIC_REPS[w.week_number];
  const { data: nordicRows } = await sb.from("workout_sets")
    .select("id")
    .eq("workout_id", w.id).eq("exercise_id", NORDIC_ID).eq("block_label", "BUILD BLOCK — A");
  for (const r of nordicRows ?? []) {
    await sb.from("workout_sets").update({ planned_reps: nordicReps }).eq("id", r.id);
    nordicSets++;
  }

  console.log(`  ✓ ${w.scheduled_date} W${w.week_number} ${u.padEnd(7)}: Recoil rename + Nordic → ${nordicReps} reps`);
}

console.log(`\n═══ Resumen ═══`);
console.log(`  Recoil sets (cue updated): ${recoilCues}`);
console.log(`  Nordic sets (reps updated): ${nordicSets}`);
