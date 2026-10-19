/**
 * M3 LUN W1 Density Day — fixes post-feedback Andoni 2026-06-08.
 *
 * 1. Rename existing exercises a los nombres exactos del spec M3:
 *    - "Lean Away Lateral Raise" → "Cable Lean-Away Lateral Raise"
 *    - "Cable Tricep Pushdown — Rope Attachment" → "Tricep Rope Pushdown"
 *    - "Chest Doorway Stretch" → "Doorway Pec Stretch"
 *
 * 2. Re-segmentar PRIME BLOCK en 3 sub-bloques (— A, — B, — C) usando el patrón
 *    "BLOCK — LETRA" que ya usa la app (igual que HEAVY BLOCK — A/B).
 *
 * 3. DENSITY BLOCK A: convertir a EMOM real disparable por la app:
 *    - set_type = "emom"
 *    - cue formato "EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando 8-10. Todos a RPE 8"
 *    - reordenar: 6 sets de Z Press primero, luego 6 sets de Commando (igual que EMOMs existentes)
 *    - quitar "sin trampa"
 *
 * 4. Aplicar a AMBOS workouts: template (admin) + instancia de Andoni.
 *
 * 5. Verificar las 11 exercise cards creadas con todos los campos.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_lib-env.mjs";

const env = loadEnv();
const sb = createClient(`https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co`, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TEMPLATE_WORKOUT_ID = "4b8ae2ba-1539-45cd-ade0-606f6b5b9062";
const ANDONI_WORKOUT_ID = "584d19f7-719a-4b02-bf42-4e0f3dd1c66c";

console.log("════════════════════════════════════════════════════════════════");
console.log("  M3 LUN W1 — Fixes");
console.log("════════════════════════════════════════════════════════════════\n");

// ════════════════════════════════════════════════════════════════════════════
// 1. RENAME EXERCISES
// ════════════════════════════════════════════════════════════════════════════

console.log("STEP 1: Renombrar ejercicios al nombre exacto del spec M3\n");

const RENAMES = [
  ["Lean Away Lateral Raise", "Cable Lean-Away Lateral Raise"],
  ["Cable Tricep Pushdown — Rope Attachment", "Tricep Rope Pushdown"],
  ["Chest Doorway Stretch", "Doorway Pec Stretch"],
];

for (const [oldName, newName] of RENAMES) {
  // Check if new name already exists (someone could have created it earlier)
  const { data: alreadyNew } = await sb.from("exercises").select("id").eq("name", newName).maybeSingle();
  if (alreadyNew) {
    console.log(`  · "${newName}" ya existe (id=${alreadyNew.id.slice(0, 8)}), skip rename`);
    continue;
  }
  const { data: old } = await sb.from("exercises").select("id").eq("name", oldName).maybeSingle();
  if (!old) {
    console.log(`  · "${oldName}" no encontrado, skip`);
    continue;
  }
  const { error } = await sb.from("exercises").update({ name: newName }).eq("id", old.id);
  if (error) {
    console.error(`  ✗ ERROR renombrando "${oldName}":`, error.message);
    process.exit(1);
  }
  console.log(`  ✓ "${oldName}" → "${newName}" (id=${old.id.slice(0, 8)})`);
}

// ════════════════════════════════════════════════════════════════════════════
// 2-5. FIX WORKOUT_SETS for both template + Andoni instance
// ════════════════════════════════════════════════════════════════════════════

// Get exercise IDs we need
async function exId(name) {
  const { data } = await sb.from("exercises").select("id").eq("name", name).maybeSingle();
  if (!data) throw new Error(`Exercise not found: ${name}`);
  return data.id;
}

const EX = {
  wallSlide: await exId("Wall Slide"),
  bandDislocates: await exId("Band Dislocates"),
  scapPushup: await exId("Scap Push-up"),
  bandedPullApart: await exId("Banded Pull-Apart"),
  kbAroundWorld: await exId("KB Around the World"),
  kbHalo: await exId("KB Halo"),
  zPress: await exId("KB Alternating Z Press"),
  commando: await exId("Commando Pull-up"),
};

async function fixWorkout(workoutId, userId, label) {
  console.log(`\n──── ${label} (workout=${workoutId.slice(0, 8)}) ────`);

  const { data: allSets } = await sb
    .from("workout_sets")
    .select("id, set_order, block_label, exercise_id, set_type, planned_reps, coaching_cue_override, planned_rest_seconds, planned_duration_seconds")
    .eq("workout_id", workoutId)
    .order("set_order");

  // ── FIX 1: PRIME BLOCK → split into — A / — B / — C ──
  // A: Wall Slide + Band Dislocates (Mobility hombro)
  // B: Scap Push-up + Banded Pull-Apart (Activación escapular)
  // C: KB Around the World + KB Halo (Specific prep KB)
  const primeSubBlock = (exerciseId) => {
    if (exerciseId === EX.wallSlide || exerciseId === EX.bandDislocates) return "PRIME BLOCK — A";
    if (exerciseId === EX.scapPushup || exerciseId === EX.bandedPullApart) return "PRIME BLOCK — B";
    if (exerciseId === EX.kbAroundWorld || exerciseId === EX.kbHalo) return "PRIME BLOCK — C";
    return null;
  };

  let updates = 0;
  for (const s of allSets) {
    if (s.block_label === "PRIME BLOCK") {
      const newLabel = primeSubBlock(s.exercise_id);
      if (newLabel && newLabel !== s.block_label) {
        const { error } = await sb.from("workout_sets").update({ block_label: newLabel }).eq("id", s.id);
        if (error) { console.error("    ✗ PRIME relabel error:", error.message); process.exit(1); }
        updates++;
      }
    }
  }
  console.log(`  PRIME → 3 sub-bloques: ${updates} sets relabel`);

  // ── FIX 2: DENSITY BLOCK A → set_type=emom, cue corregido, reordenar ──
  // Pattern from existing EMOMs: all sets of exercise A first (6), then all of exercise B (6)
  // set_orders 7-18 are DENSITY.
  // Reorder: 7-12 = Z Press, 13-18 = Commando.
  // To avoid uniqueness conflict on (workout_id, set_order), use two-pass with temp set_orders.

  const densitySets = allSets.filter(s => s.block_label === "DENSITY BLOCK A");
  if (densitySets.length !== 12) {
    console.error(`  ✗ DENSITY: expected 12 sets, got ${densitySets.length}`);
    process.exit(1);
  }

  const DENSITY_CUE = "EMOM 60s | 6R x 2V. Alterna: KB Z Press 8/lado, Commando Pull-up 8-10. R1-3: RPE 8, R4-6: RPE 9. KB Z Press sentado piernas extendidas (anti-extension). Commando alterna lado de la cabeza por rep.";

  // Sort: Z Press first by current set_order, then Commando by current set_order
  const zSets = densitySets.filter(s => s.exercise_id === EX.zPress).sort((a, b) => a.set_order - b.set_order);
  const cSets = densitySets.filter(s => s.exercise_id === EX.commando).sort((a, b) => a.set_order - b.set_order);

  // Two-pass: first move to temp set_orders (10000+), then to final
  // Final: zSets[0..5] = so 7..12, cSets[0..5] = so 13..18
  const finalOrder = [
    ...zSets.map((s, i) => ({ id: s.id, finalSo: 7 + i })),
    ...cSets.map((s, i) => ({ id: s.id, finalSo: 13 + i })),
  ];

  // Pass 1: move all DENSITY sets to temp set_order (10000+)
  for (let i = 0; i < finalOrder.length; i++) {
    const tempSo = 10000 + i;
    const { error } = await sb.from("workout_sets").update({ set_order: tempSo }).eq("id", finalOrder[i].id);
    if (error) { console.error("    ✗ temp move error:", error.message); process.exit(1); }
  }
  // Pass 2: move to final set_order + update set_type + cue
  for (const u of finalOrder) {
    const { error } = await sb.from("workout_sets").update({
      set_order: u.finalSo,
      set_type: "emom",
      planned_rest_seconds: null,
      coaching_cue_override: DENSITY_CUE,
    }).eq("id", u.id);
    if (error) { console.error("    ✗ final update error:", error.message); process.exit(1); }
  }
  console.log(`  DENSITY → set_type=emom, reordenado (Z×6 → Commando×6), cue EMOM dispara timer`);

  // ── FIX 3: Limpiar otros cues con frases pendejas (preventivo) ──
  // El "sin trampa" original ya queda sobrescrito arriba en DENSITY.
  // Revisar el resto por si alguno tiene texto casual:
  const KILL_PHRASES = ["sin trampa", "no hagas trampa", "no mames"];
  for (const s of allSets) {
    if (s.block_label === "DENSITY BLOCK A") continue; // ya actualizado arriba
    const cue = s.coaching_cue_override || "";
    let cleaned = cue;
    for (const phrase of KILL_PHRASES) {
      cleaned = cleaned.replace(new RegExp(`[·\\s,]*${phrase}[\\s,]*`, "gi"), " ").trim();
    }
    cleaned = cleaned.replace(/\s+/g, " ").replace(/^[·,\s]+|[·,\s]+$/g, "").trim();
    if (cleaned !== cue) {
      await sb.from("workout_sets").update({ coaching_cue_override: cleaned || null }).eq("id", s.id);
      console.log(`  cue limpiado en so=${s.set_order} "${s.block_label}"`);
    }
  }
}

await fixWorkout(TEMPLATE_WORKOUT_ID, null, "Template (admin view)");
await fixWorkout(ANDONI_WORKOUT_ID, "8117e549-8314-471d-87c2-c7c68cccac17", "Instancia Andoni (athlete view)");

// ════════════════════════════════════════════════════════════════════════════
// 6. Verificar las 11 exercise cards
// ════════════════════════════════════════════════════════════════════════════

console.log("\n════════════════════════════════════════════════════════════════");
console.log("  Verificación de las 11 exercise cards creadas hoy");
console.log("════════════════════════════════════════════════════════════════\n");

const CREATED = [
  "Wall Slide", "Band Dislocates", "Banded Pull-Apart",
  "KB Around the World", "KB Halo",
  "KB Alternating Z Press", "Commando Pull-up",
  "Bent-Over DB Rear Delt Fly", "Push-up Combo (Wide-Standard-Close)",
  "DB Skull Crusher", "Low Plank KB Press-Drag",
];

for (const name of CREATED) {
  const { data: ex } = await sb
    .from("exercises")
    .select("id, name, name_es, category, movement_pattern, difficulty, default_tempo, primary_muscles, equipment_required, description, coaching_cue, founder_notes, video_url, is_active")
    .eq("name", name)
    .maybeSingle();
  if (!ex) { console.log(`✗ "${name}" — NO EXISTE`); continue; }
  const issues = [];
  if (!ex.name_es) issues.push("name_es vacío");
  if (!ex.category) issues.push("category vacío");
  if (!ex.movement_pattern) issues.push("movement_pattern vacío");
  if (!ex.difficulty) issues.push("difficulty vacío");
  if (!ex.primary_muscles || ex.primary_muscles.length === 0) issues.push("primary_muscles vacío");
  if (!ex.equipment_required || ex.equipment_required.length === 0) issues.push("equipment vacío");
  if (!ex.description) issues.push("description vacío");
  if (!ex.coaching_cue) issues.push("coaching_cue vacío");
  if (!ex.founder_notes) issues.push("founder_notes vacío");
  if (!ex.is_active) issues.push("inactive");

  const status = issues.length === 0 ? "✓" : "⚠";
  console.log(`${status} ${ex.name} (${ex.id.slice(0, 8)})`);
  console.log(`    name_es: ${ex.name_es}`);
  console.log(`    ${ex.category} | ${ex.movement_pattern} | ${ex.difficulty} | tempo=${ex.default_tempo || "(none)"} | video=${!!ex.video_url}`);
  console.log(`    muscles: ${JSON.stringify(ex.primary_muscles)}`);
  console.log(`    equipment: ${JSON.stringify(ex.equipment_required)}`);
  if (issues.length > 0) console.log(`    ISSUES: ${issues.join(", ")}`);
  console.log();
}

console.log("════════════════════════════════════════════════════════════════");
console.log("  ✓ Fixes aplicados");
console.log("════════════════════════════════════════════════════════════════");
