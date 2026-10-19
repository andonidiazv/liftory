/**
 * M3 TEMPO LOWER · PRIME BLOCK · swap Glute Bridge March → Cross Body Glute Bridge
 *
 * Andoni 2026-06-25: cambiar el ejercicio + bajar a 10 reps total.
 * Crear la card completa antes de insertar (regla crítica).
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 1. Create Cross Body Glute Bridge with COMPLETE card
const cardData = {
  name: "Cross Body Glute Bridge",
  name_es: "Glute Bridge con Cross-Body Reach",
  description: "Glute bridge clásico con un cross-body overhead reach en la posición top. Combina extensión de cadera con rotación torácica y movilidad de hombro. Trabaja glúteos, T-spine, core anti-rotación y patrón de breathing.",
  category: "mobility",
  movement_pattern: "rotation",
  difficulty: "beginner",
  equipment_required: ["none"],
  primary_muscles: ["glutes", "thoracic_spine", "obliques", "core"],
  contraindications: [],
  coaching_cue: "Acostado boca arriba, rodillas dobladas, pies a la anchura de las caderas. Sube la cadera apretando glúteos hasta línea recta hombros-rodillas (glute bridge top). Aquí está la clave: en el top, cruza un brazo por encima del cuerpo (desde el costado hacia el lado opuesto) y continúa el movimiento overhead, dejando que el pecho rote ligeramente. Es un reach con rotación torácica, no un swing rápido. Lleva el brazo hasta atrás de la cabeza, respira, regresa controlado. Baja la cadera. Alterna brazos. 10 reps total = 5 por lado.",
  founder_notes: "Doble propósito en PRIME: activa glúteo Y abre T-spine antes de día de hinge. El reach overhead alarga los flexores de cadera del lado que reaches y le da movilidad torácica al inicio del workout. 5 por lado = todo el cuerpo despierto en 90 segundos.",
  is_active: true,
  is_draft: false,
};

const { data: existing } = await sb.from("exercises").select("id").eq("name", cardData.name).maybeSingle();
let NEW_EX_ID;
if (existing) {
  NEW_EX_ID = existing.id;
  console.log("Cross Body Glute Bridge already exists, reusing.");
} else {
  const { data: created, error } = await sb.from("exercises").insert(cardData).select("id").single();
  if (error) { console.error("Failed to create exercise:", error.message); process.exit(1); }
  NEW_EX_ID = created.id;
  console.log("✓ Cross Body Glute Bridge creado con card completa");
}

// 2. Find Glute Bridge March id
const { data: old } = await sb.from("exercises").select("id").eq("name", "Glute Bridge March").single();
if (!old) { console.error("Glute Bridge March not found"); process.exit(1); }
const OLD_EX_ID = old.id;

// 3. Find all TEMPO LOWER workouts (Andoni, César, Víctor, template) and swap in PRIME BLOCK
const { data: workouts } = await sb.from("workouts").select("id, user_id, scheduled_date, week_number")
  .or("day_label.eq.TEMPO LOWER,day_label.like.W% TEMPO LOWER")
  .gte("scheduled_date", "2026-06-08")
  .lte("scheduled_date", "2026-07-19");

console.log(`\nWorkouts TEMPO LOWER: ${workouts.length}`);
let swapped = 0;
for (const w of workouts) {
  const { data: sets } = await sb.from("workout_sets")
    .select("id, planned_reps, block_label, is_completed")
    .eq("workout_id", w.id)
    .eq("exercise_id", OLD_EX_ID)
    .ilike("block_label", "PRIME BLOCK%");
  if (!sets?.length) continue;
  const u = w.user_id === "8117e549-8314-471d-87c2-c7c68cccac17" ? "Andoni"
    : w.user_id === "f54d2d89-c304-419e-93d2-8a7fadfccc51" ? "César"
    : w.user_id === "3b1c600f-46ee-4332-a937-731c4445c144" ? "Víctor"
    : w.user_id ? "???" : "TPL";
  for (const s of sets) {
    if (s.is_completed) {
      // Preserve log of a completed set — skip
      console.log(`  · W${w.week_number} ${u.padEnd(7)} set ${s.id.slice(0,8)} completed → skip (preserve log)`);
      continue;
    }
    const { error } = await sb.from("workout_sets").update({ exercise_id: NEW_EX_ID, planned_reps: 10 }).eq("id", s.id);
    if (error) { console.error(`  ✗ W${w.week_number} ${u}: ${error.message}`); continue; }
    console.log(`  ✓ W${w.week_number} ${u.padEnd(7)} · ${s.planned_reps} reps Glute Bridge March → 10 reps Cross Body Glute Bridge`);
    swapped++;
  }
}

console.log(`\n✓ Sets swapped: ${swapped}`);
